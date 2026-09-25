import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMaintenanceState, maintenanceModuleKey, maintenanceModules } from '../src/lib/maintenanceMode.js'
import { MODULE_REGISTRY } from '../src/lib/moduleRegistry.js'

// The app sends normalizeBusinessType(businessType) as context.module
// (src/crm/layouts/DashboardLayout.jsx), i.e. always a registry type.
const workspace = (module) => ({ surface: 'workspace', module })
const moduleMaintenance = (module) => ({ enabled: true, target: 'module', module, startsAt: '', endsAt: '' })

test('every existing stored key round-trips unchanged', () => {
  for (const key of ['crm', 'retail', 'school', 'property', 'restaurant', 'transport', 'whatsapp']) {
    assert.equal(maintenanceModuleKey(key), key, key)
  }
})

test('app contexts map to the same keys as before, PharmaFlow to pharmaflow', () => {
  // Expected values captured from the previous normalizeKey().
  const expected = {
    'General CRM': 'crm',
    'Retail / POS': 'retail',
    'School ERP': 'school',
    'Property ERP': 'property',
    'Restaurant POS': 'restaurant',
    'Transport / Rental': 'transport',
    'WhatsApp CRM': 'whatsapp',
    PharmaFlow: 'pharmaflow',
  }
  for (const [type, key] of Object.entries(expected)) assert.equal(maintenanceModuleKey(type), key, type)
  assert.equal(maintenanceModuleKey('Medical Store POS'), 'pharmaflow')
})

test('unrecognised values keep the previous word matching', () => {
  assert.equal(maintenanceModuleKey('rental'), 'transport')
  assert.equal(maintenanceModuleKey('sales'), 'crm')
  assert.equal(maintenanceModuleKey('something else'), 'something-else')
  assert.equal(maintenanceModuleKey(''), '')
})

test('options: all + one per registry module, stored keys preserved, registry labels', () => {
  assert.deepEqual(maintenanceModules[0], { value: 'all', label: 'All Workspace Modules' })
  const byValue = Object.fromEntries(maintenanceModules.map((option) => [option.value, option.label]))
  assert.deepEqual(byValue, {
    all: 'All Workspace Modules',
    crm: 'Nexora Sales Hub',
    retail: 'Retail / POS',
    school: 'School ERP',
    property: 'Property ERP',
    restaurant: 'Restaurant POS',
    transport: 'Transport / Rental',
    whatsapp: 'WhatsApp CRM',
    pharmaflow: 'PharmaFlow',
  })
  assert.equal(maintenanceModules.length, MODULE_REGISTRY.length + 1)
  assert.equal(new Set(maintenanceModules.map((option) => option.value)).size, maintenanceModules.length)
})

test('PharmaFlow client is blocked by pharmaflow maintenance, not by crm maintenance', () => {
  assert.equal(getMaintenanceState(moduleMaintenance('pharmaflow'), workspace('PharmaFlow')).active, true)
  assert.equal(getMaintenanceState(moduleMaintenance('crm'), workspace('PharmaFlow')).active, false)
  assert.equal(getMaintenanceState(moduleMaintenance('retail'), workspace('PharmaFlow')).active, false)
  assert.equal(getMaintenanceState(moduleMaintenance('pharmaflow'), workspace('General CRM')).active, false)
  assert.equal(getMaintenanceState(moduleMaintenance('crm'), workspace('General CRM')).active, true)
  assert.equal(getMaintenanceState(moduleMaintenance('all'), workspace('PharmaFlow')).active, true)
})

test('existing module maintenance settings still reach the same clients', () => {
  const pairs = [['restaurant', 'Restaurant POS'], ['transport', 'Transport / Rental'], ['school', 'School ERP'], ['property', 'Property ERP'], ['retail', 'Retail / POS'], ['whatsapp', 'WhatsApp CRM']]
  for (const [key, type] of pairs) {
    assert.equal(getMaintenanceState(moduleMaintenance(key), workspace(type)).active, true, key)
    assert.equal(getMaintenanceState(moduleMaintenance(key), workspace('PharmaFlow')).active, false, key)
  }
})
