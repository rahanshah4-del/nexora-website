import { useState } from 'react'
import { fieldId } from '../ui/issues.js'
import { TextArea } from './fields.jsx'
import Icon from './Icon.jsx'

/**
 * Optional second line under an item ("Details"): a small "Add description"
 * button that opens a text box. It stays open while it has text, and folds
 * back into the button when you leave it empty.
 */
export default function LineDetails({ index, path, value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const shown = open || Boolean(value)
  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => document.getElementById(fieldId(path))?.focus())
        }}
        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-1.5 text-xs font-semibold text-brand hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`}
        aria-label={`Add a description under item ${index + 1}`}
      >
        <Icon name="plus" className="h-3.5 w-3.5" />Add description
      </button>
    )
  }
  return (
    <div className={`ds-row-enter ${className}`}>
      <TextArea
        label={`Item ${index + 1} extra description`}
        labelClassName="sr-only"
        path={path}
        value={value}
        onChange={onChange}
        onBlur={() => { if (!value) setOpen(false) }}
        rows={2}
        placeholder="Add a description (optional), shown under the item on the invoice"
      />
    </div>
  )
}
