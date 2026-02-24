import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, PLATFORM_ID, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent],
  templateUrl: './verify-otp.html',
  styleUrls: ['./verify-otp.css']
})
export class VerifyOtpComponent {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly otpDigits = ['', '', '', '', '', ''];
  loading = false;
  email = '';

  private readonly isBrowser: boolean;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeEmail();
  }

  private initializeEmail(): void {
    const queryEmail = String(this.route.snapshot.queryParamMap.get('email') ?? '').trim().toLowerCase();

    if (queryEmail) {
      this.email = queryEmail;
      return;
    }

    if (this.isBrowser) {
      const signupUserId = localStorage.getItem('signupUserId');
      const fallbackEmail = String(localStorage.getItem('signupEmail') ?? '').trim().toLowerCase();
      if (signupUserId && fallbackEmail) {
        this.email = fallbackEmail;
        return;
      }
    }

    this.toastr.warning('Please sign up first to verify OTP.');
    this.router.navigate(['/sign-up']);
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = (input.value || '').replace(/\D/g, '').slice(-1);
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
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');

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
    if (this.loading || !this.email) {
      return;
    }

    const otp = this.otpDigits.join('');
    if (!/^\d{6}$/.test(otp)) {
      this.toastr.error('Please enter a valid 6-digit OTP.');
      return;
    }

    this.loading = true;
    this.authService
      .verifySignup({ email: this.email, otp })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          const statusCode = response?.statusCode;
          if (statusCode === 200 || statusCode === 201) {
            this.toastr.success(response?.message || 'Account verified successfully.');
            if (this.isBrowser) {
              localStorage.removeItem('signupUserId');
              localStorage.removeItem('signupEmail');
            }
            this.router.navigate(['/login']);
            return;
          }
          this.toastr.error(response?.message || 'OTP verification failed.');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'OTP verification failed.');
        }
      });
  }

  private tryAutoSubmit(): void {
    if (this.otpDigits.every((digit) => /^\d$/.test(digit))) {
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
