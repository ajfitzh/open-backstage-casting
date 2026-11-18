import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  isAdminRole,
  isStaffRole,
  ASSIGNABLE_GLOBAL_ROLES,
  type Permission,
} from '../../app/lib/permissions.ts';

describe('hasPermission', () => {
  const allPermissions: Permission[] = [
    'view_financials',
    'edit_compliance',
    'view_sensitive_reports',
    'manage_casting',
    'view_cast_list',
    'view_billing',
    'view_auditions',
    'manage_committees',
    'view_checkin',
  ];

  it('grants every permission to Admin and Executive Director', () => {
    for (const perm of allPermissions) {
      assert.equal(hasPermission('Admin', null, perm), true, `Admin should have ${perm}`);
      assert.equal(hasPermission('Executive Director', null, perm), true, `Executive Director should have ${perm}`);
    }
  });

  it('restricts Finance Manager to financial, billing, and sensitive reports', () => {
    assert.equal(hasPermission('Finance Manager', null, 'view_financials'), true);
    assert.equal(hasPermission('Finance Manager', null, 'view_billing'), true);
    assert.equal(hasPermission('Finance Manager', null, 'view_sensitive_reports'), true);
    assert.equal(hasPermission('Finance Manager', null, 'manage_casting'), false);
    assert.equal(hasPermission('Finance Manager', null, 'manage_committees'), false);
  });

  it('restricts Parent/Guardian to billing only', () => {
    assert.equal(hasPermission('Parent/Guardian', null, 'view_billing'), true);
    assert.equal(hasPermission('Parent/Guardian', null, 'view_cast_list'), false);
    assert.equal(hasPermission('Parent/Guardian', null, 'view_auditions'), false);
  });

  it('supports comma-separated multi-role strings', () => {
    assert.equal(hasPermission('Committee Team, Finance Manager', null, 'manage_committees'), true);
    assert.equal(hasPermission('Committee Team, Finance Manager', null, 'view_financials'), true);
    assert.equal(hasPermission('Committee Team, Finance Manager', null, 'manage_casting'), false);
  });

  it('supports array roles for both global and production roles', () => {
    assert.equal(hasPermission(['Contractor'], ['Director'], 'manage_casting'), true);
    assert.equal(hasPermission(['Contractor'], ['Director'], 'view_financials'), false);
    assert.equal(hasPermission(['Parent/Guardian'], ['Stage Manager', 'Producer'], 'view_financials'), true);
  });

  it('combines global role and production role permissions', () => {
    assert.equal(hasPermission('Contractor', 'Stage Manager', 'edit_compliance'), true);
    assert.equal(hasPermission('Contractor', 'Stage Manager', 'manage_committees'), true);
    assert.equal(hasPermission('Contractor', 'Stage Manager', 'view_financials'), false);
  });

  it('returns false for empty or unknown roles', () => {
    assert.equal(hasPermission('', null, 'view_cast_list'), false);
    assert.equal(hasPermission('Guest', 'Audience', 'view_cast_list'), false);
  });
});

describe('isAdminRole & isStaffRole', () => {
  it('identifies Admin and Executive Director as admins (including multi-role strings)', () => {
    assert.equal(isAdminRole('Admin'), true);
    assert.equal(isAdminRole('Executive Director'), true);
    assert.equal(isAdminRole('Parent/Guardian, Admin'), true);
    assert.equal(isAdminRole('Finance Manager'), false);
    assert.equal(isAdminRole('Parent/Guardian'), false);
    assert.equal(isAdminRole(null), false);
  });

  it('recognizes all staff global and production roles while excluding parents and guests', () => {
    for (const role of [
      'Admin',
      'Executive Director',
      'Finance Manager',
      'Production Coordinator',
      'Education Coordinator',
      'Staff',
      'Contractor',
      'Committee Team',
      'Teacher',
    ]) {
      assert.equal(isStaffRole(role), true, `${role} should be recognized as staff`);
    }

    assert.equal(isStaffRole('Parent/Guardian', 'Director'), true);
    assert.equal(isStaffRole('Parent/Guardian', null), false);
    assert.equal(isStaffRole('Guest', null), false);
    assert.equal(isStaffRole('', null), false);
  });

  it('exposes assignable global roles list including Admin and Parent/Guardian', () => {
    assert.ok(ASSIGNABLE_GLOBAL_ROLES.includes('Admin'));
    assert.ok(ASSIGNABLE_GLOBAL_ROLES.includes('Committee Team'));
    assert.ok(ASSIGNABLE_GLOBAL_ROLES.includes('Parent/Guardian'));
  });
});
