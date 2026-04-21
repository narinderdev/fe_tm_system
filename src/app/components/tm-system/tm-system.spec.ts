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
import { ExpensesService } from '../../services/expenses.service';
import { UserManagementService } from '../../services/user-management.service';
import { PermissionService } from '../../services/permission.service';
import { ActivatedRoute, Router } from '@angular/router';

describe('TmSystemComponent (dashboard)', () => {
  const paramMap$ = new BehaviorSubject(convertToParamMap({ tab: 'dashboard' }));

  const technicianServiceMock = {
    fetchActiveUsers: vi.fn().mockReturnValue(of({ data: [] })),
    fetchTechnicians: vi.fn().mockReturnValue(of({ data: { technicians: [] } })),
    fetchTechnicianTeams: vi.fn().mockReturnValue(of({ data: { teams: [] } })),
    fetchLeaves: vi.fn().mockReturnValue(of({ data: { leaves: [] } })),
    fetchHolidays: vi.fn().mockReturnValue(of({ data: { holidays: [] } }))
  };

  const workOrderServiceMock = {
    fetchWorkOrders: vi.fn().mockReturnValue(of({ data: { workOrders: [] } })),
    fetchWorkOrdersForTechnician: vi.fn().mockReturnValue(of({ data: { workOrders: [] } })),
    markWorkOrderFavourite: vi.fn().mockReturnValue(of({})),
    fetchGlAccounts: vi.fn().mockReturnValue(of({ data: [] })),
    fetchPropertyUnits: vi.fn().mockReturnValue(of({ data: [] }))
  };

  const dashboardServiceMock = {
    fetchTechnicianDashboard: vi.fn().mockReturnValue(
      of({
        data: {
          totalTechnicians: 3,
          availableToday: 1,
          onLeave: 0,
          workOrders: 29,
          recentActivities: []
        }
      })
    )
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

  const expensesServiceMock = {
    fetchExpenses: vi.fn().mockReturnValue(of([]))
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TmSystemComponent, RouterTestingModule],
      providers: [
        { provide: TechnicianService, useValue: technicianServiceMock },
        { provide: WorkOrderService, useValue: workOrderServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: TimesheetService, useValue: timesheetServiceMock },
        { provide: ExpensesService, useValue: expensesServiceMock },
        { provide: UserManagementService, useValue: userManagementServiceMock },
        { provide: PermissionService, useValue: permissionServiceMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap$.asObservable() }
        }
      ]
    }).compileComponents();
  });

  it('should create and load dashboard metrics', () => {
    const fixture = TestBed.createComponent(TmSystemComponent);
    fixture.detectChanges(); // triggers ngOnInit and subscriptions
    const comp = fixture.componentInstance;

    expect(comp).toBeTruthy();
    expect(dashboardServiceMock.fetchTechnicianDashboard).toHaveBeenCalled();
    expect(comp.metrics.length).toBe(4);
    expect(comp.metrics[0].label).toBe('Total Technicians');
  });
});
