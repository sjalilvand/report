// مدیریت فایل منبع — مشاهده مشخصات و حذف (بخش ۷ سند)
// حذف فایل نیازمند مجوز است و با سیاست نسخه‌ها هماهنگ است (بخش ۲۹ سند)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/server'
import { parseJson } from '@/lib/server'
import { requireUser, requirePerm, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(req)
    const { id } = await ctx.params
    const file = await db.sourceFile.findUnique({
      where: { id },
      select: { id: true, name: true, size: true, mimeType: true, fingerprint: true, sheetInfo: true, version: true, createdAt: true },
    })
    if (!file) return fail('فایل یافت نشد.', 404)
    return ok(file)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm(req, 'file.delete')
    const { id } = await ctx.params
    await db.sourceFile.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
