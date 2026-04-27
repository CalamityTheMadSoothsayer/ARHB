export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ answered: false })
  const [[profile]] = await db.query(
    `SELECT referral_source FROM user_profiles WHERE email = ?`, [session.user.email]
  ) as any[]
  return NextResponse.json({ answered: !!(profile as any)?.referral_source })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { source } = await req.json()
  await db.query(
    `INSERT INTO user_profiles (email, referral_source) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE referral_source = ?`,
    [session.user.email, source, source]
  )
  return NextResponse.json({ ok: true })
}
