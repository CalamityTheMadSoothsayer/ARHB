import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { sendStatusUpdateEmail } from '@/lib/email'
import type { OrderStatus } from '@/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { orderId, status } = await req.json() as { orderId: string; status: OrderStatus }

  await db.query(`UPDATE orders SET status = ? WHERE id = ?`, [status, orderId])

  const [[order]] = await db.query(
    `SELECT o.*, b.pickup_window FROM orders o JOIN batches b ON b.id = o.batch_id WHERE o.id = ?`,
    [orderId]
  ) as any[]

  try {
    await sendStatusUpdateEmail(order as any, status)
  } catch (err) {
    console.error('Status email failed:', err)
  }

  return NextResponse.json({ ok: true })
}
