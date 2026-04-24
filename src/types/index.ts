export type Product = {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  active: boolean
  variants?: ProductVariant[]
}

export type ProductVariant = {
  id: string
  product_id: string
  label: string
  price: number
  display_order: number
}

export type BatchStatus = 'draft' | 'open' | 'closed' | 'completed'

export type Batch = {
  id: string
  pickup_window: string
  status: BatchStatus
  notes: string | null
  created_at: string
}

export type BatchInventory = {
  id: string
  batch_id: string
  product_id: string
  bake_date: string
  total_qty: number
  sold_qty: number
  reserved_qty: number
  available_qty?: number
  product?: Product
}

export type CartReservation = {
  id: string
  user_email: string
  batch_inventory_id: string
  variant_id: string | null
  qty: number
  unit_price: number
  expires_at: string
  batch_inventory?: BatchInventory & { product: Product }
  variant?: ProductVariant | null
}

export type OrderStatus =
  | 'order_received'
  | 'preparing'
  | 'being_mixed'
  | 'proofing'
  | 'shaping'
  | 'baking'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  order_received: 'Order Received',
  preparing: 'Preparing',
  being_mixed: 'Being Mixed',
  proofing: 'Proofing',
  shaping: 'Shaping',
  baking: 'Baking',
  ready_for_pickup: 'Ready for Pickup!',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  'order_received',
  'preparing',
  'being_mixed',
  'proofing',
  'shaping',
  'baking',
  'ready_for_pickup',
]

export type PickupLocation = 'edison_901' | 'edison_919'

export const PICKUP_LOCATIONS: Record<PickupLocation, { label: string; address: string; note?: string }> = {
  edison_901: { label: '901 Edison St', address: '901 Edison St, Brush, CO 80723' },
  edison_919: { label: '919 Edison St', address: '919 Edison St, Brush, CO 80723', note: 'Easier parking' },
}

export type Order = {
  id: string
  user_email: string
  user_name: string
  batch_id: string
  status: OrderStatus
  pickup_location: PickupLocation
  square_payment_id: string | null
  square_order_id: string | null
  total: number
  created_at: string
  batch?: Batch
  items?: OrderItem[]
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  variant_label: string | null
  qty: number
  unit_price: number
  product?: Product
}

export type WaitlistEntry = {
  id: string
  email: string
  product_id: string | null
  created_at: string
}
