/**
 * REPORT_CATALOG — Enterprise Reports Centre configuration.
 *
 * Pure metadata. Zero side effects. Backward-compatible.
 *
 * Each report entry describes:
 *   id          — unique key
 *   category    — grouping category
 *   label       — human-readable title
 *   description — short help text
 *   modules     — business types that show this report
 *   collections — Firestore collections needed
 *   filters     — available filter types
 *   aggregations — functions to call on the raw data
 *   exports     — supported export formats
 *   drills      — drill-down report ids (future)
 *   icon        — icon key for UI
 *   default     — true if this is the default report in its category
 */

export const REPORT_CATEGORIES = {
  finance: {
    label: 'Finance',
    icon: 'HiOutlineBanknotes',
    description: 'Profit & Loss, Income, Expenses, Cash, Bank, Wallet, Refunds, Supplier Payments',
    order: 0,
  },
  sales: {
    label: 'Sales',
    icon: 'HiOutlineShoppingBag',
    description: 'Invoice Sales, POS Sales, Restaurant Sales, Transport Sales, Daily/Monthly, by Product/Customer/Staff/Method',
    order: 1,
  },
  purchase: {
    label: 'Purchases',
    icon: 'HiOutlineClipboardDocumentList',
    description: 'Purchase Summary, Payments, Supplier Due, Supplier Statement, Returns',
    order: 2,
  },
  inventory: {
    label: 'Inventory',
    icon: 'HiOutlineCube',
    description: 'Stock Summary, Movements, Low Stock, Valuation, Product Profitability, Sales/Purchase Returns',
    order: 3,
  },
  customer: {
    label: 'Customers',
    icon: 'HiOutlineUserGroup',
    description: 'Customer Ledger, Balance, Top Customers, Activity',
    order: 4,
  },
  supplier: {
    label: 'Suppliers',
    icon: 'HiOutlineTruck',
    description: 'Supplier Ledger, Balance, Top Suppliers, Activity',
    order: 5,
  },
  crm: {
    label: 'CRM',
    icon: 'HiOutlineChartBar',
    description: 'Leads, Pipeline, Conversion, Staff Performance',
    order: 6,
  },
  school: {
    label: 'School ERP',
    icon: 'HiOutlineBuildingOffice2',
    description: 'Fee Collection, Outstanding Fees, Attendance, Student Summary',
    order: 7,
  },
  transport: {
    label: 'Transport',
    icon: 'HiOutlineTruck',
    description: 'Trip Revenue, Vehicle Profit, Fuel, Driver Performance',
    order: 8,
  },
  restaurant: {
    label: 'Restaurant',
    icon: 'HiOutlineFire',
    description: 'KOT, Table Turnover, Waiter Performance, Kitchen Summary',
    order: 9,
  },
  loyalty: {
    label: 'Loyalty & Rewards',
    icon: 'HiOutlineStar',
    description: 'Membership, Points, Rewards, Coupons, Referrals, Wallet, Campaigns, Birthday Automation',
    order: 11,
  },
  overview: {
    label: 'Business Overview',
    icon: 'HiOutlineChartPie',
    description: 'Executive Dashboard, Daily Closing, Monthly Summary, Multi-module Comparison',
    order: 10,
  },
}

/**
 * Every collection name that may appear in a report definition.
 * Used by useReports to know what to subscribe to.
 */
export const REPORT_COLLECTIONS = [
  'invoices',
  'payments',
  'expenses',
  'accountTransactions',
  'purchases',
  'suppliers',
  'posOrders',
  'customers',
  'leads',
  'pipelines',
  'tasks',
  'teamMembers',
  'staff',
  'activityLogs',
  'products',
  'inventoryTransactions',
  'categories',
]

/**
 * Filter flags matched to each report.
 */
export const REPORT_FILTERS = {
  dateRange: 'dateRange',      // start/end date picker
  datePreset: 'datePreset',    // today/week/month/custom
  currency: 'currency',        // currency selector
  businessType: 'businessType',// module toggle
  staff: 'staff',              // staff/cashier filter
  customer: 'customer',        // customer selector
  supplier: 'supplier',        // supplier selector
  product: 'product',          // product selector
  category: 'category',        // product category
  paymentMethod: 'paymentMethod', // payment method
  status: 'status',            // approval/payment status
  location: 'location',        // branch/register
}

export const REPORT_EXPORTS = {
  csv: { label: 'CSV', icon: 'HiOutlineTableCells' },
  pdf: { label: 'PDF', icon: 'HiOutlineDocumentText' },
  excel: { label: 'Excel', icon: 'HiOutlineArrowDownTray' },
  print: { label: 'Print', icon: 'HiOutlinePrinter' },
  thermal: { label: '58mm', icon: 'HiOutlinePrinter' },
}

/**
 * The full REPORT_CATALOG.
 *
 * Each entry:
 *   id          — unique identifier, used as route/selection key
 *   category    — REPORT_CATEGORIES key
 *   label       — display title
 *   description — short description
 *   modules     — array of businessType keys this applies to (or '*' for all)
 *   collections — collections that must be loaded
 *   filters     — REPORT_FILTERS keys this report supports
 *   exports     — REPORT_EXPORTS keys
 *   aggregations — array of aggregation function names (see aggregations below)
 *   drills      — array of report ids that this can drill into
 *   icon        — Heroicons v2 name
 *   badge       — optional badge text
 *   default     — true if selected by default when category opens
 *
 * All fields are advisory — existing reports continue to work unchanged.
 */
export const REPORT_CATALOG = [
  // ── FINANCE ──
  {
    id: 'profit-loss',
    category: 'finance',
    label: 'Profit & Loss',
    description: 'Revenue minus expenses over a period — shows net profit or loss with breakdowns',
    modules: '*',
    collections: ['invoices', 'payments', 'expenses', 'accountTransactions'],
    filters: ['dateRange', 'datePreset', 'currency'],
    exports: ['csv', 'pdf', 'excel', 'print'],
    aggregations: ['aggregateProfitLoss'],
    drills: ['income', 'expense-detail'],
    icon: 'HiOutlineChartBar',
    default: true,
  },
  {
    id: 'income',
    category: 'finance',
    label: 'Income',
    description: 'All revenue streams — invoices paid, payments received, POS sales, transport collections',
    modules: '*',
    collections: ['invoices', 'payments', 'accountTransactions', 'posOrders'],
    filters: ['dateRange', 'datePreset', 'currency', 'customer', 'paymentMethod'],
    exports: ['csv', 'pdf', 'excel', 'print'],
    aggregations: ['aggregateIncome'],
    drills: ['invoice-sales', 'customer-payments'],
    icon: 'HiOutlineCurrencyDollar',
  },
  {
    id: 'expense-detail',
    category: 'finance',
    label: 'Expenses',
    description: 'Approved expenses by category with payment method and approval trail',
    modules: '*',
    collections: ['expenses', 'accountTransactions'],
    filters: ['dateRange', 'datePreset', 'currency', 'category', 'status'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateExpenses'],
    icon: 'HiOutlineReceiptPercent',
  },
  {
    id: 'cash',
    category: 'finance',
    label: 'Cash Balance',
    description: 'Physical cash in the drawer — wallet minus bank transfers',
    modules: '*',
    collections: ['invoices', 'payments', 'expenses', 'accountTransactions'],
    filters: ['dateRange', 'currency'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateCash'],
    icon: 'HiOutlineBanknotes',
  },
  {
    id: 'bank',
    category: 'finance',
    label: 'Bank Balance',
    description: 'Total approved bank transfers (money moved out of wallet to bank)',
    modules: '*',
    collections: ['accountTransactions'],
    filters: ['dateRange', 'currency'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateBank'],
    icon: 'HiOutlineBuildingStorefront',
  },
  {
    id: 'wallet',
    category: 'finance',
    label: 'Wallet Balance',
    description: 'All revenue minus all outflows — the master balance',
    modules: '*',
    collections: ['invoices', 'payments', 'expenses', 'accountTransactions'],
    filters: ['dateRange', 'currency'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateWallet'],
    icon: 'HiOutlineBanknotes',
    badge: 'Primary',
  },
  {
    id: 'refunds',
    category: 'finance',
    label: 'Refunds',
    description: 'All refunds issued — invoice refunds and POS refunds',
    modules: '*',
    collections: ['accountTransactions', 'posOrders'],
    filters: ['dateRange', 'datePreset', 'currency'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateRefunds'],
    icon: 'HiOutlineArrowPath',
  },
  {
    id: 'supplier-payments',
    category: 'finance',
    label: 'Supplier Payments',
    description: 'Payments made to suppliers through account transactions',
    modules: '*',
    collections: ['accountTransactions', 'purchases', 'suppliers'],
    filters: ['dateRange', 'datePreset', 'currency', 'supplier'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateSupplierPayments'],
    drills: ['supplier-statement', 'purchase-summary'],
    icon: 'HiOutlineTruck',
  },
  {
    id: 'customer-payments',
    category: 'finance',
    label: 'Customer Payments',
    description: 'Payments received from customers — invoices paid, POS collections',
    modules: '*',
    collections: ['payments', 'accountTransactions', 'posOrders'],
    filters: ['dateRange', 'datePreset', 'currency', 'customer', 'paymentMethod'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateCustomerPayments'],
    drills: ['customer-ledger'],
    icon: 'HiOutlineUserGroup',
  },

  // ── SALES ──
  {
    id: 'invoice-sales',
    category: 'sales',
    label: 'Invoice Sales',
    description: 'All invoice-based sales with payment status and outstanding balances',
    modules: '*',
    collections: ['invoices', 'payments'],
    filters: ['dateRange', 'datePreset', 'currency', 'customer', 'status'],
    exports: ['csv', 'pdf', 'excel', 'print'],
    aggregations: ['aggregateInvoiceSales'],
    drills: ['sales-by-customer', 'sales-by-product'],
    icon: 'HiOutlineDocumentText',
    default: true,
  },
  {
    id: 'pos-sales',
    category: 'sales',
    label: 'Retail POS Sales',
    description: 'Front-till POS orders — cash, card, digital payments with shift tracking',
    modules: ['Retail / POS'],
    collections: ['posOrders'],
    filters: ['dateRange', 'datePreset', 'currency', 'staff', 'paymentMethod', 'location'],
    exports: ['csv', 'pdf', 'print', 'thermal'],
    aggregations: ['aggregatePosSales'],
    drills: ['sales-by-product', 'sales-by-staff', 'daily-sales'],
    icon: 'HiOutlineBuildingStorefront',
  },
  {
    id: 'daily-sales',
    category: 'sales',
    label: 'Daily Sales',
    description: 'Day-by-day sales totals with comparison to previous period',
    modules: '*',
    collections: ['posOrders', 'invoices', 'payments'],
    filters: ['dateRange', 'currency', 'location'],
    exports: ['csv', 'pdf', 'print', 'thermal'],
    aggregations: ['aggregateDailySales'],
    icon: 'HiOutlineCalendarDays',
  },
  {
    id: 'monthly-sales',
    category: 'sales',
    label: 'Monthly Sales',
    description: 'Month-by-month sales totals with trend and growth rate',
    modules: '*',
    collections: ['posOrders', 'invoices', 'payments'],
    filters: ['dateRange', 'currency'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateMonthlySales'],
    icon: 'HiOutlineChartBar',
  },
  {
    id: 'sales-by-product',
    category: 'sales',
    label: 'Sales by Product',
    description: 'Product-level sales quantity and revenue — top sellers and margin',
    modules: '*',
    collections: ['posOrders', 'inventoryTransactions'],
    filters: ['dateRange', 'datePreset', 'currency', 'product', 'category'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateSalesByProduct'],
    icon: 'HiOutlineCube',
  },
  {
    id: 'sales-by-customer',
    category: 'sales',
    label: 'Sales by Customer',
    description: 'Customer-level revenue, order count, and average order value',
    modules: '*',
    collections: ['posOrders', 'invoices', 'payments', 'customers'],
    filters: ['dateRange', 'datePreset', 'currency', 'customer'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateSalesByCustomer'],
    icon: 'HiOutlineUserGroup',
  },
  {
    id: 'sales-by-staff',
    category: 'sales',
    label: 'Sales by Staff',
    description: 'Staff/cashier sales performance — orders, revenue, items sold',
    modules: '*',
    collections: ['posOrders'],
    filters: ['dateRange', 'datePreset', 'currency', 'staff'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateSalesByStaff'],
    icon: 'HiOutlineUserGroup',
  },
  {
    id: 'sales-by-method',
    category: 'sales',
    label: 'Sales by Payment Method',
    description: 'Revenue split by Cash, Card, JazzCash, Easypaisa, Wallet etc.',
    modules: '*',
    collections: ['posOrders', 'payments', 'invoices'],
    filters: ['dateRange', 'datePreset', 'currency', 'paymentMethod'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateSalesByMethod'],
    icon: 'HiOutlineBanknotes',
  },

  // ── PURCHASES ──
  {
    id: 'purchase-summary',
    category: 'purchase',
    label: 'Purchase Summary',
    description: 'All purchase orders — total amounts, paid, due, and payment status',
    modules: '*',
    collections: ['purchases', 'suppliers'],
    filters: ['dateRange', 'datePreset', 'currency', 'supplier', 'status'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregatePurchaseSummary'],
    drills: ['supplier-statement', 'purchase-payments'],
    icon: 'HiOutlineClipboardDocumentList',
    default: true,
  },
  {
    id: 'purchase-payments',
    category: 'purchase',
    label: 'Purchase Payments',
    description: 'Payments recorded against purchase orders — payment method and date',
    modules: '*',
    collections: ['purchases', 'accountTransactions'],
    filters: ['dateRange', 'datePreset', 'currency', 'supplier'],
    exports: ['csv', 'print'],
    aggregations: ['aggregatePurchasePayments'],
    icon: 'HiOutlineCurrencyDollar',
  },
  {
    id: 'supplier-due',
    category: 'purchase',
    label: 'Supplier Due',
    description: 'Outstanding supplier balances — what you owe each supplier',
    modules: '*',
    collections: ['purchases', 'suppliers'],
    filters: ['currency', 'supplier'],
    exports: ['csv', 'print', 'pdf'],
    aggregations: ['aggregateSupplierDue'],
    drills: ['supplier-statement'],
    icon: 'HiOutlineExclamationTriangle',
  },
  {
    id: 'supplier-statement',
    category: 'purchase',
    label: 'Supplier Statement',
    description: 'Date-ordered debit/credit ledger for a single supplier',
    modules: '*',
    collections: ['purchases', 'accountTransactions', 'suppliers'],
    filters: ['supplier', 'dateRange'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateSupplierStatement'],
    icon: 'HiOutlineDocumentText',
  },
  {
    id: 'purchase-returns',
    category: 'purchase',
    label: 'Purchase Returns',
    description: 'Items returned to suppliers — quantities, values, and reasons',
    modules: '*',
    collections: ['purchases', 'inventoryTransactions'],
    filters: ['dateRange', 'datePreset', 'currency', 'supplier'],
    exports: ['csv', 'print'],
    aggregations: ['aggregatePurchaseReturns'],
    icon: 'HiOutlineArrowPath',
  },

  // ── INVENTORY ──
  {
    id: 'stock-summary',
    category: 'inventory',
    label: 'Stock Summary',
    description: 'Current stock levels for all products — quantity, value, and status',
    modules: '*',
    collections: ['products', 'inventoryTransactions'],
    filters: ['category', 'product'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateStockSummary'],
    drills: ['stock-movement', 'product-profitability'],
    icon: 'HiOutlineCircleStack',
    default: true,
  },
  {
    id: 'stock-movement',
    category: 'inventory',
    label: 'Stock Movement',
    description: 'All stock-in, stock-out, adjustments, and transfers with audit trail',
    modules: '*',
    collections: ['inventoryTransactions', 'products'],
    filters: ['dateRange', 'datePreset', 'type', 'product', 'category'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateStockMovement'],
    icon: 'HiOutlineArrowPath',
  },
  {
    id: 'low-stock',
    category: 'inventory',
    label: 'Low Stock',
    description: 'Products at or below minimum stock alert — needs reorder',
    modules: '*',
    collections: ['products'],
    filters: ['category', 'product'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateLowStock'],
    icon: 'HiOutlineExclamationTriangle',
  },
  {
    id: 'inventory-value',
    category: 'inventory',
    label: 'Inventory Value',
    description: 'Total inventory value at cost price and retail price',
    modules: '*',
    collections: ['products'],
    filters: ['category', 'currency'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateInventoryValue'],
    icon: 'HiOutlineBanknotes',
  },
  {
    id: 'product-profitability',
    category: 'inventory',
    label: 'Product Profitability',
    description: 'Per-product margin — cost vs selling price with profit and margin %',
    modules: '*',
    collections: ['products', 'inventoryTransactions', 'posOrders'],
    filters: ['dateRange', 'datePreset', 'currency', 'product', 'category'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateProductProfitability'],
    icon: 'HiOutlineArrowTrendingUp',
  },
  {
    id: 'sales-returns',
    category: 'inventory',
    label: 'Sales Returns (Inventory)',
    description: 'Items returned by customers — restored to stock, refunded',
    modules: '*',
    collections: ['inventoryTransactions', 'accountTransactions'],
    filters: ['dateRange', 'datePreset', 'product'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateSalesReturns'],
    icon: 'HiOutlineArrowPath',
  },

  // ── CUSTOMERS ──
  {
    id: 'customer-ledger',
    category: 'customer',
    label: 'Customer Ledger',
    description: 'Complete customer transaction history — invoices, payments, refunds, wallet due',
    modules: '*',
    collections: ['customers', 'invoices', 'payments', 'accountTransactions', 'posOrders'],
    filters: ['customer', 'dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateCustomerLedger'],
    icon: 'HiOutlineDocumentText',
    default: true,
  },
  {
    id: 'customer-balance',
    category: 'customer',
    label: 'Customer Balance',
    description: 'Outstanding invoice balances and wallet due per customer',
    modules: '*',
    collections: ['customers', 'invoices'],
    filters: ['customer'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateCustomerBalance'],
    icon: 'HiOutlineBanknotes',
  },
  {
    id: 'top-customers',
    category: 'customer',
    label: 'Top Customers',
    description: 'Highest-spending customers — lifetime value and order frequency',
    modules: '*',
    collections: ['customers', 'invoices', 'posOrders'],
    filters: ['dateRange', 'currency'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateTopCustomers'],
    icon: 'HiOutlineArrowTrendingUp',
  },
  {
    id: 'customer-activity',
    category: 'customer',
    label: 'Customer Activity',
    description: 'Recent customer interactions — invoices, payments, follow-ups',
    modules: '*',
    collections: ['customers', 'activityLogs', 'invoices'],
    filters: ['dateRange', 'customer'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateCustomerActivity'],
    icon: 'HiOutlineUserGroup',
  },

  // ── SUPPLIERS ──
  {
    id: 'supplier-ledger',
    category: 'supplier',
    label: 'Supplier Ledger',
    description: 'Complete supplier transaction history — purchases, payments, returns',
    modules: '*',
    collections: ['suppliers', 'purchases', 'accountTransactions'],
    filters: ['supplier', 'dateRange'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateSupplierLedger'],
    icon: 'HiOutlineDocumentText',
    default: true,
  },
  {
    id: 'supplier-balance-overview',
    category: 'supplier',
    label: 'Supplier Balance',
    description: 'All supplier balances — opening balance, purchases, payments, returns',
    modules: '*',
    collections: ['suppliers', 'purchases'],
    filters: ['supplier', 'currency'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateSupplierBalance'],
    icon: 'HiOutlineBanknotes',
  },
  {
    id: 'top-suppliers',
    category: 'supplier',
    label: 'Top Suppliers',
    description: 'Highest-volume suppliers — total purchases and payment history',
    modules: '*',
    collections: ['suppliers', 'purchases'],
    filters: ['dateRange', 'currency'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateTopSuppliers'],
    icon: 'HiOutlineArrowTrendingUp',
  },
  {
    id: 'supplier-activity',
    category: 'supplier',
    label: 'Supplier Activity',
    description: 'Recent supplier activity — orders, payments, returns',
    modules: '*',
    collections: ['suppliers', 'activityLogs', 'purchases'],
    filters: ['dateRange', 'supplier'],
    exports: ['csv', 'print'],
    aggregations: ['aggregateSupplierActivity'],
    icon: 'HiOutlineUserGroup',
  },

  // ── CRM ──
  {
    id: 'leads-report',
    category: 'crm',
    label: 'Leads',
    description: 'All leads with score, pipeline stage, and conversion tracking',
    modules: '*',
    collections: ['leads', 'pipelines'],
    filters: ['dateRange', 'datePreset', 'status'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateLeads'],
    drills: ['pipeline-report', 'conversion-report'],
    icon: 'HiOutlineChartBar',
    default: true,
  },
  {
    id: 'pipeline-report',
    category: 'crm',
    label: 'Pipeline',
    description: 'Deal pipeline — value by stage, weighted forecast, conversion rates',
    modules: '*',
    collections: ['leads', 'pipelines'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregatePipeline'],
    icon: 'HiOutlineChartPie',
  },
  {
    id: 'conversion-report',
    category: 'crm',
    label: 'Conversion',
    description: 'Lead-to-customer conversion rates and funnel analysis',
    modules: '*',
    collections: ['leads', 'customers'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateConversion'],
    icon: 'HiOutlineArrowTrendingUp',
  },
  {
    id: 'staff-performance',
    category: 'crm',
    label: 'Staff Performance',
    description: 'Team member activity — tasks completed, leads generated, sales made',
    modules: '*',
    collections: ['teamMembers', 'staff', 'activityLogs', 'tasks', 'posOrders'],
    filters: ['dateRange', 'datePreset', 'staff'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateStaffPerformance'],
    icon: 'HiOutlineUserGroup',
  },

  // ── SCHOOL ERP ──
  {
    id: 'fee-collection',
    category: 'school',
    label: 'Fee Collection',
    description: 'Fee invoices — collected amounts, due dates, and outstanding',
    modules: ['School ERP'],
    collections: ['invoices', 'payments'],
    filters: ['dateRange', 'datePreset', 'currency', 'status'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateFeeCollection'],
    drills: ['outstanding-fees'],
    icon: 'HiOutlineCurrencyDollar',
    default: true,
  },
  {
    id: 'outstanding-fees',
    category: 'school',
    label: 'Outstanding Fees',
    description: 'Unpaid and overdue fee invoices per student',
    modules: ['School ERP'],
    collections: ['invoices', 'customers'],
    filters: ['dateRange', 'customer', 'status'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateOutstandingFees'],
    icon: 'HiOutlineExclamationTriangle',
  },
  {
    id: 'attendance-report',
    category: 'school',
    label: 'Attendance',
    description: 'Student and staff attendance rates — present, absent, late',
    modules: ['School ERP'],
    collections: ['studentAttendance', 'staffAttendance'],
    filters: ['dateRange', 'datePreset', 'staff'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateAttendance'],
    icon: 'HiOutlineCheckCircle',
  },
  {
    id: 'student-summary',
    category: 'school',
    label: 'Student Summary',
    description: 'Student counts by class, status, and fee payment status',
    modules: ['School ERP'],
    collections: ['invoices', 'customers'],
    filters: ['dateRange', 'status'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateStudentSummary'],
    icon: 'HiOutlineUserGroup',
  },

  // ── TRANSPORT ──
  {
    id: 'trip-revenue',
    category: 'transport',
    label: 'Trip Revenue',
    description: 'Transport booking revenue — trips, collections, outstanding dues',
    modules: ['Transport'],
    collections: ['bookings', 'payments'],
    filters: ['dateRange', 'datePreset', 'currency', 'customer', 'vehicle'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateTripRevenue'],
    drills: ['vehicle-profit'],
    icon: 'HiOutlineTruck',
    default: true,
  },
  {
    id: 'vehicle-profit',
    category: 'transport',
    label: 'Vehicle Profit',
    description: 'Per-vehicle profit — revenue minus fuel, maintenance, driver cost',
    modules: ['Transport'],
    collections: ['bookings', 'payments', 'vehicles'],
    filters: ['dateRange', 'vehicle'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateVehicleProfit'],
    icon: 'HiOutlineArrowTrendingUp',
  },
  {
    id: 'fuel-report',
    category: 'transport',
    label: 'Fuel',
    description: 'Fuel consumption and cost per vehicle over time',
    modules: ['Transport'],
    collections: ['fuelRecords'],
    filters: ['dateRange', 'datePreset', 'vehicle', 'currency'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateFuel'],
    icon: 'HiOutlineFire',
  },
  {
    id: 'driver-performance',
    category: 'transport',
    label: 'Driver Performance',
    description: 'Driver metrics — trips completed, revenue, fuel efficiency',
    modules: ['Transport'],
    collections: ['bookings', 'payments', 'drivers'],
    filters: ['dateRange', 'staff'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateDriverPerformance'],
    icon: 'HiOutlineUserGroup',
  },

  // ── RESTAURANT ──
  {
    id: 'kot-report',
    category: 'restaurant',
    label: 'KOT',
    description: 'Kitchen Order Tickets — preparation times, status, items per KOT',
    modules: ['Restaurant POS'],
    collections: ['kotOrders'],
    filters: ['dateRange', 'datePreset', 'status', 'location'],
    exports: ['csv', 'pdf', 'print', 'thermal'],
    aggregations: ['aggregateKot'],
    icon: 'HiOutlineDocumentText',
    default: true,
  },
  {
    id: 'table-turnover',
    category: 'restaurant',
    label: 'Table Turnover',
    description: 'Table occupancy rates, average dining time, revenue per table',
    modules: ['Restaurant POS'],
    collections: ['bills', 'tables'],
    filters: ['dateRange', 'datePreset', 'location'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateTableTurnover'],
    icon: 'HiOutlineBuildingStorefront',
  },
  {
    id: 'waiter-performance',
    category: 'restaurant',
    label: 'Waiter Performance',
    description: 'Waiter sales, tables served, average bill value',
    modules: ['Restaurant POS'],
    collections: ['bills', 'staff'],
    filters: ['dateRange', 'datePreset', 'staff'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateWaiterPerformance'],
    icon: 'HiOutlineUserGroup',
  },
  {
    id: 'kitchen-summary',
    category: 'restaurant',
    label: 'Kitchen Summary',
    description: 'Kitchen output — items prepared, average prep time, waste tracking',
    modules: ['Restaurant POS'],
    collections: ['kotOrders', 'inventoryTransactions'],
    filters: ['dateRange', 'datePreset', 'category'],
    exports: ['csv', 'pdf', 'print'],
    aggregations: ['aggregateKitchenSummary'],
    icon: 'HiOutlineFire',
  },

  // ── BUSINESS OVERVIEW ──
  {
    id: 'executive-dashboard',
    category: 'overview',
    label: 'Executive Dashboard',
    description: 'Top-level KPIs — revenue, expenses, profit, cash, bank, wallet at a glance',
    modules: '*',
    collections: ['invoices', 'payments', 'expenses', 'accountTransactions', 'posOrders'],
    filters: ['dateRange', 'datePreset', 'currency'],
    exports: ['pdf', 'print'],
    aggregations: ['aggregateExecutiveDashboard'],
    drills: ['profit-loss', 'income', 'expense-detail'],
    icon: 'HiOutlineChartPie',
    default: true,
  },
  {
    id: 'daily-closing',
    category: 'overview',
    label: 'Daily Closing',
    description: 'End-of-day settlement — sales, refunds, cash in drawer, bank deposits',
    modules: '*',
    collections: ['posOrders', 'invoices', 'payments', 'expenses', 'accountTransactions'],
    filters: ['datePreset', 'currency', 'location'],
    exports: ['thermal', 'pdf', 'print'],
    aggregations: ['aggregateDailyClosing'],
    icon: 'HiOutlineCalendarDays',
  },
  {
    id: 'monthly-business-summary',
    category: 'overview',
    label: 'Monthly Business Summary',
    description: 'All-in-one monthly view — finance, sales, purchases, expenses, and KPIs',
    modules: '*',
    collections: ['invoices', 'payments', 'expenses', 'accountTransactions', 'purchases', 'posOrders'],
    filters: ['datePreset', 'currency'],
    exports: ['pdf', 'print', 'excel'],
    aggregations: ['aggregateMonthlyBusinessSummary'],
    icon: 'HiOutlineChartBar',
  },
  {
    id: 'multi-module-comparison',
    category: 'overview',
    label: 'Multi-module Comparison',
    description: 'Compare revenue and expenses across business types / modules',
    modules: '*',
    collections: ['invoices', 'payments', 'expenses', 'accountTransactions', 'posOrders'],
    filters: ['dateRange', 'datePreset', 'currency'],
    exports: ['pdf', 'excel'],
    aggregations: ['aggregateMultiModuleComparison'],
    icon: 'HiOutlineCalculator',
  },

  // ── LOYALTY & REWARDS ──
  {
    id: 'loyalty-summary',
    category: 'loyalty',
    label: 'Loyalty Summary',
    description: 'Total members, active/dormant breakdown, points issued/redeemed, tier distribution',
    modules: '*',
    collections: ['loyaltyAccounts', 'loyaltyPointsLedger', 'loyaltyRedemptions'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel', 'print'],
    icon: 'HiOutlineStar',
    default: true,
  },
  {
    id: 'points-ledger',
    category: 'loyalty',
    label: 'Points Ledger',
    description: 'All point transactions — earned, redeemed, bonus, referral, birthday, reversals',
    modules: '*',
    collections: ['loyaltyPointsLedger'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineSparkles',
  },
  {
    id: 'reward-redemption',
    category: 'loyalty',
    label: 'Reward Redemption',
    description: 'All reward redemptions with member, reward name, points cost, and status',
    modules: '*',
    collections: ['loyaltyRedemptions', 'loyaltyRewards'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineGift',
  },
  {
    id: 'coupon-usage',
    category: 'loyalty',
    label: 'Coupon Usage',
    description: 'Coupon generation, usage count, expiry tracking, and discount totals',
    modules: '*',
    collections: ['loyaltyCoupons'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineTicket',
  },
  {
    id: 'membership-growth',
    category: 'loyalty',
    label: 'Membership Growth',
    description: 'New enrollments over time, tier upgrades, and member retention',
    modules: '*',
    collections: ['loyaltyAccounts'],
    filters: ['dateRange', 'datePreset'],
    exports: ['pdf', 'print'],
    icon: 'HiOutlineUserGroup',
  },
  {
    id: 'referral-report',
    category: 'loyalty',
    label: 'Referral Report',
    description: 'Referral invitations sent, conversion rate, and referral earnings',
    modules: '*',
    collections: ['loyaltyReferrals'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineUserGroup',
  },
  {
    id: 'customer-lifetime-value',
    category: 'loyalty',
    label: 'Customer Lifetime Value',
    description: 'Member LTV, repeat rate, average basket, visits frequency, and segment analysis',
    modules: '*',
    collections: ['loyaltyAccounts', 'orders', 'posOrders'],
    filters: ['dateRange', 'datePreset'],
    exports: ['pdf', 'excel'],
    icon: 'HiOutlineCurrencyDollar',
  },
  {
    id: 'wallet-transactions',
    category: 'loyalty',
    label: 'Wallet Transactions',
    description: 'Gift balance, store credit, refund credit, and reward balance movements',
    modules: '*',
    collections: ['loyaltyWallet'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineBanknotes',
  },

  // ── DELIVERY ──
  {
    id: 'delivery-summary',
    category: 'loyalty',
    label: 'Delivery Summary',
    description: 'Total deliveries, success rate, avg delivery time, revenue, and channel breakdowns',
    modules: '*',
    collections: ['deliveryOrders', 'deliveryDrivers'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel', 'print'],
    icon: 'HiOutlineTruck',
    default: true,
  },
  {
    id: 'driver-earnings',
    category: 'loyalty',
    label: 'Driver Earnings',
    description: 'Driver commissions, cash collected, tips, and settlement summaries per driver',
    modules: '*',
    collections: ['deliveryOrders', 'deliveryDrivers', 'deliverySettlements'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineCurrencyDollar',
  },
  {
    id: 'zone-analytics',
    category: 'loyalty',
    label: 'Zone Analytics',
    description: 'Orders, revenue, delivery fees, and success rates per delivery zone',
    modules: '*',
    collections: ['deliveryOrders', 'deliveryZones'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineMapPin',
  },
  {
    id: 'online-orders',
    category: 'loyalty',
    label: 'Online Orders',
    description: 'All online orders including pickup, delivery, dine-in preorder, and scheduled',
    modules: '*',
    collections: ['onlineOrders', 'deliveryOrders'],
    filters: ['dateRange', 'datePreset', 'status'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineShoppingBag',
  },
  {
    id: 'late-delivery',
    category: 'loyalty',
    label: 'Late Delivery Report',
    description: 'Orders delivered past estimated ETA with delay duration and driver details',
    modules: '*',
    collections: ['deliveryOrders'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineClock',
  },
  {
    id: 'cancelled-deliveries',
    category: 'loyalty',
    label: 'Cancelled Deliveries',
    description: 'Failed, cancelled, returned, and refunded deliveries with reasons',
    modules: '*',
    collections: ['deliveryOrders'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineXCircle',
  },
  {
    id: 'settlement-report',
    category: 'loyalty',
    label: 'Settlement Report',
    description: 'Driver settlements, cash collected, commissions, and payout summaries',
    modules: '*',
    collections: ['deliverySettlements', 'deliveryOrders', 'deliveryDrivers'],
    filters: ['dateRange', 'datePreset'],
    exports: ['csv', 'pdf', 'excel'],
    icon: 'HiOutlineBanknotes',
  },
]

// ── Helper lookups ──

/** Get all unique collection names required by a set of report ids */
export function collectionsForReports(reportIds = []) {
  const set = new Set()
  for (const id of reportIds) {
    const report = reportById(id)
    if (report) report.collections.forEach((c) => set.add(c))
  }
  return Array.from(set)
}

/** Find a report by id */
export function reportById(id) {
  return REPORT_CATALOG.find((r) => r.id === id) || null
}

/** Get all reports for a category */
export function reportsByCategory(category) {
  return REPORT_CATALOG.filter((r) => r.category === category)
}

/** Get all reports available for a given businessType */
export function reportsForModule(businessType) {
  const normalized = String(businessType || '').trim()
  return REPORT_CATALOG.filter(
    (r) => r.modules === '*' || r.modules.includes(normalized),
  )
}

/** Get the default report id for a category */
export function defaultReportForCategory(category) {
  const reports = reportsByCategory(category)
  return (reports.find((r) => r.default) || reports[0])?.id || null
}

/** Get all categories that have reports for a given businessType */
export function categoriesForModule(businessType) {
  const normalized = String(businessType || '').trim()
  const used = new Set()
  REPORT_CATALOG.forEach((r) => {
    if (r.modules === '*' || r.modules.includes(normalized)) {
      used.add(r.category)
    }
  })
  return Array.from(used)
    .map((key) => REPORT_CATEGORIES[key])
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
}
