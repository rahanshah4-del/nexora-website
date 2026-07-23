import { motion } from 'framer-motion'
import { HiOutlineCheck, HiOutlineCheckCircle, HiOutlineDocumentDuplicate, HiOutlineExclamationTriangle, HiOutlineInformationCircle, HiOutlineSparkles, HiOutlineTag, HiOutlineXMark } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'

export default function MenuImportSummary({ summary, stats, fileName, onDone }) {
  if (!summary) return null

  const { imported = 0, skipped = 0, duplicatesSkipped = 0, warningsSkipped = 0, newCategories = [], itemsWithWarnings = 0 } = summary
  const hasWarnings = itemsWithWarnings > 0 || warningsSkipped > 0
  const wasPerfect = imported > 0 && skipped === 0 && itemsWithWarnings === 0

  return (
    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-hidden rounded-[1.5rem] border border-slate-200/50 bg-white/95 shadow-2xl shadow-black/[0.06] backdrop-blur-xl"
      style={{ animation: 'applePopIn 0.35s cubic-bezier(0.32,0.72,0,1) forwards' }}>

      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-5 py-3.5 text-white">
        <div className="flex items-center gap-3">
          <img src="/nexora-ai-logo.png" alt="Nexora AI" className="h-9 w-9 rounded-lg object-cover ring-[1.5px] ring-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]" />
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.01em] leading-tight">{wasPerfect ? 'Import Complete!' : 'Import Summary'}</p>
            <p className="text-[11px] text-white/60 leading-tight">Nexora AI Menu Import</p>
          </div>
        </div>
        <button onClick={onDone} className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-90 transition-colors">
          <HiOutlineXMark className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[calc(100dvh-19rem)] overflow-y-auto bg-[#f5f5f7] px-5 py-6 space-y-4">
        {wasPerfect ? (
          <div className="flex flex-col items-center py-4">
            <motion.div className="grid h-[88px] w-[88px] place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-[0_8px_36px_rgba(139,92,246,0.35)]"
              initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }}>
              <HiOutlineCheckCircle className="h-11 w-11 text-white" />
            </motion.div>
            <p className="mt-5 text-[16px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">All items imported! ✨</p>
            <p className="mt-1.5 text-[13px] text-slate-400">Your menu now has <strong className="text-[#1d1d1f]">{imported}</strong> new items.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/30 p-4 text-center shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
                <p className="text-[32px] font-black tracking-[-0.02em] text-emerald-500">{imported}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-600"><HiOutlineCheck className="inline h-3 w-3 -mt-0.5 mr-0.5"/>Imported</p>
              </div>
              <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/30 p-4 text-center shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
                <p className="text-[32px] font-black tracking-[-0.02em] text-slate-400">{skipped}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Skipped</p>
              </div>
            </div>

            <div className="space-y-2">
              {duplicatesSkipped > 0 && (
                <div className="flex items-center gap-2.5 rounded-xl bg-purple-50/80 px-3 py-2.5">
                  <HiOutlineDocumentDuplicate className="h-4 w-4 shrink-0 text-purple-500" />
                  <span className="text-[12px] text-purple-700"><strong>{duplicatesSkipped}</strong> duplicates skipped</span>
                </div>
              )}
              {hasWarnings && (
                <div className="flex items-center gap-2.5 rounded-xl bg-amber-50/80 px-3 py-2.5">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-[12px] text-amber-700"><strong>{itemsWithWarnings}</strong> imported with warnings</span>
                </div>
              )}
              {summary.newCategories?.length > 0 && (
                <div className="rounded-xl bg-violet-50/80 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <HiOutlineTag className="h-4 w-4 shrink-0 text-violet-500" />
                    <span className="text-[12px] font-semibold text-violet-700">{newCategories.length} new {newCategories.length === 1 ? 'category' : 'categories'}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">{newCategories.map(c => <Badge key={c} variant="info" className="text-[10px]">{c}</Badge>)}</div>
                </div>
              )}
              {stats && (
                <div className="flex items-center gap-2.5 rounded-xl bg-white/80 backdrop-blur-xl px-3 py-2.5 shadow-[0_1px_6px_-2px_rgba(0,0,0,0.04)]">
                  <HiOutlineInformationCircle className="h-4 w-4 shrink-0 text-slate-300" />
                  <span className="text-[11px] text-slate-500">{fileName || 'File'} &middot; {((stats.processingTimeMs || 0) / 1000).toFixed(1)}s{stats.modelUsed ? <> &middot; <span className="font-medium text-violet-500">{stats.modelUsed}</span></> : ''}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-white/80 backdrop-blur-xl px-5 py-4">
        <button onClick={onDone}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-5 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(139,92,246,0.4)] active:scale-[0.97]">
          <HiOutlineSparkles className="h-4 w-4" /> Done
        </button>
      </div>
    </div>
  )
}
