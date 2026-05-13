import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, take } from 'rxjs';
import { SecurityService, SecurityRoleItem } from '../../services/security.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-security-roles-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './security-roles-tab.html',
  styleUrls: ['./security-roles-tab.css']
})
export class SecurityRolesTabComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  rows: SecurityRoleItem[] = [];
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
    private readonly router: Router,
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
    const companyId = this.resolveCompanyId();
    if (!companyId) {
      this.rows = [];
      this.total = 0;
      this.error = 'Please select a company first.';
      if (this.retryCount < this.maxRetryCount) {
        this.retryCount += 1;
        this.retryTimer = setTimeout(() => this.load(), 350);
      }
      return;
    }
    this.retryCount = 0;

    this.loading = true;
    this.error = '';
    this.securityService.fetchRoles(companyId, this.page, this.size, this.search, this.status)
      .pipe(
        take(1),
        finalize(() => {
          this.setLoading(false);
        })
      )
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          const list = (data?.roles ?? data?.items ?? data?.content ?? data?.list ?? data ?? []) as any[];
          this.rows = Array.isArray(list) ? list.map((item: any) => ({
            id: item?.id ?? item?.roleId,
            name: item?.name ?? item?.roleName ?? '-',
            description: item?.description ?? item?.details ?? '-',
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
          this.error = String(err?.error?.message ?? 'Failed to load roles.');
          this.setLoading(false);
        }
      });
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

  openRoleView(row: SecurityRoleItem): void {
    const id = Number(row?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
    this.router.navigate(['/tm-system', 'roles', id]);
  }

  openAddRole(): void {
    this.router.navigate(['/tm-system', 'roles', 'add']);
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

  private resolveCompanyId(): string {
    const selected = String(localStorage.getItem('selectedCompanyId') ?? '').trim();
    if (selected) {
      return selected;
    }
    const fallback = String(localStorage.getItem('companyId') ?? '').trim();
    if (fallback) {
      return fallback;
    }
    const rawUser = String(localStorage.getItem('user') ?? '').trim();
    if (!rawUser) {
      return '';
    }
    try {
      const parsed = JSON.parse(rawUser);
      return String(parsed?.companyId ?? parsed?.company_id ?? '').trim();
    } catch {
      return '';
    }
  }

  private setLoading(value: boolean): void {
    this.ngZone.run(() => {
      this.loading = value;
      this.cdr.detectChanges();
    });
  }
}
