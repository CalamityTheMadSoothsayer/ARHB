export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const [variants] = await db.query(
    `SELECT pv.*, p.name as product_name FROM product_variants pv JOIN products p ON p.id = pv.product_id ORDER BY pv.display_order ASC`
  ) as any[]
  return NextResponse.json({ variants })
}
