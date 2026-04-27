'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { Trash2, Clock, MapPin } from 'lucide-react'
import { PICKUP_LOCATIONS } from '@/types'
import type { PickupLocation } from '@/types'
import { differenceInSeconds, addDays, format } from 'date-fns'

export default function CartPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [pickup, setPickup] = useState<PickupLocation>('edison_901')
  const [now, setNow] = useState(Date.now())

  const fetchCart = useCallback(async () => {
    if (!session?.user) { setLoading(false); return }
    const res = await fetch('/api/cart')
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }, [session])

  useEffect(() => {
    fetchCart()
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [fetchCart])

  const removeItem = async (item: any) => {
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchInventoryId: item.batch_inventory_id }),
    })
    setItems(prev => prev.filter(i => i.id !== item.id))
    toast.success('Removed from cart')
  }

  const checkout = async () => {
    setCheckingOut(true)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupLocation: pickup }),
    })
    const data = await res.json()
    if (data.paymentUrl) {
      window.location.href = data.paymentUrl
    } else {
      toast.error(data.error || 'Something went wrong')
      setCheckingOut(false)
    }
  }

  const minExpiry = items.length > 0 ? Math.min(...items.map(i => new Date(i.expires_at).getTime())) : null
  const secsLeft = minExpiry ? Math.max(0, differenceInSeconds(minExpiry, now)) : null
  const minsLeft = secsLeft !== null ? Math.floor(secsLeft / 60) : null
  const secsRem = secsLeft !== null ? secsLeft % 60 : null
  const total = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0)

  if (!session?.user) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-stone-500 mb-4">Sign in to view your cart.</p>
      <button onClick={() => signIn('google')} className="btn-primary">Sign in with Google</button>
    </div>
  )

  if (loading) return <div className="max-w-lg mx-auto px-4 py-20 text-center text-stone-400">Loading…</div>

  if (items.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-4">🛒</p>
      <p className="text-stone-500 mb-4">Your cart is empty.</p>
      <a href="/menu" className="btn-primary">Browse menu →</a>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-3xl text-brand-900 mb-2">Your cart</h1>

      {secsLeft !== null && (
        <div className={`flex items-center gap-2 text-sm mb-6 px-3 py-2 rounded-lg ${secsLeft < 120 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
          <Clock size={14} />
          Reserved for <strong>{minsLeft}:{String(secsRem).padStart(2, '0')}</strong> — complete checkout before it expires!
        </div>
      )}

      <div className="space-y-3 mb-6">
        {items.map(item => {
          const bakeDate = item.bake_date ? new Date(item.bake_date + 'T12:00:00') : null
          const expiryDate = bakeDate ? addDays(bakeDate, 3) : null
          const itemName = item.variant_label ? `${item.name} — ${item.variant_label}` : item.name
          return (
            <div key={item.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">{itemName}</p>
                <p className="text-sm text-stone-500">{item.qty} × ${(item.unit_price / 100).toFixed(2)}</p>
                {expiryDate && <p className="text-xs text-red-400 mt-0.5">Best by: {format(expiryDate, 'MMMM d')}</p>}
              </div>
              <div className="flex items-center gap-3">
                <p className="font-medium">${((item.unit_price * item.qty) / 100).toFixed(2)}</p>
                <button onClick={() => removeItem(item)} className="text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-medium flex items-center gap-2 mb-3"><MapPin size={16} className="text-brand-600" /> Choose pickup location</h2>
        <div className="space-y-2">
          {(Object.entries(PICKUP_LOCATIONS) as [PickupLocation, any][]).map(([key, loc]) => (
            <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${pickup === key ? 'border-brand-400 bg-brand-50' : 'border-brand-100 hover:bg-brand-50'}`}>
              <input type="radio" name="pickup" value={key} checked={pickup === key} onChange={() => setPickup(key)} className="mt-0.5" />
              <div>
                <p className="font-medium text-sm">{loc.label}</p>
                <p className="text-xs text-stone-500">{loc.address}</p>
                {loc.note && <p className="text-xs text-green-600 mt-0.5">{loc.note}</p>}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-brand-200 pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-medium">Total</span>
          <span className="text-xl font-medium">${(total / 100).toFixed(2)}</span>
        </div>
        <button onClick={checkout} disabled={checkingOut} className="btn-primary w-full text-center">
          {checkingOut ? 'Redirecting to payment…' : 'Pay with Square →'}
        </button>
        <p className="text-xs text-stone-400 text-center mt-2">Secure payment via Square. Accepts card, Apple Pay, Google Pay, Cash App.</p>
      </div>
    </div>
  )
}
