import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { refundSquarePayment } from '@/lib/square'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { orderId } = await req.json()

  const [[order]] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]) as any[]
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if ((order as any).square_payment_id) {
    try {
      await refundSquarePayment({
        paymentId: (order as any).square_payment_id,
        amountCents: (order as any).total,
        reason: 'Order cancelled by bakery',
      })
    } catch (err) {
      return NextResponse.json({ error: 'Square refund failed — cancel manually in Square dashboard' }, { status: 500 })
    }
  }

  // Return sold stock
  const [items] = await db.query(`SELECT * FROM order_items WHERE order_id = ?`, [orderId]) as any[]
  for (const item of items as any[]) {
    await db.query(
      `UPDATE batch_inventory SET sold_qty = GREATEST(0, sold_qty - ?) WHERE batch_id = ? AND product_id = ?`,
      [item.qty, (order as any).batch_id, item.product_id]
    )
  }

  await db.query(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [orderId])

  return NextResponse.json({ ok: true })
}
