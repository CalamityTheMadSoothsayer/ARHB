export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { randomUUID } from 'crypto'

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { pickup_window, notes, inventory } = await req.json()
  const batchId = params.id

  await db.query(
    `UPDATE batches SET pickup_window = ?, notes = ? WHERE id = ?`,
    [pickup_window, notes || null, batchId]
  )

  for (const item of inventory || []) {
    const [[existing]] = await db.query(
      `SELECT id, sold_qty, reserved_qty FROM batch_inventory WHERE batch_id = ? AND product_id = ?`,
      [batchId, item.product_id]
    ) as any[]

    const minQty = ((existing as any)?.sold_qty || 0) + ((existing as any)?.reserved_qty || 0)
    const safeQty = Math.max(item.qty, minQty)

    if (existing) {
      await db.query(
        `UPDATE batch_inventory SET total_qty = ?, bake_date = ? WHERE batch_id = ? AND product_id = ?`,
        [safeQty, item.bake_date, batchId, item.product_id]
      )
    } else if (item.qty > 0 && item.bake_date) {
      await db.query(
        `INSERT INTO batch_inventory (id, batch_id, product_id, bake_date, total_qty) VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), batchId, item.product_id, item.bake_date, item.qty]
      )
    }
  }

  return NextResponse.json({ ok: true })
}
