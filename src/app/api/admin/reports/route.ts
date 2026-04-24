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

  const [[today]] = await db.query(
    `SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
     FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'`
  ) as any[]

  const [[thisWeek]] = await db.query(
    `SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
     FROM orders WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) AND status != 'cancelled'`
  ) as any[]

  const [[thisMonth]] = await db.query(
    `SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
     FROM orders WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) AND status != 'cancelled'`
  ) as any[]

  const [[thisYear]] = await db.query(
    `SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
     FROM orders WHERE YEAR(created_at) = YEAR(CURDATE()) AND status != 'cancelled'`
  ) as any[]

  const [monthly] = await db.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as orders,
            COALESCE(SUM(total), 0) as revenue
     FROM orders WHERE YEAR(created_at) = YEAR(CURDATE()) AND status != 'cancelled'
     GROUP BY month ORDER BY month ASC`
  ) as any[]

  const [products] = await db.query(
    `SELECT p.name, oi.variant_label, SUM(oi.qty) as units, SUM(oi.unit_price * oi.qty) as revenue
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status != 'cancelled' AND YEAR(o.created_at) = YEAR(CURDATE())
     GROUP BY p.name, oi.variant_label
     ORDER BY revenue DESC`
  ) as any[]

  return NextResponse.json({ today, thisWeek, thisMonth, thisYear, monthly, products })
}
