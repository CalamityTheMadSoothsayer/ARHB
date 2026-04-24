export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { verifySquareWebhook } from '@/lib/square'
import { sendOrderConfirmationEmail } from '@/lib/email'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-square-hmacsha256-signature') || ''
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square`

  if (!verifySquareWebhook(body, signature, url)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  if (event.type !== 'payment.completed') return NextResponse.json({ received: true })

  const payment = event.data?.object?.payment
  if (!payment) return NextResponse.json({ received: true })

  const [[order]] = await db.query(
    `SELECT o.*, b.pickup_window FROM orders o JOIN batches b ON b.id = o.batch_id WHERE o.square_order_id = ?`,
    [payment.order_id]
  ) as any[]

  if (!order) return NextResponse.json({ received: true })

  // Save payment ID
  await db.query(`UPDATE orders SET square_payment_id = ? WHERE id = ?`, [payment.id, (order as any).id])

  // Move reserved → sold for each cart item, then clear cart
  const [cartItems] = await db.query(
    `SELECT * FROM cart_reservations WHERE user_email = ?`,
    [(order as any).user_email]
  ) as any[]

  for (const item of cartItems as any[]) {
    await db.query(
      `UPDATE batch_inventory SET sold_qty = sold_qty + ?, reserved_qty = GREATEST(0, reserved_qty - ?) WHERE id = ?`,
      [item.qty, item.qty, item.batch_inventory_id]
    )
  }

  await db.query(`DELETE FROM cart_reservations WHERE user_email = ?`, [(order as any).user_email])

  try {
    await sendOrderConfirmationEmail(order as any)
  } catch (err) {
    console.error('Confirmation email failed:', err)
  }

  return NextResponse.json({ received: true })
}
