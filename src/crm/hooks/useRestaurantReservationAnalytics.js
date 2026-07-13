import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { fetchWorkspaceCollectionPage } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { useRestaurantReservations } from './useRestaurantReservations.js'
import { useRestaurantWaitlist } from './useRestaurantWaitlist.js'
import { reservationAnalytics, peakBookingHours, tableUtilization, waitlistAnalytics, calculateOccupancy } from '../lib/restaurantReservationCalculations.js'

export function useRestaurantReservationAnalytics({ enabled = true, tables = [] } = {}) {
  const { userId, workspaceId, businessType, role } = useUser()
  const reservationsApi = useRestaurantReservations({ enabled })
  const waitlistApi = useRestaurantWaitlist({ enabled })

  const loading = reservationsApi.loading || waitlistApi.loading

  const analytics = useMemo(() => {
    if (loading) return null
    return {
      ...reservationAnalytics(reservationsApi.reservations),
      peakHours: peakBookingHours(reservationsApi.reservations),
      tableUtilization: tableUtilization(reservationsApi.reservations, tables),
      waitlist: waitlistAnalytics(waitlistApi.waitlist),
      occupancy: calculateOccupancy(reservationsApi.reservations, tables, new Date().toISOString().slice(0, 10)),
      reservations: reservationsApi.reservations,
      waitlistEntries: waitlistApi.waitlist,
    }
  }, [loading, reservationsApi.reservations, tables, waitlistApi.waitlist])

  return { analytics, loading, reservationsApi, waitlistApi }
}
