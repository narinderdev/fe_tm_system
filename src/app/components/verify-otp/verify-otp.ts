import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { SignupService } from '../../services/signup-service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent, RouterModule],
  templateUrl: './verify-otp.html',
  styleUrls: ['./verify-otp.css']
})
export class VerifyOtpComponent implements OnInit {
  code: string[] = Array(6).fill('');
  loading = false;
  email = '';
  errorMessage = '';
  private isBrowser = false;
  private autoSubmitTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private signupService: SignupService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const emailParam = params['email'];

      if (emailParam) {
        this.email = emailParam;
        if (this.isBrowser) {
          localStorage.setItem('signupEmail', emailParam);
        }
      } else {
        if (this.isBrowser) {
          const storedEmail = localStorage.getItem('signupEmail');
          const signupUserId = localStorage.getItem('signupUserId');
          if (storedEmail && signupUserId) {
            this.email = storedEmail;
          } else {
            this.toastr.warning('Please complete signup first');
            this.router.navigate(['/login']);
          }
        }
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  handleInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const digit = (input.value || '').replace(/\D/g, '').slice(-1);

    this.code[index] = digit;
    input.value = digit;

    if (digit) {
      if (index < this.code.length - 1) {
        this.focusInput(index + 1);
      } else {
        this.checkAndAutoSubmit();
      }
    } else {
      input.value = '';
    }

    this.errorMessage = '';
  }

  handleKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!this.code[index] && index > 0) {
        this.code[index - 1] = '';
        const prevInput = this.inputs.get(index - 1);
        if (prevInput) {
          prevInput.nativeElement.value = '';
        }
        this.focusInput(index - 1);
      } else {
        this.code[index] = '';
        input.value = '';
      }
    }
  }

  handlePaste(event: ClipboardEvent, index: number) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '') || '';

    for (let i = 0; i < pastedData.length && index + i < this.code.length; i++) {
      this.code[index + i] = pastedData[i];
      const input = this.inputs.get(index + i);
      if (input) {
        input.nativeElement.value = pastedData[i];
      }
    }

    const nextIndex = Math.min(index + pastedData.length, this.code.length - 1);
    this.focusInput(nextIndex);
    this.errorMessage = '';

    this.checkAndAutoSubmit();
  }

  checkAndAutoSubmit() {
    const allFilled = this.code.every(digit => digit !== '');
    if (!allFilled) {
      return;
    }

    if (this.autoSubmitTimer) {
      clearTimeout(this.autoSubmitTimer);
    }

    this.autoSubmitTimer = setTimeout(() => {
      this.submit();
      this.autoSubmitTimer = null;
    }, 300);
  }

  clearAutoSubmitTimer() {
    if (this.autoSubmitTimer) {
      clearTimeout(this.autoSubmitTimer);
      this.autoSubmitTimer = null;
    }
  }

  focusInput(index: number) {
    const input = this.inputs.get(index);
    input?.nativeElement.focus();
    input?.nativeElement.select();
  }

  submit() {
    this.clearAutoSubmitTimer();

    if (this.loading) {
      return;
    }

    const otp = this.code.join('');
    if (otp.length !== 6) {
      this.errorMessage = 'Enter the 6-digit code we sent.';
      return;
    }

    if (!this.email) {
      this.errorMessage = 'Email is missing. Please go back to signup.';
      this.toastr.error('Email is missing');
      return;
    }

    const payload = {
      email: this.email,
      otp
    };

    this.loading = true;

    this.signupService
      .verifyOtp(payload)
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: response => {
          const statusCode = response?.statusCode;
          const isSuccess = statusCode === 200 || statusCode === 201;
          const message = response?.message || (isSuccess ? 'OTP verified successfully.' : 'Invalid code.');

          if (isSuccess) {
            this.toastr.success(message);
            if (this.isBrowser) {
              localStorage.removeItem('signupUserId');
              localStorage.removeItem('signupEmail');
            }
            this.router.navigate(['/login']);
          } else {
            this.errorMessage = message;
            this.toastr.error(message);
          }
        },
        error: error => {
          const message = error?.error?.message || 'Invalid code. Please try again.';
          this.errorMessage = message;
          this.toastr.error(message);
        }
      });
  }

  editEmail() {
    this.router.navigate(['/login']);
  }
}
