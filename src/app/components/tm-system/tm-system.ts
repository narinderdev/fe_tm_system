import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, Subject, takeUntil, take } from 'rxjs';
import { TechnicianService, ApiTechnician } from '../../services/technician.service';
import { WorkOrderService } from '../../services/work-order.service';
import { DashboardService, TechnicianDashboardData } from '../../services/dashboard.service';
import { FormsModule } from '@angular/forms';
import { Loader } from '../loader/loader';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { TimesheetService } from '../../services/timesheet.service';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from '../../services/permission.service';
import { UserManagementService } from '../../services/user-management.service';

interface Activity {
  technician: string;
  activity: string;
  time: string;
  status: 'Completed' | 'Working' | 'Pending' | 'Updated' | 'Joined';
}

interface MetricCard {
  label: string;
  value: number;
  accent: 'blue' | 'green' | 'orange' | 'amber' | 'red' | 'purple';
}

interface NavItem {
  id: TabId;
  label: string;
  icon: string;
}

type TabId = 'dashboard' | 'technicians' | 'teams' | 'work-orders' | 'leaves' | 'time-sheet' | 'settings';
type PayCodeType = 'worked' | 'non-worked' | 'premium';

interface TimeSheetPayCode {
  value: string;
  label: string;
  type: PayCodeType;
}

interface TimeSheetRow {
  id: number;
  date: string;
  entryType: string;
  technicianId: number;
  workOrderId: number;
  payCode: string;
  expenseCode: string;
  hours: number | null;
  amount: string;
  department: string;
  account: string;
  project: string;
  comment: string;
  markedForDelete: boolean;
  isExtraRow: boolean;
  isNewlyAdded: boolean;
}

interface WorkOrderProjectOption {
  id: number;
  name: string;
  workOrderNumber?: string;
  isFavourite: boolean;
}

type ProjectOptionsSource = 'default' | 'capex';

type TimeSheetViewMode = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
type TimeSheetScreenMode = 'list' | 'create';

interface TimesheetListItem {
  id: number;
  technicianName: string;
  periodStartDate: string;
  periodEndDate: string;
  viewType: string;
  status: string;
  rowCount: number;
  totalHours: number;
}

interface TechnicianRow {
  id: string;
  dbId?: number;
  name: string;
  badgeNumber?: string;
  role: string;
  team: string;
  teamId?: number;
  location: string;
  availability: string;
  email: string;
  rawStatus?: string;
}

interface TeamRow {
  id: string;
  dbId?: number;
  name: string;
  availability: string;
  leader: string;
  leaderId?: number | null;
  total: number;
  status: string;
  technicianIds: number[];
  activeWos: number | string;
}

interface TechnicianFormModel {
  technicianId: string;
  autoGenerateTechnicianId: boolean;
  badgeNumber: string;
  firstName: string;
  lastName: string;
  technicianType: string;
  phoneNumber: string;
  email: string;
  status: string;
  skills: string;
  certifications: string;
  address: string;
  hireDate: string;
  workShift: string;
  notes: string;
  certificateIssueDate: string;
  certificateExpiryDate: string;
  technicianPhotoUrl: string;
  certificateUrl: string;
  teamId: number | null;
}

interface TeamFormModel {
  teamName: string;
  status: string;
  teamLeaderId: number | null;
  technicianIds: number[];
}

@Component({
  selector: 'app-tm-system',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule, Loader, DeleteModalComponent],
  templateUrl: './tm-system.html',
  styleUrls: ['./tm-system.css']
})
export class TmSystemComponent implements OnInit, OnDestroy {
  activeTab: TabId = 'dashboard';
  private readonly destroy$ = new Subject<void>();
  readonly iconPath = '/assets/icons/';

  mobileMenuOpen = false;

  techniciansLoading = false;
  teamsLoading = false;
  workOrdersLoading = false;

  techniciansLoaded = false;
  teamsLoaded = false;
  workOrdersLoaded = false;

  showSearch = false;
  searchPlaceholder = '';

  dashboardLoaded = false;
  dashboardLoading = false;
  dashboardError?: string;

  techPage = 0;
  techSize = 10;
  techTotal = 0;

  teamPage = 0;
  teamSize = 10;
  teamTotal = 0;

  woPage = 0;
  woSize = 10;
  woTotal = 0;

  readonly navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'radix-icons_dashboard.svg' },
    { id: 'technicians', label: 'Technician List', icon: 'tec.svg' },
    { id: 'teams', label: 'Team', icon: 'streamline_hierarchy-10.svg' },
    { id: 'work-orders', label: 'Work Orders', icon: 'fluent-mdl2_work-flow.svg' },
    { id: 'leaves', label: 'PTO & Holidays', icon: 'proicons_document.svg' },
    { id: 'time-sheet', label: 'Time Sheet', icon: 'proicons_document.svg' }
  ];

  metrics: MetricCard[] = [];

  activities: Activity[] = [];

  technicianRows: TechnicianRow[] = [];
  teamRows: TeamRow[] = [];

  workOrderRows: Array<{
    id: string;
    dbId?: number | string;
    name: string;
    description: string;
    assigned: string;
    priority: string;
    status: string;
    dueDate: string;
  }> = [];

  leavesView: 'leaves' | 'holidays' = 'leaves';
  leavesLoading = false;
  leavesLoaded = false;
  holidaysLoading = false;
  holidaysLoaded = false;
  private pendingLoads = 0;
  leaveRows: Array<{ id: string; technician: string; from: string; to: string; reason: string; technicianId?: string | number }> = [];
  holidayRows: Array<{ id: string; name: string; date: string; type: string; notes: string }> = [];

  showHolidayModal = false;
  holidaySubmitting = false;
  holidayError?: string;
  editingHolidayId?: number | string;
  holidayPrefillLoading = false;
  showHolidayDeleteModal = false;
  deletingHolidayId?: number | string;
  holidayDeleting = false;
  holidayForm: { holidayName: string; holidayType: string; holidayDate: string; notes: string } = {
    holidayName: '',
    holidayType: 'NATIONAL',
    holidayDate: '',
    notes: ''
  };
  showInviteModal = false;
  inviteSubmitting = false;
  inviteForm: { firstName: string; lastName: string; email: string } = {
    firstName: '',
    lastName: '',
    email: ''
  };

  showTechnicianModal = false;
  showTechnicianDeleteModal = false;
  technicianSubmitting = false;
  technicianDeleting = false;
  technicianError?: string;
  editingTechnicianId?: number;
  deletingTechnicianId?: number;
  technicianForm: TechnicianFormModel = {
    technicianId: '',
    autoGenerateTechnicianId: true,
    badgeNumber: '',
    firstName: '',
    lastName: '',
    technicianType: '',
    phoneNumber: '',
    email: '',
    status: '',
    skills: '',
    certifications: '',
    address: '',
    hireDate: '',
    workShift: '',
    notes: '',
    certificateIssueDate: '',
    certificateExpiryDate: '',
    technicianPhotoUrl: '',
    certificateUrl: '',
    teamId: null
  };

  showTeamModal = false;
  showTeamDetailModal = false;
  showTeamDeleteModal = false;
  teamSubmitting = false;
  teamDeleting = false;
  teamError?: string;
  editingTeamId?: number;
  deletingTeamId?: number;
  selectedTeam?: TeamRow;
  teamForm: TeamFormModel = {
    teamName: '',
    status: 'ACTIVE',
    teamLeaderId: null,
    technicianIds: []
  };
  technicianOptions: Array<{ id: number; name: string; badgeNumber?: string }> = [];

  // Leave modal state
  showLeaveModal = false;
  leaveSubmitting = false;
  leaveError?: string;
  leaveTechLoading = false;
  leaveTechnicians: Array<{ id: number | string; name: string }> = [];
  leaveForm: { technicianId: number | string | undefined; startDate: string; endDate: string; reason: string } = {
    technicianId: undefined,
    startDate: '',
    endDate: '',
    reason: ''
  };
  editingLeaveId?: string | number;
  leavePrefillLoading = false;
  showLeaveDeleteModal = false;
  deletingLeaveId?: string | number;
  deletingLeaveTechId?: string | number;
  leaveDeleting = false;
  timeSheetReady = false;
  timeSheetScreenMode: TimeSheetScreenMode = 'list';
  timeSheetListLoading = false;
  timeSheetListError?: string;
  timeSheetList: TimesheetListItem[] = [];
  timeSheetView: TimeSheetViewMode = 'BIWEEKLY';
  payPeriodStart = '';
  payPeriodEnd = '';
  currentPeriodOffset = 0;
  nextTimeSheetRowId = 1;
  timesheetSubmitting = false;
  timesheetDraftSubmitting = false;
  editingTimesheetId?: number;
  timeSheetEditLoading = false;
  timeSheetProjectOptions: WorkOrderProjectOption[] = [];
  timeSheetProjectOptionsLoading = false;
  private loadedProjectOptionsSource?: ProjectOptionsSource;
  timeSheetTechnicianOptions: Array<{ id: number; name: string }> = [];
  timeSheetTechnicianLoading = false;
  selectedTimeSheetTechnicianId: number | null = null;
  saveAsTemplate = false;
  applyingTemplate = false;
  timeSheetDepartmentOptions: string[] = [];
  timeSheetDepartmentLoading = false;
  timeSheetGlAccountOptions: string[] = [];
  timeSheetGlAccountLoading = false;
  openProjectDropdownRowId?: number;
  private readonly favouritingWorkOrderIds = new Set<number>();

  readonly timeSheetPayCodes: TimeSheetPayCode[] = [
    { value: 'REGULAR', label: 'Regular', type: 'worked' },
    { value: 'PTO', label: 'PTO', type: 'non-worked' },
    { value: 'TRAINING', label: 'Training', type: 'worked' },
    { value: 'UNPAID_LEAVE', label: 'Unpaid leave', type: 'non-worked' },
    { value: 'OVERTIME', label: 'Overtime', type: 'premium' },
    { value: 'OVERTIME_1_5', label: 'Overtime 1.5', type: 'premium' },
    { value: 'MISC_LEAVE', label: 'Misc Leave', type: 'non-worked' },
    { value: 'JURY_DUTY', label: 'Jury Duty', type: 'non-worked' },
    { value: 'HOLIDAY_PAY', label: 'Holiday Pay', type: 'premium' },
    { value: 'DOUBLE_TIME', label: 'Double time', type: 'premium' },
    { value: 'BEREAVEMENT', label: 'Bereavement', type: 'non-worked' }
  ];
  readonly timeSheetEntryTypeOptions: string[] = ['TIME', 'EXPENSE'];
  readonly timeSheetExpenseCodeOptions: string[] = ['LABOR', 'TRAVEL', 'MEAL', 'MISCELLANEOUS', 'TRAINING'];

  timeSheetRows: TimeSheetRow[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private technicianService: TechnicianService,
    private workOrderService: WorkOrderService,
    private dashboardService: DashboardService,
    private timesheetService: TimesheetService,
    private userManagementService: UserManagementService,
    private permissionService: PermissionService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tab = (params.get('tab') as TabId | null) || 'dashboard';
      this.activeTab = this.isValidTab(tab) ? tab : 'dashboard';
      if (!this.isValidTab(tab)) {
        this.router.navigate(['/tm-system', this.activeTab], { replaceUrl: true });
      }
      this.loadTabData(this.activeTab);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(id: TabId) {
    if (id === this.activeTab) {
      this.mobileMenuOpen = false;
      return;
    }
    this.router.navigate(['/tm-system', id]);
    this.mobileMenuOpen = false;
    this.loadTabData(id);
  }

  get activeNav(): NavItem | undefined {
    return this.navItems.find(item => item.id === this.activeTab);
  }

  get activeLabel(): string {
    if (this.activeTab === 'dashboard') {
      return 'Dashboard';
    }
    return this.activeNav?.label ?? '';
  }

  private isValidTab(value: string): value is TabId {
    return this.navItems.some(i => i.id === value);
  }

  private loadTabData(tab: TabId): void {
    if (tab === 'dashboard') {
      this.loadDashboard();
    } else if (tab === 'technicians') {
      this.loadTechnicians();
    } else if (tab === 'teams') {
      this.loadTeams();
    } else if (tab === 'work-orders') {
      this.loadWorkOrders();
    } else if (tab === 'leaves') {
      this.holidaysLoaded = false;
      this.leavesLoaded = false;
      this.loadHolidays();
      this.loadLeaves();
    } else if (tab === 'time-sheet') {
      this.initializeTimeSheet();
    }
  }

  private initializeTimeSheet(): void {
    this.timeSheetScreenMode = 'list';
    this.openProjectDropdownRowId = undefined;
    if (this.isAdminRole) {
      this.loadTimeSheetTechnicianOptions();
    }
    this.loadTimesheetList();

    if (!this.timeSheetReady) {
      this.setPayPeriod(0);
      this.timeSheetReady = true;
    }
  }

  openTimeSheetCreate(): void {
    this.editingTimesheetId = undefined;
    this.openProjectDropdownRowId = undefined;
    this.saveAsTemplate = false;
    if (this.isAdminRole) {
      this.loadTimeSheetTechnicianOptions();
    }
    if (!this.timeSheetReady) {
      this.setPayPeriod(0);
      this.timeSheetReady = true;
    } else {
      this.setPayPeriod(this.currentPeriodOffset);
    }
    this.loadTimeSheetProjectOptions();
    this.loadTimeSheetDepartmentOptions();
    this.loadTimeSheetGlAccountOptions();
    this.timeSheetScreenMode = 'create';
    this.prefillCreateTimesheetFromDraft();
  }

  openTimeSheetList(): void {
    this.editingTimesheetId = undefined;
    this.timeSheetEditLoading = false;
    this.timeSheetScreenMode = 'list';
    this.loadTimesheetList();
  }

  private prefillCreateTimesheetFromDraft(): void {
    const technicianId = this.getCurrentTechnicianId();
    const periodStart = String(this.payPeriodStart ?? '').trim();
    const periodEnd = String(this.payPeriodEnd ?? '').trim();
    if (!technicianId || technicianId <= 0 || !periodStart || !periodEnd) {
      return;
    }

    this.timesheetService
      .fetchDraftByTechnicianAndPeriod(technicianId, periodStart, periodEnd)
      .pipe(take(1))
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const data = response?.data ?? response ?? {};
            const draftRows = this.normalizeTimeSheetRowsFromData(data);
            if (!draftRows.length) {
              return;
            }

            this.seedTimeSheetRows();
            const draftUiRows = draftRows.map((row: any) => this.toUiTimeSheetRow(row));
            this.mergeDraftRowsIntoCurrentPeriod(draftUiRows);
            this.includePrefilledOptions(draftUiRows);
            this.saveAsTemplate = !!(data?.save_as_template ?? data?.saveAsTemplate);

            const normalizedView = this.toTimeSheetViewMode(data?.view_type ?? data?.viewType);
            if (normalizedView) {
              this.timeSheetView = normalizedView;
            }

            if (this.isAdminRole) {
              const selectedId = Number(data?.technician_id ?? data?.technicianId ?? draftRows[0]?.technician_id ?? draftRows[0]?.technicianId);
              this.selectedTimeSheetTechnicianId = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : this.selectedTimeSheetTechnicianId;
            }

            this.loadTimeSheetProjectOptions();
            this.cdr.detectChanges();
          });
        },
        error: (err: any) => {
          if (Number(err?.status) !== 404) {
            return;
          }
          this.zone.run(() => {
            // If draft is not found, reset to empty rows for the selected period.
            this.seedTimeSheetRows();
            this.saveAsTemplate = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private mergeDraftRowsIntoCurrentPeriod(draftUiRows: TimeSheetRow[]): void {
    if (!this.timeSheetRows.length) {
      this.timeSheetRows = draftUiRows;
      return;
    }

    const groupedDraftRows = new Map<string, TimeSheetRow[]>();
    draftUiRows.forEach((row) => {
      const key = this.toDateKey(row.date);
      const list = groupedDraftRows.get(key) ?? [];
      list.push(row);
      groupedDraftRows.set(key, list);
    });

    const mergedRows: TimeSheetRow[] = [];
    this.timeSheetRows.forEach((baseRow) => {
      const key = this.toDateKey(baseRow.date);
      const dateDraftRows = groupedDraftRows.get(key) ?? [];
      if (!dateDraftRows.length) {
        mergedRows.push(baseRow);
        return;
      }

      const first = dateDraftRows[0];
      mergedRows.push({
        ...baseRow,
        entryType: first.entryType || baseRow.entryType,
        technicianId: first.technicianId || baseRow.technicianId,
        workOrderId: first.workOrderId || 0,
        payCode: first.payCode || baseRow.payCode,
        expenseCode: first.expenseCode || baseRow.expenseCode,
        hours: first.hours,
        amount: first.amount || baseRow.amount,
        department: first.department || '',
        account: first.account || '',
        project: first.project || '',
        comment: first.comment || '',
        markedForDelete: !!first.markedForDelete,
        isExtraRow: false,
        isNewlyAdded: false
      });

      dateDraftRows.slice(1).forEach((extraRow) => {
        mergedRows.push({
          ...extraRow,
          date: baseRow.date,
          isExtraRow: true,
          isNewlyAdded: false
        });
      });
    });

    this.timeSheetRows = mergedRows;
  }

  private includePrefilledOptions(rows: TimeSheetRow[]): void {
    const departments = Array.from(
      new Set(
        rows
          .map((row) => String(row.department ?? '').trim())
          .filter((value) => !!value)
      )
    );
    const accounts = Array.from(
      new Set(
        rows
          .map((row) => String(row.account ?? '').trim())
          .filter((value) => !!value)
      )
    );

    if (departments.length) {
      this.timeSheetDepartmentOptions = Array.from(new Set([...departments, ...this.timeSheetDepartmentOptions]));
    }
    if (accounts.length) {
      this.timeSheetGlAccountOptions = Array.from(new Set([...accounts, ...this.timeSheetGlAccountOptions]));
    }
  }

  loadTimesheetList(): void {
    if (this.timeSheetListLoading) {
      return;
    }

    this.timeSheetListLoading = true;
    this.timeSheetListError = undefined;
    const technicianId = this.getCurrentTechnicianId();
    const request$ =
      this.isTechnicianRole && technicianId > 0
        ? this.timesheetService.fetchTimesheetsByTechnician(technicianId)
        : this.timesheetService.fetchTimesheets();

    request$
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.timeSheetListLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const data = response?.data ?? response;
            const list = this.normalizeTimesheetList(data);

            if (!list.length) {
              this.timeSheetList = [];
              return;
            }
            this.timeSheetList = list;
          });
        },
        error: () => {
          this.zone.run(() => {
            this.timeSheetList = [];
            this.timeSheetListError = 'Failed to load timesheet list.';
            this.cdr.detectChanges();
          });
        }
      });
  }

  openTimesheetDetail(id: number): void {
    if (!id) {
      return;
    }
    this.router.navigate(['/tm-system', 'time-sheet', id]);
  }

  openTimesheetEdit(id: number): void {
    if (!id) {
      return;
    }
    this.timeSheetEditLoading = true;
    this.timesheetService
      .fetchTimesheetById(id)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.timeSheetEditLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const data = response?.data ?? response;
            const periodStart = data?.period_start_date ?? data?.periodStartDate ?? this.payPeriodStart;
            const periodEnd = data?.period_end_date ?? data?.periodEndDate ?? this.payPeriodEnd;
            const normalizedView = this.toTimeSheetViewMode(data?.view_type ?? data?.viewType);

            this.timeSheetView = normalizedView;
            this.payPeriodStart = periodStart;
            this.payPeriodEnd = periodEnd;
            this.currentPeriodOffset = 0;

            const sourceRows = this.normalizeTimeSheetRowsFromData(data);

            if (sourceRows.length) {
              this.timeSheetRows = sourceRows.map((row: any) => this.toUiTimeSheetRow(row));
              if (this.isAdminRole) {
                const selectedId = Number(sourceRows[0]?.technician_id ?? sourceRows[0]?.technicianId);
                this.selectedTimeSheetTechnicianId = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
              }
            } else {
              this.seedTimeSheetRows();
            }

            this.editingTimesheetId = id;
            this.loadTimeSheetProjectOptions();
            this.loadTimeSheetDepartmentOptions();
            this.loadTimeSheetGlAccountOptions();
            this.timeSheetScreenMode = 'create';
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.toastr.error('Failed to load timesheet for edit.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private setPayPeriod(offsetPeriods: number): void {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);

    if (this.timeSheetView === 'MONTHLY') {
      start = new Date(start.getFullYear(), start.getMonth() + offsetPeriods, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(0, 0, 0, 0);

      this.currentPeriodOffset = offsetPeriods;
      this.payPeriodStart = this.toIsoDate(start);
      this.payPeriodEnd = this.toIsoDate(end);
      this.seedTimeSheetRows();
      return;
    }

    const periodDays = this.timeSheetView === 'WEEKLY' ? 7 : 14;
    if (offsetPeriods > 0) {
      for (let i = 0; i < offsetPeriods; i += 1) {
        start = this.getNextPeriodStart(start, periodDays);
      }
    } else if (offsetPeriods < 0) {
      for (let i = 0; i < Math.abs(offsetPeriods); i += 1) {
        start = this.getPreviousPeriodStart(start, periodDays);
      }
    }
    const end = this.getPeriodEndDate(start, periodDays);

    this.currentPeriodOffset = offsetPeriods;
    this.payPeriodStart = this.toIsoDate(start);
    this.payPeriodEnd = this.toIsoDate(end);
    this.seedTimeSheetRows();
  }

  private getPeriodEndDate(start: Date, periodDays: number): Date {
    const end = new Date(start);
    end.setDate(start.getDate() + (periodDays - 1));
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    monthEnd.setHours(0, 0, 0, 0);
    if (end > monthEnd) {
      end.setTime(monthEnd.getTime());
    }
    end.setHours(0, 0, 0, 0);
    return end;
  }

  private getNextPeriodStart(start: Date, periodDays: number): Date {
    const end = this.getPeriodEndDate(start, periodDays);
    const next = new Date(end);
    next.setDate(end.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private getPreviousPeriodStart(start: Date, periodDays: number): Date {
    const previousDay = new Date(start);
    previousDay.setDate(start.getDate() - 1);
    previousDay.setHours(0, 0, 0, 0);
    return this.getPeriodStartForDate(previousDay, periodDays);
  }

  private getPeriodStartForDate(date: Date, periodDays: number): Date {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const dayOfMonth = date.getDate();
    const periodIndex = Math.floor((dayOfMonth - 1) / periodDays);
    const periodStart = new Date(monthStart);
    periodStart.setDate(monthStart.getDate() + (periodIndex * periodDays));
    periodStart.setHours(0, 0, 0, 0);
    return periodStart;
  }

  previousPayPeriod(): void {
    if (!this.canGoPreviousPayPeriod) {
      return;
    }
    this.setPayPeriod(this.currentPeriodOffset - 1);
  }

  nextPayPeriod(): void {
    this.setPayPeriod(this.currentPeriodOffset + 1);
  }

  get canGoPreviousPayPeriod(): boolean {
    const start = this.parseCalendarDate(this.payPeriodStart);
    if (!start) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    if (this.timeSheetView === 'MONTHLY') {
      previousPeriodStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      previousPeriodStart.setHours(0, 0, 0, 0);
      previousPeriodEnd = new Date(previousPeriodStart.getFullYear(), previousPeriodStart.getMonth() + 1, 0);
      previousPeriodEnd.setHours(0, 0, 0, 0);
    } else {
      const periodDays = this.timeSheetView === 'WEEKLY' ? 7 : 14;
      previousPeriodStart = this.getPreviousPeriodStart(start, periodDays);
      previousPeriodEnd = this.getPeriodEndDate(previousPeriodStart, periodDays);
    }

    return previousPeriodEnd >= today;
  }

  onTimeSheetViewChange(): void {
    this.currentPeriodOffset = 0;
    this.setPayPeriod(0);
  }

  onTimeSheetTechnicianChange(value: number | string | null): void {
    if (!this.isAdminRole) {
      return;
    }
    const selectedId = Number(value);
    this.selectedTimeSheetTechnicianId = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
    this.timeSheetProjectOptions = [];
    this.loadedProjectOptionsSource = undefined;
    this.openProjectDropdownRowId = undefined;
    const technicianId = this.getCurrentTechnicianId();
    if (!technicianId) {
      this.timeSheetRows = this.timeSheetRows.map((row) => ({
        ...row,
        technicianId: 0
      }));
      return;
    }
    this.timeSheetRows = this.timeSheetRows.map((row) => ({
      ...row,
      technicianId
    }));
    this.seedTimeSheetRows();
    this.loadTimeSheetProjectOptions();
    this.prefillCreateTimesheetFromDraft();
  }

  toggleProjectDropdown(rowId: number, event: MouseEvent): void {
    event.stopPropagation();
    const isClosing = this.openProjectDropdownRowId === rowId;
    this.openProjectDropdownRowId = isClosing ? undefined : rowId;
    if (isClosing) {
      return;
    }

    const row = this.timeSheetRows.find((item) => item.id === rowId);
    const source = this.resolveProjectOptionsSource(row?.account);
    const shouldReload = !this.timeSheetProjectOptions.length || this.loadedProjectOptionsSource !== source;
    if (shouldReload) {
      this.loadTimeSheetProjectOptions(source);
    }
  }

  onAccountChange(row: TimeSheetRow): void {
    row.project = '';
    row.workOrderId = 0;
    const source = this.resolveProjectOptionsSource(row.account);
    if (this.loadedProjectOptionsSource !== source) {
      this.timeSheetProjectOptions = [];
      this.loadedProjectOptionsSource = undefined;
    }
    if (this.openProjectDropdownRowId === row.id) {
      this.loadTimeSheetProjectOptions(source);
    }
  }

  onEntryTypeChange(row: TimeSheetRow): void {
    const type = this.normalizeEntryType(row);
    if (type === 'EXPENSE') {
      row.payCode = 'REGULAR';
      row.hours = null;
      return;
    }
    row.expenseCode = '';
    row.amount = '';
  }

  selectProjectOption(row: TimeSheetRow, option: WorkOrderProjectOption): void {
    row.project = option.workOrderNumber || option.name;
    row.workOrderId = option.id;
    this.openProjectDropdownRowId = undefined;
  }

  markProjectAsFavourite(option: WorkOrderProjectOption, event: MouseEvent): void {
    event.stopPropagation();
    if (!option.id || option.isFavourite || this.favouritingWorkOrderIds.has(option.id)) {
      return;
    }

    const technicianId = this.getCurrentTechnicianId();
    if (!technicianId) {
      this.toastr.error('Technician id is required to mark favourite.');
      return;
    }

    this.favouritingWorkOrderIds.add(option.id);
    this.workOrderService
      .markWorkOrderFavourite(option.id, technicianId)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.favouritingWorkOrderIds.delete(option.id);
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            option.isFavourite = true;
            this.timeSheetProjectOptions = [...this.timeSheetProjectOptions]
              .sort((a, b) => Number(b.isFavourite) - Number(a.isFavourite));
            this.toastr.success('Project marked as favourite.');
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.toastr.error('Failed to mark project as favourite.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  isProjectFavouriteSaving(optionId: number): boolean {
    return this.favouritingWorkOrderIds.has(optionId);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openProjectDropdownRowId = undefined;
  }

  addTimeSheetRow(date?: string, insertAfterIndex?: number): void {
    const nextRow: TimeSheetRow = {
      id: this.nextTimeSheetRowId++,
      date: date || this.payPeriodStart,
      entryType: '',
      technicianId: this.getCurrentTechnicianId(),
      workOrderId: 0,
      payCode: 'REGULAR',
      expenseCode: '',
      hours: null,
      amount: '',
      department: '',
      account: '',
      project: '',
      comment: '',
      markedForDelete: false,
      isExtraRow: true,
      isNewlyAdded: true
    };

    const targetIndex = Number(insertAfterIndex);
    if (Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex < this.timeSheetRows.length) {
      this.timeSheetRows.splice(targetIndex + 1, 0, nextRow);
    } else {
      this.timeSheetRows.push(nextRow);
    }

    setTimeout(() => {
      const row = this.timeSheetRows.find((item) => item.id === nextRow.id);
      if (row) {
        row.isNewlyAdded = false;
      }
    }, 1200);
  }

  removeTimeSheetRow(row: TimeSheetRow, index: number): void {
    if (!this.canDeleteRow(row, index)) {
      return;
    }
    if (index < 0 || index >= this.timeSheetRows.length) {
      return;
    }
    this.timeSheetRows.splice(index, 1);
  }

  shouldShowPlusForRow(row: TimeSheetRow, index: number): boolean {
    return this.isFirstRowForDate(index, row.date);
  }

  canDeleteRow(row: TimeSheetRow, _index: number): boolean {
    return this.getDateRowCount(row.date) > 1;
  }

  private isFirstRowForDate(index: number, date: string): boolean {
    const dateKey = this.toDateKey(date);
    return this.timeSheetRows.findIndex((row) => this.toDateKey(row.date) === dateKey) === index;
  }

  private getDateRowCount(date: string): number {
    const dateKey = this.toDateKey(date);
    return this.timeSheetRows.filter((row) => this.toDateKey(row.date) === dateKey).length;
  }

  private toDateKey(value: string): string {
    return String(value ?? '').trim();
  }

  deleteMarkedRows(): void {
    const remaining = this.timeSheetRows.filter((r) => !r.markedForDelete);
    this.timeSheetRows = remaining.length ? remaining : this.timeSheetRows.slice(0, 1).map((r) => ({
      ...r,
      markedForDelete: false
    }));
  }

  get workedTotal(): number {
    return this.totalByType('worked');
  }

  get nonWorkedTotal(): number {
    return this.totalByType('non-worked');
  }

  get premiumTotal(): number {
    return this.totalByType('premium');
  }

  get grandTotalHours(): number {
    return this.workedTotal + this.nonWorkedTotal + this.premiumTotal;
  }

  formatDisplayDate(value: string): string {
    if (!value) {
      return '-';
    }
    const date = this.parseCalendarDate(value);
    if (!date) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatCompactDate(value: string): string {
    if (!value) {
      return '-';
    }
    const date = this.parseCalendarDate(value);
    if (!date) {
      return value;
    }
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  get submissionDeadlineDate(): string {
    const referenceValue = this.payPeriodEnd || this.payPeriodStart;
    if (!referenceValue) {
      return '';
    }
    const referenceDate = this.parseCalendarDate(referenceValue);
    if (!referenceDate) {
      return '';
    }
    const deadline = new Date(referenceDate);
    deadline.setDate(referenceDate.getDate() + 3);
    deadline.setHours(0, 0, 0, 0);
    return this.toIsoDate(deadline);
  }

  onHoursInput(row: TimeSheetRow, value: string): void {
    const raw = String(value ?? '').trim();
    if (!raw.length) {
      row.hours = null;
      return;
    }
    const parsed = Number(raw);
    row.hours = Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : null;
  }

  getDailyTotalHours(date: string): number {
    const dateKey = this.toDateKey(date);
    if (!dateKey) {
      return 0;
    }
    const total = this.timeSheetRows.reduce((sum, row) => {
      if (this.toDateKey(row.date) !== dateKey) {
        return sum;
      }
      return sum + (Number(row.hours) || 0);
    }, 0);
    return Number(total.toFixed(2));
  }

  sendForApproval(): void {
    if (this.timesheetSubmitting || this.timesheetDraftSubmitting) {
      return;
    }
    if (this.isAdminRole && !this.getCurrentTechnicianId()) {
      this.toastr.error('Please select a technician.');
      return;
    }

    const invalidRequiredRows = this.timeSheetRows.filter((row) => {
      const hasHoursValue = (Number(row.hours) || 0) > 0;
      const hasAmountValue = this.parseAmount(row.amount) > 0;
      if (!hasHoursValue && !hasAmountValue) {
        return false;
      }
      const missingDepartment = !String(row.department ?? '').trim().length;
      const missingAccount = !String(row.account ?? '').trim().length;
      return missingDepartment || missingAccount;
    });
    if (invalidRequiredRows.length) {
      const invalidDates = Array.from(
        new Set(
          invalidRequiredRows
            .map((row) => this.formatDate(row.date))
            .filter((value) => !!String(value ?? '').trim().length)
        )
      );
      const dateSuffix = invalidDates.length ? ` Date(s): ${invalidDates.join(', ')}` : '';
      this.toastr.error(`Department and Account are required when Hours or Amount has a value.${dateSuffix}`);
      return;
    }

    const payloadSourceRows = this.timeSheetRows.filter((row) => this.rowHasAnyPayloadData(row));
    const payloadDays = this.buildTimesheetDaysPayload(payloadSourceRows);
    const workedTotal = Number(this.workedTotal) || 0;
    const nonWorkedTotal = Number(this.nonWorkedTotal) || 0;
    const premiumTotal = Number(this.premiumTotal) || 0;

    const payload = {
      period_start_date: this.payPeriodStart,
      period_end_date: this.payPeriodEnd,
      view_type: this.toApiViewType(this.timeSheetView),
      technician_id: this.getCurrentTechnicianId(),
      total_worked: workedTotal,
      total_non_worked: nonWorkedTotal,
      total_premium: premiumTotal,
      totalWorked: workedTotal,
      totalNonWorked: nonWorkedTotal,
      totalPremium: premiumTotal,
      timesheet_days: payloadDays,
      save_as_template: !!this.saveAsTemplate
    };

    const editingId = this.editingTimesheetId;
    const request$ = editingId
      ? this.timesheetService.updateTimesheet(editingId, payload)
      : this.timesheetService.submitTimesheet(payload);

    this.timesheetSubmitting = true;
    request$
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.timesheetSubmitting = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.saveAsTemplate = false;
            this.toastr.success(editingId ? 'Timesheet updated successfully.' : 'Timesheet sent for approval.');
            this.editingTimesheetId = undefined;
            this.openTimeSheetList();
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.toastr.error(editingId ? 'Failed to update timesheet.' : 'Failed to send timesheet for approval.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private totalByType(type: PayCodeType): number {
    return Number(
      this.timeSheetRows
        .filter((r) => this.payCodeType(r.payCode) === type)
        .reduce((sum, row) => sum + (Number(row.hours) || 0), 0)
        .toFixed(2)
    );
  }

  private payCodeType(payCode: string): PayCodeType {
    return this.timeSheetPayCodes.find((c) => c.value === payCode)?.type ?? 'worked';
  }

  private seedTimeSheetRows(): void {
    const start = this.parseCalendarDate(this.payPeriodStart);
    const end = this.parseCalendarDate(this.payPeriodEnd);
    if (!start || !end || start > end) {
      this.timeSheetRows = [];
      return;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const rows: TimeSheetRow[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      rows.push({
        id: this.nextTimeSheetRowId++,
        date: this.toIsoDate(cursor),
        entryType: '',
        technicianId: this.getCurrentTechnicianId(),
        workOrderId: 0,
        payCode: 'REGULAR',
        expenseCode: '',
        hours: null,
        amount: '',
        department: '',
        account: '',
      project: '',
      comment: '',
      markedForDelete: false,
      isExtraRow: false,
      isNewlyAdded: false
    });
      cursor.setDate(cursor.getDate() + 1);
    }
    this.timeSheetRows = rows;
  }

  private loadTimeSheetProjectOptions(source: ProjectOptionsSource = 'default'): void {
    if (this.timeSheetProjectOptionsLoading) {
      return;
    }
    const technicianId = this.getCurrentTechnicianId();
    if (!technicianId || technicianId <= 0) {
      this.timeSheetProjectOptions = [];
      this.loadedProjectOptionsSource = undefined;
      return;
    }

    this.timeSheetProjectOptionsLoading = true;
    const request$ = source === 'capex'
      ? this.workOrderService.fetchCapexWorkOrderNumbers()
      : this.workOrderService.fetchWorkOrderNumbers(technicianId);
    request$
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.timeSheetProjectOptionsLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            this.timeSheetProjectOptions = this.normalizeProjectOptions(response);
            this.loadedProjectOptionsSource = source;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.timeSheetProjectOptions = [];
            this.loadedProjectOptionsSource = undefined;
            this.cdr.detectChanges();
          });
        }
      });
  }

  saveTimesheetDraft(): void {
    if (this.timesheetSubmitting || this.timesheetDraftSubmitting) {
      return;
    }
    const technicianId = this.getCurrentTechnicianId();
    if (!technicianId) {
      this.toastr.error('Please select a technician.');
      return;
    }

    const payloadSourceRows = this.timeSheetRows.filter((row) => this.rowHasAnyPayloadData(row));
    const payloadDays = this.buildTimesheetDaysPayload(payloadSourceRows);
    const payload = {
      period_start_date: this.payPeriodStart,
      period_end_date: this.payPeriodEnd,
      view_type: this.toApiViewType(this.timeSheetView),
      technician_id: technicianId,
      total_worked: Number(this.workedTotal) || 0,
      total_non_worked: Number(this.nonWorkedTotal) || 0,
      total_premium: Number(this.premiumTotal) || 0,
      timesheet_days: payloadDays,
      save_as_template: !!this.saveAsTemplate
    };

    this.timesheetDraftSubmitting = true;
    this.timesheetService
      .saveTimesheetDraft(technicianId, payload)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.timesheetDraftSubmitting = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.toastr.success('Timesheet draft saved.');
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.toastr.error('Failed to save timesheet draft.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private resolveProjectOptionsSource(account?: string | null): ProjectOptionsSource {
    const normalized = String(account ?? '').trim();
    return normalized === '10700' ? 'capex' : 'default';
  }

  applyTemplate(): void {
    if (this.applyingTemplate) {
      return;
    }
    const technicianId = this.getCurrentTechnicianId();
    if (!technicianId || technicianId <= 0) {
      if (this.isAdminRole) {
        this.toastr.error('Please select a technician first.');
      }
      return;
    }

    this.applyingTemplate = true;
    this.timesheetService
      .fetchRecentEntryByTechnician(technicianId)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.applyingTemplate = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const data = response?.data ?? response ?? {};
            const payCode = String(data?.pay_code ?? data?.payCode ?? '').trim().toUpperCase();
            const department = String(data?.department ?? data?.accounting_unit ?? '').trim();
            const account = String(data?.account ?? data?.ferc ?? '').trim();
            const project = String(data?.project ?? data?.activity ?? '').trim();
            const templateHoursRaw = Number(data?.totalHours ?? data?.total_hours);
            const templateHours = Number.isFinite(templateHoursRaw) && templateHoursRaw >= 0
              ? Number(templateHoursRaw.toFixed(2))
              : null;

            if (department && !this.timeSheetDepartmentOptions.includes(department)) {
              this.timeSheetDepartmentOptions = [department, ...this.timeSheetDepartmentOptions];
            }
            if (account && !this.timeSheetGlAccountOptions.includes(account)) {
              this.timeSheetGlAccountOptions = [account, ...this.timeSheetGlAccountOptions];
            }

            this.timeSheetRows = this.timeSheetRows.map((row) => ({
              ...row,
              technicianId,
              payCode: payCode || row.payCode,
              hours: templateHours,
              department: department || row.department,
              account: account || row.account,
              project: project || row.project
            }));
            this.cdr.detectChanges();
          });
        },
        error: (err: any) => {
          this.zone.run(() => {
            const message = String(err?.error?.message ?? err?.message ?? 'Failed to apply template.').trim();
            this.toastr.error(message || 'Failed to apply template.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private loadTimeSheetTechnicianOptions(): void {
    if (!this.isAdminRole || this.timeSheetTechnicianLoading) {
      return;
    }

    this.timeSheetTechnicianLoading = true;
    this.technicianService
      .fetchTechnicians(0, 200)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.timeSheetTechnicianLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const list = response?.data?.technicians ?? [];
            this.timeSheetTechnicianOptions = list
              .map((tech: ApiTechnician) => ({
                id: Number(tech?.id),
                name: this.buildName(tech)
              }))
              .filter((item: { id: number; name: string }) => Number.isFinite(item.id) && item.id > 0);

            const hasSelected = this.timeSheetTechnicianOptions.some((item) => item.id === this.selectedTimeSheetTechnicianId);
            if (!hasSelected) {
              this.selectedTimeSheetTechnicianId = null;
            }

            this.timeSheetRows = this.timeSheetRows.map((row) => ({
              ...row,
              technicianId: this.getCurrentTechnicianId() || 0
            }));

            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.timeSheetTechnicianOptions = [];
            this.toastr.error('Failed to load technicians.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private loadTimeSheetGlAccountOptions(): void {
    if (this.timeSheetGlAccountLoading) {
      return;
    }

    this.timeSheetGlAccountLoading = true;
    this.workOrderService
      .fetchGlAccounts(0, 100)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.timeSheetGlAccountLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const apiOptions = this.normalizeGlAccountOptions(response);
            this.timeSheetGlAccountOptions = Array.from(new Set([...this.timeSheetGlAccountOptions, ...apiOptions]));
            this.timeSheetGlAccountLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.timeSheetGlAccountOptions = [];
            this.timeSheetGlAccountLoading = false;
            this.toastr.error('Failed to load GL account options.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private loadTimeSheetDepartmentOptions(): void {
    if (this.timeSheetDepartmentLoading) {
      return;
    }

    this.timeSheetDepartmentLoading = true;
    this.workOrderService
      .fetchPropertyUnits(0, 100)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.timeSheetDepartmentLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const apiOptions = this.normalizeDepartmentOptions(response);
            this.timeSheetDepartmentOptions = Array.from(new Set([...this.timeSheetDepartmentOptions, ...apiOptions]));
            this.timeSheetDepartmentLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.timeSheetDepartmentOptions = [];
            this.timeSheetDepartmentLoading = false;
            this.toastr.error('Failed to load department options.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private normalizeDepartmentOptions(response: any): string[] {
    const data = response?.data ?? response;
    const source = Array.isArray(data)
      ? data
      : (Array.isArray(data?.content)
        ? data.content
        : (Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data?.propertyUnits)
            ? data.propertyUnits
            : [])));

    const values = source
      .map((item: any) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        return String(item?.propertyUnit ?? item?.name ?? item?.unit ?? item?.value ?? '').trim();
      })
      .filter((value: string) => !!value);

    return Array.from(new Set<string>(values));
  }

  private normalizeGlAccountOptions(response: any): string[] {
    const data = response?.data ?? response;
    const source = Array.isArray(data)
      ? data
      : (Array.isArray(data?.content)
        ? data.content
        : (Array.isArray(data?.items)
          ? data.items
          : (Array.isArray(data?.glAccounts)
            ? data.glAccounts
            : [])));

    const values = source
      .map((item: any) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        return String(item?.glAccount ?? item?.name ?? item?.account ?? item?.value ?? '').trim();
      })
      .filter((value: string) => !!value);

    return Array.from(new Set<string>(values));
  }

  private normalizeProjectOptions(response: any): WorkOrderProjectOption[] {
    const favouriteSource = Array.isArray(response?.data?.favouriteWorkOrderNumbers)
      ? response.data.favouriteWorkOrderNumbers
      : (Array.isArray(response?.favouriteWorkOrderNumbers) ? response.favouriteWorkOrderNumbers : []);

    const normalCandidates = [
      response?.data?.workOrderNumbers,
      response?.data?.numbers,
      response?.workOrderNumbers,
      response?.numbers,
      response?.data,
      response,
      response?.data?.workOrders,
      response?.data?.content,
      response?.workOrders
    ];
    const normalSource = normalCandidates.find((candidate) => Array.isArray(candidate)) ?? [];

    const source = [...favouriteSource, ...normalSource];
    const favouriteKeys = new Set<string>(
      favouriteSource
        .map((item: any) => String(item?.id ?? item?.workOrderNumber ?? item?.work_order_number ?? '').trim())
        .filter((value: string) => !!value)
    );

    const byId = new Map<number, WorkOrderProjectOption>();
    source.forEach((item: any) => {
      const primitiveValue = typeof item === 'string' || typeof item === 'number' ? String(item).trim() : '';
      const derivedNumber = Number(primitiveValue.replace(/[^0-9]/g, ''));
      const id = Number(item?.id ?? item?.workOrderDbId ?? item?.work_order_id ?? item?.workOrderNumber ?? derivedNumber);
      if (!Number.isFinite(id) || id <= 0) {
        return;
      }
      if (byId.has(id)) {
        return;
      }
      const name =
        String(item?.woTitle ?? item?.name ?? item?.project ?? item?.workOrderId ?? item?.assetName ?? primitiveValue).trim()
        || `Work Order #${id}`;
      const workOrderNumber = String(item?.workOrderNumber ?? item?.work_order_number ?? item?.workOrderId ?? primitiveValue).trim();
      const isFavourite = !!(
        item?.isFavourite
        || item?.isFavorite
        || item?.favourite
        || item?.favorite
        || favouriteKeys.has(String(id))
        || (workOrderNumber ? favouriteKeys.has(workOrderNumber) : false)
      );
      byId.set(id, {
        id,
        name,
        workOrderNumber: workOrderNumber || undefined,
        isFavourite
      });
    });

    return Array.from(byId.values()).sort((a, b) => Number(b.isFavourite) - Number(a.isFavourite));
  }

  private dayOfWeekLabel(value: string): string {
    const date = this.parseCalendarDate(value);
    if (!date) {
      return '';
    }
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  }

  private parseCalendarDate(value: string): Date | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const local = new Date(year, month - 1, day);
      local.setHours(0, 0, 0, 0);
      return Number.isNaN(local.getTime()) ? null : local;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getCurrentTechnicianId(): number {
    const role = String(localStorage.getItem('userRole') ?? '').trim().toUpperCase();
    if (role === 'ADMIN') {
      const selected = Number(this.selectedTimeSheetTechnicianId);
      return Number.isFinite(selected) && selected > 0 ? selected : 0;
    }

    const raw = localStorage.getItem('technicianId');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private toApiViewType(view: TimeSheetViewMode): string {
    return view;
  }

  formatTimesheetViewType(value: string): string {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'WEEKLY' || normalized === 'WEEK') {
      return 'Weekly';
    }
    if (normalized === 'MONTHLY' || normalized === 'MONTH') {
      return 'Monthly';
    }
    if (normalized === 'BIWEEKLY' || normalized === 'BY_WEEK') {
      return 'Bi-Weekly';
    }
    return value || '-';
  }

  get pendingTimeSheetList(): TimesheetListItem[] {
    return this.timeSheetList.filter((item) => item.status === 'PENDING');
  }

  get approvedTimeSheetList(): TimesheetListItem[] {
    return this.timeSheetList.filter((item) => item.status === 'APPROVED');
  }

  get isEditingTimesheet(): boolean {
    return Number.isFinite(this.editingTimesheetId) && (this.editingTimesheetId || 0) > 0;
  }

  private toIsoDate(d: Date): string {
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeTimesheetList(data: any): TimesheetListItem[] {
    if (!data) {
      return [];
    }

    const source = Array.isArray(data)
      ? data
      : (Array.isArray(data?.timesheets)
        ? data.timesheets
        : (Array.isArray(data?.content)
          ? data.content
          : (typeof data === 'object' && data.id !== undefined && data.id !== null ? [data] : [])));

    return source
      .map((item: any) => {
        const rows = this.normalizeTimeSheetRowsFromData(item);
        const totalHours = rows.reduce((sum: number, row: any) => sum + (Number(row?.hours) || 0), 0);

        return {
          id: Number(item?.id) || 0,
          technicianName: item?.technicianName ?? item?.technician_name ?? '-',
          periodStartDate: item?.period_start_date ?? item?.periodStartDate ?? '-',
          periodEndDate: item?.period_end_date ?? item?.periodEndDate ?? '-',
          viewType: item?.view_type ?? item?.viewType ?? '-',
          status: String(item?.status ?? '-').trim().toUpperCase(),
          rowCount: rows.length,
          totalHours: Number(totalHours.toFixed(2))
        };
      })
      .filter((item: TimesheetListItem) => item.id > 0);
  }

  private normalizeTimeSheetRowsFromData(data: any): any[] {
    const explicitRows = Array.isArray(data?.timesheet_rows)
      ? data.timesheet_rows
      : (Array.isArray(data?.timesheetRows) ? data.timesheetRows : []);
    if (explicitRows.length) {
      return explicitRows;
    }

    const dayGroups = Array.isArray(data?.timesheet_days)
      ? data.timesheet_days
      : (Array.isArray(data?.timesheetDays) ? data.timesheetDays : []);
    if (!dayGroups.length) {
      return [];
    }

    return this.flattenTimesheetDays(dayGroups);
  }

  private flattenTimesheetDays(dayGroups: any[]): any[] {
    return dayGroups.flatMap((day: any) => {
      const dayDate = day?.date ?? this.payPeriodStart;
      const dayRows = Array.isArray(day?.rows) ? day.rows : [];
      return dayRows.map((row: any) => ({
        ...row,
        date: row?.date ?? dayDate,
        day_of_week: row?.day_of_week ?? day?.day_of_week ?? this.dayOfWeekLabel(dayDate)
      }));
    });
  }

  private toUiTimeSheetRow(row: any): TimeSheetRow {
    const inferredEntryType = String(row?.entry_type ?? row?.entryType ?? '').trim().toUpperCase();
    const normalizedEntryType = inferredEntryType
      || (row?.expense_code || row?.expenseCode || row?.expense_amount || row?.expenseAmount ? 'EXPENSE' : 'TIME');
    return {
      id: this.nextTimeSheetRowId++,
      date: row?.date ?? this.payPeriodStart,
      entryType: normalizedEntryType,
      technicianId: Number(row?.technician_id ?? row?.technicianId) || this.getCurrentTechnicianId(),
      workOrderId: Number(row?.work_order_id ?? row?.workOrderId) || 0,
      payCode: String(row?.pay_code ?? row?.payCode ?? 'REGULAR').toUpperCase(),
      expenseCode: String(row?.expense_code ?? row?.expenseCode ?? '').trim(),
      hours: row?.hours === null || row?.hours === undefined ? null : Number(row.hours),
      amount: String(row?.amount ?? row?.expense_amount ?? row?.expenseAmount ?? '').trim(),
      department: row?.department ?? row?.accounting_unit ?? row?.accountingUnit ?? '',
      account: row?.account ?? row?.ferc ?? '',
      project: row?.project ?? row?.activity ?? '',
      comment: row?.comment ?? '',
      markedForDelete: !!(row?.is_deleted ?? row?.isDeleted),
      isExtraRow: false,
      isNewlyAdded: false
    };
  }

  private buildTimesheetDaysPayload(rows: TimeSheetRow[]): Array<{
    date: string;
    day_of_week: string;
    daily_total: number;
    rows: Array<{
      entry_type: string;
      pay_code?: string;
      hours?: number;
      expense_code?: string;
      expense_amount?: number;
      accounting_unit: string;
      ferc: string;
      activity: string;
      comment: string;
      is_deleted: boolean;
    }>;
  }> {
    const grouped = new Map<string, TimeSheetRow[]>();
    rows.forEach((row) => {
      const key = String(row.date ?? '');
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([date, dayRows]) => {
        const dailyTotal = Number(dayRows.reduce((sum, row) => sum + this.rowContribution(row), 0).toFixed(2));
        return {
          date,
          day_of_week: this.dayOfWeekLabel(date),
          daily_total: dailyTotal,
          rows: dayRows.map((row) => {
            const entryType = this.normalizeEntryType(row);
            const base = {
              entry_type: entryType,
              accounting_unit: row.department || '',
              ferc: row.account || '',
              activity: row.project || '',
              comment: row.comment || '',
              is_deleted: !!row.markedForDelete
            };
            if (entryType === 'EXPENSE') {
              return {
                ...base,
                expense_code: String(row.expenseCode ?? '').trim().toUpperCase(),
                expense_amount: this.parseAmount(row.amount)
              };
            }
            return {
              ...base,
              pay_code: this.normalizePayCode(row.payCode),
              hours: Number(row.hours) || 0
            };
          })
        };
      });
  }

  private rowHasAnyPayloadData(row: TimeSheetRow): boolean {
    const payCode = String(row.payCode ?? '').trim().toUpperCase();
    const hours = Number(row.hours) || 0;
    const hasDepartment = !!String(row.department ?? '').trim().length;
    const hasAccount = !!String(row.account ?? '').trim().length;
    const hasProject = !!String(row.project ?? '').trim().length;
    const hasComment = !!String(row.comment ?? '').trim().length;
    const hasEntryType = !!String(row.entryType ?? '').trim().length;
    const hasExpenseCode = !!String(row.expenseCode ?? '').trim().length;
    const hasAmount = !!String(row.amount ?? '').trim().length;
    const hasNonDefaultPayCode = payCode.length > 0 && payCode !== 'REGULAR';
    return hours > 0 || hasDepartment || hasAccount || hasProject || hasComment || hasEntryType || hasExpenseCode || hasAmount || hasNonDefaultPayCode || !!row.markedForDelete;
  }

  private normalizeEntryType(row: TimeSheetRow): 'TIME' | 'EXPENSE' {
    const explicit = String(row.entryType ?? '').trim().toUpperCase();
    if (explicit === 'EXPENSE') {
      return 'EXPENSE';
    }
    if (explicit === 'TIME') {
      return 'TIME';
    }
    if (this.parseAmount(row.amount) > 0 || !!String(row.expenseCode ?? '').trim().length) {
      return 'EXPENSE';
    }
    return 'TIME';
  }

  private parseAmount(value: string | number | null | undefined): number {
    const raw = String(value ?? '').trim().replace(/,/g, '');
    if (!raw.length) {
      return 0;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
  }

  private normalizePayCode(payCode: string): string {
    const normalized = String(payCode ?? '').trim().toUpperCase();
    if (normalized === 'REGULAR') {
      return 'REG';
    }
    return normalized;
  }

  private rowContribution(row: TimeSheetRow): number {
    const entryType = this.normalizeEntryType(row);
    if (entryType === 'EXPENSE') {
      return this.parseAmount(row.amount);
    }
    return Number(row.hours) || 0;
  }

  private toTimeSheetViewMode(value: string): TimeSheetViewMode {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized === 'WEEKLY' || normalized === 'WEEK') {
      return 'WEEKLY';
    }
    if (normalized === 'MONTHLY' || normalized === 'MONTH') {
      return 'MONTHLY';
    }
    return 'BIWEEKLY';
  }

  private loadLeaves(): void {
    if (this.leavesLoading || this.leavesLoaded) {
      return;
    }
    this.leavesLoading = true;
    this.pendingLoads++;
    this.leaveRows = [];
    this.technicianService.fetchLeaves(0, 100).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.leavesLoading = false;
          this.leavesLoaded = true;
          this.pendingLoads = Math.max(0, this.pendingLoads - 1);
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const list = res?.data?.leaves ?? res?.data?.content ?? [];
          this.leaveRows = (list as any[]).map((l) => ({
            id: l.id?.toString() ?? l.leaveId ?? '-',
            technician: l.technicianName ?? l.technician ?? '-',
            from: l.fromDate ?? l.startDate ?? '-',
            to: l.toDate ?? l.endDate ?? '-',
            reason: l.reason ?? '',
            technicianId: l.technicianId ?? l.technician_id ?? l.technicianID ?? l.userId
          }));
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.leavesLoaded = true;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadDashboard(): void {
    if (this.dashboardLoaded || this.dashboardLoading) {
      return;
    }
    this.dashboardLoading = true;
    this.dashboardError = undefined;
    this.dashboardService
      .fetchTechnicianDashboard()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            const data: TechnicianDashboardData = response.data ?? {};
            const totalTechnicians = data.totalTechnicians ?? data.total_technicians ?? 0;
            const availableToday = data.availableToday ?? data.available_today ?? 0;
            const onLeave = data.onLeave ?? data.on_leave ?? 0;
            const workOrders = data.workOrders ?? data.work_orders ?? 0;

            this.metrics = [
              { label: 'Total Technicians', value: totalTechnicians, accent: 'blue' },
              { label: 'Available Today', value: availableToday, accent: 'green' },
              { label: 'On Leave', value: onLeave, accent: 'amber' },
              { label: 'Work Orders', value: workOrders, accent: 'purple' }
            ];

            const activitySource = data.recentActivities ?? data.recent_activities ?? [];
            this.activities = (activitySource ?? []).map((item) => ({
              technician: item.technician ?? (item as any).technicianName ?? (item as any).name ?? '-',
              activity: item.activity ?? (item as any).action ?? (item as any).title ?? '-',
              time: this.formatRelativeTime(item.time ?? (item as any).timeAgo ?? item.timestamp),
              status: this.normalizeActivityStatus(item.status ?? (item as any).state ?? 'Updated')
            }));

            this.dashboardLoading = false;
            this.dashboardLoaded = true;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.dashboardError = 'Unable to load dashboard data.';
            this.metrics = [
              { label: 'Total Technicians', value: 0, accent: 'blue' },
              { label: 'Available Today', value: 0, accent: 'green' },
              { label: 'On Leave', value: 0, accent: 'amber' },
              { label: 'Work Orders', value: 0, accent: 'purple' }
            ];
            this.activities = [];
            this.dashboardLoading = false;
            this.dashboardLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private loadTechnicians(): void {
    if (this.techniciansLoaded || this.techniciansLoading) {
      return;
    }
    this.techniciansLoading = true;
    this.techniciansLoaded = false;
    this.technicianService
      .fetchTechnicians(this.techPage, this.techSize)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.techniciansLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            const technicians = response.data?.technicians ?? [];
            this.technicianRows = technicians.map((tech) => this.mapTechnicianRow(tech));
            this.techTotal = response.data?.totalElements ?? technicians.length;
            if (typeof response.data?.size === 'number' && response.data.size > 0) {
              this.techSize = response.data.size;
            }
            if (typeof response.data?.page === 'number') {
              this.techPage = response.data.page;
            }
            this.refreshTechnicianOptionsFromRows();
            this.techniciansLoaded = true;
            this.techniciansLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.technicianRows = [];
            this.techniciansLoaded = true;
            this.techniciansLoading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private loadTeams(): void {
    if (this.teamsLoaded || this.teamsLoading) {
      return;
    }
    this.teamsLoading = true;
    this.teamsLoaded = false;
    this.technicianService
      .fetchTechnicianTeams(this.teamPage, this.teamSize)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.teamsLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            const teams = response.data?.teams ?? [];
            this.teamRows = teams.map((team) => this.mapTeamRow(team));
            this.teamTotal = response.data?.totalElements ?? teams.length;
            if (typeof response.data?.size === 'number' && response.data.size > 0) {
              this.teamSize = response.data.size;
            }
            if (typeof response.data?.page === 'number') {
              this.teamPage = response.data.page;
            }
            this.teamsLoaded = true;
            this.teamsLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.teamRows = [];
            this.teamsLoaded = true;
            this.teamsLoading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private mapTechnicianRow(tech: ApiTechnician): TechnicianRow {
    const dbId = typeof tech.id === 'number' ? tech.id : undefined;
    const technicianCode = tech.technicianId ?? (dbId ? `TECH-${`${dbId}`.padStart(6, '0')}` : '-');
    return {
      id: technicianCode,
      dbId,
      name: this.buildName(tech),
      badgeNumber: tech.badgeNumber ?? '',
      role: this.toTitleCase(tech.technicianType || 'Technician'),
      team: tech.teamName || this.resolvePrimaryTeamName(tech),
      teamId: this.resolvePrimaryTeamId(tech),
      location: tech.address || '-',
      availability: this.formatWorkStatus(tech.status),
      email: tech.email ?? '-',
      rawStatus: tech.status
    };
  }

  private mapTeamRow(team: any): TeamRow {
    const technicianIds = Array.isArray(team?.technicians)
      ? team.technicians
          .map((item: any) => Number(item?.id))
          .filter((value: number) => Number.isFinite(value) && value > 0)
      : [];
    return {
      id: team.id ? `TEAM${team.id}` : team.teamName ?? '-',
      dbId: team.id,
      name: team.teamName ?? '-',
      availability: (team as any).availability ?? (team as any).status ?? 'Unavailable',
      leader: team.teamLeaderName ?? '-',
      leaderId: team.teamLeaderId ?? null,
      total: team.technicians?.length ?? 0,
      status: this.toTitleCase(String((team as any).status ?? 'ACTIVE')),
      technicianIds,
      activeWos: '-'
    };
  }

  private resolvePrimaryTeamName(tech: ApiTechnician): string {
    const primary = tech.teamMemberships?.[0];
    return primary?.teamName ?? '-';
  }

  private resolvePrimaryTeamId(tech: ApiTechnician): number | undefined {
    const primary = tech.teamMemberships?.[0];
    const id = Number(primary?.teamId ?? tech.teamId);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }

  private refreshTechnicianOptionsFromRows(): void {
    this.technicianOptions = this.technicianRows
      .filter((row) => typeof row.dbId === 'number')
      .map((row) => ({ id: row.dbId as number, name: row.name, badgeNumber: row.badgeNumber }));
  }

  private formatWorkStatus(status?: string): string {
    if (!status) {
      return 'N/A';
    }
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'AVAILABLE':
        return 'Available';
      case 'WORKING':
        return 'Working';
      case 'ON_LEAVE':
      case 'ON LEAVE':
        return 'On leave';
      default:
        return status
          .toLowerCase()
          .split('_')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');
    }
  }

  private loadWorkOrders(): void {
    if (this.workOrdersLoaded || this.workOrdersLoading) {
      return;
    }
    this.workOrdersLoading = true;
    this.workOrdersLoaded = false;
    this.workOrderService
      .fetchWorkOrders(this.woPage, this.woSize)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.workOrdersLoading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            const orders = (response as any)?.data?.workOrders ?? [];
            this.workOrderRows = orders.map((order: any) => ({
              id: order.workOrderId ?? (order.id ? `WO${order.id}` : '-'),
              dbId: order.id ?? order.workOrderId,
              name: order.woTitle ?? 'Work Order',
              description: order.descriptionScope ?? order.notes ?? '-',
              assigned: order.assignedTechnicianName ?? order.assignedTechnician ?? 'Unassigned',
              priority: this.normalizePriority(order.priority),
              status: this.normalizeStatus(order.status),
              dueDate: this.formatDate(order.targetCompletionDate ?? order.plannedEndDateTime)
            }));
            this.woTotal = (response as any)?.data?.totalElements ?? orders.length;
            const size = (response as any)?.data?.size;
            if (typeof size === 'number' && size > 0) {
              this.woSize = size;
            }
            const page = (response as any)?.data?.page;
            if (typeof page === 'number') {
              this.woPage = page;
            }
            this.workOrdersLoaded = true;
            this.workOrdersLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.workOrderRows = [];
            this.workOrdersLoaded = true;
            this.workOrdersLoading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private buildName(tech: ApiTechnician): string {
    if (tech.fullName) {
      return tech.fullName;
    }
    const parts = [tech.firstName, tech.lastName].filter(Boolean);
    return parts.join(' ').trim() || '-';
  }

  private normalizePriority(value?: string): string {
    switch ((value ?? '').toUpperCase()) {
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      default:
        return 'Low';
    }
  }

  private normalizeStatus(value?: string): string {
    if (!value) {
      return 'Draft';
    }
    const words = value
      .toLowerCase()
      .split(/[_\s]+/)
      .filter(Boolean);
    if (!words.length) {
      return 'Draft';
    }
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  private formatRelativeTime(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const diffMs = Date.now() - parsed.getTime();
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
    return value;
  }

  private normalizeActivityStatus(value?: string): Activity['status'] {
    const normalized = (value ?? '').trim().toLowerCase();
    switch (normalized) {
      case 'completed':
      case 'complete':
        return 'Completed';
      case 'working':
      case 'in_progress':
      case 'in progress':
        return 'Working';
      case 'pending':
        return 'Pending';
      case 'updated':
      case 'update':
        return 'Updated';
      case 'joined':
        return 'Joined';
      default:
        return 'Updated';
    }
  }

  private formatWorkShift(value?: string | null): string {
    if (!value) {
      return '-';
    }
    return value
      .split('_')
      .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
  }

  private toTitleCase(value: string): string {
    return String(value ?? '')
      .toLowerCase()
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  setLeavesView(view: 'leaves' | 'holidays'): void {
    this.leavesView = view;
    if (view === 'holidays') {
      this.holidaysLoaded = false;
      this.loadHolidays();
    } else {
      this.leavesLoaded = false;
      this.loadLeaves();
    }
    this.cdr.detectChanges();
  }

  techTotalPages(): number {
    return Math.max(1, Math.ceil(this.techTotal / Math.max(1, this.techSize)));
  }

  teamTotalPages(): number {
    return Math.max(1, Math.ceil(this.teamTotal / Math.max(1, this.teamSize)));
  }

  woTotalPages(): number {
    return Math.max(1, Math.ceil(this.woTotal / Math.max(1, this.woSize)));
  }

  changeTechPage(delta: number): void {
    const next = this.techPage + delta;
    if (next < 0 || next >= this.techTotalPages()) return;
    this.techPage = next;
    this.techniciansLoaded = false;
    this.loadTechnicians();
  }

  changeTeamPage(delta: number): void {
    const next = this.teamPage + delta;
    if (next < 0 || next >= this.teamTotalPages()) return;
    this.teamPage = next;
    this.teamsLoaded = false;
    this.loadTeams();
  }

  changeWoPage(delta: number): void {
    const next = this.woPage + delta;
    if (next < 0 || next >= this.woTotalPages()) return;
    this.woPage = next;
    this.workOrdersLoaded = false;
    this.loadWorkOrders();
  }

  goToTechnicianCreate(): void {
    this.router.navigate(['/tm-system', 'technicians', 'add']);
  }

  goToTechnicianEdit(row: TechnicianRow): void {
    if (!row.dbId) {
      this.toastr.error('Technician id missing.');
      return;
    }
    this.router.navigate(['/tm-system', 'technicians', 'edit', row.dbId]);
  }

  openTechnicianModal(): void {
    this.editingTechnicianId = undefined;
    this.technicianError = undefined;
    this.technicianSubmitting = false;
    const today = new Date().toISOString().slice(0, 10);
    this.technicianForm = {
      technicianId: '',
      autoGenerateTechnicianId: true,
      badgeNumber: '',
      firstName: '',
      lastName: '',
      technicianType: '',
      phoneNumber: '',
      email: '',
      status: '',
      skills: '',
      certifications: '',
      address: '',
      hireDate: today,
      workShift: '',
      notes: '',
      certificateIssueDate: '',
      certificateExpiryDate: '',
      technicianPhotoUrl: '',
      certificateUrl: '',
      teamId: null
    };
    this.ensureTechnicianOptions();
    this.showTechnicianModal = true;
  }

  openTechnicianView(row: TechnicianRow): void {
    if (!row.dbId) {
      this.toastr.error('Technician id missing.');
      return;
    }
    this.router.navigate(['/tm-system', 'technicians', row.dbId]);
  }

  openTechnicianEdit(row: TechnicianRow): void {
    if (!row.dbId) {
      this.toastr.error('Technician id missing.');
      return;
    }
    this.editingTechnicianId = row.dbId;
    this.technicianError = undefined;
    this.technicianSubmitting = false;
    const today = new Date().toISOString().slice(0, 10);
    this.technicianForm = {
      technicianId: row.id,
      autoGenerateTechnicianId: false,
      badgeNumber: '',
      firstName: '',
      lastName: '',
      technicianType: row.role.toUpperCase(),
      phoneNumber: '',
      email: row.email === '-' ? '' : row.email,
      status: (row.rawStatus ?? row.availability).toString().replace(/\s+/g, '_').toUpperCase(),
      skills: '',
      certifications: '',
      address: row.location === '-' ? '' : row.location,
      hireDate: today,
      workShift: '',
      notes: '',
      certificateIssueDate: '',
      certificateExpiryDate: '',
      technicianPhotoUrl: '',
      certificateUrl: '',
      teamId: row.teamId ?? null
    };
    this.showTechnicianModal = true;

    this.technicianService
      .fetchTechnicianById(row.dbId)
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          this.zone.run(() => {
            const tech = res?.data ?? res ?? {};
            this.technicianForm = {
              technicianId: tech.technicianId ?? this.technicianForm.technicianId,
              autoGenerateTechnicianId: false,
              badgeNumber: tech.badgeNumber ?? '',
              firstName: tech.firstName ?? '',
              lastName: tech.lastName ?? '',
              technicianType: String(tech.technicianType ?? this.technicianForm.technicianType ?? ''),
              phoneNumber: tech.phoneNumber ?? '',
              email: tech.email ?? this.technicianForm.email,
              status: String(tech.status ?? this.technicianForm.status ?? ''),
              skills: tech.skills ?? '',
              certifications: tech.certifications ?? '',
              address: tech.address ?? this.technicianForm.address,
              hireDate: tech.hireDate ?? this.technicianForm.hireDate,
              workShift: tech.workShift ?? '',
              notes: tech.notes ?? '',
              certificateIssueDate: tech.certificateIssueDate ?? '',
              certificateExpiryDate: tech.certificateExpiryDate ?? '',
              technicianPhotoUrl: tech.technicianPhotoUrl ?? '',
              certificateUrl: tech.certificateUrl ?? '',
              teamId: this.resolvePrimaryTeamId(tech) ?? this.technicianForm.teamId
            };
            this.cdr.detectChanges();
          });
        }
      });
  }

  closeTechnicianModal(): void {
    if (this.technicianSubmitting) {
      return;
    }
    this.showTechnicianModal = false;
    this.editingTechnicianId = undefined;
    this.technicianError = undefined;
  }

  openTechnicianDelete(row: TechnicianRow): void {
    if (!row.dbId) {
      return;
    }
    this.deletingTechnicianId = row.dbId;
    this.showTechnicianDeleteModal = true;
    this.technicianError = undefined;
  }

  closeTechnicianDelete(): void {
    if (this.technicianDeleting) {
      return;
    }
    this.showTechnicianDeleteModal = false;
    this.deletingTechnicianId = undefined;
  }

  submitTechnician(): void {
    const technicianId = String(this.technicianForm.technicianId ?? '').trim();
    const firstName = String(this.technicianForm.firstName ?? '').trim();
    const lastName = String(this.technicianForm.lastName ?? '').trim();
    const technicianType = String(this.technicianForm.technicianType ?? '').trim().toUpperCase();
    const phoneNumber = String(this.technicianForm.phoneNumber ?? '').trim();
    const email = String(this.technicianForm.email ?? '').trim().toLowerCase();
    const status = String(this.technicianForm.status ?? '').trim().toUpperCase();
    const skills = String(this.technicianForm.skills ?? '').trim();
    const certifications = String(this.technicianForm.certifications ?? '').trim();
    const address = String(this.technicianForm.address ?? '').trim();
    const hireDate = String(this.technicianForm.hireDate ?? '').trim();
    const workShift = String(this.technicianForm.workShift ?? '').trim().toUpperCase();
    const notes = String(this.technicianForm.notes ?? '').trim();
    const badgeNumber = String(this.technicianForm.badgeNumber ?? '').trim();
    const certificateIssueDate = String(this.technicianForm.certificateIssueDate ?? '').trim();
    const certificateExpiryDate = String(this.technicianForm.certificateExpiryDate ?? '').trim();
    const technicianPhotoUrl = String(this.technicianForm.technicianPhotoUrl ?? '').trim();
    const certificateUrl = String(this.technicianForm.certificateUrl ?? '').trim();
    const teamId = this.technicianForm.teamId ? Number(this.technicianForm.teamId) : undefined;

    if (
      (!this.technicianForm.autoGenerateTechnicianId && !technicianId)
      || !firstName
      || !lastName
      || !technicianType
      || !phoneNumber
      || !email
      || !status
      || !skills
      || !address
      || !hireDate
      || !workShift
    ) {
      this.technicianError = 'Please fill all required fields.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.technicianError = 'Please enter a valid email address.';
      return;
    }

    this.technicianSubmitting = true;
    this.technicianError = undefined;
    const payload = this.buildTechnicianPayload({
      technicianId,
      autoGenerateTechnicianId: this.technicianForm.autoGenerateTechnicianId,
      firstName,
      lastName,
      technicianType,
      phoneNumber,
      email,
      status,
      skills,
      certifications,
      address,
      hireDate,
      workShift,
      notes,
      badgeNumber,
      certificateIssueDate,
      certificateExpiryDate,
      technicianPhotoUrl,
      certificateUrl,
      teamId
    });
    const request$ = this.editingTechnicianId
      ? this.technicianService.updateTechnician(this.editingTechnicianId, payload)
      : this.technicianService.createTechnician(payload);

    request$
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.technicianSubmitting = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.showTechnicianModal = false;
            this.editingTechnicianId = undefined;
            this.toastr.success('Technician saved successfully.');
            this.techniciansLoaded = false;
            this.teamsLoaded = false;
            this.loadTechnicians();
            this.loadTeams();
          });
        },
        error: (err: any) => {
          this.zone.run(() => {
            this.technicianError = err?.error?.message ?? 'Failed to save technician.';
            this.cdr.detectChanges();
          });
        }
      });
  }

  onTechnicianFileSelected(event: Event, field: 'technicianPhotoUrl' | 'certificateUrl'): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.technicianForm[field] = file ? file.name : '';
  }

  onAutoGenerateTechnicianIdChange(): void {
    if (this.technicianForm.autoGenerateTechnicianId) {
      this.technicianForm.technicianId = '';
    }
  }

  confirmTechnicianDelete(): void {
    if (!this.deletingTechnicianId) {
      return;
    }
    const technicianId = this.deletingTechnicianId;
    this.technicianDeleting = true;
    this.technicianService
      .deleteTechnician(technicianId)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.technicianDeleting = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.showTechnicianDeleteModal = false;
            this.deletingTechnicianId = undefined;
            this.ensureTeamConsistencyAfterTechnicianDelete(technicianId);
            this.techniciansLoaded = false;
            this.teamsLoaded = false;
            this.loadTechnicians();
            this.loadTeams();
            this.toastr.success('Technician deleted successfully.');
          });
        },
        error: (err: any) => {
          this.zone.run(() => {
            this.technicianError = err?.error?.message ?? 'Failed to delete technician.';
            this.cdr.detectChanges();
          });
        }
      });
  }

  openTeamModal(): void {
    this.editingTeamId = undefined;
    this.teamError = undefined;
    this.teamSubmitting = false;
    this.teamForm = {
      teamName: '',
      status: 'ACTIVE',
      teamLeaderId: null,
      technicianIds: []
    };
    this.ensureTechnicianOptions();
    this.showTeamModal = true;
  }

  openTeamView(row: TeamRow): void {
    this.selectedTeam = row;
    this.showTeamDetailModal = true;
  }

  closeTeamView(): void {
    this.showTeamDetailModal = false;
    this.selectedTeam = undefined;
  }

  openTeamEdit(row: TeamRow): void {
    if (!row.dbId) {
      return;
    }
    this.editingTeamId = row.dbId;
    this.teamError = undefined;
    this.teamSubmitting = false;
    this.teamForm = {
      teamName: row.name,
      status: String(row.status || 'ACTIVE').toUpperCase().replace(/\s+/g, '_'),
      teamLeaderId: row.leaderId ?? null,
      technicianIds: [...row.technicianIds]
    };
    this.ensureTechnicianOptions();
    this.showTeamModal = true;

    this.technicianService
      .fetchTechnicianTeamById(row.dbId)
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          this.zone.run(() => {
            const team = res?.data ?? res ?? {};
            const ids = Array.isArray(team?.technicians)
              ? team.technicians
                  .map((item: any) => Number(item?.id))
                  .filter((value: number) => Number.isFinite(value) && value > 0)
              : this.teamForm.technicianIds;
            this.teamForm = {
              teamName: team.teamName ?? this.teamForm.teamName,
              status: String(team.status ?? this.teamForm.status ?? 'ACTIVE').toUpperCase(),
              teamLeaderId: team.teamLeaderId ?? this.teamForm.teamLeaderId,
              technicianIds: ids
            };
            this.cdr.detectChanges();
          });
        }
      });
  }

  closeTeamModal(): void {
    if (this.teamSubmitting) {
      return;
    }
    this.showTeamModal = false;
    this.editingTeamId = undefined;
    this.teamError = undefined;
  }

  openTeamDelete(row: TeamRow): void {
    if (!row.dbId) {
      return;
    }
    this.deletingTeamId = row.dbId;
    this.showTeamDeleteModal = true;
    this.teamError = undefined;
  }

  closeTeamDelete(): void {
    if (this.teamDeleting) {
      return;
    }
    this.showTeamDeleteModal = false;
    this.deletingTeamId = undefined;
  }

  submitTeam(): void {
    const teamName = String(this.teamForm.teamName ?? '').trim();
    const status = String(this.teamForm.status ?? '').trim().toUpperCase();
    const technicianIds = [...new Set((this.teamForm.technicianIds ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
    const teamLeaderId = this.teamForm.teamLeaderId ? Number(this.teamForm.teamLeaderId) : null;

    if (!teamName || !status) {
      this.teamError = 'Please fill all required fields.';
      return;
    }
    if (!technicianIds.length) {
      this.teamError = 'Select at least one technician for the team.';
      return;
    }
    if (!teamLeaderId || !technicianIds.includes(teamLeaderId)) {
      this.teamError = 'Team leader must be one of the selected technicians.';
      return;
    }

    this.teamSubmitting = true;
    this.teamError = undefined;
    const payload = {
      teamName,
      status,
      technicianIds,
      teamLeaderId
    };
    const request$: any = this.editingTeamId
      ? this.technicianService.updateTechnicianTeam(this.editingTeamId, payload)
      : this.technicianService.createTechnicianTeam(payload);

    request$
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.teamSubmitting = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.showTeamModal = false;
            this.editingTeamId = undefined;
            this.teamsLoaded = false;
            this.techniciansLoaded = false;
            this.loadTeams();
            this.loadTechnicians();
            this.toastr.success('Team saved successfully.');
          });
        },
        error: (err: any) => {
          this.zone.run(() => {
            this.teamError = err?.error?.message ?? 'Failed to save team.';
            this.cdr.detectChanges();
          });
        }
      });
  }

  confirmTeamDelete(): void {
    if (!this.deletingTeamId) {
      return;
    }
    this.teamDeleting = true;
    this.technicianService
      .deleteTechnicianTeam(this.deletingTeamId)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.teamDeleting = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.showTeamDeleteModal = false;
            this.deletingTeamId = undefined;
            this.teamsLoaded = false;
            this.techniciansLoaded = false;
            this.loadTeams();
            this.loadTechnicians();
            this.toastr.success('Team deleted successfully.');
          });
        },
        error: (err: any) => {
          this.zone.run(() => {
            this.teamError = err?.error?.message ?? 'Failed to delete team.';
            this.cdr.detectChanges();
          });
        }
      });
  }

  onTeamTechniciansChange(ids: Array<number | string>): void {
    const normalized = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
    this.teamForm.technicianIds = normalized;
    if (this.teamForm.teamLeaderId && !normalized.includes(Number(this.teamForm.teamLeaderId))) {
      this.teamForm.teamLeaderId = null;
    }
  }

  get selectableLeaderOptions(): Array<{ id: number; name: string; badgeNumber?: string }> {
    const set = new Set((this.teamForm.technicianIds ?? []).map((id) => Number(id)));
    return this.technicianOptions.filter((opt) => set.has(opt.id));
  }

  private buildTechnicianPayload(input: {
    technicianId: string;
    autoGenerateTechnicianId: boolean;
    firstName: string;
    lastName: string;
    technicianType: string;
    phoneNumber: string;
    email: string;
    status: string;
    skills: string;
    certifications: string;
    address: string;
    hireDate: string;
    workShift: string;
    notes: string;
    badgeNumber: string;
    certificateIssueDate: string;
    certificateExpiryDate: string;
    technicianPhotoUrl: string;
    certificateUrl: string;
    teamId?: number;
  }): any {
    return {
      technicianId: input.autoGenerateTechnicianId ? undefined : input.technicianId,
      badgeNumber: input.badgeNumber || undefined,
      firstName: input.firstName,
      lastName: input.lastName,
      technicianType: input.technicianType,
      skills: input.skills,
      phoneNumber: input.phoneNumber,
      email: input.email,
      address: input.address,
      status: input.status,
      hireDate: input.hireDate,
      workShift: input.workShift,
      certifications: input.certifications || '',
      certificateIssueDate: input.certificateIssueDate || undefined,
      certificateExpiryDate: input.certificateExpiryDate || undefined,
      technicianPhotoUrl: input.technicianPhotoUrl || undefined,
      certificateUrl: input.certificateUrl || undefined,
      notes: input.notes || '',
      teamId: input.teamId
    };
  }

  private ensureTeamConsistencyAfterTechnicianDelete(technicianId: number): void {
    this.technicianService
      .fetchTechnicianTeams(0, 100)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const teams = res?.data?.teams ?? [];
          for (const team of teams as any[]) {
            const memberIds = Array.isArray(team?.technicians)
              ? team.technicians
                  .map((item: any) => Number(item?.id))
                  .filter((value: number) => Number.isFinite(value) && value > 0)
              : [];
            const isLeaderRemoved = Number(team?.teamLeaderId) === technicianId;
            if (!memberIds.includes(technicianId) && !isLeaderRemoved) {
              continue;
            }
            const nextIds = memberIds.filter((id: number) => id !== technicianId);
            const nextLeader = isLeaderRemoved ? (nextIds[0] ?? null) : (team?.teamLeaderId ?? null);
            this.technicianService
              .updateTechnicianTeam(team.id, {
                teamName: team.teamName ?? '',
                status: String(team.status ?? 'ACTIVE').toUpperCase(),
                technicianIds: nextIds,
                teamLeaderId: nextLeader
              })
              .pipe(take(1))
              .subscribe();
          }
        }
      });
  }

  private ensureTechnicianOptions(): void {
    if (this.technicianOptions.length) {
      return;
    }
    this.technicianService
      .fetchTechnicians(0, 200)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.zone.run(() => {
            const list = res?.data?.technicians ?? [];
            this.technicianOptions = list
              .map((tech: ApiTechnician) => ({
                id: Number(tech?.id),
                name: this.buildName(tech),
                badgeNumber: String(tech?.badgeNumber ?? '').trim() || undefined
              }))
              .filter((item: { id: number; name: string; badgeNumber?: string }) => Number.isFinite(item.id) && item.id > 0);
            this.cdr.detectChanges();
          });
        }
      });
  }

  editLeave(row: { id: string; technician: string; from: string; to: string; reason: string; technicianId?: string | number }): void {
    this.leaveError = undefined;
    this.editingLeaveId = row.id;
    this.leavePrefillLoading = true;
    this.showLeaveModal = true;
    this.cdr.detectChanges(); // ensure modal renders before async fill
    this.loadLeaveTechnicians();

    const techId = row.technicianId;
    if (!techId) {
      this.leavePrefillLoading = false;
      this.leaveError = 'Technician id missing for this leave.';
      this.cdr.detectChanges();
      return;
    }

    this.technicianService.fetchTechnicianLeaves(techId).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.leavePrefillLoading = false;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const list = res?.data?.leaves ?? res?.data?.content ?? res?.data ?? res ?? [];
          const match = (list as any[]).find((l) => (l.id ?? l.leaveId)?.toString() === row.id.toString());
          const leave = match ?? row;
          this.leaveForm = {
            technicianId: techId,
            startDate: leave.fromDate ?? leave.startDate ?? row.from ?? '',
            endDate: leave.toDate ?? leave.endDate ?? row.to ?? '',
            reason: leave.reason ?? row.reason ?? ''
          };
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.leaveError = err?.error?.message ?? 'Failed to load leave.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  openLeaveDelete(row: { id: string; technicianId?: string | number }): void {
    if (!row.technicianId) {
      return;
    }
    this.deletingLeaveId = row.id;
    this.deletingLeaveTechId = row.technicianId;
    this.showLeaveDeleteModal = true;
    this.leaveError = undefined;
    this.cdr.detectChanges();
  }

  closeLeaveDelete(): void {
    this.showLeaveDeleteModal = false;
    this.deletingLeaveId = undefined;
    this.deletingLeaveTechId = undefined;
    this.leaveDeleting = false;
    this.cdr.detectChanges();
  }

  confirmLeaveDelete(): void {
    if (!this.deletingLeaveId || !this.deletingLeaveTechId) return;
    this.leaveDeleting = true;
    let deleteSuccess = false;
    this.technicianService.deleteLeave(this.deletingLeaveTechId, this.deletingLeaveId).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.leaveDeleting = false;
          if (deleteSuccess) {
            this.closeLeaveDelete();
          }
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: () => {
        this.zone.run(() => {
          deleteSuccess = true;
          this.leaveRows = this.leaveRows.filter((r) => r.id != this.deletingLeaveId);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.leaveError = err?.error?.message ?? 'Failed to delete leave.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadHolidays(): void {
    if (this.holidaysLoading || this.holidaysLoaded) {
      return;
    }
    this.holidaysLoading = true;
    this.pendingLoads++;
    this.holidayRows = [];
    this.technicianService.fetchHolidays(0, 100).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.holidaysLoading = false;
          this.holidaysLoaded = true;
          this.pendingLoads = Math.max(0, this.pendingLoads - 1);
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const list = res?.data?.holidays ?? [];
          this.holidayRows = (list as any[]).map((h) => ({
            id: h.id?.toString() ?? h.holidayId ?? '-',
            name: h.holidayName ?? '-',
            date: h.holidayDate ?? '-',
            type: (h.holidayType ?? '').toString().replace(/_/g, ' ').toUpperCase(),
            notes: h.notes ?? ''
          }));
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.holidaysLoaded = true;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadLeaveTechnicians(): void {
    if (this.leaveTechLoading || this.leaveTechnicians.length) {
      return;
    }
    this.leaveTechLoading = true;
    this.technicianService.fetchTechnicians(0, 100).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.leaveTechLoading = false;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const list = res?.data?.technicians ?? res?.data?.content ?? [];
          this.leaveTechnicians = (list as ApiTechnician[]).map((t) => ({
            id: (t as any).id ?? (t as any).technicianId ?? (t as any).dbId ?? (t as any).userId ?? (t as any).employeeId ?? '',
            name: this.buildTechnicianName(t)
          })).filter(t => t.id !== '');
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.leaveTechnicians = [];
          this.cdr.detectChanges();
        });
      }
    });
  }

  private buildTechnicianName(t: ApiTechnician | any): string {
    const combined = t.fullName ?? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim();
    if (combined && combined.trim().length) {
      return combined.trim();
    }
    const fallback = (t as any).name || (t as any).email;
    return fallback && fallback.toString().trim().length ? fallback : 'Technician';
  }

  openLeaveModal(): void {
    this.leaveError = undefined;
    this.leaveSubmitting = false;
    this.leaveForm = { technicianId: undefined, startDate: '', endDate: '', reason: '' };
    this.editingLeaveId = undefined;
    this.leavePrefillLoading = false;
    this.loadLeaveTechnicians();
    this.showLeaveModal = true;
  }

  closeLeaveModal(): void {
    this.showLeaveModal = false;
    this.leaveError = undefined;
    this.leaveSubmitting = false;
    this.editingLeaveId = undefined;
    this.leavePrefillLoading = false;
    this.cdr.detectChanges();
  }

  submitLeave(): void {
    if (!this.leaveForm.technicianId || !this.leaveForm.startDate || !this.leaveForm.endDate || !this.leaveForm.reason) {
      this.leaveError = 'Please fill in technician, start date, end date and reason.';
      return;
    }
    this.leaveSubmitting = true;
    this.leaveError = undefined;
    const payload = {
      startDate: this.leaveForm.startDate,
      endDate: this.leaveForm.endDate,
      reason: this.leaveForm.reason
    };

    const request$ = this.editingLeaveId
      ? this.technicianService.updateLeave(this.leaveForm.technicianId, this.editingLeaveId, payload)
      : this.technicianService.createLeave(this.leaveForm.technicianId, payload);

    request$.pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.leaveSubmitting = false;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          this.closeLeaveModal();
          const leave = res?.data ?? res ?? {};
          const row = {
            id: leave.id?.toString() ?? leave.leaveId ?? this.editingLeaveId ?? `L${this.leaveRows.length + 1}`.padStart(4, '0'),
            technician: leave.technicianName ?? this.leaveTechnicians.find(t => t.id == this.leaveForm.technicianId)?.name ?? '-',
            from: leave.fromDate ?? leave.startDate ?? this.leaveForm.startDate,
            to: leave.toDate ?? leave.endDate ?? this.leaveForm.endDate,
            reason: leave.reason ?? this.leaveForm.reason,
            technicianId: leave.technicianId ?? this.leaveForm.technicianId
          };
          if (this.editingLeaveId) {
            this.leaveRows = this.leaveRows.map((r) => (r.id == this.editingLeaveId ? row : r));
          } else {
            this.leaveRows = [row, ...this.leaveRows];
          }
          this.leavesLoaded = false;
          this.loadLeaves();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.leaveError = err?.error?.message ?? 'Failed to create leave.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  openTechnicianAvailability(dbId?: number): void {
    if (!dbId) {
      return;
    }
    this.router.navigate(['/tm-system', 'technicians', dbId, 'availability']);
  }

  openWorkOrder(dbId?: number | string): void {
    if (dbId === undefined || dbId === null) {
      return;
    }
    this.router.navigate(['/tm-system', 'work-orders', dbId]);
  }

  openHolidayModal(): void {
    this.editingHolidayId = undefined;
    this.holidayPrefillLoading = false;
    this.holidayError = undefined;
    this.holidaySubmitting = false;
    this.holidayForm = { holidayName: '', holidayType: 'NATIONAL', holidayDate: '', notes: '' };
    this.showHolidayModal = true;
    this.cdr.detectChanges();
  }

  editHoliday(id?: string): void {
    if (!id) {
      return;
    }
    this.holidayPrefillLoading = true;
    this.holidayError = undefined;
    this.showHolidayModal = true;
    this.cdr.detectChanges();
    this.technicianService.fetchHolidayById(id).pipe(take(1)).subscribe({
      next: (res) => {
        this.zone.run(() => {
          const h = res?.data ?? res ?? {};
          this.editingHolidayId = h.id ?? id;
          this.holidayForm = {
            holidayName: h.holidayName ?? '',
            holidayType: h.holidayType ?? 'NATIONAL',
            holidayDate: h.holidayDate ?? '',
            notes: h.notes ?? ''
          };
          this.holidayPrefillLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.holidayPrefillLoading = false;
          this.holidayError = 'Unable to load holiday details.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  openHolidayDetail(id?: string): void {
    if (!id) return;
    this.router.navigate(['/tm-system', 'holidays', id]);
  }

  closeHolidayModal(): void {
    this.showHolidayModal = false;
    this.holidaySubmitting = false;
    this.holidayError = undefined;
    this.editingHolidayId = undefined;
    this.holidayPrefillLoading = false;
    this.cdr.detectChanges();
  }

  openHolidayDelete(id?: string): void {
    if (!id) return;
    this.deletingHolidayId = id;
    this.showHolidayDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeHolidayDelete(): void {
    this.showHolidayDeleteModal = false;
    this.deletingHolidayId = undefined;
    this.holidayDeleting = false;
    this.cdr.detectChanges();
  }

  confirmHolidayDelete(): void {
    if (!this.deletingHolidayId) return;
    this.holidayDeleting = true;
    this.technicianService.deleteHoliday(this.deletingHolidayId).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.holidayDeleting = false;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: () => {
        this.zone.run(() => {
          this.holidayRows = this.holidayRows.filter((h) => h.id != this.deletingHolidayId);
          this.closeHolidayDelete();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.holidayError = 'Failed to delete holiday.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  submitHoliday(): void {
    if (!this.holidayForm.holidayName || !this.holidayForm.holidayDate || !this.holidayForm.holidayType) {
      this.holidayError = 'Please complete all required fields.';
      this.cdr.detectChanges();
      return;
    }
    let saved = false;
    this.holidaySubmitting = true;
    this.holidayError = undefined;
    const request$ = this.editingHolidayId
      ? this.technicianService.updateHoliday(this.editingHolidayId, this.holidayForm)
      : this.technicianService.createHoliday(this.holidayForm);

    request$.pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.holidaySubmitting = false;
          if (saved) {
            this.closeHolidayModal();
          }
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const newHoliday = res?.data ?? res ?? {};
          const row = {
            id: newHoliday.id ?? newHoliday.holidayId ?? this.editingHolidayId ?? `HD${this.holidayRows.length + 1}`.padStart(6, '0'),
            name: newHoliday.holidayName ?? this.holidayForm.holidayName ?? 'Holiday',
            date: newHoliday.holidayDate ?? this.holidayForm.holidayDate,
            type: (newHoliday.holidayType || this.holidayForm.holidayType || 'National')
              .toString()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            notes: newHoliday.notes ?? this.holidayForm.notes
          };
          if (this.editingHolidayId) {
            this.holidayRows = this.holidayRows.map((h) => (h.id == this.editingHolidayId ? row : h));
          } else {
            this.holidayRows = [row, ...this.holidayRows];
          }
          saved = true;
        });
      },
      error: () => {
        this.zone.run(() => {
          this.holidayError = 'Failed to save holiday. Please try again.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  signOut(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }

  openInviteTechnician(): void {
    if (!this.canInviteTechnician) {
      return;
    }
    this.showInviteModal = true;
    this.inviteSubmitting = false;
  }

  closeInviteTechnician(): void {
    if (this.inviteSubmitting) {
      return;
    }
    this.showInviteModal = false;
    this.resetInviteForm();
  }

  submitInviteTechnician(): void {
    if (this.inviteSubmitting) {
      return;
    }

    const firstName = String(this.inviteForm.firstName ?? '').trim();
    const lastName = String(this.inviteForm.lastName ?? '').trim();
    const email = String(this.inviteForm.email ?? '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName || !lastName || !email || !emailRegex.test(email)) {
      this.toastr.error('Please provide first name, last name and valid email.');
      return;
    }

    this.inviteSubmitting = true;
    this.userManagementService
      .inviteUser({
        firstName,
        lastName,
        email
      })
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.inviteSubmitting = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            this.toastr.success(response?.message || 'Invite sent successfully');
            this.showInviteModal = false;
            this.resetInviteForm();
            this.cdr.detectChanges();
          });
        },
        error: (err: any) => {
          this.zone.run(() => {
            this.toastr.error(err?.error?.message || 'Failed to send invite');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private resetInviteForm(): void {
    this.inviteForm = {
      firstName: '',
      lastName: '',
      email: ''
    };
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  get canViewApprovedTimesheets(): boolean {
    const role = String(localStorage.getItem('userRole') ?? '').trim().toUpperCase();
    return role === 'ADMIN';
  }

  get isAdminRole(): boolean {
    const role = String(localStorage.getItem('userRole') ?? '').trim().toUpperCase();
    return role === 'ADMIN';
  }

  get canInviteTechnician(): boolean {
    return this.isAdminRole
      || this.permissionService.hasPermission('INVITE_USER', 'CREATE')
      || this.permissionService.hasPermission('INVITE_USER', 'ACCESS');
  }

  private get isTechnicianRole(): boolean {
    const role = String(localStorage.getItem('userRole') ?? '').trim().toUpperCase();
    return role === 'TECHNICIAN';
  }

  /**
   * Keep the loader scoped to the active tab so a stale flag in another tab
   * never leaves the overlay stuck on screen.
   */
  get isLoading(): boolean {
    switch (this.activeTab) {
      case 'dashboard':
        return this.dashboardLoading;
      case 'technicians':
        return this.techniciansLoading;
      case 'teams':
        return this.teamsLoading;
      case 'work-orders':
        return this.workOrdersLoading;
      case 'leaves':
        return this.leavesLoading || this.holidaysLoading || this.pendingLoads > 0;
      default:
        return false;
    }
  }
}

