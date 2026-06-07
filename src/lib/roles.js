export const workspaceRoles = ['owner', 'admin', 'accountant', 'manager', 'support', 'staff']
export const platformAdminRoles = ['platform_admin', 'super_admin']
export const backendAdminEmails = [
  'admin@nexora.com',
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
  const email = userDoc?.email || userDoc?.userEmail || ''
  return isBackendAdminEmail(email)
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
    support: true,
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
      support: false,
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
      support: false,
      hrDashboard: false,
      settingsAccess: false,
    }
  }
  if (value === 'support') {
    return {
      followUpEdit: false,
      followUpDelete: false,
      customerManagement: false,
      leadsManagement: false,
      invoices: false,
      reports: false,
      support: true,
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
    support: false,
    hrDashboard: false,
    settingsAccess: false,
  }
}
