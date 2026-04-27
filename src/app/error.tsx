'use client'
import Link from 'next/link'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="text-6xl font-serif text-brand-200 mb-4">500</p>
      <h1 className="text-2xl text-brand-900 mb-3">Something went wrong</h1>
      <p className="text-stone-500 mb-8">We hit a snag. Please try again or come back shortly.</p>
      <div className="flex gap-4 justify-center">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-secondary">Back to home</Link>
      </div>
    </div>
  )
}
