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

describe('TmSystemComponent (TM data tabs)', () => {
  const technicianServiceMock = {
    fetchTechnicians: vi.fn().mockReturnValue(
      of({
        data: {
          technicians: [
            { id: 2, technicianId: 'TECH-000002', firstName: 'Tech', lastName: 'User', email: 'tech@test.com', technicianType: 'TECHNICIAN', address: 'Plant 1', status: 'AVAILABLE' }
          ],
          totalElements: 1,
          size: 10,
          page: 0
        }
      })
    ),
    fetchTechnicianTeams: vi.fn().mockReturnValue(
      of({
        data: {
          teams: [
            { id: 1, teamName: 'Team A', teamLeaderName: 'Lead', status: 'ACTIVE', teamLeaderId: 2, technicians: [{ id: 2 }, { id: 3 }] }
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
    ),
    fetchWorkOrdersForTechnician: vi.fn().mockReturnValue(of({ data: { workOrders: [] } })),
    markWorkOrderFavourite: vi.fn().mockReturnValue(of({})),
    fetchGlAccounts: vi.fn().mockReturnValue(of({ data: [] })),
    fetchPropertyUnits: vi.fn().mockReturnValue(of({ data: [] }))
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
        { provide: ExpensesService, useValue: expensesServiceMock },
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
    expect(comp.teamRows[0].status).toBe('Active');
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

  it('loads technician list from technicians endpoint', () => {
    const comp = createComponentWithTab('technicians');
    expect(technicianServiceMock.fetchTechnicians).toHaveBeenCalled();
    expect(comp.technicianRows.length).toBe(1);
    expect(comp.technicianRows[0].email).toBe('tech@test.com');
    expect(comp.technicianRows[0].role).toBe('Technician');
    expect(comp.technicianRows[0].location).toBe('Plant 1');
  });
});
