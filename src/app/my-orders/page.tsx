'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { ORDER_STATUS_LABELS, PICKUP_LOCATIONS } from '@/types'
import type { OrderStatus } from '@/types'

import { format } from 'date-fns'

export default function MyOrdersPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSurvey, setShowSurvey] = useState(false)
  const [surveyDone, setSurveyDone] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('paid') === 'true' && session?.user) {
      fetch('/api/referral').then(r => r.json()).then(d => {
        if (!d.answered) setShowSurvey(true)
      })
    }
  }, [session])

  const submitSurvey = async (source: string) => {
    await fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    })
    setShowSurvey(false)
    setSurveyDone(true)
  }

  const fetchOrders = useCallback(async () => {
    if (!session?.user) { setLoading(false); return }
    const res = await fetch('/api/my-orders')
    const data = await res.json()
    setOrders(data.orders || [])
    setLoading(false)
  }, [session])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  if (!session?.user) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-stone-500 mb-4">Sign in to view your orders.</p>
      <button onClick={() => signIn('google')} className="btn-primary">Sign in with Google</button>
    </div>
  )

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-stone-400">Loading…</div>

  if (orders.length === 0 && !showSurvey) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-4">🍞</p>
      <p className="text-stone-500 mb-4">No orders yet.</p>
      <a href="/menu" className="btn-primary">Order bread →</a>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl text-brand-900 mb-8">My orders</h1>

      {showSurvey && (
        <div className="card p-6 mb-8 border-2 border-brand-300">
          <h2 className="font-serif text-xl text-brand-900 mb-2">One quick question</h2>
          <p className="text-stone-500 text-sm mb-4">How did you hear about us?</p>
          <div className="grid grid-cols-2 gap-2">
            {['Facebook', 'NextDoor', 'Word of mouth', 'Google search', 'Driving by', 'Other'].map(source => (
              <button key={source} onClick={() => submitSurvey(source)}
                className="border border-brand-200 rounded-lg px-4 py-2 text-sm text-left hover:bg-brand-50 hover:border-brand-400 transition-colors">
                {source}
              </button>
            ))}
          </div>
          <button onClick={() => { setShowSurvey(false); setSurveyDone(true) }} className="text-xs text-stone-400 mt-3 hover:text-stone-600">
            Skip
          </button>
        </div>
      )}

      {surveyDone && (
        <div className="card p-4 mb-6 bg-green-50 border-green-200">
          <p className="text-green-700 text-sm">Thanks for letting us know!</p>
        </div>
      )}
      <div className="space-y-6">{orders.map(order => <OrderCard key={order.id} order={order} />)}</div>
    </div>
  )
}

function OrderCard({ order }: { order: any }) {
  const location = PICKUP_LOCATIONS[order.pickup_location as keyof typeof PICKUP_LOCATIONS]
  const isCancelled = order.status === 'cancelled'


  return (
    <div className="card p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-stone-400 mb-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-medium">{format(new Date(order.created_at), 'MMMM d, yyyy')}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="text-sm text-stone-600 mb-4 space-y-1">
        {order.items?.map((item: any) => (
          <p key={item.id}>{item.qty}× {item.product_name} — ${((item.unit_price * item.qty) / 100).toFixed(2)}</p>
        ))}
        <p className="font-medium text-stone-900 pt-1">Total: ${(order.total / 100).toFixed(2)}</p>
      </div>

      <div className="text-sm text-stone-500 mb-5">
        <p>📍 {location?.address}</p>
        {order.pickup_window && <p>🕐 {order.pickup_window}</p>}
      </div>

      {isCancelled
        ? <p className="text-sm text-red-500">This order was cancelled.</p>
        : <p className="text-sm text-stone-500">Status: <strong className="text-brand-900">{ORDER_STATUS_LABELS[order.status as OrderStatus]}</strong></p>
      }
    </div>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors: Partial<Record<OrderStatus, string>> = {
    order_received: 'bg-blue-50 text-blue-700',
    being_mixed: 'bg-amber-50 text-amber-700',
    proofing: 'bg-amber-50 text-amber-700',
    shaping: 'bg-amber-50 text-amber-700',
    baking: 'bg-orange-50 text-orange-700',
    ready_for_pickup: 'bg-green-50 text-green-700',
    completed: 'bg-stone-100 text-stone-500',
    cancelled: 'bg-red-50 text-red-500',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[status] || ''}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}
