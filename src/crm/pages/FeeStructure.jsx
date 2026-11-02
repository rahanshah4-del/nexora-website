import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlinePlusCircle, HiOutlineTrash } from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import PageSearch from '../components/ui/PageSearch.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useFeeStructure } from '../hooks/useFeeStructure.js'
import { useUser } from '../hooks/useUser.js'
import { DEFAULT_FEE_HEADS, FEE_FREQUENCIES, classKey, classNames, computeStudentFees, findStructure, monthlyFeeOf, siblingRanks, siblingRuleOf } from '../lib/schoolFees.js'
import { getActiveCurrencyCode } from '../lib/workspaceCurrency.js'
import { formatCurrency } from '../utils/format.js'

const TABS = [['classes', '1. Class fees'], ['discounts', '2. Discounts'], ['students', '3. Students']]
const KINDS = [['scholarship', 'Scholarship'], ['staff', 'Staff child'], ['custom', 'Other discount']]

function Field({ label, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  )
}

const blankFee = () => ({ head: '', amount: '', frequency: 'monthly' })
const freqLabel = (value) => FEE_FREQUENCIES.find((f) => f.value === value)?.label || value

export default function FeeStructurePage() {
  const { userDoc, workspaceDoc } = useUser()
  const settings = useBusinessSettings().settings || {}
  const currency = settings.currency || userDoc?.currency || workspaceDoc?.currency || getActiveCurrencyCode()
  const fees = useFeeStructure()
  const customersApi = useCustomers({ limitCount: 500 })
  const students = useMemo(() => customersApi.customers || [], [customersApi.customers])
  const money = (value) => formatCurrency(value, currency)

  const [tab, setTab] = useState('classes')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const say = (tone, message) => { setToast({ tone, message }); window.setTimeout(() => setToast(null), 2600) }

  // --- class fees ---------------------------------------------------------
  const classes = useMemo(() => classNames(fees.structures, students), [fees.structures, students])
  const [selected, setSelected] = useState('')
  const [newClass, setNewClass] = useState('')
  const [draft, setDraft] = useState({ academicYear: '', fees: [blankFee()] })
  const current = selected || classes[0] || ''
  const saved = findStructure(fees.structures, current)

  useEffect(() => {
    setDraft(saved
      ? { academicYear: saved.academicYear, fees: saved.fees.map((f) => ({ ...f, amount: String(f.amount) })) }
      : { academicYear: settings.academicYear || '', fees: [blankFee()] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, saved?.id, fees.structures.length])

  const setFee = (index, patch) => setDraft((d) => ({ ...d, fees: d.fees.map((f, i) => (i === index ? { ...f, ...patch } : f)) }))
  const monthlyTotal = draft.fees.filter((f) => f.frequency === 'monthly').reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const countOfClass = (name) => students.filter((s) => classKey(s.className) === classKey(name)).length

  async function saveClass() {
    setBusy(true)
    const res = await fees.saveStructure({ id: saved?.id, className: current, academicYear: draft.academicYear, fees: draft.fees })
    setBusy(false)
    say(res.ok ? 'success' : 'error', res.ok ? `${current} fees saved.` : res.error)
  }
  async function deleteClass() {
    if (!saved || !window.confirm(`Delete the fee structure of ${current}?`)) return
    const res = await fees.removeStructure(saved.id, current)
    say(res.ok ? 'success' : 'error', res.ok ? 'Fee structure deleted.' : res.error)
  }
  function copyFrom(name) {
    const source = findStructure(fees.structures, name)
    if (source) setDraft((d) => ({ ...d, fees: source.fees.map((f) => ({ ...f, amount: String(f.amount) })) }))
  }
  function addClass() {
    const name = newClass.trim()
    if (!name) return
    setSelected(name)
    setNewClass('')
  }

  // --- discounts ----------------------------------------------------------
  const rule = siblingRuleOf(fees.concessions)
  const [sibling, setSibling] = useState({ secondPercent: 10, thirdPlusPercent: 20, heads: 'tuition', enabled: true })
  useEffect(() => { if (rule) setSibling({ secondPercent: rule.secondPercent ?? 0, thirdPlusPercent: rule.thirdPlusPercent ?? 0, heads: rule.heads || 'tuition', enabled: rule.enabled !== false }) }, [rule?.id, rule?.secondPercent, rule?.thirdPlusPercent, rule?.heads, rule?.enabled]) // eslint-disable-line react-hooks/exhaustive-deps
  const [concession, setConcession] = useState({ name: '', kind: 'scholarship', type: 'percent', value: '', heads: 'tuition' })
  const list = fees.concessions.filter((c) => c.kind !== 'sibling')

  async function saveSibling() {
    const res = await fees.saveConcession({ ...sibling, kind: 'sibling', id: rule?.id })
    say(res.ok ? 'success' : 'error', res.ok ? 'Sibling discount saved.' : res.error)
  }
  async function addConcession() {
    const res = await fees.saveConcession(concession)
    if (res.ok) setConcession({ name: '', kind: 'scholarship', type: 'percent', value: '', heads: 'tuition' })
    say(res.ok ? 'success' : 'error', res.ok ? 'Discount added.' : res.error)
  }

  // --- students -----------------------------------------------------------
  const [search, setSearch] = useState('')
  const activeRule = rule && rule.enabled !== false ? rule : null
  const activeConcessions = useMemo(() => fees.concessions.filter((c) => c.kind !== 'sibling' || (c.enabled !== false)), [fees.concessions])
  const ranks = useMemo(() => siblingRanks(students), [students])
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return students
      .filter((s) => !needle || [s.studentName, s.name, s.className, s.admissionNo, s.parentName, s.parentPhone].some((v) => String(v || '').toLowerCase().includes(needle)))
      .map((s) => {
        const structure = findStructure(fees.structures, s.className)
        const args = { student: s, structure, concessions: activeConcessions, siblingRank: ranks[s.id] || 1 }
        return { student: s, rank: ranks[s.id] || 1, monthly: monthlyFeeOf(args), all: computeStudentFees(args), structure }
      })
  }, [activeConcessions, fees.structures, ranks, search, students])
  const withoutStructure = rows.filter((r) => r.all.missingStructure).length

  async function toggleConcession(student, id) {
    const have = Array.isArray(student.concessionIds) ? student.concessionIds : []
    const next = have.includes(id) ? have.filter((x) => x !== id) : [...have, id]
    const res = await fees.assignConcessions(student.id, next)
    if (!res.ok) say('error', res.error)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-4 pb-24">
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Fee Structure"
        subtitle="Set each class's fees once, add discounts and scholarships, and see what every student pays. Fee bills use these amounts automatically."
        right={<Link to="/app/invoices" className="focus-ring inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Fee Bills</Link>}
      />

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === key ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>
        ))}
      </div>
      {fees.error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{fees.error}</p> : null}

      {tab === 'classes' ? (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <Card className="p-3">
            <p className="px-1 pb-2 text-xs font-black uppercase tracking-wide text-slate-400">Classes</p>
            <div className="space-y-1">
              {classes.map((name) => {
                const has = Boolean(findStructure(fees.structures, name))
                return (
                  <button key={name} type="button" onClick={() => setSelected(name)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold ${classKey(name) === classKey(current) ? 'bg-sky-50 text-sky-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span>{name}</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">{countOfClass(name)} students <span className={`h-2 w-2 rounded-full ${has ? 'bg-emerald-500' : 'bg-amber-400'}`} title={has ? 'Fees set' : 'Fees not set'} /></span>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <Input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="New class, e.g. Grade 6" onKeyDown={(e) => { if (e.key === 'Enter') addClass() }} />
              <Button type="button" onClick={addClass} className="rounded-xl"><HiOutlinePlusCircle className="h-4 w-4" /></Button>
            </div>
          </Card>

          <Card className="p-4">
            {!current ? (
              <EmptyState title="Add your first class" description="Type a class name on the left (for example Nursery or Grade 1) and press Enter." />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">{current}</h2>
                    <p className="text-xs font-semibold text-slate-500">{countOfClass(current)} students · monthly total <strong className="text-slate-900">{money(monthlyTotal)}</strong></p>
                  </div>
                  <div className="flex items-center gap-2">
                    {classes.filter((n) => classKey(n) !== classKey(current) && findStructure(fees.structures, n)).length ? (
                      <Select value="" onChange={(e) => copyFrom(e.target.value)} aria-label="Copy fees from another class" className="!w-auto">
                        <option value="">Copy fees from…</option>
                        {classes.filter((n) => classKey(n) !== classKey(current) && findStructure(fees.structures, n)).map((n) => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    ) : null}
                    {saved ? <Button type="button" variant="ghost" onClick={deleteClass} className="rounded-xl text-rose-600"><HiOutlineTrash className="h-4 w-4" /></Button> : null}
                  </div>
                </div>

                <div className="mt-4 max-w-xs"><Field label="Academic year"><Input value={draft.academicYear} onChange={(e) => setDraft((d) => ({ ...d, academicYear: e.target.value }))} placeholder="2026-2027" /></Field></div>

                <div className="mt-4 space-y-2">
                  {draft.fees.map((fee, index) => (
                    <div key={index} className="grid grid-cols-[1fr_8rem_9rem_2.5rem] items-end gap-2 max-sm:grid-cols-2">
                      <Field label={index === 0 ? 'Fee name' : ''}><Input list="fee-head-list" value={fee.head} onChange={(e) => setFee(index, { head: e.target.value })} placeholder="Tuition Fee" /></Field>
                      <Field label={index === 0 ? 'Amount' : ''}><Input type="number" min="0" value={fee.amount} onChange={(e) => setFee(index, { amount: e.target.value })} placeholder="0" /></Field>
                      <Field label={index === 0 ? 'Charged' : ''}><Select value={fee.frequency} onChange={(e) => setFee(index, { frequency: e.target.value })}>{FEE_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</Select></Field>
                      <button type="button" aria-label="Remove fee" onClick={() => setDraft((d) => ({ ...d, fees: d.fees.length > 1 ? d.fees.filter((_, i) => i !== index) : [blankFee()] }))} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><HiOutlineTrash className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <datalist id="fee-head-list">{DEFAULT_FEE_HEADS.map((h) => <option key={h.head} value={h.head} />)}</datalist>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" onClick={() => setDraft((d) => ({ ...d, fees: [...d.fees, blankFee()] }))} className="rounded-xl"><HiOutlinePlusCircle className="h-4 w-4" /> Add fee</Button>
                  {!draft.fees.some((f) => f.head) ? <Button type="button" variant="ghost" onClick={() => setDraft((d) => ({ ...d, fees: DEFAULT_FEE_HEADS.map((h) => ({ head: h.head, amount: '', frequency: h.frequency })) }))} className="rounded-xl">Use standard fees</Button> : null}
                </div>

                <div className="mt-5 flex justify-end"><Button type="button" onClick={saveClass} disabled={busy} className="rounded-xl bg-blue-600 px-6 hover:bg-blue-700">{busy ? 'Saving…' : `Save ${current} fees`}</Button></div>
              </>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'discounts' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center justify-between"><h2 className="text-base font-black text-slate-950">Brothers & sisters</h2><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={sibling.enabled} onChange={(e) => setSibling((s) => ({ ...s, enabled: e.target.checked }))} /> On</label></div>
            <p className="mt-1 text-xs text-slate-500">Students with the same parent phone number are treated as siblings. The eldest admission pays full fee.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="2nd child discount %"><Input type="number" min="0" max="100" value={sibling.secondPercent} onChange={(e) => setSibling((s) => ({ ...s, secondPercent: e.target.value }))} /></Field>
              <Field label="3rd child and more %"><Input type="number" min="0" max="100" value={sibling.thirdPlusPercent} onChange={(e) => setSibling((s) => ({ ...s, thirdPlusPercent: e.target.value }))} /></Field>
              <Field label="Applies to"><Select value={sibling.heads} onChange={(e) => setSibling((s) => ({ ...s, heads: e.target.value }))}><option value="tuition">Tuition fee only</option><option value="all">All fees</option></Select></Field>
            </div>
            <div className="mt-4 flex justify-end"><Button type="button" onClick={saveSibling} className="rounded-xl bg-blue-600 hover:bg-blue-700">Save</Button></div>
          </Card>

          <Card className="p-4">
            <h2 className="text-base font-black text-slate-950">Scholarships & other discounts</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Name"><Input value={concession.name} onChange={(e) => setConcession((c) => ({ ...c, name: e.target.value }))} placeholder="Merit scholarship" /></Field>
              <Field label="Kind"><Select value={concession.kind} onChange={(e) => setConcession((c) => ({ ...c, kind: e.target.value }))}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              <Field label="Type"><Select value={concession.type} onChange={(e) => setConcession((c) => ({ ...c, type: e.target.value }))}><option value="percent">Percent (%)</option><option value="fixed">Fixed amount</option></Select></Field>
              <Field label={concession.type === 'fixed' ? `Amount (${currency})` : 'Percent'}><Input type="number" min="0" value={concession.value} onChange={(e) => setConcession((c) => ({ ...c, value: e.target.value }))} /></Field>
              <Field label="Applies to"><Select value={concession.heads} onChange={(e) => setConcession((c) => ({ ...c, heads: e.target.value }))}><option value="tuition">Tuition fee only</option><option value="all">All fees</option></Select></Field>
            </div>
            <div className="mt-3 flex justify-end"><Button type="button" onClick={addConcession} className="rounded-xl bg-blue-600 hover:bg-blue-700"><HiOutlinePlusCircle className="h-4 w-4" /> Add discount</Button></div>
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {list.length ? list.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div><p className="text-sm font-bold text-slate-900">{c.name}</p><p className="text-xs text-slate-500">{c.type === 'fixed' ? money(c.value) : `${c.value}%`} · {c.heads === 'all' ? 'all fees' : 'tuition only'} · {students.filter((s) => (s.concessionIds || []).includes(c.id)).length} students</p></div>
                  <button type="button" aria-label={`Delete ${c.name}`} onClick={async () => { if (window.confirm(`Delete "${c.name}"? Students keep their record but it stops applying.`)) { const res = await fees.removeConcession(c.id, c.name); say(res.ok ? 'success' : 'error', res.ok ? 'Discount deleted.' : res.error) } }} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><HiOutlineTrash className="h-4 w-4" /></button>
                </div>
              )) : <p className="py-3 text-sm text-slate-400">No discounts yet. Add a scholarship above, then give it to students in step 3.</p>}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'students' ? (
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div><h2 className="text-base font-black text-slate-950">What each student pays</h2><p className="text-xs text-slate-500">Monthly fee after discounts. Give discounts here; sibling discount is automatic.</p></div>
            {withoutStructure ? <Badge variant="warning">{withoutStructure} students have no class fee set</Badge> : null}
          </div>
          <div className="p-4 pb-0"><PageSearch value={search} onChange={setSearch} placeholder="Search student, class, admission no, parent…" resultCount={rows.length} totalCount={students.length} /></div>
          {rows.length ? (
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[40rem] text-sm">
                <thead><tr className="text-left text-[11px] font-black uppercase tracking-wide text-slate-400"><th className="pb-2">Student</th><th className="pb-2">Class</th><th className="pb-2">Child #</th><th className="pb-2">Discounts</th><th className="pb-2 text-right">Monthly fee</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ student, rank, monthly, all, structure }) => (
                    <tr key={student.id}>
                      <td className="py-2.5 pr-3"><span className="font-bold text-slate-900">{student.studentName || student.name}</span><span className="block text-[11px] text-slate-400">{student.admissionNo ? `Adm. ${student.admissionNo}` : student.parentName || ''}</span></td>
                      <td className="py-2.5 pr-3 text-slate-600">{[student.className, student.section].filter(Boolean).join(' - ') || '—'}</td>
                      <td className="py-2.5 pr-3">{rank > 1 ? <Badge variant="info">#{rank}</Badge> : <span className="text-slate-400">1</span>}</td>
                      <td className="py-2.5 pr-3">
                        <details className="relative">
                          <summary className="cursor-pointer select-none text-xs font-bold text-sky-700">{(student.concessionIds || []).length ? `${(student.concessionIds || []).length} given` : 'Give discount'}</summary>
                          <div className="absolute left-0 z-10 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                            {list.length ? list.map((c) => (
                              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={(student.concessionIds || []).includes(c.id)} onChange={() => toggleConcession(student, c.id)} /> {c.name}</label>
                            )) : <p className="px-2 py-1.5 text-xs text-slate-400">Add discounts in step 2 first.</p>}
                          </div>
                        </details>
                      </td>
                      <td className="py-2.5 text-right">
                        {all.missingStructure ? <span className="text-xs font-bold text-amber-600">{student.className ? `Set ${student.className} fees` : 'No class'}</span> : (
                          <>
                            <span className="font-black text-slate-950">{money(monthly.net)}</span>
                            {monthly.discount ? <span className="block text-[11px] text-slate-400"><s>{money(monthly.gross)}</s> · saves {money(monthly.discount)}</span> : null}
                          </>
                        )}
                        {structure && !all.missingStructure && all.gross > monthly.gross ? <span className="block text-[11px] text-slate-400">+ {money(all.net - monthly.net)} termly/yearly</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="p-6"><EmptyState title="No students yet" description="Add students in the Students/Parents page, then come back to see their fees." /></div>}
          {activeRule ? <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">Sibling discount: {activeRule.secondPercent}% for the 2nd child, {activeRule.thirdPlusPercent}% for the 3rd and more.</p> : null}
        </Card>
      ) : null}
    </motion.div>
  )
}
