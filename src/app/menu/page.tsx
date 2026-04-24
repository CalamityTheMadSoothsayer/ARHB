'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { ShoppingCart, Clock, Bell } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function MenuPage() {
  const { data: session } = useSession()
  const [batch, setBatch] = useState<any>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)

  const fetchInventory = useCallback(async () => {
    const res = await fetch('/api/inventory')
    const data = await res.json()
    setBatch(data.batch)
    setInventory(data.inventory || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInventory()
    const interval = setInterval(fetchInventory, 4000)
    return () => clearInterval(interval)
  }, [fetchInventory])

  const addToCart = async (item: any) => {
    if (!session?.user) {
      signIn('google')
      return
    }
    const qty = quantities[item.id] || 1
    setAdding(item.id)

    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchInventoryId: item.id, qty }),
    })
    const data = await res.json()
    setAdding(null)

    if (!res.ok) {
      toast.error(data.error || 'Could not add to cart — someone may have just grabbed the last one!')
      fetchInventory()
    } else {
      toast.success('Added to cart! Reserved for 15 minutes.')
    }
  }

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-stone-400">Loading…</div>
  if (!batch) return <OutOfStockPage />

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl text-brand-900 mb-2">Order fresh bread</h1>
        <div className="flex items-center gap-4 text-sm text-stone-500">
          <span className="flex items-center gap-1">
            <Clock size={14} /> Pickup: <strong className="text-stone-700 ml-1">{batch.pickup_window}</strong>
          </span>
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Open for orders</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map((item) => {
          const qty = quantities[item.id] || 1
          const available = item.available_qty
          const isOut = available === 0

          return (
            <div key={item.id} className={`card p-6 flex flex-col ${isOut ? 'opacity-60' : ''}`}>
              <div className="w-full h-36 relative rounded-lg overflow-hidden mb-4"><Image src={item.name.toLowerCase().includes('sourdough') ? '/images/sourdough_thumbnail.png' : '/images/brioche_thumbnail.jpg'} alt={item.name} fill className="object-cover" /></div>
              <h2 className="font-serif text-lg text-brand-900 mb-1">{item.name}</h2>
              <p className="text-brand-600 font-medium mb-1">${(item.price / 100).toFixed(2)}</p>
              <p className="text-sm text-stone-500 mb-3 flex-1">{item.description}</p>

              <div className="text-xs text-stone-400 mb-3 space-y-0.5">
                <div className="flex justify-between">
                  <span>Available</span>
                  <span className={available <= 2 && available > 0 ? 'text-amber-600 font-medium' : ''}>
                    {available} left
                  </span>
                </div>
                {item.reserved_qty > 0 && (
                  <div className="flex justify-between">
                    <span>In others' carts</span>
                    <span>{item.reserved_qty}</span>
                  </div>
                )}
              </div>

              {isOut ? (
                <p className="text-center text-sm text-stone-400 py-2">Out of stock</p>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-brand-200 rounded-lg overflow-hidden">
                    <button onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.max(1, qty - 1) }))}
                      className="px-3 py-2 text-brand-700 hover:bg-brand-50">−</button>
                    <span className="px-3 py-2 text-sm font-medium min-w-[2rem] text-center">{qty}</span>
                    <button onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.min(available, qty + 1) }))}
                      className="px-3 py-2 text-brand-700 hover:bg-brand-50">+</button>
                  </div>
                  <button onClick={() => addToCart(item)} disabled={!!adding || isOut}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 !py-2">
                    {adding === item.id ? '…' : <><ShoppingCart size={16} /> Add</>}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {session?.user && inventory.some(i => i.available_qty > 0) && (
        <div className="mt-8 text-center">
          <Link href="/cart" className="btn-primary">View cart →</Link>
        </div>
      )}
    </div>
  )
}

function OutOfStockPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSubmitted(true)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-4">🍞</div>
      <h1 className="text-3xl text-brand-900 mb-3">Sold out for now</h1>
      <p className="text-stone-500 mb-8">No batches open right now. Sign up and we'll email you the moment new stock drops.</p>
      {submitted ? (
        <p className="text-green-700 font-medium">You're on the list! 🙌</p>
      ) : (
        <form onSubmit={join} className="flex gap-2">
          <input type="email" required placeholder="your@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 border border-brand-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Bell size={16} /> Notify me
          </button>
        </form>
      )}
    </div>
  )
}