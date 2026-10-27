// پرس‌وجوی تجمیعی روی چند جدول متصل — بخش ۱۶ و ۱۱ سند
// ساخت مدل اتصالی در امتداد مسیر روابط انتخابی + سد امن چندبرابرشدن مبالغ (بخش ۱۶.۴)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, errorResponse, applyRowRules, maskRecords, maskFieldsMeta, RowRule } from '@/lib/auth'
import { executeJoin, preAggregate, buildCombinedFields, detectGraphIssues, ColumnPair, JoinType } from '@/lib/join'
import { runQuery, buildDescriptiveReport } from '@/lib/query'
import { FieldMeta, DataRow, QuerySpec } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const body = await req.json()
    const rootDatasetId = String(body.rootDatasetId ?? '')
    const relationIds: string[] = Array.isArray(body.relationIds) ? body.relationIds : []
    const preAgg = Boolean(body.preAggregate)
    if (!rootDatasetId) return fail('جدول پایه باید مشخص باشد.')

    // جدول پایه
    const root = await db.dataset.findUnique({ where: { id: rootDatasetId } })
    if (!root) return fail('مجموعه‌داده پایه یافت نشد.', 404)

    const rootFields = parseJson<FieldMeta[]>(root.fields, [])
    let records = applyRowRules(parseJson<DataRow[]>(root.records, []), user.rowRules as RowRule[], root.id)
    let fields: FieldMeta[] = [...rootFields]
    const included = new Map<string, string>([[root.id, '']])
    const pathNames: string[] = [root.name]
    const warnings: string[] = []
    const appliedRelations: { id: string; name: string; joinType: string }[] = []

    // اعمال قواعد سطری روی جدول پایه در مسیرهای خواسته‌شده — بخش ۲۹
    let spec: QuerySpec = {
      dimensions: Array.isArray(body.spec?.dimensions) ? body.spec.dimensions : [],
      measures: Array.isArray(body.spec?.measures) && body.spec.measures.length > 0 ? body.spec.measures : [{ agg: 'count' }],
      filters: body.spec?.filters ?? [],
      orderBy: body.spec?.orderBy,
      limit: body.spec?.limit,
      searchText: body.spec?.searchText,
    }

    for (const relId of relationIds) {
      const rel = await db.relation.findUnique({ where: { id: relId } })
      if (!rel || rel.status !== 'active') { warnings.push(`رابطه «${relId}» فعال نیست و از مسیر حذف شد.`); continue }
      if (rel.joinType === 'append') { warnings.push(`رابطه Append «${rel.name}» برای مدل اتصالی کاربرد ندارد و نادیده گرفته شد (تفاوت بخش ۱۶.۲ سند).`); continue }

      // تعیین جهت: کدام سمت رابطه در مدل جاری موجود است
      const fromIncluded = included.has(rel.fromDatasetId)
      const toIncluded = included.has(rel.toDatasetId)
      if (fromIncluded && toIncluded) {
        warnings.push(`رابطه «${rel.name}» هر دو سرش در مدل موجود است و برای جلوگیری از مسیر مبهم نادیده گرفته شد (بخش ۱۶.۳ سند).`)
        continue
      }
      if (!fromIncluded && !toIncluded) {
        warnings.push(`هیچ سرِ رابطه «${rel.name}» در مدل جاری نیست؛ ابتدا رابطه‌ای که جدولش را متصل کند اضافه کنید.`)
        continue
      }
      const flip = toIncluded // یعنی سمت from جدید است
      const newDatasetId = flip ? rel.fromDatasetId : rel.toDatasetId
      const newDs = await db.dataset.findUnique({ where: { id: newDatasetId } })
      if (!newDs) continue

      const newFields = parseJson<FieldMeta[]>(newDs.fields, [])
      let newRecs = applyRowRules(parseJson<DataRow[]>(newDs.records, []), user.rowRules as RowRule[], newDs.id)
      let pairs: ColumnPair[] = parseJson<ColumnPair[]>(rel.columnPairs, [])
      if (flip) pairs = pairs.map(p => ({ fromFieldId: p.toFieldId, toFieldId: p.fromFieldId }))

      // سد امن چندبرابرشدن مبالغ — بخش ۱۶.۴
      // اگر سمت جدید کلید تکراری دارد و سنجه‌های جمع‌پذیر از همان سمت خواسته شده، بدون تجمیع قبلی مسدود می‌شود
      const rightComb = buildCombinedFields([], newFields, newDs.name).right
      const keyCount = new Map<string, number>()
      for (const r of newRecs) {
        const k = pairs.map(p => {
          const v = r[flip ? p.fromFieldId : p.toFieldId]
          return v === null || v === undefined ? '' : String(v).trim()
        }).join('§')
        keyCount.set(k, (keyCount.get(k) ?? 0) + 1)
      }
      const hasDups = [...keyCount.values()].some(c => c > 1)
      const newSideFieldIds = new Set(rightComb.map(f => f.id))
      const newSideSumMeasures = (spec.measures ?? []).filter(m => m.fieldId && newSideFieldIds.has(m.fieldId) && ['sum', 'avg'].includes(m.agg))

      if (hasDups && newSideSumMeasures.length > 0 && !preAgg) {
        return fail(
          'اتصال مسدود شد: سمت «چند» رابطه دارای کلید تکراری است و سنجه‌های جمع‌پذیر از همان سمت درخواست شده؛ جمع‌کردن در این حالت مبالغ را چندبرابر می‌کند (بخش ۱۶.۴ سند). گزینه «تجمیع پیش از اتصال» را فعال کنید یا سنجه را در جدول مناسب تعریف کنید.',
          422
        )
      }

      let preAggNote: string | null = null
      if (hasDups && newSideSumMeasures.length > 0 && preAgg) {
        const side = flip ? 'from' : 'to'
        const agg = preAggregate(newRecs, pairs, side as 'from' | 'to', newFields)
        newRecs = agg.records
        preAggNote = `جدول «${newDs.name}» پیش از اتصال بر اساس کلید تجمیع شد (${agg.aggregatedFields.length.toLocaleString('fa-IR')} ستون سنجه) تا مبالغ چندبرابر نشوند (بخش ۱۶.۴ سند).`
        if (preAggNote) warnings.push(preAggNote)
      } else if (hasDups) {
        warnings.push(`جدول «${newDs.name}» کلید تکراری دارد؛ سنجه‌های آن جدول پس از اتصال تکثیر می‌شوند و نباید از همین سمت جمع شوند (بخش ۱۶.۴ سند).`)
      }

      // اجرای اتصال
      const before = records.length
      const comb = buildCombinedFields([], newFields, newDs.name)
      const joinType = rel.joinType as Exclude<JoinType, 'append'>
      records = executeJoin(records, newRecs, pairs, joinType, { left: fields, right: comb.right })
      fields = [...fields, ...comb.right]
      included.set(newDs.id, 'j__')
      pathNames.push(newDs.name)
      appliedRelations.push({ id: rel.id, name: rel.name, joinType: rel.joinType })
      if (records.length > before && joinType !== 'full') {
        warnings.push(`تعداد رکورد پس از اتصال «${rel.name}» از ${before.toLocaleString('fa-IR')} به ${records.length.toLocaleString('fa-IR')} رسید (تکثیر طبیعی رابطه یک‌به‌چند).`)
      }
    }

    // کنترل حلقه و مسیر مبهم روی روابط فعال پروژه — بخش ۱۶.۳
    const projectRelations = await db.relation.findMany({ where: { projectId: root.projectId, status: 'active' } })
    const graphIssues = detectGraphIssues(projectRelations)

    // ماسک اطلاعات حساس — بخش ۲۹
    const outRecords = maskRecords(records, fields, user.role)
    const outFields = maskFieldsMeta(fields, user.role)

    const result = runQuery(outRecords, outFields, spec)
    let descriptive: string | undefined
    if (body.descriptive) {
      descriptive = buildDescriptiveReport(outRecords, outFields, spec, result, pathNames.join(' + '), body.dateField)
    }

    return ok({
      ...result,
      fields: outFields,
      path: pathNames,
      appliedRelations,
      graphIssues,
      warnings: [...warnings, ...result.warnings],
    })
  } catch (e) {
    return errorResponse(e)
  }
}
