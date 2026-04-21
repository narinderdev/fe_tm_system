import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Component, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SpinnerComponent } from '../spinner/spinner';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  form!: FormGroup;

  loading = false;
  passwordVisible = false;
  showChangePasswordButton = false;
  private isBrowser = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  private extractTokenFromErrorPayload(err: any): string | null {
    const candidates = [
      err?.error?.data?.token,
      err?.error?.token,
      err?.error?.data?.accessToken,
      err?.error?.accessToken,
      err?.error?.data?.jwt,
      err?.error?.jwt
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string') {
        return candidate.replace(/^Bearer\s+/i, '').trim();
      }
    }

    return null;
  }

  goToChangePassword() {
    const email = String(this.form.get('email')?.value ?? '').trim().toLowerCase()
      || (this.isBrowser ? String(localStorage.getItem('loginEmail') ?? '').trim().toLowerCase() : '');
    this.router.navigate(['/change-password'], {
      queryParams: email ? { email } : undefined
    });
  }

  goToForgotPassword() {
    const email = String(this.form.get('email')?.value ?? '').trim().toLowerCase();
    this.router.navigate(['/forgot-password'], {
      queryParams: email ? { email } : undefined
    });
  }

  submit() {
    if (this.loading) {
      return;
    }

    this.showChangePasswordButton = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = String(this.form.value.email || '').trim().toLowerCase();
    const password = String(this.form.value.password || '').trim();

    this.form.patchValue({ email, password });

    this.loading = true;
    this.authService.startLogin({ email, password }).subscribe({
        next: (response: any) => {
          const statusCode = response?.statusCode;
          const isSuccess = statusCode === 200 || statusCode === 201;
          const token = (response as any)?.data?.token || (response as any)?.token;
          const mfaToken =
            (response as any)?.data?.mfaToken ??
            (response as any)?.data?.mfa_token ??
            (response as any)?.mfaToken ??
            (response as any)?.mfa_token ??
            null;
          const mfaRequired = !!(
            (response as any)?.data?.mfaRequired ??
            (response as any)?.data?.mfa_required ??
            (response as any)?.mfaRequired ??
            (response as any)?.mfa_required
          );
          const user = (response as any)?.data?.user;
          const role = (response as any)?.data?.user?.role ?? (response as any)?.data?.role;
          const mfaEnabled = (response as any)?.data?.user?.mfaEnabled ?? (response as any)?.data?.mfaEnabled ?? false;
          const daysUntilPasswordExpiry =
            (response as any)?.data?.daysUntilPasswordExpiry ??
            (response as any)?.data?.user?.daysUntilPasswordExpiry ??
            (response as any)?.daysUntilPasswordExpiry ??
            null;
          const passwordExpired =
            (response as any)?.data?.passwordExpired ??
            (response as any)?.data?.user?.passwordExpired ??
            (response as any)?.passwordExpired ??
            false;
          const technicianId = (response as any)?.data?.technician?.id
            ?? (response as any)?.data?.user?.technician?.id
            ?? (response as any)?.data?.technicianId
            ?? (response as any)?.data?.user?.technicianId
            ?? (((String(role ?? '').trim().toUpperCase() === 'TECHNICIAN')
              ? (response as any)?.data?.user?.id
              : undefined));
          const message = response?.message || (isSuccess ? 'Login successful' : 'Invalid credentials');
          const companiesRaw = (response as any)?.data?.companies;
          const companies = Array.isArray(companiesRaw)
            ? companiesRaw
                .map((company: any) => ({
                  id: company?.id ?? null,
                  company_number: String(company?.company_number ?? company?.companyNumber ?? '').trim(),
                  company_trade_name: String(
                    company?.company_trade_name ?? company?.companyTradeName ?? company?.trade_name ?? ''
                  ).trim(),
                  company_legal_name: String(
                    company?.company_legal_name ?? company?.companyLegalName ?? company?.company_legalName ?? company?.legal_name ?? ''
                  ).trim()
                }))
                .filter((company: any) => company.company_number && (company.company_legal_name || company.company_trade_name))
            : [];

          if (isSuccess) {
            if (this.isBrowser) {
              // Store auth-independent login flags for downstream screens.
              this.authService.clearMfaChallengeContext();
              if (mfaRequired && mfaToken) {
                this.authService.setMfaChallengeContext({
                  mfaToken: String(mfaToken),
                  email,
                  userId: (response as any)?.data?.userId ?? (response as any)?.data?.user?.id,
                  challengeId: (response as any)?.data?.challengeId ?? (response as any)?.data?.challenge_id
                });
              }
              if (mfaToken) {
                localStorage.setItem('mfa_token', mfaToken);
              } else {
                localStorage.removeItem('mfa_token');
              }
              localStorage.setItem('mfaEnabled', String(!!mfaEnabled));
              localStorage.setItem('emailOtpVerified', 'false');
              localStorage.setItem('authenticatorVerified', mfaEnabled ? 'false' : 'true');
              localStorage.setItem('loginEmail', email);
              localStorage.setItem('passwordExpired', String(!!passwordExpired));
              localStorage.removeItem('passwordChangeToken');
              if (daysUntilPasswordExpiry !== null && daysUntilPasswordExpiry !== undefined) {
                localStorage.setItem('daysUntilPasswordExpiry', String(daysUntilPasswordExpiry));
              } else {
                localStorage.removeItem('daysUntilPasswordExpiry');
              }
              if (technicianId !== undefined && technicianId !== null) {
                localStorage.setItem('technicianId', String(technicianId));
              } else {
                localStorage.removeItem('technicianId');
              }
              if (role) {
                localStorage.setItem('userRole', String(role));
              } else {
                localStorage.removeItem('userRole');
              }
              const loggedInUserId = (response as any)?.data?.user?.id ?? (response as any)?.data?.userId;
              if (loggedInUserId !== undefined && loggedInUserId !== null && String(loggedInUserId).trim().length) {
                localStorage.setItem('userId', String(loggedInUserId));
              } else {
                localStorage.removeItem('userId');
              }

              if (companies.length) {
                const existingId = String(localStorage.getItem('selectedCompanyId') ?? '').trim();
                const existingNumber = String(localStorage.getItem('selectedCompanyNumber') ?? '').trim();
                const existingTradeName = String(localStorage.getItem('selectedCompanyTradeName') ?? '').trim();
                const existingLegalName = String(localStorage.getItem('selectedCompanyLegalName') ?? '').trim();
                const matchedCompany = companies.find((company: any) => String(company?.id ?? '').trim() === existingId)
                  ?? companies.find((company: any) =>
                    company.company_number === existingNumber
                    && (
                      (!!existingLegalName && company.company_legal_name === existingLegalName)
                      || company.company_trade_name === existingTradeName
                    )
                  )
                  ?? companies[0];
                localStorage.setItem('userCompanies', JSON.stringify(companies));
                if (matchedCompany.id !== null && matchedCompany.id !== undefined) {
                  localStorage.setItem('selectedCompanyId', String(matchedCompany.id));
                } else {
                  localStorage.removeItem('selectedCompanyId');
                }
                localStorage.setItem('selectedCompanyNumber', matchedCompany.company_number);
                localStorage.setItem('selectedCompanyTradeName', matchedCompany.company_trade_name);
                localStorage.setItem(
                  'selectedCompanyLegalName',
                  String(matchedCompany.company_legal_name || matchedCompany.company_trade_name)
                );
              } else {
                localStorage.removeItem('userCompanies');
                localStorage.removeItem('selectedCompanyId');
                localStorage.removeItem('selectedCompanyNumber');
                localStorage.removeItem('selectedCompanyTradeName');
                localStorage.removeItem('selectedCompanyLegalName');
              }

              // Token may or may not be present depending on MFA flow.
              if (token) {
                localStorage.setItem('authToken', token);
              } else {
                localStorage.removeItem('authToken');
              }
              if (user) {
                this.permissionService.setFromUser(user);
              }
            }
            this.authService.sendLoginEmailOtp({ email }).subscribe({
              next: (otpResponse: any) => {
                this.loading = false;
                this.cdr.detectChanges();
                this.toastr.success(otpResponse?.message || 'Verification code sent to your email.');
                this.router.navigate(['/verify-account'], { queryParams: { email } });
              },
              error: (otpErr: any) => {
                this.loading = false;
                this.cdr.detectChanges();
                this.toastr.error(otpErr?.error?.message || 'Failed to send verification code.');
              }
            });
          } else {
            this.toastr.error(message);
            this.loading = false;
            this.cdr.detectChanges();
          }
        },
        error: (err: any) => {
          const message = err?.error?.message || 'Login failed. Please try again.';
          const statusCode = err?.error?.statusCode ?? err?.status;
          const normalizedMessage = String(message).trim().toLowerCase();
          const isPasswordExpired = statusCode === 401 && normalizedMessage.includes('password expired');

          if (isPasswordExpired && this.isBrowser) {
            const passwordChangeToken = this.extractTokenFromErrorPayload(err);
            localStorage.setItem('loginEmail', email);
            localStorage.setItem('passwordExpired', 'true');
            if (passwordChangeToken) {
              localStorage.setItem('passwordChangeToken', passwordChangeToken);
            } else {
              localStorage.removeItem('passwordChangeToken');
            }
            this.showChangePasswordButton = true;
          }

          this.toastr.error(message);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }
}
