export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { randomUUID } from 'crypto'
import { createSquareCheckout } from '@/lib/square'
import { sendWaitlistConfirmedEmail } from '@/lib/email'
import { PICKUP_LOCATIONS } from '@/types'

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const [entries] = await db.query(
    `SELECT we.*, p.name as product_name, pv.label as variant_label,
            wc.id as confirmation_id, wc.bake_date, wc.pickup_window,
            wc.expires_at, wc.paid_at, wc.square_payment_url,
            DATE_FORMAT(we.preferred_date, '%Y-%m-%d') as preferred_date, we.is_calendar_date
     FROM waitlist_entries we
     JOIN products p ON p.id = we.product_id
     LEFT JOIN product_variants pv ON pv.id = we.variant_id
     LEFT JOIN waitlist_confirmations wc ON wc.entry_id = we.id
     WHERE we.status NOT IN ('removed', 'declined', 'expired')
     ORDER BY we.product_id, we.position ASC`
  ) as any[]

  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { entry_id, bake_date, pickup_window } = await req.json()

  const [[entry]] = await db.query(
    `SELECT we.*, p.name as product_name, pv.price as variant_price, p.price as base_price
     FROM waitlist_entries we
     JOIN products p ON p.id = we.product_id
     LEFT JOIN product_variants pv ON pv.id = we.variant_id
     WHERE we.id = ?`,
    [entry_id]
  ) as any[]

  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const unitPrice = (entry as any).variant_price || (entry as any).base_price
  const total = unitPrice * (entry as any).qty
  const orderId = randomUUID()
  // Expires 24 hours before bake date
  const bakeDateObj = new Date(bake_date + 'T12:00:00')
  const expiresAt = new Date(bakeDateObj.getTime() - 24 * 60 * 60 * 1000)

  // Create Square payment link
  const { paymentLinkUrl, squareOrderId } = await createSquareCheckout({
    cartItems: [{
      batch_inventory: {
        product: {
          name: `${(entry as any).product_name}${(entry as any).variant_label ? ' — ' + (entry as any).variant_label : ''}`,
          price: unitPrice,
        }
      },
      qty: (entry as any).qty,
    }] as any,
    customerEmail: (entry as any).user_email,
    customerName: (entry as any).user_name,
    orderId,
    pickupLabel: 'TBD',
    pickupWindow: pickup_window,
  })

  await db.query(
    `INSERT INTO waitlist_confirmations (id, entry_id, bake_date, pickup_window, expires_at, square_payment_url, square_order_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), entry_id, bake_date, pickup_window, expiresAt, paymentLinkUrl, squareOrderId]
  )

  await db.query(
    `UPDATE waitlist_entries SET status = 'payment_pending' WHERE id = ?`,
    [entry_id]
  )

  // Send email to customer
  await sendWaitlistConfirmedEmail(entry, bake_date, pickup_window, paymentLinkUrl || '', expiresAt).catch(console.error)

  return NextResponse.json({ ok: true, paymentUrl: paymentLinkUrl })
}
