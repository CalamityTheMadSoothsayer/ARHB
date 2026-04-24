export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET() {
  const [batches] = await db.query(
    `SELECT * FROM batches WHERE status = 'open' ORDER BY created_at DESC LIMIT 1`
  ) as any[]

  const batch = (batches as any[])[0]
  if (!batch) return NextResponse.json({ batch: null, inventory: [] })

  const [inventory] = await db.query(
    `SELECT bi.*,
            DATE_FORMAT(bi.bake_date, '%Y-%m-%d') as bake_date,
            p.name, p.description, p.price, p.image_url,
            GREATEST(0, bi.total_qty - bi.sold_qty - bi.reserved_qty) as available_qty
     FROM batch_inventory bi
     JOIN products p ON p.id = bi.product_id
     WHERE bi.batch_id = ?`,
    [batch.id]
  ) as any[]

  const [variants] = await db.query(
    `SELECT * FROM product_variants ORDER BY display_order ASC`
  ) as any[]

  const inventoryWithVariants = (inventory as any[]).map(item => ({
    ...item,
    variants: (variants as any[]).filter(v => v.product_id === item.product_id),
  }))

  return NextResponse.json({ batch, inventory: inventoryWithVariants })
}
