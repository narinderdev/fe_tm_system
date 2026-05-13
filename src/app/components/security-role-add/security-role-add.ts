import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';
import { SecurityService } from '../../services/security.service';

interface PermissionFlags {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  approve: boolean;
}

interface ObjectPermissionMeta {
  view: string[];
  create: string[];
  update: string[];
  delete: string[];
  export: string[];
  approve: string[];
}

@Component({
  selector: 'app-security-role-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Loader],
  templateUrl: './security-role-add.html',
  styleUrls: ['./security-role-add.css']
})
export class SecurityRoleAddComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';

  roleName = '';
  description = '';
  technicianRole = false;
  allPermissions = false;

  securityClasses = [
    'Dashboard', 'Asset', 'Service Request', 'Work Order', 'Maintenance', 'Inventory', 'Procurement', 'Vendor', 'Technician'
  ];

  objectMap: Record<string, string[]> = {
    Dashboard: ['Maintenance Dashboard', 'Security Dashboard', 'Budget Dashboard', 'Iot Dashboard', 'Tm Dashboard'],
    Asset: ['Asset Type', 'Asset'],
    'Service Request': ['Service Request'],
    'Work Order': ['Work Order Type', 'Work Order'],
    Maintenance: ['Preventive Maintenance', 'Corrective Maintenance'],
    Inventory: ['Inventory', 'Inventory Reconcile', 'Inventory Audit Logs', 'Material Requisition', 'Goods Receipt Note'],
    Procurement: ['Purchase Order'],
    Vendor: ['Vendor'],
    Technician: ['Technician', 'Technician Team', 'Invite User', 'Roles', 'Users', 'Security Report', 'Mfa']
  };

  selectedClass = 'Dashboard';
  selectedObject = 'Maintenance Dashboard';
  objectPermissionActions = new Map<string, Set<string>>();
  objectPermissionMeta = new Map<string, ObjectPermissionMeta>();

  permissionByObject = new Map<string, PermissionFlags>();

  constructor(
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly securityService: SecurityService
  ) {
    this.ensureObjectEntry(this.selectedObject);
  }

  ngOnInit(): void {
    this.loadPermissionsFromApi();
  }

  get companyLabel(): string {
    const number = String(localStorage.getItem('selectedCompanyNumber') ?? '').trim();
    const legalName = String(localStorage.getItem('selectedCompanyLegalName') ?? '').trim();
    const tradeName = String(localStorage.getItem('selectedCompanyTradeName') ?? '').trim();
    const name = legalName || tradeName || '-';
    return number ? `${name} - ${number}` : name;
  }

  get securableObjects(): string[] {
    return this.objectMap[this.selectedClass] ?? [];
  }

  get currentPermission(): PermissionFlags {
    this.ensureObjectEntry(this.selectedObject);
    return this.permissionByObject.get(this.selectedObject)!;
  }

  isPermissionAvailable(action: keyof PermissionFlags): boolean {
    const actions = this.objectPermissionActions.get(this.selectedObject);
    if (!actions || !actions.size) {
      return true;
    }
    return actions.has(action);
  }

  back(): void {
    this.router.navigate(['/tm-system', 'roles']);
  }

  selectClass(value: string): void {
    this.selectedClass = value;
    const first = this.securableObjects[0] ?? '';
    if (first) {
      this.selectedObject = first;
      this.ensureObjectEntry(first);
    }
  }

  selectObject(value: string): void {
    this.selectedObject = value;
    this.ensureObjectEntry(value);
  }

  toggleAllPermissions(): void {
    for (const object of this.allObjects()) {
      this.permissionByObject.set(object, {
        view: this.allPermissions,
        create: this.allPermissions,
        update: this.allPermissions,
        delete: this.allPermissions,
        export: this.allPermissions,
        approve: this.allPermissions
      });
    }
  }

  save(): void {
    const companyId = this.resolveCompanyId();
    if (!companyId) {
      this.toastr.error('Please select a company first.');
      return;
    }
    if (!this.roleName.trim()) {
      this.toastr.error('Role name is required.');
      return;
    }

    const permissionCodes = this.buildPermissionCodes();
    const payload = {
      name: this.roleName.trim(),
      description: this.description.trim(),
      technicianRole: this.technicianRole,
      permissionCodes
    };

    this.saving = true;
    this.loading = true;
    this.securityService.createRole(companyId, payload)
      .pipe(
        take(1),
        finalize(() => {
          this.saving = false;
          this.loading = false;
        })
      )
      .subscribe({
        next: (res: any) => {
          const ok = Number(res?.statusCode ?? 0) === 200 || String(res?.status ?? '').toLowerCase() === 'success';
          if (!ok) {
            this.toastr.error(res?.message || 'Failed to create role.');
            return;
          }
          this.toastr.success(res?.message || 'Role created successfully.');
          this.router.navigate(['/tm-system', 'roles']);
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Failed to create role.');
        }
      });
  }

  private allObjects(): string[] {
    return Object.values(this.objectMap).flat();
  }

  private normalizeCode(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private buildPermissionCodes(): string[] {
    const codes = new Set<string>();
    for (const [object, flags] of this.permissionByObject.entries()) {
      const meta = this.objectPermissionMeta.get(object);
      if (!meta) {
        const key = this.normalizeCode(object);
        if (flags.view) codes.add(`view_${key}`);
        if (flags.create) codes.add(`create_${key}`);
        if (flags.update) codes.add(`update_${key}`);
        if (flags.delete) codes.add(`delete_${key}`);
        if (flags.export) codes.add(`export_${key}`);
        if (flags.approve) codes.add(`approve_${key}`);
        continue;
      }

      if (flags.view) meta.view.forEach(code => codes.add(code));
      if (flags.create) meta.create.forEach(code => codes.add(code));
      if (flags.update) meta.update.forEach(code => codes.add(code));
      if (flags.delete) meta.delete.forEach(code => codes.add(code));
      if (flags.export) meta.export.forEach(code => codes.add(code));
      if (flags.approve) meta.approve.forEach(code => codes.add(code));
    }
    return Array.from(codes);
  }

  private ensureObjectEntry(object: string): void {
    if (this.permissionByObject.has(object)) {
      return;
    }
    this.permissionByObject.set(object, {
      view: false,
      create: false,
      update: false,
      delete: false,
      export: false,
      approve: false
    });
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

  private loadPermissionsFromApi(): void {
    this.securityService.fetchPermissions()
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          const classes = Array.isArray(res?.data?.classes) ? res.data.classes : [];
          if (!classes.length) {
            return;
          }

          const nextMap: Record<string, string[]> = {};
          const nextObjectActions = new Map<string, Set<string>>();
          const nextObjectMeta = new Map<string, ObjectPermissionMeta>();
          const classNames: string[] = [];

          for (const cls of classes) {
            const className = String(cls?.name ?? '').trim();
            if (!className) continue;
            classNames.push(className);

            const objects = Array.isArray(cls?.objects) ? cls.objects : [];
            const objectNames: string[] = [];
            for (const obj of objects) {
              const objectName = String(obj?.name ?? '').trim();
              if (!objectName) continue;
              objectNames.push(objectName);

              const permissions = Array.isArray(obj?.permissions) ? obj.permissions : [];
              const actionSet = new Set<string>();
              const meta: ObjectPermissionMeta = {
                view: [],
                create: [],
                update: [],
                delete: [],
                export: [],
                approve: []
              };
              for (const perm of permissions) {
                const rawAction = String(perm?.action ?? '').trim().toUpperCase();
                const rawCode = String(perm?.code ?? '').trim().toLowerCase();
                if (!rawCode || !rawAction) continue;
                let action: keyof ObjectPermissionMeta | '' = '';
                if (rawAction === 'VIEW') action = 'view';
                else if (rawAction === 'CREATE') action = 'create';
                else if (rawAction === 'UPDATE') action = 'update';
                else if (rawAction === 'DELETE') action = 'delete';
                else if (rawAction === 'EXPORT') action = 'export';
                else if (rawAction === 'APPROVE') action = 'approve';
                else if (rawAction === 'ACCESS') action = 'view';
                if (!action) continue;

                actionSet.add(action);
                meta[action].push(rawCode);
              }
              nextObjectActions.set(objectName, actionSet);
              nextObjectMeta.set(objectName, meta);
            }

            nextMap[className] = objectNames;
          }

          if (classNames.length) {
            this.securityClasses = classNames;
            this.objectMap = nextMap;
            this.objectPermissionActions = nextObjectActions;
            this.objectPermissionMeta = nextObjectMeta;
            this.selectedClass = this.securityClasses[0];
            this.selectedObject = this.objectMap[this.selectedClass]?.[0] ?? '';
            if (this.selectedObject) {
              this.ensureObjectEntry(this.selectedObject);
            }
          }
        },
        error: () => {
          // Keep fallback hardcoded values if API fails.
        }
      });
  }
}
