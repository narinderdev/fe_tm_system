import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityRolesTabComponent } from './security-roles-tab';
import { SecurityService } from '../../services/security.service';

describe('SecurityRolesTabComponent', () => {
  const securityServiceMock = {
    fetchRoles: vi.fn()
  };

  beforeEach(async () => {
    securityServiceMock.fetchRoles.mockReset();
    securityServiceMock.fetchRoles.mockReturnValue(of({ data: { roles: [{ id: 1, name: 'Admin', status: 'ACTIVE' }], totalElements: 1 } }));

    await TestBed.configureTestingModule({
      imports: [SecurityRolesTabComponent],
      providers: [{ provide: SecurityService, useValue: securityServiceMock }]
    }).compileComponents();
  });

  it('loads roles on init', () => {
    const fixture = TestBed.createComponent(SecurityRolesTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(securityServiceMock.fetchRoles).toHaveBeenCalled();
    expect(comp.rows.length).toBe(1);
    expect(comp.rows[0].name).toBe('Admin');
  });

  it('handles API error', () => {
    securityServiceMock.fetchRoles.mockReturnValue(throwError(() => ({ error: { message: 'Role API failed' } })));
    const fixture = TestBed.createComponent(SecurityRolesTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.error).toBe('Role API failed');
  });
});
