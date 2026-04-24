export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ items: [] })

  await cleanExpired(session.user.email)

  const [rows] = await db.query(
    `SELECT cr.*, bi.batch_id, bi.product_id,
            DATE_FORMAT(bi.bake_date, '%Y-%m-%d') as bake_date,
            bi.total_qty, bi.sold_qty, bi.reserved_qty,
            GREATEST(0, bi.total_qty - bi.sold_qty - bi.reserved_qty) as available_qty,
            p.name, p.description, p.image_url,
            b.pickup_window,
            pv.label as variant_label, pv.price as variant_price
     FROM cart_reservations cr
     JOIN batch_inventory bi ON bi.id = cr.batch_inventory_id
     JOIN products p ON p.id = bi.product_id
     JOIN batches b ON b.id = bi.batch_id
     LEFT JOIN product_variants pv ON pv.id = cr.variant_id
     WHERE cr.user_email = ? AND cr.expires_at > NOW()`,
    [session.user.email]
  ) as any[]

  return NextResponse.json({ items: rows })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { batchInventoryId, qty, variantId } = await req.json()
  const email = session.user.email

  let unitPrice = 0
  if (variantId) {
    const [[variant]] = await db.query(`SELECT price FROM product_variants WHERE id = ?`, [variantId]) as any[]
    unitPrice = (variant as any)?.price || 0
  } else {
    const [[inv]] = await db.query(
      `SELECT p.price FROM batch_inventory bi JOIN products p ON p.id = bi.product_id WHERE bi.id = ?`,
      [batchInventoryId]
    ) as any[]
    unitPrice = (inv as any)?.price || 0
  }

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const [expired] = await conn.query(
      `SELECT batch_inventory_id, qty FROM cart_reservations WHERE user_email = ? AND expires_at <= NOW()`,
      [email]
    ) as any[]
    for (const row of expired as any[]) {
      await conn.query(
        `UPDATE batch_inventory SET reserved_qty = GREATEST(0, reserved_qty - ?) WHERE id = ?`,
        [row.qty, row.batch_inventory_id]
      )
    }
    await conn.query(`DELETE FROM cart_reservations WHERE user_email = ? AND expires_at <= NOW()`, [email])

    const [[invRow]] = await conn.query(
      `SELECT total_qty - sold_qty - reserved_qty as available FROM batch_inventory WHERE id = ? FOR UPDATE`,
      [batchInventoryId]
    ) as any[]

    const [[existing]] = await conn.query(
      `SELECT id, qty FROM cart_reservations WHERE user_email = ? AND batch_inventory_id = ?`,
      [email, batchInventoryId]
    ) as any[]

    const existingQty = existing?.qty || 0
    const netNeeded = qty - existingQty
    const available = (invRow as any)?.available ?? 0

    if (netNeeded > available) {
      await conn.rollback()
      return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    if (existing) {
      await conn.query(
        `UPDATE cart_reservations SET qty = ?, variant_id = ?, unit_price = ?, expires_at = ? WHERE id = ?`,
        [qty, variantId || null, unitPrice, expiresAt, existing.id]
      )
    } else {
      await conn.query(
        `INSERT INTO cart_reservations (id, user_email, batch_inventory_id, variant_id, qty, unit_price, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), email, batchInventoryId, variantId || null, qty, unitPrice, expiresAt]
      )
    }

    await conn.query(
      `UPDATE batch_inventory SET reserved_qty = reserved_qty + ? WHERE id = ?`,
      [netNeeded, batchInventoryId]
    )

    await conn.commit()
    return NextResponse.json({ ok: true })
  } catch (err) {
    await conn.rollback()
    console.error('Cart error:', err)
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 })
  } finally {
    conn.release()
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { batchInventoryId } = await req.json()
  const email = session.user.email

  const [[row]] = await db.query(
    `SELECT qty FROM cart_reservations WHERE user_email = ? AND batch_inventory_id = ?`,
    [email, batchInventoryId]
  ) as any[]

  if (row) {
    await db.query(
      `UPDATE batch_inventory SET reserved_qty = GREATEST(0, reserved_qty - ?) WHERE id = ?`,
      [(row as any).qty, batchInventoryId]
    )
    await db.query(
      `DELETE FROM cart_reservations WHERE user_email = ? AND batch_inventory_id = ?`,
      [email, batchInventoryId]
    )
  }

  return NextResponse.json({ ok: true })
}

async function cleanExpired(email: string) {
  const [expired] = await db.query(
    `SELECT batch_inventory_id, qty FROM cart_reservations WHERE user_email = ? AND expires_at <= NOW()`,
    [email]
  ) as any[]
  for (const row of expired as any[]) {
    await db.query(
      `UPDATE batch_inventory SET reserved_qty = GREATEST(0, reserved_qty - ?) WHERE id = ?`,
      [row.qty, row.batch_inventory_id]
    )
  }
  await db.query(`DELETE FROM cart_reservations WHERE user_email = ? AND expires_at <= NOW()`, [email])
}
