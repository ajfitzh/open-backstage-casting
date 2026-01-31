// app/lib/permissions.ts

export type Permission = 
  | 'view_financials' 
  | 'edit_compliance' 
  | 'view_sensitive_reports' 
  | 'manage_casting'
  | 'view_cast_list'
  | 'view_billing';

// 1. GLOBAL ROLES (Static, Permanent Staff)
const GLOBAL_ROLES: Record<string, Permission[]> = {
  // Aimee: The Big Kahuna (Same as Admin)
  'Executive Director': [
      'view_financials', 'edit_compliance', 'view_sensitive_reports', 
      'manage_casting', 'view_cast_list', 'view_billing'
  ],

  // Krista: Money & Risk Only
  'Finance Manager': [
      'view_financials', 'view_billing', 'view_sensitive_reports'
  ],

  // Jenny: Logistics & Casting (No Money)
  'Production Coordinator': [
      'edit_compliance', 'manage_casting', 'view_cast_list', 'view_sensitive_reports'
  ],
  
  // Elizabeth: Student Safety & Awareness
  'Education Coordinator': [
      'edit_compliance', 'view_cast_list', 'view_sensitive_reports'
  ],

  // Legacy/Generic Roles
  'Admin': ['view_financials', 'edit_compliance', 'view_sensitive_reports', 'manage_casting', 'view_cast_list', 'view_billing'],
  'Staff': ['view_cast_list', 'manage_casting', 'edit_compliance'], 
  'Parent/Guardian': ['view_billing']
};

// 2. PRODUCTION ROLES (Context-Dependent)
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
  // 1. Check Global Power
  // We use safeGet logic implicitly here by using the key
  const globalPerms = GLOBAL_ROLES[globalRole] || [];
  if (globalPerms.includes(permission)) return true;

  // 2. Check Production Context
  if (productionRole) {
    const prodPerms = PRODUCTION_ROLES[productionRole] || [];
    if (prodPerms.includes(permission)) return true;
  }

  return false;
}