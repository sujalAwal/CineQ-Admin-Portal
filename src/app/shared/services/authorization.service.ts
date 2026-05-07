import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Permission } from '../interfaces/role.interface';

export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export interface AuthProfileModule {
  id: string;
  code: number;
  name: string;
  displayName: string;
  api: string;
  description?: string;
  isEnabled: boolean;
  parentId?: string | null;
  permissionIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  private readonly STORAGE_KEY = 'cineq_auth_profile_modules';
  private readonly DEFAULT_ACTION_CODES: Record<CrudAction, number> = {
    create: 1,
    read: 2,
    update: 3,
    delete: 4
  };
  private readonly SYSTEM_ALLOWED_ROUTES = new Set<string>(['/dashboard']);

  private modulesByApi = new Map<string, AuthProfileModule>();
  private permissionsByApi = new Map<string, Set<number>>();
  private actionCodeMap = new Map<CrudAction, number>(
    Object.entries(this.DEFAULT_ACTION_CODES) as [CrudAction, number][]
  );

  private initializedSubject = new BehaviorSubject<boolean>(false);
  initialized$ = this.initializedSubject.asObservable();

  constructor() {
    this.loadModulesFromStorage();
  }

  initialize(modules: AuthProfileModule[] = [], permissions: Permission[] = []): void {
    this.setModules(modules);
    this.setPermissionDefinitions(permissions);
    this.initializedSubject.next(true);
  }

  setModules(modules: AuthProfileModule[] = []): void {
    this.modulesByApi.clear();
    this.permissionsByApi.clear();

    modules
      .filter((module) => module?.isEnabled !== false)
      .forEach((module) => {
        const api = this.normalizePath(module.api);
        if (!api) {
          return;
        }

        this.modulesByApi.set(api, module);
        const rawIds = module.permissionIds || [];
        const numericIds = rawIds
          .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
          .filter((n) => Number.isFinite(n));
        this.permissionsByApi.set(api, new Set(numericIds));
      });

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(modules || []));
  }

  setPermissionDefinitions(permissions: Permission[] = []): void {
    this.actionCodeMap = new Map<CrudAction, number>(
      Object.entries(this.DEFAULT_ACTION_CODES) as [CrudAction, number][]
    );

    permissions.forEach((permission) => {
      const action = (permission?.actionName || '').trim().toLowerCase() as CrudAction;
      if (action && this.actionCodeMap.has(action) && permission?.code != null) {
        this.actionCodeMap.set(action, permission.code);
      }
    });
  }

  canAccessRoute(path: string): boolean {
    const normalized = this.normalizePath(path);
    if (!normalized) {
      return false;
    }

    if (this.SYSTEM_ALLOWED_ROUTES.has(normalized)) {
      return true;
    }

    return this.modulesByApi.has(normalized);
  }

  can(moduleApi: string, action: CrudAction): boolean {
    const normalizedApi = this.normalizePath(moduleApi);
    if (!normalizedApi) {
      return false;
    }

    const actionCode = this.actionCodeMap.get(action);
    if (!actionCode) {
      return false;
    }

    const permissions = this.permissionsByApi.get(normalizedApi);
    return !!permissions?.has(actionCode);
  }

  canForRoute(routePath: string, action: CrudAction): boolean {
    const normalized = this.normalizePath(routePath);
    if (!normalized) {
      return false;
    }
    return this.can(normalized, action);
  }

  getAllowedNavigationApis(): Set<string> {
    return new Set(this.modulesByApi.keys());
  }

  reset(): void {
    this.modulesByApi.clear();
    this.permissionsByApi.clear();
    this.actionCodeMap = new Map<CrudAction, number>(
      Object.entries(this.DEFAULT_ACTION_CODES) as [CrudAction, number][]
    );
    this.initializedSubject.next(false);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Reload module/permission maps from localStorage (used on startup and after transient bootstrap errors).
   */
  hydrateFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return;
      }
      const modules = JSON.parse(raw) as AuthProfileModule[];
      this.setModules(modules || []);
      this.initializedSubject.next(true);
    } catch (_error) {
      this.reset();
    }
  }

  normalizePath(path: string | null | undefined): string {
    if (!path) {
      return '';
    }
    const withoutQuery = path.split('?')[0].split('#')[0].trim();
    if (!withoutQuery) {
      return '';
    }
    const ensuredSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
    return ensuredSlash.length > 1 ? ensuredSlash.replace(/\/+$/, '') : ensuredSlash;
  }

  private loadModulesFromStorage(): void {
    this.hydrateFromStorage();
  }
}
