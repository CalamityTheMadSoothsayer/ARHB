export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { randomUUID } from 'crypto'

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL
}

export async function GET() {
  const [rows] = await db.query(
    `SELECT bc.id, DATE_FORMAT(bc.bake_date, '%Y-%m-%d') as bake_date, bc.product_id, bc.max_orders, bc.cutoff_hours, bc.is_unavailable, p.name as product_name FROM bake_calendar bc
     JOIN products p ON p.id = bc.product_id
     WHERE bc.bake_date >= CURDATE()
     ORDER BY bc.bake_date ASC, p.name ASC`
  ) as any[]
  return NextResponse.json({ calendar: rows })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { bake_date, product_id, max_orders, cutoff_hours, is_unavailable } = await req.json()

  await db.query(
    `INSERT INTO bake_calendar (id, bake_date, product_id, max_orders, cutoff_hours, is_unavailable)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE max_orders = ?, cutoff_hours = ?, is_unavailable = ?`,
    [randomUUID(), bake_date, product_id, max_orders || 10, cutoff_hours || 48, is_unavailable ? 1 : 0,
     max_orders || 10, cutoff_hours || 48, is_unavailable ? 1 : 0]
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { bake_date, product_id } = await req.json()
  await db.query(`DELETE FROM bake_calendar WHERE bake_date = ? AND product_id = ?`, [bake_date, product_id])
  return NextResponse.json({ ok: true })
}
