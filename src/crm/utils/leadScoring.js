export function computeLeadScore(lead) {
  // Demo heuristic (no AI backend):
  // replySpeed: 0..100 (higher is faster), meetingsAttended: 0..5, paymentHistory: 0..100, activityFrequency: 0..100
  const reply = lead.replySpeed ?? 50
  const meetings = Math.min(5, lead.meetingsAttended ?? 0) * 12
  const payment = lead.paymentHistory ?? 0
  const activity = lead.activityFrequency ?? 50
  const base = reply * 0.28 + meetings * 0.22 + payment * 0.30 + activity * 0.20
  return Math.round(Math.max(0, Math.min(100, base)))
}

export function leadPriority(score) {
  if (score >= 85) return 'High'
  if (score >= 65) return 'Medium'
  return 'Low'
}

export function conversionPrediction(score) {
  if (score >= 85) return 'Very likely'
  if (score >= 70) return 'Likely'
  if (score >= 55) return 'Possible'
  return 'Unlikely'
}

