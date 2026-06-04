import { statusValue } from './calculations.js'
import { financePermissions, normalizeFinanceRole } from './financeAccess.js'

function hasPermission(permissions = {}, key) {
  return Boolean(permissions?.[key])
}

function normalizeInvoiceRole(role, userDoc) {
  const rawRole = String(userDoc?.role ?? role ?? '').trim()
  return rawRole ? normalizeFinanceRole(userDoc?.role || role) : 'owner'
}

export function isDraftInvoice(invoice) {
  const status = statusValue(invoice?.status, '')
  const paymentStatus = statusValue(invoice?.paymentStatus, '')
  return status === 'draft' || paymentStatus === 'draft'
}

export function invoiceActionState(invoice) {
  const status = statusValue(invoice?.status, 'pending')
  const paymentStatus = statusValue(invoice?.paymentStatus, '')
  const isCancelled = ['rejected', 'cancelled', 'canceled'].includes(status) || ['rejected', 'cancelled', 'canceled'].includes(paymentStatus)
  return {
    status,
    paymentStatus,
    isDraft: status === 'draft' || paymentStatus === 'draft',
    isPaid: status === 'paid' || paymentStatus === 'paid',
    isCancelled,
    hasEditableBusinessStatus: ['draft', 'pending'].includes(status) || ['draft', 'pending'].includes(paymentStatus),
  }
}

export function hasExplicitInvoicePermission(permissions = {}, action = 'view') {
  const normalizedAction = String(action || 'view').trim().toLowerCase()
  if (normalizedAction === 'print' || normalizedAction === 'email') {
    return hasPermission(permissions, 'module.invoices.export')
  }
  if (normalizedAction === 'view') {
    return hasPermission(permissions, 'invoices') || hasPermission(permissions, 'module.invoices.view')
  }
  return hasPermission(permissions, `module.invoices.${normalizedAction}`)
}

export function resolveInvoicePermissions(role, userDoc, workspacePermissions = {}, explicitWorkspacePermissions = {}) {
  const normalized = normalizeInvoiceRole(role, userDoc)
  const finance = financePermissions(normalized)
  const isOwnerAdmin = normalized === 'owner' || normalized === 'admin'
  const isAccountant = normalized === 'accountant'
  const isManager = normalized === 'manager'
  const isSales = normalized === 'sales'
  const isSupportStaff = normalized === 'staff'
  const hasInvoicePolicy = hasPermission(workspacePermissions, 'invoices') || hasPermission(workspacePermissions, 'module.invoices.view')
  const hasExplicitView = hasExplicitInvoicePermission(explicitWorkspacePermissions, 'view')
  const hasExplicitExport = hasExplicitInvoicePermission(explicitWorkspacePermissions, 'export')
  const managerSharingAllowed = isManager && (hasInvoicePolicy || hasExplicitExport)
  const explicitSharingAllowed = (isSales || isSupportStaff) && hasExplicitExport

  const canView = isOwnerAdmin || isAccountant || isManager || isSales || finance.canViewInvoices || finance.canManageInvoices || hasExplicitView
  const canCreate = isOwnerAdmin || isManager || isSales
  const canEdit = isOwnerAdmin || isManager || isSales
  const canRecordPayments = isOwnerAdmin || isAccountant
  const canShare = isOwnerAdmin || isAccountant || managerSharingAllowed || explicitSharingAllowed

  return {
    role: normalized,
    invoiceActionRole: normalized,
    canViewInvoice: canView,
    canCreateInvoice: canCreate,
    canEditInvoice: canEdit,
    canDeleteInvoice: isOwnerAdmin,
    canRecordPayment: canRecordPayments,
    canExportInvoice: canShare,
    canPrintInvoice: canShare,
    canEmailInvoice: canShare,
    canView,
    canCreate,
    canEdit,
    canEditBusiness: canEdit,
    canEditPaymentFields: canRecordPayments,
    canDuplicate: isOwnerAdmin,
    canApprove: isOwnerAdmin,
    canReject: isOwnerAdmin,
    canRecordPayments,
    canCreatePaidInvoices: isOwnerAdmin || isAccountant,
    canSend: canShare,
    canExport: canShare,
    canPrint: canShare,
    canEmail: canShare,
    canEditAllInvoiceFields: isOwnerAdmin,
    canAdjustInventoryOnPayment: isOwnerAdmin,
    canDelete: isOwnerAdmin,
  }
}

export function canViewInvoice(permissions = {}) {
  return Boolean(permissions.canViewInvoice ?? permissions.canView)
}

export function canCreateInvoice(permissions = {}) {
  return Boolean(permissions.canCreateInvoice ?? permissions.canCreate)
}

export function canEditInvoice(permissions = {}, invoice = {}) {
  const role = permissions.invoiceActionRole || permissions.role || 'owner'
  if (role === 'owner' || role === 'admin') return true
  if (role === 'manager') return Boolean(permissions.canEditInvoice ?? permissions.canEdit)
  if (role === 'sales') return Boolean(permissions.canEditInvoice ?? permissions.canEdit) && isDraftInvoice(invoice)
  return false
}

export function canDeleteInvoice(permissions = {}) {
  return Boolean(permissions.canDeleteInvoice ?? permissions.canDelete)
}

export function canRecordPayment(permissions = {}) {
  return Boolean(permissions.canRecordPayment ?? permissions.canRecordPayments)
}

export function canExportInvoice(permissions = {}) {
  return Boolean(permissions.canExportInvoice ?? permissions.canExport)
}

export function canPrintInvoice(permissions = {}) {
  return Boolean(permissions.canPrintInvoice ?? permissions.canPrint)
}

export function canEmailInvoice(permissions = {}) {
  return Boolean(permissions.canEmailInvoice ?? permissions.canEmail ?? permissions.canSend)
}

export function invoiceActionAccess(permissions = {}, invoice = {}) {
  const role = permissions.invoiceActionRole || permissions.role || 'owner'
  const isOwnerAdmin = role === 'owner' || role === 'admin'
  const state = invoiceActionState(invoice)

  return {
    canView: canViewInvoice(permissions),
    canEdit: canEditInvoice(permissions, invoice),
    canDuplicate: Boolean(permissions.canDuplicate) && isOwnerAdmin,
    canSetAnyStatus: isOwnerAdmin,
    canEditStatus: isOwnerAdmin || state.hasEditableBusinessStatus,
    canDownload: canExportInvoice(permissions),
    canPrint: canPrintInvoice(permissions),
    canSendEmail: canEmailInvoice(permissions),
    canSendWhatsApp: canEmailInvoice(permissions),
    canMarkPaid: canRecordPayment(permissions) && !state.isPaid && !state.isCancelled,
    canMarkPartial: canRecordPayment(permissions) && !state.isPaid && !state.isCancelled,
    canSendApproval: Boolean(permissions.canApprove) && !state.isPaid && !state.isCancelled,
    canCancel: Boolean(permissions.canReject) && !state.isCancelled,
    canDelete: canDeleteInvoice(permissions),
  }
}
