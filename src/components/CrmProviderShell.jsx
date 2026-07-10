import CRMProviders from '../crm/CRMProviders.jsx'
import { LanguageProvider } from '../lib/i18n.jsx'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import GlobalConfirmDialog from '../crm/components/ui/GlobalConfirmDialog.jsx'
import GlobalToast from '../crm/components/ui/GlobalToast.jsx'

export default function CrmProviderShell({ children }) {
  return (
    <CRMProviders>
      <LanguageProvider>
        <AppErrorBoundary>
          {children}
          <GlobalConfirmDialog />
          <GlobalToast />
        </AppErrorBoundary>
      </LanguageProvider>
    </CRMProviders>
  )
}
