import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeUserCollection } from '../lib/firestore.js'
import { calculateSchoolAttendanceSummary } from '../lib/schoolDashboardCalculations.js'
import { clientSafeMessage } from '../utils/messages.js'
import { useUser } from './useUser.js'

export function useSchoolAttendanceSummary(options = {}) {
  const { workspaceId, businessType } = useUser()
  const enabled = options.enabled !== false
  const [studentAttendance, setStudentAttendance] = useState([])
  const [staffAttendance, setStaffAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setStudentAttendance([])
        setStaffAttendance([])
        setLoading(false)
        setError('')
      })
      return undefined
    }
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setStudentAttendance([])
        setStaffAttendance([])
        setLoading(false)
        setError(db ? '' : 'Secure Cloud Sync is not available right now.')
      })
      return undefined
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    let loaded = 0
    const markLoaded = () => {
      loaded += 1
      if (loaded >= 2) setLoading(false)
    }
    const onError = (err) => {
      setError(clientSafeMessage(err, 'Attendance records could not be loaded.'))
      setLoading(false)
    }

    const unsubStudents = subscribeUserCollection(
      workspaceId,
      'studentAttendance',
      (rows) => {
        setStudentAttendance(Array.isArray(rows) ? rows : [])
        markLoaded()
      },
      onError,
      { businessType },
    )
    const unsubStaff = subscribeUserCollection(
      workspaceId,
      'staffAttendance',
      (rows) => {
        setStaffAttendance(Array.isArray(rows) ? rows : [])
        markLoaded()
      },
      onError,
      { businessType },
    )

    return () => {
      unsubStudents?.()
      unsubStaff?.()
    }
  }, [businessType, enabled, workspaceId])

  const summary = useMemo(
    () => calculateSchoolAttendanceSummary(studentAttendance, staffAttendance),
    [staffAttendance, studentAttendance],
  )

  return { summary, studentAttendance, staffAttendance, loading, error }
}
