import { useMemo } from 'react'
import { useUser } from './useUser.js'
import { useProductionBatches } from './useKitchenProduction.js'
import { useKitchenPrep } from './useKitchenPrep.js'
import { productionDashboardMetrics } from '../lib/kitchenProductionCalculations.js'
import { loadRestaurantMenuItems } from '../data/restaurantMenu.js'

export function useProductionAnalytics({ enabled = true, ingredients = [], recipes = [], wasteRecords = [] } = {}) {
  const batchesApi = useProductionBatches({ enabled })
  const prepApi = useKitchenPrep({ enabled })
  const menuItems = useMemo(() => enabled ? loadRestaurantMenuItems() : [], [enabled])

  const loading = batchesApi.loading || prepApi.loading

  const metrics = useMemo(() => {
    if (loading) return null
    return productionDashboardMetrics({
      batches: batchesApi.batches,
      ingredients,
      recipes,
      menuItems,
      wasteRecords,
    })
  }, [loading, batchesApi.batches, ingredients, recipes, menuItems, wasteRecords])

  return { metrics, loading, batchesApi, prepApi }
}
