import AuthProvider from '../context/AuthProvider.jsx'
import CRMProviders from '../crm/CRMProviders.jsx'
import { LanguageProvider } from '../lib/i18n.jsx'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import GlobalConfirmDialog from '../crm/components/ui/GlobalConfirmDialog.jsx'
import GlobalToast from '../crm/components/ui/GlobalToast.jsx'
import AppRouter from '../AppRouter.jsx'

export default function AppProviders() {
  return (
    <AuthProvider>
      <CRMProviders>
        <LanguageProvider>
          <AppErrorBoundary>
            <AppRouter />
            <GlobalConfirmDialog />
            <GlobalToast />
          </AppErrorBoundary>
        </LanguageProvider>
      </CRMProviders>
    </AuthProvider>
  )
}
