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
              <Image src="/images/sourdough_thumbnail.png" alt="Sourdough loaf" fill className="object-cover" />
            </div>
            <h3 className="text-lg font-serif text-brand-900 mb-1">Sourdough Loaf</h3>
            <p className="text-brand-600 font-medium mb-2">$8.00</p>
            <p className="text-sm text-stone-500">Classic homemade sourdough. Crusty outside, chewy inside.</p>
          </div>

          <div className="card p-6">
            <div className="w-full h-48 relative rounded-lg overflow-hidden mb-4">
              <Image src="/images/brioche_thumbnail.jpg" alt="Brioche buns" fill className="object-cover" />
            </div>
            <h3 className="text-lg font-serif text-brand-900 mb-1">Brioche Buns — 4 Pack</h3>
            <p className="text-brand-600 font-medium mb-2">$6.00</p>
            <p className="text-sm text-stone-500">Soft, buttery brioche buns. Perfect for burgers or just eating.</p>
          </div>

          <div className="card p-6">
            <div className="w-full h-48 relative rounded-lg overflow-hidden mb-4">
              <Image src="/images/brioche_thumbnail.jpg" alt="Brioche buns 8 pack" fill className="object-cover" />
            </div>
            <h3 className="text-lg font-serif text-brand-900 mb-1">Brioche Buns — 8 Pack</h3>
            <p className="text-brand-600 font-medium mb-2">$10.00</p>
            <p className="text-sm text-stone-500">Same great brioche buns, bigger pack for bigger gatherings.</p>
          </div>

        </div>
        <p className="text-center text-stone-400 text-sm mt-6 italic">More coming soon…</p>
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