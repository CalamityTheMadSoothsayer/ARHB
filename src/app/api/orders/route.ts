export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { createSquareCheckout } from '@/lib/square'
import { sendNewOrderNotification } from '@/lib/email'
import { PICKUP_LOCATIONS } from '@/types'
import type { PickupLocation } from '@/types'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { pickupLocation } = await req.json() as { pickupLocation: PickupLocation }
  const email = session.user.email
  const name = session.user.name || email

  const [cartItems] = await db.query(
    `SELECT cr.*, bi.batch_id, bi.product_id,
            DATE_FORMAT(bi.bake_date, '%Y-%m-%d') as bake_date,
            p.name as product_name,
            b.pickup_window, b.status as batch_status,
            pv.label as variant_label
     FROM cart_reservations cr
     JOIN batch_inventory bi ON bi.id = cr.batch_inventory_id
     JOIN products p ON p.id = bi.product_id
     JOIN batches b ON b.id = bi.batch_id
     LEFT JOIN product_variants pv ON pv.id = cr.variant_id
     WHERE cr.user_email = ? AND cr.expires_at > NOW()`,
    [email]
  ) as any[]

  if (!(cartItems as any[]).length) {
    return NextResponse.json({ error: 'Cart is empty or expired' }, { status: 400 })
  }

  const items = cartItems as any[]
  const batchId = items[0].batch_id

  if (items[0].batch_status !== 'open') {
    return NextResponse.json({ error: 'This batch is no longer open' }, { status: 400 })
  }

  const total = items.reduce((sum: number, item: any) => sum + item.unit_price * item.qty, 0)
  const orderId = randomUUID()
  const pickupLabel = PICKUP_LOCATIONS[pickupLocation].label
  const pickupWindow = items[0].pickup_window

  await db.query(
    `INSERT INTO orders (id, user_email, user_name, batch_id, status, pickup_location, total) VALUES (?, ?, ?, ?, 'order_received', ?, ?)`,
    [orderId, email, name, batchId, pickupLocation, total]
  )

  for (const item of items) {
    await db.query(
      `INSERT INTO order_items (id, order_id, product_id, variant_id, variant_label, qty, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), orderId, item.product_id, item.variant_id || null, item.variant_label || null, item.qty, item.unit_price]
    )
  }

  try {
    const cartForSquare = items.map((item: any) => ({
      batch_inventory: {
        product: {
          name: item.variant_label ? `${item.product_name} — ${item.variant_label}` : item.product_name,
          price: item.unit_price,
        }
      },
      qty: item.qty,
    }))

    const { paymentLinkUrl, squareOrderId } = await createSquareCheckout({
      cartItems: cartForSquare as any,
      customerEmail: email,
      customerName: name,
      orderId,
      pickupLabel,
      pickupWindow,
    })

    await db.query(`UPDATE orders SET square_order_id = ? WHERE id = ?`, [squareOrderId, orderId])
    sendNewOrderNotification({ id: orderId, user_name: name, user_email: email, pickup_location: pickupLocation, total }, items).catch(console.error)
    return NextResponse.json({ paymentUrl: paymentLinkUrl })
  } catch (err) {
    console.error('Square checkout error:', err)
    await db.query(`DELETE FROM orders WHERE id = ?`, [orderId])
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
  }
}
