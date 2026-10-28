// نقشه جغرافیایی — تکمیل بخش ۱۹.۲ سند: «نقشه جغرافیایی، در صورت وجود داده مکانی معتبر»
// تجمیع سنجه به تفکیک بُعد مکانی و تبدیل مقادیر به مختصات با جدول مرجع محلی استان‌های ایران
// مقادیری که به استان تبدیل نمی‌شوند به‌صورت شفاف در unmatched گزارش می‌شوند.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, applyRowRules, maskFieldsMeta, errorResponse, RowRule } from '@/lib/auth'
import { runQuery, measureAlias } from '@/lib/query'
import { resolveRelationFilters, RelationFilter } from '@/lib/relfilter'
import { FieldMeta, DataRow, QuerySpec, AggregationType } from '@/lib/types'
import { detectGeoColumn, buildGeoPoints } from '@/lib/geo'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const safeFields = maskFieldsMeta(fields, user.role)

    // تشخیص ستون مکانی — خودکار یا بر اساس ورودی کاربر
    const geo = detectGeoColumn(fields, records)
    if (!geo) {
      return ok({
        points: [], unmatched: [], warnings: ['ستون مکانی معتبری در این مجموعه‌داده یافت نشد؛ نقشه جغرافیایی نیازمند ستون نام استان یا مختصات است (بخش ۱۹.۲ سند).'],
        scannedRecords: records.length, geo: null,
      })
    }

    const measure = body.measure && typeof body.measure === 'object'
      ? { fieldId: body.measure.fieldId, agg: (body.measure.agg ?? 'sum') as AggregationType, alias: body.measure.alias }
      : null

    // حالت نقطه‌ای با مختصات صریح (lat/lng)
    if (geo.kind === 'latlng' && geo.latFieldId && geo.lngFieldId) {
      const { points } = buildGeoPoints([], 'latlng', geo.latFieldId, geo.lngFieldId, records)
      return ok({
        points: points.slice(0, 500), unmatched: [],
        warnings: points.length === 0 ? ['هیچ رکوردی با مختصات معتبر در محدوده ایران یافت نشد.'] : [],
        scannedRecords: records.length,
        geo: { fieldId: geo.fieldId, label: geo.label, kind: geo.kind, matchRatio: geo.matchRatio },
      })
    }

    // تجمیع به تفکیک استان
    const spec: QuerySpec = {
      dimensions: [geo.fieldId],
      measures: measure
        ? [measure]
        : fields.some(f => f.role === 'measure')
          ? [{ fieldId: fields.find(f => f.role === 'measure')!.id, agg: 'sum' }]
          : [{ agg: 'count', alias: 'تعداد رکورد' }],
      filters: Array.isArray(body.filters) ? body.filters : [],
      limit: 200,
    }
    const relationFilters: RelationFilter[] = Array.isArray(body.relationFilters) ? body.relationFilters : []
    const resolved = await resolveRelationFilters(ds.id, relationFilters, user)
    if (resolved.filters.length > 0) spec.filters = [...(spec.filters ?? []), ...resolved.filters]

    const result = runQuery(records, fields, spec)
    const alias = spec.measures[0].alias ?? measureAlias(spec.measures[0].fieldId, spec.measures[0].agg, fields)
    const rows = result.rows.map(r => ({
      name: String(r[geo.fieldId] ?? '—'),
      value: typeof r[alias] === 'number' ? r[alias] as number : 0,
    }))
    const { points, unmatched } = buildGeoPoints(rows, 'province')

    const warnings = [...result.warnings, ...resolved.warnings]
    if (unmatched.length > 0) {
      warnings.push(`${unmatched.length.toLocaleString('fa-IR')} مقدار مکانی با استان‌های مرجع تطبیق نیافت: ${unmatched.slice(0, 6).join('، ')}${unmatched.length > 6 ? ' …' : ''}`)
    }
    if (points.length === 0) {
      warnings.push('هیچ مقدار مکانی معتبری برای نمایش روی نقشه یافت نشد.')
    }

    return ok({
      points, unmatched,
      measureAlias: alias,
      warnings,
      scannedRecords: result.scannedRecords,
      geo: { fieldId: geo.fieldId, label: geo.label, kind: geo.kind, matchRatio: geo.matchRatio },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
