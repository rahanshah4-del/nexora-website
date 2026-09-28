import { useId } from 'react'
import { DEFAULT_MESSAGE_TEMPLATE, MESSAGE_PLACEHOLDERS, messageContext, renderShareMessage } from '../../ui/share.js'
import { useStudio } from '../../ui/StudioContext.js'
import SectionCard from '../SectionCard.jsx'

/** The WhatsApp / email message, with placeholders and a live preview. Saved on this device. */
export default function ShareMessageSection() {
  const { previewDocument, totals, messageTemplate, commands } = useStudio()
  const id = useId()
  const template = messageTemplate || DEFAULT_MESSAGE_TEMPLATE
  const preview = renderShareMessage(template, messageContext(previewDocument, totals, { link: `${typeof window === 'undefined' ? '' : window.location.origin}/tools/invoice/view/#…` }))
  return (
    <SectionCard id="message" title="WhatsApp & email message" icon="whatsapp" summary={template.split('\n')[0]}>
      <div className="space-y-3">
        <div>
          <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-600">Message</label>
          <textarea
            id={id}
            rows={4}
            maxLength={1000}
            value={template}
            onChange={(e) => commands.setMessageTemplate(e.target.value)}
            className="ds-autosize block w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            data-testid="message-template"
          />
          <p className="mt-1 text-xs text-slate-500">
            Placeholders: {MESSAGE_PLACEHOLDERS.map((p) => <code key={p} className="mr-1 rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700">{p}</code>)}
            {' '}{'{link}'} adds a view link when the document is small enough.
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold text-slate-500">Preview</p>
          <p className="whitespace-pre-line text-sm text-slate-700" data-testid="message-preview">{preview}</p>
        </div>
        {messageTemplate && messageTemplate !== DEFAULT_MESSAGE_TEMPLATE ? (
          <button type="button" onClick={() => commands.setMessageTemplate('')} className="min-h-[44px] rounded-lg px-2 text-sm font-semibold text-brand hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            Reset to the default message
          </button>
        ) : null}
      </div>
    </SectionCard>
  )
}
