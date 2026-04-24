'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useSession, signIn, signOut } from 'next-auth/react'

export function Nav() {
  const { data: session } = useSession()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    if (!session?.user) { setCartCount(0); return }
    const fetchCart = () =>
      fetch('/api/cart/count').then(r => r.json()).then(d => setCartCount(d.count || 0))
    fetchCart()
    const interval = setInterval(fetchCart, 10000)
    return () => clearInterval(interval)
  }, [session])

  return (
    <nav className="sticky top-0 z-50 bg-brand-50/95 backdrop-blur border-b border-brand-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-brand-900 hover:text-brand-700">
          Aaron Rockwell's Breads
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/menu" className="text-sm text-stone-600 hover:text-brand-800">Menu & Order</Link>
          {session?.user && (
            <Link href="/my-orders" className="text-sm text-stone-600 hover:text-brand-800">My Orders</Link>
          )}
          {session?.user && (
            <Link href="/cart" className="relative text-stone-600 hover:text-brand-800">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-700 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          {session?.user ? (
            <button onClick={() => signOut()} className="text-sm text-stone-500 hover:text-brand-800">
              Sign out
            </button>
          ) : (
            <button onClick={() => signIn('google')} className="btn-primary !py-2 !px-4 text-sm">
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
