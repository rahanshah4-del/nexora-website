import { createContext } from 'react'

export const AuthContext = createContext({
  user: null,
  role: 'user',
  isAdmin: false,
  loading: true,
  firebaseEnabled: true,
})

