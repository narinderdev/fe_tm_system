import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityUsersTabComponent } from './security-users-tab';
import { SecurityService } from '../../services/security.service';

describe('SecurityUsersTabComponent', () => {
  const securityServiceMock = {
    fetchUsers: vi.fn()
  };

  beforeEach(async () => {
    securityServiceMock.fetchUsers.mockReset();
    securityServiceMock.fetchUsers.mockReturnValue(of({ data: { users: [{ id: 2, firstName: 'John', lastName: 'Doe', status: 'ACTIVE' }], totalElements: 1 } }));

    await TestBed.configureTestingModule({
      imports: [SecurityUsersTabComponent],
      providers: [{ provide: SecurityService, useValue: securityServiceMock }]
    }).compileComponents();
  });

  it('loads users on init', () => {
    const fixture = TestBed.createComponent(SecurityUsersTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(securityServiceMock.fetchUsers).toHaveBeenCalled();
    expect(comp.rows.length).toBe(1);
    expect(comp.fullName(comp.rows[0])).toBe('John Doe');
  });

  it('handles API error', () => {
    securityServiceMock.fetchUsers.mockReturnValue(throwError(() => ({ error: { message: 'User API failed' } })));
    const fixture = TestBed.createComponent(SecurityUsersTabComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.error).toBe('User API failed');
  });
});
