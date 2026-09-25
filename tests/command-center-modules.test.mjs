import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MODULE_TYPES,
  buildModuleAccessPayload,
  findModuleMismatches,
  mismatchesToCsv,
  moduleAccessState,
  resolvePrimaryModule,
} from '../src/pages/admin/commandCenterModules.js'

const ALL_TYPES = ['General CRM', 'Retail / POS', 'School ERP', 'Property ERP', 'Restaurant POS', 'Transport / Rental', 'WhatsApp CRM', 'PharmaFlow']

test('MODULE_TYPES lists all 8 registry modules including PharmaFlow', () => {
  assert.deepEqual([...MODULE_TYPES], ALL_TYPES)
})

test('PharmaFlow client keeps PharmaFlow on every module-access save', () => {
  const workspace = { id: 'ws1', businessType: 'PharmaFlow', primaryBusinessType: '' }
  const owner = { id: 'ws1', businessType: 'PharmaFlow' }
  const grant = buildModuleAccessPayload({ workspace, owner, nextModules: ['PharmaFlow', 'School ERP'] })
  assert.deepEqual(grant.payload, {
    primaryBusinessType: 'PharmaFlow',
    allowedBusinessTypes: ['PharmaFlow', 'School ERP'],
    specialModuleAccess: true,
    allModulesAccess: false,
  })
  const reset = buildModuleAccessPayload({ workspace, owner, nextModules: ['PharmaFlow'] })
  assert.deepEqual(reset.payload, {
    primaryBusinessType: 'PharmaFlow',
    allowedBusinessTypes: ['PharmaFlow'],
    specialModuleAccess: false,
    allModulesAccess: false,
  })
  assert.equal(reset.notificationBusinessType, 'PharmaFlow')
  assert.equal(reset.warning, '')
})

test('legacy Medical Store POS client is written as a PharmaFlow-resolving value', () => {
  const result = buildModuleAccessPayload({ workspace: { businessType: 'Medical Store POS' }, owner: {}, nextModules: [] })
  assert.equal(result.payload.primaryBusinessType, 'PharmaFlow')
  assert.deepEqual(result.payload.allowedBusinessTypes, ['PharmaFlow'])
})

test('primary is read in order workspace.primary, workspace.business, owner.primary, owner.business', () => {
  assert.equal(resolvePrimaryModule({ workspace: { primaryBusinessType: 'School ERP', businessType: 'PharmaFlow' } }).type, 'School ERP')
  assert.equal(resolvePrimaryModule({ workspace: { businessType: 'Restaurant POS' }, owner: { primaryBusinessType: 'PharmaFlow' } }).type, 'Restaurant POS')
  assert.equal(resolvePrimaryModule({ workspace: {}, owner: { primaryBusinessType: 'pharmaflow', businessType: 'General CRM' } }).type, 'PharmaFlow')
  assert.equal(resolvePrimaryModule({ workspace: { primaryBusinessType: 'garbage' }, owner: { businessType: 'Transport / Rental' } }).type, 'Transport / Rental')
})

test('unknown primary writes no primaryBusinessType and warns', () => {
  const result = buildModuleAccessPayload({ workspace: { businessType: 'Mystery Module' }, owner: {}, nextModules: ['School ERP', 'bogus'] })
  assert.equal('primaryBusinessType' in result.payload, false)
  assert.deepEqual(result.payload.allowedBusinessTypes, ['School ERP'])
  assert.equal(result.warning, "Unknown module value 'Mystery Module' — primary not changed")
  assert.equal(result.notificationBusinessType, 'Mystery Module')

  const empty = buildModuleAccessPayload({ workspace: {}, owner: {}, nextModules: [] })
  assert.equal('primaryBusinessType' in empty.payload, false)
  assert.deepEqual(empty.payload.allowedBusinessTypes, [])
  assert.equal(empty.warning, 'No module value stored — primary not changed')
})

test('Enable All grants all 8 modules, primary first', () => {
  const result = buildModuleAccessPayload({ workspace: { businessType: 'PharmaFlow' }, owner: {}, nextModules: MODULE_TYPES })
  assert.equal(result.payload.allowedBusinessTypes.length, 8)
  assert.equal(result.payload.allowedBusinessTypes[0], 'PharmaFlow')
  assert.deepEqual([...result.payload.allowedBusinessTypes].sort(), [...ALL_TYPES].sort())
  assert.equal(result.payload.allModulesAccess, true)
  assert.equal(result.payload.primaryBusinessType, 'PharmaFlow')
})

test('moduleAccessState resolves stored allowed types strictly and drops unknown values', () => {
  const state = moduleAccessState({ workspace: { businessType: 'Medical Store POS', allowedBusinessTypes: ['School ERP', 'nonsense', 'restaurant'] }, owner: {} })
  assert.equal(state.primary, 'PharmaFlow')
  assert.deepEqual(state.allowed, ['PharmaFlow', 'School ERP', 'Restaurant POS'])
  assert.equal(state.special, true)
  const all = moduleAccessState({ workspace: { businessType: 'PharmaFlow', allModulesAccess: true } })
  assert.equal(all.all, true)
  assert.equal(all.allowed.length, 8)
})

test('findModuleMismatches flags PharmaFlow clients locked to Sales Hub and other disagreements', () => {
  const workspaces = [
    { id: 'pharma-damaged', ownerId: 'u1', companyName: 'Chemist', businessType: 'PharmaFlow', primaryBusinessType: 'General CRM' },
    { id: 'pharma-ok', ownerId: 'u2', businessType: 'PharmaFlow', primaryBusinessType: 'PharmaFlow' },
    { id: 'legacy-ok', ownerId: 'u3', businessType: 'Medical Store POS' },
    { id: 'school-vs-retail', ownerId: 'u4', businessType: 'School ERP', primaryBusinessType: 'Retail / POS' },
    { id: 'unknown', businessType: 'Mystery Module' },
  ]
  const users = [
    { id: 'u1', email: 'chemist@example.com', businessType: 'PharmaFlow', primaryBusinessType: 'General CRM' },
    { id: 'u2', businessType: 'PharmaFlow' },
    { id: 'u3', businessType: 'Medical Store POS' },
    { id: 'u4', businessType: 'School ERP' },
  ]
  const rows = findModuleMismatches(workspaces, users)
  assert.deepEqual(rows.map((row) => row.workspaceId), ['pharma-damaged', 'school-vs-retail', 'unknown'])
  const damaged = rows[0]
  assert.equal(damaged.pharmacyLockedToSalesHub, true)
  assert.equal(damaged.ownerEmail, 'chemist@example.com')
  assert.equal(damaged.workspacePrimaryBusinessType, 'General CRM')
  assert.equal(damaged.workspaceBusinessType, 'PharmaFlow')
  assert.equal(rows[2].ownerFound, false)
  assert.match(rows[2].issues.join(' '), /Unknown workspace.businessType 'Mystery Module'/)
})

test('mismatchesToCsv quotes cells and neutralises formulas', () => {
  const csv = mismatchesToCsv([{ workspaceId: 'w1', workspaceName: '=HYPERLINK("x")', ownerEmail: 'a@b.c', issues: ['one', 'two "quoted"'] }])
  const [header, line] = csv.split('\n')
  assert.match(header, /^"Workspace ID","Workspace name","Owner email"/)
  assert.match(line, /^"w1","'=HYPERLINK\(""x""\)","a@b.c"/)
  assert.match(line, /"one; two ""quoted"""$/)
})
