'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from '@/types'
import type { OrderStatus } from '@/types'
import { format, addDays } from 'date-fns'
import { Plus, Package, Users, BarChart2, Settings2, ClipboardList } from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<'orders' | 'batch' | 'reports' | 'settings' | 'waitlist'>('orders')

  if (status === 'loading') return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-stone-400">Loading…</div>
  if (!session?.user || session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return <div className="max-w-lg mx-auto px-4 py-20 text-center text-stone-500">Not authorized.</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl text-brand-900 mb-6">Admin</h1>
      <div className="flex gap-2 mb-8 border-b border-brand-200">
        {([['orders', 'Order Queue', Users], ['batch', 'Batch Manager', Package], ['reports', 'Reports', BarChart2], ['settings', 'Settings', Settings2], ['waitlist', 'Waitlist', ClipboardList]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-brand-700 text-brand-900' : 'border-transparent text-stone-500 hover:text-brand-700'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      {tab === 'orders' && <OrderQueue />}
      {tab === 'batch' && <BatchManager />}
      {tab === 'reports' && <Reports />}
      {tab === 'settings' && <SiteSettings />}
      {tab === 'waitlist' && <WaitlistManager />}
    </div>
  )
}

function OrderQueue() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showManual, setShowManual] = useState(false)
  const [batches, setBatches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/admin/orders')
    const data = await res.json()
    setOrders(data.orders || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/admin/batch').then(r => r.json()).then(d => {
      setBatches((d.batches || []).filter((b: any) => b.status === 'open' || b.status === 'closed'))
      setProducts(d.products || [])
    })
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await fetch('/api/admin/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    })
    toast.success(`Updated: ${ORDER_STATUS_LABELS[status]}`)
    fetchOrders()
  }

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Cancel and refund this order?')) return
    const res = await fetch('/api/admin/cancel-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
    const data = await res.json()
    if (data.ok) { toast.success('Order cancelled and refunded'); fetchOrders() }
    else toast.error(data.error || 'Failed')
  }

  if (loading) return <div className="text-stone-400">Loading orders…</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowManual(!showManual)} className="btn-secondary !py-1.5 !px-4 text-sm">
          + Manual order
        </button>
      </div>
      {showManual && <ManualOrderForm batches={batches} products={products} onDone={() => { setShowManual(false); fetchOrders() }} />}
      {orders.length === 0 && !showManual && <div className="text-stone-400 text-center py-12">No active orders.</div>}
      {orders.map(order => {
        const currentIdx = ORDER_STATUS_STEPS.indexOf(order.status)
        const nextStatus = ORDER_STATUS_STEPS[currentIdx + 1]
        return (
          <div key={order.id} className="card p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-medium">{order.user_name}</p>
                <p className="text-sm text-stone-500">{order.user_email}</p>
                <p className="text-xs text-stone-400">{format(new Date(order.created_at), 'MMM d, h:mm a')}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">${(order.total / 100).toFixed(2)}</p>
                <p className="text-xs text-stone-400">{order.pickup_location === 'edison_919' ? '919 Edison' : '901 Edison'}</p>
              </div>
            </div>
            <div className="text-sm text-stone-600 mb-3 space-y-0.5">
              {order.items?.map((item: any) => (
                <p key={item.id}>{item.qty}× {item.product_name}{item.variant_label ? ` — ${item.variant_label}` : ''}</p>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <select
                value={order.status}
                onChange={e => updateStatus(order.id, e.target.value as OrderStatus)}
                className="text-sm border border-brand-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {ORDER_STATUS_STEPS.map(s => (
                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                ))}
                <option value="completed">Completed</option>
              </select>
              <button onClick={() => cancelOrder(order.id)} className="text-sm text-red-400 hover:text-red-600 px-2">Cancel</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BatchManager() {
  const [batches, setBatches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [showing, setShowing] = useState(false)
  const [editingBatch, setEditingBatch] = useState<string | null>(null)
  const [form, setForm] = useState({
    pickup_window: '',
    notes: '',
    inventory: {} as Record<string, { qty: number; bake_date: string }>,
  })

  const fetchBatches = useCallback(async () => {
    const res = await fetch('/api/admin/batch')
    const data = await res.json()
    setBatches(data.batches || [])
    setProducts(data.products || [])
  }, [])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const createBatch = async () => {
    if (!form.pickup_window) { toast.error('Pickup window required'); return }
    const inventoryArray = Object.entries(form.inventory)
      .filter(([, v]) => v.qty > 0 && v.bake_date)
      .map(([product_id, v]) => ({ product_id, qty: v.qty, bake_date: v.bake_date }))
    if (inventoryArray.length === 0) { toast.error('Add at least one product with a bake date'); return }

    const res = await fetch('/api/admin/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickup_window: form.pickup_window, notes: form.notes, inventory: inventoryArray }),
    })
    if (res.ok) { toast.success('Batch created!'); setShowing(false); fetchBatches() }
    else toast.error('Failed to create batch')
  }

  const batchAction = async (batchId: string, action: 'open' | 'close') => {
    await fetch('/api/admin/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId, action }),
    })
    toast.success(action === 'open' ? 'Batch opened — waitlist notified!' : 'Batch closed')
    fetchBatches()
  }

  return (
    <div>
      <button onClick={() => setShowing(!showing)} className="btn-primary flex items-center gap-2 mb-6">
        <Plus size={16} /> New batch
      </button>

      {showing && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-serif mb-4">Create new batch</h2>

          <div className="mb-4">
            <label className="text-sm text-stone-500 block mb-1">Pickup instructions</label>
            <input type="text" placeholder="e.g. Pickup before Sunday 7pm"
              value={form.pickup_window}
              onChange={e => setForm(f => ({ ...f, pickup_window: e.target.value }))}
              className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>

          <div className="mb-4">
            <label className="text-sm text-stone-500 block mb-2">Products — qty and bake date per item</label>
            <div className="space-y-3">
              {products.map((p: any) => {
                const inv = form.inventory[p.id] || { qty: 0, bake_date: '' }
                const expiryDate = inv.bake_date
                  ? format(addDays(new Date(inv.bake_date + 'T12:00:00'), 3), 'MMMM d')
                  : null
                return (
                  <div key={p.id} className="border border-brand-100 rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">{p.name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-stone-400 block mb-1">Qty</label>
                        <input type="number" min="0" placeholder="0"
                          value={inv.qty || ''}
                          onChange={e => setForm(f => ({
                            ...f,
                            inventory: { ...f.inventory, [p.id]: { ...inv, qty: parseInt(e.target.value) || 0 } }
                          }))}
                          className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                      </div>
                      <div>
                        <label className="text-xs text-stone-400 block mb-1">Bake date</label>
                        <input type="date"
                          value={inv.bake_date}
                          onChange={e => setForm(f => ({
                            ...f,
                            inventory: { ...f.inventory, [p.id]: { ...inv, bake_date: e.target.value } }
                          }))}
                          className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                        {expiryDate && <p className="text-xs text-red-400 mt-1">Best by: {expiryDate}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-stone-500 block mb-1">Notes (optional)</label>
            <input type="text" placeholder="e.g. Extra-crusty batch this week" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>

          <div className="flex gap-3">
            <button onClick={createBatch} className="btn-primary">Create batch</button>
            <button onClick={() => setShowing(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {batches.map((batch: any) => (
          <div key={batch.id}>
            <div className="card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{batch.pickup_window}</p>
                {batch.notes && <p className="text-xs text-stone-400 mt-0.5">{batch.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${batch.status === 'open' ? 'bg-green-100 text-green-700' : batch.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                  {batch.status}
                </span>
                <button onClick={() => setEditingBatch(editingBatch === batch.id ? null : batch.id)} className="btn-secondary !py-1.5 !px-3 text-sm">Edit</button>
                {batch.status === 'draft' && <button onClick={() => batchAction(batch.id, 'open')} className="btn-primary !py-1.5 !px-3 text-sm">Open</button>}
                {batch.status === 'open' && <button onClick={() => batchAction(batch.id, 'close')} className="btn-secondary !py-1.5 !px-3 text-sm">Close</button>}
              </div>
            </div>
            {editingBatch === batch.id && (
              <EditBatchForm batch={batch} products={products} onDone={() => { setEditingBatch(null); fetchBatches() }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}



function ManualOrderForm({ batches, products, onDone }: { batches: any[]; products: any[]; onDone: () => void }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    pickup_location: 'edison_901' as 'edison_901' | 'edison_919',
    payment_method: 'cash',
    batch_id: batches[0]?.id || '',
    items: [] as { product_id: string; variant_id: string | null; variant_label: string | null; qty: number; unit_price: number; name: string }[],
  })
  const [saving, setSaving] = useState(false)
  const [variants, setVariants] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/variants').then(r => r.json()).then(d => {
      setVariants(d.variants || [])
    })
  }, [])

  const addItem = (product: any, variantId: string | null, variantLabel: string | null, price: number) => {
    const existing = form.items.findIndex(i => i.product_id === product.id && i.variant_id === variantId)
    if (existing >= 0) {
      const items = [...form.items]
      items[existing].qty++
      setForm(f => ({ ...f, items }))
    } else {
      setForm(f => ({ ...f, items: [...f.items, { product_id: product.id, variant_id: variantId, variant_label: variantLabel, qty: 1, unit_price: price, name: product.name + (variantLabel ? ` — ${variantLabel}` : '') }] }))
    }
  }

  const removeItem = (idx: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const total = form.items.reduce((sum, i) => sum + i.unit_price * i.qty, 0)

  const save = async () => {
    if (!form.customer_name || !form.items.length || !form.batch_id) { toast.error('Fill in customer name, batch, and at least one item'); return }
    setSaving(true)
    const res = await fetch('/api/admin/manual-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { toast.success('Manual order added!'); onDone() }
    else toast.error('Failed to add order')
  }

  return (
    <div className="card p-5 border-2 border-brand-300">
      <h3 className="font-serif text-lg mb-4">Manual Order Entry</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-stone-500 block mb-1">Customer name *</label>
          <input type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
            className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Customer email (optional)</label>
          <input type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
            className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Batch *</label>
          <select value={form.batch_id} onChange={e => setForm(f => ({ ...f, batch_id: e.target.value }))}
            className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
            {batches.map((b: any) => <option key={b.id} value={b.id}>{b.pickup_window}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Payment method</label>
          <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
            className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
            <option value="cash">Cash</option>
            <option value="zelle">Zelle</option>
            <option value="cashapp">Cash App</option>
            <option value="facebook">Facebook</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Pickup location</label>
          <select value={form.pickup_location} onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value as any }))}
            className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
            <option value="edison_901">901 Edison St</option>
            <option value="edison_919">919 Edison St</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs text-stone-500 block mb-2">Add items</label>
        <div className="flex flex-wrap gap-2">
          {products.map((p: any) => {
            const productVariants = variants.filter(v => v.product_id === p.id)
            if (productVariants.length > 0) {
              return productVariants.map((v: any) => (
                <button key={v.id} onClick={() => addItem(p, v.id, v.label, v.price)}
                  className="text-xs border border-brand-300 rounded-full px-3 py-1 hover:bg-brand-50">
                  {p.name} — {v.label} (${(v.price/100).toFixed(2)})
                </button>
              ))
            }
            return (
              <button key={p.id} onClick={() => addItem(p, null, null, p.price)}
                className="text-xs border border-brand-300 rounded-full px-3 py-1 hover:bg-brand-50">
                {p.name} (${(p.price/100).toFixed(2)})
              </button>
            )
          })}
        </div>
      </div>

      {form.items.length > 0 && (
        <div className="mb-4 space-y-1">
          {form.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>{item.qty}× {item.name}</span>
              <div className="flex items-center gap-3">
                <span>${((item.unit_price * item.qty) / 100).toFixed(2)}</span>
                <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-brand-100 font-medium text-sm">Total: ${(total/100).toFixed(2)}</div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary !py-1.5 !px-4 text-sm">{saving ? 'Saving…' : 'Add order'}</button>
        <button onClick={onDone} className="btn-secondary !py-1.5 !px-4 text-sm">Cancel</button>
      </div>
    </div>
  )
}
function EditBatchForm({ batch, products, onDone }: { batch: any; products: any[]; onDone: () => void }) {
  const inv = batch.inventory ? JSON.parse(typeof batch.inventory === 'string' ? batch.inventory : JSON.stringify(batch.inventory)) : []
  const [form, setForm] = useState({
    pickup_window: batch.pickup_window,
    notes: batch.notes || '',
    inventory: Object.fromEntries(
      products.map((p: any) => {
        const existing = inv.find((i: any) => i.product_id === p.id)
        return [p.id, { qty: existing?.total_qty || 0, bake_date: existing?.bake_date || '' }]
      })
    ) as Record<string, { qty: number; bake_date: string }>,
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const inventoryArray = Object.entries(form.inventory).map(([product_id, v]) => ({
      product_id, qty: v.qty, bake_date: v.bake_date
    }))
    const res = await fetch(`/api/admin/batch/${batch.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickup_window: form.pickup_window, notes: form.notes, inventory: inventoryArray }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Batch updated!'); onDone() }
    else toast.error('Failed to update batch')
  }

  return (
    <div className="border border-brand-200 rounded-lg p-4 mt-1 bg-brand-50">
      <div className="mb-3">
        <label className="text-xs text-stone-500 block mb-1">Pickup instructions</label>
        <input type="text" value={form.pickup_window}
          onChange={e => setForm(f => ({ ...f, pickup_window: e.target.value }))}
          className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
      </div>
      <div className="mb-3">
        <label className="text-xs text-stone-500 block mb-2">Stock quantities</label>
        <div className="space-y-2">
          {products.map((p: any) => {
            const inv = form.inventory[p.id] || { qty: 0, bake_date: '' }
            const existing = batch.inventory ? JSON.parse(typeof batch.inventory === 'string' ? batch.inventory : JSON.stringify(batch.inventory)).find((i: any) => i.product_id === p.id) : null
            const minQty = (existing?.sold_qty || 0) + (existing?.reserved_qty || 0)
            return (
              <div key={p.id} className="grid grid-cols-2 gap-2 items-center">
                <div>
                  <p className="text-xs font-medium">{p.name}</p>
                  {minQty > 0 && <p className="text-xs text-amber-600">Min: {minQty} (sold/reserved)</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min={minQty} placeholder="Qty"
                    value={inv.qty || ''}
                    onChange={e => setForm(f => ({ ...f, inventory: { ...f.inventory, [p.id]: { ...inv, qty: parseInt(e.target.value) || 0 } } }))}
                    className="border border-brand-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-300" />
                  <input type="date" value={inv.bake_date}
                    onChange={e => setForm(f => ({ ...f, inventory: { ...f.inventory, [p.id]: { ...inv, bake_date: e.target.value } } }))}
                    className="border border-brand-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-300" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs text-stone-500 block mb-1">Notes</label>
        <input type="text" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary !py-1.5 !px-4 text-sm">{saving ? 'Saving…' : 'Save changes'}</button>
        <button onClick={onDone} className="btn-secondary !py-1.5 !px-4 text-sm">Cancel</button>
      </div>
    </div>
  )
}
function Reports() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/reports').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="text-stone-400">Loading reports…</div>
  if (!data) return null

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const maxRevenue = Math.max(...(data.monthly || []).map((m: any) => m.revenue), 1)

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Today', revenue: data.today?.revenue, orders: data.today?.orders },
          { label: 'This week', revenue: data.thisWeek?.revenue, orders: data.thisWeek?.orders },
          { label: 'This month', revenue: data.thisMonth?.revenue, orders: data.thisMonth?.orders },
          { label: 'This year', revenue: data.thisYear?.revenue, orders: data.thisYear?.orders },
        ].map(card => (
          <div key={card.label} className="card p-4">
            <p className="text-xs text-stone-400 mb-1">{card.label}</p>
            <p className="text-2xl font-medium text-brand-900">{fmt(card.revenue || 0)}</p>
            <p className="text-xs text-stone-500 mt-1">{card.orders || 0} order{card.orders !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Monthly revenue chart */}
      <div className="card p-6">
        <h3 className="font-serif text-lg mb-4">{new Date().getFullYear()} Revenue by Month</h3>
        {data.monthly?.length === 0 ? (
          <p className="text-stone-400 text-sm">No data yet.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {data.monthly?.map((m: any) => {
              const monthNum = parseInt(m.month.split('-')[1]) - 1
              const height = Math.round((m.revenue / maxRevenue) * 100)
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-xs text-stone-500">{fmt(m.revenue)}</p>
                  <div className="w-full bg-brand-700 rounded-t" style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }} />
                  <p className="text-xs text-stone-400">{months[monthNum]}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Product breakdown */}
      <div className="card p-6">
        <h3 className="font-serif text-lg mb-4">Products sold — {new Date().getFullYear()}</h3>
        {data.products?.length === 0 ? (
          <p className="text-stone-400 text-sm">No data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-400 border-b border-brand-100">
                <th className="pb-2">Product</th>
                <th className="pb-2 text-right">Units</th>
                <th className="pb-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.products?.map((p: any, i: number) => (
                <tr key={i} className="border-b border-brand-50">
                  <td className="py-2">{p.name}{p.variant_label ? ` — ${p.variant_label}` : ''}</td>
                  <td className="py-2 text-right">{p.units}</td>
                  <td className="py-2 text-right">{fmt(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* How customers found us */}
      <div className="card p-6">
        <h3 className="font-serif text-lg mb-4">How customers found us</h3>
        {!data.referrals?.length ? (
          <p className="text-stone-400 text-sm">No responses yet.</p>
        ) : (
          <div className="space-y-2">
            {data.referrals?.map((r: any) => (
              <div key={r.referral_source} className="flex justify-between text-sm">
                <span>{r.referral_source}</span>
                <span className="font-medium">{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


function SiteSettings() {
  const [review, setReview] = useState('')
  const [review2, setReview2] = useState('')
  const [review3, setReview3] = useState('')
  const [thresholdMsg, setThresholdMsg] = useState('')
  const [thresholds, setThresholds] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const THRESHOLD_KEYS = [
    { key: 'threshold_prod-sourdough', label: 'Sourdough Loaf' },
    { key: 'threshold_prod-brioche_var-brioche-4', label: 'Brioche Buns — 4 Pack' },
    { key: 'threshold_prod-brioche_var-brioche-8', label: 'Brioche Buns — 8 Pack' },
    { key: 'threshold_prod-cinnamon-rolls_var-rolls-6', label: 'Cinnamon Rolls — 6 Pack' },
    { key: 'threshold_prod-cinnamon-rolls_var-rolls-12', label: 'Cinnamon Rolls — 12 Pack' },
  ]

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setReview(d.review_highlight || '')
      setReview2(d.review_highlight_2 || '')
      setReview3(d.review_highlight_3 || '')
      setThresholdMsg(d.threshold_message || '')
      const t: Record<string, string> = {}
      for (const { key } of THRESHOLD_KEYS) t[key] = d[key] || ''
      setThresholds(t)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const saves = [
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_name: 'review_highlight', value: review }) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_name: 'review_highlight_2', value: review2 }) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_name: 'review_highlight_3', value: review3 }) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_name: 'threshold_message', value: thresholdMsg }) }),
      ...Object.entries(thresholds).map(([key, value]) =>
        fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_name: key, value }) })
      )
    ]
    await Promise.all(saves)
    setSaving(false)
    toast.success('Saved!')
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="font-serif text-lg mb-2">Review highlights</h3>
        <p className="text-sm text-stone-500 mb-3">Up to 3 reviews shown on the homepage. Leave blank to hide.</p>
        <div className="space-y-3">
          {[
            { key: 'review_highlight', label: 'Review 1', value: review, setter: setReview },
            { key: 'review_highlight_2', label: 'Review 2', value: review2, setter: setReview2 },
            { key: 'review_highlight_3', label: 'Review 3', value: review3, setter: setReview3 },
          ].map(r => (
            <div key={r.key}>
              <label className="text-xs text-stone-500 block mb-1">{r.label}</label>
              <textarea value={r.value} onChange={e => r.setter(e.target.value)} rows={2}
                className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Enter a customer review..." />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-lg mb-2">Large order thresholds</h3>
        <p className="text-sm text-stone-500 mb-4">If a customer orders more than this quantity on the waitlist, show a warning. Set to 0 to disable.</p>
        <div className="space-y-3 mb-4">
          {THRESHOLD_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4">
              <label className="text-sm flex-1">{label}</label>
              <input type="number" min="0" value={thresholds[key] || ''}
                onChange={e => setThresholds(t => ({ ...t, [key]: e.target.value }))}
                className="w-20 border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          ))}
        </div>
        <div>
          <label className="text-sm text-stone-500 block mb-1">Warning message</label>
          <textarea value={thresholdMsg} onChange={e => setThresholdMsg(e.target.value)} rows={2}
            className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            placeholder="Large orders may require additional lead time..." />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 text-sm">
        {saving ? 'Saving…' : 'Save all settings'}
      </button>
    </div>
  )
}

function WaitlistManager() {
  const [entries, setEntries] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [confirmForm, setConfirmForm] = useState({ bake_date: '', pickup_window: '' })
  const [showCalendar, setShowCalendar] = useState(false)

  const fetchData = useCallback(async () => {
    const [wRes, bRes] = await Promise.all([
      fetch('/api/admin/waitlist'),
      fetch('/api/admin/batch'),
    ])
    const wData = await wRes.json()
    const bData = await bRes.json()
    setEntries(wData.entries || [])
    setProducts(bData.products || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const confirm = async (entry_id: string) => {
    if (!confirmForm.bake_date || !confirmForm.pickup_window) { toast.error('Fill in bake date and pickup window'); return }
    const res = await fetch('/api/admin/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id, ...confirmForm }),
    })
    const data = await res.json()
    if (res.ok) { toast.success('Order confirmed — customer notified!'); setConfirming(null); fetchData() }
    else toast.error(data.error || 'Failed')
  }

  const byProduct: Record<string, any[]> = {}
  for (const e of entries) {
    if (!byProduct[e.product_id]) byProduct[e.product_id] = []
    byProduct[e.product_id].push(e)
  }

  if (loading) return <div className="text-stone-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-lg">Waitlist</h2>
        <button onClick={() => setShowCalendar(!showCalendar)} className="btn-secondary !py-1.5 !px-4 text-sm">
          {showCalendar ? 'Hide calendar' : 'Edit bake calendar'}
        </button>
      </div>

      {showCalendar && <BakeCalendarManager products={products} />}

      {Object.keys(byProduct).length === 0 && <p className="text-stone-400">No waitlist entries.</p>}

      {Object.entries(byProduct).map(([product_id, productEntries]) => (
        <div key={product_id} className="card p-5">
          <h3 className="font-serif text-lg mb-4">{productEntries[0].product_name}</h3>
          <div className="space-y-3">
            {productEntries.map(entry => (
              <div key={entry.id} className="border border-brand-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">#{entry.position} — {entry.user_name}</p>
                    <p className="text-xs text-stone-500">{entry.user_email}</p>
                    <p className="text-xs text-stone-500">Qty: {entry.qty}{entry.variant_label ? ` · ${entry.variant_label}` : ''}</p>
                    {entry.notes && <p className="text-xs text-stone-400 mt-0.5">Notes: {entry.notes}</p>}
                    {entry.preferred_date && <p className="text-xs text-stone-500 mt-0.5">Requested date: {entry.preferred_date}{!entry.is_calendar_date ? ' ⚠ not a scheduled bake day' : ''}</p>}
                    {entry.status === 'payment_pending' && (
                      <div className="mt-1">
                        <p className="text-xs text-amber-700">Awaiting payment · Bake: {entry.bake_date}</p>
                        <p className="text-xs text-red-500">Expires: {new Date(entry.expires_at).toLocaleString()}</p>
                      </div>
                    )}
                    {entry.paid_at && <p className="text-xs text-green-700 mt-1">Paid {new Date(entry.paid_at).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      entry.status === 'waiting' ? 'bg-blue-50 text-blue-700' :
                      entry.status === 'payment_pending' ? 'bg-amber-50 text-amber-700' :
                      entry.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'
                    }`}>{entry.status}</span>
                    {entry.status === 'waiting' && (
                      <>
                        <button onClick={() => setConfirming(confirming === entry.id ? null : entry.id)}
                          className="btn-primary !py-1 !px-3 text-xs">Confirm</button>
                        <button onClick={async () => {
                          if (!confirm('Decline this waitlist request?')) return
                          await fetch('/api/admin/waitlist/decline', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ entry_id: entry.id }),
                          })
                          toast.success('Request declined')
                          fetchData()
                        }} className="text-xs text-red-400 hover:text-red-600 px-1">Decline</button>
                      </>
                    )}
                  </div>
                </div>
                {confirming === entry.id && (
                  <div className="mt-3 pt-3 border-t border-brand-100 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-stone-400 block mb-1">Bake date</label>
                      <input type="date" value={confirmForm.bake_date}
                        onChange={e => setConfirmForm(f => ({ ...f, bake_date: e.target.value }))}
                        className="w-full border border-brand-200 rounded px-2 py-1 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-stone-400 block mb-1">Pickup window</label>
                      <input type="text" placeholder="e.g. Pickup before Sunday 7pm" value={confirmForm.pickup_window}
                        onChange={e => setConfirmForm(f => ({ ...f, pickup_window: e.target.value }))}
                        className="w-full border border-brand-200 rounded px-2 py-1 text-sm focus:outline-none" />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button onClick={() => confirm(entry.id)} className="btn-primary !py-1 !px-3 text-xs">Send confirmation + payment link</button>
                      <button onClick={() => setConfirming(null)} className="btn-secondary !py-1 !px-3 text-xs">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BakeCalendarManager({ products }: { products: any[] }) {
  const [calendar, setCalendar] = useState<any[]>([])
  const [form, setForm] = useState({ bake_date: '', product_id: '', max_orders: 10, cutoff_hours: 48 })
  const [blackouts, setBlackouts] = useState<any[]>([])
  const [blackoutForm, setBlackoutForm] = useState({ start_date: '', end_date: '', reason: '' })

  const fetchCalendar = async () => {
    const res = await fetch('/api/admin/bake-calendar')
    const data = await res.json()
    setCalendar(data.calendar || [])
  }

  const fetchBlackouts = async () => {
    const res = await fetch('/api/admin/blackout-dates')
    const data = await res.json()
    setBlackouts(data.blackouts || [])
  }

  useEffect(() => { fetchCalendar(); fetchBlackouts() }, [])

  const add = async () => {
    if (!form.bake_date || !form.product_id) { toast.error('Fill in date and product'); return }
    await fetch('/api/admin/bake-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    toast.success('Bake date added')
    fetchCalendar()
  }

  const remove = async (bake_date: string, product_id: string) => {
    await fetch('/api/admin/bake-calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bake_date, product_id }),
    })
    fetchCalendar()
  }

  const addBlackout = async () => {
    if (!blackoutForm.start_date || !blackoutForm.end_date) { toast.error('Select start and end date'); return }
    if (blackoutForm.end_date < blackoutForm.start_date) { toast.error('End date must be after start date'); return }
    const res = await fetch('/api/admin/blackout-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blackoutForm),
    })
    if (res.ok) { toast.success('Blackout added'); setBlackoutForm({ start_date: '', end_date: '', reason: '' }); fetchBlackouts() }
    else toast.error('Failed to add blackout')
  }

  const removeBlackout = async (id: string) => {
    await fetch('/api/admin/blackout-dates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchBlackouts()
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-brand-50">
        <h3 className="font-serif text-lg mb-4">Bake calendar</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Date</label>
            <input type="date" value={form.bake_date} onChange={e => setForm(f => ({ ...f, bake_date: e.target.value }))}
              className="w-full border border-brand-200 rounded px-2 py-1.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Product</label>
            <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
              className="w-full border border-brand-200 rounded px-2 py-1.5 text-sm focus:outline-none">
              <option value="">Select…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Max orders</label>
            <input type="number" value={form.max_orders} onChange={e => setForm(f => ({ ...f, max_orders: parseInt(e.target.value) || 10 }))}
              className="w-full border border-brand-200 rounded px-2 py-1.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Cutoff (hours before)</label>
            <input type="number" value={form.cutoff_hours} onChange={e => setForm(f => ({ ...f, cutoff_hours: parseInt(e.target.value) || 48 }))}
              className="w-full border border-brand-200 rounded px-2 py-1.5 text-sm focus:outline-none" />
          </div>
        </div>
        <button onClick={add} className="btn-primary !py-1.5 !px-4 text-sm mb-4">Add bake date</button>
        <div className="space-y-2">
          {calendar.map((c: any) => (
            <div key={`${c.bake_date}-${c.product_id}`} className="flex items-center justify-between text-sm border border-brand-100 rounded p-2 bg-white">
              <span>{c.bake_date} — {c.product_name} (max {c.max_orders}, cutoff {c.cutoff_hours}h)</span>
              <button onClick={() => remove(c.bake_date, c.product_id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
            </div>
          ))}
          {calendar.length === 0 && <p className="text-stone-400 text-sm">No bake dates set.</p>}
        </div>
      </div>

      <div className="card p-5 bg-red-50 border border-red-100">
        <h3 className="font-serif text-lg mb-1">Days off</h3>
        <p className="text-xs text-stone-500 mb-4">Block date ranges when you won't be baking. Customers won't be able to select these days.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-xs text-stone-500 block mb-1">From</label>
            <input type="date" value={blackoutForm.start_date}
              onChange={e => setBlackoutForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full border border-red-200 rounded px-2 py-1.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">To</label>
            <input type="date" value={blackoutForm.end_date}
              min={blackoutForm.start_date}
              onChange={e => setBlackoutForm(f => ({ ...f, end_date: e.target.value }))}
              className="w-full border border-red-200 rounded px-2 py-1.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Reason (optional)</label>
            <input type="text" placeholder="e.g. Work week, vacation…" value={blackoutForm.reason}
              onChange={e => setBlackoutForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full border border-red-200 rounded px-2 py-1.5 text-sm focus:outline-none" />
          </div>
        </div>
        <button onClick={addBlackout} className="bg-red-700 text-white rounded px-4 py-1.5 text-sm hover:bg-red-800 transition-colors mb-4">
          Block dates
        </button>
        <div className="space-y-2">
          {blackouts.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between text-sm border border-red-100 rounded p-2 bg-white">
              <span>
                {b.start_date === b.end_date ? b.start_date : `${b.start_date} → ${b.end_date}`}
                {b.reason && <span className="text-stone-400 ml-2">— {b.reason}</span>}
              </span>
              <button onClick={() => removeBlackout(b.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
            </div>
          ))}
          {blackouts.length === 0 && <p className="text-stone-400 text-sm">No days off set.</p>}
        </div>
      </div>
    </div>
  )
}
