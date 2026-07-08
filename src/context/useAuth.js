import { useContext } from 'react'
import { AuthContext } from './auth-context.js'

export default function useAuth() {
  return useContext(AuthContext)
}
