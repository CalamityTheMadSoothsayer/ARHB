export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { randomUUID } from 'crypto'
import { sendWaitlistConfirmedEmail } from '@/lib/email'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ entries: [] })

  const [entries] = await db.query(
    `SELECT we.*, p.name as product_name, pv.label as variant_label,
            wc.bake_date, wc.pickup_window, wc.expires_at, wc.paid_at, wc.square_payment_url
     FROM waitlist_entries we
     JOIN products p ON p.id = we.product_id
     LEFT JOIN product_variants pv ON pv.id = we.variant_id
     LEFT JOIN waitlist_confirmations wc ON wc.entry_id = we.id
     WHERE we.user_email = ? AND we.status NOT IN ('removed')
     ORDER BY we.created_at DESC`,
    [session.user.email]
  ) as any[]

  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { product_id, variant_id, qty, notes, preferred_date, is_calendar_date } = await req.json()
  const email = session.user.email
  const name = session.user.name || email

  // Check not already on waitlist for this product
  const [[existing]] = await db.query(
    `SELECT id FROM waitlist_entries WHERE user_email = ? AND product_id = ? AND status IN ('waiting', 'confirmed', 'payment_pending')`,
    [email, product_id]
  ) as any[]

  if (existing) return NextResponse.json({ error: 'Already on waitlist for this product' }, { status: 409 })

  // Get next position
  const [[pos]] = await db.query(
    `SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM waitlist_entries WHERE product_id = ? AND status IN ('waiting', 'confirmed', 'payment_pending')`,
    [product_id]
  ) as any[]

  const id = randomUUID()
  await db.query(
    `INSERT INTO waitlist_entries (id, user_email, user_name, product_id, variant_id, qty, position, notes, preferred_date, is_calendar_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, email, name, product_id, variant_id || null, qty || 1, (pos as any).next_pos, notes || null, preferred_date || null, is_calendar_date ? 1 : 0]
  )

  return NextResponse.json({ ok: true, id })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { entry_id } = await req.json()

  await db.query(
    `UPDATE waitlist_entries SET status = 'removed' WHERE id = ? AND user_email = ?`,
    [entry_id, session.user.email]
  )

  // Reorder positions
  await reorderPositions()

  return NextResponse.json({ ok: true })
}

async function reorderPositions() {
  const [entries] = await db.query(
    `SELECT id, product_id FROM waitlist_entries WHERE status IN ('waiting') ORDER BY product_id, created_at ASC`
  ) as any[]

  const byProduct: Record<string, any[]> = {}
  for (const e of entries as any[]) {
    if (!byProduct[e.product_id]) byProduct[e.product_id] = []
    byProduct[e.product_id].push(e)
  }

  for (const product_id in byProduct) {
    let pos = 1
    for (const entry of byProduct[product_id]) {
      await db.query(`UPDATE waitlist_entries SET position = ? WHERE id = ?`, [pos++, entry.id])
    }
  }
}
