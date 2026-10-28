// تولید پیش‌نویس گزارش توصیفی هوشمند — بخش ۲۵ سند
// «تولید پیش‌نویس گزارش توصیفی» + الزام «خروجی متنی حساس یا رسمی قابلیت تأیید انسانی داشته باشد»
// متن پایه همیشه توسط موتور قالبی سامانه (buildDescriptiveReport) از اعداد دقیق ساخته می‌شود؛
// غنی‌سازی روایی فقط با مجوز سیاست انجام می‌شود و خروجی «نیازمند تأیید انسانی» برچسب می‌خورد.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, applyRowRules, maskFieldsMeta, errorResponse, RowRule } from '@/lib/auth'
import { runQuery, buildDescriptiveReport } from '@/lib/query'
import { FieldMeta, DataRow, QuerySpec } from '@/lib/types'
import { llmChat } from '@/lib/ai/llm'
import { getLlmPolicy } from '@/lib/ai/llm'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const datasetId = String(body.datasetId ?? '')
    if (!datasetId) return fail('شناسه مجموعه‌داده الزامی است.', 400)

    const ds = await db.dataset.findUnique({ where: { id: datasetId } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const safeFields = maskFieldsMeta(fields, user.role)

    // مشخصات پرس‌وجو — اختیاری؛ پیش‌فرض: گروه‌بندی نخست + جمع سنجه نخست
    const spec: QuerySpec = {
      dimensions: Array.isArray(body.dimensions) ? body.dimensions.slice(0, 2) : (fields.find(f => f.role === 'dimension' || f.type === 'category') ? [fields.find(f => f.role === 'dimension' || f.type === 'category')!.id] : []),
      measures: Array.isArray(body.measures) && body.measures.length > 0
        ? body.measures
        : (fields.find(f => f.role === 'measure') ? [{ fieldId: fields.find(f => f.role === 'measure')!.id, agg: 'sum' as const }] : [{ agg: 'count' as const }]),
      filters: Array.isArray(body.filters) ? body.filters : [],
      limit: 30,
    }

    const result = runQuery(records, fields, spec)
    const engineText = buildDescriptiveReport(records, fields, spec, result, ds.name, fields.find(f => f.type === 'date')?.id)

    // غنی‌سازی روایی با مدل زبانی — نیازمند مجوز ارسال داده (اعداد تجمیعی ارسال می‌شوند)
    const policy = await getLlmPolicy()
    let narrative: string | null = null
    let llmNote: string | null = null
    if (policy.aiEnabled && policy.aiAllowDataSharing) {
      const alias = spec.measures[0] ? (spec.measures[0].alias ?? '') : ''
      const compact = {
        dataset: ds.name,
        scannedRecords: result.scannedRecords,
        totals: result.totals,
        topGroups: result.rows.slice(0, 10),
        rowCount: result.rowCount,
        warnings: result.warnings,
      }
      const res = await llmChat(
        'بر پایه داده‌های تجمیعی ارائه‌شده، یک پیش‌نویس گزارش توصیفی مدیریتی سه‌پاراگرافی فارسی بنویس. ' +
        'فقط از اعداد موجود در DATA استفاده کن و عدد جدیدی نیاور. لحن رسمی و بی‌طرف باشد و پایین متن یک سطر «محدودیت‌ها» بیاورد.',
        compact,
      )
      if (res.ok) narrative = res.text
      else llmNote = res.unavailableReason ?? null
    } else {
      llmNote = policy.aiEnabled
        ? 'روایت‌سازی با مدل زبانی نیازمند مجوز «ارسال نمونه داده به سرویس بیرونی» است؛ متن پایه موتور قالبی ارائه شد.'
        : 'مدل زبانی غیرفعال است؛ متن پایه موتور قالبی ارائه شد.'
    }

    return ok({
      dataset: { id: ds.id, name: ds.name },
      engineText,                      // متن قالبی — اعداد دقیق موتور (بخش ۲۰ سند)
      narrative,                       // روایت غنی‌شده — در صورت مجوز
      requiresHumanApproval: true,     // الزام بخش ۲۵: تأیید انسانی برای متن رسمی
      llmNote,
      trace: { scannedRecords: result.scannedRecords, rowCount: result.rowCount, warnings: result.warnings },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
