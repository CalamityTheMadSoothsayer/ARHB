import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { sendWaitlistNotification } from '@/lib/email'
import { randomUUID } from 'crypto'

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL
}

// GET — list recent batches
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const [batches] = await db.query(
    `SELECT b.*, 
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'id', bi.id, 'product_id', bi.product_id, 'product_name', p.name,
        'total_qty', bi.total_qty, 'sold_qty', bi.sold_qty, 'reserved_qty', bi.reserved_qty
      )) FROM batch_inventory bi JOIN products p ON p.id = bi.product_id WHERE bi.batch_id = b.id) as inventory
     FROM batches b ORDER BY b.pickup_date DESC LIMIT 20`
  ) as any[]

  const [products] = await db.query(`SELECT * FROM products WHERE active = 1`) as any[]

  return NextResponse.json({ batches, products })
}

// POST — create a new batch
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { pickup_date, pickup_window, notes, inventory } = await req.json()

  if (!pickup_date || !pickup_window) {
    return NextResponse.json({ error: 'Date and window required' }, { status: 400 })
  }

  const batchId = randomUUID()
  await db.query(
    `INSERT INTO batches (id, pickup_date, pickup_window, notes, status) VALUES (?, ?, ?, ?, 'draft')`,
    [batchId, pickup_date, pickup_window, notes || null]
  )

  for (const [productId, qty] of Object.entries(inventory || {})) {
    if ((qty as number) > 0) {
      await db.query(
        `INSERT INTO batch_inventory (id, batch_id, product_id, total_qty) VALUES (?, ?, ?, ?)`,
        [randomUUID(), batchId, productId, qty]
      )
    }
  }

  return NextResponse.json({ ok: true, batchId })
}

// PATCH — open or close a batch
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { batchId, action } = await req.json()

  if (action === 'open') {
    await db.query(`UPDATE batches SET status = 'open' WHERE id = ?`, [batchId])

    // Notify waitlist
    const [waitlist] = await db.query(`SELECT DISTINCT email FROM waitlist`) as any[]
    const emails = (waitlist as any[]).map(w => w.email)
    if (emails.length > 0) {
      await sendWaitlistNotification(emails)
      await db.query(`DELETE FROM waitlist`)
    }
  } else if (action === 'close') {
    await db.query(`UPDATE batches SET status = 'closed' WHERE id = ?`, [batchId])
  }

  return NextResponse.json({ ok: true })
}
