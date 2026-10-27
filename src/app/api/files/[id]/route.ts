// مدیریت فایل منبع

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/server'
import { parseJson } from '@/lib/server'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const file = await db.sourceFile.findUnique({
    where: { id },
    select: { id: true, name: true, size: true, mimeType: true, fingerprint: true, sheetInfo: true, version: true, createdAt: true },
  })
  if (!file) return fail('فایل یافت نشد.', 404)
  return ok(file)
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    await db.sourceFile.delete({ where: { id } })
    return ok({ deleted: true })
  } catch {
    return fail('حذف فایل ممکن نشد — احتمالاً مجموعه‌داده‌های وابسته وجود دارد.', 500)
  }
}
