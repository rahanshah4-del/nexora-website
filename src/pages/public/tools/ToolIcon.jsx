const ICON_PATHS = {
  invoice: <><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
  thermal: <><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  letterhead: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M5 7.5h14M5 17.5h14M8 11h8M8 14h5" /></>,
  quotation: <><path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M9 8h6M9 12h6" /><path d="m9.5 16.5 1.5 1.5 3-3" /></>,
  gst: <><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 11h5M9 14h3.5a2 2 0 0 0 0-4M9 17l4-3" /></>,
  contractor: <><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5Z" /></>,
  cis: <><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 12h6M9 17h3M14 16.5h3" /></>,
  uae: <><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 12h6M9 17h3M14 16.5h3" /></>,
  paystub: <><rect x="3.5" y="6" width="17" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 9.5h.01M17.5 14.5h.01" /></>,
  pakistan: <><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 17h6" /><path d="M13.2 10.6a2.4 2.4 0 1 0 0 3.6 3 3 0 0 1 0-3.6Z" /><path d="m14.8 11.2.3.7.7.1-.5.5.1.7-.6-.3-.6.3.1-.7-.5-.5.7-.1Z" /></>,
  proforma: <><path d="M7 3h7l5 5v5M6 8v12a1 1 0 0 0 1 1h5" /><path d="M14 3v5h5M9 12h4M9 16h2" /><circle cx="17" cy="17.5" r="3.5" /><path d="M17 15.7v1.9l1.2.8" /></>,
  deliverynote: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  purchaseorder: <><path d="M3 4h2.5l1.8 9.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6.2" /><circle cx="9.5" cy="18.5" r="1.4" /><circle cx="16.5" cy="18.5" r="1.4" /></>,
  book: <><path d="M12 6.6C10.4 5.3 8.2 4.7 5.2 4.7a.9.9 0 0 0-.9.9v11.7c0 .5.4.9.9.9 3 0 5.2.5 6.8 1.8" /><path d="M12 6.6c1.6-1.3 3.8-1.9 6.8-1.9.5 0 .9.4.9.9v11.7c0 .5-.4.9-.9.9-3 0-5.2.5-6.8 1.8" /><path d="M12 6.6v12.1" /></>,
  chevronr: <path d="m9.5 6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  building: <><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18" /><path d="M8 8h3M8 12h3M8 16h3" /></>,
}

/** Inline SVG icons for the free tools pages and the homepage tools section. */
export default function ToolIcon({ name, className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICON_PATHS[name]}
    </svg>
  )
}

