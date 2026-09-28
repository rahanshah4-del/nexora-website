import { useMemo, useState } from 'react'
import { CALLING_CODES, joinPhone, regionForLocale, splitPhone } from '../ui/share.js'
import { Field, inputBase } from './fields.jsx'
import Icon from './Icon.jsx'

const flag = (region) => String.fromCodePoint(...[...region].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))

function regionName(region) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(region) || region
  } catch {
    return region
  }
}

/**
 * Phone with a country calling code, stored as "+CC national" so WhatsApp
 * links can target the number (wa.me/<E.164 digits>). Typing a full "+…"
 * number also works; the picker then follows it.
 */
export default function PhoneField({ label = 'Phone', path, value, onChange, locale }) {
  const preferred = regionForLocale(locale)
  const [picked, setPicked] = useState(null)
  // A manual pick wins for shared codes (+1 US/CA, +7 RU/KZ).
  const parsed = splitPhone(value, picked || preferred)
  const region = parsed.region || picked || preferred || 'US'
  const code = CALLING_CODES.find(([r]) => r === region)?.[1] || ''
  const options = useMemo(
    () => CALLING_CODES.map(([r, c]) => ({ region: r, code: c, name: regionName(r) })).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )
  const national = parsed.region ? parsed.national : String(value || '')
  return (
    <Field label={label} path={path}>
      {({ borderClass, ...wiring }) => (
        <div className="flex min-w-0 gap-2">
          <div className={`relative flex h-[44px] shrink-0 items-center gap-1 rounded-xl border bg-white px-2.5 text-sm text-slate-800 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 ${borderClass}`}>
            <span aria-hidden="true">{flag(region)}</span>
            <span aria-hidden="true" className="tabular-nums">+{code}</span>
            <Icon name="chevronDown" className="h-3.5 w-3.5 text-slate-400" />
            <select
              aria-label="Country calling code"
              value={region}
              onChange={(e) => {
                setPicked(e.target.value)
                if (national.trim()) onChange(joinPhone(e.target.value, national.replace(/^\+\d+\s*/, '')))
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              data-analytics-ignore
            >
              {options.map((o) => <option key={o.region} value={o.region}>{`${flag(o.region)} ${o.name} (+${o.code})`}</option>)}
            </select>
          </div>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={national}
            onChange={(e) => onChange(e.target.value.trim().startsWith('+') ? e.target.value : joinPhone(region, e.target.value))}
            placeholder="Mobile number"
            className={`${inputBase} ${borderClass}`}
            {...wiring}
          />
        </div>
      )}
    </Field>
  )
}
