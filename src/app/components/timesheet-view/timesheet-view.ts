import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
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

  timesheetId = 0;
  periodStartDate = '-';
  periodEndDate = '-';
  viewType = '-';
  technicianId = 1;
  rows: TimesheetDetailRow[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly timesheetService: TimesheetService
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

  get totalHours(): number {
    return Number(this.rows.reduce((sum, row) => sum + (Number(row.hours) || 0), 0).toFixed(2));
  }

  private loadTimesheet(): void {
    this.loading = true;
    this.error = undefined;

    this.timesheetService
      .fetchTimesheetById(this.timesheetId)
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          const data = response?.data ?? response;
          this.periodStartDate = data?.period_start_date ?? data?.periodStartDate ?? '-';
          this.periodEndDate = data?.period_end_date ?? data?.periodEndDate ?? '-';
          this.viewType = data?.view_type ?? data?.viewType ?? '-';
          this.technicianId = Number(data?.technician_id ?? data?.technicianId) || 1;

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
        },
        error: () => {
          this.error = 'Failed to load timesheet details.';
          this.rows = [];
        }
      });
  }
}
