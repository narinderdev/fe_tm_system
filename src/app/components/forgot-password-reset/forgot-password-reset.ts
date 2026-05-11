import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[$@#%\^&*?\-+=])[A-Za-z\d$@#%\^&*?\-+=]{12,}$/;

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const newPassword = String(group.get('newPassword')?.value ?? '');
  const confirmPassword = String(group.get('confirmPassword')?.value ?? '');
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-forgot-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SpinnerComponent],
  templateUrl: './forgot-password-reset.html',
  styleUrls: ['./forgot-password-reset.css']
})
export class ForgotPasswordResetComponent {
  readonly form: FormGroup;

  email = '';
  loading = false;
  inlineError = '';
  newPasswordVisible = false;
  confirmPasswordVisible = false;
  showPasswordChecklist = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService
  ) {
    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.pattern(passwordPattern)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordMatchValidator }
    );

    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      this.email = this.normalizeEmail(params.get('email'));

      if (!this.email) {
        this.toastr.error('Verification step is required first.');
        this.router.navigate(['/forgot-password'], {
          queryParams: this.email ? { email: this.email } : undefined
        });
      }
    });
  }

  toggleNewPasswordVisibility(): void {
    this.newPasswordVisible = !this.newPasswordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  onPasswordFocus(): void {
    this.showPasswordChecklist = true;
  }

  onPasswordBlur(controlName: 'newPassword' | 'confirmPassword'): void {
    const value = String(this.form.get(controlName)?.value ?? '').trim();
    this.form.get(controlName)?.setValue(value);
    if (controlName === 'newPassword') {
      setTimeout(() => {
        this.showPasswordChecklist = false;
      }, 120);
    }
  }

  get hasMinLength(): boolean {
    return String(this.form.get('newPassword')?.value ?? '').length >= 12;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(String(this.form.get('newPassword')?.value ?? ''));
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(String(this.form.get('newPassword')?.value ?? ''));
  }

  get hasSpecialCharacter(): boolean {
    return /[$@#%\^&*?\-+=]/.test(String(this.form.get('newPassword')?.value ?? ''));
  }

  get passwordMismatch(): boolean {
    return !!(
      this.form.errors?.['passwordMismatch']
      && (this.form.get('newPassword')?.touched || this.form.get('confirmPassword')?.touched)
    );
  }

  submit(): void {
    if (this.loading || !this.email) {
      return;
    }

    this.inlineError = '';
    this.form.get('newPassword')?.setValue(String(this.form.get('newPassword')?.value ?? '').trim());
    this.form.get('confirmPassword')?.setValue(String(this.form.get('confirmPassword')?.value ?? '').trim());

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const newPassword = String(this.form.get('newPassword')?.value ?? '');
    this.loading = true;

    this.authService
      .resetPassword({
        email: this.email,
        newPassword
      })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message || 'Password reset successful. Please login.');
          this.router.navigate(['/login'], { queryParams: { email: this.email } });
        },
        error: (err) => {
          this.inlineError = err?.error?.message || 'Failed to reset password. Please try again.';
          this.toastr.error(this.inlineError);
        }
      });
  }

  private normalizeEmail(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }
}
