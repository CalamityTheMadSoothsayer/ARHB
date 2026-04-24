'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from '@/types'
import type { OrderStatus } from '@/types'
import { format } from 'date-fns'
import { Plus, Package, Users } from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<'orders' | 'batch'>('orders')

  if (status === 'loading') return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-stone-400">Loading…</div>

  if (!session?.user || session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return <div className="max-w-lg mx-auto px-4 py-20 text-center text-stone-500">Not authorized.</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl text-brand-900 mb-6">Admin</h1>
      <div className="flex gap-2 mb-8 border-b border-brand-200">
        {([['orders', 'Order Queue', Users], ['batch', 'Batch Manager', Package]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-brand-700 text-brand-900' : 'border-transparent text-stone-500 hover:text-brand-700'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      {tab === 'orders' && <OrderQueue />}
      {tab === 'batch' && <BatchManager />}
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
              {order.items?.map((item: any) => <p key={item.id}>{item.qty}× {item.product_name}</p>)}
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm bg-brand-100 text-brand-800 px-3 py-1 rounded-full">
                {ORDER_STATUS_LABELS[order.status as OrderStatus]}
              </span>
              <div className="flex gap-2">
                {nextStatus && (
                  <button onClick={() => updateStatus(order.id, nextStatus)}
                    className="btn-primary !py-1.5 !px-4 text-sm">
                    → {ORDER_STATUS_LABELS[nextStatus]}
                  </button>
                )}
                {order.status === 'ready_for_pickup' && (
                  <button onClick={() => updateStatus(order.id, 'completed')} className="btn-primary !py-1.5 !px-4 text-sm">
                    Mark picked up
                  </button>
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
  const [form, setForm] = useState({ pickup_date: '', pickup_window: '', notes: '', inventory: {} as Record<string, number> })

  const fetchBatches = useCallback(async () => {
    const res = await fetch('/api/admin/batch')
    const data = await res.json()
    setBatches(data.batches || [])
    setProducts(data.products || [])
  }, [])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const createBatch = async () => {
    if (!form.pickup_date || !form.pickup_window) { toast.error('Date and window required'); return }
    const res = await fetch('/api/admin/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-stone-500 block mb-1">Pickup date</label>
              <input type="date" value={form.pickup_date} onChange={e => setForm(f => ({ ...f, pickup_date: e.target.value }))}
                className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div>
              <label className="text-sm text-stone-500 block mb-1">Pickup window</label>
              <input type="text" placeholder="e.g. Saturday 10am–2pm" value={form.pickup_window}
                onChange={e => setForm(f => ({ ...f, pickup_window: e.target.value }))}
                className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-stone-500 block mb-2">Stock quantities</label>
            <div className="space-y-2">
              {products.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-sm">{p.name} (${(p.price / 100).toFixed(2)})</span>
                  <input type="number" min="0" placeholder="0"
                    value={form.inventory[p.id] || ''}
                    onChange={e => setForm(f => ({ ...f, inventory: { ...f.inventory, [p.id]: parseInt(e.target.value) || 0 } }))}
                    className="w-24 border border-brand-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
              ))}
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
          <div key={batch.id} className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{batch.pickup_window}</p>
              <p className="text-sm text-stone-500">{format(new Date(batch.pickup_date), 'MMMM d, yyyy')}</p>
              {batch.notes && <p className="text-xs text-stone-400 mt-0.5">{batch.notes}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${batch.status === 'open' ? 'bg-green-100 text-green-700' : batch.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                {batch.status}
              </span>
              {batch.status === 'draft' && <button onClick={() => batchAction(batch.id, 'open')} className="btn-primary !py-1.5 !px-3 text-sm">Open</button>}
              {batch.status === 'open' && <button onClick={() => batchAction(batch.id, 'close')} className="btn-secondary !py-1.5 !px-3 text-sm">Close</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
