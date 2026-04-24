import { Resend } from 'resend'
import type { Order, OrderStatus, PickupLocation } from '@/types'
import { ORDER_STATUS_LABELS, PICKUP_LOCATIONS } from '@/types'
import { format, addDays } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY!)
const from = process.env.RESEND_FROM_EMAIL!
const appUrl = process.env.NEXT_PUBLIC_APP_URL!

function contactFooter() {
  return `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#888;font-size:13px">
      <p style="margin:0">Questions? Call or text: <a href="tel:9703709895" style="color:#888">970-370-9895</a></p>
      <p style="margin:4px 0 0"><a href="https://www.facebook.com/profile.php?id=61560442705913" style="color:#888">Facebook</a></p>
    </div>
  `
}

export async function sendOrderConfirmationEmail(order: any) {
  const location = PICKUP_LOCATIONS[order.pickup_location as PickupLocation]
  const total = (order.total / 100).toFixed(2)
  const batchDate = order.pickup_date || order.batch?.pickup_date
  const expiryDate = batchDate ? format(addDays(new Date(batchDate), 3), 'MMMM d, yyyy') : null

  await resend.emails.send({
    from,
    to: order.customer_email || order.user_email,
    subject: `Order confirmed — Aaron Rockwell's Homemade Breads`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Your order is confirmed! 🍞</h2>
        <p>Hey ${order.customer_name || order.user_name}, thanks for your order. We'll keep you updated as your bread is made.</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:0 0 8px"><strong>Pickup:</strong> ${order.batch?.pickup_window || order.pickup_window}</p>
          <p style="margin:0 0 8px"><strong>Location:</strong> ${location?.address}</p>
          <p style="margin:0 0 8px"><strong>Total paid:</strong> $${total}</p>
          ${expiryDate ? `<p style="margin:0;color:#c0392b"><strong>Best by:</strong> ${expiryDate}</p>` : ''}
        </div>
        <a href="${appUrl}/my-orders" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Track my order →</a>
        ${contactFooter()}
      </div>
    `,
  })
}

export async function sendStatusUpdateEmail(order: any, newStatus: OrderStatus) {
  const label = ORDER_STATUS_LABELS[newStatus]
  const location = PICKUP_LOCATIONS[order.pickup_location as PickupLocation]
  const isReady = newStatus === 'ready_for_pickup'
  const isCompleted = newStatus === 'completed'
  const batchDate = order.pickup_date || order.batch?.pickup_date
  const expiryDate = batchDate ? format(addDays(new Date(batchDate), 3), 'MMMM d, yyyy') : null

  await resend.emails.send({
    from,
    to: order.customer_email || order.user_email,
    subject: isReady ? `Your bread is ready for pickup! 🎉` : isCompleted ? `Thanks for your order! — Aaron Rockwell's Breads` : `Update: your bread is now ${label.toLowerCase()}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">${isReady ? '🎉 Ready for pickup!' : isCompleted ? '🍞 Thanks for your order!' : `🍞 ${label}`}</h2>
        ${isReady ? `
          <p>Your order is ready! Come pick it up at:</p>
          <div style="background:#f0faf4;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0 0 4px"><strong>${location?.address}</strong></p>
            <p style="margin:0;color:#666">${order.batch?.pickup_window || order.pickup_window}</p>
            ${expiryDate ? `<p style="margin:8px 0 0;color:#c0392b;font-size:13px">Best by: ${expiryDate}</p>` : ''}
          </div>
        ` : isCompleted ? `
          <p>Your order is complete — we hope you enjoyed every bite! 🙏</p>
          <p>Visit <a href="${appUrl}/menu" style="color:#1a1a1a">rockwellbakery.com</a> when new stock is available to order again.</p>
        ` : `
          <p>Your bread is currently in the <strong>${label}</strong> stage. We'll let you know when it's ready.</p>
          <a href="${appUrl}/my-orders" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;margin-top:8px">Track my order →</a>
        `}
        ${contactFooter()}
      </div>
    `,
  })
}

export async function sendWaitlistNotification(emails: string[]) {
  if (emails.length === 0) return
  await Promise.all(
    emails.map((email) =>
      resend.emails.send({
        from,
        to: email,
        subject: `New stock available — Aaron Rockwell's Homemade Breads 🍞`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2>Good news — new stock just dropped! 🍞</h2>
            <p>A new batch is now open. First come, first served!</p>
            <a href="${appUrl}/menu" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Order now →</a>
            ${contactFooter()}
          </div>
        `,
      })
    )
  )
}

export async function sendNewOrderNotification(order: any, items: any[]) {
  await resend.emails.send({
    from,
    to: process.env.ADMIN_EMAIL!,
    subject: `New order from ${order.user_name} — $${(order.total / 100).toFixed(2)}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2>New order received! 🍞</h2>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Customer:</strong> ${order.user_name} (${order.user_email})</p>
          <p style="margin:0 0 8px"><strong>Pickup:</strong> ${order.pickup_location === 'edison_919' ? '919 Edison St' : '901 Edison St'}</p>
          <p style="margin:0 0 8px"><strong>Items:</strong></p>
          ${items.map((i: any) => `<p style="margin:0 0 4px">• ${i.qty}× ${i.product_name}${i.variant_label ? ` — ${i.variant_label}` : ''}</p>`).join('')}
          <p style="margin:8px 0 0"><strong>Total:</strong> $${(order.total / 100).toFixed(2)}</p>
        </div>
        <a href="${appUrl}/admin" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">View in admin →</a>
      </div>
    `,
  })
}
