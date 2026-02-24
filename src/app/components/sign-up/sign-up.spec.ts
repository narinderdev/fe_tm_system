import { of, throwError } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SignUpComponent } from './sign-up';
import { AuthService } from '../../services/auth.service';

describe('SignUpComponent', () => {
  const authServiceMock = {
    signup: vi.fn()
  };

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  beforeEach(async () => {
    authServiceMock.signup.mockReset();
    toastrMock.success.mockReset();
    toastrMock.error.mockReset();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SignUpComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function createComponent(): SignUpComponent {
    const fixture = TestBed.createComponent(SignUpComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function fillValidForm(component: SignUpComponent): void {
    component.form.setValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'Test@Email.com ',
      password: 'Password$Strong',
      confirmPassword: 'Password$Strong'
    });
  }

  it('redirects to verify-otp on successful signup', () => {
    const component = createComponent();
    fillValidForm(component);
    authServiceMock.signup.mockReturnValue(of({ statusCode: 201, data: { id: 44 } }));

    component.submit();

    expect(authServiceMock.signup).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@email.com',
      password: 'Password$Strong'
    });
    expect(localStorage.getItem('signupUserId')).toBe('44');
    expect(localStorage.getItem('signupEmail')).toBe('test@email.com');
    expect(navigateSpy).toHaveBeenCalledWith(['/verify-otp'], {
      queryParams: { email: 'test@email.com' }
    });
  });

  it('enforces required field validation', () => {
    const component = createComponent();

    component.submit();

    expect(component.form.invalid).toBe(true);
    expect(authServiceMock.signup).not.toHaveBeenCalled();
  });

  it('shows mismatch error when passwords do not match', () => {
    const component = createComponent();
    component.form.setValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
      password: 'Password$Strong',
      confirmPassword: 'Password$Wrong'
    });

    component.submit();

    expect(component.form.errors?.['passwordMismatch']).toBeTruthy();
    expect(authServiceMock.signup).not.toHaveBeenCalled();
  });

  it('enforces password strength regex', () => {
    const component = createComponent();
    component.form.setValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
      password: 'weakpass',
      confirmPassword: 'weakpass'
    });

    component.submit();

    expect(component.form.get('password')?.invalid).toBe(true);
    expect(authServiceMock.signup).not.toHaveBeenCalled();
  });

  it('shows duplicate email API error', () => {
    const component = createComponent();
    fillValidForm(component);
    authServiceMock.signup.mockReturnValue(
      throwError(() => ({ error: { message: 'Email already exists' } }))
    );

    component.submit();

    expect(toastrMock.error).toHaveBeenCalledWith('Email already exists');
  });

  it('shows generic server error when API message is missing', () => {
    const component = createComponent();
    fillValidForm(component);
    authServiceMock.signup.mockReturnValue(throwError(() => ({ error: {} })));

    component.submit();

    expect(toastrMock.error).toHaveBeenCalledWith(
      'An error occurred during signup. Please try again.'
    );
  });
});
