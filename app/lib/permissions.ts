// app/lib/permissions.ts

export type Permission = 
  | 'view_financials' 
  | 'edit_compliance' 
  | 'view_sensitive_reports' 
  | 'manage_casting'
  | 'view_cast_list'
  | 'view_billing';

// 1. GLOBAL ROLES (These apply everywhere, always)
const GLOBAL_ROLES: Record<string, Permission[]> = {
  'Admin': ['view_financials', 'edit_compliance', 'view_sensitive_reports', 'manage_casting', 'view_cast_list', 'view_billing'],
  'Parent/Guardian': ['view_billing'], // Parents only see money
  'Staff': ['view_cast_list', 'manage_casting'] // Staff might have broad access
};

// 2. PRODUCTION ROLES (These only apply if assigned to the CURRENT show)
const PRODUCTION_ROLES: Record<string, Permission[]> = {
  'Director': ['manage_casting', 'view_cast_list', 'view_sensitive_reports'],
  'Music Director': ['manage_casting', 'view_cast_list'],
  'Choreographer': ['manage_casting', 'view_cast_list'],
  'Stage Manager': ['view_cast_list', 'edit_compliance'],
  'Producer': ['view_financials', 'view_sensitive_reports', 'view_cast_list', 'edit_compliance']
};

export function hasPermission(
  globalRole: string, 
  productionRole: string | null, 
  permission: Permission
): boolean {
  // 1. Check Global Power first (e.g. Admin overrides everything)
  const globalPerms = GLOBAL_ROLES[globalRole] || [];
  if (globalPerms.includes(permission)) return true;

  // 2. If no global power, check Production Context
  if (productionRole) {
    const prodPerms = PRODUCTION_ROLES[productionRole] || [];
    if (prodPerms.includes(permission)) return true;
  }

  return false;
}