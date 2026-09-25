import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  UNRECOGNISED_MODULE_KEY,
  adminModuleLabel,
  announcementModuleOptions,
  announcementTargetsModule,
  buildModuleBreakdown,
  businessTypeForWorkspaceId,
  resolveAdminModule,
} from '../src/pages/admin/controlCentreModules.js'
import { MODULE_REGISTRY } from '../src/lib/moduleRegistry.js'

const ALL_TYPES = ['General CRM', 'Retail / POS', 'School ERP', 'Property ERP', 'Restaurant POS', 'Transport / Rental', 'WhatsApp CRM', 'PharmaFlow']

const rowFor = (rows, type) => rows.find((row) => row.type === type)

test('breakdown groups PharmaFlow and Medical Store POS into one PharmaFlow row', () => {
  const rows = buildModuleBreakdown(['PharmaFlow', 'Medical Store POS', 'General CRM'])
  assert.equal(rowFor(rows, 'PharmaFlow').value, 2)
  assert.equal(rowFor(rows, 'PharmaFlow').name, 'PharmaFlow')
  assert.equal(rowFor(rows, 'General CRM').value, 1)
  assert.equal(rows.filter((row) => row.name === 'Nexora Sales Hub').length, 1)
})

test('breakdown has one row per registry module with unique keys and registry colours', () => {
  const rows = buildModuleBreakdown([])
  assert.deepEqual(rows.map((row) => row.type), ALL_TYPES)
  assert.equal(new Set(rows.map((row) => row.key)).size, 8)
  assert.ok(rows.every((row) => row.value === 0))
  for (const module of MODULE_REGISTRY) assert.equal(rowFor(rows, module.type).color, module.color)
})

test('General CRM alone lands in Nexora Sales Hub; legacy aliases resolve to their module', () => {
  const rows = buildModuleBreakdown(['General CRM', 'Restaurant / POS', 'restaurant', 'Transport / Logistics', 'Inventory / Pharma'])
  assert.equal(rowFor(rows, 'General CRM').value, 1)
  assert.equal(rowFor(rows, 'Restaurant POS').value, 2)
  assert.equal(rowFor(rows, 'Transport / Rental').value, 1)
  assert.equal(rowFor(rows, 'Retail / POS').value, 1)
  assert.equal(rows.some((row) => row.key === UNRECOGNISED_MODULE_KEY), false)
})

test('unrecognised values get a single Unrecognised row with their raw values', () => {
  const rows = buildModuleBreakdown(['PharmaFlow', 'Mystery', '', 'Mystery', null])
  assert.equal(rows.length, 9)
  const unrecognised = rows.find((row) => row.key === UNRECOGNISED_MODULE_KEY)
  assert.equal(unrecognised.value, 4)
  assert.deepEqual(unrecognised.rawValues, [{ raw: 'Mystery', count: 2 }, { raw: '(not set)', count: 2 }])
  assert.equal(rowFor(rows, 'General CRM').value, 0)
})

test('labels use the registry: PharmaFlow clients show PharmaFlow', () => {
  assert.equal(adminModuleLabel('PharmaFlow'), 'PharmaFlow')
  assert.equal(adminModuleLabel('Medical Store POS'), 'PharmaFlow')
  assert.equal(adminModuleLabel('General CRM'), 'Nexora Sales Hub')
  assert.equal(adminModuleLabel('Transport / Rental'), 'Transport / Rental')
  assert.equal(adminModuleLabel(''), '-')
  assert.equal(adminModuleLabel(undefined), '-')
  // Unrecognised values show the module the app would run (app fallback).
  assert.equal(resolveAdminModule('Mystery').recognised, false)
  assert.equal(adminModuleLabel('Mystery'), 'Nexora Sales Hub')
})

test('Nexora Sales Hub announcements exclude PharmaFlow clients; PharmaFlow can be targeted alone', () => {
  assert.equal(announcementTargetsModule('General CRM', 'PharmaFlow'), false)
  assert.equal(announcementTargetsModule('General CRM', 'Medical Store POS'), false)
  assert.equal(announcementTargetsModule('General CRM', 'General CRM'), true)
  assert.equal(announcementTargetsModule('General CRM', 'Software Agency'), true)
  assert.equal(announcementTargetsModule('PharmaFlow', 'PharmaFlow'), true)
  assert.equal(announcementTargetsModule('PharmaFlow', 'Medical Store POS'), true)
  assert.equal(announcementTargetsModule('PharmaFlow', 'General CRM'), false)
  // Previously stored targets keep matching their module.
  assert.equal(announcementTargetsModule('Restaurant POS', 'Restaurant / POS'), true)
  assert.equal(announcementTargetsModule('Transport / Rental', 'Transport / Rental'), true)
  assert.equal(announcementTargetsModule('School ERP', 'Retail / POS'), false)
})

test('announcement dropdown offers all 8 modules with registry labels and existing stored values', () => {
  const options = announcementModuleOptions()
  assert.deepEqual(options.map((option) => option.value), ALL_TYPES)
  assert.equal(options.find((option) => option.value === 'PharmaFlow').label, 'PharmaFlow')
  assert.equal(options.find((option) => option.value === 'General CRM').label, 'Nexora Sales Hub')
})

test('System Health workspace-id map includes medical-store-pos and the existing ids', () => {
  assert.equal(businessTypeForWorkspaceId('medical-store-pos'), 'PharmaFlow')
  assert.equal(businessTypeForWorkspaceId('crm'), 'General CRM')
  assert.equal(businessTypeForWorkspaceId('general-crm'), 'General CRM')
  assert.equal(businessTypeForWorkspaceId('transport-rental'), 'Transport / Rental')
  assert.equal(businessTypeForWorkspaceId('restaurant-pos'), 'Restaurant POS')
  assert.equal(businessTypeForWorkspaceId('whatsapp-crm'), 'WhatsApp CRM')
  assert.equal(businessTypeForWorkspaceId(''), '')
})

test('filterByModule: PharmaFlow and Medical Store POS both pass the PharmaFlow filter', async () => {
  const { filterByModule, moduleKeyForValue } = await import('../src/pages/admin/controlCentreModules.js')
  const rows = [
    { id: 'a', businessType: 'PharmaFlow' },
    { id: 'b', businessType: 'Medical Store POS' },
    { id: 'c', businessType: 'General CRM' },
    { id: 'd', businessType: 'Restaurant / POS' },
    { id: 'e', businessType: 'Mystery' },
    { id: 'f' },
  ]
  const key = (row) => moduleKeyForValue(row.businessType)
  const ids = (list) => list.map((row) => row.id)
  assert.deepEqual(ids(filterByModule(rows, 'PharmaFlow', key)), ['a', 'b'])
  assert.deepEqual(ids(filterByModule(rows, 'General CRM', key)), ['c'])
  assert.deepEqual(ids(filterByModule(rows, 'Restaurant POS', key)), ['d'])
  assert.deepEqual(ids(filterByModule(rows, UNRECOGNISED_MODULE_KEY, key)), ['e', 'f'])
  assert.deepEqual(ids(filterByModule(rows, 'all', key)), ['a', 'b', 'c', 'd', 'e', 'f'])
  assert.deepEqual(ids(filterByModule(rows, '', key)), ['a', 'b', 'c', 'd', 'e', 'f'])
})

test('client module filter keys match the chart grouping', async () => {
  const { moduleKeyForValue } = await import('../src/pages/admin/controlCentreModules.js')
  const values = ['PharmaFlow', 'Medical Store POS', 'General CRM', 'Restaurant / POS', 'Mystery', '']
  const rows = buildModuleBreakdown(values)
  for (const row of rows) {
    const count = values.filter((value) => moduleKeyForValue(value) === row.key).length
    assert.equal(count, row.value, row.key)
  }
})

test('moduleForRow: own fields first, then workspace, else null', async () => {
  const { moduleForRow } = await import('../src/pages/admin/controlCentreModules.js')
  const workspacesById = new Map([
    ['ws-pharma', { id: 'ws-pharma', businessType: 'Medical Store POS' }],
    ['ws-crm', { id: 'ws-crm', primaryBusinessType: 'General CRM', businessType: 'PharmaFlow' }],
    ['ws-junk', { id: 'ws-junk', businessType: 'Mystery' }],
  ])
  assert.equal(moduleForRow({ businessType: 'School ERP', workspaceId: 'ws-pharma' }, workspacesById).type, 'School ERP')
  const pharma = moduleForRow({ workspaceId: 'ws-pharma', plan: 'Standard' }, workspacesById)
  assert.deepEqual(pharma, { type: 'PharmaFlow', label: 'PharmaFlow', color: '#059669' })
  assert.equal(moduleForRow({ userId: 'ws-crm' }, workspacesById).type, 'General CRM')
  assert.equal(moduleForRow({ workspaceId: 'unknown-ws' }, workspacesById), null)
  assert.equal(moduleForRow({ workspaceId: 'ws-junk' }, workspacesById), null)
  assert.equal(moduleForRow({}, { 'ws-pharma': { businessType: 'PharmaFlow' } }), null)
  assert.equal(moduleForRow({ workspaceId: 'ws-pharma' }, { 'ws-pharma': { businessType: 'PharmaFlow' } }).label, 'PharmaFlow')
})

test('module filter options: All modules, 8 registry modules in chart order, Unrecognised only when asked', async () => {
  const { moduleFilterOptions } = await import('../src/pages/admin/controlCentreModules.js')
  const base = moduleFilterOptions()
  assert.deepEqual(base.map((option) => option.value), ['all', ...ALL_TYPES])
  assert.equal(base[0].label, 'All modules')
  assert.deepEqual(base.slice(1).map((option) => option.label), buildModuleBreakdown([]).map((row) => row.name))
  assert.equal(moduleFilterOptions({ includeUnrecognised: true }).at(-1).value, UNRECOGNISED_MODULE_KEY)
})
