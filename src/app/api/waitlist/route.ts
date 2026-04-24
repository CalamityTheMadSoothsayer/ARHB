export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  await db.query(
    `INSERT IGNORE INTO waitlist (id, email, product_id) VALUES (?, ?, NULL)`,
    [randomUUID(), email]
  )

  return NextResponse.json({ ok: true })
}
