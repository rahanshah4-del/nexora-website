const defaultOpeningTime = '16:00'
const defaultClosingTime = '03:00'

function parseTimeMinutes(value, fallback) {
  const text = String(value || fallback || '').trim()
  const match = text.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return parseTimeMinutes(fallback, '00:00')
  const hours = Math.min(23, Math.max(0, Number(match[1]) || 0))
  const minutes = Math.min(59, Math.max(0, Number(match[2]) || 0))
  return hours * 60 + minutes
}

function startOfCalendarDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addMinutes(date, minutes) {
  const copy = new Date(date)
  copy.setMinutes(copy.getMinutes() + minutes)
  return copy
}

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildWindowForStartDay(startDay, openingMinutes, closingMinutes) {
  const start = addMinutes(startOfCalendarDay(startDay), openingMinutes)
  const closingOffset = closingMinutes <= openingMinutes ? closingMinutes + 24 * 60 : closingMinutes
  const end = addMinutes(startOfCalendarDay(startDay), closingOffset)
  end.setMilliseconds(999)
  return { start, end }
}

export function restaurantTimingSettings(settings = {}) {
  const restaurantSettings = settings.restaurantPos || settings || {}
  return {
    openingTime: restaurantSettings.openingTime || defaultOpeningTime,
    closingTime: restaurantSettings.closingTime || defaultClosingTime,
  }
}

export function restaurantBusinessDayWindow(settings = {}, referenceDate = new Date()) {
  const { openingTime, closingTime } = restaurantTimingSettings(settings)
  const openingMinutes = parseTimeMinutes(openingTime, defaultOpeningTime)
  const closingMinutes = parseTimeMinutes(closingTime, defaultClosingTime)
  const today = startOfCalendarDay(referenceDate)
  const todayWindow = buildWindowForStartDay(today, openingMinutes, closingMinutes)
  if (referenceDate < todayWindow.start) {
    const previousDay = new Date(today)
    previousDay.setDate(previousDay.getDate() - 1)
    return buildWindowForStartDay(previousDay, openingMinutes, closingMinutes)
  }
  return todayWindow
}

export function restaurantPreviousBusinessDayWindow(settings = {}, referenceDate = new Date()) {
  const current = restaurantBusinessDayWindow(settings, referenceDate)
  const previousReference = new Date(current.start)
  previousReference.setMinutes(previousReference.getMinutes() - 1)
  return restaurantBusinessDayWindow(settings, previousReference)
}

export function isWithinRestaurantBusinessDay(value, settings = {}, referenceDate = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const window = restaurantBusinessDayWindow(settings, referenceDate)
  return date >= window.start && date <= window.end
}

export function restaurantBusinessDateKey(value, settings = {}) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const { openingTime, closingTime } = restaurantTimingSettings(settings)
  const openingMinutes = parseTimeMinutes(openingTime, defaultOpeningTime)
  const closingMinutes = parseTimeMinutes(closingTime, defaultClosingTime)
  const minutes = date.getHours() * 60 + date.getMinutes()
  const keyDate = new Date(date)
  if (closingMinutes <= openingMinutes && minutes < closingMinutes) {
    keyDate.setDate(keyDate.getDate() - 1)
  }
  return localDateKey(keyDate)
}

export function formatRestaurantBusinessWindow(settings = {}, referenceDate = new Date()) {
  const window = restaurantBusinessDayWindow(settings, referenceDate)
  return `${window.start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} - ${window.end.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
}
