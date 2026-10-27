// API گزینه‌های فیلتر وابسته — بخش ۱۹.۳ سند (فیلتر وابسته، مانند استان و شهرستان)
// گزینه‌های هر فیلتر بر اساس وضعیت سایر فیلترها بازمحاسبه می‌شود (کاسکاد خودکار)
// ستون‌های جدول‌های مرتبط از طریق رابطه فعال (بخش ۱۶) نیز قابل فیلتر هستند
// دسترسی سطری (۲۹) و ماسک ستون محرمانه اعمال می‌شود

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { executeJoin, ColumnPair, JoinType } from '@/lib/join'
import { matchFilter } from '@/lib/query'
import { requireUser, errorResponse, applyRowRules, maskValue, RowRule } from '@/lib/auth'
import { FieldMeta, DataRow, QueryFilter } from '@/lib/types'

const MAX_VALUES = 200

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const user = await requireUser(req)
    const body = await req.json()
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const baseRecords = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const filters: QueryFilter[] = Array.isArray(body.filters) ? body.filters : []
    const relationId = body.relationId ? String(body.relationId) : ''
    const search = body.search ? String(body.search).trim() : ''
    const limit = Math.max(1, Math.min(MAX_VALUES, Number(body.limit ?? MAX_VALUES)))

    let targetFieldId = String(body.fieldId ?? '')
    let pool: DataRow[] = baseRecords
    let viaRelation: string | null = null

    if (relationId) {
      // فیلتر از جدول مرتبط — اتصال با رابطه فعال بخش ۱۶
      const rel = await db.relation.findUnique({ where: { id: relationId } })
      if (!rel || rel.status !== 'active') return fail('رابطه فعال نیست (بخش ۱۶ سند).', 422)
      if (ds.id !== rel.fromDatasetId && ds.id !== rel.toDatasetId) {
        return fail('این رابطه به مجموعه‌داده جاری متصل نیست.', 422)
      }
      const flip = ds.id === rel.toDatasetId
      const otherDatasetId = flip ? rel.fromDatasetId : rel.toDatasetId
      const other = await db.dataset.findUnique({ where: { id: otherDatasetId } })
      if (!other) return fail('جدول مرتبط یافت نشد.', 404)

      const otherFields = parseJson<FieldMeta[]>(other.fields, [])
      if (!otherFields.some(f => f.id === targetFieldId)) {
        return fail('ستون انتخابی در جدول مرتبط یافت نشد.', 422)
      }
      const otherRecords = applyRowRules(parseJson<DataRow[]>(other.records, []), user.rowRules as RowRule[], other.id)
      let pairs: ColumnPair[] = parseJson<ColumnPair[]>(rel.columnPairs, [])
      if (flip) pairs = pairs.map(p => ({ fromFieldId: p.toFieldId, toFieldId: p.fromFieldId }))

      let jt = rel.joinType as JoinType
      if (jt === 'append' || jt === 'anti') jt = 'left' // برای شمارش گزینه‌ها معنا ندارد؛ اتصال چپ جایگزین می‌شود

      const joined = executeJoin(baseRecords, otherRecords, pairs, jt, { left: fields, right: otherFields })
      pool = joined
      viaRelation = rel.name
    } else if (!fields.some(f => f.id === targetFieldId)) {
      return fail('ستون انتخابی در مجموعه‌داده یافت نشد.', 422)
    }

    // اعمال فیلترهای جاری روی استخر رکورد — پایه کاسکاد خودکار (بخش ۱۹.۳)
    let data = pool
    for (const flt of filters) {
      if (flt.fieldId === targetFieldId && !viaRelation) continue // فیلتر خود ستون، گزینه‌هایش را محدود نمی‌کند
      data = data.filter(r => matchFilter(r[flt.fieldId], flt))
    }

    // مقادیر متمایز
    const counts = new Map<string, number>()
    for (const r of data) {
      const v = r[targetFieldId]
      if (v === null || v === undefined || String(v) === '') continue
      const key = String(v)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    let values = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'fa'))
    const totalDistinct = values.length
    if (search) values = values.filter(v => v.includes(search))
    values = values.slice(0, limit)

    // ماسک ستون محرمانه — بخش ۲۹
    const allFields = [...fields]
    if (viaRelation) {
      const rel = await db.relation.findUnique({ where: { id: relationId } })
      const otherDatasetId = rel ? (ds.id === rel.toDatasetId ? rel.fromDatasetId : rel.toDatasetId) : ''
      const other = otherDatasetId ? await db.dataset.findUnique({ where: { id: otherDatasetId } }) : null
      if (other) allFields.push(...parseJson<FieldMeta[]>(other.fields, []))
    }
    const sensitive = allFields.find(f => f.id === targetFieldId && f.sensitivity === 'confidential')
    if (sensitive) values = values.map(v => maskValue(v))

    return ok({
      fieldId: targetFieldId,
      viaRelation,
      values,
      totalDistinct,
      matchedRecords: data.length,
      truncated: totalDistinct > values.length,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
