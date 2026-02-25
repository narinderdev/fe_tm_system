import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TimesheetService } from '../../services/timesheet.service';

interface TimesheetDetailRow {
  date: string;
  dayOfWeek: string;
  payCode: string;
  hours: number;
  dailyTotal: number;
  accountingUnit: string;
  ferc: string;
  activity: string;
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

  timesheetId = 0;
  periodStartDate = '-';
  periodEndDate = '-';
  viewType = '-';
  status = '-';
  technicianId = 1;
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
      'Accounting Unit',
      'FERC',
      'Activity',
      'Comment'
    ];

    const exportRows = this.rows.map((row) => [
      row.date || '-',
      this.formatLabel(row.dayOfWeek) || '-',
      this.formatLabel(row.payCode) || '-',
      row.hours.toFixed(2),
      row.dailyTotal.toFixed(2),
      row.accountingUnit || '-',
      row.ferc || '-',
      row.activity || '-',
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
            this.viewType = this.formatLabel(data?.view_type ?? data?.viewType ?? '-');
            this.status = String(data?.status ?? '-').trim().toUpperCase();
            this.technicianId = Number(data?.technician_id ?? data?.technicianId) || 1;
            const rawWorked = data?.totalWorked ?? data?.total_worked;
            const rawNonWorked = data?.totalNonWorked ?? data?.total_non_worked;
            const rawPremium = data?.totalPremium ?? data?.total_premium;

            this.totalWorked = Number(rawWorked) || 0;
            this.totalNonWorked = Number(rawNonWorked) || 0;
            this.totalPremium = Number(rawPremium) || 0;

            const sourceRows = Array.isArray(data?.timesheet_rows)
              ? data.timesheet_rows
              : (Array.isArray(data?.timesheetRows) ? data.timesheetRows : []);

            this.rows = sourceRows.map((row: any) => ({
              date: row?.date ?? '-',
              dayOfWeek: row?.day_of_week ?? row?.dayOfWeek ?? '-',
              payCode: row?.pay_code ?? row?.payCode ?? '-',
              hours: Number(row?.hours) || 0,
              dailyTotal: Number(row?.daily_total ?? row?.dailyTotal) || 0,
              accountingUnit: row?.accounting_unit ?? row?.accountingUnit ?? '-',
              ferc: row?.ferc ?? '-',
              activity: row?.activity ?? '',
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
                .filter((r) => ['OVERTIME_1_5', 'DOUBLE_TIME', 'HOLIDAY_PAY'].includes((r.payCode || '').toUpperCase()))
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
}
