// lib/permissions.ts

export type Permission = 'view_financials' | 'edit_compliance' | 'view_sensitive_reports' | 'manage_casting';

// This maps your exact "Role Name" from the Baserow table to capabilities
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'Business Manager': ['view_financials', 'view_sensitive_reports'],
  'Executive Director': ['view_financials', 'edit_compliance', 'view_sensitive_reports', 'manage_casting'],
  'Production Coordinator': ['edit_compliance', 'view_sensitive_reports'],
  'Stage Manager': ['edit_compliance'],
  'Director': ['manage_casting', 'view_sensitive_reports'],
  'Music Director': ['manage_casting'],
  'Choreographer': ['manage_casting'],
};

export function hasPermission(userRole: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[userRole] || [];
  return perms.includes(permission);
}