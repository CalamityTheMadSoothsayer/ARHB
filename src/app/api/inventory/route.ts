export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const [batches] = await db.query(
    `SELECT * FROM batches WHERE status = 'open' ORDER BY pickup_date ASC LIMIT 1`
  ) as any[]

  const batch = (batches as any[])[0]
  if (!batch) return NextResponse.json({ batch: null, inventory: [] })

  const [inventory] = await db.query(
    `SELECT bi.*, p.name, p.description, p.price, p.image_url,
            GREATEST(0, bi.total_qty - bi.sold_qty - bi.reserved_qty) as available_qty
     FROM batch_inventory bi
     JOIN products p ON p.id = bi.product_id
     WHERE bi.batch_id = ?`,
    [batch.id]
  ) as any[]

  return NextResponse.json({ batch, inventory })
}
