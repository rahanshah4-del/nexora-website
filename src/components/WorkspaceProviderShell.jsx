import AuthProvider from '../context/AuthProvider.jsx'
import { LanguageProvider } from '../lib/i18n.jsx'
import AppErrorBoundary from './AppErrorBoundary.jsx'
import CRMProviders from '../crm/CRMProviders.jsx'
import GlobalConfirmDialog from '../crm/components/ui/GlobalConfirmDialog.jsx'
import GlobalToast from '../crm/components/ui/GlobalToast.jsx'

// Provider stack for the /workspace route. WorkspaceSelection depends on the
// ROOT AuthProvider (its own useAuth) AND the CRM UserProvider stack, because it
// renders the support-tickets widget (useSupportTickets -> useUser /
// useWorkspaceAccess). Root-auth-only routes use RootAuthProviderShell instead;
// this shell simply nests the CRM providers inside so both contexts are present.
export default function WorkspaceProviderShell({ children }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppErrorBoundary>
          <CRMProviders>
            {children}
            <GlobalConfirmDialog />
            <GlobalToast />
          </CRMProviders>
        </AppErrorBoundary>
      </LanguageProvider>
    </AuthProvider>
  )
}
