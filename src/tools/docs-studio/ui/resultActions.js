/**
 * The result screen's actions, in bar order. Each one is "live" when
 * useResultActions() returns a handler for its id, otherwise it renders in its
 * "Coming next" state. Step 3B only adds handlers here (PDF, Excel, WhatsApp,
 * email, share link); the bar, the mobile sheet and the advanced editor's
 * toolbar pick them up without layout changes.
 */

import { useMemo } from 'react'
import { useStudio } from './StudioContext.js'

export const RESULT_ACTIONS = Object.freeze([
  { id: 'pdf', label: 'Download PDF', short: 'PDF', icon: 'download', primary: true },
  { id: 'excel', label: 'Excel', icon: 'table' },
  { id: 'print', label: 'Print', icon: 'printer' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'link', label: 'Copy link', icon: 'link' },
  { id: 'edit', label: 'Edit', icon: 'pencil' },
])

/** @returns {Record<string, () => void>} handlers for the live actions */
export function useResultActions() {
  const { commands, setView, setWizardStep } = useStudio()
  return useMemo(() => ({
    pdf: commands.downloadPdf,
    print: commands.print,
    edit: () => {
      setWizardStep(2)
      setView('wizard')
    },
  }), [commands.downloadPdf, commands.print, setView, setWizardStep])
}

/** Toast for an action that is not wired up yet. */
export function comingNext(toast, action) {
  toast(`${action.label} is coming next. Use Print → Save as PDF for now.`, 'info')
}
