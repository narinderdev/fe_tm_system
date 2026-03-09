import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TimesheetService } from '../../services/timesheet.service';

interface TimesheetDetailRow {
  id?: number;
  date: string;
  dayOfWeek: string;
  payCode: string;
  hours: number;
  dailyTotal: number;
  department: string;
  account: string;
  project: string;
  comment: string;
  isDeleted: boolean;
}

@Component({
  selector: 'app-timesheet-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './timesheet-view.html',
  styleUrl: './timesheet-view.css'
})
export class TimesheetViewComponent implements OnInit {
  loading = false;
  error?: string;
  showApproveConfirm = false;
  approving = false;
  sendingBack = false;

  timesheetId = 0;
  periodStartDate = '-';
  periodEndDate = '-';
  deadlineDate = '-';
  lockDate = '-';
  payPeriodStatus = '-';
  adminUnlocked = false;
  viewType = '-';
  status = '-';
  technicianId = 1;
  technicianFirstName = '';
  technicianLastName = '';
  technicianName = '';
  saveAsTemplate = false;
  totalWorked = 0;
  totalNonWorked = 0;
  totalPremium = 0;
  rows: TimesheetDetailRow[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly timesheetService: TimesheetService,
    private readonly toastr: ToastrService,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error = 'Invalid timesheet id.';
      return;
    }

    this.timesheetId = id;
    this.loadTimesheet();
  }

  backToList(): void {
    this.router.navigate(['/tm-system', 'time-sheet']);
  }

  exportAs(type: 'excel' | 'csv'): void {
    if (type !== 'excel') {
      return;
    }

    if (!this.rows.length) {
      this.toastr.warning('No rows available to export.');
      return;
    }

    const headers = [
      'Date',
      'Day',
      'Pay Code',
      'Hours',
      'Daily Total',
      'Department',
      'Account',
      'Project',
      'Comment'
    ];

    const exportRows = this.rows.map((row) => [
      row.date || '-',
      this.formatLabel(row.dayOfWeek) || '-',
      this.formatLabel(row.payCode) || '-',
      row.hours.toFixed(2),
      row.dailyTotal.toFixed(2),
      row.department || '-',
      row.account || '-',
      row.project || '-',
      row.comment || '-'
    ]);

    const metaHeaders = ['Field', 'Value'];
    const metaRows = [
      ['Timesheet', `#${this.timesheetId}`],
      ['Period', `${this.periodStartDate} to ${this.periodEndDate}`],
      ['View', this.formatViewType(this.viewType)]
    ];

    const totalHeaders = ['Total Hours', 'Worked', 'Non-worked', 'Premium'];
    const totalRows = [[
      this.totalHours.toFixed(2),
      (Number(this.totalWorked) || 0).toFixed(2),
      (Number(this.totalNonWorked) || 0).toFixed(2),
      (Number(this.totalPremium) || 0).toFixed(2)
    ]];

    const tableData = `
      ${this.buildHtmlTable(metaHeaders, metaRows)}
      <br/>
      ${this.buildHtmlTable(headers, exportRows)}
      <br/>
      ${this.buildHtmlTable(totalHeaders, totalRows)}
    `;
    this.downloadFile(tableData, 'timesheet-report.xls', 'application/vnd.ms-excel');
  }

  get totalHours(): number {
    return Number(this.rows.reduce((sum, row) => sum + (Number(row.hours) || 0), 0).toFixed(2));
  }

  formatLabel(value: string): string {
    if (!value || value === '-') {
      return '-';
    }
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatViewType(value: string): string {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'WEEK') {
      return 'Weekly';
    }
    if (normalized === 'BY_WEEK') {
      return 'Bi-Weekly';
    }
    return this.formatLabel(value);
  }

  get canApproveTimesheet(): boolean {
    const role = String(localStorage.getItem('userRole') ?? '').trim().toUpperCase();
    return role === 'ADMIN' && this.status === 'PENDING';
  }

  approveTimesheet(): void {
    this.showApproveConfirm = true;
  }

  returnForCorrection(): void {
    if (this.sendingBack || !this.timesheetId) {
      return;
    }

    const payload = {
      id: this.timesheetId,
      period_start_date: this.periodStartDate,
      period_end_date: this.periodEndDate,
      deadline_date: this.deadlineDate,
      lock_date: this.lockDate,
      pay_period_status: this.payPeriodStatus,
      admin_unlocked: !!this.adminUnlocked,
      view_type: this.viewType,
      technician_id: this.technicianId,
      technician_first_name: this.technicianFirstName,
      technician_last_name: this.technicianLastName,
      technician_name: this.technicianName,
      total_worked: Number(this.totalWorked) || 0,
      total_non_worked: Number(this.totalNonWorked) || 0,
      total_premium: Number(this.totalPremium) || 0,
      status: this.status,
      save_as_template: !!this.saveAsTemplate,
      timesheet_days: this.buildTimesheetDaysPayload()
    };

    this.sendingBack = true;
    this.cdr.detectChanges();
    this.timesheetService
      .sendBackTimesheet(this.timesheetId, payload)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.sendingBack = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.toastr.success('Timesheet returned for correction.');
            this.backToList();
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.toastr.error('Failed to return timesheet for correction.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  cancelApprove(): void {
    if (this.approving) {
      return;
    }
    this.showApproveConfirm = false;
  }

  confirmApprove(): void {
    if (this.approving || !this.timesheetId) {
      return;
    }

    this.approving = true;
    this.cdr.detectChanges();
    this.timesheetService
      .approveTimesheet(this.timesheetId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.approving = false;
            this.status = 'APPROVED';
            this.showApproveConfirm = false;
            this.toastr.success('Timesheet approved successfully.');
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.approving = false;
            this.toastr.error('Failed to approve timesheet.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  buildHtmlTable(headers: string[], rows: string[][]): string {
    const head = headers.map((header) => `<th>${this.escapeHtml(header)}</th>`).join('');
    const body = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="mso-number-format:\\@; white-space:nowrap;">${this.escapeHtml(cell)}</td>`
            )
            .join('')}</tr>`
      )
      .join('');

    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  downloadFile(data: string, filename: string, type: string): void {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private loadTimesheet(): void {
    this.loading = true;
    this.error = undefined;

    this.timesheetService
      .fetchTimesheetById(this.timesheetId)
      .pipe(
        take(1),
        finalize(() => {
          this.zone.run(() => {
            this.loading = false;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const data = response?.data ?? response;
            this.periodStartDate = data?.period_start_date ?? data?.periodStartDate ?? '-';
            this.periodEndDate = data?.period_end_date ?? data?.periodEndDate ?? '-';
            this.deadlineDate = data?.deadline_date ?? data?.deadlineDate ?? this.periodEndDate;
            this.lockDate = data?.lock_date ?? data?.lockDate ?? this.periodEndDate;
            this.payPeriodStatus = String(data?.pay_period_status ?? data?.payPeriodStatus ?? '').trim();
            this.viewType = String(data?.view_type ?? data?.viewType ?? '-');
            this.status = String(data?.status ?? '-').trim().toUpperCase();
            this.technicianId = Number(data?.technician_id ?? data?.technicianId) || 1;
            this.technicianFirstName = String(data?.technician_first_name ?? data?.technicianFirstName ?? '').trim();
            this.technicianLastName = String(data?.technician_last_name ?? data?.technicianLastName ?? '').trim();
            this.technicianName = String(data?.technician_name ?? data?.technicianName ?? '').trim();
            this.saveAsTemplate = !!(data?.save_as_template ?? data?.saveAsTemplate);
            this.adminUnlocked = !!(data?.admin_unlocked ?? data?.adminUnlocked);
            const rawWorked = data?.totalWorked ?? data?.total_worked;
            const rawNonWorked = data?.totalNonWorked ?? data?.total_non_worked;
            const rawPremium = data?.totalPremium ?? data?.total_premium;

            this.totalWorked = Number(rawWorked) || 0;
            this.totalNonWorked = Number(rawNonWorked) || 0;
            this.totalPremium = Number(rawPremium) || 0;

            const sourceRows = this.normalizeRowsFromTimesheetData(data);

            this.rows = sourceRows.map((row: any) => ({
              id: Number(row?.id) || undefined,
              date: row?.date ?? '-',
              dayOfWeek: row?.day_of_week ?? row?.dayOfWeek ?? '-',
              payCode: row?.pay_code ?? row?.payCode ?? '-',
              hours: Number(row?.hours) || 0,
              dailyTotal: Number(row?.daily_total ?? row?.dailyTotal) || 0,
              department: row?.department ?? row?.accounting_unit ?? row?.accountingUnit ?? '-',
              account: row?.account ?? row?.ferc ?? '-',
              project: row?.project ?? row?.activity ?? '',
              comment: row?.comment ?? '',
              isDeleted: !!(row?.is_deleted ?? row?.isDeleted)
            }));

            if (rawWorked === null || rawWorked === undefined || rawWorked === '') {
              this.totalWorked = this.rows
                .filter((r) => ['REGULAR', 'TRAINING'].includes((r.payCode || '').toUpperCase()))
                .reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
            }

            if (rawNonWorked === null || rawNonWorked === undefined || rawNonWorked === '') {
              this.totalNonWorked = this.rows
                .filter((r) =>
                  ['PTO', 'UNPAID_LEAVE', 'MISC_LEAVE', 'JURY_DUTY', 'BEREAVEMENT'].includes(
                    (r.payCode || '').toUpperCase()
                  )
                )
                .reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
            }

            if (rawPremium === null || rawPremium === undefined || rawPremium === '') {
              this.totalPremium = this.rows
                .filter((r) =>
                  ['OVERTIME', 'OVERTIME_1_5', 'DOUBLE_TIME', 'HOLIDAY_PAY'].includes((r.payCode || '').toUpperCase())
                )
                .reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
            }
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Failed to load timesheet details.';
            this.rows = [];
            this.cdr.detectChanges();
          });
        }
      });
  }

  private normalizeRowsFromTimesheetData(data: any): any[] {
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

    return dayGroups.flatMap((day: any) => {
      const dayDate = day?.date ?? '-';
      const dayOfWeek = day?.day_of_week ?? day?.dayOfWeek ?? '-';
      const dailyTotal = Number(day?.daily_total ?? day?.dailyTotal) || 0;
      const rows = Array.isArray(day?.rows) ? day.rows : [];
      return rows.map((row: any) => ({
        ...row,
        date: row?.date ?? dayDate,
        day_of_week: row?.day_of_week ?? row?.dayOfWeek ?? dayOfWeek,
        daily_total: row?.daily_total ?? row?.dailyTotal ?? dailyTotal
      }));
      });
  }

  private buildTimesheetDaysPayload(): Array<{
    date: string;
    day_of_week: string;
    daily_total: number;
    rows: Array<{
      id: number;
      pay_code: string;
      hours: number;
      accounting_unit: string;
      ferc: string;
      activity: string;
      comment: string;
      is_deleted: boolean;
    }>;
  }> {
    const grouped = new Map<string, TimesheetDetailRow[]>();
    this.rows.forEach((row) => {
      const key = String(row.date ?? '').trim();
      if (!key) {
        return;
      }
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    });

    return Array.from(grouped.entries()).map(([date, dayRows]) => {
      const dailyTotal = Number(dayRows.reduce((sum, row) => sum + (Number(row.hours) || 0), 0).toFixed(2));
      return {
        date,
        day_of_week: String(dayRows[0]?.dayOfWeek ?? ''),
        daily_total: dailyTotal,
        rows: dayRows.map((row) => ({
          id: Number(row.id) || 0,
          pay_code: String(row.payCode ?? ''),
          hours: Number(row.hours) || 0,
          accounting_unit: String(row.department ?? ''),
          ferc: String(row.account ?? ''),
          activity: String(row.project ?? ''),
          comment: String(row.comment ?? ''),
          is_deleted: !!row.isDeleted
        }))
      };
    });
  }
}
