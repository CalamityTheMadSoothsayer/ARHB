import { Client, Environment } from 'square'
import type { Order, CartReservation } from '@/types'

export const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: Environment.Sandbox,
})

const locationId = process.env.SQUARE_LOCATION_ID!

export async function createSquareCheckout({
  cartItems,
  customerEmail,
  customerName,
  orderId,
  pickupLabel,
  pickupWindow,
}: {
  cartItems: CartReservation[]
  customerEmail: string
  customerName: string
  orderId: string
  pickupLabel: string
  pickupWindow: string
}) {
  const lineItems = cartItems.map((item) => ({
    name: item.batch_inventory!.product.name,
    quantity: String(item.qty),
    basePriceMoney: {
      amount: BigInt(item.batch_inventory!.product.price),
      currency: 'USD',
    },
  }))

  const { result } = await squareClient.checkoutApi.createPaymentLink({
    idempotencyKey: orderId,
    order: {
      locationId,
      referenceId: orderId,
      lineItems,
      metadata: {
        orderId,
        customerEmail,
        customerName,
        pickupLocation: pickupLabel,
        pickupWindow,
      },
    },
    checkoutOptions: {
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my-orders?order=${orderId}&paid=true`,
      askForShippingAddress: false,
      acceptedPaymentMethods: {
        applePay: true,
        googlePay: true,
        cashAppPay: true,
      },
    },
    prePopulatedData: {
      buyerEmail: customerEmail,
    },
  })

  return {
    paymentLinkUrl: result.paymentLink?.url,
    squareOrderId: result.paymentLink?.orderId,
  }
}

export async function getSquarePayment(paymentId: string) {
  const { result } = await squareClient.paymentsApi.getPayment(paymentId)
  return result.payment
}

export async function refundSquarePayment({
  paymentId,
  amountCents,
  reason,
}: {
  paymentId: string
  amountCents: number
  reason: string
}) {
  const { result } = await squareClient.refundsApi.refundPayment({
    idempotencyKey: `refund_${paymentId}_${Date.now()}`,
    paymentId,
    amountMoney: {
      amount: BigInt(amountCents),
      currency: 'USD',
    },
    reason,
  })
  return result.refund
}

// Verify Square webhook signature
export function verifySquareWebhook(
  body: string,
  signature: string,
  url: string
): boolean {
  const { WebhooksHelper } = require('square')
  return WebhooksHelper.isValidWebhookEventSignature(
    body,
    signature,
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!,
    url
  )
}
