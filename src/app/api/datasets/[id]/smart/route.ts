// تحلیل تخصصی قالب هوشمند — فیش حقوقی، صورت مالی، سود
// GET: تشخیص قالب از ساختار مجموعه‌داده و ساخت تحلیل تخصصی + گزارش هوشمند
// قواعد دسترسی سطح سطر و ماسک حساس — همان قواعد داشبورد خودکار (بخش ۲۹ سند)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { FieldMeta, DataRow } from '@/lib/types'
import { requireUser, errorResponse, applyRowRules, maskRecords, maskFieldsMeta, RowRule } from '@/lib/auth'
import { detectSmartTemplate, buildSmartAnalysis } from '@/lib/smarttemplates'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const visibleFields = maskFieldsMeta(fields, user.role)
    const masked = maskRecords(records, fields, user.role)

    const detection = detectSmartTemplate(masked, visibleFields)
    if (!detection.template) {
      return ok({ template: null, confidence: detection.confidence })
    }
    const analysis = buildSmartAnalysis(detection.template, masked, visibleFields)
    return ok({
      template: analysis.template,
      templateLabel: analysis.templateLabel,
      confidence: detection.confidence,
      matchedSignals: detection.matchedSignals,
      analysis,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
