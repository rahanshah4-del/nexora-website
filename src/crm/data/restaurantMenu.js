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

export function hasRestaurantOffer(item) {
  return Boolean(item?.offerTitle || Number(item?.discountValue || 0) > 0 || item?.happyHour || item?.buyOneGetOne || item?.comboOffer)
}

export function loadRestaurantMenuItems() {
  if (typeof window === 'undefined') return restaurantMenuItems
  try {
    const stored = window.localStorage.getItem(_menuKey())
    const parsed = stored ? JSON.parse(stored) : null
    return Array.isArray(parsed) && parsed.length ? parsed : restaurantMenuItems
  } catch {
    return restaurantMenuItems
  }
}

export function saveRestaurantMenuItems(items) {
  if (typeof window === 'undefined') return
  const k = _menuKey()
  window.localStorage.setItem(k, JSON.stringify(Array.isArray(items) ? items : []))
  notifyLocalDataChanged(k)
}

export function loadRestaurantMenuCategories() {
  if (typeof window === 'undefined') return restaurantMenuCategories
  try {
    const stored = window.localStorage.getItem(_catKey())
    const parsed = stored ? JSON.parse(stored) : []
    const merged = [...restaurantMenuCategories, ...(Array.isArray(parsed) ? parsed : [])]
    return Array.from(new Set(merged.map((item) => String(item || '').trim()).filter(Boolean)))
  } catch {
    return restaurantMenuCategories
  }
}

export function saveRestaurantMenuCategories(categories) {
  if (typeof window === 'undefined') return
  const k = _catKey()
  const cleaned = Array.from(new Set((Array.isArray(categories) ? categories : []).map((item) => String(item || '').trim()).filter(Boolean)))
  window.localStorage.setItem(k, JSON.stringify(cleaned))
  notifyLocalDataChanged(k)
}
