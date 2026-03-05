import { of } from 'rxjs';
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

describe('TmSystemComponent (technician/team CRUD)', () => {
  const technicianServiceMock = {
    fetchTechnicians: vi.fn().mockReturnValue(
      of({
        data: {
          technicians: [
            { id: 2, technicianId: 'TECH-000002', firstName: 'Tech', lastName: 'User', email: 'tech@test.com', technicianType: 'TECHNICIAN', address: 'Plant 1', status: 'AVAILABLE' }
          ],
          totalElements: 1,
          page: 0,
          size: 10
        }
      })
    ),
    fetchTechnicianById: vi.fn().mockReturnValue(of({ data: { id: 2, firstName: 'Tech', lastName: 'User' } })),
    createTechnician: vi.fn().mockReturnValue(of({ data: { id: 10 } })),
    updateTechnician: vi.fn().mockReturnValue(of({ data: { id: 2 } })),
    deleteTechnician: vi.fn().mockReturnValue(of({})),
    fetchTechnicianTeams: vi.fn().mockReturnValue(
      of({
        data: {
          teams: [
            { id: 1, teamName: 'Team A', status: 'ACTIVE', teamLeaderId: 2, teamLeaderName: 'Tech User', technicians: [{ id: 2 }] }
          ],
          totalElements: 1,
          page: 0,
          size: 10
        }
      })
    ),
    fetchTechnicianTeamById: vi.fn().mockReturnValue(of({ data: { id: 1, teamName: 'Team A', teamLeaderId: 2, technicians: [{ id: 2 }], status: 'ACTIVE' } })),
    createTechnicianTeam: vi.fn().mockReturnValue(of({ data: { id: 4 } })),
    updateTechnicianTeam: vi.fn().mockReturnValue(of({ data: { id: 1 } })),
    deleteTechnicianTeam: vi.fn().mockReturnValue(of({})),
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
    fetchRoles: vi.fn().mockReturnValue(of({ data: [] })),
    inviteUser: vi.fn().mockReturnValue(of({ data: {} }))
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
    technicianServiceMock.createTechnician.mockClear();
    technicianServiceMock.createTechnicianTeam.mockClear();
    technicianServiceMock.deleteTechnician.mockClear();
    technicianServiceMock.updateTechnicianTeam.mockClear();
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

  it('creates technician from required form fields', () => {
    const component = createComponent();
    component.openTechnicianModal();
    component.technicianForm = {
      technicianId: 'TECH-000010',
      autoGenerateTechnicianId: false,
      badgeNumber: 'B-10',
      firstName: 'John',
      lastName: 'Doe',
      technicianType: 'TECHNICIAN',
      phoneNumber: '+15551230000',
      email: 'john@doe.com',
      status: 'AVAILABLE',
      skills: 'HVAC',
      certifications: 'EPA',
      address: 'Site A',
      hireDate: '2026-03-01',
      workShift: 'DAY',
      notes: '',
      certificateIssueDate: '',
      certificateExpiryDate: '',
      technicianPhotoUrl: '',
      certificateUrl: '',
      teamId: 1
    };

    component.submitTechnician();

    expect(technicianServiceMock.createTechnician).toHaveBeenCalled();
    expect(toastrMock.success).toHaveBeenCalledWith('Technician saved successfully.');
  });

  it('validates team leader must be selected technician', () => {
    const component = createComponent();
    component.openTeamModal();
    component.teamForm = {
      teamName: 'Team B',
      status: 'ACTIVE',
      teamLeaderId: 99,
      technicianIds: [2]
    };

    component.submitTeam();

    expect(technicianServiceMock.createTechnicianTeam).not.toHaveBeenCalled();
    expect(component.teamError).toBe('Team leader must be one of the selected technicians.');
  });

  it('creates team with technician members and leader', () => {
    const component = createComponent();
    component.openTeamModal();
    component.teamForm = {
      teamName: 'Team B',
      status: 'ACTIVE',
      teamLeaderId: 2,
      technicianIds: [2]
    };

    component.submitTeam();

    expect(technicianServiceMock.createTechnicianTeam).toHaveBeenCalledWith({
      teamName: 'Team B',
      status: 'ACTIVE',
      technicianIds: [2],
      teamLeaderId: 2
    });
    expect(toastrMock.success).toHaveBeenCalledWith('Team saved successfully.');
  });

  it('deletes technician and triggers team-consistency updates', () => {
    const component = createComponent();
    component.openTechnicianDelete({ id: 'TECH-000002', dbId: 2, name: 'Tech User', role: 'Technician', team: 'Team A', location: 'Plant 1', availability: 'Available', email: 'tech@test.com' });

    component.confirmTechnicianDelete();

    expect(technicianServiceMock.deleteTechnician).toHaveBeenCalledWith(2);
    expect(technicianServiceMock.updateTechnicianTeam).toHaveBeenCalled();
  });
});
