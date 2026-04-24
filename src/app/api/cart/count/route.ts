export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ count: 0 })

  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(qty), 0) as count FROM cart_reservations WHERE user_email = ? AND expires_at > NOW()`,
    [session.user.email]
  ) as any[]

  return NextResponse.json({ count: Number((row as any)?.count || 0) })
}
