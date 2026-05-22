import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeCollection } from '../lib/firestore.js'

function daysSince(dateStr) {
  if (!dateStr) return 999
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function computeReasons(lead, score) {
  const reasons = []
  if ((lead.replySpeed ?? 0) >= 75) reasons.push('Fast replies')
  if ((lead.dealValue ?? 0) >= 10000) reasons.push('High deal value')
  if ((lead.meetings ?? 0) >= 2) reasons.push('Recent meeting')
  if ((lead.activityFrequency ?? 0) < 40) reasons.push('Low activity')
  if (daysSince(lead.lastContactDate) > 10) reasons.push('Not contacted recently')
  if (reasons.length === 0) reasons.push(score >= 50 ? 'Steady engagement' : 'Needs follow-up')
  return reasons.slice(0, 3)
}

function scoreType(score) {
  if (score >= 80) return 'Hot Lead'
  if (score >= 50) return 'Warm Lead'
  return 'Cold Lead'
}

function priority(score) {
  if (score >= 80) return 'High'
  if (score >= 50) return 'Medium'
  return 'Low'
}

function prediction(score) {
  if (score >= 85) return 'Very likely'
  if (score >= 70) return 'Likely'
  if (score >= 50) return 'Possible'
  return 'Unlikely'
}

export function computeLeadScore(lead) {
  // Demo "AI" scoring: weighted model in 0..100 using supplied signals.
  const reply = clamp01((lead.replySpeed ?? 50) / 100)
  const activity = clamp01((lead.activityFrequency ?? 50) / 100)
  const payment = clamp01((lead.paymentHistory ?? 0) / 100)
  const meetings = clamp01((lead.meetings ?? 0) / 5)

  const dealNorm = clamp01(Math.log10(Math.max(1, lead.dealValue ?? 1)) / 5) // ~0..1 for 1..100k+
  const recency = clamp01(1 - daysSince(lead.lastContactDate) / 21) // newer contact -> higher

  const weighted =
    reply * 0.22 +
    meetings * 0.18 +
    payment * 0.18 +
    activity * 0.18 +
    dealNorm * 0.14 +
    recency * 0.10

  const score = Math.round(weighted * 100)
  return {
    score,
    scoreType: scoreType(score),
    priority: priority(score),
    prediction: prediction(score),
    reasons: computeReasons(lead, score),
  }
}

export function useLeadScoring() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('none')
        setError('Firestore is not configured.')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    const unsub = subscribeCollection(
      'leads',
      (data) => {
        setRows(Array.isArray(data) ? data : [])
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load leads')
        setRows([])
        setSource('firestore')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const scored = useMemo(
    () =>
      rows.map((l) => {
        const ai = computeLeadScore(l)
        return { ...l, ...ai }
      }),
    [rows],
  )

  return { leads: scored, loading, source, error }
}
