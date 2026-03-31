import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-authenticator-verify',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent],
  templateUrl: './authenticator-verify.html',
  styleUrls: ['./authenticator-verify.css']
})
export class AuthenticatorVerifyComponent implements AfterViewInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  code: string[] = Array(6).fill('');
  loading = false;
  errorMessage = '';
  private autoSubmitTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {}

  get challengeEmail(): string {
    return this.authService.getMfaChallengeContext()?.email ?? '';
  }

  get canSubmit(): boolean {
    return this.code.every((digit) => /^\d$/.test(digit));
  }

  ngAfterViewInit(): void {
    this.focusInput(0);
  }

  trackByIndex(index: number): number {
    return index;
  }

  handleInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digit = (input.value || '').replace(/\D/g, '').slice(-1);

    this.code[index] = digit;
    input.value = digit;
    this.errorMessage = '';

    if (digit && index < this.code.length - 1) {
      this.focusInput(index + 1);
    }

    this.checkAndAutoSubmit();
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (this.code[index]) {
        this.code[index] = '';
        input.value = '';
      } else if (index > 0) {
        this.code[index - 1] = '';
        const prev = this.otpInputs.get(index - 1);
        if (prev) {
          prev.nativeElement.value = '';
        }
        this.focusInput(index - 1);
      }
      this.errorMessage = '';
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < this.code.length - 1) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  handlePaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '') || '';

    for (let i = 0; i < pasted.length && index + i < this.code.length; i++) {
      this.code[index + i] = pasted[i];
      const input = this.otpInputs.get(index + i);
      if (input) {
        input.nativeElement.value = pasted[i];
      }
    }

    const nextIndex = Math.min(index + pasted.length, this.code.length - 1);
    this.focusInput(nextIndex);
    this.errorMessage = '';
    this.checkAndAutoSubmit();
  }

  submit(): void {
    this.clearAutoSubmitTimer();

    if (this.loading) {
      return;
    }

    if (!this.canSubmit) {
      this.errorMessage = 'Enter the 6-digit code from your authenticator app.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService
      .verifyMfaCode(this.code.join(''))
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          const statusCode = response?.statusCode;
          const isSuccess = statusCode === 200 || statusCode === 201;
          if (!isSuccess) {
            const message = response?.message || 'Authenticator verification failed.';
            this.errorMessage = message;
            this.toastr.error(message);
            return;
          }

          this.authService.completeLogin(response);
          this.toastr.success(response?.message || 'Authenticator verified successfully.');
          this.router.navigate(['/dashboard']);
        },
        error: (err: any) => {
          const message = err?.error?.message || 'Authenticator verification failed.';
          this.errorMessage = message;
          this.toastr.error(message);
        }
      });
  }

  private checkAndAutoSubmit(): void {
    if (!this.canSubmit) {
      return;
    }

    this.clearAutoSubmitTimer();
    this.autoSubmitTimer = setTimeout(() => {
      this.submit();
      this.autoSubmitTimer = null;
    }, 250);
  }

  private clearAutoSubmitTimer(): void {
    if (this.autoSubmitTimer) {
      clearTimeout(this.autoSubmitTimer);
      this.autoSubmitTimer = null;
    }
  }

  private focusInput(index: number): void {
    const input = this.otpInputs.get(index);
    input?.nativeElement.focus();
    input?.nativeElement.select();
  }
}
