import { useContext } from 'react'
import UserContext from '../context/UserContext.jsx'

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}

