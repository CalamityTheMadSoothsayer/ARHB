export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.email === process.env.ADMIN_EMAIL ? session : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const [products] = await db.query(`SELECT * FROM products ORDER BY active DESC, name ASC`) as any[]
  const [variants] = await db.query(`SELECT * FROM product_variants ORDER BY display_order ASC`) as any[]
  const result = (products as any[]).map(p => ({
    ...p,
    variants: (variants as any[]).filter(v => v.product_id === p.id),
  }))
  return NextResponse.json({ products: result })
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { name, description, price } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const id = `prod-${crypto.randomUUID().slice(0, 8)}`
  await db.query(
    `INSERT INTO products (id, name, description, price, active) VALUES (?, ?, ?, ?, 1)`,
    [id, name, description || '', price || 0]
  )
  return NextResponse.json({ ok: true, id })
}
