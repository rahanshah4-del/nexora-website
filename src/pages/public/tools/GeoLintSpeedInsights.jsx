import { formatMetric } from '../../../lib/geolintSpeed.js'

function Block({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <p className="text-[14px] font-bold text-slate-950">{title}</p>
      {hint ? <p className="mt-0.5 text-[12.5px] leading-5 text-slate-500">{hint}</p> : null}
      <div className="mt-2.5">{children}</div>
    </div>
  )
}
const Code = ({ children }) => <code className="block break-all rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] leading-5 text-slate-800">{children}</code>

/** The real reasons the page is slow: biggest element, what jumps, third-party scripts and files that block painting. */
export function CausesPanel({ causes }) {
  if (!causes) return null
  const { lcpElement, lcpPhases = [], shifts = [], thirdParty = [], blocking = [] } = causes
  const maxPhase = Math.max(1, ...lcpPhases.map((p) => p.ms))
  return (
    <div className="mt-5">
      <h3 className="text-[15px] font-bold text-slate-950">The real reason it is slow</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {lcpElement ? (
          <Block title="Slowest big element" hint="This is the thing Google waits for before it counts your page as loaded.">
            <Code>{lcpElement.snippet || lcpElement.label}</Code>
            {lcpPhases.length ? (
              <ul className="mt-2.5 space-y-1.5">
                {lcpPhases.map((p) => (
                  <li key={p.phase} className="text-[12px] text-slate-600">
                    <span className="flex justify-between gap-2"><span>{p.phase}</span><span className="tabular-nums font-semibold">{formatMetric('lcpMs', p.ms)}</span></span>
                    <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.max(2, (p.ms / maxPhase) * 100)}%` }} /></span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Block>
        ) : null}
        {shifts.length ? (
          <Block title="What jumps while loading" hint="These elements move after they appear, which makes visitors tap the wrong thing.">
            <ul className="space-y-2">{shifts.map((s, i) => <li key={i}><Code>{s.snippet || s.label}</Code>{s.score !== null ? <span className="mt-0.5 block text-[11.5px] text-slate-500">Shift {s.score}</span> : null}</li>)}</ul>
          </Block>
        ) : null}
        {thirdParty.length ? (
          <Block title="Outside scripts that slow you down" hint="Ads, chat, analytics and fonts from other companies. Blocking time is how long they freeze the page.">
            <ul className="divide-y divide-slate-100">
              {thirdParty.map((t) => (
                <li key={t.name} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
                  <span className="min-w-0 break-words font-semibold text-slate-800">{t.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">{t.blockingMs ? `${t.blockingMs} ms blocking` : `${t.mainThreadMs} ms`}</span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}
        {blocking.length ? (
          <Block title="Files that hold back the first paint" hint="The browser must download these before it can show anything.">
            <ul className="divide-y divide-slate-100">
              {blocking.map((b) => (
                <li key={b.url} className="flex items-baseline justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="min-w-0 break-all text-slate-800">{b.url}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">{[b.ms ? `${b.ms} ms` : '', b.kb ? `${b.kb} KB` : ''].filter(Boolean).join(' / ')}</span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}
      </div>
    </div>
  )
}

const mb = (kb) => (kb >= 1024 ? `${Math.round(kb / 102.4) / 10} MB` : `${kb} KB`)
/** Big images, old formats, unused code, missing compression and weak caching, with the worst files named. */
export function FixesPanel({ fixes }) {
  if (!fixes?.length) return null
  return (
    <div className="mt-5">
      <h3 className="text-[15px] font-bold text-slate-950">Image and file fixes</h3>
      <ul className="mt-2 space-y-2">
        {fixes.map((f) => (
          <li key={f.id} className="rounded-xl border border-slate-200 p-3 text-[14px] leading-6 text-slate-800">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 font-semibold">{f.label} <span className="font-normal text-slate-500">({f.count} {f.count === 1 ? 'file' : 'files'})</span></span>
              <span className="shrink-0 text-right text-[12.5px] font-semibold text-emerald-700">{[f.savingsKb ? `save ${mb(f.savingsKb)}` : '', f.savingsMs ? `~${formatMetric('lcpMs', f.savingsMs)}` : ''].filter(Boolean).join(' / ')}</span>
            </div>
            {f.files.length ? <p className="mt-0.5 break-all text-[12px] leading-5 text-slate-500">{f.files.join(', ')}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
