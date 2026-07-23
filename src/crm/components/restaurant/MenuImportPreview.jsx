import { useState } from 'react'
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowLeft,
  HiOutlineCheck,
  HiOutlineDocumentDuplicate,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
  HiOutlineXMark,
} from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Input from '../ui/Input.jsx'

function EditableCell({ value, onChange, type = 'text', placeholder = '' }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value)

  const save = () => { onChange(local); setEditing(false) }
  const cancel = () => { setLocal(value); setEditing(false) }
  const key = (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }

  if (editing) {
    return type === 'select' ? (
      <select value={local} onChange={(e) => setLocal(e.target.value)} onBlur={save} onKeyDown={key}
        className="h-8 w-full rounded-lg border border-violet-300 bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-50" autoFocus>
        <option value="Food">Food</option><option value="Drink">Drink</option><option value="Beverage">Beverage</option><option value="Combo">Combo</option><option value="Add-on">Add-on</option>
      </select>
    ) : (
      <Input value={local} onChange={(e) => setLocal(e.target.value)} onBlur={save} onKeyDown={key}
        className="h-8 text-[12px]" placeholder={placeholder} autoFocus />
    )
  }

  return (
    <button type="button" onClick={() => setEditing(true)}
      className="group flex w-full items-center gap-1 rounded-lg px-1.5 py-1 text-left text-[12px] hover:bg-violet-50/60 transition-colors">
      <span className="min-w-0 flex-1 truncate">{value || <span className="italic text-slate-300">{placeholder || '—'}</span>}</span>
      <HiOutlinePencilSquare className="h-3 w-3 shrink-0 text-slate-300 opacity-0 group-hover:opacity-100" />
    </button>
  )
}

function itemBadge(item) {
  if (item.isDuplicate) return { v: 'purple', l: 'Duplicate', I: HiOutlineDocumentDuplicate }
  if (item.warnings.includes('missing_name')) return { v: 'danger', l: 'No Name', I: HiOutlineExclamationTriangle }
  if (item.warnings.includes('missing_price')) return { v: 'warning', l: 'No Price', I: HiOutlineExclamationTriangle }
  if (item.warnings.includes('low_confidence')) return { v: 'info', l: 'Low Confidence', I: HiOutlineInformationCircle }
  if (item.confidence >= 0.9) return { v: 'success', l: 'High Match', I: HiOutlineCheck }
  return { v: 'default', l: 'OK', I: HiOutlineCheck }
}

export default function MenuImportPreview({ items = [], stats, onUpdateItem, onToggleItem, onSelectAll, onDeselectWarnings, onDeselectDuplicates, onSave, onBack }) {
  const sel = items.filter(i => i.selected).length
  const warns = items.filter(i => i.warnings.length > 0).length
  const dups = items.filter(i => i.isDuplicate).length

  return (
    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-slate-200/50 bg-white/95 shadow-2xl shadow-black/[0.06] backdrop-blur-xl"
      style={{ animation: 'applePopIn 0.35s cubic-bezier(0.32,0.72,0,1) forwards' }}>

      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-5 py-3.5 text-white">
        <div className="flex items-center gap-3">
          <img src="/nexora-ai-logo.png" alt="Nexora AI" className="h-9 w-9 rounded-lg object-cover ring-[1.5px] ring-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]" />
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.01em] leading-tight">Review &amp; Edit</p>
            <p className="text-[11px] text-white/60 leading-tight">{stats?.total || items.length} items extracted</p>
          </div>
        </div>
        <button onClick={onBack} className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-90 transition-colors">
          <HiOutlineXMark className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-[#f5f5f7] px-5 py-2.5">
        <Badge variant="success" className="gap-1 text-[10px]"><HiOutlineCheck className="h-3 w-3"/>{sel} selected</Badge>
        {warns > 0 && <Badge variant="warning" className="gap-1 text-[10px]"><HiOutlineExclamationTriangle className="h-3 w-3"/>{warns} warnings</Badge>}
        {dups > 0 && <Badge variant="purple" className="gap-1 text-[10px]"><HiOutlineDocumentDuplicate className="h-3 w-3"/>{dups} duplicates</Badge>}
        {stats?.newCategoriesSuggested?.length > 0 && <Badge variant="info" className="gap-1 text-[10px]">+{stats.newCategoriesSuggested.length} new</Badge>}
        <span className="ml-auto text-[10px] text-slate-400">Click any field to edit</span>
      </div>

      {/* Batch actions */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-white/80 backdrop-blur-xl px-5 py-2">
        <button onClick={onSelectAll} className="rounded-full px-3 py-1 text-[11px] font-semibold text-violet-500 hover:bg-violet-50 transition-colors">Select All</button>
        {warns > 0 && <button onClick={onDeselectWarnings} className="rounded-full px-3 py-1 text-[11px] font-semibold text-amber-500 hover:bg-amber-50 transition-colors">Deselect Warnings</button>}
        {dups > 0 && <button onClick={onDeselectDuplicates} className="rounded-full px-3 py-1 text-[11px] font-semibold text-purple-500 hover:bg-purple-50 transition-colors">Deselect Duplicates</button>}
      </div>

      {/* Table */}
      <div className="max-h-[calc(100dvh-24rem)] overflow-auto bg-[#f5f5f7]">
        <table className="min-w-full text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
            <tr>
              <th className="w-10 px-4 py-3 text-center">#</th>
              <th className="px-2 py-3">Item Name</th>
              <th className="px-2 py-3">Category</th>
              <th className="w-20 px-2 py-3 text-right">Price</th>
              <th className="w-20 px-2 py-3">Type</th>
              <th className="w-28 px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {items.map((item, idx) => {
              const b = itemBadge(item)
              const BI = b.I
              return (
                <tr key={item._importIndex ?? idx}
                  className={`bg-white/70 transition-colors hover:bg-violet-50/40 ${
                    !item.selected ? 'opacity-30' : ''} ${item.isDuplicate ? '!bg-purple-50/30' : ''} ${item.warnings.length > 0 && item.selected ? '!bg-amber-50/20' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={item.selected} onChange={() => onToggleItem(idx)} className="h-4 w-4 rounded accent-violet-600 cursor-pointer" />
                  </td>
                  <td className="px-2 py-3">
                    <EditableCell value={item.name} onChange={(v) => onUpdateItem(idx, 'name', v)} placeholder="Item name" />
                    {item.nameEn && <p className="mt-0.5 px-1.5 text-[10px] text-slate-400">{item.nameEn}</p>}
                    {item.description && <p className="mt-0.5 line-clamp-1 px-1.5 text-[10px] text-slate-400">{item.description}</p>}
                  </td>
                  <td className="px-2 py-3"><EditableCell value={item.category} onChange={(v) => onUpdateItem(idx, 'category', v)} placeholder="Category" /></td>
                  <td className="px-2 py-3 text-right"><EditableCell value={item.price != null ? `Rs. ${item.price}` : ''} onChange={(v) => onUpdateItem(idx, 'price', v.replace(/[^0-9.]/g, ''))} placeholder="0" /></td>
                  <td className="px-2 py-3"><EditableCell value={item.itemType} onChange={(v) => onUpdateItem(idx, 'itemType', v)} type="select" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={b.v} className="gap-1 text-[10px]"><BI className="h-3 w-3"/>{b.l}</Badge>
                      {item.confidence != null && <span className="text-[10px] font-medium text-slate-400">{Math.round(item.confidence * 100)}%</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-slate-100 bg-white/80 backdrop-blur-xl px-5 py-3">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/40 px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-[#1d1d1f] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.1)] active:scale-[0.97]">
          <HiOutlineArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onSave} disabled={sel === 0}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-5 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(139,92,246,0.4)] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none">
          <HiOutlineSparkles className="h-4 w-4" /> Import {sel} Item{sel !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}
