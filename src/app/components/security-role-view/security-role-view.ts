import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { SecurityService } from '../../services/security.service';
import { Loader } from '../loader/loader';

interface PermissionRow {
  module: string;
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

@Component({
  selector: 'app-security-role-view',
  standalone: true,
  imports: [CommonModule, RouterModule, Loader],
  templateUrl: './security-role-view.html',
  styleUrls: ['./security-role-view.css']
})
export class SecurityRoleViewComponent implements OnInit {
  loading = false;
  error = '';

  roleName = '';
  roleDescription = '';
  totalPermissions = 0;
  accessibleTabs: string[] = [];
  permissionRows: PermissionRow[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly securityService: SecurityService,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error = 'Invalid role id.';
      return;
    }
    this.load(id);
  }

  goBack(): void {
    this.router.navigate(['/tm-system', 'roles']);
  }

  private load(roleId: number): void {
    const companyId = this.resolveCompanyId();
    if (!companyId) {
      this.error = 'Please select a company first.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.securityService.fetchRoleById(roleId, companyId)
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
        next: (res: any) => {
          this.zone.run(() => {
            const data = res?.data ?? {};
            this.roleName = String(data?.name ?? '-');
            this.roleDescription = String(data?.description ?? '-');
            const codes = Array.isArray(data?.permissionCodes) ? data.permissionCodes : [];
            this.totalPermissions = codes.length;
            this.accessibleTabs = this.extractAccessibleTabs(codes);
            this.permissionRows = this.toPermissionRows(codes);
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.zone.run(() => {
            this.error = String(err?.error?.message ?? 'Failed to load role details.');
            this.cdr.detectChanges();
          });
        }
      });
  }

  private extractAccessibleTabs(codes: string[]): string[] {
    const tabs = new Set<string>();
    for (const code of codes) {
      const normalized = String(code ?? '').trim().toLowerCase();
      if (!normalized) continue;
      const moduleKey = normalized
        .replace(/^(view_|create_|update_|delete_|approve_|manage_)/, '')
        .replace(/^invite_/, 'invite_');
      tabs.add(this.toTitle(moduleKey.replace(/_/g, ' ')));
    }
    return Array.from(tabs);
  }

  private toPermissionRows(codes: string[]): PermissionRow[] {
    const map = new Map<string, PermissionRow>();

    const ensure = (moduleKey: string): PermissionRow => {
      const label = this.toTitle(moduleKey.replace(/_/g, ' '));
      const existing = map.get(moduleKey);
      if (existing) return existing;
      const created: PermissionRow = { module: label, view: false, create: false, update: false, delete: false };
      map.set(moduleKey, created);
      return created;
    };

    for (const raw of codes) {
      const code = String(raw ?? '').trim().toLowerCase();
      if (!code) continue;

      if (code.startsWith('view_')) {
        ensure(code.slice(5)).view = true;
      } else if (code.startsWith('create_')) {
        ensure(code.slice(7)).create = true;
      } else if (code.startsWith('update_')) {
        ensure(code.slice(7)).update = true;
      } else if (code.startsWith('delete_')) {
        ensure(code.slice(7)).delete = true;
      } else if (code.startsWith('approve_') || code.startsWith('manage_')) {
        const key = code.replace(/^(approve_|manage_)/, '');
        ensure(key).update = true;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.module.localeCompare(b.module));
  }

  private toTitle(value: string): string {
    return value
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveCompanyId(): string {
    const selected = String(localStorage.getItem('selectedCompanyId') ?? '').trim();
    if (selected) return selected;
    const fallback = String(localStorage.getItem('companyId') ?? '').trim();
    if (fallback) return fallback;
    const rawUser = String(localStorage.getItem('user') ?? '').trim();
    if (!rawUser) return '';
    try {
      const parsed = JSON.parse(rawUser);
      return String(parsed?.companyId ?? parsed?.company_id ?? '').trim();
    } catch {
      return '';
    }
  }
}
