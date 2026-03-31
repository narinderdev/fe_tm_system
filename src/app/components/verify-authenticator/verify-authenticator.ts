import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  PLATFORM_ID,
  QueryList,
  ViewChildren
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-verify-authenticator',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent],
  templateUrl: './verify-authenticator.html',
  styleUrls: ['./verify-authenticator.css']
})
export class VerifyAuthenticatorComponent implements AfterViewInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly otpDigits = ['', '', '', '', '', ''];
  loading = false;

  private readonly isBrowser: boolean;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.validateMfaState();
  }

  ngAfterViewInit(): void {
    this.focusInput(0);
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = (input.value || '').replace(/\\D/g, '').slice(-1);
    this.otpDigits[index] = digit;
    input.value = digit;

    if (digit && index < this.otpDigits.length - 1) {
      this.focusInput(index + 1);
    }

    this.tryAutoSubmit();
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      this.focusInput(index - 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\\D/g, '').slice(0, 6).split('');

    digits.forEach((digit, index) => {
      this.otpDigits[index] = digit;
    });

    for (let i = digits.length; i < this.otpDigits.length; i++) {
      this.otpDigits[i] = '';
    }

    const targetIndex = Math.min(digits.length, this.otpDigits.length - 1);
    this.focusInput(targetIndex);
    this.tryAutoSubmit();
  }

  verifyOtp(): void {
    if (this.loading || !this.isBrowser) {
      return;
    }

    const mfaToken = String(localStorage.getItem('mfa_token') ?? '').trim();
    if (!mfaToken) {
      this.toastr.error('MFA session expired. Please login again.');
      this.router.navigate(['/login']);
      return;
    }

    const code = this.otpDigits.join('');
    if (!/^\\d{6}$/.test(code)) {
      this.toastr.error('Please enter a valid 6-digit code.');
      return;
    }

    this.loading = true;
    this.authService
      .verifyLoginMfa(code, mfaToken)
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          const statusCode = response?.statusCode;
          if (statusCode !== 200 && statusCode !== 201) {
            this.toastr.error(response?.message || 'Authenticator verification failed.');
            return;
          }

          const authToken =
            (response as any)?.data?.token ??
            (response as any)?.token ??
            (response as any)?.data?.authToken ??
            (response as any)?.authToken;
          if (!authToken) {
            this.toastr.error('Missing auth token in MFA verification response.');
            return;
          }

          localStorage.setItem('authToken', String(authToken));
          localStorage.setItem('emailOtpVerified', 'true');
          localStorage.setItem('authenticatorVerified', 'true');
          localStorage.removeItem('mfa_token');
          this.toastr.success(response?.message || 'Authenticator verified successfully.');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Authenticator verification failed.');
        }
      });
  }

  private validateMfaState(): void {
    if (!this.isBrowser) {
      return;
    }
    const mfaEnabled = localStorage.getItem('mfaEnabled') === 'true';
    const mfaToken = String(localStorage.getItem('mfa_token') ?? '').trim();
    if (!mfaEnabled || !mfaToken) {
      this.toastr.warning('MFA verification is not available. Please login again.');
      this.router.navigate(['/login']);
    }
  }

  private tryAutoSubmit(): void {
    if (this.otpDigits.every((digit) => /^\\d$/.test(digit))) {
      this.verifyOtp();
    }
  }

  private focusInput(index: number): void {
    const items = this.otpInputs?.toArray() ?? [];
    if (!items[index]) {
      return;
    }
    items[index].nativeElement.focus();
    items[index].nativeElement.select();
  }
}