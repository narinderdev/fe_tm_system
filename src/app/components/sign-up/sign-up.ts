import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

const namePattern = /^[A-Za-z]{2,}$/;
const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[$@#%\^&*?\-+=])[A-Za-z\d$@#%\^&*?\-+=]{12,}$/;

const passwordMatchValidator: ValidatorFn = (control): ValidationErrors | null => {
  const password = control.get('password')?.value ?? '';
  const confirmPassword = control.get('confirmPassword')?.value ?? '';
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SpinnerComponent],
  templateUrl: './sign-up.html',
  styleUrls: ['./sign-up.css']
})
export class SignUpComponent {
  readonly form: FormGroup;

  loading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;
  showPasswordChecklist = false;
  private readonly isBrowser: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.pattern(namePattern)]],
        lastName: ['', [Validators.required, Validators.pattern(namePattern)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.pattern(passwordPattern)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordMatchValidator }
    );
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  onEmailBlur(): void {
    const email = this.normalizedEmail;
    this.form.get('email')?.setValue(email);
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

  onPasswordFocus(): void {
    this.showPasswordChecklist = true;
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
      this.form.errors?.['passwordMismatch'] &&
      (this.form.get('password')?.touched || this.form.get('confirmPassword')?.touched)
    );
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    this.form.get('email')?.setValue(this.normalizedEmail);
    this.form.get('password')?.setValue(String(this.form.get('password')?.value ?? '').trim());
    this.form.get('confirmPassword')?.setValue(String(this.form.get('confirmPassword')?.value ?? '').trim());

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      firstName: String(this.form.get('firstName')?.value ?? '').trim(),
      lastName: String(this.form.get('lastName')?.value ?? '').trim(),
      email: this.normalizedEmail,
      password: String(this.form.get('password')?.value ?? '').trim()
    };

    this.loading = true;
    this.authService
      .signup(payload)
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          const statusCode = response?.statusCode;
          if (statusCode === 201 || statusCode === 202) {
            if (this.isBrowser) {
              localStorage.removeItem('signupUserId');
              localStorage.removeItem('signupEmail');
            }
            this.toastr.success(response?.message || 'Signup successful.');
            this.router.navigate(['/login']);
            return;
          }

          this.toastr.error(response?.message || 'An error occurred during signup. Please try again.');
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'An error occurred during signup. Please try again.');
        }
      });
  }

  private get normalizedEmail(): string {
    return String(this.form.get('email')?.value ?? '').trim().toLowerCase();
  }
}
