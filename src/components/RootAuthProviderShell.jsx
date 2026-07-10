import AuthProvider from '../context/AuthProvider.jsx'
import { LanguageProvider } from '../lib/i18n.jsx'
import AppErrorBoundary from './AppErrorBoundary.jsx'

export default function RootAuthProviderShell({ children }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </LanguageProvider>
    </AuthProvider>
  )
}
