export const maintenanceTargets = [
  { value: 'website', label: 'Website' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'module', label: 'Specific Module' },
]

export const maintenanceModules = [
  { value: 'all', label: 'All Workspace Modules' },
  { value: 'restaurant', label: 'Restaurant POS' },
  { value: 'crm', label: 'CRM' },
  { value: 'transport', label: 'Transport ERP' },
  { value: 'school', label: 'School ERP' },
  { value: 'property', label: 'Property ERP' },
  { value: 'retail', label: 'Retail / POS' },
  { value: 'whatsapp', label: 'WhatsApp CRM' },
]

export const defaultMaintenanceConfig = {
  enabled: false,
  target: 'workspace',
  module: 'all',
  noticeEnabled: true,
  noticeStartsAt: '',
  startsAt: '',
  endsAt: '',
  title: 'Scheduled maintenance',
  noticeMessage: 'Scheduled maintenance is planned for this service. Some features may be temporarily unavailable during the maintenance window.',
  activeMessage: 'This service is temporarily unavailable while we complete scheduled maintenance. Please check back after the maintenance window ends.',
}

export function normalizeMaintenanceConfig(config = {}) {
  return {
    ...defaultMaintenanceConfig,
    ...(config || {}),
    enabled: config?.enabled === true,
    noticeEnabled: config?.noticeEnabled !== false,
  }
}

function parseDateTime(value) {
  if (!value) return null
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : new Date(value)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function normalizeKey(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return ''
  if (text.includes('restaurant')) return 'restaurant'
  if (text.includes('transport') || text.includes('fleet') || text.includes('rental')) return 'transport'
  if (text.includes('school')) return 'school'
  if (text.includes('property')) return 'property'
  if (text.includes('retail') || text.includes('pos')) return 'retail'
  if (text.includes('whatsapp')) return 'whatsapp'
  if (text.includes('crm') || text.includes('sales')) return 'crm'
  return text.replace(/[^a-z0-9]+/g, '-')
}

function targetMatches(config, context = {}) {
  const target = String(config.target || 'workspace')
  if (target === 'website') return context.surface === 'website'
  if (target === 'workspace') return context.surface === 'workspace'
  if (target !== 'module' || context.surface !== 'workspace') return false
  if (!config.module || config.module === 'all') return true
  return normalizeKey(config.module) === normalizeKey(context.module)
}

export function maintenanceWindowLabel(config = {}) {
  const start = parseDateTime(config.startsAt)
  const end = parseDateTime(config.endsAt)
  const formatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  if (start && end) return `${formatter.format(start)} - ${formatter.format(end)}`
  if (start) return `from ${formatter.format(start)}`
  if (end) return `until ${formatter.format(end)}`
  return ''
}

export function getMaintenanceState(rawConfig = {}, context = {}, nowValue = new Date()) {
  const config = normalizeMaintenanceConfig(rawConfig)
  if (!config.enabled || !targetMatches(config, context)) {
    return { active: false, notice: false, config, windowLabel: '' }
  }

  const now = parseDateTime(nowValue) || new Date()
  const noticeStart = parseDateTime(config.noticeStartsAt)
  const start = parseDateTime(config.startsAt)
  const end = parseDateTime(config.endsAt)
  const afterNoticeStart = !noticeStart || now.getTime() >= noticeStart.getTime()
  const beforeStart = start ? now.getTime() < start.getTime() : false
  const afterStart = !start || now.getTime() >= start.getTime()
  const beforeEnd = !end || now.getTime() <= end.getTime()
  const active = afterStart && beforeEnd
  const notice = config.noticeEnabled && afterNoticeStart && beforeStart

  return {
    active,
    notice,
    config,
    windowLabel: maintenanceWindowLabel(config),
  }
}
