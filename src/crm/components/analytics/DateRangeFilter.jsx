import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

const ranges = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
]

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Badge variant="default">Range</Badge>
      {ranges.map((r) => (
        <Button
          key={r.id}
          variant={value === r.id ? 'primary' : 'subtle'}
          className="min-w-10 rounded-2xl px-3 py-2 text-xs"
          type="button"
          onClick={() => onChange?.(r.id)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  )
}
