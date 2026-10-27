// پیش‌نمایش داده منبع خارجی — بخش ۳۱ سند
// حداکثر ۲۰ سطر نخست بدون ساخت مجموعه‌داده، برای کنترل پرس‌وجو/مسیر پاسخ

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { fetchExternalRows, toConnectionRecord } from '@/lib/connectors'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm(_req, 'dataset.create')
    const { id } = await ctx.params
    const row = await db.externalConnection.findUnique({ where: { id } })
    if (!row) return fail('اتصال یافت نشد.', 404)
    try {
      const result = await fetchExternalRows(toConnectionRecord(row), 20)
      return ok({
        rows: result.rows,
        fields: result.fields.map(f => ({ id: f.id, label: f.label, type: f.type, role: f.role })),
        message: result.message,
      })
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'خطا در دریافت داده منبع', 502)
    }
  } catch (e) {
    return errorResponse(e)
  }
}
