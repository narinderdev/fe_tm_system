import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { UserManagementService } from '../../services/user-management.service';
import { SpinnerComponent } from '../spinner/spinner';

const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[$@#%\^&*?\-+=])[A-Za-z\d$@#%\^&*?\-+=]{12,}$/;

const passwordMatchValidator: ValidatorFn = (control): ValidationErrors | null => {
  const password = control.get('password')?.value ?? '';
  const confirmPassword = control.get('confirmPassword')?.value ?? '';
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SpinnerComponent],
  templateUrl: './set-password.html',
  styleUrls: ['./set-password.css']
})
export class SetPasswordComponent {
  readonly form: FormGroup;

  email = '';
  loading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;
  showPasswordChecklist = false;
  globalError = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly userManagementService: UserManagementService,
    private readonly toastr: ToastrService
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.pattern(passwordPattern)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordMatchValidator }
    );

    this.email = String(this.route.snapshot.queryParamMap.get('email') ?? '').trim().toLowerCase();
    if (!this.email) {
      this.globalError = 'Invalid link. Email parameter is missing.';
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  onPasswordFocus(): void {
    this.showPasswordChecklist = true;
  }

  onPasswordBlur(controlName: 'password' | 'confirmPassword'): void {
    const value = String(this.form.get(controlName)?.value ?? '').trim();
    this.form.get(controlName)?.setValue(value);
    if (controlName === 'password') {
      setTimeout(() => {
        this.showPasswordChecklist = false;
      }, 120);
    }
  }

  get hasMinLength(): boolean {
    return String(this.form.get('password')?.value ?? '').length >= 12;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(String(this.form.get('password')?.value ?? ''));
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(String(this.form.get('password')?.value ?? ''));
  }

  get hasSpecialCharacter(): boolean {
    return /[$@#%\^&*?\-+=]/.test(String(this.form.get('password')?.value ?? ''));
  }

  get passwordMismatch(): boolean {
    return !!(
      this.form.errors?.['passwordMismatch']
      && (this.form.get('password')?.touched || this.form.get('confirmPassword')?.touched)
    );
  }

  get disableSubmit(): boolean {
    return this.loading || !this.email;
  }

  submit(): void {
    if (this.disableSubmit) {
      return;
    }
    this.globalError = '';
    this.form.get('password')?.setValue(String(this.form.get('password')?.value ?? '').trim());
    this.form.get('confirmPassword')?.setValue(String(this.form.get('confirmPassword')?.value ?? '').trim());

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const password = String(this.form.get('password')?.value ?? '').trim();
    this.loading = true;

    this.userManagementService
      .setPassword({ email: this.email, password })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          this.toastr.success(response?.message || 'Password set successfully! You can now login.');
          this.router.navigate(['/login']);
        },
        error: (err: any) => {
          this.globalError = err?.error?.message || 'Failed to set password. Please try again.';
          this.toastr.error(this.globalError);
        }
      });
  }
}
