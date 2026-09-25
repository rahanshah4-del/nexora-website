import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODULE_OPTIONS, moduleFromValue } from '../src/lib/marketingModules.js'

test('business types map to the right segment', () => {
  const expected = {
    'Retail / POS': 'retail',
    'Restaurant POS': 'restaurant',
    'Property ERP': 'property',
    'School ERP': 'school',
    PharmaFlow: 'pharmacy',
    'Medical Store POS': 'pharmacy',
    'WhatsApp CRM': 'whatsapp',
    'General CRM': 'crm',
    'Transport / Rental': 'transport',
    'Restaurant / POS': 'restaurant',
    'Transport / Logistics': 'transport',
    'Retail / Inventory': 'retail',
  }
  for (const [value, key] of Object.entries(expected)) assert.equal(moduleFromValue(value), key, value)
})

test('previously stored moduleInterest keys are unchanged', () => {
  for (const key of ['crm', 'restaurant', 'transport', 'school', 'property']) assert.equal(moduleFromValue(key), key)
})

test('new keys round-trip', () => {
  for (const key of ['retail', 'whatsapp', 'pharmacy']) assert.equal(moduleFromValue(key), key)
})

test('word fallback: pos does not swallow retail, erp does not swallow property or Enterprise', () => {
  assert.equal(moduleFromValue('retail pos terminal'), 'retail')
  assert.equal(moduleFromValue('property erp suite'), 'property')
  assert.equal(moduleFromValue('POS software'), 'restaurant')
  assert.equal(moduleFromValue('ERP'), 'school')
  assert.equal(moduleFromValue('Enterprise'), '')
  assert.equal(moduleFromValue('Custom Enterprise'), 'crm')
  assert.equal(moduleFromValue('real estate agency'), 'property')
  assert.equal(moduleFromValue('sales team'), 'crm')
  assert.equal(moduleFromValue('random'), '')
  assert.equal(moduleFromValue(''), '')
  assert.equal(moduleFromValue(undefined), '')
})

test('8 module options plus All, registry labels, unique keys', () => {
  assert.deepEqual(MODULE_OPTIONS, [
    { value: 'all', label: 'All' },
    { value: 'crm', label: 'Nexora Sales Hub' },
    { value: 'retail', label: 'Retail / POS' },
    { value: 'school', label: 'School ERP' },
    { value: 'property', label: 'Property ERP' },
    { value: 'restaurant', label: 'Restaurant POS' },
    { value: 'transport', label: 'Transport / Rental' },
    { value: 'whatsapp', label: 'WhatsApp CRM' },
    { value: 'pharmacy', label: 'PharmaFlow' },
  ])
})

test('Cloud Function copy classifies every value exactly like the site copy', async () => {
  const server = await import('../functions/marketingModules.js')
  const { MODULE_REGISTRY } = await import('../src/lib/moduleRegistry.js')
  const values = [
    ...MODULE_REGISTRY.flatMap((module) => [module.type, module.id, module.label, ...module.legacyTypes, ...module.aliases]),
    ...MODULE_REGISTRY.flatMap((module) => [module.type.toUpperCase(), ` ${module.label} `]),
    'crm', 'restaurant', 'transport', 'school', 'property', 'retail', 'whatsapp', 'pharmacy', 'all',
    'retail pos terminal', 'property erp suite', 'POS software', 'ERP', 'Enterprise', 'Custom Enterprise', 'Basic', 'Standard',
    'real estate agency', 'sales team', 'kitchen', 'medical store', 'PharmaFlow Pro', 'random', '', null, undefined, 42,
  ]
  for (const value of values) assert.equal(server.moduleFromValue(value), moduleFromValue(value), JSON.stringify(value))
  assert.deepEqual([...server.MARKETING_MODULE_KEYS].sort(), MODULE_OPTIONS.map((option) => option.value).sort())
})
