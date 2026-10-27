// موتور جدول محوری — بخش ۱۹.۲ سند
// سلسله‌مراتب سطرها با جمع جزء، بعد ستون‌ها، جمع کل سطر و ستون،
// سهم از کل و رتبه (بخش ۱۹.۴) با مدیریت صحیح مقادیر خالی (۳۳.۹)
//
// سنجه‌های غیرجمع‌پذیر (میانگین و میانه) در جمع جزء و جمع کل روی داده
// خامِ همان دامنه محاسبه می‌شوند نه جمع میانگین‌ها — صحت آماری حفظ می‌شود.

import { DataRow, FieldMeta, QueryFilter } from './types'
import { matchFilter, aggregateMeasure } from './query'
import { measureAlias } from './query'
import { AggregationType } from './types'

export interface PivotMeasure {
  fieldId?: string
  agg: AggregationType
  alias?: string
}

export interface PivotSpec {
  rowDims: string[]              // سلسله‌مراتب سطرها (ترتیب اهمیت)
  colDim?: string                // بُعد ستون‌ها (حداکثر یک بُعد)
  measures: PivotMeasure[]
  filters?: QueryFilter[]
  colLimit?: number              // محدودیت تعداد ستون‌ها — بخش ۱۹.۲ (پیش‌فرض ۱۲)
  showRowTotals: boolean         // جمع جزء (سطر)
  showColTotals: boolean         // جمع کل (ستون)
  showShare: boolean             // نمایش سهم از کل — بخش ۱۹.۴
  showRank: boolean              // نمایش رتبه — بخش ۱۹.۴
  subtotals: boolean             // جمع جزء برای هر سطح سلسله‌مراتب
}

export interface PivotCell {
  [colKey: string]: number // مقدار هر ستون برای نخستین سنجه یا هر سنجه با کلید ترکیبی
}

export interface PivotRow {
  dimValues: { fieldId: string; value: string | null }[]
  depth: number              // سطح سلسله‌مراتب (۰ = بیرونی‌ترین)
  isSubtotal: boolean
  cells: PivotCell           // کلید: `${colKey}||${alias}`
  rowTotals: Record<string, number> // کلید: alias
  share?: number             // سهم از کل بر اساس نخستین سنجه (۰ تا ۱۰۰)
  rank?: number              // رتبه بر اساس نخستین سنجه (فقط سطح بیرونی)
}

export interface PivotResult {
  colKeys: string[]
  measureAliases: string[]
  rows: PivotRow[]
  colTotals: Record<string, number> // کلید: `${colKey}||${alias}`
  grandTotals: Record<string, number> // کلید: alias
  shareBase?: string         // نام سنجه مبنا برای سهم از کل
  rankBase?: string
  warnings: string[]
  scannedRecords: number
}

const SUBTOTAL_SUFFIX = '§§جمع جزء'

function keyOf(v: unknown): string {
  if (v === null || v === undefined) return '—'
  return String(v)
}

export function buildPivot(
  records: DataRow[],
  fields: FieldMeta[],
  spec: PivotSpec
): PivotResult {
  const warnings: string[] = []
  const fieldById = new Map(fields.map(f => [f.id, f]))
  const rowDims = spec.rowDims.filter(d => fieldById.has(d))
  if (spec.rowDims.length !== rowDims.length) {
    warnings.push('برخی ابعاد سطر در مجموعه‌داده یافت نشدند و نادیده گرفته شدند.')
  }

  // فیلترها
  let data = records
  for (const flt of spec.filters ?? []) {
    if (!fieldById.has(flt.fieldId)) {
      warnings.push(`فیلتر برای ستون ناشناخته «${flt.fieldId}» نادیده گرفته شد.`)
      continue
    }
    data = data.filter(r => matchFilter(r[flt.fieldId], flt))
  }
  const scanned = data.length

  // نام ستون‌های سنجه
  const measureAliases = spec.measures.map(m => m.alias ?? measureAlias(m.fieldId, m.agg, fields))
  const firstAlias = measureAliases[0] ?? 'تعداد رکورد'

  // کلیدهای ستون: مقادیر متمایز بعد ستون بر اساس نخستین سنجه مرتب نزولی و محدود — بخش ۱۹.۲
  let colKeys: string[] = ['§total']
  if (spec.colDim && fieldById.has(spec.colDim)) {
    const colVals = new Map<string, number>()
    for (const r of data) {
      const k = keyOf(r[spec.colDim])
      colVals.set(k, (colVals.get(k) ?? 0) + 1)
    }
    colKeys = [...colVals.keys()]
    const limit = spec.colLimit && spec.colLimit > 0 ? Math.min(spec.colLimit, 50) : 12
    if (colKeys.length > limit) {
      warnings.push(`بُعد ستون ${colKeys.length.toLocaleString('fa-IR')} مقدار متمایز دارد؛ ${limit.toLocaleString('fa-IR')} مقدار پربسامد نمایش داده شد (بخش ۱۹.۲ سند: محدودیت مناسب).`)
      colKeys = colKeys.slice(0, limit)
    }
  }

  // گروه‌بندی سلسله‌مراتبی سطرها
  interface Group {
    dimValues: { fieldId: string; value: string | null }[]
    depth: number
    recs: DataRow[]
    children: Group[]
  }
  const buildTree = (recs: DataRow[], depth: number, prefix: { fieldId: string; value: string | null }[]): Group[] => {
    if (depth >= rowDims.length) return []
    const dim = rowDims[depth]
    const map = new Map<string, DataRow[]>()
    for (const r of recs) {
      const k = keyOf(r[dim])
      const arr = map.get(k)
      if (arr) arr.push(r)
      else map.set(k, [r])
    }
    const groups: Group[] = []
    for (const [k, rs] of map) {
      const g: Group = {
        dimValues: [...prefix, { fieldId: dim, value: k === '—' ? null : k }],
        depth,
        recs: rs,
        children: [],
      }
      g.children = buildTree(rs, depth + 1, g.dimValues)
      groups.push(g)
    }
    // مرتب‌سازی نزولی بر اساس نخستین سنجه برای سطح بیرونی (رتبه‌بندی معنادار)
    const val = (g: Group) => {
      const v = aggregateMeasure(g.recs, { ...spec.measures[0], alias: firstAlias }, fields, warnings)
      return typeof v === 'number' ? v : 0
    }
    if (depth === 0) groups.sort((a, b) => val(b) - val(a))
    else groups.sort((a, b) => String(a.dimValues[depth].value ?? '').localeCompare(String(b.dimValues[depth].value ?? ''), 'fa'))
    return groups
  }

  const tree = buildTree(data, 0, [])

  // ساخت سطرهای خروجی به‌صورت مسطح با جمع جزء پس از هر گروه والد
  const rows: PivotRow[] = []
  const emitRow = (
    g: Group | null,
    dimValues: { fieldId: string; value: string | null }[],
    depth: number,
    recs: DataRow[],
    isSubtotal: boolean
  ) => {
    const cells: PivotCell = {}
    for (const ck of colKeys) {
      const subset = ck === '§total' ? recs : recs.filter(r => keyOf(r[spec.colDim!]) === ck)
      for (let mi = 0; mi < spec.measures.length; mi++) {
        const m = spec.measures[mi]
        const alias = measureAliases[mi]
        cells[`${ck}||${alias}`] = aggregateMeasure(subset, m, fields, warnings)
      }
    }
    const rowTotals: Record<string, number> = {}
    for (let mi = 0; mi < spec.measures.length; mi++) {
      const m = spec.measures[mi]
      const alias = measureAliases[mi]
      rowTotals[alias] = aggregateMeasure(recs, m, fields, warnings)
    }
    rows.push({ dimValues, depth, isSubtotal, cells, rowTotals })
  }

  const walk = (groups: Group[]) => {
    for (const g of groups) {
      if (g.children.length === 0) {
        emitRow(g, g.dimValues, g.depth, g.recs, false)
      } else {
        // سطح میانی: فقط برچسب سطح + ادامه سلسله‌مراتب
        walk(g.children)
        if (spec.subtotals && g.depth < rowDims.length - 1) {
          emitRow(g, g.dimValues, g.depth, g.recs, true)
        }
      }
    }
  }
  walk(tree)

  // رتبه — بخش ۱۹.۴: فقط برای سطرهای سطح بیرونی بر اساس نخستین سنجه
  if (spec.showRank) {
    let rank = 1
    for (const r of rows) {
      if (r.isSubtotal || r.depth !== 0) continue
      r.rank = rank++
    }
  }

  // سهم از کل — بخش ۱۹.۴: نسبت جمع سطر به جمع کل (سنجه نخست)
  const colTotals: Record<string, number> = {}
  for (const ck of colKeys) {
    const subset = ck === '§total' ? data : data.filter(r => keyOf(r[spec.colDim!]) === ck)
    for (let mi = 0; mi < spec.measures.length; mi++) {
      const m = spec.measures[mi]
      const alias = measureAliases[mi]
      colTotals[`${ck}||${alias}`] = aggregateMeasure(subset, m, fields, warnings)
    }
  }
  const grandTotals: Record<string, number> = {}
  for (let mi = 0; mi < spec.measures.length; mi++) {
    const m = spec.measures[mi]
    const alias = measureAliases[mi]
    grandTotals[alias] = aggregateMeasure(data, m, fields, warnings)
  }

  if (spec.showShare) {
    const base = Math.abs(grandTotals[firstAlias] ?? 0)
    for (const r of rows) {
      const v = Math.abs(r.rowTotals[firstAlias] ?? 0)
      r.share = base > 0 ? (v / base) * 100 : 0
    }
  }

  // هشدار میانگین ساده در جمع جزء — بخش ۱۱.۴
  for (const m of spec.measures) {
    const f = fieldById.get(m.fieldId ?? '')
    if (m.agg === 'avg' && f?.unitKind === 'percent') {
      warnings.push(`میانگین ساده «${f.label}» غیرجمع‌پذیر است؛ جمع جزء و جمع کل روی داده خام همان دامنه محاسبه شده‌اند نه جمع میانگین‌ها (بخش ۱۱.۴ سند).`)
    }
  }

  return {
    colKeys,
    measureAliases,
    rows,
    colTotals,
    grandTotals,
    shareBase: spec.showShare ? firstAlias : undefined,
    rankBase: spec.showRank ? firstAlias : undefined,
    warnings,
    scannedRecords: scanned,
  }
}

export { SUBTOTAL_SUFFIX }
