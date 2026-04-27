export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const [orders] = await db.query(
    `SELECT o.id, o.user_name, o.status, o.created_at,
            GROUP_CONCAT(CONCAT(oi.qty, 'x ', p.name, IF(oi.variant_label IS NOT NULL, CONCAT(' (', oi.variant_label, ')'), '')) SEPARATOR ', ') as summary
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN products p ON p.id = oi.product_id
     WHERE o.status != 'cancelled'
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT 5`
  ) as any[]

  const censored = (orders as any[]).map(order => {
    const parts = order.user_name.trim().split(' ')
    const censored_name = parts.map((part: string) => part[0] + '*'.repeat(Math.max(part.length - 1, 1))).join(' ')
    return { ...order, user_name: censored_name }
  })

  return NextResponse.json({ orders: censored })
}
