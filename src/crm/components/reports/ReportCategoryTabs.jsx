import Button from '../ui/Button.jsx'

const categories = ['All', 'Sales', 'Customers', 'Finance', 'Team', 'Support', 'Subscriptions', 'Activity', 'System']

export default function ReportCategoryTabs({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <Button
          key={c}
          type="button"
          variant={value === c ? 'subtle' : 'ghost'}
          className="rounded-2xl"
          onClick={() => onChange(c)}
        >
          {c}
        </Button>
      ))}
    </div>
  )
}

