import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HiOutlineBuildingOffice2,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlinePaintBrush,
  HiOutlinePrinter,
  HiOutlineQrCode,
  HiOutlineReceiptPercent,
  HiOutlineShoppingCart,
  HiOutlineTag,
  HiOutlineTruck,
} from 'react-icons/hi2'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Select from '../components/ui/Select.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import { supportedCurrencies } from '../data/currency.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess.js'
import { useWhatsappSettings } from '../hooks/useWhatsappSettings.js'
import { useUser } from '../hooks/useUser.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { labelForBusinessType, normalizeBusinessType } from '../data/moduleAccess.js'
import { whatsappCapabilities, whatsappTrialStatus } from '../lib/whatsappApiTrial.js'
import ConnectWhatsappModal from '../components/whatsapp/ConnectWhatsappModal.jsx'
import ConfirmDialog from '../components/whatsapp/ConfirmDialog.jsx'
import PasskeySettingsCard from '../../components/security/PasskeySettingsCard.jsx'
import UpgradeRequestTimelineCard from '../../components/upgrade/UpgradeRequestTimelineCard.jsx'
import useLatestUpgradeRequest from '../../hooks/useLatestUpgradeRequest.js'
import { RestaurantBillPreview, RestaurantKotPreview } from '../components/restaurant/RestaurantPrintPreview.jsx'
import { buildBillPrintData, buildKotPrintData, calculateRestaurantBill } from '../lib/restaurantPosCalculations.js'
import {
  defaultPrinterSettings,
  loadStoredUsbDeviceInfo,
  normalizePrinterSettings,
  printThermalText,
  requestThermalPrinter,
  webUsbSupported,
} from '../lib/printerService.js'

const defaultBarcodeScannerSettings = {
  enabled: true,
  mode: 'keyboard',
  autoAddToCart: true,
  submitKey: 'Enter',
  minLength: 4,
  scanTimeoutMs: 700,
  deviceName: '',
  lastTestCode: '',
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function connectionStatusLabel(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'not_connected') return 'Not connected'
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-slate-950 dark:text-white">{value}</span>
    </div>
  )
}

function moduleSettingsCopy(businessType) {
  const normalized = normalizeBusinessType(businessType)
  if (normalized === 'School ERP') {
    return {
      badge: 'School ERP',
      title: 'School / Campus setup',
      subtitle: 'These details print on fee bills, school reports, attendance PDFs, receipts, and vouchers.',
      nameLabel: 'School / Campus Name',
      namePlaceholder: 'Nexora School',
      taxLabel: 'Registration / NTN',
      invoicePrefixLabel: 'Fee Bill Prefix',
      invoicePrefixPlaceholder: 'FEE',
      reportPrefixPlaceholder: 'SCH',
      footerPlaceholder: 'Prepared by school administration',
      addressLabel: 'Campus Address',
      phoneLabel: 'School Phone',
    }
  }
  if (normalized === 'Restaurant POS') {
    return {
      badge: 'Restaurant POS',
      title: 'Restaurant workspace setup',
      subtitle: 'These details print on bills, KOT, closing reports, receipts, and vouchers.',
      nameLabel: 'Restaurant / Outlet Name',
      namePlaceholder: 'Nexora Restaurant',
      taxLabel: 'NTN / VAT / GST Number',
      invoicePrefixLabel: 'Bill Prefix',
      invoicePrefixPlaceholder: 'BILL',
      reportPrefixPlaceholder: 'RPT',
      footerPlaceholder: 'Thank you for dining with us',
      addressLabel: 'Restaurant Address',
      phoneLabel: 'Restaurant Phone',
    }
  }
  if (normalized === 'Transport / Rental') {
    return {
      badge: 'Transport',
      title: 'Transport company setup',
      subtitle: 'These details print on rental bills, fleet reports, payment slips, and vouchers.',
      nameLabel: 'Transport Company Name',
      namePlaceholder: 'Nexora Transport',
      taxLabel: 'NTN / Registration Number',
      invoicePrefixLabel: 'Rental Invoice Prefix',
      invoicePrefixPlaceholder: 'TRN',
      reportPrefixPlaceholder: 'TRP',
      footerPlaceholder: 'Fleet report prepared by Nexora Solution',
      addressLabel: 'Office / Yard Address',
      phoneLabel: 'Dispatch Phone',
    }
  }
  if (normalized === 'Property ERP') {
    return {
      badge: 'Property ERP',
      title: 'Property business setup',
      subtitle: 'These details print on rent bills, owner reports, tenant statements, contracts, and vouchers.',
      nameLabel: 'Property Business Name',
      namePlaceholder: 'Nexora Properties',
      taxLabel: 'NTN / Registration Number',
      invoicePrefixLabel: 'Rent Bill Prefix',
      invoicePrefixPlaceholder: 'RENT',
      reportPrefixPlaceholder: 'PRP',
      footerPlaceholder: 'Property statement prepared by Nexora Solution',
      addressLabel: 'Office Address',
      phoneLabel: 'Office Phone',
    }
  }
  if (normalized === 'WhatsApp CRM') {
    return {
      badge: 'WhatsApp CRM',
      title: 'WhatsApp CRM workspace setup',
      subtitle: 'These details appear on reports, customer summaries, campaign exports, and vouchers.',
      nameLabel: 'Business Display Name',
      namePlaceholder: 'Nexora WhatsApp CRM',
      taxLabel: 'Registration / Tax Number',
      invoicePrefixLabel: 'Invoice Prefix',
      invoicePrefixPlaceholder: 'INV',
      reportPrefixPlaceholder: 'WAP',
      footerPlaceholder: 'Generated by Nexora WhatsApp CRM',
      addressLabel: 'Business Address',
      phoneLabel: 'Business Phone',
    }
  }
  return {
    badge: 'Sales Hub',
    title: 'Company / Workspace setup',
    subtitle: 'These details print on invoices, reports, account statements, receipts, and vouchers.',
    nameLabel: 'Company / Workspace Name',
    namePlaceholder: 'Nexora Solution',
    taxLabel: 'NTN / Tax ID',
    invoicePrefixLabel: 'Invoice Prefix',
    invoicePrefixPlaceholder: 'INV',
    reportPrefixPlaceholder: 'RPT',
    footerPlaceholder: 'Thank you for your business',
    addressLabel: 'Business Address',
    phoneLabel: 'Business Phone',
  }
}

function WorkspaceSetupCard({ businessType, draft, setDraft, currency, setCurrency, canManageSettings }) {
  const copy = moduleSettingsCopy(businessType)
  const normalized = normalizeBusinessType(businessType)
  const themeColor = draft.themeColor || '#2563eb'
  const documentTargets = normalized === 'Restaurant POS'
    ? ['Bill', 'KOT', 'Closing Report', 'Voucher']
    : normalized === 'School ERP'
      ? ['Fee Bill', 'Attendance PDF', 'Report', 'Voucher']
      : normalized === 'Transport / Rental'
        ? ['Rental Bill', 'Fleet Report', 'Payment Slip', 'Voucher']
        : normalized === 'Property ERP'
          ? ['Rent Bill', 'Contract', 'Owner Report', 'Voucher']
          : ['Invoice', 'Report', 'Statement', 'Voucher']

  function patch(values) {
    setDraft((current) => ({ ...current, ...values }))
  }

  return (
    <Card id="business-profile" className="scroll-mt-28 h-full overflow-hidden rounded-[1.5rem] border-slate-200/80 bg-white p-0 shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge variant="info">{copy.badge}</Badge>
            <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">{copy.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{copy.subtitle}</p>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
            <HiOutlineBuildingOffice2 className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {documentTargets.map((target) => (
            <div key={target} className="rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-sm">
              <p className="text-xs font-bold text-slate-600">{target}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Brand identity</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label={copy.nameLabel} className="sm:col-span-2">
                <Input
                  value={draft.businessName || draft.companyName || draft.schoolName || ''}
                  onChange={(event) => {
                    const value = event.target.value
                    patch({
                      businessName: value,
                      companyName: value,
                      schoolName: normalized === 'School ERP' ? value : draft.schoolName,
                    })
                  }}
                  placeholder={copy.namePlaceholder}
                  readOnly={!canManageSettings}
                />
              </Field>
              <Field label={copy.addressLabel} className="sm:col-span-2">
                <Input value={draft.address || ''} onChange={(event) => patch({ address: event.target.value })} placeholder="Full address for printable documents" readOnly={!canManageSettings} />
              </Field>
              <Field label={copy.phoneLabel}>
                <Input value={draft.phone || ''} onChange={(event) => patch({ phone: event.target.value })} placeholder="+92..." readOnly={!canManageSettings} />
              </Field>
              <Field label="Email">
                <Input value={draft.email || ''} onChange={(event) => patch({ email: event.target.value })} placeholder="support@example.com" readOnly={!canManageSettings} />
              </Field>
              <Field label={copy.taxLabel}>
                <Input value={draft.taxNumber || ''} onChange={(event) => patch({ taxNumber: event.target.value })} placeholder={copy.taxLabel} readOnly={!canManageSettings} />
              </Field>
              <Field label="Currency">
                <Select value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={!canManageSettings}>
                  {supportedCurrencies.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Document numbering & footer</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label={copy.invoicePrefixLabel}>
                <Input value={draft.invoicePrefix || ''} onChange={(event) => patch({ invoicePrefix: event.target.value })} placeholder={copy.invoicePrefixPlaceholder} readOnly={!canManageSettings} />
              </Field>
              <Field label="Report Prefix">
                <Input value={draft.reportPrefix || ''} onChange={(event) => patch({ reportPrefix: event.target.value })} placeholder={copy.reportPrefixPlaceholder} readOnly={!canManageSettings} />
              </Field>
              <Field label="Receipt / Voucher Footer" className="sm:col-span-2">
                <Input value={draft.receiptFooter || ''} onChange={(event) => patch({ receiptFooter: event.target.value })} placeholder={copy.footerPlaceholder} readOnly={!canManageSettings} />
              </Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Visual branding</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Theme Color">
                <Input type="color" value={themeColor} onChange={(event) => patch({ themeColor: event.target.value })} disabled={!canManageSettings} />
              </Field>
              <Field label="Logo URL">
                <Input value={draft.logoUrl || ''} onChange={(event) => patch({ logoUrl: event.target.value })} placeholder="https://..." readOnly={!canManageSettings} />
              </Field>
              <Field label="Authorized Signature URL" className="sm:col-span-2">
                <Input value={draft.signatureUrl || ''} onChange={(event) => patch({ signatureUrl: event.target.value })} placeholder="https://..." readOnly={!canManageSettings} />
              </Field>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-900">
                {draft.logoUrl || draft.avatarDataUrl ? <img src={draft.logoUrl || draft.avatarDataUrl} alt="Brand preview" className="h-full w-full object-contain p-1" /> : 'NX'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{draft.businessName || draft.companyName || copy.namePlaceholder}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{businessType}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
              <p className="truncate">{draft.address || copy.addressLabel}</p>
              <p className="truncate">{draft.phone || copy.phoneLabel}</p>
              <p className="truncate">{draft.email || 'email@example.com'}</p>
              <p className="truncate">{draft.taxNumber || copy.taxLabel}</p>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <HiOutlinePaintBrush className="h-4 w-4" style={{ color: themeColor }} />
                <p className="text-xs font-black text-slate-900">Document Preview</p>
              </div>
              <div className="mt-3 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
              <p className="mt-3 text-xs font-semibold text-slate-500">{draft.receiptFooter || copy.footerPlaceholder}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-800">
            Saved values are shared with invoices, reports, account statements, receipt footers, and printable vouchers.
          </div>
        </div>
      </div>
    </Card>
  )
}

function PrinterConnectionSettingsCard({ businessType, draft, setDraft, canManageSettings, onSaveSettings }) {
  const printer = normalizePrinterSettings(draft.printerSettings)
  const [note, setNote] = useState('')
  const [testing, setTesting] = useState(false)
  const storedDevice = loadStoredUsbDeviceInfo()
  const normalized = normalizeBusinessType(businessType)
  const moduleLabel = labelForBusinessType(businessType)
  const thermalUse =
    normalized === 'Restaurant POS'
      ? 'Bills, KOT, receipts'
      : normalized === 'School ERP'
        ? 'Fee vouchers, attendance summaries'
        : normalized === 'Transport / Rental'
          ? 'Booking slips, payment receipts'
          : 'Receipts and compact vouchers'

  function patchPrinter(patch) {
    setDraft((current) => ({
      ...current,
      printerSettings: {
        ...defaultPrinterSettings,
        ...(current.printerSettings || {}),
        ...patch,
      },
    }))
  }

  async function connectUsbPrinter() {
    if (!canManageSettings) return
    setNote('Opening Chrome USB printer selector...')
    const res = await requestThermalPrinter()
    if (!res.ok) {
      setNote(res.error || 'Printer connection failed.')
      return
    }
    patchPrinter(res.settings)
    setNote('USB thermal printer connected. Save changes to use it across this module.')
  }

  async function testPrint(paperSize = '58mm') {
    if (!canManageSettings) return
    setTesting(true)
    setNote(paperSize === '58mm' ? 'Sending test slip to direct thermal printer...' : 'Opening browser print test for A4...')
    if (paperSize === '58mm' && printer.mode === 'direct') {
      const res = await printThermalText(
        [
          'NEXORA SOLUTION',
          `${moduleLabel} Printer Test`,
          `Paper: ${printer.receiptPaperSize || '58mm'}`,
          `Time: ${new Date().toLocaleString()}`,
          'Printer connection is ready.',
        ].join('\n'),
        printer,
      )
      setTesting(false)
      setNote(res.ok ? 'Test slip sent successfully.' : res.error || 'Direct print failed.')
      return
    }
    const popup = window.open('', '_blank', 'width=820,height=900')
    if (popup) {
      popup.document.write(`<!doctype html><html><head><title>Nexora Printer Test</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#0f172a}.doc{border:1px solid #e2e8f0;border-radius:18px;padding:24px}h1{margin:0;font-size:26px}.meta{margin-top:14px;color:#475569}</style></head><body><section class="doc"><h1>Nexora Printer Test</h1><p class="meta">${moduleLabel} · ${new Date().toLocaleString()}</p><p>This A4 printer will use Chrome print when direct silent printing is not available.</p></section></body></html>`)
      popup.document.close()
      popup.focus()
      popup.print()
      setNote('A4 test sent to browser print.')
    } else {
      setNote('Allow pop-ups to print A4 test.')
    }
    setTesting(false)
  }

  async function saveAndClose() {
    setNote('Saving printer settings...')
    await onSaveSettings?.()
    setNote('Printer settings saved.')
  }

  return (
    <Card id="printer-settings" className="scroll-mt-28 overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Printer Connection</p>
            <h2 className="mt-2 text-xl font-black tracking-tight">A4 + 58mm printing</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Configure printers for invoices, reports, vouchers, receipts, and module documents.
            </p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/15">
            <HiOutlinePrinter className="h-6 w-6" />
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Print mode">
            <Select value={printer.mode} onChange={(event) => patchPrinter({ mode: event.target.value })} disabled={!canManageSettings}>
              <option value="browser">Chrome print fallback</option>
              <option value="direct">Direct printer first</option>
            </Select>
          </Field>
          <Field label="Connection type">
            <Select value={printer.connectionType} onChange={(event) => patchPrinter({ connectionType: event.target.value })} disabled={!canManageSettings}>
              <option value="webusb">WebUSB thermal</option>
              <option value="browser">Browser only</option>
              <option value="native_bridge">Native bridge placeholder</option>
            </Select>
          </Field>
          <Field label="Default A4 printer name">
            <Input value={printer.a4PrinterName || ''} onChange={(event) => patchPrinter({ a4PrinterName: event.target.value })} placeholder="Office A4 Printer" readOnly={!canManageSettings} />
          </Field>
          <Field label="58mm thermal printer name">
            <Input value={printer.thermalPrinterName || ''} onChange={(event) => patchPrinter({ thermalPrinterName: event.target.value })} placeholder="Counter Thermal 58mm" readOnly={!canManageSettings} />
          </Field>
          <Field label="Default document size">
            <Select value={printer.defaultPaperSize || 'a4'} onChange={(event) => patchPrinter({ defaultPaperSize: event.target.value })} disabled={!canManageSettings}>
              <option value="a4">A4</option>
              <option value="58mm">58mm thermal</option>
            </Select>
          </Field>
          <Field label="Receipt/KOT size">
            <Select value={printer.receiptPaperSize || '58mm'} onChange={(event) => patchPrinter({ receiptPaperSize: event.target.value })} disabled={!canManageSettings}>
              <option value="58mm">58mm</option>
              <option value="a4">A4</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <Field label="USB Vendor ID">
            <Input value={printer.webUsbVendorId || ''} onChange={(event) => patchPrinter({ webUsbVendorId: event.target.value })} placeholder="Auto-filled after connect" readOnly={!canManageSettings} />
          </Field>
          <Field label="USB Product ID">
            <Input value={printer.webUsbProductId || ''} onChange={(event) => patchPrinter({ webUsbProductId: event.target.value })} placeholder="Auto-filled after connect" readOnly={!canManageSettings} />
          </Field>
          <Field label="USB Interface">
            <Input type="number" min="0" value={printer.webUsbInterface ?? 0} onChange={(event) => patchPrinter({ webUsbInterface: Math.max(0, Number(event.target.value) || 0) })} readOnly={!canManageSettings} />
          </Field>
          <Field label="USB Endpoint">
            <Input type="number" min="1" value={printer.webUsbEndpoint ?? 1} onChange={(event) => patchPrinter({ webUsbEndpoint: Math.max(1, Number(event.target.value) || 1) })} readOnly={!canManageSettings} />
          </Field>
        </div>

        <div className="grid gap-2 text-xs font-semibold text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(printer.autoPrintInvoices)} onChange={(event) => patchPrinter({ autoPrintInvoices: event.target.checked })} disabled={!canManageSettings} />
            Auto print invoices / fee bills after save
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(printer.autoPrintReports)} onChange={(event) => patchPrinter({ autoPrintReports: event.target.checked })} disabled={!canManageSettings} />
            Auto print reports when print action is used
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(printer.autoPrintReceipts)} onChange={(event) => patchPrinter({ autoPrintReceipts: event.target.checked })} disabled={!canManageSettings} />
            Auto print payment receipts
          </label>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-5 text-indigo-900">
          <p className="font-black">Module use: {thermalUse}</p>
          <p className="mt-1">
            Direct 58mm print needs Chrome/Edge WebUSB permission. A4 silent printing requires kiosk/native bridge, otherwise Chrome print dialog opens.
          </p>
          <p className="mt-1 font-semibold">
            Status: {webUsbSupported() ? 'WebUSB available' : 'WebUSB unavailable'}{storedDevice ? ` · Last USB: ${storedDevice.productName || storedDevice.vendorId}` : ''}
          </p>
        </div>

        {note ? <p className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{note}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="subtle" className="rounded-2xl" onClick={connectUsbPrinter} disabled={!canManageSettings || !webUsbSupported()}>
            Connect 58mm USB
          </Button>
          <Button type="button" variant="subtle" className="rounded-2xl" onClick={() => testPrint('58mm')} disabled={!canManageSettings || testing}>
            Test 58mm
          </Button>
          <Button type="button" variant="subtle" className="rounded-2xl" onClick={() => testPrint('a4')} disabled={!canManageSettings || testing}>
            Test A4
          </Button>
          <Button type="button" className="rounded-2xl" onClick={saveAndClose} disabled={!canManageSettings}>
            Save Printer
          </Button>
        </div>
      </div>
    </Card>
  )
}

function BarcodeScannerSettingsCard({ draft, setDraft, canManageSettings, onSaveSettings }) {
  const scanner = { ...defaultBarcodeScannerSettings, ...(draft.barcodeScannerSettings || {}) }
  const [testCode, setTestCode] = useState('')
  const [note, setNote] = useState('')

  function patchScanner(patch) {
    setDraft((current) => ({
      ...current,
      barcodeScannerSettings: {
        ...defaultBarcodeScannerSettings,
        ...(current.barcodeScannerSettings || {}),
        ...patch,
      },
    }))
  }

  async function saveScannerSettings() {
    if (!canManageSettings) return
    setNote('Saving barcode scanner settings...')
    await onSaveSettings?.()
    setNote('Barcode scanner settings saved.')
  }

  function handleTestKeyDown(event) {
    if (event.key !== scanner.submitKey) return
    const code = testCode.trim()
    if (!code) return
    event.preventDefault()
    patchScanner({ lastTestCode: code })
    setNote(`Scanner test received: ${code}`)
    setTestCode('')
  }

  return (
    <Card id="barcode-scanner-settings" className="scroll-mt-28 overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-gradient-to-br from-blue-950 via-slate-950 to-cyan-950 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Barcode Scanner</p>
            <h2 className="mt-2 text-xl font-black tracking-tight">POS scanner connection</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Connect USB/Bluetooth scanners that type barcode numbers and press Enter automatically.
            </p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/15">
            <HiOutlineQrCode className="h-6 w-6" />
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Scanner status">
            <Select value={scanner.enabled ? 'enabled' : 'disabled'} onChange={(event) => patchScanner({ enabled: event.target.value === 'enabled' })} disabled={!canManageSettings}>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </Select>
          </Field>
          <Field label="Connection mode">
            <Select value={scanner.mode} onChange={(event) => patchScanner({ mode: event.target.value })} disabled={!canManageSettings}>
              <option value="keyboard">USB/Bluetooth keyboard scanner</option>
              <option value="camera">Camera scanner placeholder</option>
            </Select>
          </Field>
          <Field label="Scanner/device name">
            <Input value={scanner.deviceName || ''} onChange={(event) => patchScanner({ deviceName: event.target.value })} placeholder="Counter scanner / Zebra / Honeywell" readOnly={!canManageSettings} />
          </Field>
          <Field label="Submit key">
            <Select value={scanner.submitKey} onChange={(event) => patchScanner({ submitKey: event.target.value })} disabled={!canManageSettings}>
              <option value="Enter">Enter</option>
              <option value="Tab">Tab</option>
            </Select>
          </Field>
          <Field label="Minimum barcode length">
            <Input type="number" min="1" value={scanner.minLength} onChange={(event) => patchScanner({ minLength: Math.max(1, Number(event.target.value) || 4) })} readOnly={!canManageSettings} />
          </Field>
          <Field label="Scan timeout ms">
            <Input type="number" min="200" value={scanner.scanTimeoutMs} onChange={(event) => patchScanner({ scanTimeoutMs: Math.max(200, Number(event.target.value) || 700) })} readOnly={!canManageSettings} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={Boolean(scanner.autoAddToCart)} onChange={(event) => patchScanner({ autoAddToCart: event.target.checked })} disabled={!canManageSettings} />
          Auto add scanned product to POS cart
        </label>

        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-800">Test scanner</p>
          <Input
            className="mt-2"
            value={testCode}
            onChange={(event) => setTestCode(event.target.value)}
            onKeyDown={handleTestKeyDown}
            placeholder="Click here and scan barcode..."
            readOnly={!canManageSettings}
          />
          <p className="mt-2 text-xs font-semibold text-cyan-900">
            Last test: {scanner.lastTestCode || 'No scan yet'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          Most retail barcode scanners work in keyboard mode. In POS Billing, scan a product barcode and it will auto-add to cart if barcode/SKU matches inventory.
        </div>

        {note ? <p className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{note}</p> : null}

        <Button type="button" className="rounded-2xl" onClick={saveScannerSettings} disabled={!canManageSettings}>
          Save Scanner
        </Button>
      </div>
    </Card>
  )
}

function RetailPosSettingsCard({ draft, setDraft, canManageSettings, onSaveSettings }) {
  const printer = normalizePrinterSettings(draft.printerSettings)
  const scanner = { ...defaultBarcodeScannerSettings, ...(draft.barcodeScannerSettings || {}) }
  const retailPos = draft.retailPos || {}
  const [note, setNote] = useState('')

  function patch(values) {
    setDraft((current) => ({ ...current, ...values }))
  }

  function patchRetail(values) {
    setDraft((current) => ({
      ...current,
      retailPos: {
        ...(current.retailPos || {}),
        ...values,
      },
    }))
  }

  async function saveRetailSettings() {
    if (!canManageSettings) return
    setNote('Saving Retail / POS settings...')
    await onSaveSettings?.()
    setNote('Retail / POS settings saved.')
    window.setTimeout(() => setNote(''), 2200)
  }

  const scannerState = scanner.enabled ? 'Enabled' : 'Disabled'
  const printerState = printer.mode === 'direct' ? 'Direct first' : 'Chrome print'

  return (
    <Card id="retail-pos-settings" className="scroll-mt-28 overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-gradient-to-br from-sky-950 via-blue-950 to-violet-950 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Retail / POS</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Counter settings</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Set till cash behavior, POS tax, receipt defaults, printer size, and scanner readiness from one clean control panel.
            </p>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-200 ring-1 ring-white/15">
            <HiOutlineShoppingCart className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <MiniStatus icon={HiOutlineBanknotes} label="Patti cash" value="Daily separate" />
          <MiniStatus icon={HiOutlineTag} label="Promo" value="Code based" />
          <MiniStatus icon={HiOutlinePrinter} label="Printer" value={printerState} />
          <MiniStatus icon={HiOutlineQrCode} label="Scanner" value={scannerState} />
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <HiOutlineBanknotes className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-slate-950">Till & cash control</p>
              <p className="text-xs font-semibold text-slate-500">Opening cash stays separate from sales revenue.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Default opening cash hint">
              <Input
                type="number"
                min="0"
                value={retailPos.defaultOpeningCash ?? ''}
                onChange={(event) => patchRetail({ defaultOpeningCash: event.target.value })}
                placeholder="Example: 5000"
                readOnly={!canManageSettings}
              />
            </Field>
            <Field label="Cash drawer / counter name">
              <Input
                value={retailPos.cashDrawerName || ''}
                onChange={(event) => patchRetail({ cashDrawerName: event.target.value })}
                placeholder="Main Counter"
                readOnly={!canManageSettings}
              />
            </Field>
            <Field label="Default payment method">
              <Select value={retailPos.defaultPaymentMethod || 'Cash'} onChange={(event) => patchRetail({ defaultPaymentMethod: event.target.value })} disabled={!canManageSettings}>
                <option>Cash</option>
                <option>Card</option>
                <option>JazzCash</option>
                <option>Easypaisa</option>
                <option>Bank Transfer</option>
              </Select>
            </Field>
            <Field label="Low stock alert qty">
              <Input
                type="number"
                min="0"
                value={retailPos.lowStockAlertQty ?? ''}
                onChange={(event) => patchRetail({ lowStockAlertQty: event.target.value })}
                placeholder="Example: 10"
                readOnly={!canManageSettings}
              />
            </Field>
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-800">
            First order par cashier se opening/patti cash poocha jayega. Yeh amount sale/revenue mein add nahi hota, sirf closing cash reference ke liye hota hai.
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <HiOutlineReceiptPercent className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-slate-950">Tax, receipt & billing</p>
              <p className="text-xs font-semibold text-slate-500">Defaults used by POS billing and reports.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="POS tax %">
              <Input type="number" min="0" value={draft.defaultPosTaxRate ?? 0} onChange={(event) => patch({ defaultPosTaxRate: event.target.value })} readOnly={!canManageSettings} />
            </Field>
            <Field label="Invoice tax %">
              <Input type="number" min="0" value={draft.defaultInvoiceTaxRate ?? 0} onChange={(event) => patch({ defaultInvoiceTaxRate: event.target.value })} readOnly={!canManageSettings} />
            </Field>
            <Field label="POS order prefix">
              <Input value={retailPos.orderPrefix || 'POS'} onChange={(event) => patchRetail({ orderPrefix: event.target.value })} placeholder="POS" readOnly={!canManageSettings} />
            </Field>
            <Field label="Receipt paper">
              <Input value={printer.receiptPaperSize || '58mm'} readOnly />
            </Field>
            <Field label="Receipt footer" className="sm:col-span-2">
              <Input value={draft.receiptFooter || ''} onChange={(event) => patch({ receiptFooter: event.target.value })} placeholder="Thank you for shopping with us" readOnly={!canManageSettings} />
            </Field>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-black text-slate-950">Retail shortcuts</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">Fast access for cashier setup, promos, orders, and till screen.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/app/pos-discounts" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 text-sm font-black text-blue-700 shadow-sm hover:bg-blue-50">
                <HiOutlineTag className="h-4 w-4" /> Tax & Promo
              </Link>
              <Link to="/app/pos-orders" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-violet-100 bg-white px-3 text-sm font-black text-violet-700 shadow-sm hover:bg-violet-50">
                <HiOutlineReceiptPercent className="h-4 w-4" /> POS Orders
              </Link>
              <button type="button" onClick={() => window.open('/app/pos', '_blank', 'noopener,noreferrer')} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                <HiOutlineShoppingCart className="h-4 w-4" /> Open POS
              </button>
            </div>
          </div>
        </div>

        {note ? <p className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white lg:col-span-2">{note}</p> : null}

        <div className="flex justify-end lg:col-span-2">
          <Button type="button" className="rounded-2xl" onClick={saveRetailSettings} disabled={!canManageSettings}>
            Save Retail POS Settings
          </Button>
        </div>
      </div>
    </Card>
  )
}

function MiniStatus({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-200" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">{label}</span>
      </div>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  )
}

// Workspace WhatsApp API settings — trial status, message usage, days remaining,
// WhatsApp Business connection (display name, number, Meta IDs), webhook status,
// and Connect / Test / Disconnect actions. Shown only for the WhatsApp CRM
// workspace. Never reads or writes Meta token material.
function WhatsappApiCard() {
  const { config, loading, canManage, saveConnection, testConnection, disconnect } = useWhatsappSettings({ enabled: true })
  const status = whatsappTrialStatus(config)
  const caps = whatsappCapabilities(config)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')

  function flash(message) {
    setNote(message)
    window.setTimeout(() => setNote(''), 2800)
  }

  function openConnect() {
    console.log('[WhatsApp Connect] opened')
    setNote('')
    setModalOpen(true)
  }

  async function handleSave(details) {
    setBusy('save')
    const res = await saveConnection(details)
    setBusy('')
    if (!res?.ok) {
      if (res?.code === 'validation_failed') console.log('[WhatsApp Connect] validation failed', res.error)
      return res
    }
    console.log('[WhatsApp Connect] saved')
    setModalOpen(false)
    flash('WhatsApp Business details saved. Backend verification required.')
    return res
  }

  async function handleTest() {
    setBusy('test')
    const res = await testConnection()
    setBusy('')
    if (!res?.ok) {
      if (res?.code === 'validation_failed') console.log('[WhatsApp Connect] validation failed', res.error)
      flash(res?.error || 'Test connection failed.')
      return
    }
    console.log('[WhatsApp Connect] test ready')
    flash('WhatsApp Business details saved. Backend verification required.')
  }

  async function handleDisconnect() {
    setBusy('disconnect')
    const res = await disconnect()
    setBusy('')
    setConfirmOpen(false)
    if (!res?.ok) {
      flash(res?.error || 'Unable to disconnect.')
      return
    }
    console.log('[WhatsApp Connect] disconnected')
    flash('WhatsApp Business disconnected.')
  }

  const modeVariant = caps.isPaid ? 'success' : caps.isTrial ? 'info' : 'default'
  const hasConnection = Boolean(config.connectedNumber || config.phoneNumberId || config.businessAccountId)
  const connStatusVariant = config.connectionStatus === 'test_ready'
    ? 'success'
    : config.connectionStatus === 'disconnected'
      ? 'danger'
      : config.connectionStatus === 'pending_verification'
        ? 'warning'
        : 'default'
  const webhookVariant = config.webhookStatus === 'disconnected' ? 'danger' : config.webhookStatus === 'pending' ? 'warning' : config.webhookVerified ? 'success' : 'default'

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <HiOutlineChatBubbleLeftRight className="text-xl" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">WhatsApp Business</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Connection, trial status, and message usage.</p>
          </div>
        </div>
        <Badge variant={modeVariant}>{status.label}</Badge>
      </div>

      {/* Trial status + usage */}
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700/70">Connection</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{connectionStatusLabel(config.connectionStatus)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700/70">Trial Days Left</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{caps.isPaid ? 'Unlimited' : caps.isTrial ? `${status.daysRemaining} days` : '—'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Message usage</span>
            <span className="font-semibold text-slate-950">
              {caps.isPaid ? `${status.messagesUsed} sent` : `${status.messagesUsed} / ${status.messageLimit}`}
            </span>
          </div>
          {!caps.isPaid ? (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${status.usagePercent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${status.usagePercent}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Connection details */}
      <div className="mt-4 rounded-2xl border border-slate-200/80 p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Business connection</p>
          <Badge variant={connStatusVariant}>{connectionStatusLabel(config.connectionStatus)}</Badge>
        </div>
        <StatRow label="API Mode" value={status.label} />
        <StatRow label="Business Name" value={config.displayName || '—'} />
        <StatRow label="Connected Number" value={config.connectedNumber || '—'} />
        <StatRow label="Phone Number ID" value={config.phoneNumberId || '—'} />
        <StatRow label="Business Account ID" value={config.businessAccountId || '—'} />
        <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400">Webhook Status</span>
          <Badge variant={webhookVariant}>{config.webhookStatus ? connectionStatusLabel(config.webhookStatus) : config.webhookVerified ? 'Verified' : 'Pending'}</Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to="/app/whatsapp-connect"
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          {hasConnection ? 'Manage Connection' : 'Connect WhatsApp'}
        </Link>
        <Button
          variant="subtle"
          className="rounded-2xl"
          type="button"
          disabled={!canManage}
          onClick={openConnect}
        >
          Edit Details
        </Button>
        <Button
          variant="subtle"
          className="rounded-2xl"
          type="button"
          disabled={!canManage || busy === 'test'}
          onClick={handleTest}
        >
          {busy === 'test' ? 'Testing…' : 'Test Connection'}
        </Button>
        {hasConnection ? (
          <Button
            variant="ghost"
            className="rounded-2xl text-rose-700 hover:bg-rose-50"
            type="button"
            disabled={!canManage || busy === 'disconnect'}
            onClick={() => setConfirmOpen(true)}
          >
            Disconnect
          </Button>
        ) : null}
        {note ? <span className="text-xs font-semibold text-slate-500">{note}</span> : null}
      </div>

      <p className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-2.5 text-[11px] leading-5 text-sky-900">
        Access token will be configured securely from Nexora backend.
      </p>

      {/* Trial restrictions */}
      {caps.isTrial ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">
          <p className="font-semibold">Trial limits</p>
          <p className="mt-1">One number · up to {status.messageLimit} messages · no broadcasts, bulk sending, or AI automation.</p>
        </div>
      ) : null}

      {/* Upgrade */}
      {!caps.isPaid ? (
        <Link
          to="/app/subscriptions"
          className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform duration-100 hover:scale-[1.01]"
        >
          Upgrade for full WhatsApp API
        </Link>
      ) : null}

      {loading ? <p className="mt-3 text-xs text-slate-400">Loading WhatsApp settings…</p> : null}
      {!canManage ? <p className="mt-3 text-xs text-slate-400">View access only — ask an admin to change WhatsApp settings.</p> : null}

      <ConnectWhatsappModal
        open={modalOpen}
        config={config}
        busy={busy === 'save'}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
      <ConfirmDialog
        open={confirmOpen}
        badge="Disconnect"
        tone="danger"
        title="Disconnect WhatsApp Business?"
        message="This clears the connected number and Meta IDs. Message usage history is kept. You can reconnect anytime."
        confirmLabel="Disconnect"
        busy={busy === 'disconnect'}
        onConfirm={handleDisconnect}
        onClose={() => setConfirmOpen(false)}
      />
    </Card>
  )
}

function RestaurantPosSettingsCard({ draft, setDraft, canManageSettings, onSaveSettings }) {
  const restaurantSettings = draft.restaurantPos || {}
  const [printSettingsOpen, setPrintSettingsOpen] = useState(false)
  const [printPreviewType, setPrintPreviewType] = useState('')
  const [printNote, setPrintNote] = useState('')
  const sampleRows = [
    { item: { id: 'sample-burger', name: 'Signature Burger', price: 749, discountType: 'none', discountValue: 0 }, qty: 2, note: 'Extra sauce' },
    { item: { id: 'sample-drink', name: 'Mint Margarita', price: 399, discountType: 'percentage', discountValue: 10 }, qty: 1, note: 'No ice' },
  ]
  const sampleTotals = calculateRestaurantBill(sampleRows, {
    discount: 100,
    serviceCharges: restaurantSettings.serviceChargePercentage ?? 0,
    tax: restaurantSettings.taxPercentage ?? 0,
    serviceChargeEnabled: restaurantSettings.enableServiceCharge !== false,
    taxEnabled: restaurantSettings.enableTax !== false,
  })
  const sampleSettings = {
    restaurantName: restaurantSettings.restaurantName || draft.businessName || 'Nexora Restaurant',
    legalName: restaurantSettings.legalName || draft.businessName || '',
    branchName: restaurantSettings.branchName || '',
    branchCode: restaurantSettings.branchCode || '',
    address: restaurantSettings.address || `${draft.city || 'City'}, ${draft.country || 'Pakistan'}`,
    phone: restaurantSettings.phone || draft.phone || '',
    whatsappPhone: restaurantSettings.whatsappPhone || '',
    taxNumber: restaurantSettings.taxNumber || '',
    salesTaxNumber: restaurantSettings.salesTaxNumber || '',
    fbrPosId: restaurantSettings.fbrPosId || '',
    foodLicenseNumber: restaurantSettings.foodLicenseNumber || '',
    footerMessage: restaurantSettings.footerMessage || draft.receiptFooter || 'Thank you for dining with us',
    showLogo: restaurantSettings.showLogo !== false,
    logoUrl: restaurantSettings.logoUrl || restaurantSettings.logoDataUrl || '',
    enableBillQr: Boolean(restaurantSettings.enableBillQr),
    enableKotQr: Boolean(restaurantSettings.enableKotQr),
    qrValue: restaurantSettings.qrValue || 'https://nexora.app',
  }
  const billPreview = buildBillPrintData({
    restaurantName: sampleSettings.restaurantName,
    orderNumber: '#45268',
    billNumber: 'BILL-45268',
    orderType: 'Dine-in',
    table: 'T-04',
    customerName: 'Walk-in Guest',
    customerPhone: '0300 1234567',
    rows: sampleTotals.rows,
    totals: sampleTotals,
    paidAmount: sampleTotals.total,
    paymentMethod: 'Cash',
    settings: sampleSettings,
  })
  const kotPreview = buildKotPrintData({
    restaurantName: sampleSettings.restaurantName,
    orderNumber: '#45268',
    kotNumber: 'KOT-45268',
    orderType: 'Dine-in',
    table: 'T-04',
    rows: sampleTotals.rows,
    notes: 'Serve hot',
    priority: 'Normal',
    settings: sampleSettings,
  })

  function updateRestaurantSetting(key, value) {
    setDraft((current) => ({
      ...current,
      restaurantPos: {
        ...(current.restaurantPos || {}),
        [key]: value,
      },
    }))
  }

  function handleLogoFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateRestaurantSetting('logoDataUrl', String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  async function savePrintSettings() {
    setPrintNote('Saving print settings...')
    await onSaveSettings?.()
    setPrintNote('Print settings saved.')
  }

  return (
    <>
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Restaurant POS Settings</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">Printer, kitchen display, tax, and service defaults.</p>
        </div>
        <Badge variant="warning">Restaurant</Badge>
      </div>

      <div className="mt-4 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Print Templates</p>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">Bill & KOT Print Settings</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Logo, receipt details, QR, printers, and auto-print defaults.</p>
              </div>
              <Button
                type="button"
                className="rounded-2xl"
                onClick={() => {
                  setPrintPreviewType('')
                  setPrintNote('')
                  setPrintSettingsOpen(true)
                }}
              >
                Bill & KOT Print Settings
              </Button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Printer Settings</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Bill printer name">
              <Input value={restaurantSettings.billPrinterName || ''} onChange={(event) => updateRestaurantSetting('billPrinterName', event.target.value)} placeholder="Front Counter 58mm" readOnly={!canManageSettings} />
            </Field>
            <Field label="Kitchen printer name">
              <Input value={restaurantSettings.kitchenPrinterName || ''} onChange={(event) => updateRestaurantSetting('kitchenPrinterName', event.target.value)} placeholder="Kitchen KOT Printer" readOnly={!canManageSettings} />
            </Field>
            <Field label="Paper size">
              <Select value={restaurantSettings.paperSize || '58mm'} onChange={(event) => updateRestaurantSetting('paperSize', event.target.value)} disabled={!canManageSettings}>
                <option>58mm</option>
                <option>80mm</option>
              </Select>
            </Field>
            <ToggleSetting label="Auto print bill" checked={Boolean(restaurantSettings.autoPrintBill)} onChange={(value) => updateRestaurantSetting('autoPrintBill', value)} disabled={!canManageSettings} />
            <ToggleSetting label="Auto print KOT" checked={Boolean(restaurantSettings.autoPrintKot)} onChange={(value) => updateRestaurantSetting('autoPrintKot', value)} disabled={!canManageSettings} />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="button" variant="subtle" className="flex-1 rounded-2xl" disabled={!canManageSettings}>Test Bill Print</Button>
              <Button type="button" variant="subtle" className="flex-1 rounded-2xl" disabled={!canManageSettings}>Test KOT Print</Button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Kitchen Display Settings</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ToggleSetting label="Enable kitchen display" checked={restaurantSettings.enableKitchenDisplay !== false} onChange={(value) => updateRestaurantSetting('enableKitchenDisplay', value)} disabled={!canManageSettings} />
            <ToggleSetting label="Show pending column" checked={restaurantSettings.showPendingColumn !== false} onChange={(value) => updateRestaurantSetting('showPendingColumn', value)} disabled={!canManageSettings} />
            <ToggleSetting label="Show preparing column" checked={restaurantSettings.showPreparingColumn !== false} onChange={(value) => updateRestaurantSetting('showPreparingColumn', value)} disabled={!canManageSettings} />
            <ToggleSetting label="Show ready column" checked={restaurantSettings.showReadyColumn !== false} onChange={(value) => updateRestaurantSetting('showReadyColumn', value)} disabled={!canManageSettings} />
            <Field label="Auto refresh seconds">
              <Input type="number" min="0" value={restaurantSettings.autoRefreshSeconds || '10'} onChange={(event) => updateRestaurantSetting('autoRefreshSeconds', Math.max(0, Number(event.target.value) || 0))} readOnly={!canManageSettings} />
            </Field>
            <ToggleSetting label="Sound alert" checked={Boolean(restaurantSettings.soundAlert)} onChange={(value) => updateRestaurantSetting('soundAlert', value)} disabled={!canManageSettings} />
            <ToggleSetting label="Large kitchen cards" checked={Boolean(restaurantSettings.largeKitchenCards)} onChange={(value) => updateRestaurantSetting('largeKitchenCards', value)} disabled={!canManageSettings} />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Tax & Service Settings</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Tax percentage">
              <Input type="number" min="0" value={restaurantSettings.taxPercentage ?? 0} onChange={(event) => updateRestaurantSetting('taxPercentage', Math.max(0, Number(event.target.value) || 0))} readOnly={!canManageSettings} />
            </Field>
            <Field label="Service charge percentage">
              <Input type="number" min="0" value={restaurantSettings.serviceChargePercentage ?? 0} onChange={(event) => updateRestaurantSetting('serviceChargePercentage', Math.max(0, Number(event.target.value) || 0))} readOnly={!canManageSettings} />
            </Field>
            <ToggleSetting label="Enable tax" checked={restaurantSettings.enableTax !== false} onChange={(value) => updateRestaurantSetting('enableTax', value)} disabled={!canManageSettings} />
            <ToggleSetting label="Enable service charge" checked={restaurantSettings.enableServiceCharge !== false} onChange={(value) => updateRestaurantSetting('enableServiceCharge', value)} disabled={!canManageSettings} />
          </div>
        </div>
      </div>
    </Card>
    {printSettingsOpen ? (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
        <div className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Restaurant POS</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Bill & KOT Print Settings</h2>
              <p className="mt-1 text-xs text-slate-500">Configure receipt template, printers, QR, and auto-print settings.</p>
            </div>
            <button
              type="button"
              onClick={() => setPrintSettingsOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 hover:bg-slate-50"
              aria-label="Close print settings"
            >
              x
            </button>
          </div>

          <div className="grid max-h-[calc(100dvh-10rem)] gap-4 overflow-y-auto px-4 py-4 lg:grid-cols-[minmax(0,1fr)_300px] sm:px-5">
            <div className="min-w-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Restaurant logo">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-900">
                      {sampleSettings.logoUrl ? <img src={sampleSettings.logoUrl} alt="Restaurant logo preview" className="h-full w-full object-cover" /> : 'NX'}
                    </div>
                    <Input type="file" accept="image/*" onChange={handleLogoFile} disabled={!canManageSettings} />
                  </div>
                </Field>
                <Field label="Logo URL">
                  <Input value={restaurantSettings.logoUrl || ''} onChange={(event) => updateRestaurantSetting('logoUrl', event.target.value)} placeholder="https://..." readOnly={!canManageSettings} />
                </Field>
                <ToggleSetting label="Show logo" checked={restaurantSettings.showLogo !== false} onChange={(value) => updateRestaurantSetting('showLogo', value)} disabled={!canManageSettings} />
                <Field label="Restaurant name">
                  <Input value={restaurantSettings.restaurantName || ''} onChange={(event) => updateRestaurantSetting('restaurantName', event.target.value)} placeholder={draft.businessName || 'Nexora Restaurant'} readOnly={!canManageSettings} />
                </Field>
                <Field label="Address">
                  <Input value={restaurantSettings.address || ''} onChange={(event) => updateRestaurantSetting('address', event.target.value)} placeholder="Restaurant address" readOnly={!canManageSettings} />
                </Field>
                <Field label="Phone">
                  <Input value={restaurantSettings.phone || ''} onChange={(event) => updateRestaurantSetting('phone', event.target.value)} placeholder="Restaurant phone" readOnly={!canManageSettings} />
                </Field>
                <Field label="Tax number">
                  <Input value={restaurantSettings.taxNumber || ''} onChange={(event) => updateRestaurantSetting('taxNumber', event.target.value)} placeholder="NTN / VAT / GST number" readOnly={!canManageSettings} />
                </Field>
                <Field label="Footer message">
                  <Input value={restaurantSettings.footerMessage || ''} onChange={(event) => updateRestaurantSetting('footerMessage', event.target.value)} placeholder="Thank you for dining with us" readOnly={!canManageSettings} />
                </Field>
                <ToggleSetting label="Enable QR on Bill" checked={Boolean(restaurantSettings.enableBillQr)} onChange={(value) => updateRestaurantSetting('enableBillQr', value)} disabled={!canManageSettings} />
                <ToggleSetting label="Enable QR on KOT" checked={Boolean(restaurantSettings.enableKotQr)} onChange={(value) => updateRestaurantSetting('enableKotQr', value)} disabled={!canManageSettings} />
                <Field label="QR text/value" className="sm:col-span-2">
                  <Input value={restaurantSettings.qrValue || ''} onChange={(event) => updateRestaurantSetting('qrValue', event.target.value)} placeholder="Order tracking URL, UPI, JazzCash, or custom text" readOnly={!canManageSettings} />
                </Field>
                <Field label="Paper size">
                  <Select value={restaurantSettings.paperSize || '58mm'} onChange={(event) => updateRestaurantSetting('paperSize', event.target.value)} disabled={!canManageSettings}>
                    <option>58mm</option>
                    <option>80mm</option>
                  </Select>
                </Field>
                <Field label="Bill printer name">
                  <Input value={restaurantSettings.billPrinterName || ''} onChange={(event) => updateRestaurantSetting('billPrinterName', event.target.value)} placeholder="Front Counter 58mm" readOnly={!canManageSettings} />
                </Field>
                <Field label="KOT printer name">
                  <Input value={restaurantSettings.kitchenPrinterName || ''} onChange={(event) => updateRestaurantSetting('kitchenPrinterName', event.target.value)} placeholder="Kitchen KOT Printer" readOnly={!canManageSettings} />
                </Field>
                <ToggleSetting label="Auto print Bill" checked={Boolean(restaurantSettings.autoPrintBill)} onChange={(value) => updateRestaurantSetting('autoPrintBill', value)} disabled={!canManageSettings} />
                <ToggleSetting label="Auto print KOT" checked={Boolean(restaurantSettings.autoPrintKot)} onChange={(value) => updateRestaurantSetting('autoPrintKot', value)} disabled={!canManageSettings} />
              </div>
              {printNote ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{printNote}</p> : null}
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Preview</p>
              <div className="mt-3 max-h-[58vh] overflow-y-auto">
                {printPreviewType === 'bill' ? <RestaurantBillPreview data={billPreview} /> : null}
                {printPreviewType === 'kot' ? <RestaurantKotPreview data={kotPreview} /> : null}
                {!printPreviewType ? (
                  <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">No preview selected</p>
                      <p className="mt-1 text-xs text-slate-500">Click Preview Bill or Preview KOT to open a live receipt preview.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5">
            <Button type="button" variant="subtle" onClick={() => setPrintSettingsOpen(false)}>Close</Button>
            <Button type="button" variant="subtle" disabled={!canManageSettings}>Test Bill Print</Button>
            <Button type="button" variant="subtle" disabled={!canManageSettings}>Test KOT Print</Button>
            <Button type="button" variant="subtle" onClick={() => setPrintPreviewType('bill')}>Preview Bill</Button>
            <Button type="button" variant="subtle" onClick={() => setPrintPreviewType('kot')}>Preview KOT</Button>
            <Button type="button" onClick={savePrintSettings} disabled={!canManageSettings}>Save Settings</Button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  )
}

function ToggleSetting({ label, checked, onChange, disabled }) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-slate-950" />
    </label>
  )
}

function RestaurantWorkspaceInfo({ draft, setDraft, canManageSettings }) {
  const restaurantSettings = draft.restaurantPos || {}
  function updateRestaurantSetting(key, value) {
    setDraft((current) => ({
      ...current,
      restaurantPos: {
        ...(current.restaurantPos || {}),
        [key]: value,
      },
    }))
  }

  return (
    <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50/50 p-4">
      <div className="flex flex-col gap-2 border-b border-amber-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">Restaurant workspace details</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These values are used on restaurant bills, KOT, counters, reports, and closing templates.
          </p>
        </div>
        <Badge variant="warning">Restaurant POS</Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Restaurant Display Name">
          <Input
            value={restaurantSettings.restaurantName || draft.businessName || ''}
            onChange={(event) => {
              updateRestaurantSetting('restaurantName', event.target.value)
              setDraft((current) => ({ ...current, businessName: event.target.value, companyName: event.target.value }))
            }}
            placeholder="Restaurant name printed on bills"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Legal Company Name">
          <Input
            value={restaurantSettings.legalName || ''}
            onChange={(event) => updateRestaurantSetting('legalName', event.target.value)}
            placeholder="Registered company / owner name"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Branch / Outlet Name">
          <Input
            value={restaurantSettings.branchName || ''}
            onChange={(event) => updateRestaurantSetting('branchName', event.target.value)}
            placeholder="Main Branch, DHA, Mall Road..."
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Branch Code">
          <Input
            value={restaurantSettings.branchCode || ''}
            onChange={(event) => updateRestaurantSetting('branchCode', event.target.value)}
            placeholder="BR-001"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Restaurant Address" className="sm:col-span-2">
          <Input
            value={restaurantSettings.address || draft.address || ''}
            onChange={(event) => {
              updateRestaurantSetting('address', event.target.value)
              setDraft((current) => ({ ...current, address: event.target.value }))
            }}
            placeholder="Full address for bill and KOT"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Restaurant Phone">
          <Input
            value={restaurantSettings.phone || draft.phone || ''}
            onChange={(event) => {
              updateRestaurantSetting('phone', event.target.value)
              setDraft((current) => ({ ...current, phone: event.target.value }))
            }}
            placeholder="Counter phone"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="WhatsApp / Delivery Phone">
          <Input
            value={restaurantSettings.whatsappPhone || ''}
            onChange={(event) => updateRestaurantSetting('whatsappPhone', event.target.value)}
            placeholder="Delivery / WhatsApp number"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="NTN / VAT / GST Number">
          <Input
            value={restaurantSettings.taxNumber || draft.taxNumber || ''}
            onChange={(event) => {
              updateRestaurantSetting('taxNumber', event.target.value)
              setDraft((current) => ({ ...current, taxNumber: event.target.value }))
            }}
            placeholder="Tax registration number"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="STRN / Sales Tax Reg">
          <Input
            value={restaurantSettings.salesTaxNumber || ''}
            onChange={(event) => updateRestaurantSetting('salesTaxNumber', event.target.value)}
            placeholder="Sales tax registration"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="FBR POS ID">
          <Input
            value={restaurantSettings.fbrPosId || ''}
            onChange={(event) => updateRestaurantSetting('fbrPosId', event.target.value)}
            placeholder="FBR / POS integration ID"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Food License No.">
          <Input
            value={restaurantSettings.foodLicenseNumber || ''}
            onChange={(event) => updateRestaurantSetting('foodLicenseNumber', event.target.value)}
            placeholder="Food authority license"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Order Prefix">
          <Input
            value={restaurantSettings.orderPrefix || ''}
            onChange={(event) => updateRestaurantSetting('orderPrefix', event.target.value)}
            placeholder="ORD"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Bill Prefix">
          <Input
            value={restaurantSettings.billPrefix || draft.invoicePrefix || ''}
            onChange={(event) => {
              updateRestaurantSetting('billPrefix', event.target.value)
              setDraft((current) => ({ ...current, invoicePrefix: event.target.value }))
            }}
            placeholder="BILL"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="KOT Prefix">
          <Input
            value={restaurantSettings.kotPrefix || ''}
            onChange={(event) => updateRestaurantSetting('kotPrefix', event.target.value)}
            placeholder="KOT"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Business Day Opening Time">
          <Input
            type="time"
            value={restaurantSettings.openingTime || '16:00'}
            onChange={(event) => updateRestaurantSetting('openingTime', event.target.value)}
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Business Day Closing Time">
          <Input
            type="time"
            value={restaurantSettings.closingTime || '03:00'}
            onChange={(event) => updateRestaurantSetting('closingTime', event.target.value)}
            readOnly={!canManageSettings}
          />
        </Field>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800 md:col-span-2">
          Orders after midnight and before closing time are counted in the previous restaurant business day.
          Example: 4:00 PM opening and 3:00 AM closing keeps late-night sales in the same day report.
        </div>
        <Field label="Default Dining Area">
          <Select
            value={restaurantSettings.defaultDiningArea || 'Ground Floor'}
            onChange={(event) => updateRestaurantSetting('defaultDiningArea', event.target.value)}
            disabled={!canManageSettings}
          >
            <option>Ground Floor</option>
            <option>Family Hall</option>
            <option>Outdoor/VIP</option>
            <option>Delivery Counter</option>
          </Select>
        </Field>
        <Field label="Cash Drawer Name">
          <Input
            value={restaurantSettings.cashDrawerName || ''}
            onChange={(event) => updateRestaurantSetting('cashDrawerName', event.target.value)}
            placeholder="Main Cash Counter"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Bank Account / IBAN" className="sm:col-span-2">
          <Input
            value={restaurantSettings.bankAccount || ''}
            onChange={(event) => updateRestaurantSetting('bankAccount', event.target.value)}
            placeholder="Bank account for card/bank payments"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="JazzCash Account">
          <Input
            value={restaurantSettings.jazzCashAccount || ''}
            onChange={(event) => updateRestaurantSetting('jazzCashAccount', event.target.value)}
            placeholder="JazzCash merchant/account"
            readOnly={!canManageSettings}
          />
        </Field>
        <Field label="Easypaisa Account">
          <Input
            value={restaurantSettings.easypaisaAccount || ''}
            onChange={(event) => updateRestaurantSetting('easypaisaAccount', event.target.value)}
            placeholder="Easypaisa merchant/account"
            readOnly={!canManageSettings}
          />
        </Field>
      </div>
    </div>
  )
}

function TransportReportSettingsCard({ draft, setDraft, canManageSettings }) {
  const transportSettings = draft.transportRental || {}

  function updateTransportSetting(key, value) {
    setDraft((current) => ({
      ...current,
      transportRental: {
        ...(current.transportRental || {}),
        [key]: value,
      },
    }))
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
          <HiOutlineTruck className="text-xl" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Transport Report Template Settings</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Select the default advanced report template for Transport / Rental reports.</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        <Field label="Default Report Template">
          <Select
            value={transportSettings.reportTemplate || 'fleet-summary'}
            onChange={(event) => updateTransportSetting('reportTemplate', event.target.value)}
            disabled={!canManageSettings}
          >
            <option value="fleet-summary">Fleet Summary - operations and utilization</option>
            <option value="rental-ledger">Rental Ledger - bookings, dues, customers</option>
            <option value="financial-closing">Financial Closing - revenue and payments</option>
          </Select>
        </Field>
        <Field label="Report Footer">
          <Input
            value={transportSettings.reportFooter || ''}
            onChange={(event) => updateTransportSetting('reportFooter', event.target.value)}
            placeholder="Fleet report prepared by Nexora Solution"
            readOnly={!canManageSettings}
          />
        </Field>
        <Link
          to="/app/reports"
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 hover:bg-cyan-100"
        >
          <HiOutlineDocumentText className="h-4 w-4" />
          Open Report Templates
        </Link>
      </div>
    </Card>
  )
}

export default function SettingsPage() {
  const { userId, workspaceId, userDoc, firebaseUser } = useUser()
  const navigate = useNavigate()
  const { currency, setCurrency, profile, setProfile } = usePreferences()
  const { settings, businessType, saveSettings } = useBusinessSettings()
  const access = useWorkspaceAccess()
  const [draft, setDraft] = useState({ ...profile, ...settings })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const businessTypeLabel = labelForBusinessType(businessType)
  const canManageSettings = access.canManageSettings
  const viewOnlyMessage = 'You have view access only. Contact your workspace administrator to modify settings.'
  const latestUpgradeRequest = useLatestUpgradeRequest(userId, Boolean(userId))

  useEffect(() => {
    setDraft((current) => ({ ...current, ...profile, ...settings }))
  }, [profile, settings])

  async function onSaveProfile() {
    if (!canManageSettings) {
      setError(viewOnlyMessage)
      return
    }
    const businessPatch = {
      businessName: draft.businessName || draft.companyName || '',
      companyName: draft.businessName || draft.companyName || '',
      schoolName: normalizeBusinessType(businessType) === 'School ERP' ? (draft.schoolName || draft.businessName || draft.companyName || '') : draft.schoolName || '',
      logoUrl: draft.logoUrl || draft.avatarDataUrl || '',
      address: draft.address || '',
      phone: draft.phone || '',
      email: draft.email || '',
      taxNumber: draft.taxNumber || draft.taxId || '',
      currency,
      invoicePrefix: draft.invoicePrefix || '',
      reportPrefix: draft.reportPrefix || '',
      receiptFooter: draft.receiptFooter || '',
      signatureUrl: draft.signatureUrl || '',
      themeColor: draft.themeColor || '#2563eb',
      defaultPosTaxRate: Math.max(0, Number(draft.defaultPosTaxRate || 0)),
      defaultInvoiceTaxRate: Math.max(0, Number(draft.defaultInvoiceTaxRate || 0)),
      retailPosPromos: draft.retailPosPromos || settings.retailPosPromos || null,
      printerSettings: {
        ...defaultPrinterSettings,
        ...(draft.printerSettings || {}),
      },
      barcodeScannerSettings: {
        ...defaultBarcodeScannerSettings,
        ...(draft.barcodeScannerSettings || {}),
      },
      restaurantPos: {
        ...(draft.restaurantPos || {}),
        ...(normalizeBusinessType(businessType) === 'Restaurant POS'
          ? {
              restaurantName: draft.restaurantPos?.restaurantName || draft.businessName || draft.companyName || '',
              address: draft.restaurantPos?.address || draft.address || '',
              phone: draft.restaurantPos?.phone || draft.phone || '',
              taxNumber: draft.restaurantPos?.taxNumber || draft.taxNumber || '',
              footerMessage: draft.restaurantPos?.footerMessage || draft.receiptFooter || '',
              logoUrl: draft.restaurantPos?.logoUrl || draft.logoUrl || '',
            }
          : {}),
      },
      transportRental: {
        ...(draft.transportRental || {}),
        ...(normalizeBusinessType(businessType) === 'Transport / Rental'
          ? {
              companyName: draft.transportRental?.companyName || draft.businessName || draft.companyName || '',
              reportFooter: draft.transportRental?.reportFooter || draft.receiptFooter || '',
            }
          : {}),
      },
      retailPos: {
        ...(draft.retailPos || {}),
        ...(normalizeBusinessType(businessType) === 'Retail / POS'
          ? {
              outletName: draft.retailPos?.outletName || draft.businessName || draft.companyName || '',
              receiptFooter: draft.receiptFooter || '',
            }
          : {}),
      },
    }
    const res = await saveSettings(businessPatch)
    if (!res.ok) {
      setError(res.error || 'Unable to save business settings.')
      return
    }
    setError('')
    setProfile(draft)
    logActivity({
      workspaceId,
      userId,
      ...userActivityInfo(userDoc, firebaseUser),
      action: 'Settings/profile updated',
      module: 'Settings',
      description: `${businessTypeLabel} profile and business settings were updated.`,
      targetId: userId || '',
      targetName: draft.businessName || draft.companyName || draft.ownerName || 'Profile',
      metadata: { businessName: businessPatch.businessName, businessType, ownerName: draft.ownerName || '', currency },
    }).catch(() => {})
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  function onAvatarChange(file) {
    if (!canManageSettings || !file) return
    const reader = new FileReader()
    reader.onload = () => setDraft((current) => ({ ...current, avatarDataUrl: String(reader.result || ''), logoUrl: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageHeader
        title="Settings"
        subtitle="Profile and company/workspace information."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {saved ? <Badge variant="success">Saved</Badge> : null}
            {error ? <Badge variant="danger">{error}</Badge> : null}
            <Button variant="subtle" className="rounded-2xl" onClick={() => setDraft({ ...profile, ...settings })} type="button" disabled={!canManageSettings}>
              Reset
            </Button>
            <Button className="rounded-2xl" onClick={onSaveProfile} type="button" disabled={!canManageSettings}>
              Save changes
            </Button>
          </div>
        }
      />

      {!canManageSettings ? (
        <Card className="border-amber-100 bg-amber-50/80 p-4 text-sm font-semibold text-amber-900">
          {viewOnlyMessage}
        </Card>
      ) : null}

      <PasskeySettingsCard />

      <div className="grid min-w-0 gap-5">
        <div className="grid min-w-0 gap-5 xl:grid-cols-2 xl:items-start">
          <Card id="profile-settings" className="scroll-mt-28 h-full overflow-hidden rounded-[1.5rem] border-slate-200/80 bg-white p-0 shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-5 text-white sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  {draft.avatarDataUrl ? (
                    <img src={draft.avatarDataUrl} alt="Profile" className="h-16 w-16 rounded-3xl border border-white/20 bg-white object-cover shadow-sm" />
                  ) : (
                    <Avatar name={draft.ownerName || 'Owner'} className="h-16 w-16 rounded-3xl border border-white/20 text-base shadow-sm" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">Owner Profile</Badge>
                      {saved ? <HiOutlineCheckCircle className="text-lg text-emerald-300" /> : null}
                    </div>
                    <h2 className="mt-3 truncate text-xl font-black tracking-tight">{draft.ownerName || 'Workspace Owner'}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-300">{businessTypeLabel} contact identity</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="subtle" className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => fileRef.current?.click()} type="button" disabled={!canManageSettings}>
                    Upload image
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-2xl text-white hover:bg-white/10"
                    onClick={() => setDraft((current) => ({ ...current, avatarDataUrl: '', logoUrl: '' }))}
                    type="button"
                    disabled={!canManageSettings}
                  >
                    Remove
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => onAvatarChange(event.target.files?.[0])}
                    disabled={!canManageSettings}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <Field label="Owner Name">
                <Input
	                  value={draft.ownerName}
	                  onChange={(event) => setDraft((current) => ({ ...current, ownerName: event.target.value }))}
	                  placeholder="Owner name"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Phone Number">
                <Input
	                  value={draft.phone}
	                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
	                  placeholder="+92..."
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <Input
	                  value={draft.email}
	                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
	                  placeholder="Email"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800 sm:col-span-2">
                Ye profile contact details workspace header, printable documents aur client communication mein use hoti hain.
              </div>
            </div>
          </Card>

          {normalizeBusinessType(businessType) === 'Restaurant POS' ? (
            <RestaurantWorkspaceInfo draft={draft} setDraft={setDraft} canManageSettings={canManageSettings} />
          ) : (
            <WorkspaceSetupCard
              businessType={businessType}
              draft={draft}
              setDraft={setDraft}
              currency={currency}
              setCurrency={setCurrency}
              canManageSettings={canManageSettings}
            />
          )}
        </div>

        <div className="grid min-w-0 gap-5">
          {normalizeBusinessType(businessType) === 'Retail / POS' ? (
            <RetailPosSettingsCard
              draft={draft}
              setDraft={setDraft}
              canManageSettings={canManageSettings}
              onSaveSettings={onSaveProfile}
            />
          ) : null}
          <PrinterConnectionSettingsCard
            businessType={businessType}
            draft={draft}
            setDraft={setDraft}
            canManageSettings={canManageSettings}
            onSaveSettings={onSaveProfile}
          />
          {normalizeBusinessType(businessType) === 'Retail / POS' ? (
            <BarcodeScannerSettingsCard
              draft={draft}
              setDraft={setDraft}
              canManageSettings={canManageSettings}
              onSaveSettings={onSaveProfile}
            />
          ) : null}
          {normalizeBusinessType(businessType) === 'WhatsApp CRM' ? <WhatsappApiCard /> : null}
          {normalizeBusinessType(businessType) === 'Restaurant POS' ? (
            <RestaurantPosSettingsCard draft={draft} setDraft={setDraft} canManageSettings={canManageSettings} onSaveSettings={onSaveProfile} />
          ) : null}
          {normalizeBusinessType(businessType) === 'Transport / Rental' ? (
            <TransportReportSettingsCard draft={draft} setDraft={setDraft} canManageSettings={canManageSettings} />
          ) : null}
        </div>
      </div>

      <UpgradeRequestTimelineCard
        request={latestUpgradeRequest}
        moduleLabel={businessTypeLabel}
        onOpen={() => navigate('/upgrade-business', { state: { fromUpgradeBusiness: true } })}
        className="mt-5"
        hideWhenResolved
      />

    </motion.div>
  )
}
