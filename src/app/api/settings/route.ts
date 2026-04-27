export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const [rows] = await db.query(`SELECT key_name, value FROM settings`) as any[]
  const settings: Record<string, string> = {}
  for (const row of rows as any[]) settings[(row as any).key_name] = (row as any).value
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { key_name, value } = await req.json()
  await db.query(
    `INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?`,
    [key_name, value, value]
  )
  return NextResponse.json({ ok: true })
}
