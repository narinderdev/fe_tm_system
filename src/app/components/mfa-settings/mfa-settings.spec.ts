import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth.service';
import { MfaSettingsComponent } from './mfa-settings';

describe('MfaSettingsComponent', () => {
  const authServiceMock = {
    getMfaSetup: vi.fn(),
    verifyMfaSetup: vi.fn()
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    authServiceMock.getMfaSetup.mockReset();
    authServiceMock.verifyMfaSetup.mockReset();
    toastrMock.success.mockReset();
    toastrMock.error.mockReset();
    localStorage.clear();
    authServiceMock.getMfaSetup.mockReturnValue(
      of({ statusCode: 200, data: { secret: 'SECRET123', qrCodeImage: 'data:image/png;base64,abc' } })
    );

    await TestBed.configureTestingModule({
      imports: [MfaSettingsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function createComponent(): MfaSettingsComponent {
    const fixture = TestBed.createComponent(MfaSettingsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('enables mfa after setup verification', () => {
    authServiceMock.verifyMfaSetup.mockReturnValue(of({ statusCode: 200, message: 'Enabled' }));
    const component = createComponent();

    component.otpCode = '123456';
    component.verifyMfaSetup();

    expect(authServiceMock.getMfaSetup).toHaveBeenCalled();
    expect(authServiceMock.verifyMfaSetup).toHaveBeenCalledWith('123456');
    expect(localStorage.getItem('mfaEnabled')).toBe('true');
    expect(component.mfaEnabled).toBe(true);
  });

  it('does not request setup when mfa is already enabled', () => {
    localStorage.setItem('mfaEnabled', 'true');
    const component = createComponent();
    expect(component.mfaEnabled).toBe(true);
    expect(authServiceMock.getMfaSetup).not.toHaveBeenCalled();
  });

  it('shows error on setup failure', () => {
    const component = createComponent();
    authServiceMock.getMfaSetup.mockReturnValue(
      throwError(() => ({ error: { message: 'Setup failed' } }))
    );

    component.openMfaSetup();

    expect(toastrMock.error).toHaveBeenCalledWith('Setup failed');
  });

  it('navigates back to dashboard', () => {
    const component = createComponent();

    component.goToDashboard();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
