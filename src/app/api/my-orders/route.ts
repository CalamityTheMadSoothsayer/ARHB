export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ orders: [] })

  const [orders] = await db.query(
    `SELECT o.*, b.pickup_window FROM orders o
     JOIN batches b ON b.id = o.batch_id
     WHERE o.user_email = ?
     ORDER BY o.created_at DESC`,
    [session.user.email]
  ) as any[]

  const [items] = await db.query(
    `SELECT oi.*, p.name as product_name FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id IN (
       SELECT id FROM orders WHERE user_email = ?
     )`,
    [session.user.email]
  ) as any[]

  const ordersWithItems = (orders as any[]).map(order => ({
    ...order,
    items: (items as any[]).filter(i => i.order_id === order.id),
  }))

  return NextResponse.json({ orders: ordersWithItems })
}
