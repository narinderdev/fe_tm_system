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
    this.authService.login({ email, password }).subscribe({
        next: (response: any) => {
          const statusCode = response?.statusCode;
          const isSuccess = statusCode === 200 || statusCode === 201;
          const token = (response as any)?.data?.token || (response as any)?.token;
          const mfaToken = (response as any)?.data?.mfa_token ?? (response as any)?.mfa_token ?? null;
          const user = (response as any)?.data?.user;
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
            ?? (response as any)?.data?.user?.technicianId;
          const message = response?.message || (isSuccess ? 'Login successful' : 'Invalid credentials');

          if (isSuccess) {
            if (this.isBrowser) {
              // Store auth-independent login flags for downstream screens.
              if (mfaToken) {
                localStorage.setItem('mfa_token', mfaToken);
              } else {
                localStorage.removeItem('mfa_token');
              }
              localStorage.setItem('mfaEnabled', String(!!mfaEnabled));
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

              // Token may or may not be present depending on MFA flow.
              if (token) {
                localStorage.setItem('authToken', token);
              }
              if (user) {
                this.permissionService.setFromUser(user);
              }
            }
            this.loading = false;
            this.cdr.detectChanges();
            this.router.navigate(['/dashboard']);
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
