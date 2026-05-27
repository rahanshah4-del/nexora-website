import Select from '../ui/Select.jsx'

const currencies = ['PKR', 'AED', 'SAR', 'USD', 'INR']

export default function CurrencySelector({ value, onChange, className }) {
  return (
    <Select className={className} value={value} onChange={(e) => onChange?.(e.target.value)}>
      {currencies.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  )
}
