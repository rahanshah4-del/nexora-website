/**
 * One illustration per temp-mail guide, drawn from the guide's own subject so the nine pages do not
 * share a single look. Every visual is plain HTML (no images), readable by screen readers, and any
 * example numbers are labelled as made up. Data lives in each guide's `visual` field.
 */
import { useEffect, useRef, useState } from 'react'


function Frame({ label, note, children }) {
  return (
    <figure className="tv" aria-label={label}>
      {children}
      {note ? <figcaption className="tv-note">{note}</figcaption> : null}
    </figure>
  )
}

function Anatomy({ visual }) {
  return (
    <Frame label="The parts of an email address" note={visual.note}>
      <p className="tv-address" aria-hidden="true">
        <span className="tv-part is-a">{visual.name}</span><span className="tv-at">@</span><span className="tv-part is-b">{visual.domain}</span>
      </p>
      <ul className="tv-parts">
        {visual.parts.map((p) => <li key={p.label}><strong>{p.label}</strong><span>{p.text}</span></li>)}
      </ul>
    </Frame>
  )
}

function Ladder({ visual }) {
  return (
    <Frame label={visual.label} note={visual.note}>
      <ol className="tv-ladder">
        {visual.steps.map((s, i) => (
          <li key={s.title} style={{ '--tv-step': i / (visual.steps.length - 1) }}>
            <span className="tv-ladder-bar" aria-hidden="true" />
            <strong>{s.title}</strong>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
    </Frame>
  )
}

function Flow({ visual }) {
  return (
    <Frame label={visual.label} note={visual.note}>
      <div className="tv-mail" aria-label="Sample message">
        <span className="tv-mail-from">{visual.from}</span>
        <span className="tv-mail-subject">{visual.subject}</span>
        <span className="tv-mail-code">{visual.code}</span>
      </div>
      <ol className="tv-flow">
        {visual.steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </Frame>
  )
}

function Timeline({ visual }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return undefined
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Frame label={visual.label} note={visual.note}>
      <ol ref={ref} className={`tv-timeline${seen ? ' is-in' : ''}`}>
        {visual.marks.map((m) => (
          <li key={m.at} className={m.bad ? 'is-bad' : ''} style={{ '--tv-at': m.pos }}>
            <span className="tv-dot" aria-hidden="true" />
            <strong>{m.at}</strong>
            <span>{m.text}</span>
          </li>
        ))}
      </ol>
    </Frame>
  )
}

function Questions({ visual }) {
  return (
    <Frame label={visual.label} note={visual.note}>
      <ul className="tv-cards">
        {visual.cards.map((c) => (
          <li key={c.q} className={`is-${c.tone}`}>
            <span className="tv-q">{c.q}</span>
            <strong>{c.a}</strong>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

function Strictness({ visual }) {
  return (
    <Frame label={visual.label} note={visual.note}>
      <ol className="tv-strict">
        {visual.steps.map((s, i) => (
          <li key={s} style={{ '--tv-level': i + 1 }}><span aria-hidden="true">{i + 1}</span>{s}</li>
        ))}
      </ol>
      <p className="tv-axis" aria-hidden="true"><span>{visual.from}</span><span>{visual.to}</span></p>
    </Frame>
  )
}

function Versus({ visual }) {
  return (
    <Frame label={visual.label} note={visual.note}>
      <div className="tv-versus">
        {visual.sides.map((s) => (
          <div key={s.title}>
            <h3>{s.title}</h3>
            <ul>{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function TestRun({ visual }) {
  return (
    <Frame label={visual.label} note={visual.note}>
      <table className="tv-run">
        <caption className="sr-only">{visual.label}</caption>
        <thead><tr><th scope="col">Flow</th><th scope="col">Result</th><th scope="col">Arrived after</th></tr></thead>
        <tbody>
          {visual.rows.map((r) => (
            <tr key={r.flow} className={r.warn ? 'is-warn' : ''}>
              <th scope="row">{r.flow}</th>
              <td>{r.warn ? 'Check' : 'Pass'}</td>
              <td>{r.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Frame>
  )
}

function Decision({ visual }) {
  return (
    <Frame label={visual.label} note={visual.note}>
      <p className="tv-ask">{visual.question}</p>
      <div className="tv-branches">
        {visual.branches.map((b) => (
          <div key={b.answer}><span>{b.answer}</span><strong>{b.use}</strong></div>
        ))}
      </div>
    </Frame>
  )
}

const KINDS = { anatomy: Anatomy, ladder: Ladder, flow: Flow, timeline: Timeline, questions: Questions, strictness: Strictness, versus: Versus, testrun: TestRun, decision: Decision }

export default function GuideVisual({ visual }) {
  const Kind = visual && KINDS[visual.kind]
  return Kind ? <Kind visual={visual} /> : null
}
