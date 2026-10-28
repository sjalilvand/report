// موتور داشبورد هوشمند — تحلیل خودکار پس از بارگذاری اکسل
// بر اساس ساختار داده، ابعاد و سنجه‌ها و ستون تاریخ به‌صورت خودکار شناسایی می‌شوند و
// داشبورد کامل (کارت شاخص، روند دوره‌ای، تفکیک‌ها، ترکیب سهم، بینش‌های فارسی و جدول مقایسه)
// بدون هیچ پیکربندی ساخته می‌شود — تجربه‌ای مشابه ابزارهای داشبورد آماده اما روی داده واقعی سازمان.
//
// کاربر می‌تواند چیدمان را ویرایش کند (مخفی/جابه‌جایی/تغییر نوع نمودار/تغییر عنوان) و
// چیدمان ویرایش‌شده در config مجموعه‌داده ذخیره می‌شود (AutoDashLayout).

import { DataRow, FieldMeta } from './types'
import { num } from './query'
import { parseDateValue } from './jalali'
import { toLatinDigits } from './digits'

// ─────────────────────────── انواع خروجی ───────────────────────────

export interface AutoDashKpi {
  id: string
  label: string
  kind: 'sum' | 'avg' | 'count' | 'distinct' | 'max' | 'min'
  value: number
  fmt: 'currency' | 'number' | 'percent'
  unitHint?: string          // واحد ستون در صورت وجود (ریال/تومان/نفر/…)
  hint: string               // توضیح تولتیپ
  trend?: { pct: number | null; dir: 'up' | 'down' | 'flat'; label: string }
}

export interface AutoDashPoint { key: string; label: string; value: number; count: number; avg: number }

export interface AutoDashSeries {
  id: 'trend'
  title: string
  measureLabel: string
  dateLabel: string
  granularity: 'month' | 'quarter' | 'year'
  points: AutoDashPoint[]
  skipped: number
}

export interface AutoDashTrendRow {
  label: string
  count: number
  sum: number
  avg: number
  deltaPct: number | null // تغییر نسبت به دوره قبل
}

export interface AutoDashBreakdown {
  id: string
  dimensionId: string
  dimensionLabel: string
  measureId?: string
  measureLabel: string
  rows: { label: string; value: number; count: number; share: number }[]
  othersValue: number
  othersCount: number
  total: number
  topLimit: number
}

export interface AutoDashInsight {
  id: string
  tone: 'good' | 'warn' | 'bad' | 'info'
  icon: 'trophy' | 'trend' | 'pie' | 'shield' | 'calendar' | 'spark'
  title: string
  text: string
}

export interface AutoDashSummary {
  dimensionLabel: string
  measureLabel: string
  rows: { label: string; count: number; sum: number; avg: number; share: number }[]
  warnings: string[]
}

export interface AutoDash {
  title: string
  generatedAt: string
  rowCount: number
  dateLabel?: string
  dateRange?: { from: string; to: string; periods: number }
  primaryMeasureLabel?: string
  primaryDimensionLabel?: string
  kpis: AutoDashKpi[]
  trend?: AutoDashSeries
  trendTable: AutoDashTrendRow[]
  breakdowns: AutoDashBreakdown[]
  insights: AutoDashInsight[]
  summary?: AutoDashSummary
  warnings: string[]
}

// چیدمان ویرایش‌شده توسط کاربر — در config.autoDashLayout ذخیره می‌شود
export interface AutoDashLayout {
  title?: string
  hiddenKpis?: string[]
  kpiOrder?: string[]
  hiddenBreakdowns?: string[]
  breakdownOrder?: string[]
  hiddenSections?: ('trend' | 'breakdowns' | 'insights' | 'summary')[]
  chartTypes?: Record<string, 'area' | 'bar' | 'pie'> // برای روند و هر تفکیک
  topLimit?: number // تعداد دسته‌های برتر در هر تفکیک (۵ تا ۱۵)
  hiddenTemplates?: string[] // مخفی‌سازی تحلیل تخصصی قالب هوشمند (payslip/financial/profit)
}

const MEASURE_TYPES = ['amount', 'integer', 'decimal']
const DIM_TYPES = ['text', 'category', 'boolean', 'geo']

const MONTH_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const QUARTER_FA = ['بهار', 'تابستان', 'پاییز', 'زمستان']

function faNum(n: number | string): string { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]) }
function faGroup(n: number): string {
  const s = Math.round(Math.abs(n)).toLocaleString('en-US').replace(/,/g, '٬')
  return (n < 0 ? '−' : '') + faNum(s)
}
function pad2(n: number): string { return String(n).padStart(2, '0') }

// ─────────────────────────── تشخیص ساختار ───────────────────────────

interface DetectedStructure {
  measures: FieldMeta[]      // مرتب بر اساس اندازه جمع
  dimensions: FieldMeta[]    // مرتب بر اساس مناسب‌بودن برای تفکیک
  dateField?: FieldMeta
}

export function detectStructure(records: DataRow[], fields: FieldMeta[]): DetectedStructure {
  // سنجه‌ها: نوع عددی یا نقش سنجه — بر اساس بزرگ‌تربودن جمع مطلق رتبه می‌گیرند
  const measureCandidates = fields.filter(f => MEASURE_TYPES.includes(f.type) || f.role === 'measure')
  const measureScores = measureCandidates.map(f => {
    let s = 0
    for (const r of records) { const v = num(r[f.id]); if (v !== null) s += Math.abs(v) }
    return { f, s }
  }).sort((a, b) => b.s - a.s)

  // ابعاد: متن/دسته/بولی با کاردینالیتی معقول (۲ تا حداکثر ۶۰ یا نصف رکوردها)
  const dimCandidates = fields.filter(f => DIM_TYPES.includes(f.type) || f.role === 'dimension')
  // برای مجموعه‌داده‌های کوچک، سقف حداقل ۱۲ تا بُعدهای واقعی حذف نشوند
  const maxCard = Math.max(12, Math.min(60, Math.floor(records.length / 3) || 60))
  const dimScores = dimCandidates.map(f => {
    const set = new Set<string>()
    let nonEmpty = 0
    for (const r of records) {
      const s = r[f.id] === null || r[f.id] === undefined ? '' : String(r[f.id]).trim()
      if (s !== '') { set.add(s); nonEmpty++ }
    }
    const card = set.size
    let score = -1
    if (card >= 2 && card <= maxCard && nonEmpty > 0) {
      // دسته‌های با کاردینالیتی نزدیک به ۸ بهترین خوانایی را دارند؛ نقش بُعد امتیاز اضافه دارد
      score = 100 - Math.abs(card - 8) * 2 + (f.role === 'dimension' ? 20 : 0) + (f.type === 'category' ? 5 : 0)
      if (card === nonEmpty && card > 30) score = -1 // شناسه یکتا، بُعد نیست
    }
    return { f, score, card }
  }).sort((a, b) => b.score - a.score)

  const dateField = fields.find(f => f.type === 'date' || f.type === 'datetime')

  return {
    measures: measureScores.filter(m => m.s !== 0 || m.f.role === 'measure').map(m => m.f),
    dimensions: dimScores.filter(d => d.score >= 0).map(d => d.f),
    dateField,
  }
}

// ─────────────────────────── دوره‌بندی تاریخ ───────────────────────────

interface PeriodKey { key: string; label: string; sort: string; jy: number; jm: number }

function periodOfRaw(raw: unknown, g: 'month' | 'quarter' | 'year'): PeriodKey | null {
  const p = parseDateValue(raw)
  if (!p.ok || p.jy === undefined || p.jm === undefined) return null
  if (g === 'year') return { key: `Y${p.jy}`, label: `سال ${faNum(p.jy)}`, sort: `${p.jy}`, jy: p.jy, jm: p.jm }
  if (g === 'quarter') {
    const q = Math.floor((p.jm - 1) / 3) + 1
    return { key: `Q${p.jy}-${q}`, label: `${QUARTER_FA[q - 1]} ${faNum(p.jy)}`, sort: `${p.jy}-${q}`, jy: p.jy, jm: p.jm }
  }
  return { key: `M${p.jy}-${pad2(p.jm)}`, label: `${MONTH_FA[p.jm - 1]} ${faNum(p.jy)}`, sort: `${p.jy}-${pad2(p.jm)}`, jy: p.jy, jm: p.jm }
}

function chooseGranularity(records: DataRow[], dateField: FieldMeta): 'month' | 'quarter' | 'year' {
  const years = new Set<string>()
  const months = new Set<string>()
  for (const r of records.slice(0, 5000)) {
    const p = parseDateValue(r[dateField.id])
    if (p.ok && p.jy !== undefined && p.jm !== undefined) {
      years.add(String(p.jy))
      months.add(`${p.jy}-${p.jm}`)
    }
  }
  if (years.size > 4) return 'year'
  if (months.size > 24) return 'quarter'
  return 'month'
}

// ─────────────────────────── ابزار تجمیع ───────────────────────────

function sumField(records: DataRow[], f: FieldMeta): { sum: number; count: number } {
  let s = 0, c = 0
  for (const r of records) {
    const v = num(r[f.id])
    if (v !== null) { s += v; c++ }
  }
  return { sum: s, count: c }
}

function growthPct(cur: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined || prev === 0) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}

function trendOf(pct: number | null): { pct: number | null; dir: 'up' | 'down' | 'flat'; label: string } {
  if (pct === null || !Number.isFinite(pct)) return { pct: null, dir: 'flat', label: '—' }
  const dir = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return { pct, dir, label: `${sign}${faNum(Math.abs(Math.round(pct * 10) / 10))}٪ نسبت به دوره قبل` }
}

// ─────────────────────────── موتور اصلی ───────────────────────────

export function buildAutoDashboard(datasetName: string, records: DataRow[], fields: FieldMeta[]): AutoDash {
  const warnings: string[] = []
  const st = detectStructure(records, fields)
  const primaryMeasure = st.measures[0]
  const secondMeasure = st.measures[1]
  const primaryDim = st.dimensions[0]
  const secondDim = st.dimensions[1]
  const dateField = st.dateField

  const dash: AutoDash = {
    title: `داشبورد هوشمند — ${datasetName}`,
    generatedAt: new Date().toISOString(),
    rowCount: records.length,
    dateLabel: dateField?.label,
    primaryMeasureLabel: primaryMeasure?.label,
    primaryDimensionLabel: primaryDim?.label,
    kpis: [],
    trendTable: [],
    breakdowns: [],
    insights: [],
    warnings,
  }

  if (records.length === 0) {
    warnings.push('این مجموعه‌داده رکوردی ندارد؛ پس از بارگذاری داده داشبورد ساخته می‌شود.')
    return dash
  }

  // ── بازه تاریخ و دوره‌بندی ──
  let dateRange: AutoDash['dateRange'] | undefined
  let granularity: 'month' | 'quarter' | 'year' = 'month'
  if (dateField) {
    let minIso: string | null = null, maxIso: string | null = null
    let minFa: string | null = null, maxFa: string | null = null
    let invalid = 0
    for (const r of records) {
      const p = parseDateValue(r[dateField.id])
      if (p.ok && p.iso) {
        if (!minIso || p.iso < minIso) {
          minIso = p.iso
          minFa = p.jy !== undefined && p.jm !== undefined ? `${faNum(p.jy)}/${pad2(p.jm)}/${pad2(p.jd ?? 1)}` : p.iso
        }
        if (!maxIso || p.iso > maxIso) {
          maxIso = p.iso
          maxFa = p.jy !== undefined && p.jm !== undefined ? `${faNum(p.jy)}/${pad2(p.jm)}/${pad2(p.jd ?? 1)}` : p.iso
        }
      } else if (r[dateField.id] !== null && String(r[dateField.id]).trim() !== '') invalid++
    }
    if (minIso && maxIso) {
      granularity = chooseGranularity(records, dateField)
      const periods = new Set<string>()
      for (const r of records) {
        const pk = periodOfRaw(r[dateField.id], granularity)
        if (pk) periods.add(pk.key)
      }
      dateRange = { from: minFa ?? minIso, to: maxFa ?? maxIso, periods: periods.size }
      dash.dateRange = dateRange
    }
    if (invalid > 0) warnings.push(`${faNum(invalid)} مقدار تاریخ نامعتبر در ستون «${dateField.label}» از محاسبه روند کنار گذاشته شد (بخش ۲۱.۳ سند).`)
  }

  // ── روند دوره‌ای (سنجه اصلی بر حسب دوره) ──
  const seriesRows: AutoDashTrendRow[] = []
  if (dateField) {
    const byPeriod = new Map<string, { label: string; vals: number[] }>()
    let skipped = 0
    for (const r of records) {
      const pk = periodOfRaw(r[dateField.id], granularity)
      if (!pk) { skipped++; continue }
      const v = primaryMeasure ? num(r[primaryMeasure.id]) : 1
      if (primaryMeasure && v === null) { skipped++; continue }
      const cur = byPeriod.get(pk.key)
      if (cur) cur.vals.push(v ?? 1)
      else byPeriod.set(pk.key, { label: pk.label, vals: [v ?? 1] })
    }
    const sorted = [...byPeriod.entries()].sort((a, b) => {
      const ka = a[0], kb = b[0]
      return ka < kb ? -1 : ka > kb ? 1 : 0
    })
    let prevSum: number | null = null
    for (const [, cur] of sorted) {
      const sum = cur.vals.reduce((a, b) => a + b, 0)
      const row: AutoDashTrendRow = {
        label: cur.label,
        count: cur.vals.length,
        sum,
        avg: cur.vals.length ? sum / cur.vals.length : 0,
        deltaPct: growthPct(sum, prevSum),
      }
      seriesRows.push(row)
      prevSum = sum
    }
    if (sorted.length >= 2) {
      dash.trend = {
        id: 'trend',
        title: `روند ${primaryMeasure ? `«${primaryMeasure.label}»` : 'تعداد رکورد'} بر حسب ${granularity === 'month' ? 'ماه' : granularity === 'quarter' ? 'فصل' : 'سال'}`,
        measureLabel: primaryMeasure?.label ?? 'تعداد رکورد',
        dateLabel: dateField.label,
        granularity,
        points: seriesRows.map(r => ({ key: r.label, label: r.label, value: r.sum, count: r.count, avg: r.avg })),
        skipped,
      }
      dash.trendTable = seriesRows
    } else if (sorted.length === 1) {
      warnings.push('تنها یک دوره زمانی در داده وجود دارد؛ نمودار روند پس از افزودن دوره‌های بیشتر نمایش داده می‌شود.')
    } else {
      warnings.push(`هیچ مقدار تاریخ قابل خواندن در ستون «${dateField.label}» یافت نشد؛ نوع ستون را در گام «ستون‌ها» بررسی کنید.`)
    }
  }

  // ── کارت‌های شاخص (KPI) ──
  const kpis: AutoDashKpi[] = []
  kpis.push({
    id: 'kpi-count', label: 'تعداد رکورد', kind: 'count', value: records.length, fmt: 'number',
    hint: 'تعداد کل رکوردهای نسخه جاری مجموعه‌داده پس از پاک‌سازی و تبدیل‌ها',
  })
  const lastPeriodSum = seriesRows.length ? seriesRows[seriesRows.length - 1].sum : undefined
  const prevPeriodSum = seriesRows.length >= 2 ? seriesRows[seriesRows.length - 2].sum : undefined
  if (primaryMeasure) {
    const { sum } = sumField(records, primaryMeasure)
    const kpi: AutoDashKpi = {
      id: 'kpi-sum', label: `جمع ${primaryMeasure.label}`, kind: 'sum', value: sum,
      fmt: primaryMeasure.type === 'amount' ? 'currency' : 'number', unitHint: primaryMeasure.unit,
      hint: `جمع کل ستون «${primaryMeasure.label}» در همه رکوردها`,
    }
    if (lastPeriodSum !== undefined) kpi.trend = trendOf(growthPct(lastPeriodSum, prevPeriodSum))
    kpis.push(kpi)
    const { sum: sum2, count: cnt } = sumField(records, primaryMeasure)
    if (cnt > 0) {
      kpis.push({
        id: 'kpi-avg', label: `میانگین ${primaryMeasure.label}`, kind: 'avg', value: sum2 / cnt,
        fmt: primaryMeasure.type === 'amount' ? 'currency' : 'number', unitHint: primaryMeasure.unit,
        hint: `میانگین «${primaryMeasure.label}» به‌ازای هر رکورد (تعداد مقادیر: ${cnt})`,
      })
    }
  }
  if (secondMeasure) {
    const { sum } = sumField(records, secondMeasure)
    kpis.push({
      id: 'kpi-sum2', label: `جمع ${secondMeasure.label}`, kind: 'sum', value: sum,
      fmt: secondMeasure.type === 'amount' ? 'currency' : 'number', unitHint: secondMeasure.unit,
      hint: `جمع کل ستون «${secondMeasure.label}» — دومین سنجه عددی شناسایی‌شده`,
    })
  }
  if (primaryDim) {
    const set = new Set<string>()
    for (const r of records) {
      const s = r[primaryDim.id] === null || r[primaryDim.id] === undefined ? '' : String(r[primaryDim.id]).trim()
      if (s !== '') set.add(s)
    }
    kpis.push({
      id: 'kpi-distinct', label: `تعداد ${primaryDim.label}`, kind: 'distinct', value: set.size, fmt: 'number',
      hint: `تعداد مقدار متمایز ستون «${primaryDim.label}» — گروه‌بندی اصلی داشبورد`,
    })
  }
  if (lastPeriodSum !== undefined && primaryMeasure) {
    kpis.push({
      id: 'kpi-last', label: `آخرین دوره — ${seriesRows[seriesRows.length - 1].label}`, kind: 'sum', value: lastPeriodSum,
      fmt: primaryMeasure.type === 'amount' ? 'currency' : 'number', unitHint: primaryMeasure.unit,
      hint: `جمع «${primaryMeasure.label}» در آخرین دوره زمانی شناسایی‌شده از داده`,
    })
  }
  dash.kpis = kpis.slice(0, 7)

  // ── تفکیک‌ها (بُعد × سنجه اصلی) ──
  const dimsForBreakdown = [primaryDim, secondDim].filter(Boolean) as FieldMeta[]
  for (const dim of dimsForBreakdown) {
    const groups = new Map<string, { value: number; count: number }>()
    let emptyCount = 0
    for (const r of records) {
      const raw = r[dim.id]
      const label = raw === null || raw === undefined || String(raw).trim() === '' ? 'نامشخص' : String(raw).trim()
      if (label === 'نامشخص') emptyCount++
      let v = 1
      if (primaryMeasure) {
        const nv = num(r[primaryMeasure.id])
        if (nv === null) { continue } // رکورد بدون مقدار سنجه در تفکیک مالی محسوب نمی‌شود
        v = nv
      }
      const cur = groups.get(label)
      if (cur) { cur.value += v; cur.count++ }
      else groups.set(label, { value: v, count: 1 })
    }
    const sortedGroups = [...groups.entries()].sort((a, b) => b[1].value - a[1].value)
    const total = sortedGroups.reduce((s, [, g]) => s + g.value, 0)
    const topLimit = 8
    const rows = sortedGroups.slice(0, topLimit).map(([label, g]) => ({
      label, value: g.value, count: g.count,
      share: total !== 0 ? (g.value / total) * 100 : 0,
    }))
    const others = sortedGroups.slice(topLimit)
    dash.breakdowns.push({
      id: `bd-${dim.id}`,
      dimensionId: dim.id, dimensionLabel: dim.label,
      measureId: primaryMeasure?.id, measureLabel: primaryMeasure?.label ?? 'تعداد رکورد',
      rows,
      othersValue: others.reduce((s, [, g]) => s + g.value, 0),
      othersCount: others.reduce((s, [, g]) => s + g.count, 0),
      total, topLimit,
    })
  }

  // ── جدول خلاصه (بُعد اصلی) ──
  if (primaryDim) {
    const bd = dash.breakdowns[0]
    if (bd) {
      dash.summary = {
        dimensionLabel: bd.dimensionLabel,
        measureLabel: bd.measureLabel,
        rows: bd.rows.map(r => ({ label: r.label, count: r.count, sum: r.value, avg: r.count ? r.value / r.count : 0, share: r.share })),
        warnings: [],
      }
    }
  }

  // ── بینش‌های خودکار (متن فارسی) ──
  const insights: AutoDashInsight[] = []
  const bd = dash.breakdowns[0]
  if (bd && bd.rows.length > 0 && primaryMeasure) {
    const top = bd.rows[0]
    const fmtPct = (v: number) => faNum(Math.round(v * 10) / 10) + '٪'
    insights.push({
      id: 'ins-top', tone: 'good', icon: 'trophy',
      title: `بیشترین سهم: ${top.label}`,
      text: `«${top.label}» با ${fmtPct(top.share)} از جمع «${primaryMeasure.label}» بیشترین سهم را دارد (معادل ${faGroup(top.value)} در ${faNum(top.count)} رکورد).`,
    })
    const top3 = bd.rows.slice(0, 3).reduce((s, r) => s + r.share, 0)
    if (bd.rows.length >= 3 && top3 >= 70) {
      insights.push({
        id: 'ins-conc', tone: 'warn', icon: 'pie',
        title: 'تمرکز بالا در چند دسته',
        text: `سه دسته نخست (${bd.rows.slice(0, 3).map(r => r.label).join('، ')}) در مجموع ${fmtPct(top3)} از کل را پوشش می‌دهند؛ تمرکز بالا می‌تواند ریسک وابستگی ایجاد کند.`,
      })
    }
  }
  if (dash.trend && dash.trend.points.length >= 2) {
    const pts = dash.trend.points
    const last = pts[pts.length - 1]
    const prev = pts[pts.length - 2]
    const g = growthPct(last.value, prev.value)
    const peak = pts.reduce((a, b) => (b.value > a.value ? b : a))
    if (g !== null && Number.isFinite(g)) {
      const up = g >= 0
      insights.push({
        id: 'ins-growth', tone: up ? 'good' : 'bad', icon: 'trend',
        title: `جهت حرکت: ${up ? 'صعودی' : 'نزولی'}`,
        text: `${primaryMeasure ? `جمع «${primaryMeasure.label}»` : 'تعداد رکورد'} در «${last.label}» نسبت به «${prev.label}» ${faNum(Math.abs(Math.round(g * 10) / 10))}٪ ${up ? 'افزایش' : 'کاهش'} یافته است.`,
      })
    }
    insights.push({
      id: 'ins-peak', tone: 'info', icon: 'spark',
      title: `اوج دوره‌ای: ${peak.label}`,
      text: `بیشترین مقدار دوره‌ای در «${peak.label}» ثبت شده است؛ مقایسه سایر دوره‌ها با این نقطه می‌تواند الگوی فصلی را نشان دهد.`,
    })
  }
  if (dateRange) {
    insights.push({
      id: 'ins-range', tone: 'info', icon: 'calendar',
      title: 'بازه زمانی داده',
      text: `داده از «${dateRange.from}» تا «${dateRange.to}» را پوشش می‌دهد (${faNum(dateRange.periods)} دوره ${dash.trend?.granularity === 'year' ? 'سالی' : dash.trend?.granularity === 'quarter' ? 'فصلی' : 'ماهانه'}).`,
    })
  }
  if (primaryMeasure) {
    let nullCount = 0
    for (const r of records) if (num(r[primaryMeasure.id]) === null) nullCount++
    const nullPct = records.length ? (nullCount / records.length) * 100 : 0
    if (nullPct > 5) {
      insights.push({
        id: 'ins-quality', tone: 'warn', icon: 'shield',
        title: 'کیفیت داده: مقادیر خالی',
        text: `${faNum(nullCount)} رکورد (${faNum(Math.round(nullPct * 10) / 10)}٪) مقدار خالی یا نامعتبر در ستون «${primaryMeasure.label}» دارند؛ برای تحلیل دقیق‌تر از ابزار پاک‌سازی گام ۴ استفاده کنید.`,
      })
    } else {
      insights.push({
        id: 'ins-quality-ok', tone: 'good', icon: 'shield',
        title: 'کیفیت داده: مناسب',
        text: `ستون «${primaryMeasure.label}» در ${faNum(Math.round((100 - nullPct) * 10) / 10)}٪ رکوردها مقدار معتبر دارد؛ پایه محاسبات داشبورد قابل اعتماد است.`,
      })
    }
  }
  dash.insights = insights

  if (!primaryMeasure) warnings.push('هیچ ستون عددی شناسایی نشد؛ داشبورد بر پایه تعداد رکورد ساخته شد. نوع ستون‌ها را در گام «ستون‌ها» بازبینی کنید.')
  if (!primaryDim) warnings.push('ستون دسته‌بندی مناسبی برای تفکیک یافت نشد؛ تفکیک‌ها مخفی شده‌اند.')
  if (!dateField) warnings.push('ستون تاریخ شناسایی نشد؛ نمودار روند دوره‌ای غیرفعال است. اگر تاریخ دارید، نوع ستون را در گام «ستون‌ها» روی «تاریخ» بگذارید و داشبورد را بازسازی کنید.')

  return dash
}

// اعمال چیدمان ویرایش‌شده کاربر روی داشبورد
export function applyLayout(dash: AutoDash, layout: AutoDashLayout | null | undefined): AutoDash {
  if (!layout) return dash
  const title = layout.title?.trim() || dash.title
  const kpis = dash.kpis
    .filter(k => !(layout.hiddenKpis ?? []).includes(k.id))
    .sort((a, b) => {
      const ia = layout.kpiOrder?.indexOf(a.id) ?? -1
      const ib = layout.kpiOrder?.indexOf(b.id) ?? -1
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  const breakdowns = dash.breakdowns
    .filter(b => !(layout.hiddenBreakdowns ?? []).includes(b.id))
    .sort((a, b) => {
      const ia = layout.breakdownOrder?.indexOf(a.id) ?? -1
      const ib = layout.breakdownOrder?.indexOf(b.id) ?? -1
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    .map(b => {
      const limit = layout.topLimit ?? b.topLimit
      if (limit >= b.rows.length) return b
      const rows = b.rows.slice(0, limit)
      const hidden = b.rows.slice(limit)
      return {
        ...b, rows, topLimit: limit,
        othersValue: b.othersValue + hidden.reduce((s, r) => s + r.value, 0),
        othersCount: b.othersCount + hidden.reduce((s, r) => s + r.count, 0),
      }
    })
  const has = (s: NonNullable<AutoDashLayout['hiddenSections']>[number]) => (layout.hiddenSections ?? []).includes(s)
  return {
    ...dash,
    title,
    kpis,
    breakdowns,
    trend: has('trend') ? undefined : dash.trend,
    trendTable: has('trend') ? [] : dash.trendTable,
    insights: has('insights') ? [] : dash.insights,
    summary: has('summary') ? undefined : dash.summary,
  }
}

// اعتبارسنجی چیدمان ورودی برای ذخیره
export function sanitizeLayout(input: unknown): AutoDashLayout {
  const l = (input ?? {}) as AutoDashLayout
  const out: AutoDashLayout = {}
  if (typeof l.title === 'string' && l.title.trim() !== '' && l.title.length <= 120) out.title = l.title.trim()
  if (Array.isArray(l.hiddenKpis)) out.hiddenKpis = l.hiddenKpis.filter(x => typeof x === 'string').slice(0, 30)
  if (Array.isArray(l.kpiOrder)) out.kpiOrder = l.kpiOrder.filter(x => typeof x === 'string').slice(0, 30)
  if (Array.isArray(l.hiddenBreakdowns)) out.hiddenBreakdowns = l.hiddenBreakdowns.filter(x => typeof x === 'string').slice(0, 30)
  if (Array.isArray(l.breakdownOrder)) out.breakdownOrder = l.breakdownOrder.filter(x => typeof x === 'string').slice(0, 30)
  if (Array.isArray(l.hiddenSections)) out.hiddenSections = l.hiddenSections.filter(x => ['trend', 'breakdowns', 'insights', 'summary'].includes(x)).slice(0, 4)
  if (Array.isArray(l.hiddenTemplates)) out.hiddenTemplates = l.hiddenTemplates.filter(x => typeof x === 'string' && ['payslip', 'financial', 'profit'].includes(x)).slice(0, 3)
  if (l.chartTypes && typeof l.chartTypes === 'object' && !Array.isArray(l.chartTypes)) {
    const ct: Record<string, 'area' | 'bar' | 'pie'> = {}
    for (const [k, v] of Object.entries(l.chartTypes)) {
      if (typeof k === 'string' && k.length <= 80 && ['area', 'bar', 'pie'].includes(String(v))) ct[k] = v as 'area' | 'bar' | 'pie'
    }
    out.chartTypes = ct
  }
  if (typeof l.topLimit === 'number' && Number.isFinite(l.topLimit)) out.topLimit = Math.min(15, Math.max(5, Math.round(l.topLimit)))
  return out
}

// تشخیص سریع نوع ستون از داده خام — برای اطمینان از صحت سنجه/بُعد در نمایش
export function isLikelyNumericLabel(label: string): boolean {
  const lat = toLatinDigits(label)
  return /^-?\d+([.,]\d+)?$/.test(lat.trim())
}
