export const workspaceRoles = ['owner', 'admin', 'accountant', 'manager', 'staff']
export const platformAdminRoles = ['platform_admin', 'super_admin']
export const backendAdminEmails = [
  'rahanshah2@gmail.com',
]
export const developerAdminEmail = backendAdminEmails[0]

export function isBackendAdminEmail(email) {
  return backendAdminEmails.includes(String(email || '').trim().toLowerCase())
}

export function normalizeRoleValue(role, fallback = 'staff') {
  const value = String(role || '').trim().toLowerCase()
  if (workspaceRoles.includes(value) || platformAdminRoles.includes(value)) return value
  return fallback
}

export function isPlatformAdminDoc(userDoc = {}) {
  const role = normalizeRoleValue(userDoc?.role, '')
  const email = userDoc?.email || userDoc?.userEmail || ''
  return userDoc?.isAdmin === true || platformAdminRoles.includes(role) || isBackendAdminEmail(email)
}

export function workspacePermissionDefaults(role) {
  const value = normalizeRoleValue(role)
  const all = {
    followUpEdit: true,
    followUpDelete: true,
    customerManagement: true,
    leadsManagement: true,
    invoices: true,
    reports: true,
    hrDashboard: true,
    settingsAccess: true,
  }

  if (value === 'owner' || value === 'admin') return all
  if (value === 'manager') {
    return {
      followUpEdit: true,
      followUpDelete: true,
      customerManagement: true,
      leadsManagement: true,
      invoices: true,
      reports: true,
      hrDashboard: false,
      settingsAccess: false,
    }
  }
  if (value === 'accountant') {
    return {
      followUpEdit: false,
      followUpDelete: false,
      customerManagement: false,
      leadsManagement: false,
      invoices: true,
      reports: true,
      hrDashboard: false,
      settingsAccess: false,
    }
  }
  return {
    followUpEdit: false,
    followUpDelete: false,
    customerManagement: false,
    leadsManagement: false,
    invoices: false,
    reports: false,
    hrDashboard: false,
    settingsAccess: false,
  }
}
