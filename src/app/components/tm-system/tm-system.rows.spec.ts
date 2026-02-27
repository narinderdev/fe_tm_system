import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { convertToParamMap, NavigationEnd } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastrService } from 'ngx-toastr';

import { TmSystemComponent } from './tm-system';
import { TechnicianService } from '../../services/technician.service';
import { WorkOrderService } from '../../services/work-order.service';
import { DashboardService } from '../../services/dashboard.service';
import { TimesheetService } from '../../services/timesheet.service';
import { UserManagementService } from '../../services/user-management.service';
import { PermissionService } from '../../services/permission.service';
import { ActivatedRoute, Router } from '@angular/router';

describe('TmSystemComponent (TM data tabs)', () => {
  const technicianServiceMock = {
    fetchActiveUsers: vi.fn().mockReturnValue(
      of({
        data: [
          { id: 1, firstName: 'Admin', lastName: 'User', email: 'admin@test.com', role: 'Admin', active: true },
          { id: 2, firstName: 'Tech', lastName: 'User', email: 'tech@test.com', role: 'Technician', active: true }
        ]
      })
    ),
    fetchTechnicians: vi.fn().mockReturnValue(of({ data: { technicians: [] } })),
    fetchTechnicianTeams: vi.fn().mockReturnValue(
      of({
        data: {
          teams: [
            { id: 1, teamName: 'Team A', teamLeaderName: 'Lead', technicians: [{}, {}] }
          ],
          totalElements: 1,
          size: 10,
          page: 0
        }
      })
    ),
    fetchLeaves: vi.fn().mockReturnValue(of({ data: { leaves: [] } })),
    fetchHolidays: vi.fn().mockReturnValue(
      of({
        data: {
          holidays: [
            { id: 9, holidayName: 'Test Holiday', holidayType: 'NATIONAL', holidayDate: '2026-02-05', notes: 'note' }
          ]
        }
      })
    )
  };

  const workOrderServiceMock = {
    fetchWorkOrders: vi.fn().mockReturnValue(
      of({
        data: {
          workOrders: [
            { id: 11, workOrderId: 'WO-1', woTitle: 'Fix pump', priority: 'HIGH', status: 'IN_PROGRESS', targetCompletionDate: '2026-02-10' }
          ],
          totalElements: 1,
          size: 10,
          page: 0
        }
      })
    )
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
    hasPermission: vi.fn().mockReturnValue(false)
  };

  const toastrMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  };

  const routerMock = {
    navigate: vi.fn(),
    events: of(new NavigationEnd(1, '/tm-system', '/tm-system')),
    url: '/tm-system'
  };

  function createComponentWithTab(tab: string) {
    const paramMap$ = new BehaviorSubject(convertToParamMap({ tab }));
    TestBed.overrideProvider(ActivatedRoute, { useValue: { paramMap: paramMap$.asObservable() } });
    const fixture = TestBed.createComponent(TmSystemComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TmSystemComponent, RouterTestingModule],
      providers: [
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: WorkOrderService, useValue: workOrderServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: TimesheetService, useValue: timesheetServiceMock },
        { provide: UserManagementService, useValue: userManagementServiceMock },
        { provide: PermissionService, useValue: permissionServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ tab: 'dashboard' })) } }
      ]
    }).compileComponents();
  });

  it('loads teams tab data', () => {
    const comp = createComponentWithTab('teams');
    expect(technicianServiceMock.fetchTechnicianTeams).toHaveBeenCalled();
    expect(comp.teamRows.length).toBe(1);
    expect(comp.teamRows[0].name).toBe('Team A');
  });

  it('loads work-orders tab data', () => {
    const comp = createComponentWithTab('work-orders');
    expect(workOrderServiceMock.fetchWorkOrders).toHaveBeenCalled();
    expect(comp.workOrderRows.length).toBe(1);
    expect(comp.workOrderRows[0].name).toBe('Fix pump');
  });

  it('loads holidays list in leaves tab', () => {
    const comp = createComponentWithTab('leaves');
    expect(technicianServiceMock.fetchHolidays).toHaveBeenCalled();
    expect(comp.holidayRows.length).toBe(1);
    expect(comp.holidayRows[0].name).toBe('Test Holiday');
  });

  it('filters technician list to technician role for technician login', () => {
    localStorage.setItem('userRole', 'TECHNICIAN');
    const comp = createComponentWithTab('technicians');
    expect(technicianServiceMock.fetchActiveUsers).toHaveBeenCalled();
    expect(comp.technicianRows.length).toBe(1);
    expect(comp.technicianRows[0].email).toBe('tech@test.com');
  });

  it('hides admin-role users in technician list for admin login', () => {
    localStorage.setItem('userRole', 'ADMIN');
    const comp = createComponentWithTab('technicians');
    expect(technicianServiceMock.fetchActiveUsers).toHaveBeenCalled();
    expect(comp.technicianRows.length).toBe(1);
    expect(comp.technicianRows[0].email).toBe('tech@test.com');
  });
});
