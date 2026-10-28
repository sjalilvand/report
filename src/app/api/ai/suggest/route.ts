// پیشنهادهای هوشمند محلی — بخش ۲۵ سند
// «پیشنهاد نوع داده و برچسب ستون، کلید یکتا، روابط، قواعد پاک‌سازی، نمودار مناسب،
//  شاخص‌های قابل محاسبه و یافتن الگوها و نقاط غیرعادی»
// همه پیشنهادها از داده همین سامانه و بدون ارسال داده به بیرون تولید می‌شوند.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, applyRowRules, maskFieldsMeta, errorResponse, RowRule } from '@/lib/auth'
import { buildSuggestions, DatasetLiteForAI } from '@/lib/ai/engine'
import { FieldMeta, DataRow } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const datasetId = String(body.datasetId ?? '')
    if (!datasetId) return fail('شناسه مجموعه‌داده الزامی است.', 400)

    const ds = await db.dataset.findUnique({ where: { id: datasetId } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    // دسترسی هوش مصنوعی از مجوز کاربر فراتر نمی‌رود — قواعد سطری و ماسک (بخش ۲۵ و ۲۹)
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const safeFields = maskFieldsMeta(fields, user.role)

    // سایر مجموعه‌داده‌های پروژه برای پیشنهاد رابطه — با همان قواعد دسترسی
    const siblings = await db.dataset.findMany({ where: { projectId: ds.projectId } })
    const others: DatasetLiteForAI[] = siblings
      .filter(o => o.id !== ds.id)
      .map(o => ({
        id: o.id,
        name: o.name,
        records: applyRowRules(parseJson<DataRow[]>(o.records, []), user.rowRules as RowRule[], o.id),
        fields: parseJson<FieldMeta[]>(o.fields, []),
      }))

    const result = buildSuggestions({ id: ds.id, name: ds.name, records, fields: safeFields }, others)

    // داده نمونه برای تشخیص فرم‌پذیری پاسخ — خروجی حاوی هیچ رکورد خامی نیست
    return ok({
      ...result,
      dataset: { id: ds.id, name: ds.name, rowCount: ds.rowCount },
      disclaimer: 'پیشنهادها از تحلیل آماری محلی داده تولید شده‌اند؛ تصمیم نهایی با مدیر داده است (بخش ۴ و ۲۵ سند).',
    })
  } catch (e) {
    return errorResponse(e)
  }
}
