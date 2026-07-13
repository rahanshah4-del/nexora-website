import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { HiOutlineQrCode, HiOutlineBars3CenterLeft, HiOutlineTrash } from 'react-icons/hi2'
import { isCouponValid } from '../../lib/loyaltyCalculations.js'

function dateStr(value) {
  if (!value) return '—'
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export default function LoyaltyCouponCard({ coupon, onDelete }) {
  const valid = isCouponValid(coupon)
  const usedCount = Number(coupon.usedCount || 0)
  const usageLimit = Number(coupon.usageLimit || 0)
  const usedPct = usageLimit > 0 ? Math.round((usedCount / usageLimit) * 100) : 0

  return (
    <div className={`rounded-2xl border p-4 ${valid ? 'bg-white' : 'bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-black tracking-wider text-slate-950">{coupon.code}</span>
            <Badge variant={valid ? 'success' : 'danger'}>{valid ? 'Active' : 'Expired'}</Badge>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-700">{coupon.name}</p>
          {coupon.description ? <p className="mt-0.5 text-xs text-slate-500">{coupon.description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {coupon.qrData ? <HiOutlineQrCode className="h-5 w-5 text-slate-400" /> : null}
          {coupon.barcodeData ? <HiOutlineBars3CenterLeft className="h-5 w-5 text-slate-400" /> : null}
          {onDelete ? (
            <button type="button" onClick={() => onDelete(coupon.id)} className="rounded-lg p-1 text-rose-500 hover:bg-rose-50">
              <HiOutlineTrash className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase text-slate-400">Discount</p>
          <p className="font-bold text-slate-950">
            {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `Rs ${Number(coupon.discountValue || 0).toLocaleString()}`}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase text-slate-400">Usage</p>
          <p className="font-bold text-slate-950">{usedCount}{usageLimit > 0 ? ` / ${usageLimit}` : ''}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase text-slate-400">Expires</p>
          <p className="font-bold text-slate-950">{dateStr(coupon.expiresAt)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase text-slate-400">Type</p>
          <p className="font-bold text-slate-950">{coupon.type || 'discount'}</p>
        </div>
      </div>

      {usageLimit > 0 ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${usedPct >= 90 ? 'bg-rose-500' : 'bg-sky-500'}`} style={{ width: `${usedPct}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
