import db from './src/lib/db'
import { sendWaitlistExpiringEmail, sendWaitlistPositionEmail } from './src/lib/email'

async function run() {
  // 1. Expire unpaid confirmations
  const [expiring] = await db.query(
    `SELECT we.*, wc.square_payment_url, p.name as product_name
     FROM waitlist_confirmations wc
     JOIN waitlist_entries we ON we.id = wc.entry_id
     JOIN products p ON p.id = we.product_id
     WHERE wc.expires_at <= NOW() AND wc.paid_at IS NULL AND we.status = 'payment_pending'`
  ) as any[]

  for (const entry of expiring as any[]) {
    await db.query(`UPDATE waitlist_entries SET status = 'expired' WHERE id = ?`, [entry.id])
    console.log(`Expired entry ${entry.id}`)
  }

  // 2. Send 6-hour expiry warning
  const [expiringSoon] = await db.query(
    `SELECT we.*, wc.square_payment_url, wc.expires_at, p.name as product_name
     FROM waitlist_confirmations wc
     JOIN waitlist_entries we ON we.id = wc.entry_id
     JOIN products p ON p.id = we.product_id
     WHERE wc.expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 HOUR)
       AND wc.paid_at IS NULL
       AND we.status = 'payment_pending'
       AND NOT EXISTS (
         SELECT 1 FROM waitlist_notifications wn
         WHERE wn.entry_id = we.id AND wn.type = 'expiring_6h'
           AND wn.sent_at > DATE_SUB(NOW(), INTERVAL 7 HOUR)
       )`
  ) as any[]

  for (const entry of expiringSoon as any[]) {
    await sendWaitlistExpiringEmail(entry, 6)
    await db.query(
      `INSERT INTO waitlist_notifications (id, entry_id, type) VALUES (UUID(), ?, 'expiring_6h')`,
      [entry.id]
    )
  }

  // 3. Position change notifications
  const [waiting] = await db.query(
    `SELECT we.*, p.name as product_name FROM waitlist_entries we
     JOIN products p ON p.id = we.product_id
     WHERE we.status = 'waiting'`
  ) as any[]

  for (const entry of waiting as any[]) {
    const threshold = 15
    const interval = (entry as any).position > threshold ? 'daily' : 'hourly'
    const intervalHours = interval === 'daily' ? 24 : 1

    const [[lastNotif]] = await db.query(
      `SELECT sent_at FROM waitlist_notifications
       WHERE entry_id = ? AND type = 'position_change'
       ORDER BY sent_at DESC LIMIT 1`,
      [entry.id]
    ) as any[]

    const lastSent = lastNotif ? new Date((lastNotif as any).sent_at) : null
    const hoursSinceLast = lastSent ? (Date.now() - lastSent.getTime()) / 3600000 : 999

    if (hoursSinceLast >= intervalHours) {
      await sendWaitlistPositionEmail(entry)
      await db.query(
        `INSERT INTO waitlist_notifications (id, entry_id, type) VALUES (UUID(), ?, 'position_change')`,
        [entry.id]
      )
    }
  }

  console.log('Cron done')
  process.exit(0)
}

run().catch(console.error)
