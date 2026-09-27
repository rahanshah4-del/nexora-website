/**
 * Docs Studio entry — the lazily-loaded chunk. Never rendered on the server:
 * the page mounts it only after hydration (see InvoiceGeneratorPage.jsx), so
 * the engine, Dexie and the editor stay out of the SSR output and the rest of
 * the site's bundles.
 */

import '../templates/paper.css'
import './studio.css'
import { useStudioBoot } from '../ui/useStudioBoot.js'
import StudioApp from './StudioApp.jsx'

export default function Studio({ fallback = null }) {
  const boot = useStudioBoot()
  if (boot.status === 'loading') return fallback
  if (boot.status === 'error') {
    return (
      <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="font-display text-lg font-semibold text-slate-900">The editor could not start</p>
        <p className="mt-2 text-sm text-slate-600">{boot.error?.message || 'Something went wrong while opening local storage.'} Reload the page to try again.</p>
      </div>
    )
  }
  return <StudioApp boot={boot} />
}
