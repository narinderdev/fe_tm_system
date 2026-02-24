import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Loader } from '../loader/loader';
import { WorkOrderService, WorkOrderDetailResponse } from '../../services/work-order.service';

type WorkOrderDetail = NonNullable<WorkOrderDetailResponse['data']>;

interface WorkLogEntry {
  technician: string;
  checkIn?: string;
  checkOut?: string;
  hours: string;
  status: 'Present' | 'Absent';
}

interface WorkLogDay {
  isoDate: string;
  dayLabel: string;
  weekday: string;
  entries: WorkLogEntry[];
}

@Component({
  standalone: true,
  selector: 'app-tm-work-order-view',
  imports: [CommonModule, Loader],
  templateUrl: './tm-work-order-view.html',
  styleUrls: ['./tm-work-order-view.css']
})
export class TmWorkOrderViewComponent implements OnInit {
  workOrder?: WorkOrderDetail;
  workOrderId?: number | string;
  isLoading = false;
  errorMessage?: string;

  totalHoursLast7 = '0h 0m';
  daysPresentLast7 = 0;
  logDays: WorkLogDay[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.errorMessage = 'Missing work order id.';
      return;
    }
    this.workOrderId = idParam;
    this.loadWorkOrder(idParam);
  }

  goBack(): void {
    this.router.navigate(['/tm-system', 'work-orders']);
  }

  private loadWorkOrder(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;
    this.workOrderService
      .fetchWorkOrderById(id)
      .pipe(finalize(() => {
        // Ensure the loader flips off within Angular change detection.
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          // Run inside Angular to update the view when lazy-loaded.
          const detail = res.data ?? (res as any)?.workOrder;
          if (!detail) {
            this.errorMessage = 'Work order not found.';
            this.cdr.detectChanges();
            return;
          }
          this.workOrder = detail;
          this.buildLogs(detail);
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load work order.';
          this.cdr.detectChanges();
        }
      });
  }

  private buildLogs(detail: WorkOrderDetail): void {
    const logs = detail.checkLogs ?? [];
    const days = new Map<string, WorkLogDay>();
    const now = new Date();
    let totalMs = 0;

    const presentDays = new Set<string>();

    for (const rawLog of logs as Array<Record<string, any>>) {
      const log = rawLog || {};
      const inRaw = log['checkInAt'];
      const outRaw = log['checkOutAt'];
      const inTime = inRaw ? new Date(inRaw as any) : undefined;
      const outTime = outRaw ? new Date(outRaw as any) : undefined;
      const isoDate = inTime ? inTime.toISOString().slice(0, 10) : (outTime ? outTime.toISOString().slice(0, 10) : '');
      if (!isoDate) continue;

      const hoursMs = inTime && outTime && !Number.isNaN(inTime.getTime()) && !Number.isNaN(outTime.getTime())
        ? Math.max(outTime.getTime() - inTime.getTime(), 0)
        : 0;

      const day = days.get(isoDate) ?? {
        isoDate,
        dayLabel: this.formatDate(isoDate),
        weekday: this.formatWeekday(isoDate),
        entries: []
      };
      day.entries.push({
        technician: log['technicianName'] ?? 'Technician',
        checkIn: inTime ? this.formatTime(inTime) : undefined,
        checkOut: outTime ? this.formatTime(outTime) : undefined,
        hours: this.formatDuration(hoursMs),
        status: inTime ? 'Present' : 'Absent'
      });
      days.set(isoDate, day);

      const diffDays = Math.floor((now.getTime() - new Date(isoDate).getTime()) / 86_400_000);
      if (diffDays >= 0 && diffDays < 7) {
        if (inTime) {
          presentDays.add(isoDate);
        }
        totalMs += hoursMs;
      }
    }

    this.totalHoursLast7 = this.formatDuration(totalMs);
    this.logDays = Array.from(days.values()).sort((a, b) => b.isoDate.localeCompare(a.isoDate));
    this.daysPresentLast7 = presentDays.size;

    if (totalMs === 0) {
      const d: any = detail as any;
      const hours = d.actualWorkingHours ?? d.actualLaborHours ?? d.estimatedLaborHours;
      if (typeof hours === 'number' && hours > 0) {
        const fallbackMs = hours * 60 * 60 * 1000;
        this.totalHoursLast7 = this.formatDuration(fallbackMs);
      }
    }
  }

  private formatDate(value: string | Date): string {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  private formatWeekday(value: string | Date): string {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  private formatTime(value: Date): string {
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  private formatDuration(ms: number): string {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  get priorityLabel(): string {
    const value = this.workOrder?.priority ?? '';
    switch (value.toString().toUpperCase()) {
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      default:
        return 'Low';
    }
  }

  get statusLabel(): string {
    const value = this.workOrder?.status ?? '';
    if (!value) return 'New';
    return value
      .toString()
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ');
  }

  get dueDateLabel(): string {
    const date = this.workOrder?.targetCompletionDate || (this.workOrder as any)?.pmDueDate;
    return date ? this.formatDate(date) : '-';
  }

  get assignedToLabel(): string {
    return this.workOrder?.assignedTechnicianName || this.workOrder?.assignedTeamName || 'Unassigned';
  }
}

