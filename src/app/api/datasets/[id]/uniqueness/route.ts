// آزمون یکتایی کلید — بخش ۱۷ سند
// نمایش تعداد کل، خالی و متمایز، گروه‌های تکراری (معیار پذیرش ۳۳.۷)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { checkUniqueness } from '@/lib/detect'
import { DataRow } from '@/lib/types'
import { requireUser, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(req)
    const { id } = await ctx.params
  const fieldIds = (req.nextUrl.searchParams.get('fields') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (fieldIds.length === 0) return fail('حداقل یک ستون کلید لازم است.')

  const ds = await db.dataset.findUnique({ where: { id } })
  if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)
  const records = parseJson<DataRow[]>(ds.records, [])
  const result = checkUniqueness(records, fieldIds)
  return ok({
    ...result,
    message: result.unique
      ? 'کلید انتخابی یکتا است.'
      : `کلید دارای تکرار است؛ ${result.duplicateGroups.length} گروه تکراری شناسایی شد. کلید را بی‌هشدار یکتا اعلام نمی‌کنیم (بخش ۱۷.۱ سند).`,
  })
  } catch (e) {
    return errorResponse(e)
  }
}
