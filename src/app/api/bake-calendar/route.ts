export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const [calendar] = await db.query(
    `SELECT DATE_FORMAT(bc.bake_date, '%Y-%m-%d') as bake_date, bc.product_id, bc.max_orders, bc.cutoff_hours, bc.is_unavailable,
            p.name as product_name,
            COUNT(we.id) as current_orders
     FROM bake_calendar bc
     JOIN products p ON p.id = bc.product_id
     LEFT JOIN waitlist_entries we ON we.product_id = bc.product_id
       AND we.status IN ('waiting','confirmed','payment_pending','paid')
     WHERE bc.bake_date >= CURDATE()
       AND bc.bake_date <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
     GROUP BY bc.bake_date, bc.product_id
     ORDER BY bc.bake_date ASC`
  ) as any[]

  return NextResponse.json({ calendar })
}
