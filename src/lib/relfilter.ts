// فیلتر وابسته از روابط جداول — بخش ۱۹.۳ سند
// فیلتر روی ستونی از جدول مرتبط، به فیلتر «in» روی کلید اتصال جدول پایه تبدیل می‌شود
// (شبه‌اجرا/Semi-Join: مقادیر کلید جدول مرتبط که شرط را دارند، جدول پایه را محدود می‌کنند)
//
// وابستگی خودکار است: گزینه‌های هر فیلتر با وضعیت فیلترهای دیگر (هم‌جدول یا از روابط)
// بازمحاسبه می‌شود — مثال سند: انتخاب استان، فهرست شهرستان‌ها را محدود می‌کند.

import { db } from './db'
import { parseJson } from './server'
import { QueryFilter, FieldMeta, DataRow } from './types'
import { matchFilter } from './query'
import { ColumnPair, JoinType } from './join'
import { applyRowRules, RowRule, SessionUser } from './auth'

export interface RelationFilter {
  relationId: string
  fieldId: string       // ستون در جدول مرتبط
  op: QueryFilter['op']
  value?: unknown
  values?: unknown[]
}

export interface ResolvedRelationFilters {
  filters: QueryFilter[]
  warnings: string[]
}

// بررسی تعلق فیلتر به ستون جدول مرتبط از طریق رابطه فعال
// خروجی: فیلتر پایه معادل روی کلید اتصال (پرکاربردترین حالت: جفت نخست رابطه)
export async function resolveRelationFilters(
  baseDatasetId: string,
  relationFilters: RelationFilter[],
  user: SessionUser
): Promise<ResolvedRelationFilters> {
  const out: QueryFilter[] = []
  const warnings: string[] = []

  for (const rf of relationFilters) {
    const rel = await db.relation.findUnique({ where: { id: rf.relationId } })
    if (!rel || rel.status !== 'active') {
      warnings.push('فیلتر از جدول مرتبط نادیده گرفته شد: رابطه فعال نیست.')
      continue
    }
    if (baseDatasetId !== rel.fromDatasetId && baseDatasetId !== rel.toDatasetId) {
      warnings.push(`فیلتر «از جدول مرتبط» نادیده گرفته شد: رابطه «${rel.name}» به جدول پایه متصل نیست.`)
      continue
    }

    // جهت‌یابی: جدول پایه سمت from یا to
    const flip = baseDatasetId === rel.toDatasetId
    const otherDatasetId = flip ? rel.fromDatasetId : rel.toDatasetId
    let pairs: ColumnPair[] = parseJson<ColumnPair[]>(rel.columnPairs, [])
    if (flip) pairs = pairs.map(p => ({ fromFieldId: p.toFieldId, toFieldId: p.fromFieldId }))

    const other = await db.dataset.findUnique({ where: { id: otherDatasetId } })
    if (!other) continue
    const otherFields = parseJson<FieldMeta[]>(other.fields, [])
    if (!otherFields.some(f => f.id === rf.fieldId)) {
      warnings.push(`ستون فیلتر در جدول مرتبط «${other.name}» یافت نشد و فیلتر نادیده گرفته شد.`)
      continue
    }

    const otherRecords = applyRowRules(
      parseJson<DataRow[]>(other.records, []),
      user.rowRules as RowRule[],
      other.id
    )

    // اعمال شرط روی جدول مرتبط
    let matched: DataRow[] = otherRecords
    const flt: QueryFilter = { fieldId: rf.fieldId, op: rf.op, value: rf.value, values: rf.values }
    matched = matched.filter(r => matchFilter(r[rf.fieldId], flt))

    // استخراج مقادیر کلید سمت جدول پایه (جفت نخست — کلیدهای مرکبی در فاز بعد)
    const baseKeyField = pairs[0]?.fromFieldId
    if (!baseKeyField) {
      warnings.push(`رابطه «${rel.name}» جفت‌ستون کلید ندارد؛ فیلتر نادیده گرفته شد.`)
      continue
    }
    if (pairs.length > 1) {
      warnings.push('کلید مرکبی: تبدیل فیلتر وابسته بر اساس جفت نخست رابطه انجام شد.')
    }

    const keyVals = new Set<string>()
    for (const r of matched) {
      const v = r[pairs[0].toFieldId]
      if (v === null || v === undefined || String(v).trim() === '') continue
      keyVals.add(String(v))
    }

    if (keyVals.size === 0) {
      // هیچ تطابقی: فیلد پایه باید به مقداری تبدیل شود که هیچ رکوردی ندارد
      out.push({ fieldId: baseKeyField, op: 'in', values: ['§هیچ§'] })
      continue
    }
    out.push({ fieldId: baseKeyField, op: 'in', values: [...keyVals] })
  }

  return { filters: out, warnings }
}

// اعتبارسنجی joinType برای فیلتر وابسته — Append/Anti معنا ندارد
export function relationFilterSupported(joinType: JoinType): boolean {
  return joinType === 'inner' || joinType === 'left' || joinType === 'right' || joinType === 'full'
}
