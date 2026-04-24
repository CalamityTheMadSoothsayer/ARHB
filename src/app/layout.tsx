import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/Providers'
import { Nav } from '@/components/Nav'
import './globals.css'

export const metadata: Metadata = {
  title: "Aaron Rockwell's Homemade Breads",
  description: 'Fresh homemade sourdough and brioche buns in Brush, CO.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-50 text-stone-900 min-h-screen">
        <Providers>
          <Nav />
          <main>{children}</main>
          <footer className="mt-20 border-t border-brand-200 py-10 text-center text-sm text-stone-500">
            <p className="font-serif text-lg text-brand-800 mb-1">Aaron Rockwell's Homemade Breads</p>
            <p>Brush, CO · <a href="tel:9703709895" className="hover:text-brand-600">970-370-9895</a></p>
            <p className="mt-2">
              <a href="https://www.facebook.com/profile.php?id=61560442705913" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">
                Facebook
              </a>
            </p>
          </footer>
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  )
}
