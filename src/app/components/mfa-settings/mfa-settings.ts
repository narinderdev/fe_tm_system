import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, Input, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';
import { OtpCodeInputComponent } from '../otp-code-input/otp-code-input';

@Component({
  selector: 'app-mfa-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent, OtpCodeInputComponent],
  templateUrl: './mfa-settings.html',
  styleUrls: ['./mfa-settings.css']
})
export class MfaSettingsComponent {
  @Input() embedded = false;

  mfaEnabled = false;
  loadingSetup = false;
  verifyingSetup = false;
  readonly otpLength = 6;
  otpCode = '';

  secret = '';
  qrCodeImage = '';

  private readonly isBrowser: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.mfaEnabled = this.isBrowser && localStorage.getItem('mfaEnabled') === 'true';
    if (!this.mfaEnabled) {
      this.openMfaSetup();
    }
  }

  openMfaSetup(): void {
    if (this.loadingSetup || this.verifyingSetup || this.mfaEnabled) {
      return;
    }
    this.loadingSetup = true;
    this.authService
      .getMfaSetup()
      .pipe(
        take(1),
        finalize(() => {
          this.loadingSetup = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          this.secret = String(response?.data?.secret ?? '').trim();
          this.qrCodeImage = String(response?.data?.qrCodeImage ?? '').trim();
          this.otpCode = '';
          this.toastr.success(response?.message || 'Scan QR and enter OTP to enable MFA.');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Failed to initialize MFA setup.');
        }
      });
  }

  onOtpValueChange(code: string): void {
    this.otpCode = code;
  }

  verifyMfaSetup(): void {
    const code = this.otpCode;
    if (!new RegExp(`^\\d{${this.otpLength}}$`).test(code)) {
      this.toastr.error('Enter a valid 6-digit code.');
      return;
    }
    if (this.verifyingSetup) {
      return;
    }

    this.verifyingSetup = true;
    this.authService
      .verifyMfaSetup(code)
      .pipe(
        take(1),
        finalize(() => {
          this.verifyingSetup = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          this.mfaEnabled = true;
          this.otpCode = '';
          this.secret = '';
          this.qrCodeImage = '';
          if (this.isBrowser) {
            localStorage.setItem('mfaEnabled', 'true');
            localStorage.setItem('authenticatorVerified', 'true');
          }
          this.toastr.success(response?.message || 'MFA enabled successfully.');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Failed to verify MFA setup.');
        }
      });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}