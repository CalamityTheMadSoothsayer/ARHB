export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { writeFile } from 'fs/promises'
import path from 'path'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.email === process.env.ADMIN_EMAIL ? session : null
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const formData = await req.formData()
  const file = formData.get('image') as File
  if (!file || !file.size) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Invalid file type — jpg, png, or webp only' }, { status: 400 })
  }
  const filename = `product_${params.id}_${Date.now()}.${ext}`
  const filepath = path.join(process.cwd(), 'public', 'images', filename)
  await writeFile(filepath, Buffer.from(await file.arrayBuffer()))
  const imageUrl = `/images/${filename}`
  await db.query('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, params.id])
  return NextResponse.json({ ok: true, image_url: imageUrl })
}
