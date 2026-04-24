'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from '@/types'
import type { OrderStatus } from '@/types'
import { format, addDays } from 'date-fns'
import { Plus, Package, Users, BarChart2 } from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<'orders' | 'batch' | 'reports'>('orders')

  if (status === 'loading') return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-stone-400">Loading…</div>
  if (!session?.user || session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return <div className="max-w-lg mx-auto px-4 py-20 text-center text-stone-500">Not authorized.</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl text-brand-900 mb-6">Admin</h1>
      <div className="flex gap-2 mb-8 border-b border-brand-200">
        {([['orders', 'Order Queue', Users], ['batch', 'Batch Manager', Package], ['reports', 'Reports', BarChart2]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-brand-700 text-brand-900' : 'border-transparent text-stone-500 hover:text-brand-700'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      {tab === 'orders' && <OrderQueue />}
      {tab === 'batch' && <BatchManager />}
      {tab === 'reports' && <Reports />}
    </div>
  )
}

function OrderQueue() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/admin/orders')
    const data = await res.json()
    setOrders(data.orders || [])
    setLoading(false)
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
  if (orders.length === 0) return <div className="text-stone-400 text-center py-12">No active orders.</div>

  return (
    <div className="space-y-4">
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
              <span className="text-sm bg-brand-100 text-brand-800 px-3 py-1 rounded-full">
                {ORDER_STATUS_LABELS[order.status as OrderStatus]}
              </span>
              <div className="flex gap-2">
                {nextStatus && (
                  <button onClick={() => updateStatus(order.id, nextStatus)} className="btn-primary !py-1.5 !px-4 text-sm">
                    → {ORDER_STATUS_LABELS[nextStatus]}
                  </button>
                )}
                {order.status === 'ready_for_pickup' && (
                  <button onClick={() => updateStatus(order.id, 'completed')} className="btn-primary !py-1.5 !px-4 text-sm">Mark picked up</button>
                )}
                <button onClick={() => cancelOrder(order.id)} className="text-sm text-red-400 hover:text-red-600 px-2">Cancel</button>
              </div>
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
    </div>
  )
}

