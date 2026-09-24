import Select from '../ui/Select.jsx'
import { currencyOptionCodes, getActiveCurrencyCode } from '../../lib/workspaceCurrency.js'

export default function CurrencySelector({ value, onChange, className, disabled }) {
  return (
    <Select className={className} value={value || getActiveCurrencyCode()} onChange={(e) => onChange?.(e.target.value)} disabled={disabled}>
      {currencyOptionCodes(value).map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  )
}
