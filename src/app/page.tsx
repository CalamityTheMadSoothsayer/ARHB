import Link from 'next/link'
import { MapPin, Phone, Facebook } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <p className="text-brand-600 text-sm font-medium tracking-widest uppercase mb-3">Homemade · Brush, CO</p>
        <h1 className="text-5xl md:text-6xl text-brand-900 mb-4">
          Aaron Rockwell's<br />Homemade Breads
        </h1>
        <p className="text-lg text-stone-500 max-w-lg mx-auto mb-8">
          Small-batch sourdough and brioche buns, made with the same care and love every time.
        </p>
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
          {[
            { name: 'Sourdough Loaf', price: '$8.00', desc: 'Classic homemade sourdough. Crusty outside, chewy inside.' },
            { name: 'Brioche Buns — 4 pack', price: '$6.00', desc: 'Soft, buttery brioche buns. Perfect for burgers or just eating.' },
            { name: 'Brioche Buns — 8 pack', price: '$10.00', desc: 'Same great brioche buns, bigger pack for bigger gatherings.' },
          ].map((product) => (
            <div key={product.name} className="card p-6">
              <div className="w-full h-40 bg-brand-100 rounded-lg mb-4 flex items-center justify-center text-4xl">
                🍞
              </div>
              <h3 className="text-lg font-serif text-brand-900 mb-1">{product.name}</h3>
              <p className="text-brand-600 font-medium mb-2">{product.price}</p>
              <p className="text-sm text-stone-500">{product.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-stone-400 text-sm mt-6 italic">More coming soon…</p>
      </section>

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
            <a href="tel:9703709895" className="text-brand-700 hover:text-brand-900">
              970-370-9895
            </a>
          </div>
          <div className="card p-6">
            <Facebook className="mx-auto mb-3 text-brand-600" size={24} />
            <h3 className="font-medium mb-2">Facebook</h3>
            <a
              href="https://www.facebook.com/profile.php?id=61560442705913"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 hover:text-brand-900 text-sm"
            >
              Follow us →
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
