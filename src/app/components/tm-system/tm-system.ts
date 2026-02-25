import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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
  technicianId: number;
  workOrderId: number;
  payCode: string;
  hours: number | null;
  accountingUnit: string;
  ferc: string;
  activity: string;
  comment: string;
  markedForDelete: boolean;
}

type TimeSheetViewMode = 'WEEK' | 'BY_WEEK';
type TimeSheetScreenMode = 'list' | 'create';

interface TimesheetListItem {
  id: number;
  periodStartDate: string;
  periodEndDate: string;
  viewType: string;
  status: string;
  rowCount: number;
  totalHours: number;
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
    { id: 'teams', label: 'Teams', icon: 'streamline_hierarchy-10.svg' },
    { id: 'work-orders', label: 'Work Orders', icon: 'fluent-mdl2_work-flow.svg' },
    { id: 'leaves', label: 'PTO & Holidays', icon: 'proicons_document.svg' },
    { id: 'time-sheet', label: 'Time Sheet', icon: 'proicons_document.svg' }
  ];

  metrics: MetricCard[] = [];

  activities: Activity[] = [];

  technicianRows: Array<{
    id: string;
    dbId?: number;
    name: string;
    phone: string;
    email: string;
    team: string;
    status: string;
    workingDays: string;
  }> = [];

  teamRows: Array<{
    id: string;
    name: string;
    availability: string;
    leader: string;
    total: number;
    activeWos: number | string;
  }> = [];

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
  timeSheetView: TimeSheetViewMode = 'BY_WEEK';
  payPeriodStart = '';
  payPeriodEnd = '';
  currentPeriodOffset = 0;
  nextTimeSheetRowId = 1;
  timesheetSubmitting = false;
  editingTimesheetId?: number;
  timeSheetEditLoading = false;

  readonly timeSheetPayCodes: TimeSheetPayCode[] = [
    { value: 'REGULAR', label: 'Regular', type: 'worked' },
    { value: 'PTO', label: 'PTO', type: 'non-worked' },
    { value: 'TRAINING', label: 'Training', type: 'worked' },
    { value: 'UNPAID_LEAVE', label: 'Unpaid leave', type: 'non-worked' },
    { value: 'OVERTIME_1_5', label: 'Overtime 1.5', type: 'premium' },
    { value: 'MISC_LEAVE', label: 'Misc Leave', type: 'non-worked' },
    { value: 'JURY_DUTY', label: 'Jury Duty', type: 'non-worked' },
    { value: 'HOLIDAY_PAY', label: 'Holiday Pay', type: 'premium' },
    { value: 'DOUBLE_TIME', label: 'Double time', type: 'premium' },
    { value: 'BEREAVEMENT', label: 'Bereavement', type: 'non-worked' }
  ];

  timeSheetRows: TimeSheetRow[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private technicianService: TechnicianService,
    private workOrderService: WorkOrderService,
    private dashboardService: DashboardService,
    private timesheetService: TimesheetService,
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
    this.loadTimesheetList();

    if (!this.timeSheetReady) {
      this.setPayPeriod(0);
      this.timeSheetReady = true;
    }
  }

  openTimeSheetCreate(): void {
    this.editingTimesheetId = undefined;
    if (!this.timeSheetReady) {
      this.setPayPeriod(0);
      this.timeSheetReady = true;
    } else {
      this.setPayPeriod(this.currentPeriodOffset);
    }
    this.timeSheetScreenMode = 'create';
  }

  openTimeSheetList(): void {
    this.editingTimesheetId = undefined;
    this.timeSheetEditLoading = false;
    this.timeSheetScreenMode = 'list';
    this.loadTimesheetList();
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

            const sourceRows = Array.isArray(data?.timesheet_rows)
              ? data.timesheet_rows
              : (Array.isArray(data?.timesheetRows) ? data.timesheetRows : []);

            if (sourceRows.length) {
              this.timeSheetRows = sourceRows.map((row: any) => ({
                id: this.nextTimeSheetRowId++,
                date: row?.date ?? this.payPeriodStart,
                technicianId: Number(row?.technician_id ?? row?.technicianId) || this.getCurrentTechnicianId(),
                workOrderId: Number(row?.work_order_id ?? row?.workOrderId) || 0,
                payCode: String(row?.pay_code ?? row?.payCode ?? 'REGULAR').toUpperCase(),
                hours: row?.hours === null || row?.hours === undefined ? null : Number(row.hours),
                accountingUnit: row?.accounting_unit ?? row?.accountingUnit ?? 'Operations',
                ferc: row?.ferc ?? 'None',
                activity: row?.activity ?? '',
                comment: row?.comment ?? '',
                markedForDelete: !!(row?.is_deleted ?? row?.isDeleted)
              }));
            } else {
              this.seedTimeSheetRows();
            }

            this.editingTimesheetId = id;
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
    const periodDays = this.timeSheetView === 'WEEK' ? 7 : 14;
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday + offsetPeriods * periodDays);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + (periodDays - 1));

    this.currentPeriodOffset = offsetPeriods;
    this.payPeriodStart = this.toIsoDate(start);
    this.payPeriodEnd = this.toIsoDate(end);
    this.seedTimeSheetRows();
  }

  previousPayPeriod(): void {
    this.setPayPeriod(this.currentPeriodOffset - 1);
  }

  nextPayPeriod(): void {
    this.setPayPeriod(this.currentPeriodOffset + 1);
  }

  onTimeSheetViewChange(): void {
    this.currentPeriodOffset = 0;
    this.setPayPeriod(0);
  }

  addTimeSheetRow(): void {
    this.timeSheetRows.push({
      id: this.nextTimeSheetRowId++,
      date: this.payPeriodStart,
      technicianId: this.getCurrentTechnicianId(),
      workOrderId: 0,
      payCode: 'REGULAR',
      hours: null,
      accountingUnit: 'Operations',
      ferc: 'None',
      activity: '',
      comment: '',
      markedForDelete: false
    });
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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

  sendForApproval(): void {
    if (this.timesheetSubmitting) {
      return;
    }

    const payloadRows = this.timeSheetRows
      .filter((row) => {
        const payCode = String(row.payCode ?? '').trim().toUpperCase();
        const hours = Number(row.hours) || 0;
        return payCode !== 'REGULAR' || hours > 0;
      })
      .map((row) => ({
        date: row.date,
        day_of_week: this.dayOfWeekLabel(row.date),
        pay_code: row.payCode,
        hours: Number(row.hours) || 0,
        daily_total: Number(row.hours) || 0,
        accounting_unit: row.accountingUnit || '',
        ferc: row.ferc || '',
        activity: row.activity || '',
        comment: row.comment || '',
        is_deleted: !!row.markedForDelete
      }));

    const payload = {
      period_start_date: this.payPeriodStart,
      period_end_date: this.payPeriodEnd,
      view_type: this.toApiViewType(this.timeSheetView),
      technician_id: this.getCurrentTechnicianId(),
      totalWorked: Number(this.workedTotal) || 0,
      totalNonWorked: Number(this.nonWorkedTotal) || 0,
      totalPremium: Number(this.premiumTotal) || 0,
      timesheet_rows: payloadRows
    };

    const editingId = this.editingTimesheetId;
    const request$ = editingId
      ? this.timesheetService.updateTimesheet(editingId, payload)
      : this.timesheetService.submitTimesheet(payload);

    this.timesheetSubmitting = true;
    request$
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.timesheetSubmitting = false;
            this.toastr.success(editingId ? 'Timesheet updated successfully.' : 'Timesheet sent for approval.');
            this.editingTimesheetId = undefined;
            this.openTimeSheetList();
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.timesheetSubmitting = false;
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
    const start = new Date(this.payPeriodStart);
    const end = new Date(this.payPeriodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      this.timeSheetRows = [];
      return;
    }

    const rows: TimeSheetRow[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      rows.push({
        id: this.nextTimeSheetRowId++,
        date: this.toIsoDate(cursor),
        technicianId: this.getCurrentTechnicianId(),
        workOrderId: 0,
        payCode: 'REGULAR',
        hours: null,
        accountingUnit: 'Operations',
        ferc: 'None',
        activity: '',
        comment: '',
        markedForDelete: false
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    this.timeSheetRows = rows;
  }

  private dayOfWeekLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  }

  private getCurrentTechnicianId(): number {
    const role = String(localStorage.getItem('userRole') ?? '').trim().toUpperCase();
    if (role === 'ADMIN') {
      return 1;
    }

    const raw = localStorage.getItem('technicianId');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private toApiViewType(view: TimeSheetViewMode): string {
    return view === 'WEEK' ? 'WEEK' : 'BY_WEEK';
  }

  formatTimesheetViewType(value: string): string {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'WEEK') {
      return 'Weekly';
    }
    if (normalized === 'BY_WEEK') {
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
        const rows = Array.isArray(item?.timesheet_rows)
          ? item.timesheet_rows
          : (Array.isArray(item?.timesheetRows) ? item.timesheetRows : []);
        const totalHours = rows.reduce((sum: number, row: any) => sum + (Number(row?.hours) || 0), 0);

        return {
          id: Number(item?.id) || 0,
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

  private toTimeSheetViewMode(value: string): TimeSheetViewMode {
    const normalized = String(value ?? '').trim().toUpperCase();
    return normalized === 'WEEK' ? 'WEEK' : 'BY_WEEK';
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
            const list: any[] = (response as any)?.data?.technicians ?? (response as any)?.data?.content ?? [];
            this.technicianRows = list.map((tech: any) => ({
              id: tech.technicianId ?? (tech.id ? `TEC${tech.id}` : '-'),
              dbId: tech.id,
              name: this.buildName(tech),
              phone: tech.phoneNumber ?? '-',
              email: tech.email ?? '-',
              team: tech.teamMemberships?.[0]?.teamName || tech.teamName || 'Unassigned',
              status: this.formatWorkStatus((tech as any)?.workStatus),
              workingDays: this.formatWorkShift(tech.workShift)
            }));
            this.techTotal = response.data?.totalElements ?? list.length;
            if (typeof response.data?.size === 'number' && response.data.size > 0) {
              this.techSize = response.data.size;
            }
            if (typeof response.data?.page === 'number') {
              this.techPage = response.data.page;
            }
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
            this.teamRows = teams.map((team) => ({
              id: team.id ? `TEAM${team.id}` : team.teamName ?? '-',
              name: team.teamName ?? '-',
              availability: (team as any).availability ?? (team as any).status ?? '-',
              leader: team.teamLeaderName ?? '-',
              total: team.technicians?.length ?? 0,
              activeWos: '-'
            }));
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

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  get canViewApprovedTimesheets(): boolean {
    const role = String(localStorage.getItem('userRole') ?? '').trim().toUpperCase();
    return role === 'ADMIN';
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

