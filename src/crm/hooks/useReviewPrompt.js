import { useEffect, useState, useCallback } from 'react'
import { hasReviewBeenPrompted, hasReviewBeenSubmitted, markReviewPrompted, shouldShowReviewPrompt, submitReview } from '../data/reviewStorage.js'

const FIRST_ACTIVITY_KEY = 'nexora.review.first_activity.v1'

function getFirstActivityMs() {
  if (typeof window === 'undefined') return 0
  try {
    const stored = window.localStorage.getItem(FIRST_ACTIVITY_KEY)
    return stored ? Number(stored) : 0
  } catch { return 0 }
}

function setFirstActivityMs(ms) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FIRST_ACTIVITY_KEY, String(ms))
  } catch { /* noop */ }
}

/**
 * Call this whenever the user does meaningful activity (adds menu item, creates invoice, etc.)
 * It records the first activity timestamp if not already set.
 */
export function useTrackFirstActivity() {
  return useCallback(() => {
    if (getFirstActivityMs()) return
    setFirstActivityMs(Date.now())
  }, [])
}

/**
 * Main hook — returns whether the review prompt should be shown,
 * and provides submit/close handlers.
 */
export default function useReviewPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    // Check if we should show the prompt after a short delay
    const timer = setTimeout(() => {
      const firstMs = getFirstActivityMs()
      if (shouldShowReviewPrompt(firstMs) && !hasReviewBeenPrompted() && !hasReviewBeenSubmitted()) {
        // Add extra random delay so it doesn't pop up instantly on page load
        const randomDelay = 3000 + Math.random() * 4000
        setTimeout(() => {
          setShowPrompt(true)
          markReviewPrompted()
        }, randomDelay)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = useCallback(() => {
    setShowPrompt(false)
  }, [])

  const handleSubmit = useCallback(async ({ rating, comment }, onSuccess) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      // Get user info from localStorage if available
      let userInfo = {}
      try {
        const stored = window.localStorage.getItem('nexora_user_profile')
        if (stored) userInfo = JSON.parse(stored)
      } catch { /* noop */ }

      await submitReview({
        userId: userInfo.uid || 'unknown',
        userName: userInfo.displayName || userInfo.name || '',
        userEmail: userInfo.email || '',
        workspaceId: userInfo.workspaceId || '',
        workspaceName: userInfo.workspaceName || '',
        module: userInfo.module || 'General',
        rating,
        comment,
      })
      setSubmitting(false)
      onSuccess?.()
    } catch (error) {
      setSubmitError(error?.message || 'Could not submit review. Please try again.')
      setSubmitting(false)
    }
  }, [])

  return {
    showPrompt,
    submitting,
    submitError,
    handleClose,
    handleSubmit,
    onDismiss: handleClose,
  }
}
