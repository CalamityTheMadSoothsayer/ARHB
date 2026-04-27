export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ profile: null })
  const [[profile]] = await db.query(
    `SELECT * FROM user_profiles WHERE email = ?`, [session.user.email]
  ) as any[]
  return NextResponse.json({ profile: profile || null })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { is_colorado_resident } = await req.json()
  await db.query(
    `INSERT INTO user_profiles (email, is_colorado_resident) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE is_colorado_resident = ?`,
    [session.user.email, is_colorado_resident, is_colorado_resident]
  )
  return NextResponse.json({ ok: true })
}
