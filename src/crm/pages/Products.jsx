import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { HiOutlinePlus } from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import ProductModal from '../components/products/ProductModal.jsx'
import { useProducts } from '../hooks/useProducts.js'
import { formatCurrency } from '../utils/format.js'

function formatDate(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function ProductsPage() {
  const productsApi = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [toast, setToast] = useState(null)

  const stats = useMemo(() => {
    const active = productsApi.products.filter((product) => product.status === 'active').length
    const stock = productsApi.products.reduce((sum, product) => sum + product.stockQuantity, 0)
    return { total: productsApi.products.length, active, stock }
  }, [productsApi.products])

  const columns = [
    { key: 'name', header: 'Product', cell: (row) => <span className="font-semibold">{row.name}</span> },
    { key: 'sku', header: 'SKU', cell: (row) => row.sku || '—' },
    { key: 'category', header: 'Category' },
    {
      key: 'price',
      header: 'Price',
      cell: (row) => <span className="font-semibold">{formatCurrency(row.price, row.currency)}</span>,
    },
    { key: 'stockQuantity', header: 'Stock' },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge>,
    },
    { key: 'createdAt', header: 'Created', cell: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="subtle"
            className="rounded-xl px-3 py-2 text-xs"
            type="button"
            onClick={() => {
              setEditingProduct(row)
              setModalOpen(true)
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="rounded-xl px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            type="button"
            onClick={async () => {
              const confirmed = window.confirm(`Delete ${row.name}?`)
              if (!confirmed) return
              const res = await productsApi.deleteProduct(row.id)
              if (res?.ok) {
                setToast({ tone: 'success', message: 'Product deleted' })
              } else {
                setToast({ tone: 'error', message: res?.error || 'Failed to delete product' })
              }
              window.setTimeout(() => setToast(null), 1800)
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Products"
        subtitle="Manage product catalog, stock, pricing, and invoice-ready items."
        right={
          <Button className="rounded-2xl" type="button" onClick={() => { setEditingProduct(null); setModalOpen(true) }}>
            <HiOutlinePlus className="text-lg" />
            Add Product
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {[
          ['Products', stats.total],
          ['Active', stats.active],
          ['Total stock', stats.stock],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Product Catalog</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Products are saved to your workspace.</p>
          </div>
          <Badge variant={productsApi.source === 'firestore' ? 'success' : 'default'}>
            {productsApi.loading ? 'Loading…' : productsApi.source === 'firestore' ? 'Live Sync' : 'No data yet'}
          </Badge>
        </div>
        {productsApi.error ? <p className="mt-3 text-sm font-semibold text-rose-700">{productsApi.error}</p> : null}
        <div className="mt-4">
          {productsApi.loading ? (
            <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
              Loading products…
            </div>
          ) : productsApi.products.length ? (
            <Table columns={columns} rows={productsApi.products} />
          ) : (
            <EmptyState
              title="No products yet"
              description="No account data yet. Add a product to use it on invoices."
              actionLabel="Add Product"
              onAction={() => { setEditingProduct(null); setModalOpen(true) }}
            />
          )}
        </div>
      </Card>

      <ProductModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => setModalOpen(false)}
        onSave={async (payload) => {
          const res = editingProduct
            ? await productsApi.updateProduct(editingProduct.id, payload)
            : await productsApi.createProduct(payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: editingProduct ? 'Product updated' : 'Product created' })
            setModalOpen(false)
            setEditingProduct(null)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to save product' })
          }
          window.setTimeout(() => setToast(null), 1800)
        }}
      />
    </motion.div>
  )
}
