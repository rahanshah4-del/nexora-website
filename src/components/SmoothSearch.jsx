import { useRef } from 'react'

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'

const SIZES = {
  sm: 'h-10 text-[13px]',
  md: 'h-12 text-[15px]',
  lg: 'h-14 text-[16px] sm:text-[17px]',
}

/**
 * The site-wide search field: a pill with a slow, eased focus animation
 * (glow ring, lift, icon tint) and a clear button that fades in once there is text.
 * Controlled: pass `value` and an `onChange` that reads `event.target.value`.
 */
export default function SmoothSearch({
  value,
  onChange,
  placeholder = 'Search',
  size = 'md',
  id,
  ariaLabel,
  className = '',
  inputRef,
  ...inputProps
}) {
  const localRef = useRef(null)
  const ref = inputRef || localRef
  const hasValue = String(value ?? '').length > 0

  function clear() {
    onChange?.({ target: { value: '' } })
    ref.current?.focus()
  }

  return (
    <div
      className={`group relative flex w-full items-center rounded-full border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-14px_rgba(15,23,42,0.18)] transition-[box-shadow,border-color,transform] duration-500 ${EASE} focus-within:-translate-y-px focus-within:border-[#0071e3]/50 focus-within:shadow-[0_0_0_4px_rgba(0,113,227,0.12),0_18px_40px_-16px_rgba(0,113,227,0.4)] motion-reduce:transition-none motion-reduce:focus-within:translate-y-0 ${SIZES[size] || SIZES.md} ${className}`}
    >
      <svg
        className={`pointer-events-none absolute left-4 z-10 h-[18px] w-[18px] text-slate-400 transition-[color,transform] duration-500 ${EASE} group-focus-within:scale-110 group-focus-within:text-[#0071e3] motion-reduce:transition-none`}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" />
      </svg>
      <input
        ref={ref}
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className={`h-full w-full min-w-0 rounded-full bg-transparent pl-12 pr-12 text-slate-900 outline-none transition-colors duration-500 placeholder:text-slate-400 placeholder:transition-colors placeholder:duration-500 focus:placeholder:text-slate-300 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden`}
        {...inputProps}
      />
      <button
        type="button"
        onClick={clear}
        tabIndex={hasValue ? 0 : -1}
        aria-label="Clear search"
        aria-hidden={!hasValue}
        className={`absolute right-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition-[opacity,transform,background-color] duration-500 ${EASE} hover:bg-slate-200 active:scale-90 motion-reduce:transition-none ${hasValue ? 'scale-100 opacity-100' : 'pointer-events-none scale-50 opacity-0'}`}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
  )
}
