import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'

export const REPORT_DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom' },
]

function fieldEnabled(supportedFilters = [], key) {
  return supportedFilters.includes(key)
}

function optionRows(options, key, fallback = []) {
  const rows = options?.[key] || fallback
  return Array.isArray(rows) ? rows : []
}

function normalizeOptions(rows) {
  return rows.map((item) => (typeof item === 'string' ? { value: item, label: item } : item))
}

function FilterField({ label, children }) {
  return (
    <label className="min-w-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export default function ReportFilters({
  supportedFilters = [],
  values = {},
  options = {},
  onChange,
  onReset,
  className = '',
}) {
  const datePreset = values.datePreset || 'today'
  const showCustomDates = fieldEnabled(supportedFilters, 'datePreset') && datePreset === 'custom'

  function update(key, value) {
    onChange?.(key, value)
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {fieldEnabled(supportedFilters, 'datePreset') ? (
          <FilterField label="Date preset">
            <Select value={datePreset} onChange={(event) => update('datePreset', event.target.value)}>
              {REPORT_DATE_PRESETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </FilterField>
        ) : null}

        {showCustomDates && fieldEnabled(supportedFilters, 'startDate') ? (
          <FilterField label="Start date">
            <Input type="date" value={values.startDate || ''} onChange={(event) => update('startDate', event.target.value)} />
          </FilterField>
        ) : null}

        {showCustomDates && fieldEnabled(supportedFilters, 'endDate') ? (
          <FilterField label="End date">
            <Input type="date" value={values.endDate || ''} onChange={(event) => update('endDate', event.target.value)} />
          </FilterField>
        ) : null}

        {fieldEnabled(supportedFilters, 'orderType') ? (
          <FilterField label="Order type">
            <Select value={values.orderType || 'All'} onChange={(event) => update('orderType', event.target.value)}>
              {normalizeOptions(optionRows(options, 'orderType', ['All'])).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </FilterField>
        ) : null}

        {fieldEnabled(supportedFilters, 'paymentMethod') ? (
          <FilterField label="Payment method">
            <Select value={values.paymentMethod || 'All'} onChange={(event) => update('paymentMethod', event.target.value)}>
              {normalizeOptions(optionRows(options, 'paymentMethod', ['All'])).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </FilterField>
        ) : null}

        {fieldEnabled(supportedFilters, 'paymentStatus') ? (
          <FilterField label="Payment status">
            <Select value={values.paymentStatus || 'All'} onChange={(event) => update('paymentStatus', event.target.value)}>
              {normalizeOptions(optionRows(options, 'paymentStatus', ['All', 'paid', 'partial', 'due'])).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </FilterField>
        ) : null}

        {fieldEnabled(supportedFilters, 'orderStatus') ? (
          <FilterField label="Order status">
            <Select value={values.orderStatus || 'All'} onChange={(event) => update('orderStatus', event.target.value)}>
              {normalizeOptions(optionRows(options, 'orderStatus', ['All', 'pending', 'preparing', 'ready', 'served', 'cancelled'])).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </FilterField>
        ) : null}

        {fieldEnabled(supportedFilters, 'source') ? (
          <FilterField label="Source">
            <Select value={values.source || 'All'} onChange={(event) => update('source', event.target.value)}>
              {normalizeOptions(optionRows(options, 'source', ['All', 'restaurant', 'invoice'])).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </FilterField>
        ) : null}

        {fieldEnabled(supportedFilters, 'table') ? (
          <FilterField label="Table">
            <Select value={values.table || 'All'} onChange={(event) => update('table', event.target.value)}>
              {normalizeOptions(optionRows(options, 'table', ['All'])).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </FilterField>
        ) : null}

        {fieldEnabled(supportedFilters, 'customerSearch') ? (
          <FilterField label="Search customer">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={values.customerSearch || ''}
                placeholder="Search by name or phone..."
                onChange={(event) => update('customerSearch', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-1 focus:ring-sky-200"
              />
            </div>
          </FilterField>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400">
          {fieldEnabled(supportedFilters, 'customerSearch') && values.customerSearch ? (
            <>Searching: <span className="text-sky-600">"{values.customerSearch}"</span></>
          ) : null}
        </span>
        <Button type="button" variant="subtle" onClick={onReset}>Reset filters</Button>
      </div>
    </div>
  )
}
