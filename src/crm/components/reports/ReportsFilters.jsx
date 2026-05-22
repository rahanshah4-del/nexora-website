import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { supportedCurrencies } from '../../data/currency.js'

const dateRanges = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
]

const statusOptions = ['All', 'Live', 'Empty']

export default function ReportsFilters({ value, onChange, reportTypes }) {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <Select value={value.dateRange} onChange={(e) => onChange({ ...value, dateRange: e.target.value })}>
        {dateRanges.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>

      <Select value={value.reportType} onChange={(e) => onChange({ ...value, reportType: e.target.value })}>
        <option value="All">All report types</option>
        {reportTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>

      <Select value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })}>
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            Status: {s}
          </option>
        ))}
      </Select>

      <Select value={value.currency} onChange={(e) => onChange({ ...value, currency: e.target.value })}>
        {supportedCurrencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </Select>

      <Input
        placeholder="Search reports…"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
      />
    </div>
  )
}

