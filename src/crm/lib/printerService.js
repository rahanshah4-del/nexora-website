const LOCAL_DEVICE_KEY = 'nexora.printer.usb.device.v1'

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

export const defaultPrinterSettings = {
  mode: 'browser',
  defaultPaperSize: 'a4',
  receiptPaperSize: '58mm',
  a4PrinterName: '',
  thermalPrinterName: '',
  connectionType: 'webusb',
  autoPrintInvoices: false,
  autoPrintReports: false,
  autoPrintReceipts: false,
  webUsbVendorId: '',
  webUsbProductId: '',
  webUsbInterface: 0,
  webUsbEndpoint: 1,
}

export function normalizePrinterSettings(settings = {}) {
  return {
    ...defaultPrinterSettings,
    ...(settings.printerSettings || settings || {}),
  }
}

export function directPrinterAvailable(settings = {}) {
  const printer = normalizePrinterSettings(settings)
  return printer.mode === 'direct' && printer.connectionType === 'webusb' && typeof navigator !== 'undefined' && Boolean(navigator.usb)
}

export function webUsbSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.usb)
}

function normalizeUsbId(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('0x')) return Number.parseInt(text, 16)
  return Number.parseInt(text, 10)
}

function storeUsbDeviceInfo(device) {
  if (typeof window === 'undefined' || !device) return
  const payload = {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName || '',
    manufacturerName: device.manufacturerName || '',
  }
  window.localStorage.setItem(LOCAL_DEVICE_KEY, JSON.stringify(payload))
}

export function loadStoredUsbDeviceInfo() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCAL_DEVICE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function requestThermalPrinter() {
  if (!webUsbSupported()) {
    return { ok: false, error: 'WebUSB is not available in this browser. Use Chrome/Edge on HTTPS or localhost.' }
  }
  try {
    const device = await navigator.usb.requestDevice({ filters: [] })
    storeUsbDeviceInfo(device)
    return {
      ok: true,
      device,
      settings: {
        mode: 'direct',
        connectionType: 'webusb',
        webUsbVendorId: String(device.vendorId),
        webUsbProductId: String(device.productId),
        thermalPrinterName: device.productName || device.manufacturerName || 'USB Thermal Printer',
      },
    }
  } catch (error) {
    return { ok: false, error: error?.message || 'Printer connection was cancelled.' }
  }
}

async function findUsbDevice(printer = {}) {
  if (!webUsbSupported()) return null
  const stored = loadStoredUsbDeviceInfo()
  const vendorId = normalizeUsbId(printer.webUsbVendorId || stored?.vendorId)
  const productId = normalizeUsbId(printer.webUsbProductId || stored?.productId)
  const devices = await navigator.usb.getDevices()
  return devices.find((device) => {
    if (vendorId && device.vendorId !== vendorId) return false
    if (productId && device.productId !== productId) return false
    return true
  }) || null
}

function escPosBytes(text = '') {
  const clean = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const content = encoder ? encoder.encode(clean) : new Uint8Array([])
  const init = new Uint8Array([0x1b, 0x40])
  const feed = new Uint8Array([0x0a, 0x0a, 0x0a])
  const cut = new Uint8Array([0x1d, 0x56, 0x42, 0x00])
  const bytes = new Uint8Array(init.length + content.length + feed.length + cut.length)
  bytes.set(init, 0)
  bytes.set(content, init.length)
  bytes.set(feed, init.length + content.length)
  bytes.set(cut, init.length + content.length + feed.length)
  return bytes
}

export async function printThermalText(text, settings = {}) {
  const printer = normalizePrinterSettings(settings)
  if (!directPrinterAvailable(printer)) return { ok: false, fallback: true, error: 'Direct printer is not connected.' }
  const device = await findUsbDevice(printer)
  if (!device) return { ok: false, fallback: true, error: 'Saved USB printer was not found. Connect it again from Settings.' }

  try {
    if (!device.opened) await device.open()
    if (device.configuration === null) await device.selectConfiguration(1)
    const iface = Number(printer.webUsbInterface || 0)
    const endpoint = Number(printer.webUsbEndpoint || 1)
    try {
      await device.claimInterface(iface)
    } catch {
      /* already claimed by the browser session */
    }
    await device.transferOut(endpoint, escPosBytes(text))
    return { ok: true }
  } catch (error) {
    return { ok: false, fallback: true, error: error?.message || 'Direct printer failed.' }
  }
}

export function htmlToPlainText(html = '') {
  if (typeof document === 'undefined') {
    return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const root = document.createElement('div')
  root.innerHTML = String(html || '')
  return root.innerText.replace(/\n{3,}/g, '\n\n').trim()
}

export function openBrowserPrintHtml(html, { width = 420, height = 720 } = {}) {
  const printWindow = window.open('', '_blank', `width=${width},height=${height}`)
  if (!printWindow) return false
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  return true
}

export async function printHtmlDocument({ html, thermalText = '', settings, paperSize = 'a4', fallbackOptions } = {}) {
  const printer = normalizePrinterSettings(settings)
  if (paperSize === '58mm' && directPrinterAvailable(printer)) {
    const direct = await printThermalText(thermalText || htmlToPlainText(html), printer)
    if (direct.ok) return direct
  }
  const opened = openBrowserPrintHtml(html, fallbackOptions || (paperSize === '58mm' ? { width: 280, height: 720 } : { width: 820, height: 900 }))
  return opened ? { ok: true, fallback: true } : { ok: false, fallback: true, error: 'Allow pop-ups to print.' }
}

function line(label, value) {
  const text = String(value ?? '').trim()
  return text ? `${label}: ${text}` : ''
}

export function buildInvoiceThermalText({ invoice = {}, company = {}, businessType = '', payments = [] } = {}) {
  const title = String(businessType || '').includes('School') ? 'FEE RECEIPT / VOUCHER' : 'INVOICE'
  const items = Array.isArray(invoice.items) ? invoice.items : []
  const total = Number(invoice.total ?? invoice.totalUsd ?? invoice.grandTotal ?? 0) || 0
  const paid = Number(invoice.amountPaid ?? invoice.partialPaidAmount ?? 0) || 0
  const due = Math.max(0, total - paid)
  return [
    company.name || 'NEXORA SOLUTION',
    company.address || '',
    company.phone || '',
    '-'.repeat(32),
    title,
    line('No', invoice.invoiceNumber || invoice.id),
    line('Date', invoice.issueDate || invoice.createdAt),
    line(String(businessType || '').includes('School') ? 'Student' : 'Customer', invoice.customerName),
    line('Phone', invoice.customerPhone),
    '-'.repeat(32),
    ...items.slice(0, 12).map((item) => {
      const qty = Number(item.quantity ?? item.qty ?? 1) || 1
      const rate = Number(item.price ?? item.rate ?? 0) || 0
      return `${item.name || 'Item'} x${qty} ${rate ? `@ ${rate}` : ''}`
    }),
    '-'.repeat(32),
    line('Total', `${invoice.currency || 'PKR'} ${total.toLocaleString()}`),
    line('Paid', `${invoice.currency || 'PKR'} ${paid.toLocaleString()}`),
    line('Due', `${invoice.currency || 'PKR'} ${due.toLocaleString()}`),
    payments?.length ? line('Payments', payments.length) : '',
    '-'.repeat(32),
    company.footer || 'Thank you',
  ].filter(Boolean).join('\n')
}

export async function printInvoiceToConfiguredPrinter(payload = {}, settings = {}) {
  const printer = normalizePrinterSettings(settings)
  if (!directPrinterAvailable(printer)) return { ok: false, fallback: true }
  return printThermalText(buildInvoiceThermalText(payload), printer)
}

export function buildReportThermalText({ report = {}, meta = {}, currency = 'PKR' } = {}) {
  const rows = Array.isArray(report.rows) ? report.rows : []
  return [
    meta.workspaceName || 'NEXORA SOLUTION',
    report.title || 'Report',
    line('Range', meta.dateRange),
    line('Records', report.sourceCount),
    line(report.totalLabel || 'Total', report.amountKey ? `${currency} ${Number(report.calculatedTotal || 0).toLocaleString()}` : report.calculatedTotal),
    '-'.repeat(32),
    ...rows.slice(0, 18).map((row) => Object.values(row).slice(0, 3).join(' | ')),
    rows.length > 18 ? `... ${rows.length - 18} more rows` : '',
    '-'.repeat(32),
    meta.footer || 'NEXORA SOLUTION',
  ].filter(Boolean).join('\n')
}
