import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';

import { SetPasswordComponent } from './set-password';
import { UserManagementService } from '../../services/user-management.service';
import { ActivatedRoute } from '@angular/router';

describe('SetPasswordComponent', () => {
  const userManagementServiceMock = {
    setPassword: vi.fn()
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    userManagementServiceMock.setPassword.mockReset();
    toastrMock.success.mockReset();
    toastrMock.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [SetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: UserManagementService, useValue: userManagementServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ email: 'invite@example.com', token: 'invite-token' })
            }
          }
        }
      ]
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function createComponent(): SetPasswordComponent {
    const fixture = TestBed.createComponent(SetPasswordComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('handles missing email query param', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: UserManagementService, useValue: userManagementServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({})
            }
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(SetPasswordComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.globalError).toBe('Invalid link. Required email/token parameters are missing.');
    expect(component.disableSubmit).toBe(true);
  });

  it('shows password mismatch validation', () => {
    const component = createComponent();
    component.form.setValue({
      password: 'Password$Strong',
      confirmPassword: 'Password$Wrong'
    });

    component.submit();

    expect(component.form.errors?.['passwordMismatch']).toBeTruthy();
    expect(userManagementServiceMock.setPassword).not.toHaveBeenCalled();
  });

  it('calls set-password API and redirects on success', () => {
    const component = createComponent();
    component.form.setValue({
      password: 'Password$Strong',
      confirmPassword: 'Password$Strong'
    });
    userManagementServiceMock.setPassword.mockReturnValue(of({ message: 'Password set successfully! You can now login.' }));

    component.submit();

    expect(userManagementServiceMock.setPassword).toHaveBeenCalledWith({
      email: 'invite@example.com',
      password: 'Password$Strong',
      invitationToken: 'invite-token'
    });
    expect(toastrMock.success).toHaveBeenCalledWith('Password set successfully! You can now login.');
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows inline/global error and toast on API failure', () => {
    const component = createComponent();
    component.form.setValue({
      password: 'Password$Strong',
      confirmPassword: 'Password$Strong'
    });
    userManagementServiceMock.setPassword.mockReturnValue(
      throwError(() => ({ error: { message: 'Failed to set password. Please try again.' } }))
    );

    component.submit();

    expect(component.globalError).toBe('Failed to set password. Please try again.');
    expect(toastrMock.error).toHaveBeenCalledWith('Failed to set password. Please try again.');
  });
});
