export const Roles = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  sales: 'Sales Staff',
  support: 'Support Agent',
  accountant: 'Accountant',
}

export const Permissions = {
  create: 'create',
  edit: 'edit',
  delete: 'delete',
  viewReports: 'view_reports',
  manageTeam: 'manage_team',
  manageBilling: 'manage_billing',
  approveRequests: 'approve_requests',
}

// Demo permission map (adjust later with backend rules).
export const rolePermissions = {
  Owner: Object.values(Permissions),
  Admin: Object.values(Permissions),
  Manager: [Permissions.create, Permissions.edit, Permissions.viewReports, Permissions.manageTeam],
  'Sales Staff': [Permissions.create, Permissions.edit, Permissions.viewReports],
  'Support Agent': [Permissions.create, Permissions.edit],
  Accountant: [Permissions.viewReports, Permissions.manageBilling],
}

export function hasPermission(userDoc, perm) {
  const role = userDoc?.role || 'user'
  if (role === 'admin') return true
  const labelRole = Object.values(Roles).includes(role) ? role : null
  if (!labelRole) return false
  return rolePermissions[labelRole]?.includes(perm) ?? false
}

