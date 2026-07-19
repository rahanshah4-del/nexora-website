import { useMultiCurrency } from '../context/MultiCurrencyProvider.jsx'
import { SUPPORTED_CURRENCIES } from '../lib/multiCurrency.js'

const CURRENCY_LABELS = {
  PKR: '₨ PKR',
  USD: '$ USD',
  AED: 'AED',
  SAR: 'SAR',
  INR: '₹ INR',
  GBP: '£ GBP',
  EUR: '€ EUR',
}

/**
 * Compact currency selector — pill-style dropdown matching the billing-cycle toggle.
 * Shows auto-detected indicator (green dot) when currency was detected automatically.
 */
export default function PricingCurrencySelector() {
  const { currency, setCurrency, isAutoDetected } = useMultiCurrency()

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-[0_18px_46px_-34px_rgba(15,23,42,0.45)]">
      {isAutoDetected && (
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
          title="Currency auto-detected from your location"
        />
      )}
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="cursor-pointer border-none bg-transparent text-sm font-bold text-slate-700 outline-none"
        aria-label="Select currency"
      >
        {SUPPORTED_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {CURRENCY_LABELS[code] || code}
          </option>
        ))}
      </select>
    </div>
  )
}
