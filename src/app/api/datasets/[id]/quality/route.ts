// جدول کیفیت داده — بخش ۱۹.۲ سند («جدول کیفیت داده» به‌عنوان جزء گزارش)
// بر پایه موتور پروفایل بخش ۹؛ با رعایت قواعد دسترسی سطری و ماسک ستون محرمانه (بخش ۲۹)
// ستون‌های محرمانه: فراوانی مقادیر و آمار توصیفی حذف می‌شود تا نشت اطلاعات رخ ندهد

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { profileDataset } from '@/lib/profile'
import { requireUser, errorResponse, applyRowRules, RowRule } from '@/lib/auth'
import { FieldMeta, DataRow } from '@/lib/types'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const user = await requireUser(_req)
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    // قواعد دسترسی سطری — بخش ۲۹ سند: پروفایل فقط روی رکوردهای مجاز کاربر
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const profile = profileDataset(records, fields)

    // ماسک ستون محرمانه — آمار نشانه‌گذار مقدار (فراوانی، کمینه/بیشینه، میانگین، میانه، طول متن)
    // برای نقش‌های غیرمجاز حذف می‌شود؛ شمارنده‌های کلان (خالی، متمایز، وضعیت) برای ارزیابی کیفیت می‌ماند
    const canSeeRaw = user.role === 'admin' || user.role === 'steward'
    const outFields = profile.fields.map(p => {
      const meta = fields.find(f => f.id === p.fieldId)
      if (canSeeRaw || meta?.sensitivity !== 'confidential') return p
      return {
        ...p,
        topValues: p.topValues.map(tv => ({ ...tv, value: '••••••' })),
        min: undefined, max: undefined, mean: undefined, median: undefined,
        minLength: undefined, maxLength: undefined,
      }
    })

    return ok({
      dataset: { id: ds.id, name: ds.name, version: ds.version, updatedAt: ds.updatedAt, rowCount: ds.rowCount },
      rowCount: ds.rowCount, // کل رکوردهای مجموعه‌داده — برای مقایسه با دامنه مجاز کاربر
      visibleRowCount: records.length, // رکوردهای در دسترس پس از قواعد سطری
      duplicateRows: profile.duplicateRows,
      dateRange: profile.dateRange,
      warnings: profile.warnings,
      fields: outFields,
      maskedColumns: canSeeRaw ? [] : fields.filter(f => f.sensitivity === 'confidential').map(f => f.label),
    })
  } catch (e) {
    return errorResponse(e)
  }
}
