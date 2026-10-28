/**
 * Accepted card / wallet marks for checkout pages. Inline SVG (no network call, always crisp).
 * Simplified acceptance marks, one white badge each.
 */
const BOX = 'grid h-8 w-[52px] place-items-center rounded-md bg-white ring-1 ring-[#e5e5ea]'

function Visa() {
  return <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true"><text x="26" y="21.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontStyle="italic" fontWeight="900" fontSize="15" letterSpacing="-0.5" fill="#1a1f71">VISA</text></svg>
}
function Mastercard() {
  return <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true"><circle cx="20.5" cy="16" r="8.5" fill="#eb001b" /><circle cx="31.5" cy="16" r="8.5" fill="#f79e1b" /><path d="M26 9.4a8.5 8.5 0 0 1 0 13.2 8.5 8.5 0 0 1 0-13.2z" fill="#ff5f00" /></svg>
}
function Amex() {
  return <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true"><rect x="6" y="6" width="40" height="20" rx="3" fill="#2e77bb" /><text x="26" y="20.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="9.5" letterSpacing="0.4" fill="#fff">AMEX</text></svg>
}
function Discover() {
  return <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true"><text x="22" y="18.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="5.6" fill="#231f20">DISCOVER</text><circle cx="44" cy="16" r="3.6" fill="#f58220" /></svg>
}
function Jcb() {
  return <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true"><rect x="12" y="7" width="8" height="18" rx="3" fill="#0e4c96" /><rect x="22" y="7" width="8" height="18" rx="3" fill="#e21836" /><rect x="32" y="7" width="8" height="18" rx="3" fill="#00a94f" /><text x="16" y="19.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="7" fill="#fff">J</text><text x="26" y="19.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="7" fill="#fff">C</text><text x="36" y="19.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="7" fill="#fff">B</text></svg>
}
function UnionPay() {
  return <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true"><path d="M13 7h10l-3 18H10z" fill="#e21836" /><path d="M21 7h10l-3 18H18z" fill="#00447c" /><path d="M29 7h10l-3 18H26z" fill="#007b84" /><text x="26" y="19.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="5" fill="#fff">UnionPay</text></svg>
}
function Diners() {
  return <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true"><circle cx="26" cy="16" r="9.5" fill="#0079be" /><circle cx="26" cy="16" r="6.6" fill="#fff" /><path d="M23.2 11.2a5.2 5.2 0 0 0 0 9.6zM28.8 20.8a5.2 5.2 0 0 0 0-9.6z" fill="#0079be" /></svg>
}
function ApplePay() {
  return (
    <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true">
      <g transform="translate(9 8.5) scale(0.68)"><path fill="#000" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></g>
      <text x="29" y="20.2" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="9.5" fill="#000">Pay</text>
    </svg>
  )
}
function GooglePay() {
  return (
    <svg viewBox="0 0 52 32" className="h-full w-full" aria-hidden="true">
      <g transform="translate(8 9) scale(0.29)">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </g>
      <text x="25" y="20.2" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="9.5" fill="#5f6368">Pay</text>
    </svg>
  )
}

const PAYMENT_LOGOS = [
  { name: 'Visa', Logo: Visa },
  { name: 'Mastercard', Logo: Mastercard },
  { name: 'American Express', Logo: Amex },
  { name: 'Discover', Logo: Discover },
  { name: 'JCB', Logo: Jcb },
  { name: 'UnionPay', Logo: UnionPay },
  { name: 'Diners Club', Logo: Diners },
  { name: 'Apple Pay', Logo: ApplePay },
  { name: 'Google Pay', Logo: GooglePay },
]

export default function PaymentLogos({ className = '' }) {
  return (
    <ul className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`} aria-label="Accepted payment methods">
      {PAYMENT_LOGOS.map(({ name, Logo }) => (
        <li key={name} className={BOX} title={name} role="img" aria-label={name}><Logo /></li>
      ))}
    </ul>
  )
}
