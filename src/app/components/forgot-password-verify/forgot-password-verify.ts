import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-forgot-password-verify',
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent],
  templateUrl: './forgot-password-verify.html',
  styleUrls: ['./forgot-password-verify.css']
})
export class ForgotPasswordVerifyComponent {
  code: string[] = Array(6).fill('');
  email = '';
  loading = false;
  inlineError = '';

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService
  ) {
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      this.email = this.normalizeEmail(params.get('email'));
      if (!this.email) {
        this.toastr.error('Email is required to verify reset code.');
        this.router.navigate(['/forgot-password']);
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digit = String(input.value || '').replace(/\D/g, '').slice(-1);
    this.code[index] = digit;
    input.value = digit;
    this.inlineError = '';

    if (digit && index < this.code.length - 1) {
      this.focusInput(index + 1);
    }
  }

  onBackspace(event: KeyboardEvent, index: number): void {
    if (event.key !== 'Backspace') {
      return;
    }

    const current = this.code[index];
    if (!current && index > 0) {
      this.code[index - 1] = '';
      const prev = this.inputs.get(index - 1);
      if (prev) {
        prev.nativeElement.value = '';
      }
      this.focusInput(index - 1);
      return;
    }

    this.code[index] = '';
  }

  onPaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();
    const pasted = String(event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!pasted) {
      return;
    }

    for (let i = 0; i < pasted.length && index + i < this.code.length; i += 1) {
      const value = pasted[i];
      this.code[index + i] = value;
      const current = this.inputs.get(index + i);
      if (current) {
        current.nativeElement.value = value;
      }
    }

    const nextIndex = Math.min(index + pasted.length, this.code.length - 1);
    this.focusInput(nextIndex);
    this.inlineError = '';
  }

  verify(): void {
    if (this.loading) {
      return;
    }

    const otp = this.code.join('');
    if (!/^\d{6}$/.test(otp)) {
      this.inlineError = 'Please enter a valid 6-digit code.';
      this.toastr.error(this.inlineError);
      return;
    }

    this.loading = true;
    this.inlineError = '';

    this.authService
      .verifyEmailMfaCodeForEmail({ email: this.email, code: otp })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message || 'Code verified successfully.');
          this.router.navigate(['/forgot-password/reset'], {
            queryParams: {
              email: this.email
            }
          });
        },
        error: (err) => {
          this.inlineError = err?.error?.message || 'Invalid code. Please try again.';
          this.toastr.error(this.inlineError);
        }
      });
  }

  useDifferentEmail(): void {
    this.router.navigate(['/forgot-password'], { queryParams: { email: this.email } });
  }

  private focusInput(index: number): void {
    const input = this.inputs.get(index);
    input?.nativeElement.focus();
    input?.nativeElement.select();
  }

  private normalizeEmail(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }
}
