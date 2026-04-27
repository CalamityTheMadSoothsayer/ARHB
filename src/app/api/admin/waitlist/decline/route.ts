export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { entry_id } = await req.json()

  const [[entry]] = await db.query(
    `SELECT we.*, p.name as product_name FROM waitlist_entries we
     JOIN products p ON p.id = we.product_id WHERE we.id = ?`,
    [entry_id]
  ) as any[]

  await db.query(`UPDATE waitlist_entries SET status = 'declined' WHERE id = ?`, [entry_id])

  // Send decline email
  const { Resend } = require('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: (entry as any).user_email,
    subject: `Update on your waitlist request — Aaron Rockwell's Breads`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2>Waitlist update</h2>
        <p>Hi ${(entry as any).user_name},</p>
        <p>Unfortunately, we're unable to fulfill your waitlist request for <strong>${(entry as any).product_name}</strong> at this time.</p>
        <p>If you'd like to know more or would like to be considered again in the future, please don't hesitate to reach out directly.</p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;color:#888;font-size:13px">
          <p style="margin:0">Call or text: <a href="tel:9703709895" style="color:#888">970-370-9895</a></p>
          <p style="margin:4px 0 0"><a href="https://www.facebook.com/profile.php?id=61560442705913" style="color:#888">Facebook</a></p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
