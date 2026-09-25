import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_ALIASES,
  MODULE_REGISTRY,
  getModule,
  listModules,
  moduleLabel,
  normalizeBusinessType as registryNormalize,
} from '../src/lib/moduleRegistry.js'
import {
  businessTypeAliases,
  businessTypes,
  businessWorkspaceCatalog,
  labelForBusinessType,
  normalizeBusinessType,
} from '../src/crm/data/moduleAccess.js'
import { maintenanceModules } from '../src/lib/maintenanceMode.js'

// Captured from src/crm/data/moduleAccess.js BEFORE it was refactored to read
// from the shared registry. These must never change without an intentional,
// reviewed behaviour change.
const EXPECTED_BUSINESS_TYPES = ['General CRM', 'Retail / POS', 'School ERP', 'Property ERP', 'Restaurant POS', 'Transport / Rental', 'WhatsApp CRM', 'PharmaFlow']

const EXPECTED_ALIASES = {
  'General Business': 'General CRM',
  'Restaurant / POS': 'Restaurant POS',
  'Restaurant / Canteen': 'Restaurant POS',
  'Retail / Inventory': 'Retail / POS',
  'Inventory / Pharma': 'Retail / POS',
  'Healthcare / Hospital': 'General CRM',
  'Transport / Logistics': 'Transport / Rental',
  'Software Agency': 'General CRM',
  'Custom Enterprise': 'General CRM',
  'Medical Store POS': 'PharmaFlow',
}

// [input, normalizeBusinessType(input)] — includes known quirks kept on purpose:
// 'PHARMAFLOW'/'pharmaflow' -> Retail / POS, 'rental'/'transport-rental' -> Property ERP.
const EXPECTED_NORMALIZED = [
  ["General Business", "General CRM"],
  ["Restaurant / POS", "Restaurant POS"],
  ["Restaurant / Canteen", "Restaurant POS"],
  ["Retail / Inventory", "Retail / POS"],
  ["Inventory / Pharma", "Retail / POS"],
  ["Healthcare / Hospital", "General CRM"],
  ["Transport / Logistics", "Transport / Rental"],
  ["Software Agency", "General CRM"],
  ["Custom Enterprise", "General CRM"],
  ["Medical Store POS", "PharmaFlow"],
  ["", "General CRM"],
  [null, "General CRM"],
  [undefined, "General CRM"],
  ["medical store", "PharmaFlow"],
  ["Pharmacy POS", "PharmaFlow"],
  ["PHARMAFLOW", "Retail / POS"],
  [" Restaurant / POS ", "Restaurant POS"],
  ["random text", "General CRM"],
  ["crm", "General CRM"],
  ["restaurant", "Restaurant POS"],
  ["retail", "Retail / POS"],
  ["pos", "Retail / POS"],
  ["school", "School ERP"],
  ["student", "School ERP"],
  ["parent", "School ERP"],
  ["property", "Property ERP"],
  ["tenant", "Property ERP"],
  ["rent", "Property ERP"],
  ["rental", "Property ERP"],
  ["whatsapp", "WhatsApp CRM"],
  ["canteen", "Restaurant POS"],
  ["kot", "Restaurant POS"],
  ["kitchen", "Restaurant POS"],
  ["transport", "Transport / Rental"],
  ["fleet", "Transport / Rental"],
  ["medical", "PharmaFlow"],
  ["pharmacy", "PharmaFlow"],
  ["medicine", "PharmaFlow"],
  ["pharma", "Retail / POS"],
  ["pharmaflow", "Retail / POS"],
  ["inventory", "Retail / POS"],
  ["general-crm", "General CRM"],
  ["retail-pos", "Retail / POS"],
  ["medical-store-pos", "PharmaFlow"],
  ["school-erp", "School ERP"],
  ["property-erp", "Property ERP"],
  ["restaurant-pos", "Restaurant POS"],
  ["transport-rental", "Property ERP"],
  ["whatsapp-crm", "WhatsApp CRM"],
  ["Sales Hub", "General CRM"],
  ["Nexora Sales Hub", "General CRM"],
  ["Pharmacy", "PharmaFlow"],
  ["Retail POS", "Retail / POS"],
  ["Transport", "Transport / Rental"],
  ["School", "School ERP"],
  ["Property ERP ", "Property ERP"],
  ["restaurant pos", "Restaurant POS"],
  [0, "General CRM"],
  [123, "General CRM"],
  [true, "General CRM"],
]

const EXPECTED_LABELS = {
  'General CRM': 'Nexora Sales Hub',
  'Retail / POS': 'Retail / POS',
  'School ERP': 'School ERP',
  'Property ERP': 'Property ERP',
  'Restaurant POS': 'Restaurant POS',
  'Transport / Rental': 'Transport / Rental',
  'WhatsApp CRM': 'WhatsApp CRM',
  PharmaFlow: 'PharmaFlow',
}

test('moduleAccess.businessTypes is unchanged', () => {
  assert.deepEqual(businessTypes, EXPECTED_BUSINESS_TYPES)
  assert.equal(Object.isFrozen(businessTypes), false)
})

test('moduleAccess.businessTypeAliases is unchanged', () => {
  assert.deepEqual(businessTypeAliases, EXPECTED_ALIASES)
})

test('normalizeBusinessType returns the pre-refactor result for every canonical type', () => {
  for (const type of EXPECTED_BUSINESS_TYPES) assert.equal(normalizeBusinessType(type), type, type)
})

test('normalizeBusinessType returns the pre-refactor result for every alias key and value', () => {
  for (const [alias, type] of Object.entries(EXPECTED_ALIASES)) {
    assert.equal(normalizeBusinessType(alias), type, alias)
    assert.equal(normalizeBusinessType(type), type, type)
  }
})

test('normalizeBusinessType returns the pre-refactor result for edge and loose-match inputs', () => {
  for (const [input, expected] of EXPECTED_NORMALIZED) {
    assert.equal(normalizeBusinessType(input), expected, JSON.stringify(input))
  }
})

test('moduleAccess re-exports the registry normalizeBusinessType', () => {
  assert.equal(normalizeBusinessType, registryNormalize)
})

test('registry has 8 modules with unique types, ids and colors', () => {
  assert.equal(MODULE_REGISTRY.length, 8)
  assert.equal(listModules(), MODULE_REGISTRY)
  assert.deepEqual([...BUSINESS_TYPES], EXPECTED_BUSINESS_TYPES)
  for (const field of ['type', 'id', 'label', 'color']) {
    const values = MODULE_REGISTRY.map((module) => module[field])
    assert.equal(new Set(values).size, values.length, `duplicate ${field}`)
  }
  for (const module of MODULE_REGISTRY) assert.match(module.color, /^#[0-9a-f]{6}$/i, module.type)
})

test('registry matches the app workspace catalog ids and labels', () => {
  for (const module of MODULE_REGISTRY) {
    const workspace = businessWorkspaceCatalog.find((item) => item.type === module.type)
    assert.ok(workspace, module.type)
    assert.equal(module.id, workspace.id, module.type)
    assert.equal(module.label, workspace.title, module.type)
    assert.equal(module.label, EXPECTED_LABELS[module.type], module.type)
    assert.equal(labelForBusinessType(module.type), module.label, module.type)
  }
})

test('every legacy type and alias resolves to its own module type', () => {
  assert.deepEqual({ ...BUSINESS_TYPE_ALIASES }, EXPECTED_ALIASES)
  for (const module of MODULE_REGISTRY) {
    for (const alias of [...module.legacyTypes, ...module.aliases]) {
      const resolved = normalizeBusinessType(alias)
      assert.ok(EXPECTED_BUSINESS_TYPES.includes(resolved), alias)
      assert.equal(resolved, module.type, `${alias} -> ${resolved}, expected ${module.type}`)
    }
  }
})

test('registry is frozen', () => {
  assert.ok(Object.isFrozen(MODULE_REGISTRY))
  assert.ok(Object.isFrozen(MODULE_REGISTRY[0]))
  assert.ok(Object.isFrozen(MODULE_REGISTRY[0].aliases))
  assert.ok(Object.isFrozen(BUSINESS_TYPE_ALIASES))
})

test('getModule and moduleLabel resolve types, ids and aliases', () => {
  assert.equal(getModule('PharmaFlow').id, 'medical-store-pos')
  assert.equal(getModule('Medical Store POS').type, 'PharmaFlow')
  assert.equal(getModule('medical-store-pos').type, 'PharmaFlow')
  assert.equal(getModule('transport-rental').type, 'Transport / Rental')
  assert.equal(getModule('crm').type, 'General CRM')
  assert.equal(getModule('').type, 'General CRM')
  assert.equal(getModule(null).type, 'General CRM')
  assert.equal(moduleLabel('General CRM'), 'Nexora Sales Hub')
  assert.equal(moduleLabel('Restaurant / POS'), 'Restaurant POS')
  assert.equal(moduleLabel('Medical Store POS'), 'PharmaFlow')
})

test('maintenance and marketing keys match the values those files store today', () => {
  const inUseMaintenance = maintenanceModules.map((option) => option.value).filter((value) => value !== 'all')
  // src/lib/marketing.js MODULE_OPTIONS (not importable in Node: it loads Firebase).
  const inUseMarketing = ['restaurant', 'crm', 'transport', 'school', 'property']
  for (const module of MODULE_REGISTRY) {
    assert.equal(inUseMaintenance.includes(module.maintenanceKey), module.maintenanceKeyInUse, module.type)
    assert.equal(inUseMarketing.includes(module.marketingKey), module.marketingKeyInUse, module.type)
  }
})
