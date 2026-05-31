export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.email === process.env.ADMIN_EMAIL ? session : null
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { label, price } = await req.json()
  await db.query(`UPDATE product_variants SET label = ?, price = ? WHERE id = ?`, [label, price || 0, params.id])
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  await db.query(`DELETE FROM product_variants WHERE id = ?`, [params.id])
  return NextResponse.json({ ok: true })
}
