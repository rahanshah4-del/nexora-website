export function normalizeFinanceRole(role) {
  const value = String(role || '').trim().toLowerCase()
  if (['owner', 'admin', 'accountant', 'manager', 'staff'].includes(value)) return value
  return 'staff'
}

export function financePermissions(role) {
  const normalized = normalizeFinanceRole(role)
  const owner = normalized === 'owner'
  const admin = normalized === 'admin'
  const accountant = normalized === 'accountant'
  const manager = normalized === 'manager'

  return {
    role: normalized,
    canViewWallet: owner || admin || accountant,
    canManageAccounts: owner || admin || accountant,
    canManageInvoices: owner || admin || accountant || manager,
    canManageExpenses: owner || admin || accountant,
    canApproveStandard: owner || admin || accountant,
    canApproveAll: owner,
    canTransferFunds: owner || admin || accountant,
    canDeleteTransactions: owner,
    canExportReports: owner || admin || accountant,
    canCreateSalesRecords: owner || admin || accountant || manager,
    canAllowNegativeWallet: owner,
  }
}

export function canApproveFinance(role) {
  return financePermissions(role).canApproveStandard
}

export function outflowTransaction(type) {
  return ['bank_transfer', 'cash_withdrawal', 'cash_payment', 'expense'].includes(String(type || '').toLowerCase())
}
