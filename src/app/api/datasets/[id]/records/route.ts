// نمونه رکوردها و داده‌های نامعتبر — بخش ۸.۲ (بررسی و دانلود تبدیل‌های غیرقابل انجام)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { FieldMeta, DataRow } from '@/lib/types'
import { toLatinDigits } from '@/lib/digits'
import { parseDateValue } from '@/lib/jalali'
import { requireUser, errorResponse, maskRecords, RowRule, applyRowRules } from '@/lib/auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const fieldId = req.nextUrl.searchParams.get('fieldId')
    const invalidOnly = req.nextUrl.searchParams.get('invalid') === 'true'
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10)

    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)
    // قواعد سطری + ماسک حساس — بخش ۲۹ سند
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)

  let out = records
  if (fieldId && invalidOnly) {
    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const f = fields.find(x => x.id === fieldId)
    if (f) {
      out = records.filter(r => {
        const v = r[fieldId]
        if (v === null || v === undefined || String(v).trim() === '') return false
        if (['amount', 'decimal', 'integer', 'percent'].includes(f.type)) {
          const s = toLatinDigits(String(v)).replace(/[,\u060C\s]/g, '')
          return !/^-?\d*\.?\d+$/.test(s)
        }
        if (f.type === 'date') return !parseDateValue(v).ok
        return false
      })
    }
  }
  const masked = maskRecords(out, parseJson<FieldMeta[]>(ds.fields, []), user.role)
    return ok({ total: masked.length, rows: masked.slice(0, limit) })
  } catch (e) {
    return errorResponse(e)
  }
}
