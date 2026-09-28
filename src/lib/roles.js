import { isAdminUid } from './adminUids.js'

export const workspaceRoles = ['owner', 'admin', 'manager', 'cashier', 'sales_staff', 'accountant', 'support_staff', 'data_entry', 'viewer', 'support', 'staff', 'sales']
export const platformAdminRoles = ['platform_admin', 'super_admin']

/** Platform admin check for a Firebase Auth user: by UID (see adminUids.js), never by email. */
export function isBackendAdminUser(user) {
  return isAdminUid(user?.uid)
}

export function normalizeRoleValue(role, fallback = 'staff') {
  const value = String(role || '').trim().toLowerCase()
  if (workspaceRoles.includes(value) || platformAdminRoles.includes(value)) return value
  return fallback
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
  if (value === 'support_staff' || value === 'support') {
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
  if (value === 'cashier') {
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
