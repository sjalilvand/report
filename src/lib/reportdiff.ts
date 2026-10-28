// موتور مقایسه نسخه‌های گزارش — بخش ۲۶.۱ سند («مقایسه نسخه‌ها»)
// پیکربندی دو نسخه گزارش را به فهرست تغییرات قابل فهم انسانی تبدیل می‌کند:
// تغییرات متادیتا، ابعاد، سنجه‌ها، فیلترها، نوع نمودار، جدول محوری و نمودارهای تخصصی

import { FieldMeta } from './types'

export interface ReportConfigLike {
  dimensions?: string[]
  measures?: { fieldId?: string; agg?: string; displayUnit?: string; alias?: string }[]
  filters?: { fieldId: string; op: string; value?: unknown; values?: unknown[]; relationId?: string }[]
  chartType?: string
  pivot?: Record<string, unknown>
  special?: Record<string, unknown>
}

export type DiffOp = 'added' | 'removed' | 'changed'

export interface VersionChangeItem {
  kind: 'meta' | 'dim' | 'measure' | 'filter' | 'chart' | 'pivot' | 'special'
  kindLabel: string
  op: DiffOp
  opLabel: string
  label: string // شرح تغییر
  from?: string
  to?: string
}

export interface ReportVersionDiff {
  fromVersion: number
  toVersion: number
  items: VersionChangeItem[]
  summary: { added: number; removed: number; changed: number }
  identical: boolean
}

const AGG_LABELS: Record<string, string> = {
  sum: 'جمع', avg: 'میانگین', count: 'تعداد رکورد', countDistinct: 'تعداد متمایز',
  min: 'کمینه', max: 'بیشینه', median: 'میانه', weightedAvg: 'میانگین وزنی', last: 'آخرین مقدار',
}

const CHART_LABELS: Record<string, string> = {
  table: 'جدول', pivot: 'جدول محوری', matrix: 'ماتریس', heatmap: 'نقشه حرارتی',
  bar: 'نمودار میله‌ای', line: 'نمودار خطی', pie: 'نمودار دایره‌ای', kpi: 'کارت شاخص', dashboard: 'داشبورد',
}

const OP_LABELS: Record<string, string> = {
  eq: 'مساوی', neq: 'نامساوی', in: 'در فهرست', gt: 'بزرگ‌تر از', gte: 'بزرگ‌تر یا مساوی',
  lt: 'کوچک‌تر از', lte: 'کوچک‌تر یا مساوی', contains: 'شامل', notnull: 'خالی نباشد', isnull: 'خالی باشد',
}

const KIND_LABELS: Record<VersionChangeItem['kind'], string> = {
  meta: 'اطلاعات کلی', dim: 'بُعد', measure: 'سنجه', filter: 'فیلتر',
  chart: 'نوع نمایش', pivot: 'جدول محوری', special: 'نمودار تخصصی',
}

const OP_FA: Record<DiffOp, string> = { added: 'افزوده شد', removed: 'حذف شد', changed: 'تغییر کرد' }

function labelOfField(fields: FieldMeta[], id?: string): string {
  if (!id) return '—'
  return fields.find(f => f.id === id)?.label ?? id
}

function measureKey(m: { fieldId?: string; agg?: string }): string {
  return `${m.agg ?? 'sum'}(${m.fieldId ?? '*'})`
}

function measureLabel(m: { fieldId?: string; agg?: string; displayUnit?: string }, fields: FieldMeta[]): string {
  const agg = AGG_LABELS[m.agg ?? 'sum'] ?? m.agg ?? ''
  return `${agg} ${labelOfField(fields, m.fieldId)}${m.displayUnit ? ` (${m.displayUnit})` : ''}`
}

function filterLabel(f: { fieldId: string; op: string; value?: unknown; values?: unknown[] }, fields: FieldMeta[]): string {
  const val = f.values && f.values.length > 0 ? f.values.join('، ') : String(f.value ?? '')
  return `${labelOfField(fields, f.fieldId)} ${(OP_LABELS[f.op] ?? f.op)} «${val}»`
}

function str(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

// مقایسه دو پیکربندی گزارش — خروجی: فهرست تغییرات + خلاصه شمارشی
export function diffReportConfigs(
  fromVersion: number,
  toVersion: number,
  oldCfg: ReportConfigLike,
  newCfg: ReportConfigLike,
  fields: FieldMeta[]
): ReportVersionDiff {
  const items: VersionChangeItem[] = []

  // نوع نمایش
  const oldChart = str(oldCfg.chartType || 'table')
  const newChart = str(newCfg.chartType || 'table')
  if (oldChart !== newChart) {
    items.push({
      kind: 'chart', kindLabel: KIND_LABELS.chart, op: 'changed', opLabel: OP_FA.changed,
      label: `نوع نمایش گزارش`,
      from: CHART_LABELS[oldChart] ?? oldChart,
      to: CHART_LABELS[newChart] ?? newChart,
    })
  }

  // ابعاد
  const oldDims = oldCfg.dimensions ?? []
  const newDims = newCfg.dimensions ?? []
  for (const d of newDims) {
    if (!oldDims.includes(d)) {
      items.push({ kind: 'dim', kindLabel: KIND_LABELS.dim, op: 'added', opLabel: OP_FA.added, label: labelOfField(fields, d) })
    }
  }
  for (const d of oldDims) {
    if (!newDims.includes(d)) {
      items.push({ kind: 'dim', kindLabel: KIND_LABELS.dim, op: 'removed', opLabel: OP_FA.removed, label: labelOfField(fields, d) })
    }
  }

  // سنجه‌ها — کلید: agg(fieldId)
  const oldMeasures = oldCfg.measures ?? []
  const newMeasures = newCfg.measures ?? []
  const oldMap = new Map(oldMeasures.map(m => [measureKey(m), m]))
  const newMap = new Map(newMeasures.map(m => [measureKey(m), m]))
  for (const [key, m] of newMap) {
    if (!oldMap.has(key)) {
      items.push({ kind: 'measure', kindLabel: KIND_LABELS.measure, op: 'added', opLabel: OP_FA.added, label: measureLabel(m, fields) })
    } else {
      const o = oldMap.get(key)!
      const oldUnit = str(o.displayUnit)
      const newUnit = str(m.displayUnit)
      if (oldUnit !== newUnit) {
        items.push({
          kind: 'measure', kindLabel: KIND_LABELS.measure, op: 'changed', opLabel: OP_FA.changed,
          label: `واحد نمایش ${measureLabel(m, fields)}`, from: oldUnit, to: newUnit,
        })
      }
    }
  }
  for (const [key, m] of oldMap) {
    if (!newMap.has(key)) {
      items.push({ kind: 'measure', kindLabel: KIND_LABELS.measure, op: 'removed', opLabel: OP_FA.removed, label: measureLabel(m, fields) })
    }
  }

  // فیلترها — کلید: fieldId + op (مقدار ممکن است تغییر کند)
  const oldFilters = oldCfg.filters ?? []
  const newFilters = newCfg.filters ?? []
  const fKey = (f: { fieldId: string; op: string }) => `${f.fieldId}|${f.op}`
  const oldFMap = new Map(oldFilters.map(f => [fKey(f), f]))
  const newFMap = new Map(newFilters.map(f => [fKey(f), f]))
  for (const [key, f] of newFMap) {
    if (!oldFMap.has(key)) {
      items.push({ kind: 'filter', kindLabel: KIND_LABELS.filter, op: 'added', opLabel: OP_FA.added, label: filterLabel(f, fields) })
    } else {
      const o = oldFMap.get(key)!
      const oldVal = str(o.values && o.values.length > 0 ? o.values.join('، ') : o.value)
      const newVal = str(f.values && f.values.length > 0 ? f.values.join('، ') : f.value)
      if (oldVal !== newVal) {
        items.push({
          kind: 'filter', kindLabel: KIND_LABELS.filter, op: 'changed', opLabel: OP_FA.changed,
          label: `مقدار فیلتر ${labelOfField(fields, f.fieldId)} ${(OP_LABELS[f.op] ?? f.op)}`, from: oldVal, to: newVal,
        })
      }
    }
  }
  for (const [key, f] of oldFMap) {
    if (!newFMap.has(key)) {
      items.push({ kind: 'filter', kindLabel: KIND_LABELS.filter, op: 'removed', opLabel: OP_FA.removed, label: filterLabel(f, fields) })
    }
  }

  // جدول محوری
  const oldPivot = oldCfg.pivot ?? {}
  const newPivot = newCfg.pivot ?? {}
  const pivotEntries: [string, string][] = [
    ['rowDims', 'سطرهای جدول محوری'],
    ['colDim', 'ستون جدول محوری'],
  ]
  for (const [k, lbl] of pivotEntries) {
    const o = JSON.stringify(oldPivot[k] ?? null)
    const n = JSON.stringify(newPivot[k] ?? null)
    if (o !== n) {
      items.push({
        kind: 'pivot', kindLabel: KIND_LABELS.pivot, op: 'changed', opLabel: OP_FA.changed,
        label: lbl,
        from: arrayFa(oldPivot[k]),
        to: arrayFa(newPivot[k]),
      })
    }
  }
  // گزینه‌های دیگر جدول محوری (جمع کل، مرتب‌سازی و ...)
  const pivotOptKeys = new Set([...Object.keys(oldPivot), ...Object.keys(newPivot)])
  for (const k of pivotOptKeys) {
    if (k === 'rowDims' || k === 'colDim') continue
    const o = JSON.stringify(oldPivot[k] ?? null)
    const n = JSON.stringify(newPivot[k] ?? null)
    if (o !== n) {
      items.push({ kind: 'pivot', kindLabel: KIND_LABELS.pivot, op: 'changed', opLabel: OP_FA.changed, label: `گزینه جدول محوری «${k}»`, from: str(o), to: str(n) })
    }
  }

  // نمودارهای تخصصی (هیستوگرام/جعبه‌ای)
  const oldSpecial = oldCfg.special ?? {}
  const newSpecial = newCfg.special ?? {}
  const specialKeys = new Set([...Object.keys(oldSpecial), ...Object.keys(newSpecial)])
  const specialLabels: Record<string, string> = {
    fieldId: 'ستون نمودار تخصصی', binCount: 'تعداد بازه هیستوگرام', groupFieldId: 'ستون گروه‌بندی نمودار جعبه‌ای',
  }
  for (const k of specialKeys) {
    const o = JSON.stringify(oldSpecial[k] ?? null)
    const n = JSON.stringify(newSpecial[k] ?? null)
    if (o !== n) {
      const isField = k.endsWith('fieldId') || k === 'fieldId'
      items.push({
        kind: 'special', kindLabel: KIND_LABELS.special, op: 'changed', opLabel: OP_FA.changed,
        label: specialLabels[k] ?? `گزینه «${k}»`,
        from: isField ? labelOfField(fields, oldSpecial[k] as string) : str(oldSpecial[k]),
        to: isField ? labelOfField(fields, newSpecial[k] as string) : str(newSpecial[k]),
      })
    }
  }

  const summary = {
    added: items.filter(i => i.op === 'added').length,
    removed: items.filter(i => i.op === 'removed').length,
    changed: items.filter(i => i.op === 'changed').length,
  }

  return {
    fromVersion,
    toVersion,
    items,
    summary,
    identical: items.length === 0,
  }
}

function arrayFa(v: unknown): string {
  if (Array.isArray(v)) return v.length > 0 ? v.map(String).join('، ') : '—'
  return str(v)
}
