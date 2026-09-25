import { useId, useState } from 'react'
import { HiOutlineChevronDown } from 'react-icons/hi2'

// Inset outline so the ring stays inside the rounded, overflow-hidden list.
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500'

/** Accessible accordion: each question is a button with aria-expanded/aria-controls. */
export default function FaqAccordion({ items }) {
  const baseId = useId()
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map((item, index) => {
        const open = openIndex === index
        const buttonId = `${baseId}-q${index}`
        const panelId = `${baseId}-a${index}`
        return (
          <div key={item.question} className={index ? 'border-t border-slate-200' : ''}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? -1 : index)}
                className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-slate-900 transition hover:bg-slate-50 sm:px-6 ${FOCUS_RING}`}
              >
                <span>{item.question}</span>
                <HiOutlineChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="px-5 pb-5 text-sm leading-6 text-slate-600 sm:px-6">
              {item.answer}
            </div>
          </div>
        )
      })}
    </div>
  )
}
