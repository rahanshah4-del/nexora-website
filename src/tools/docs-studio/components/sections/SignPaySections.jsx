import { useEffect, useRef, useState } from 'react'
import { getDocumentType } from '../../engine/index.js'
import { ACCEPTED_IMAGE_TYPES } from '../../io/images.js'
import { useStudio } from '../../ui/StudioContext.js'
import { SelectInput, TextArea, TextInput } from '../fields.jsx'
import Icon from '../Icon.jsx'
import SectionCard from '../SectionCard.jsx'

const EMPTY_SIGNOFF = { signatureAssetId: '', sealAssetId: '', name: '', title: '', label: '' }
const EMPTY_PAYMENT = {
  bankName: '', accountName: '', accountNumber: '', iban: '', swift: '',
  bankCodeLabel: '', bankCode: '', walletLabel: '', walletId: '', link: '',
  instructions: '', qr: 'none', qrText: '',
}

// Local bank-routing code names used around the world (free text is allowed too).
const BANK_CODE_LABELS = ['Routing No (ABA)', 'Sort code', 'IFSC', 'BSB', 'Transit / Institution', 'Branch code', 'Bank code']
const WALLET_LABELS = ['UPI ID', 'PayPal', 'Wise', 'Revolut', 'Zelle', 'Venmo', 'JazzCash', 'Easypaisa', 'Raast ID', 'M-Pesa', 'PIX key', 'GCash']

const QR_OPTIONS = [
  { value: 'none', label: 'No QR code' },
  { value: 'link', label: 'Payment link (any currency)' },
  { value: 'upi', label: 'UPI (India)' },
  { value: 'epc', label: 'SEPA bank transfer (EUR)' },
  { value: 'text', label: 'Custom text' },
]

/** Pointer-drawn signature → transparent PNG Blob. */
function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [])

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }
  const down = (event) => {
    event.preventDefault()
    canvasRef.current.setPointerCapture?.(event.pointerId)
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const [x, y] = point(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.01, y + 0.01)
    ctx.stroke()
    setEmpty(false)
  }
  const move = (event) => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const [x, y] = point(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  const up = () => { drawing.current = false }
  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setEmpty(true)
  }
  // Crops to the ink (plus a little margin) so the signature sizes well on paper.
  const save = () => {
    const canvas = canvasRef.current
    const { width, height } = canvas
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data
    let minX = width; let minY = height; let maxX = -1; let maxY = -1
    for (let yy = 0; yy < height; yy++) {
      for (let xx = 0; xx < width; xx++) {
        if (pixels[(yy * width + xx) * 4 + 3] > 0) {
          if (xx < minX) minX = xx
          if (xx > maxX) maxX = xx
          if (yy < minY) minY = yy
          if (yy > maxY) maxY = yy
        }
      }
    }
    if (maxX < 0) return
    const pad = 8
    const sx = Math.max(0, minX - pad)
    const sy = Math.max(0, minY - pad)
    const w = Math.min(width, maxX + pad) - sx
    const h = Math.min(height, maxY + pad) - sy
    const scale = Math.min(1, 900 / Math.max(w, h))
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(w * scale))
    out.height = Math.max(1, Math.round(h * scale))
    out.getContext('2d').drawImage(canvas, sx, sy, w, h, 0, 0, out.width, out.height)
    out.toBlob((blob) => { if (blob) onSave({ blob, width: out.width, height: out.height }) }, 'image/png')
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="h-36 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-slate-50"
        aria-label="Signature drawing area — draw with your mouse, finger or stylus"
      />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-sm">
        <button type="button" onClick={clear} className="rounded-lg px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">Clear</button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
        <button type="button" disabled={empty} onClick={save} className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-white disabled:opacity-40">Use signature</button>
      </div>
    </div>
  )
}

function MarkSlot({ label, hint, url, onFile, onRemove, extra }) {
  const [busy, setBusy] = useState(false)
  const pick = async (file) => {
    if (!file) return
    setBusy(true)
    try { await onFile(file) } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        {url ? <img src={url} alt={label} className="max-h-full max-w-full object-contain" /> : <Icon name="pencil" className="h-5 w-5 text-slate-300" />}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-slate-700">{label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand/40 hover:bg-slate-50">
            <Icon name="upload" className="h-3.5 w-3.5" />
            {busy ? 'Processing…' : url ? 'Replace' : 'Upload'}
            <input type="file" accept={ACCEPTED_IMAGE_TYPES} className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {extra}
          {url ? <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600">Remove</button> : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  )
}

export function SignoffSection() {
  const { doc, actions, commands, signatureUrl, sealUrl } = useStudio()
  const [drawing, setDrawing] = useState(false)
  if (doc.type === 'receipt') return null
  const signoff = doc.signoff || EMPTY_SIGNOFF
  const update = (patch) => actions.set('signoff', { ...EMPTY_SIGNOFF, ...signoff, ...patch })
  const summary = [signoff.signatureAssetId ? 'Signed' : '', signoff.sealAssetId ? 'Stamped' : '', signoff.name].filter(Boolean).join(' · ') || 'Signature, company stamp, signatory'
  return (
    <SectionCard id="signoff" title="Signature & stamp" icon="pencil" summary={summary}>
      <div className="space-y-3">
        {drawing ? (
          <SignaturePad
            onCancel={() => setDrawing(false)}
            onSave={async (image) => { await commands.setSignoffImage('signatureAssetId', image); setDrawing(false) }}
          />
        ) : (
          <MarkSlot
            label="Signature"
            hint="Draw it here or upload a photo — a white background is made transparent."
            url={signatureUrl}
            onFile={(file) => commands.setSignoffImage('signatureAssetId', file)}
            onRemove={() => commands.removeSignoffImage('signatureAssetId')}
            extra={(
              <button type="button" onClick={() => setDrawing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                <Icon name="pencil" className="h-3.5 w-3.5" /> Draw
              </button>
            )}
          />
        )}
        <MarkSlot
          label="Company stamp / seal"
          hint="Common on invoices in the Gulf, South Asia and Europe. PNG with transparency works best."
          url={sealUrl}
          onFile={(file) => commands.setSignoffImage('sealAssetId', file)}
          onRemove={() => commands.removeSignoffImage('sealAssetId')}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Signatory name" path="signoff.name" value={signoff.name} onChange={(v) => update({ name: v })} placeholder="Jane Smith" />
          <TextInput label="Title" path="signoff.title" value={signoff.title} onChange={(v) => update({ title: v })} placeholder="Director" />
        </div>
        <TextInput label="Line caption" path="signoff.label" value={signoff.label} onChange={(v) => update({ label: v })} placeholder="Authorised signature" />
        <p className="text-xs text-slate-500">Images stay in this browser. A shared link carries the name and title only.</p>
      </div>
    </SectionCard>
  )
}

export function PaymentDetailsSection() {
  const { doc, actions } = useStudio()
  if (!getDocumentType(doc.type).features.pricing) return null
  const payment = doc.payment || EMPTY_PAYMENT
  const update = (patch) => actions.set('payment', { ...EMPTY_PAYMENT, ...payment, ...patch })
  const summary = [payment.bankName, payment.walletLabel, payment.link ? 'Pay link' : '', payment.qr !== 'none' ? 'QR' : ''].filter(Boolean).join(' · ') || 'Bank, wallet, pay link, QR code'
  return (
    <SectionCard id="paymentDetails" title="How to pay" icon="wallet" summary={summary}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Bank name" path="payment.bankName" value={payment.bankName} onChange={(v) => update({ bankName: v })} />
          <TextInput label="Account name" path="payment.accountName" value={payment.accountName} onChange={(v) => update({ accountName: v })} />
          <TextInput label="Account number" path="payment.accountNumber" value={payment.accountNumber} onChange={(v) => update({ accountNumber: v })} autoComplete="off" />
          <TextInput label="IBAN" path="payment.iban" value={payment.iban} onChange={(v) => update({ iban: v })} autoComplete="off" />
          <TextInput label="SWIFT / BIC" path="payment.swift" value={payment.swift} onChange={(v) => update({ swift: v })} autoComplete="off" />
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <TextInput label="Code type" path="payment.bankCodeLabel" value={payment.bankCodeLabel} onChange={(v) => update({ bankCodeLabel: v })} list="ds-bankcodes" placeholder="Sort code" />
            <TextInput label="Code" path="payment.bankCode" value={payment.bankCode} onChange={(v) => update({ bankCode: v })} autoComplete="off" />
          </div>
          <datalist id="ds-bankcodes">{BANK_CODE_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
        </div>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
          <TextInput label="Wallet / app" path="payment.walletLabel" value={payment.walletLabel} onChange={(v) => update({ walletLabel: v })} list="ds-wallets" placeholder="PayPal" />
          <datalist id="ds-wallets">{WALLET_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
          <TextInput label="Wallet ID" path="payment.walletId" value={payment.walletId} onChange={(v) => update({ walletId: v })} placeholder="name@bank / email / number" autoComplete="off" />
        </div>
        <TextInput label="Payment link" path="payment.link" type="url" value={payment.link} onChange={(v) => update({ link: v })} placeholder="https://paypal.me/yourname" hint="Stripe, PayPal, Wise or any https link." />
        <TextArea label="Payment instructions" path="payment.instructions" value={payment.instructions} onChange={(v) => update({ instructions: v })} rows={2} placeholder="Please quote the invoice number as the reference." />
        <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
          <SelectInput label="QR code on the document" path="payment.qr" value={payment.qr} onChange={(v) => update({ qr: v })} options={QR_OPTIONS} />
          {payment.qr === 'upi' ? <p className="text-xs text-slate-500">Uses the Wallet ID as the UPI ID (name@bank). The amount is filled in for INR documents.</p> : null}
          {payment.qr === 'epc' ? <p className="text-xs text-slate-500">European banking apps scan this to pre-fill a transfer. Needs EUR, IBAN and account name.</p> : null}
          {payment.qr === 'link' ? <p className="text-xs text-slate-500">Scanning opens your payment link.</p> : null}
          {payment.qr === 'text' ? (
            <TextInput label="QR text" path="payment.qrText" value={payment.qrText} onChange={(v) => update({ qrText: v })} placeholder="e.g. a Raast ID or wallet number" />
          ) : null}
        </div>
        <p className="text-xs text-slate-500">Saved with your default business, so every new document already shows how to pay you.</p>
      </div>
    </SectionCard>
  )
}
