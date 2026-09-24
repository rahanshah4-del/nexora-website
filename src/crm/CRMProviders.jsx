import { ThemeProvider } from './context/ThemeContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { WorkspaceCurrencyProvider } from './context/WorkspaceCurrencyContext.jsx'

export default function CRMProviders({ children }) {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <AuthProvider>
          <UserProvider>
            <WorkspaceCurrencyProvider>{children}</WorkspaceCurrencyProvider>
          </UserProvider>
        </AuthProvider>
      </PreferencesProvider>
    </ThemeProvider>
  )
}
