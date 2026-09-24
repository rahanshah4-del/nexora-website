import { useContext } from 'react'
import WorkspaceCurrencyContext from '../context/WorkspaceCurrencyContext.jsx'

// Key that changes when the workspace currency or its symbol changes. Use it
// as the `key` of page content so open pages re-render in the new currency.
export function useWorkspaceCurrencyKey() {
  return useContext(WorkspaceCurrencyContext)
}
