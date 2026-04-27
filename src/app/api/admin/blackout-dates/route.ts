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
    `SELECT id, DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, reason
     FROM blackout_dates WHERE end_date >= CURDATE() ORDER BY start_date ASC`
  ) as any[]
  return NextResponse.json({ blackouts: rows })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { start_date, end_date, reason } = await req.json()
  if (!start_date || !end_date) return NextResponse.json({ error: 'Missing dates' }, { status: 400 })
  if (end_date < start_date) return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })

  await db.query(
    `INSERT INTO blackout_dates (id, start_date, end_date, reason) VALUES (?, ?, ?, ?)`,
    [randomUUID(), start_date, end_date, reason || null]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await req.json()
  await db.query(`DELETE FROM blackout_dates WHERE id = ?`, [id])
  return NextResponse.json({ ok: true })
}
