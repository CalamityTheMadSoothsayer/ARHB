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
  const [variants] = await db.query(
    `SELECT pv.*, p.name as product_name FROM product_variants pv JOIN products p ON p.id = pv.product_id ORDER BY pv.display_order ASC`
  ) as any[]
  return NextResponse.json({ variants })
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { product_id, label, price } = await req.json()
  if (!product_id || !label) return NextResponse.json({ error: 'product_id and label required' }, { status: 400 })
  const [[{ max_order }]] = await db.query(
    `SELECT COALESCE(MAX(display_order), 0) as max_order FROM product_variants WHERE product_id = ?`,
    [product_id]
  ) as any[]
  const id = `var-${crypto.randomUUID().slice(0, 8)}`
  await db.query(
    `INSERT INTO product_variants (id, product_id, label, price, display_order) VALUES (?, ?, ?, ?, ?)`,
    [id, product_id, label, price || 0, (max_order as number) + 1]
  )
  return NextResponse.json({ ok: true, id })
}
