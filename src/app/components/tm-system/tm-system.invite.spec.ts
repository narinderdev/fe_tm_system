import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';

import { TmSystemComponent } from './tm-system';
import { TechnicianService } from '../../services/technician.service';
import { WorkOrderService } from '../../services/work-order.service';
import { DashboardService } from '../../services/dashboard.service';
import { TimesheetService } from '../../services/timesheet.service';
import { UserManagementService } from '../../services/user-management.service';
import { PermissionService } from '../../services/permission.service';
import { ActivatedRoute } from '@angular/router';

describe('TmSystemComponent (invite technician)', () => {
  const technicianServiceMock = {
    fetchTechnicians: vi.fn().mockReturnValue(of({ data: { technicians: [], totalElements: 0, page: 0, size: 10 } })),
    fetchTechnicianTeams: vi.fn().mockReturnValue(of({ data: { teams: [] } })),
    fetchLeaves: vi.fn().mockReturnValue(of({ data: { leaves: [] } })),
    fetchHolidays: vi.fn().mockReturnValue(of({ data: { holidays: [] } }))
  };

  const workOrderServiceMock = {
    fetchWorkOrders: vi.fn().mockReturnValue(of({ data: { workOrders: [] } }))
  };

  const dashboardServiceMock = {
    fetchTechnicianDashboard: vi.fn().mockReturnValue(of({ data: {} }))
  };

  const timesheetServiceMock = {
    fetchTimesheets: vi.fn().mockReturnValue(of({ data: [] })),
    fetchTimesheetById: vi.fn().mockReturnValue(of({ data: {} })),
    submitTimesheet: vi.fn().mockReturnValue(of({ data: {} }))
  };

  const userManagementServiceMock = {
    inviteUser: vi.fn().mockReturnValue(of({ message: 'Invited.' }))
  };

  const permissionServiceMock = {
    hasPermission: vi.fn().mockReturnValue(true)
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  };

  beforeEach(async () => {
    technicianServiceMock.fetchTechnicians.mockClear();
    userManagementServiceMock.inviteUser.mockClear();
    toastrMock.success.mockClear();
    toastrMock.error.mockClear();

    await TestBed.configureTestingModule({
      imports: [TmSystemComponent],
      providers: [
        provideRouter([]),
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: WorkOrderService, useValue: workOrderServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: TimesheetService, useValue: timesheetServiceMock },
        { provide: UserManagementService, useValue: userManagementServiceMock },
        { provide: PermissionService, useValue: permissionServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ tab: 'technicians' })) }
        }
      ]
    }).compileComponents();
  });

  function createComponent(): TmSystemComponent {
    const fixture = TestBed.createComponent(TmSystemComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads roles and sends expected invite payload', () => {
    const component = createComponent();
    component.openInviteTechnician();
    component.inviteForm = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'John@Email.com'
    };

    component.submitInviteTechnician();

    expect(userManagementServiceMock.inviteUser).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@email.com'
    });
  });

  it('shows validation error and does not call API for invalid form', () => {
    const component = createComponent();
    component.inviteForm = {
      firstName: '',
      lastName: 'Doe',
      email: 'bad-email'
    };

    component.submitInviteTechnician();

    expect(userManagementServiceMock.inviteUser).not.toHaveBeenCalled();
    expect(toastrMock.error).toHaveBeenCalledWith('Please provide first name, last name and valid email.');
  });

  it('handles invite success and error', () => {
    const component = createComponent();
    component.inviteForm = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@email.com'
    };
    userManagementServiceMock.inviteUser.mockReturnValueOnce(of({ message: 'Invite sent successfully' }));
    component.submitInviteTechnician();

    expect(toastrMock.success).toHaveBeenCalledWith('Invite sent successfully');

    component.inviteForm = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@email.com'
    };
    userManagementServiceMock.inviteUser.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Failed to send invite' } }))
    );
    component.submitInviteTechnician();

    expect(toastrMock.error).toHaveBeenCalledWith('Failed to send invite');
  });
});
