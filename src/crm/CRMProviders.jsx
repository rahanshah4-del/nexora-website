import { ThemeProvider } from './context/ThemeContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { UserProvider } from './context/UserContext.jsx'

export default function CRMProviders({ children }) {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <AuthProvider>
          <UserProvider>{children}</UserProvider>
        </AuthProvider>
      </PreferencesProvider>
    </ThemeProvider>
  )
}
