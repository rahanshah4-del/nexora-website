import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'

export default function ActivityFilters({ value, onChange, userOptions, moduleOptions }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Input
        placeholder="Search logs…"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
      />
      <Select value={value.user} onChange={(e) => onChange({ ...value, user: e.target.value })}>
        <option value="All">All Users</option>
        {userOptions.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </Select>
      <Select value={value.module} onChange={(e) => onChange({ ...value, module: e.target.value })}>
        <option value="All">All Modules</option>
        {moduleOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
        <Input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  )
}

