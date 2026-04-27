'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Facebook } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero — full width header image */}
      <section className="w-full">
        <Image
          src="/images/header.png"
          alt="Welcome to Aaron Rockwell Breads — Homemade breads made with care, baked with love"
          width={1500}
          height={600}
          className="w-full h-auto max-w-3xl mx-auto block"
          priority
        />
      </section>

      {/* CTA */}
      <section className="text-center py-10">
        <Link href="/menu" className="btn-primary text-lg">
          Order fresh bread →
        </Link>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="border-t border-brand-200" />
      </div>

      {/* Products */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl text-center mb-10 text-brand-900">What we bake</h2>
        <div className="grid md:grid-cols-3 gap-6">

          <div className="card p-6">
            <div className="w-full h-48 relative rounded-lg overflow-hidden mb-4">
              <Image src="/images/sourdough_thumbnail.jpg" alt="Sourdough loaf" fill className="object-cover" />
            </div>
            <h3 className="text-lg font-serif text-brand-900 mb-1">Sourdough Loaf</h3>
            <p className="text-brand-600 font-medium mb-2">$8.00</p>
            <p className="text-sm text-stone-500">Classic homemade sourdough. Crusty outside, chewy inside.</p>
          </div>

          <div className="card p-6">
            <div className="w-full h-48 relative rounded-lg overflow-hidden mb-4">
              <Image src="/images/brioche_thumbnail.jpg" alt="Brioche buns" fill className="object-cover" />
            </div>
            <h3 className="text-lg font-serif text-brand-900 mb-1">Brioche Buns</h3>
            <p className="text-brand-600 font-medium mb-2">4 Pack — $6.00 · 8 Pack — $10.00</p>
            <p className="text-sm text-stone-500">Soft, buttery brioche buns. Perfect for burgers or just eating. Made to order.</p>
          </div>
          <div className="card p-6">
            <div className="w-full h-48 relative rounded-lg overflow-hidden mb-4">
              <Image src="/images/rolls_thumbnail.jpg" alt="Cinnamon rolls" fill className="object-cover" />
            </div>
            <h3 className="text-lg font-serif text-brand-900 mb-1">Sourdough Cinnamon Rolls</h3>
            <p className="text-brand-600 font-medium mb-2">6 Pack — $8.00 · 12 Pack — $14.00</p>
            <p className="text-sm text-stone-500">Handmade sourdough cinnamon rolls. Icing NOT included.</p>
          </div>

        </div>
        <p className="text-center text-stone-400 text-sm mt-6 italic">More coming soon…</p>
        <div className="mt-8 text-center card p-6 max-w-lg mx-auto">
          <h3 className="font-serif text-lg text-brand-900 mb-2">Don't see what you're looking for?</h3>
          <p className="text-sm text-stone-500 mb-4">We're happy to discuss custom orders or other baked goods. Reach out and let's talk.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="tel:9703709895" className="btn-secondary !py-2 !px-4 text-sm">Call or text 970-370-9895</a>
            <a href="https://www.facebook.com/profile.php?id=61560442705913" target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2 !px-4 text-sm">Message on Facebook</a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl text-center mb-10 text-brand-900">How it works</h2>
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div className="card p-6">
            <div className="w-10 h-10 rounded-full bg-brand-800 text-white flex items-center justify-center font-serif text-lg mx-auto mb-3">1</div>
            <h3 className="font-medium mb-2">Order online</h3>
            <p className="text-sm text-stone-500">Browse available stock and pay securely through Square.</p>
          </div>
          <div className="card p-6">
            <div className="w-10 h-10 rounded-full bg-brand-800 text-white flex items-center justify-center font-serif text-lg mx-auto mb-3">2</div>
            <h3 className="font-medium mb-2">We bake fresh</h3>
            <p className="text-sm text-stone-500">Sourdough is baked ahead. Brioche buns are made to order — fresh every time.</p>
          </div>
          <div className="card p-6">
            <div className="w-10 h-10 rounded-full bg-brand-800 text-white flex items-center justify-center font-serif text-lg mx-auto mb-3">3</div>
            <h3 className="font-medium mb-2">Track it live</h3>
            <p className="text-sm text-stone-500">Get email updates as your bread goes through each stage.</p>
          </div>
          <div className="card p-6">
            <div className="w-10 h-10 rounded-full bg-brand-800 text-white flex items-center justify-center font-serif text-lg mx-auto mb-3">4</div>
            <h3 className="font-medium mb-2">Pick it up</h3>
            <p className="text-sm text-stone-500">Come grab it at your chosen location in Brush, CO.</p>
          </div>
        </div>
      </section>
      <ReviewHighlight />

      {/* Recent orders */}
      <RecentOrders />

      {/* About */}
      <section className="bg-brand-900 text-brand-50 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl mb-4">Made with care</h2>
          <p className="text-brand-200 text-lg leading-relaxed">
            Every loaf and every bun is made by hand in small batches. No shortcuts, no preservatives — just good ingredients and time.
            Orders are placed online and picked up in Brush, CO.
          </p>
        </div>
      </section>

      {/* Contact / Location */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl text-center mb-10 text-brand-900">Find us</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="card p-6">
            <MapPin className="mx-auto mb-3 text-brand-600" size={24} />
            <h3 className="font-medium mb-2">Pickup locations</h3>
            <p className="text-sm text-stone-500">901 Edison St, Brush CO</p>
            <p className="text-sm text-stone-500">919 Edison St, Brush CO</p>
            <p className="text-xs text-stone-400 mt-1">(your choice at checkout)</p>
          </div>
          <div className="card p-6">
            <Phone className="mx-auto mb-3 text-brand-600" size={24} />
            <h3 className="font-medium mb-2">Phone</h3>
            <a href="tel:9703709895" className="text-brand-700 hover:text-brand-900">970-370-9895</a>
          </div>
          <div className="card p-6">
            <Facebook className="mx-auto mb-3 text-brand-600" size={24} />
            <h3 className="font-medium mb-2">Facebook</h3>
            <a href="https://www.facebook.com/profile.php?id=61560442705913" target="_blank" rel="noopener noreferrer"
              className="text-brand-700 hover:text-brand-900 text-sm">
              Follow us →
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
import { ORDER_STATUS_LABELS } from '@/types'
import type { OrderStatus } from '@/types'

function RecentOrders() {
  const [orders, setOrders] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/recent-orders').then(r => r.json()).then(d => setOrders(d.orders || []))
    const interval = setInterval(() => {
      fetch('/api/recent-orders').then(r => r.json()).then(d => setOrders(d.orders || []))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  if (orders.length === 0) return null

  const statusColors: Partial<Record<OrderStatus, string>> = {
    order_received: 'bg-blue-50 text-blue-700',
    preparing: 'bg-amber-50 text-amber-700',
    being_mixed: 'bg-amber-50 text-amber-700',
    proofing: 'bg-amber-50 text-amber-700',
    shaping: 'bg-amber-50 text-amber-700',
    baking: 'bg-orange-50 text-orange-700',
    ready_for_pickup: 'bg-green-50 text-green-700',
    completed: 'bg-stone-100 text-stone-500',
  }

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h2 className="text-3xl text-center mb-8 text-brand-900">Recent orders</h2>
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">{order.user_name}</p>
              <p className="text-xs text-stone-500 mt-0.5">{order.summary}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusColors[order.status as OrderStatus] || 'bg-stone-100 text-stone-500'}`}>
              {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ReviewHighlight() {
  const [reviews, setReviews] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      const r = [d.review_highlight, d.review_highlight_2, d.review_highlight_3].filter(Boolean)
      setReviews(r)
    })
  }, [])
  if (reviews.length === 0) return null
  return (
    <section className="bg-brand-50 border-y border-brand-200 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap gap-6 justify-center">
          {reviews.map((review, i) => (
            <div key={i} className="flex-1 min-w-[260px] max-w-sm text-center">
              <p className="text-brand-800 text-base italic leading-relaxed">"{review}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
