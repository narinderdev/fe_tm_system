import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, take } from 'rxjs';
import { SecurityService, SecurityUserItem } from '../../services/security.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-security-users-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './security-users-tab.html',
  styleUrls: ['./security-users-tab.css']
})
export class SecurityUsersTabComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  rows: SecurityUserItem[] = [];
  page = 0;
  size = 10;
  total = 0;
  search = '';
  status = '';
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryCount = 0;
  private readonly maxRetryCount = 20;

  constructor(
    private readonly securityService: SecurityService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  load(): void {
    this.setLoading(true);
    this.error = '';
    this.securityService.fetchUsers(this.page, this.size, this.search, this.status)
      .pipe(
        take(1),
        finalize(() => {
          this.setLoading(false);
        })
      )
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          const list = (data?.users ?? data?.items ?? data?.content ?? data?.list ?? data ?? []) as any[];
          this.rows = Array.isArray(list) ? list.map((item: any) => ({
            id: item?.id ?? item?.userId,
            firstName: item?.firstName ?? '',
            lastName: item?.lastName ?? '',
            email: item?.email ?? '-',
            role: item?.role ?? item?.userRole ?? '-',
            status: this.normalizeStatus(item?.status, item?.active),
            active: this.isActive(item?.status, item?.active)
          })) : [];
          this.total = Number(data?.totalElements ?? data?.total ?? this.rows.length ?? 0);
          this.retryCount = 0;
          this.setLoading(false);
        },
        error: (err) => {
          this.rows = [];
          this.total = 0;
          this.error = String(err?.error?.message ?? 'Failed to load users.');
          this.setLoading(false);
        }
      });
  }

  fullName(row: SecurityUserItem): string {
    const value = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim();
    return value || '-';
  }

  changePage(direction: number): void {
    const next = this.page + direction;
    const totalPages = this.totalPages();
    if (next < 0 || next >= totalPages) {
      return;
    }
    this.page = next;
    this.load();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.size));
  }

  onApplyFilters(): void {
    this.page = 0;
    this.load();
  }

  private normalizeStatus(status: unknown, active: unknown): string {
    if (typeof status === 'string' && status.trim()) {
      return status.toUpperCase();
    }
    return this.isActive(status, active) ? 'ACTIVE' : 'INACTIVE';
  }

  private isActive(status: unknown, active: unknown): boolean {
    if (typeof active === 'boolean') {
      return active;
    }
    return String(status ?? '').trim().toUpperCase() === 'ACTIVE';
  }

  private setLoading(value: boolean): void {
    this.ngZone.run(() => {
      this.loading = value;
      this.cdr.detectChanges();
    });
  }
}
