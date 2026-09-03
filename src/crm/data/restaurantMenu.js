export const restaurantMenuCategories = ['All Menu', 'Promotion', 'Combos', 'Burgers', 'Salads', 'Soups', 'Drinks']
export const restaurantMenuStorageKey = 'nexora.restaurant.menu.v2'
export const restaurantMenuCategoriesStorageKey = 'nexora.restaurant.menu.categories.v1'

export const restaurantMenuItems = []

import { migrateKey, notifyLocalDataChanged, scopedKey } from '../lib/localDataEvents.js'

const _MENU_BASE = 'nexora.restaurant.menu.v2'
const _CAT_BASE = 'nexora.restaurant.menu.categories.v1'

function _menuKey() {
  const k = scopedKey(_MENU_BASE)
  if (k !== _MENU_BASE) {
    migrateKey(_MENU_BASE, k)
  }
  return k
}

function _catKey() {
  const k = scopedKey(_CAT_BASE)
  if (k !== _CAT_BASE) {
    migrateKey(_CAT_BASE, k)
  }
  return k
}

// See restaurantOrders.js for why this exists: switching workspaces without
// a page reload (the in-app "Switch Product" modal) changes what
// scopedKey() resolves to, but nothing invalidated the in-memory caches
// below on that change — so a second Restaurant POS workspace kept
// showing the first workspace's cached menu. Must run unconditionally
// before the cache short-circuits in loadRestaurantMenuItems/Categories,
// since _menuKey()/_catKey() are only reached on a cache miss.
let _lastMenuKey = null
let _lastCatKey = null

function _checkMenuScopeChange() {
  const k = _menuKey()
  if (_lastMenuKey !== null && _lastMenuKey !== k) _menuItemsCache = null
  _lastMenuKey = k
}

function _checkCatScopeChange() {
  const k = _catKey()
  if (_lastCatKey !== null && _lastCatKey !== k) _menuCatCache = null
  _lastCatKey = k
}

export function hasRestaurantOffer(item) {
  return Boolean(item?.offerTitle || Number(item?.discountValue || 0) > 0 || item?.happyHour || item?.buyOneGetOne || item?.comboOffer)
}

let _menuItemsCache = null

export function loadRestaurantMenuItems() {
  if (typeof window === 'undefined') return restaurantMenuItems
  _checkMenuScopeChange()
  if (_menuItemsCache) return _menuItemsCache
  try {
    const stored = window.localStorage.getItem(_menuKey())
    const parsed = stored ? JSON.parse(stored) : null
    _menuItemsCache = Array.isArray(parsed) && parsed.length ? parsed : restaurantMenuItems
    return _menuItemsCache
  } catch {
    return restaurantMenuItems
  }
}

export function saveRestaurantMenuItems(items, workspaceId, userId) {
  if (typeof window === 'undefined') return
  const k = _menuKey()
  _menuItemsCache = null
  window.localStorage.setItem(k, JSON.stringify(Array.isArray(items) ? items : []))
  notifyLocalDataChanged(k)

  // Phase 1 dual-write: also sync to Firestore (debounced, diff-based)
  if (workspaceId && userId) {
    import('./restaurantFirestoreSync.js').then(({ syncMenuItemsToFirestore }) => {
      syncMenuItemsToFirestore(workspaceId, userId, items)
    }).catch(() => { /* dynamic import failed — silently skip */ })
  }
}

let _menuCatCache = null

export function loadRestaurantMenuCategories() {
  if (typeof window === 'undefined') return restaurantMenuCategories
  _checkCatScopeChange()
  if (_menuCatCache) return _menuCatCache
  try {
    const stored = window.localStorage.getItem(_catKey())
    const parsed = stored ? JSON.parse(stored) : []
    const merged = [...restaurantMenuCategories, ...(Array.isArray(parsed) ? parsed : [])]
    _menuCatCache = Array.from(new Set(merged.map((item) => String(item || '').trim()).filter(Boolean)))
    return _menuCatCache
  } catch {
    return restaurantMenuCategories
  }
}

export function saveRestaurantMenuCategories(categories) {
  if (typeof window === 'undefined') return
  const k = _catKey()
  _menuCatCache = null
  const cleaned = Array.from(new Set((Array.isArray(categories) ? categories : []).map((item) => String(item || '').trim()).filter(Boolean)))
  window.localStorage.setItem(k, JSON.stringify(cleaned))
  notifyLocalDataChanged(k)
}
