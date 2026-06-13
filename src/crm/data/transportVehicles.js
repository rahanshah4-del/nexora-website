import { safeMoney } from '../lib/transportCalculations.js'

export const transportVehiclesStorageKey = 'nexora.transport.vehicles.v1'

export const vehicleCategories = ['Car', 'SUV', 'Van', 'Bus', 'Truck', 'Bike']
export const vehicleFeatureOptions = ['AC', 'GPS', 'Bluetooth', 'Sunroof', 'Rear Camera', 'Child Seat', 'Cruise Control']
export const vehicleStatuses = ['available', 'rented', 'reserved', 'maintenance']

const seedVehicles = [
  {
    id: 'VEH-1001',
    name: 'Toyota Corolla',
    registration: 'LEA-1234',
    category: 'Car',
    seats: 5,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    dailyRate: 6000,
    hourlyRate: 400,
    weeklyRate: 36000,
    securityDeposit: 10000,
    features: ['AC', 'GPS', 'Bluetooth'],
    driverIncluded: false,
    driverName: '',
    driverPhone: '',
    driverLicense: '',
    driverRate: 0,
    status: 'available',
    notes: '',
  },
  {
    id: 'VEH-1002',
    name: 'Honda BR-V',
    registration: 'LEB-5678',
    category: 'SUV',
    seats: 7,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    dailyRate: 9000,
    hourlyRate: 600,
    weeklyRate: 54000,
    securityDeposit: 15000,
    features: ['AC', 'GPS', 'Rear Camera'],
    driverIncluded: true,
    driverName: 'Usman Driver',
    driverPhone: '0300-1112223',
    driverLicense: 'DRV-1029',
    driverRate: 2500,
    status: 'available',
    notes: '',
  },
  {
    id: 'VEH-1003',
    name: 'Toyota Hiace',
    registration: 'LEC-9012',
    category: 'Van',
    seats: 14,
    transmission: 'Manual',
    fuelType: 'Diesel',
    dailyRate: 14000,
    hourlyRate: 900,
    weeklyRate: 84000,
    securityDeposit: 20000,
    features: ['AC'],
    driverIncluded: true,
    driverName: 'Ahmed Khan',
    driverPhone: '0300-4445556',
    driverLicense: 'DRV-2211',
    driverRate: 3500,
    status: 'available',
    notes: '',
  },
]

function readStoredVehicles() {
  if (typeof window === 'undefined') return seedVehicles
  try {
    const stored = window.localStorage.getItem(transportVehiclesStorageKey)
    if (!stored) return seedVehicles
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : seedVehicles
  } catch {
    return seedVehicles
  }
}

export function loadTransportVehicles() {
  return readStoredVehicles().map((vehicle) => normalizeTransportVehicle(vehicle)).filter((vehicle) => vehicle.id)
}

export function saveTransportVehicles(vehicles) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(transportVehiclesStorageKey, JSON.stringify(Array.isArray(vehicles) ? vehicles : []))
}

export function getNextVehicleId(vehicles = loadTransportVehicles()) {
  const numbers = vehicles
    .map((vehicle) => Number(String(vehicle.id || '').replace(/[^0-9]/g, '')))
    .filter((value) => Number.isFinite(value))
  const next = (numbers.length ? Math.max(...numbers) : 1000) + 1
  return `VEH-${next}`
}

export function normalizeTransportVehicle(vehicle = {}) {
  return {
    id: vehicle.id || '',
    name: vehicle.name || 'Unnamed Vehicle',
    registration: vehicle.registration || vehicle.plate || '',
    category: vehicleCategories.includes(vehicle.category) ? vehicle.category : 'Car',
    seats: Math.max(1, Number(vehicle.seats) || 4),
    transmission: vehicle.transmission || 'Automatic',
    fuelType: vehicle.fuelType || 'Petrol',
    dailyRate: safeMoney(vehicle.dailyRate),
    hourlyRate: safeMoney(vehicle.hourlyRate),
    weeklyRate: safeMoney(vehicle.weeklyRate),
    securityDeposit: safeMoney(vehicle.securityDeposit),
    features: Array.isArray(vehicle.features) ? vehicle.features : [],
    driverIncluded: Boolean(vehicle.driverIncluded),
    driverName: vehicle.driverName || '',
    driverPhone: vehicle.driverPhone || '',
    driverLicense: vehicle.driverLicense || '',
    driverRate: safeMoney(vehicle.driverRate),
    status: vehicleStatuses.includes(vehicle.status) ? vehicle.status : 'available',
    notes: vehicle.notes || '',
    createdAt: vehicle.createdAt || new Date().toISOString(),
  }
}

export function upsertTransportVehicle(vehicle) {
  const vehicles = loadTransportVehicles()
  const normalized = normalizeTransportVehicle({
    ...vehicle,
    id: vehicle.id || getNextVehicleId(vehicles),
  })
  const exists = vehicles.some((row) => row.id === normalized.id)
  const nextVehicles = exists
    ? vehicles.map((row) => (row.id === normalized.id ? { ...row, ...normalized } : row))
    : [normalized, ...vehicles]
  saveTransportVehicles(nextVehicles)
  return nextVehicles
}

export function deleteTransportVehicle(vehicleId) {
  const nextVehicles = loadTransportVehicles().filter((vehicle) => vehicle.id !== vehicleId)
  saveTransportVehicles(nextVehicles)
  return nextVehicles
}

export function setVehicleStatus(vehicleId, status) {
  const nextStatus = vehicleStatuses.includes(status) ? status : 'available'
  const nextVehicles = loadTransportVehicles().map((vehicle) =>
    vehicle.id === vehicleId ? { ...vehicle, status: nextStatus } : vehicle,
  )
  saveTransportVehicles(nextVehicles)
  return nextVehicles
}
