import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../../services/auth.service';
import { SpinnerComponent } from '../spinner/spinner';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SpinnerComponent],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  readonly form: FormGroup;

  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      const email = this.normalizeEmail(params.get('email'));
      if (email) {
        this.form.patchValue({ email });
      }
    });
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    const email = this.normalizeEmail(this.form.get('email')?.value);
    this.form.patchValue({ email });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.authService
      .sendEmailMfaCodeForEmail({ email })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response?.message || 'Verification code sent to your email.');
          this.router.navigate(['/forgot-password/verify'], { queryParams: { email } });
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Failed to send verification code.');
        }
      });
  }

  private normalizeEmail(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }
}
