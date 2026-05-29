import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  HiOutlineArchiveBox,
  HiOutlineChartBarSquare,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCube,
  HiOutlineDocumentDuplicate,
  HiOutlineEye,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineTrash,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import ProductModal from '../components/products/ProductModal.jsx'
import { useInvoices } from '../hooks/useInvoices.js'
import { useProducts } from '../hooks/useProducts.js'
import { formatCurrency } from '../utils/format.js'
import { cn } from '../utils/cn.js'

const productTypes = ['all', 'product', 'service', 'subscription', 'digital']
const stockFilters = ['all', 'in-stock', 'low-stock', 'out-of-stock']
const pageSize = 8

function toNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function productStatus(product) {
  const type = String(product.productType || 'product').toLowerCase()
  if (type !== 'product') return { label: 'Available', tone: 'info', key: 'in-stock' }
  const stock = toNumber(product.stockQuantity)
  const min = Math.max(toNumber(product.minStockAlert), 1)
  if (stock <= 0) return { label: 'Out Of Stock', tone: 'danger', key: 'out-of-stock' }
  if (stock <= min) return { label: 'Low Stock', tone: 'warning', key: 'low-stock' }
  return { label: 'In Stock', tone: 'success', key: 'in-stock' }
}

function productInitials(name) {
  return String(name || 'Product')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ProductImage({ product }) {
  if (product.imageUrl) {
    return (
      <img
        className="h-10 w-10 rounded-xl border border-slate-200 object-cover"
        src={product.imageUrl}
        alt={product.name}
      />
    )
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 text-xs font-bold text-indigo-700">
      {productInitials(product.name)}
    </div>
  )
}

function MobileProductCard({ product, onEdit, onPreview, onDuplicate, onArchive, onDelete }) {
  const stock = productStatus(product)
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm sm:hidden">
      <div className="flex items-start gap-3">
        <ProductImage product={product} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">{product.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{product.sku || product.barcode || 'Unassigned SKU'}</p>
        </div>
        <Badge variant={stock.tone}>{stock.label}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-slate-500">Price</p>
          <p className="mt-1 font-semibold text-slate-950">{formatCurrency(product.price, product.currency)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-slate-500">Stock</p>
          <p className="mt-1 font-semibold text-slate-950">{product.stockQuantity}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-slate-500">Type</p>
          <p className="mt-1 truncate font-semibold capitalize text-slate-950">{product.productType}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <IconButton label="Preview" onClick={() => onPreview(product)}><HiOutlineEye /></IconButton>
        <IconButton label="Edit" onClick={() => onEdit(product)}><HiOutlinePencilSquare /></IconButton>
        <IconButton label="Duplicate" onClick={() => onDuplicate(product)}><HiOutlineDocumentDuplicate /></IconButton>
        <IconButton label="Archive" onClick={() => onArchive(product)}><HiOutlineArchiveBox /></IconButton>
        <IconButton danger label="Delete" onClick={() => onDelete(product)}><HiOutlineTrash /></IconButton>
      </div>
    </div>
  )
}

function IconButton({ label, danger = false, className = '', children, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-base text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
        danger && 'hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700',
        className,
      )}
    >
      {children}
    </button>
  )
}

export default function ProductsPage() {
  const productsApi = useProducts()
  const invoicesApi = useInvoices()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [previewProduct, setPreviewProduct] = useState(null)
  const [toast, setToast] = useState(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)

  const visibleProducts = useMemo(
    () => productsApi.products.filter((product) => product.status !== 'archived'),
    [productsApi.products],
  )

  const categories = useMemo(() => {
    const values = visibleProducts.map((product) => product.category).filter(Boolean)
    return ['all', ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))]
  }, [visibleProducts])

  const analytics = useMemo(() => {
    const physicalProducts = visibleProducts.filter((product) => product.productType === 'product')
    const totalInventoryValue = physicalProducts.reduce(
      (sum, product) => sum + toNumber(product.stockQuantity) * toNumber(product.costPrice || product.price),
      0,
    )
    const lowStock = physicalProducts.filter((product) => productStatus(product).key === 'low-stock').length
    const outOfStock = physicalProducts.filter((product) => productStatus(product).key === 'out-of-stock').length
    const servicesCount = visibleProducts.filter((product) => product.productType === 'service').length
    const productIds = new Set(visibleProducts.map((product) => product.id))
    const now = new Date()
    const monthlyRevenue = invoicesApi.invoices
      .filter((invoice) => {
        const paid = ['paid', 'partial'].includes(String(invoice.paymentStatus || invoice.status).toLowerCase())
        const paidDate = invoice.paidAt?.toDate?.() || invoice.updatedAt?.toDate?.() || invoice.createdAt?.toDate?.() || new Date()
        return paid && paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()
      })
      .reduce((sum, invoice) => {
        return sum + (invoice.items || []).reduce((itemSum, item) => {
          if (!productIds.has(item.productId)) return itemSum
          return itemSum + toNumber(item.quantity ?? item.qty) * toNumber(item.price ?? item.priceUsd)
        }, 0)
      }, 0)

    return {
      totalProducts: visibleProducts.length,
      totalInventoryValue,
      lowStock,
      outOfStock,
      servicesCount,
      monthlyRevenue,
    }
  }, [invoicesApi.invoices, visibleProducts])

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = visibleProducts.filter((product) => {
      const haystack = [product.name, product.sku, product.barcode, product.category, product.brand, product.supplier]
        .join(' ')
        .toLowerCase()
      const matchesSearch = !needle || haystack.includes(needle)
      const matchesType = typeFilter === 'all' || product.productType === typeFilter
      const matchesStock = stockFilter === 'all' || productStatus(product).key === stockFilter
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
      return matchesSearch && matchesType && matchesStock && matchesCategory
    })

    return filtered.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1
      const aValue = sortKey === 'stock' ? a.stockQuantity : sortKey === 'price' ? a.price : a[sortKey]
      const bValue = sortKey === 'stock' ? b.stockQuantity : sortKey === 'price' ? b.price : b[sortKey]
      if (typeof aValue === 'number' || typeof bValue === 'number') return (toNumber(aValue) - toNumber(bValue)) * direction
      return String(aValue || '').localeCompare(String(bValue || '')) * direction
    })
  }, [categoryFilter, query, sortDir, sortKey, stockFilter, typeFilter, visibleProducts])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const pagedProducts = filteredProducts.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize)

  function showToast(nextToast) {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), 1800)
  }

  function toggleSort(key) {
    setSortKey(key)
    setSortDir((current) => (sortKey === key && current === 'asc' ? 'desc' : 'asc'))
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete ${product.name}?`)
    if (!confirmed) return
    const res = await productsApi.deleteProduct(product.id)
    showToast(res?.ok ? { tone: 'success', message: 'Product deleted' } : { tone: 'error', message: res?.error || 'Failed to delete product' })
  }

  async function handleDuplicate(product) {
    const res = await productsApi.duplicateProduct(product.id)
    showToast(res?.ok ? { tone: 'success', message: 'Product duplicated' } : { tone: 'error', message: res?.error || 'Failed to duplicate product' })
  }

  async function handleArchive(product) {
    const res = await productsApi.archiveProduct(product.id)
    showToast(res?.ok ? { tone: 'success', message: 'Product archived' } : { tone: 'error', message: res?.error || 'Failed to archive product' })
  }

  const statCards = [
    ['Total Products', analytics.totalProducts, HiOutlineSquares2X2, 'from active catalog'],
    ['Total Inventory Value', formatCurrency(analytics.totalInventoryValue, 'PKR'), HiOutlineCube, 'cost-based stock value'],
    ['Low Stock', analytics.lowStock, HiOutlineFunnel, 'at or below alert level'],
    ['Out of Stock', analytics.outOfStock, HiOutlineArchiveBox, 'physical products only'],
    ['Services Count', analytics.servicesCount, HiOutlineChartBarSquare, 'invoice-ready services'],
    ['Monthly Revenue From Products', formatCurrency(analytics.monthlyRevenue, 'PKR'), HiOutlineChartBarSquare, 'paid invoice items'],
  ]

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Inventory Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Products</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Manage catalog, branches, suppliers, stock alerts, invoice deduction, and product revenue from one CRM surface.
          </p>
        </div>
        <Button className="h-10 rounded-xl bg-slate-950 px-4 shadow-lg shadow-indigo-950/10" type="button" onClick={() => { setEditingProduct(null); setModalOpen(true) }}>
          <HiOutlinePlus className="text-lg" />
          Add Product
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {statCards.map(([label, value, Icon, detail]) => (
          <Card key={label} className="rounded-2xl border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_-34px_rgba(79,70,229,0.55)]">
            <div className="flex items-center justify-between gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 text-indigo-700">
                <Icon className="text-lg" />
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,0.12)]" />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
            <p className="mt-1 truncate text-xl font-semibold text-slate-950">{value}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-white/80 bg-white/95 p-3 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.65)] sm:p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(16rem,1fr)_160px_160px_160px_auto]">
          <div className="relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 rounded-xl pl-9"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1) }}
              aria-label="Search products"
            />
          </div>
          <Select className="h-10 rounded-xl" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1) }}>
            {productTypes.map((type) => <option key={type} value={type}>{type === 'all' ? 'All Types' : type.replace('-', ' ')}</option>)}
          </Select>
          <Select className="h-10 rounded-xl" value={stockFilter} onChange={(event) => { setStockFilter(event.target.value); setPage(1) }}>
            {stockFilters.map((status) => <option key={status} value={status}>{status === 'all' ? 'All Stock' : status.replace(/-/g, ' ')}</option>)}
          </Select>
          <Select className="h-10 rounded-xl" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1) }}>
            {categories.map((category) => <option key={category} value={category}>{category === 'all' ? 'All Categories' : category}</option>)}
          </Select>
          <Badge variant={productsApi.loading ? 'warning' : 'success'} className="h-10 justify-center rounded-xl px-3">
            {productsApi.loading ? 'Syncing' : `${filteredProducts.length} Items`}
          </Badge>
        </div>
        {productsApi.error ? <p className="mt-3 text-sm font-semibold text-rose-700">{productsApi.error}</p> : null}
      </Card>

      <Card className="rounded-2xl border-white/80 bg-white/95 p-0 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.75)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Product Catalog</p>
            <p className="text-xs text-slate-500">Sorted, filtered, and ready for invoices, expenses, reports, and branch stock control.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">Invoice stock deduction active</span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">Supplier tracked</span>
          </div>
        </div>

        {productsApi.loading ? (
          <div className="grid min-h-[17rem] place-items-center text-sm text-slate-600">Loading products...</div>
        ) : visibleProducts.length ? (
          <div className="p-3">
            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-[940px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {[
                      ['name', 'Product Name'],
                      ['sku', 'SKU'],
                      ['category', 'Category'],
                      ['price', 'Price'],
                      ['stock', 'Stock'],
                      ['status', 'Status'],
                      ['productType', 'Type'],
                    ].map(([key, label]) => (
                      <th key={key} className="whitespace-nowrap px-3 py-3">
                        <button type="button" className="font-semibold uppercase tracking-[0.12em]" onClick={() => toggleSort(key)}>
                          {label}
                        </button>
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedProducts.map((product) => {
                    const stock = productStatus(product)
                    return (
                      <tr key={product.id} className="transition hover:bg-slate-50/90">
                        <td className="px-3 py-3">
                          <div className="flex min-w-[14rem] items-center gap-3">
                            <ProductImage product={product} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-950">{product.name}</p>
                              <p className="truncate text-xs text-slate-500">{product.brand || product.supplier || product.branch}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">{product.sku || product.barcode || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">{product.category}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-950">{formatCurrency(product.price, product.currency)}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-950">{product.stockQuantity}</span>
                            <span className="text-xs text-slate-500">min {product.minStockAlert}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3"><Badge variant={stock.tone}>{stock.label}</Badge></td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="capitalize text-slate-700">{String(product.productType).replace('-', ' ')}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1.5">
                            <IconButton label="Preview" onClick={() => setPreviewProduct(product)}><HiOutlineEye /></IconButton>
                            <IconButton label="Edit" onClick={() => { setEditingProduct(product); setModalOpen(true) }}><HiOutlinePencilSquare /></IconButton>
                            <IconButton label="Duplicate" onClick={() => handleDuplicate(product)}><HiOutlineDocumentDuplicate /></IconButton>
                            <IconButton label="Archive" onClick={() => handleArchive(product)}><HiOutlineArchiveBox /></IconButton>
                            <IconButton danger label="Delete" onClick={() => handleDelete(product)}><HiOutlineTrash /></IconButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 sm:hidden">
              {pagedProducts.map((product) => (
                <MobileProductCard
                  key={product.id}
                  product={product}
                  onEdit={(item) => { setEditingProduct(item); setModalOpen(true) }}
                  onPreview={setPreviewProduct}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {!pagedProducts.length ? (
              <div className="py-10">
                <EmptyState title="No matching products" description="Adjust filters to view catalog items." />
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Page {Math.min(page, totalPages)} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="subtle" className="h-9 rounded-xl px-3 text-xs" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <HiOutlineChevronLeft />
                  Previous
                </Button>
                <Button variant="subtle" className="h-9 rounded-xl px-3 text-xs" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                  Next
                  <HiOutlineChevronRight />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No products yet"
              description="Add products, services, subscriptions, or digital items to connect inventory with invoices."
              actionLabel="Add Product"
              onAction={() => { setEditingProduct(null); setModalOpen(true) }}
            />
          </div>
        )}
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Smart Inventory', 'Low stock alerts, invoice deduction, and reorder thresholds stay connected.'],
          ['Multi Categories', 'Segment catalog items by category, brand, branch, and warehouse.'],
          ['Custom Attributes', 'Track barcode, supplier, branch, tax, discount, and product type details.'],
          ['Reports & Analytics', 'Product revenue and stock value flow into CRM reporting surfaces.'],
        ].map(([title, text]) => (
          <Card key={title} className="rounded-2xl border-white/80 bg-white/90 p-4">
            <p className="text-sm font-semibold text-slate-950">{title}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
          </Card>
        ))}
      </div>

      {previewProduct ? (
        <div className="fixed inset-0 z-40 flex items-end justify-end bg-slate-950/35 p-3 backdrop-blur-sm" onClick={() => setPreviewProduct(null)}>
          <Card className="w-full max-w-md rounded-2xl bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <ProductImage product={previewProduct} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-950">{previewProduct.name}</p>
                <p className="mt-1 text-xs text-slate-500">{previewProduct.sku || previewProduct.barcode || 'Catalog item'}</p>
              </div>
              <Badge variant={productStatus(previewProduct).tone}>{productStatus(previewProduct).label}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {[
                ['Category', previewProduct.category],
                ['Brand', previewProduct.brand || '-'],
                ['Warehouse', previewProduct.warehouse || '-'],
                ['Branch', previewProduct.branch || '-'],
                ['Supplier', previewProduct.supplier || '-'],
                ['Stock History', `${previewProduct.stockHistory?.length || 0} entries`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 truncate font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
            <Button className="mt-4 h-10 w-full rounded-xl" type="button" onClick={() => { setEditingProduct(previewProduct); setPreviewProduct(null); setModalOpen(true) }}>
              <HiOutlinePencilSquare />
              Edit Product
            </Button>
          </Card>
        </div>
      ) : null}

      <ProductModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => setModalOpen(false)}
        onSave={async (payload) => {
          const res = editingProduct
            ? await productsApi.updateProduct(editingProduct.id, payload)
            : await productsApi.createProduct(payload)
          if (res?.ok) {
            showToast({ tone: 'success', message: editingProduct ? 'Product updated' : 'Product created' })
            setModalOpen(false)
            setEditingProduct(null)
          } else {
            showToast({ tone: 'error', message: res?.error || 'Failed to save product' })
          }
        }}
      />
    </motion.div>
  )
}
