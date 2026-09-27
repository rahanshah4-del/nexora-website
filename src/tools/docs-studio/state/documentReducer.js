/**
 * Editor state for one document: a pure reducer (no React import) plus action
 * creators. Action creators mint ids for new rows, so the reducer itself is
 * deterministic for a given action and can be unit-tested directly.
 *
 * State is the stored document itself (see engine/model.js). Totals are never
 * kept in state: useDocumentStudio() derives them with calculateDocument().
 */

import {
  addDays, changeCurrency, createCharge, createLine, createPayment, createTax, dueDateFromTerms, generateId,
  getDocumentType, normalizeAppearance, normalizeDeposit, normalizeDiscount, normalizeDocument, normalizeOptions,
  normalizeParty,
} from '../engine/index.js'

export const ACTIONS = Object.freeze({
  REPLACE: 'document/replace',
  SET: 'document/set',
  SET_TYPE: 'document/setType',
  SET_CURRENCY: 'document/setCurrency',
  SET_APPEARANCE: 'document/setAppearance',
  SET_OPTION: 'document/setOption',
  UPDATE_PARTY: 'party/update',
  ADD_LINE: 'line/add',
  UPDATE_LINE: 'line/update',
  REMOVE_LINE: 'line/remove',
  MOVE_LINE: 'line/move',
  DUPLICATE_LINE: 'line/duplicate',
  TOGGLE_LINE_TAX: 'line/toggleTax',
  ADD_TAX: 'tax/add',
  UPDATE_TAX: 'tax/update',
  REMOVE_TAX: 'tax/remove',
  SET_DISCOUNT: 'discount/set',
  SET_SHIPPING: 'shipping/set',
  ADD_FEE: 'fee/add',
  UPDATE_FEE: 'fee/update',
  REMOVE_FEE: 'fee/remove',
  ADD_PAYMENT: 'payment/add',
  UPDATE_PAYMENT: 'payment/update',
  REMOVE_PAYMENT: 'payment/remove',
  SET_DEPOSIT: 'deposit/set',
})

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
// Fields with their own actions (or that must never change in place).
const PROTECTED_ROOTS = new Set(['id', 'type', 'schemaVersion', 'currency', 'lines', 'taxes', 'fees', 'payments'])

function toPath(path) {
  return Array.isArray(path) ? path.map(String) : String(path).split('.').filter(Boolean)
}

function setIn(target, [key, ...rest], value) {
  const base = Array.isArray(target) ? [...target] : { ...(target && typeof target === 'object' ? target : {}) }
  base[key] = rest.length ? setIn(base[key], rest, value) : value
  return base
}

const updateById = (list, id, patch) => list.map((item) => (item.id === id ? { ...item, ...patch, id: item.id } : item))
const removeById = (list, id) => list.filter((item) => item.id !== id)

function insertAt(list, item, index) {
  const at = Number.isInteger(index) ? Math.max(0, Math.min(index, list.length)) : list.length
  return [...list.slice(0, at), item, ...list.slice(at)]
}

/**
 * @param {import('../engine/model.js').DocsDocument} state
 * @param {{ type: string, [key: string]: any }} action
 * @returns {import('../engine/model.js').DocsDocument}
 */
export function documentReducer(state, action) {
  switch (action?.type) {
    case ACTIONS.REPLACE:
      return normalizeDocument(action.document)

    case ACTIONS.SET: {
      const path = toPath(action.path)
      if (!path.length || path.some((key) => FORBIDDEN_KEYS.has(key)) || PROTECTED_ROOTS.has(path[0])) return state
      return setIn(state, path, action.value)
    }

    case ACTIONS.SET_TYPE: {
      // Switches the type in place (unlike convertDocument, which makes a new
      // document). Fields the new type does not use are kept, just ignored by
      // calculateDocument, so switching back restores them.
      const config = getDocumentType(action.docType)
      if (!config || config.type === state.type) return state
      const f = config.features
      const terms = state.paymentTermsDays ?? config.defaultPaymentTermsDays
      return {
        ...state,
        type: config.type,
        status: config.statuses.includes(state.status) ? state.status : config.statuses[0],
        number: action.number ?? state.number,
        paymentTermsDays: terms,
        dueDate: f.dueDate ? state.dueDate || dueDateFromTerms(state.issueDate, terms) : state.dueDate,
        validUntil: f.validUntil && !state.validUntil && config.defaultValidityDays !== null ? addDays(state.issueDate, config.defaultValidityDays) : state.validUntil,
      }
    }

    case ACTIONS.SET_APPEARANCE:
      return { ...state, appearance: normalizeAppearance({ ...state.appearance, ...action.patch }) }

    case ACTIONS.SET_CURRENCY:
      return action.currency && action.currency !== state.currency ? changeCurrency(state, action.currency) : state

    case ACTIONS.SET_OPTION:
      return { ...state, options: normalizeOptions({ ...state.options, [action.key]: action.value }) }

    case ACTIONS.UPDATE_PARTY: {
      if (!['seller', 'client', 'shipTo'].includes(action.role)) return state
      if (action.role === 'shipTo' && action.patch === null) return { ...state, shipTo: null }
      return { ...state, [action.role]: normalizeParty({ ...(state[action.role] || {}), ...action.patch }) }
    }

    case ACTIONS.ADD_LINE:
      return { ...state, lines: insertAt(state.lines, action.line || createLine(), action.index) }
    case ACTIONS.UPDATE_LINE:
      return { ...state, lines: updateById(state.lines, action.id, action.patch) }
    case ACTIONS.REMOVE_LINE:
      return { ...state, lines: removeById(state.lines, action.id) }
    case ACTIONS.MOVE_LINE: {
      const from = state.lines.findIndex((l) => l.id === action.id)
      if (from < 0) return state
      const rest = state.lines.filter((_, i) => i !== from)
      return { ...state, lines: insertAt(rest, state.lines[from], action.toIndex) }
    }
    case ACTIONS.DUPLICATE_LINE: {
      const index = state.lines.findIndex((l) => l.id === action.id)
      if (index < 0) return state
      const copy = { ...state.lines[index], id: action.newId || generateId(), taxIds: [...state.lines[index].taxIds] }
      return { ...state, lines: insertAt(state.lines, copy, index + 1) }
    }
    case ACTIONS.TOGGLE_LINE_TAX:
      return {
        ...state,
        lines: state.lines.map((line) => {
          if (line.id !== action.lineId) return line
          const has = line.taxIds.includes(action.taxId)
          return { ...line, taxIds: has ? line.taxIds.filter((id) => id !== action.taxId) : [...line.taxIds, action.taxId] }
        }),
      }

    case ACTIONS.ADD_TAX:
      return { ...state, taxes: [...state.taxes, action.tax || createTax()] }
    case ACTIONS.UPDATE_TAX:
      return { ...state, taxes: updateById(state.taxes, action.id, action.patch) }
    case ACTIONS.REMOVE_TAX: {
      // Drop every reference too, so no line keeps pointing at a missing tax.
      const strip = (item) => (item && item.taxIds.includes(action.id) ? { ...item, taxIds: item.taxIds.filter((id) => id !== action.id) } : item)
      return {
        ...state,
        taxes: removeById(state.taxes, action.id),
        lines: state.lines.map(strip),
        fees: state.fees.map(strip),
        shipping: strip(state.shipping),
      }
    }

    case ACTIONS.SET_DISCOUNT:
      return { ...state, discount: normalizeDiscount(action.discount) }
    case ACTIONS.SET_SHIPPING:
      return { ...state, shipping: action.shipping ? { ...(state.shipping || createCharge({}, 'Shipping')), ...action.shipping } : null }
    case ACTIONS.ADD_FEE:
      return { ...state, fees: [...state.fees, action.fee || createCharge()] }
    case ACTIONS.UPDATE_FEE:
      return { ...state, fees: updateById(state.fees, action.id, action.patch) }
    case ACTIONS.REMOVE_FEE:
      return { ...state, fees: removeById(state.fees, action.id) }

    case ACTIONS.ADD_PAYMENT:
      return { ...state, payments: [...state.payments, action.payment || createPayment()] }
    case ACTIONS.UPDATE_PAYMENT:
      return { ...state, payments: updateById(state.payments, action.id, action.patch) }
    case ACTIONS.REMOVE_PAYMENT:
      return { ...state, payments: removeById(state.payments, action.id) }

    case ACTIONS.SET_DEPOSIT:
      return { ...state, deposit: normalizeDeposit(action.deposit) }

    default:
      return state
  }
}

/** Action creators. New rows get their ids here, keeping the reducer pure. */
export const documentActions = Object.freeze({
  replace: (document) => ({ type: ACTIONS.REPLACE, document }),
  set: (path, value) => ({ type: ACTIONS.SET, path, value }),
  setType: (docType, number) => ({ type: ACTIONS.SET_TYPE, docType, number }),
  setAppearance: (patch) => ({ type: ACTIONS.SET_APPEARANCE, patch }),
  setCurrency: (currency) => ({ type: ACTIONS.SET_CURRENCY, currency }),
  setOption: (key, value) => ({ type: ACTIONS.SET_OPTION, key, value }),
  updateParty: (role, patch) => ({ type: ACTIONS.UPDATE_PARTY, role, patch }),
  addLine: (fields = {}, index) => ({ type: ACTIONS.ADD_LINE, line: createLine(fields), index }),
  updateLine: (id, patch) => ({ type: ACTIONS.UPDATE_LINE, id, patch }),
  removeLine: (id) => ({ type: ACTIONS.REMOVE_LINE, id }),
  moveLine: (id, toIndex) => ({ type: ACTIONS.MOVE_LINE, id, toIndex }),
  duplicateLine: (id) => ({ type: ACTIONS.DUPLICATE_LINE, id, newId: generateId() }),
  toggleLineTax: (lineId, taxId) => ({ type: ACTIONS.TOGGLE_LINE_TAX, lineId, taxId }),
  addTax: (fields = {}) => ({ type: ACTIONS.ADD_TAX, tax: createTax(fields) }),
  updateTax: (id, patch) => ({ type: ACTIONS.UPDATE_TAX, id, patch }),
  removeTax: (id) => ({ type: ACTIONS.REMOVE_TAX, id }),
  setDiscount: (discount) => ({ type: ACTIONS.SET_DISCOUNT, discount }),
  setShipping: (shipping) => ({ type: ACTIONS.SET_SHIPPING, shipping }),
  addFee: (fields = {}) => ({ type: ACTIONS.ADD_FEE, fee: createCharge(fields) }),
  updateFee: (id, patch) => ({ type: ACTIONS.UPDATE_FEE, id, patch }),
  removeFee: (id) => ({ type: ACTIONS.REMOVE_FEE, id }),
  addPayment: (fields = {}) => ({ type: ACTIONS.ADD_PAYMENT, payment: createPayment(fields) }),
  updatePayment: (id, patch) => ({ type: ACTIONS.UPDATE_PAYMENT, id, patch }),
  removePayment: (id) => ({ type: ACTIONS.REMOVE_PAYMENT, id }),
  setDeposit: (deposit) => ({ type: ACTIONS.SET_DEPOSIT, deposit }),
})
