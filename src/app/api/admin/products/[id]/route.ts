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
  const { name, description, price, active } = await req.json()
  await db.query(
    `UPDATE products SET name = ?, description = ?, price = ?, active = ? WHERE id = ?`,
    [name, description || '', price || 0, active ? 1 : 0, params.id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  await db.query(`UPDATE products SET active = 0 WHERE id = ?`, [params.id])
  return NextResponse.json({ ok: true })
}
