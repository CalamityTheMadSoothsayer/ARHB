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
    `SELECT bi.id, bi.batch_id, p.id as product_id,
            DATE_FORMAT(bi.bake_date, '%Y-%m-%d') as bake_date,
            COALESCE(bi.total_qty, 0) as total_qty,
            COALESCE(bi.sold_qty, 0) as sold_qty,
            COALESCE(bi.reserved_qty, 0) as reserved_qty,
            p.name, p.description, p.price, p.image_url,
            GREATEST(0, COALESCE(bi.total_qty, 0) - COALESCE(bi.sold_qty, 0) - COALESCE(bi.reserved_qty, 0)) as available_qty
     FROM products p
     LEFT JOIN batch_inventory bi ON bi.product_id = p.id AND bi.batch_id = ?
     WHERE p.active = 1
     ORDER BY available_qty DESC`,
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
