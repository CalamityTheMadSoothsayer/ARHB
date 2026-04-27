export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { customer_name, customer_email, pickup_location, payment_method, items, batch_id } = await req.json()

  if (!customer_name || !items?.length || !batch_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const total = items.reduce((sum: number, item: any) => sum + item.unit_price * item.qty, 0)
  const orderId = randomUUID()

  await db.query(
    `INSERT INTO orders (id, user_email, user_name, batch_id, status, pickup_location, square_payment_id, total)
     VALUES (?, ?, ?, ?, 'order_received', ?, ?, ?)`,
    [orderId, customer_email || 'manual@order.local', customer_name, batch_id, pickup_location, `manual-${payment_method}`, total]
  )

  for (const item of items) {
    await db.query(
      `INSERT INTO order_items (id, order_id, product_id, variant_id, variant_label, qty, unit_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), orderId, item.product_id, item.variant_id || null, item.variant_label || null, item.qty, item.unit_price]
    )

    // Deduct from inventory
    await db.query(
      `UPDATE batch_inventory SET sold_qty = sold_qty + ? WHERE batch_id = ? AND product_id = ?`,
      [item.qty, batch_id, item.product_id]
    )
  }

  return NextResponse.json({ ok: true, orderId })
}
