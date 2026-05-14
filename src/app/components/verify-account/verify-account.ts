import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';
import { OtpCodeInputComponent } from '../otp-code-input/otp-code-input';

@Component({
  selector: 'app-verify-account',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent, OtpCodeInputComponent],
  templateUrl: './verify-account.html',
  styleUrls: ['./verify-account.css']
})
export class VerifyAccountComponent {
  readonly otpLength = 6;
  otpCode = '';
  loading = false;
  email = '';
  private autoSubmitTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly isBrowser: boolean;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeEmail();
  }

  onOtpValueChange(code: string): void {
    this.otpCode = code;
    this.scheduleAutoSubmit();
  }

  verifyOtp(): void {
    this.clearAutoSubmitTimer();
    if (this.loading || !this.email) {
      return;
    }

    const code = this.otpCode;
    if (!new RegExp(`^\\d{${this.otpLength}}$`).test(code)) {
      this.toastr.error('Please enter a valid 6-digit OTP.');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();
    this.authService
      .verifyLoginEmailOtp({ email: this.email, code })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          const statusCode = response?.statusCode;
          if (statusCode !== 200 && statusCode !== 201) {
            this.loading = false;
            this.cdr.detectChanges();
            this.toastr.error(response?.message || 'OTP verification failed.');
            return;
          }

          if (this.isBrowser) {
            localStorage.setItem('emailOtpVerified', 'true');
          }

          const responseData = (response as any)?.data ?? {};
          const responseMfaRequired = responseData?.mfa_required ?? responseData?.mfaRequired;
          const mfaTokenFromResponse = String(responseData?.mfa_token ?? responseData?.mfaToken ?? '').trim();
          const existingMfaToken = this.isBrowser ? String(localStorage.getItem('mfa_token') ?? '').trim() : '';
          const mfaToken = mfaTokenFromResponse || existingMfaToken;
          const mfaRequired = !!responseMfaRequired || !!mfaToken;

          if (this.isBrowser) {
            localStorage.setItem('mfaEnabled', String(mfaRequired));
            localStorage.setItem('authenticatorVerified', mfaRequired ? 'false' : 'true');
            if (mfaRequired && mfaToken) {
              localStorage.setItem('mfa_token', mfaToken);
            } else {
              localStorage.removeItem('mfa_token');
            }
          }

          this.toastr.success(response?.message || 'Email verified successfully.');
          if (mfaRequired) {
            if (!mfaToken) {
              this.toastr.error('MFA token missing. Please login again.');
              this.router.navigate(['/login']);
              return;
            }
            this.router.navigate(['/authenticator-verify']);
            return;
          }
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          this.cdr.detectChanges();
          this.toastr.error(err?.error?.message || 'OTP verification failed.');
        }
      });
  }

  private scheduleAutoSubmit(): void {
    if (this.loading) {
      return;
    }
    const code = String(this.otpCode ?? '');
    const isValidOtp = new RegExp(`^\\d{${this.otpLength}}$`).test(code);
    if (!isValidOtp) {
      this.clearAutoSubmitTimer();
      return;
    }
    this.clearAutoSubmitTimer();
    this.autoSubmitTimer = setTimeout(() => {
      this.autoSubmitTimer = null;
      this.verifyOtp();
    }, 150);
  }

  private clearAutoSubmitTimer(): void {
    if (this.autoSubmitTimer) {
      clearTimeout(this.autoSubmitTimer);
      this.autoSubmitTimer = null;
    }
  }

  private initializeEmail(): void {
    const queryEmail = String(this.route.snapshot.queryParamMap.get('email') ?? '').trim().toLowerCase();
    if (queryEmail) {
      this.email = queryEmail;
      return;
    }

    if (this.isBrowser) {
      const loginEmail = String(localStorage.getItem('loginEmail') ?? '').trim().toLowerCase();
      if (loginEmail) {
        this.email = loginEmail;
        return;
      }
    }

    this.toastr.warning('Login session missing. Please login again.');
    this.router.navigate(['/login']);
  }
}
