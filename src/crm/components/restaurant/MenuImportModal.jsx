import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineArrowPath,
  HiOutlineCloudArrowUp,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlinePhoto,
  HiOutlineSparkles,
  HiOutlineXMark,
} from 'react-icons/hi2'
import { IMPORT_STATE } from '../../hooks/useMenuImport.js'

/* ── Apple-style glass button ── */
function GlassButton({ children, onClick, disabled, className = '', icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/40 px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-[#1d1d1f] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.13)] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}

/* ── Purple gradient button ── */
function GradientButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-5 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(139,92,246,0.4)] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  )
}

/* ── File Preview ── */
function FilePreviewCard({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (file?.type?.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  const isImage = file?.type?.startsWith('image/')
  const isPdf = file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf')
  const sizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : '0'

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/40 bg-white/80 backdrop-blur-xl p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f7]">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : isPdf ? (
          <HiOutlineDocumentText className="h-7 w-7 text-rose-400" />
        ) : (
          <HiOutlinePhoto className="h-7 w-7 text-slate-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{file?.name || 'Unknown'}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{sizeMB} MB &middot; {isPdf ? 'PDF' : 'Image'}</p>
      </div>
      <button onClick={onRemove} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100/80 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-500">
        <HiOutlineXMark className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ── Drop Zone ── */
function FileDropZone({ onFileSelect, disabled }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const prevent = useCallback((e) => { e.preventDefault(); e.stopPropagation() }, [])
  const handleDragIn = useCallback((e) => { prevent(e); setIsDragging(true) }, [prevent])
  const handleDragOut = useCallback((e) => { prevent(e); setIsDragging(false) }, [prevent])
  const handleDrop = useCallback((e) => {
    prevent(e); setIsDragging(false)
    if (e.dataTransfer?.files?.length > 0 && onFileSelect) onFileSelect(e.dataTransfer.files[0])
  }, [onFileSelect, prevent])

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={prevent}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
        isDragging
          ? 'border-violet-300 bg-violet-50/40 shadow-[0_0_0_8px_rgba(139,92,246,0.04)] scale-[1.01]'
          : 'border-slate-200/60 bg-[#f5f5f7] hover:border-violet-200 hover:bg-violet-50/20'
      } ${disabled ? 'pointer-events-none opacity-40' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
    >
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => { if (e.target?.files?.[0] && onFileSelect) onFileSelect(e.target.files[0]); e.target.value = '' }} className="hidden" />
      <motion.div
        className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-2xl bg-white shadow-[0_4px_24px_rgba(123,97,255,0.1)]"
        animate={isDragging ? { scale: 1.06, y: -6 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <HiOutlineCloudArrowUp className={`h-8 w-8 transition-colors ${isDragging ? 'text-violet-500' : 'text-violet-400'}`} />
      </motion.div>
      <p className="mt-4 text-[14px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
        {isDragging ? 'Drop your menu here' : 'Drag & drop menu photo or PDF'}
      </p>
      <p className="mt-1 text-[12px] text-slate-400">
        or <span className="font-semibold text-violet-500">browse files</span>
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200/40 bg-white/80 backdrop-blur-xl px-3 py-1 text-[10px] font-medium text-slate-400">
        JPG &middot; PNG &middot; WEBP &middot; PDF &middot; Max 10 MB
      </span>
    </div>
  )
}

/* ── Progress ── */
function ProgressIndicator({ state, progress }) {
  const isUploading = state === IMPORT_STATE.UPLOADING
  return (
    <div className="flex flex-col items-center py-6 space-y-5">
      <motion.div className="relative grid h-[88px] w-[88px] place-items-center"
        animate={isUploading ? {} : { rotate: 360 }}
        transition={isUploading ? {} : { repeat: Infinity, duration: 3, ease: 'linear' }}
      >
        <motion.div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-300 via-purple-300 to-fuchsia-300 opacity-20 blur-md"
          animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
        <div className="absolute inset-[3px] rounded-full border-[3px] border-dashed border-violet-200/60" />
        <div className="relative z-10 grid h-[56px] w-[56px] place-items-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-[0_6px_28px_rgba(139,92,246,0.35)]">
          {isUploading ? (
            <HiOutlineCloudArrowUp className="h-7 w-7 text-white" />
          ) : (
            <HiOutlineSparkles className="h-7 w-7 text-white" />
          )}
        </div>
      </motion.div>
      <div className="text-center">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
          {isUploading ? 'Uploading menu...' : 'AI analyzing menu...'}
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          {isUploading ? 'Securely uploading to Nexora cloud' : 'Nexora AI is reading your menu'}
        </p>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#f5f5f7] overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[11px] font-medium text-slate-300">
        {progress < 50 ? 'Uploading...' : progress < 90 ? 'Extracting items...' : 'Almost done...'}
      </p>
    </div>
  )
}

/* ─── MenuImportModal ─── */
export default function MenuImportModal({ open, onClose, importCtx }) {
  const { state, progress, error, file, selectFile, startImport, retry, reset: resetImport } = importCtx
  if (!open) return null

  const isProcessing = state === IMPORT_STATE.UPLOADING || state === IMPORT_STATE.EXTRACTING
  const hasFile = !!file
  const hasError = state === IMPORT_STATE.ERROR

  const handleClose = () => { if (!isProcessing) { resetImport(); onClose() } }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/20 px-4 py-6 backdrop-blur-md">
      <motion.div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-hidden rounded-[1.5rem] border border-slate-200/50 bg-white/95 shadow-2xl shadow-black/[0.06] backdrop-blur-xl"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-5 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <img src="/nexora-ai-logo.png" alt="Nexora AI" className="h-9 w-9 rounded-lg object-cover ring-[1.5px] ring-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.15)]" />
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.01em] leading-tight">Nexora AI</p>
              <p className="text-[11px] text-white/60 leading-tight">Menu Import</p>
            </div>
          </div>
          <button onClick={handleClose} disabled={isProcessing}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 active:scale-90 disabled:opacity-30">
            <HiOutlineXMark className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="max-h-[calc(100dvh-19rem)] overflow-y-auto bg-[#f5f5f7] px-5 py-5 space-y-4">

          {/* Error + Text fallback */}
          {hasError && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50/80 backdrop-blur-xl border border-amber-200/40 p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
                  <HiOutlineExclamationTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-amber-800">Image extraction failed</p>
                  <p className="mt-0.5 text-[11px] text-amber-600 leading-relaxed">{error || 'Could not process image.'}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/40 p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
                <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#1d1d1f] mb-2.5">Paste menu text instead — AI will structure it</p>
                <textarea
                  value={importCtx.menuText || ''}
                  onChange={(e) => importCtx.setMenuText(e.target.value)}
                  placeholder="Paste menu items here...&#10;&#10;Zinger Burger — Rs. 450&#10;Chicken Karahi (Full) — Rs. 1200&#10;Mint Margarita — Rs. 250"
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-200/60 bg-[#f5f5f7] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#1d1d1f] outline-none placeholder:text-slate-300 focus:border-violet-300 focus:ring-2 focus:ring-violet-50 transition-shadow"
                />
                <div className="mt-3 flex gap-2">
                  <GlassButton onClick={() => { resetImport(); retry(); }} icon={<HiOutlineArrowPath className="h-4 w-4" />}>Retry Image</GlassButton>
                  <GradientButton onClick={importCtx.startTextImport} disabled={!importCtx.menuText?.trim()}>
                    <HiOutlineSparkles className="h-4 w-4" /> Extract from Text
                  </GradientButton>
                </div>
              </div>
            </div>
          )}

          {/* Drop zone */}
          {!hasFile && !isProcessing && !hasError && (
            <FileDropZone onFileSelect={selectFile} disabled={isProcessing} />
          )}

          {/* File preview */}
          {hasFile && !isProcessing && (
            <FilePreviewCard file={file} onRemove={() => selectFile(null)} />
          )}

          {/* Progress */}
          {isProcessing && <ProgressIndicator state={state} progress={progress} />}
        </div>

        {/* ── Footer ── */}
        {hasFile && !isProcessing && (
          <div className="border-t border-slate-100 bg-white/80 backdrop-blur-xl px-5 py-4">
            <GradientButton onClick={startImport} className="w-full">
              <HiOutlineSparkles className="h-4 w-4" /> Start Import with Nexora AI
            </GradientButton>
            <p className="mt-2 text-center text-[10px] text-slate-300">Securely uploaded &amp; analyzed by Nexora AI</p>
          </div>
        )}

        {isProcessing && (
          <div className="border-t border-slate-100 bg-white/80 backdrop-blur-xl px-5 py-3 flex items-center justify-center gap-2">
            <motion.div className="h-1.5 w-1.5 rounded-full bg-violet-500"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="text-[11px] font-medium text-slate-400">Please don&apos;t close this window</span>
          </div>
        )}
      </motion.div>
    </div>
  )
}
