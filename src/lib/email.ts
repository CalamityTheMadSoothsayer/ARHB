import { Resend } from 'resend'
import type { Order, OrderStatus, PickupLocation } from '@/types'
import { ORDER_STATUS_LABELS, PICKUP_LOCATIONS } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY!)
const from = process.env.RESEND_FROM_EMAIL!
const appUrl = process.env.NEXT_PUBLIC_APP_URL!

export async function sendOrderConfirmationEmail(order: Order) {
  const location = PICKUP_LOCATIONS[order.pickup_location]
  const total = (order.total / 100).toFixed(2)

  await resend.emails.send({
    from,
    to: order.customer_email,
    subject: `Order confirmed — Aaron Rockwell's Homemade Breads`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Your order is confirmed! 🍞</h2>
        <p>Hey ${order.customer_name}, thanks for your order. We'll keep you updated as your bread is made.</p>

        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:0 0 8px"><strong>Pickup:</strong> ${order.batch?.pickup_window}</p>
          <p style="margin:0 0 8px"><strong>Location:</strong> ${location.address}</p>
          <p style="margin:0"><strong>Total paid:</strong> $${total}</p>
        </div>

        <p>You can track your bread's progress any time at:</p>
        <a href="${appUrl}/my-orders" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Track my order →</a>

        <p style="margin-top:24px;color:#666;font-size:13px">
          Questions? Call or text: <a href="tel:9703709895" style="color:#666">970-370-9895</a>
        </p>
      </div>
    `,
  })
}

export async function sendStatusUpdateEmail(order: Order, newStatus: OrderStatus) {
  const label = ORDER_STATUS_LABELS[newStatus]
  const location = PICKUP_LOCATIONS[order.pickup_location]

  const isReady = newStatus === 'ready_for_pickup'

  await resend.emails.send({
    from,
    to: order.customer_email,
    subject: isReady
      ? `Your bread is ready for pickup! 🎉`
      : `Update: your bread is now ${label.toLowerCase()}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">${isReady ? '🎉 Ready for pickup!' : `🍞 ${label}`}</h2>

        ${isReady
          ? `<p>Your order is ready! Come pick it up at:</p>
             <div style="background:#f0faf4;border-radius:8px;padding:16px;margin:16px 0">
               <p style="margin:0 0 4px"><strong>${location.address}</strong></p>
               <p style="margin:0;color:#666">${order.batch?.pickup_window}</p>
             </div>`
          : `<p>Your bread is currently in the <strong>${label}</strong> stage. We'll let you know when it's ready.</p>`
        }

        <a href="${appUrl}/my-orders" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Track my order →</a>

        <p style="margin-top:24px;color:#666;font-size:13px">
          Questions? <a href="tel:9703709895" style="color:#666">970-370-9895</a>
        </p>
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
            <p>You signed up to be notified when bread is available. A new batch is now open for orders. First come, first served!</p>
            <a href="${appUrl}/menu" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Order now →</a>
            <p style="margin-top:24px;color:#666;font-size:13px">
              To unsubscribe from these notifications, visit <a href="${appUrl}/my-orders" style="color:#666">your account</a>.
            </p>
          </div>
        `,
      })
    )
  )
}
