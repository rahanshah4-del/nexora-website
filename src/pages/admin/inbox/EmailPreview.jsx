import { useMemo } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'
import { renderPlainMessage } from '../../../../workers/shared/emailTemplate.js'
import { pickSender } from '../../../../workers/shared/senders.js'

/** Shows the exact branded email the customer will get (same code the Worker uses to send it). */
export default function EmailPreview({ text, ticketId = '', subject = '', status = '', senderId = 'support', onClose }) {
  const html = useMemo(() => {
    const sender = pickSender(senderId)
    return renderPlainMessage(text, { ticketId, subject, status, signature: sender?.signature, executive: sender?.executive }).html
  }, [text, ticketId, subject, status, senderId])
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Email preview" onClick={onClose} onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Email preview <span className="font-semibold text-slate-400">as your customer sees it</span></h3><button type="button" onClick={onClose} aria-label="Close preview" autoFocus className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><HiOutlineXMark className="h-4 w-4" /></button></div>
        <iframe title="Email preview" srcDoc={html} sandbox="" className="h-[70vh] w-full bg-slate-100" />
      </div>
    </div>
  )
}
