import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="text-6xl font-serif text-brand-200 mb-4">404</p>
      <h1 className="text-2xl text-brand-900 mb-3">Page not found</h1>
      <p className="text-stone-500 mb-8">Looks like this page wandered off. Maybe it went to get bread.</p>
      <Link href="/" className="btn-primary">Back to home</Link>
    </div>
  )
}
