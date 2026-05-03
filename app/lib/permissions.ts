export type Permission = 
  | 'view_financials' 
  | 'edit_compliance' 
  | 'view_sensitive_reports' 
  | 'manage_casting'
  | 'view_cast_list'
  | 'view_billing'
  | 'view_auditions'
  | 'manage_committees';

// 1. GLOBAL ROLES
const GLOBAL_ROLES: Record<string, Permission[]> = {
  // Aimee & Admins: See Everything
  'Executive Director': [
      'view_financials', 'edit_compliance', 'view_sensitive_reports', 
      'manage_casting', 'view_cast_list', 'view_billing', 'view_auditions', 'manage_committees'
  ],
  'Admin': [
      'view_financials', 'edit_compliance', 'view_sensitive_reports', 
      'manage_casting', 'view_cast_list', 'view_billing', 'view_auditions', 'manage_committees'
  ],

  // Krista: Money & Risk
  'Finance Manager': [
      'view_financials', 'view_billing', 'view_sensitive_reports'
  ],

  // Jenny: Logistics + Casting
  'Production Coordinator': [
      'edit_compliance', 'manage_casting', 'view_cast_list', 'view_sensitive_reports', 'view_auditions', 'manage_committees'
  ],
  
  // Elizabeth: Education + Casting Visibility
  'Education Coordinator': [
      'edit_compliance', 'view_cast_list', 'view_sensitive_reports', 'view_auditions'
  ],

  // Generic Staff
  'Staff': [
      'view_cast_list', 'manage_casting', 'edit_compliance', 'view_auditions'
  ], 

  // 🛡️ THE NEW HYPER-FOCUSED ROLE 🛡️
  'Committee Team': [
      'manage_committees'
  ],
  
  // Parents
  'Parent/Guardian': ['view_billing']
};

// 2. PRODUCTION ROLES
const PRODUCTION_ROLES: Record<string, Permission[]> = {
  'Director': [
      'manage_casting', 'view_cast_list', 'view_sensitive_reports', 'view_auditions'
  ],
  'Music Director': [
      'manage_casting', 'view_cast_list', 'view_auditions'
  ],
  'Choreographer': [
      'manage_casting', 'view_cast_list', 'view_auditions'
  ],
  'Stage Manager': [
      'view_cast_list', 'edit_compliance', 'view_auditions', 'manage_committees'
  ],
  'Producer': [
      'view_financials', 'view_sensitive_reports', 'view_cast_list', 'edit_compliance', 'view_auditions', 'manage_committees'
  ]
};

export function hasPermission(
  globalRole: string | string[], 
  productionRole: string | string[] | null, 
  permission: Permission
): boolean {
  
  // 🟢 FIX: Split comma-separated roles so "Committee Team,Admin" becomes ["Committee Team", "Admin"]
  const globalRolesArray = Array.isArray(globalRole) 
    ? globalRole 
    : (globalRole || '').split(',').map(r => r.trim());

  // Check if ANY of the user's global roles have the permission
  for (const role of globalRolesArray) {
    const globalPerms = GLOBAL_ROLES[role] || [];
    if (globalPerms.includes(permission)) return true;
  }

  // 🟢 FIX: Do the same for production roles just in case!
  if (productionRole) {
    const prodRolesArray = Array.isArray(productionRole) 
      ? productionRole 
      : (productionRole || '').split(',').map(r => r.trim());

    for (const role of prodRolesArray) {
      const prodPerms = PRODUCTION_ROLES[role] || [];
      if (prodPerms.includes(permission)) return true;
    }
  }

  return false;
}