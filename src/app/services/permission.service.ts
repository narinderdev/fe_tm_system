import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type ModuleKey = string;
type ActionKey = string;

interface StoredPermissions {
  modules: Record<ModuleKey, ActionKey[]>;
}

interface StoredUserProfile {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

const STORAGE_KEY = 'userPermissions';
const USER_STORAGE_KEY = 'currentUser';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  setFromUser(user: any): void {
    if (!this.isBrowser) {
      return;
    }
    const profile: StoredUserProfile = {
      id: user?.id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email
    };
    const modules: Record<ModuleKey, ActionKey[]> = {};
    const procurementModules = new Set(['MATERIAL_REQUISITION', 'PURCHASE_ORDER', 'GOODS_RECEIPT_NOTE']);

    const roles = user?.userRoles ?? [];
    roles.forEach((ur: any) => {
      const perms = ur?.role?.permissions ?? [];
      perms.forEach((p: any) => {
        const moduleKey = String(p?.module || '').toUpperCase();
        const action = String(p?.action || '').toUpperCase();
        if (!moduleKey) {
          return;
        }
        modules[moduleKey] = modules[moduleKey] || [];
        if (action) {
          modules[moduleKey].push(action);
        }
        if (procurementModules.has(moduleKey)) {
          modules['PROCUREMENT'] = modules['PROCUREMENT'] || [];
          modules['PROCUREMENT'].push(action || 'ACCESS');
        }
      });
    });

    // Derived modules for navigation visibility
    const hasRoleManagement =
      (modules['MANAGE_ROLES'] && modules['MANAGE_ROLES'].length > 0) ||
      (modules['MANAGE_USERS'] && modules['MANAGE_USERS'].length > 0) ||
      (modules['INVITE_USER'] && modules['INVITE_USER'].length > 0);
    if (hasRoleManagement) {
      const current = modules['ROLES'] || [];
      modules['ROLES'] = Array.from(new Set([...current, 'ACCESS']));
    }

    const payload: StoredPermissions = { modules };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
  }

  clear(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  getAllowedModules(): ModuleKey[] {
    if (!this.isBrowser) {
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed: StoredPermissions = JSON.parse(raw);
      return Object.keys(parsed.modules || {});
    } catch {
      return [];
    }
  }

  hasPermission(module: ModuleKey, action: ActionKey): boolean {
    if (!this.isBrowser) {
      return false;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }
    try {
      const parsed: StoredPermissions = JSON.parse(raw);
      const list = parsed.modules?.[module.toUpperCase()] || [];
      return list.includes(action.toUpperCase());
    } catch {
      return false;
    }
  }

  getCurrentUser(): StoredUserProfile | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredUserProfile;
    } catch {
      return null;
    }
  }

  getCurrentUserName(): string {
    const user = this.getCurrentUser();
    if (!user) {
      return '';
    }
    const names = [user.firstName, user.lastName].filter((part) => Boolean(part?.trim()));
    if (names.length) {
      return names.join(' ');
    }
    return user.email || '';
  }
}
