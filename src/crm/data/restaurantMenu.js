export const restaurantMenuCategories = ['All Menu', 'Promotion', 'Combos', 'Burgers', 'Salads', 'Soups', 'Drinks']
export const restaurantMenuStorageKey = 'nexora.restaurant.menu.v2'
export const restaurantMenuCategoriesStorageKey = 'nexora.restaurant.menu.categories.v1'

export const restaurantMenuItems = []

export function hasRestaurantOffer(item) {
  return Boolean(item?.offerTitle || Number(item?.discountValue || 0) > 0 || item?.happyHour || item?.buyOneGetOne || item?.comboOffer)
}

export function loadRestaurantMenuItems() {
  if (typeof window === 'undefined') return restaurantMenuItems
  try {
    const stored = window.localStorage.getItem(restaurantMenuStorageKey)
    const parsed = stored ? JSON.parse(stored) : null
    return Array.isArray(parsed) && parsed.length ? parsed : restaurantMenuItems
  } catch {
    return restaurantMenuItems
  }
}

export function saveRestaurantMenuItems(items) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(restaurantMenuStorageKey, JSON.stringify(Array.isArray(items) ? items : []))
  notifyLocalDataChanged(restaurantMenuStorageKey)
}

export function loadRestaurantMenuCategories() {
  if (typeof window === 'undefined') return restaurantMenuCategories
  try {
    const stored = window.localStorage.getItem(restaurantMenuCategoriesStorageKey)
    const parsed = stored ? JSON.parse(stored) : []
    const merged = [...restaurantMenuCategories, ...(Array.isArray(parsed) ? parsed : [])]
    return Array.from(new Set(merged.map((item) => String(item || '').trim()).filter(Boolean)))
  } catch {
    return restaurantMenuCategories
  }
}

export function saveRestaurantMenuCategories(categories) {
  if (typeof window === 'undefined') return
  const cleaned = Array.from(new Set((Array.isArray(categories) ? categories : []).map((item) => String(item || '').trim()).filter(Boolean)))
  window.localStorage.setItem(restaurantMenuCategoriesStorageKey, JSON.stringify(cleaned))
  notifyLocalDataChanged(restaurantMenuCategoriesStorageKey)
}
import { notifyLocalDataChanged } from '../lib/localDataEvents.js'
