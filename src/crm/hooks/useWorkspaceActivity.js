import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { listenToWorkspaceCollection } from '../lib/firestore.js'

function toDateMs(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.getTime() : 0
}

function nowMs() {
  return Date.now()
}

function todayStartMs() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function formatRelativeTime(ms) {
  if (!ms) return 'Never'
  const diff = nowMs() - ms
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 172800000) return 'Yesterday'
  return `${Math.floor(diff / 86400000)}d ago`
}

/**
 * Reads activity logs for a workspace and computes:
 *  - todayCount: number of actions today
 *  - lastActiveLabel: "5m ago" / "2h ago" etc.
 *  - lastActiveMs: timestamp of most recent activity
 *  - hourlyBuckets: array of 24 counts for today's hourly graph
 *  - recentActions: last 5 activity descriptions
 *  - totalActions: all-time count (capped at what's loaded)
 *  - activeHoursToday: count of distinct hours with activity today
 */
export default function useWorkspaceActivity(workspaceId, { enabled = true, listen = false, limitCount = 200 } = {}) {
  const [rawLogs, setRawLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId || !enabled) {
      setRawLogs([])
      setLoading(false)
      setError('')
      return undefined
    }

    if (listen) {
      setLoading(true)
      const unsub = listenToWorkspaceCollection({
        workspaceId,
        collectionName: 'activityLogs',
        limitCount,
        onData: (rows) => {
          setRawLogs(Array.isArray(rows) ? rows : [])
          setLoading(false)
          setError('')
        },
        onError: (err) => {
          setError(String(err?.message || err || 'Failed to load activity'))
          setLoading(false)
        },
      })
      return () => unsub?.()
    }

    // Non-listening: just set empty — caller should pass listen=true for real data
    setRawLogs([])
    setLoading(false)
    setError('')
    return undefined
  }, [workspaceId, enabled, listen, limitCount])

  const stats = useMemo(() => {
    const logs = Array.isArray(rawLogs) ? rawLogs : []
    const todayStart = todayStartMs()
    const now = nowMs()

    // Sort by createdAt descending
    const sorted = [...logs].sort((a, b) => toDateMs(b.createdAt) - toDateMs(a.createdAt))

    // Today's logs
    const todayLogs = sorted.filter((l) => toDateMs(l.createdAt) >= todayStart)

    // Hourly buckets for today (0-23)
    const hourlyBuckets = new Array(24).fill(0)
    const activeHours = new Set()
    for (const l of todayLogs) {
      const ms = toDateMs(l.createdAt)
      if (ms >= todayStart) {
        const hour = new Date(ms).getHours()
        hourlyBuckets[hour]++
        activeHours.add(hour)
      }
    }

    // Last active
    const lastActiveMs = sorted.length > 0 ? toDateMs(sorted[0].createdAt) : 0

    // Recent actions (last 5)
    const recentActions = sorted.slice(0, 5).map((l) => ({
      id: l.id || '',
      action: l.action || 'Action',
      module: l.module || 'System',
      description: l.description || '',
      userName: l.userName || l.userEmail || 'User',
      timeMs: toDateMs(l.createdAt),
      timeLabel: formatRelativeTime(toDateMs(l.createdAt)),
      isToday: toDateMs(l.createdAt) >= todayStart,
    }))

    // Module breakdown
    const moduleCounts = {}
    for (const l of logs) {
      const mod = l.module || 'System'
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1
    }

    // Online time estimate (sum of gaps between first and last activity per hour)
    // Simple heuristic: count hours that have activity
    const allHours = new Set()
    for (const l of logs) {
      const ms = toDateMs(l.createdAt)
      if (ms > 0) allHours.add(new Date(ms).toDateString() + '-' + new Date(ms).getHours())
    }

    return {
      todayCount: todayLogs.length,
      totalCount: logs.length,
      lastActiveMs,
      lastActiveLabel: formatRelativeTime(lastActiveMs),
      hourlyBuckets,
      activeHoursToday: activeHours.size,
      totalActiveHours: allHours.size,
      recentActions,
      moduleCounts,
      loading,
      error,
      hasActivity: logs.length > 0,
    }
  }, [rawLogs, loading, error])

  return { ...stats, loading, error, rawCount: rawLogs.length }
}
