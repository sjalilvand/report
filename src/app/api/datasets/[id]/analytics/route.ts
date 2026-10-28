// API تحلیل‌های پیشرفته — بخش ۲۱.۲ و ۲۱.۳ سند
// حالت‌ها: trend (روند و پیش‌بینی) | correlation (همبستگی) | cohort (گروه‌های زمانی)
//          rfm (بخش‌بندی RFM) | whatif (سناریوسازی) | anomaly (ناهنجاری)
// قواعد صحت ۲۱.۳ در موتور تحلیل (lib/analytics.ts) اعمال می‌شود

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, errorResponse, applyRowRules, maskValue, RowRule } from '@/lib/auth'
import { FieldMeta, DataRow, QueryFilter } from '@/lib/types'
import { Granularity, trendForecast, correlation, cohortAnalysis, rfmAnalysis, whatIf, anomalyDetection } from '@/lib/analytics'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const user = await requireUser(req)
    const body = await req.json()
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    // قواعد دسترسی سطح سطر — بخش ۲۹ سند
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const filters: QueryFilter[] = Array.isArray(body.filters) ? body.filters : []
    const mode = String(body.mode ?? '')

    switch (mode) {
      case 'trend': {
        if (!body.dateField) return fail('ستون تاریخ برای تحلیل روند الزامی است.')
        const result = trendForecast(records, fields, {
          dateField: String(body.dateField),
          measureField: body.measureField ? String(body.measureField) : undefined,
          agg: body.agg ? String(body.agg) : 'sum',
          granularity: (body.granularity as Granularity) ?? 'month',
          horizon: body.horizon ? Number(body.horizon) : 3,
        }, filters)
        return ok({ mode, ...result })
      }
      case 'correlation': {
        const result = correlation(records, fields, {
          fieldIds: Array.isArray(body.fieldIds) ? body.fieldIds.map(String) : undefined,
        }, filters)
        return ok({ mode, ...result })
      }
      case 'cohort': {
        if (!body.idField || !body.dateField) return fail('ستون شناسه و ستون تاریخ برای تحلیل Cohort الزامی است.')
        const result = cohortAnalysis(records, fields, {
          idField: String(body.idField),
          dateField: String(body.dateField),
          granularity: (body.granularity as Granularity) ?? 'month',
        }, filters)
        return ok({ mode, ...result })
      }
      case 'rfm': {
        if (!body.idField || !body.dateField) return fail('ستون شناسه و ستون تاریخ برای تحلیل RFM الزامی است.')
        const result = rfmAnalysis(records, fields, {
          idField: String(body.idField),
          dateField: String(body.dateField),
          amountField: body.amountField ? String(body.amountField) : undefined,
        }, filters)
        // ماسک شناسه حساس — بخش ۲۹ سند (شناسه‌ها به‌صورت فردی نمایش داده می‌شوند)
        const idField = fields.find(f => f.id === String(body.idField))
        if (idField?.sensitivity === 'confidential') {
          result.customers = result.customers.map(c => ({ ...c, id: maskValue(c.id) }))
        }
        return ok({ mode, ...result })
      }
      case 'whatif': {
        if (!Array.isArray(body.dimensions) || body.dimensions.length === 0) return fail('حداقل یک بُعد برای سناریوسازی لازم است.')
        const result = whatIf(records, fields, {
          dimensions: body.dimensions.map(String),
          measures: Array.isArray(body.measures) && body.measures.length > 0 ? body.measures : [{ agg: 'count' }],
          globalPct: Number(body.globalPct ?? 0),
          perValue: body.perValue && typeof body.perValue === 'object' ? body.perValue : undefined,
          dimensionForPerValue: body.dimensionForPerValue ? String(body.dimensionForPerValue) : undefined,
        }, filters)
        return ok({ mode, ...result })
      }
      case 'anomaly': {
        if (!body.dateField) return fail('ستون تاریخ برای تشخیص ناهنجاری الزامی است.')
        const result = anomalyDetection(records, fields, {
          dateField: String(body.dateField),
          measureField: body.measureField ? String(body.measureField) : undefined,
          agg: body.agg ? String(body.agg) : 'sum',
          granularity: (body.granularity as Granularity) ?? 'month',
          threshold: body.threshold ? Number(body.threshold) : undefined,
        }, filters)
        return ok({ mode, ...result })
      }
      default:
        return fail('حالت تحلیل نامعتبر است: trend | correlation | cohort | rfm | whatif | anomaly')
    }
  } catch (e) {
    return errorResponse(e)
  }
}
