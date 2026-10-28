// سازنده‌های تحلیل تخصصی قالب‌های هوشمند — فیش حقوقی، صورت مالی، سود
// هر سازنده از روی رکوردها و ستون‌های شناسایی‌شده، کارت شاخص، نمودار، جدول تحلیلی،
// بینش فارسی و «گزارش هوشمند» متنی می‌سازد — بدون هیچ پیکربندی از سوی کاربر.

import { DataRow, FieldMeta } from './types'
import { num } from './query'
import { parseDateValue } from './jalali'
import type { SmartTemplateKind, SmartAnalysis, SmartKpi, SmartChartSpec, SmartTable, SmartInsight, SmartReportBlock } from './smarttemplates'

// ─────────────────────────── ابزارهای مشترک ───────────────────────────

const MONTH_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

function faNum(n: number | string): string { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]) }
function faGroup(n: number): string {
  const s = Math.round(Math.abs(n)).toLocaleString('en-US').replace(/,/g, '٬')
  return (n < 0 ? '−' : '') + faNum(s)
}
function fmtMoney(n: number): string { return faGroup(n) }
function fmtPct(p: number): string { return `${faNum(Math.round(p * 10) / 10)}٪` }
function pctOf(part: number, whole: number): number | null { return whole !== 0 ? (part / Math.abs(whole)) * 100 : null }
function growth(cur: number, prev: number): number | null { return prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null }
function str(v: unknown): string { return v === null || v === undefined ? '' : String(v).trim() }

export interface AggRow { label: string; count: number; sums: Map<string, number> }

// تجمیع رکوردها بر اساس یک بُعد و جمع چند ستون عددی
export function aggregate(
  records: DataRow[],
  dimField: FieldMeta | undefined,
  measureFields: { field: FieldMeta; role: string }[],
): AggRow[] {
  const map = new Map<string, AggRow>()
  for (const r of records) {
    const label = dimField ? (str(r[dimField.id]) || 'نامشخص') : 'مجموع'
    let row = map.get(label)
    if (!row) { row = { label, count: 0, sums: new Map() }; map.set(label, row) }
    for (const { field } of measureFields) {
      const v = num(r[field.id])
      if (v !== null) row.sums.set(field.id, (row.sums.get(field.id) ?? 0) + v)
    }
    row.count++
  }
  return [...map.values()]
}

// برچسب دوره شمسی از مقدار خام تاریخ/متن
export function periodLabel(raw: unknown): { key: string; label: string } | null {
  const p = parseDateValue(raw)
  if (p.ok && p.jy !== undefined && p.jm !== undefined) {
    return { key: `${p.jy}-${String(p.jm).padStart(2, '0')}`, label: `${MONTH_FA[p.jm - 1]} ${faNum(p.jy)}` }
  }
  const s = str(raw)
  if (s === '') return null
  return { key: s, label: s }
}

function sortAggByNumericKey(rows: AggRow[]): AggRow[] {
  return [...rows].sort((a, b) => {
    const ka = periodKeyScore(a.label), kb = periodKeyScore(b.label)
    if (ka !== null && kb !== null) return ka - kb
    return a.label < b.label ? -1 : 1
  })
}
function periodKeyScore(label: string): number | null {
  // «مهر ۱۴۰۳» → عدد قابل مقایسه؛ یا خود رشته عددی
  const m = label.match(/(\d{4})/)
  if (!m) return null
  const y = +m[1]
  const mi = MONTH_FA.findIndex(mm => label.includes(mm))
  return y * 12 + (mi >= 0 ? mi : 0)
}

export function topInsightLabel(rows: { label: string; value: number }[]): { top?: string; bottom?: string } {
  if (rows.length === 0) return {}
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  return { top: sorted[0].label, bottom: sorted[sorted.length - 1].label }
}

// ─────────────────────────── فیش حقوقی ───────────────────────────

interface PayRoles {
  employee?: FieldMeta; unit?: FieldMeta; period?: FieldMeta
  base?: FieldMeta; overtime?: FieldMeta; benefit?: FieldMeta; gross?: FieldMeta
  net?: FieldMeta; deduction?: FieldMeta; insurance?: FieldMeta; tax?: FieldMeta
}

export function buildPayslipAnalysis(records: DataRow[], _fields: FieldMeta[], roles: PayRoles): SmartAnalysis {
  const kpis: SmartKpi[] = []
  const charts: SmartChartSpec[] = []
  const tables: SmartTable[] = []
  const insights: SmartInsight[] = []
  const report: SmartReportBlock[] = []
  const matched: string[] = []

  const moneyFields = [roles.base, roles.overtime, roles.benefit, roles.gross, roles.deduction, roles.insurance, roles.tax, roles.net].filter(Boolean) as FieldMeta[]

  // کارکنان یکتا
  const employees = new Set<string>()
  for (const r of records) { const s = roles.employee ? str(r[roles.employee.id]) : ''; if (s !== '') employees.add(s) }
  const empCount = employees.size || records.length

  const sumOf = (f?: FieldMeta): number => {
    if (!f) return 0
    let s = 0
    for (const r of records) { const v = num(r[f.id]); if (v !== null) s += v }
    return s
  }
  const sumNet = sumOf(roles.net) || (roles.gross ? sumOf(roles.gross) - sumOf(roles.deduction) : 0)
  const sumGross = sumOf(roles.gross) || (roles.net ? sumNet + sumOf(roles.deduction) : 0)
  const sumDeduct = sumOf(roles.deduction) || sumOf(roles.insurance) + sumOf(roles.tax)
  const avgNet = empCount > 0 ? sumNet / Math.max(1, roles.employee ? empCount : records.length) : 0

  matched.push('ستون‌های حقوق و دستمزد شناسایی شد')

  kpis.push({ id: 'ps-emp', label: 'تعداد کارکنان', value: empCount, fmt: 'number', hint: 'تعداد افراد متمایز در ستون «نام» فیش حقوقی' })
  if (sumNet !== 0 || roles.net) kpis.push({ id: 'ps-net', label: 'جمع خالص پرداختی', value: sumNet, fmt: 'currency', hint: 'جمع ستون «خالص پرداختی» در همه رکوردها', tone: 'good' })
  if (sumGross !== 0 || roles.gross) kpis.push({ id: 'ps-gross', label: 'جمع دریافتی ناخالص', value: sumGross, fmt: 'currency', hint: 'جمع دریافتی پیش از کسورات' })
  if (sumDeduct !== 0) kpis.push({ id: 'ps-deduct', label: 'جمع کسورات', value: sumDeduct, fmt: 'currency', hint: 'بیمه، مالیات و سایر کسورات شناسایی‌شده', tone: 'bad' })
  if (avgNet > 0) kpis.push({ id: 'ps-avg', label: 'میانگین خالص هر نفر', value: avgNet, fmt: 'currency', hint: 'جمع خالص تقسیم بر تعداد کارکنان متمایز' })
  if (roles.overtime) {
    const ot = sumOf(roles.overtime)
    if (ot !== 0) kpis.push({ id: 'ps-ot', label: 'جمع اضافه‌کاری', value: ot, fmt: 'currency', hint: 'جمع ستون اضافه‌کاری' })
  }

  // ── روند دوره‌ای خالص پرداختی ──
  if (roles.period && roles.net) {
    const agg = sortAggByNumericKey(aggregate(records, roles.period, [{ field: roles.net, role: 'sum' }]))
    if (agg.length >= 2) {
      charts.push({
        id: 'ps-trend', title: 'روند خالص پرداختی بر اساس دوره', kind: 'bar',
        seriesKey: 'خالص پرداختی',
        data: agg.map(a => ({ name: a.label, value: a.sums.get(roles.net!.id) ?? 0 })),
      })
      const vals = agg.map(a => a.sums.get(roles.net!.id) ?? 0)
      const g = growth(vals[vals.length - 1], vals[vals.length - 2])
      if (g !== null && Number.isFinite(g)) {
        insights.push({
          id: 'ps-growth', tone: g >= 0 ? 'good' : 'warn',
          title: `تغییر خالص پرداختی: ${g >= 0 ? 'افزایش' : 'کاهش'}`,
          text: `خالص پرداختی در دوره «${agg[agg.length - 1].label}» نسبت به «${agg[agg.length - 2].label}» ${fmtPct(Math.abs(g))} ${g >= 0 ? 'افزایش' : 'کاهش'} یافته است.`,
        })
      }
      // جدول دوره‌ای کامل
      tables.push({
        id: 'ps-period-table', title: 'خلاصه دوره‌ای حقوق و دستمزد',
        columns: ['دوره', 'تعداد فیش', ...moneyFields.map(f => f.label)],
        rows: agg.map(a => ({
          label: a.label,
          values: moneyFields.map(f => (a.sums.get(f.id) ?? null)),
          highlight: false,
        })),
        note: 'جمع هر مؤلفه در هر دوره زمانی',
      })
    }
  }

  // ── ترکیب مؤلفه‌های دریافتی ──
  const compParts: { name: string; field?: FieldMeta }[] = [
    { name: 'حقوق پایه', field: roles.base },
    { name: 'اضافه‌کاری', field: roles.overtime },
    { name: 'مزایا', field: roles.benefit },
  ]
  const pieData = compParts.filter(p => p.field).map(p => ({ name: p.name, value: sumOf(p.field) })).filter(p => p.value !== 0)
  if (pieData.length >= 2) {
    charts.push({ id: 'ps-composition', title: 'ترکیب مؤلفه‌های دریافتی', kind: 'pie', data: pieData, seriesKey: 'مبلغ' })
    const totalComp = pieData.reduce((s, p) => s + p.value, 0)
    const biggest = [...pieData].sort((a, b) => b.value - a.value)[0]
    if (totalComp > 0) insights.push({
      id: 'ps-comp', tone: 'info', title: `بزرگ‌ترین مؤلفه: ${biggest.name}`,
      text: `«${biggest.name}» با ${fmtPct((biggest.value / totalComp) * 100)} از جمع مؤلفه‌های دریافتی، بزرگ‌ترین سهم را دارد.`,
    })
  }

  // ── تفکیک بر اساس واحد/سمت ──
  if (roles.unit && roles.net) {
    const agg = aggregate(records, roles.unit, [{ field: roles.net, role: 'sum' }])
      .map(a => ({ label: a.label, value: a.sums.get(roles.net!.id) ?? 0 }))
      .filter(a => a.value !== 0)
      .sort((a, b) => b.value - a.value)
    if (agg.length >= 2) {
      charts.push({ id: 'ps-unit', title: `خالص پرداختی بر اساس ${roles.unit.label}`, kind: 'bar', data: agg.slice(0, 10), seriesKey: 'خالص پرداختی' })
      const total = agg.reduce((s, a) => s + a.value, 0)
      if (total > 0 && agg.length >= 3 && agg.slice(0, 2).reduce((s, a) => s + a.value, 0) / total > 0.6) {
        insights.push({
          id: 'ps-conc', tone: 'warn', title: 'تمرکز پرداخت در دو گروه',
          text: `دو گروه نخست (${agg[0].label} و ${agg[1].label}) ${fmtPct((agg.slice(0, 2).reduce((s, a) => s + a.value, 0) / total) * 100)} از کل خالص پرداختی را دریافت کرده‌اند.`,
        })
      }
    }
  }

  // ── جدول ۱۰ دریافت‌کننده برتر ──
  if (roles.employee && roles.net) {
    const agg = aggregate(records, roles.employee, [{ field: roles.net, role: 'sum' }])
      .map(a => ({ label: a.label, value: a.sums.get(roles.net!.id) ?? 0, count: a.count }))
      .sort((a, b) => b.value - a.value)
    if (agg.length >= 2) {
      const top = agg.slice(0, 10)
      tables.push({
        id: 'ps-top', title: 'بالاترین دریافتی‌ها (۱۰ نفر نخست)',
        columns: ['نام', 'تعداد فیش', 'جمع خالص پرداختی', 'میانگین'],
        rows: top.map(a => ({ label: a.label, values: [a.count, a.value, a.count ? a.value / a.count : null] })),
      })
      const highest = agg[0]
      insights.push({
        id: 'ps-highest', tone: 'info', title: `بالاترین دریافتی: ${highest.label}`,
        text: `«${highest.label}» با ${fmtMoney(highest.value)} جمع خالص پرداختی، بالاترین دریافتی را دارد${avgNet > 0 && highest.value / Math.max(1, highest.count) > avgNet * 2 ? ' — بیش از دو برابر میانگین سازمان؛ بازبینی ساختار پرداخت توصیه می‌شود' : ''}.`,
      })
      const min = agg[agg.length - 1]
      if (avgNet > 0 && min.value / Math.max(1, min.count) < avgNet * 0.5) {
        insights.push({ id: 'ps-lowest', tone: 'warn', title: 'دریافتی بسیار پایین‌تر از میانگین', text: `«${min.label}» با میانگین ${fmtMoney(min.count ? min.value / min.count : 0)} کمتر از نصف میانگین سازمان دریافت کرده است؛ بررسی شود.` })
      }
    }
  }

  // ── نسبت کسورات ──
  if (sumDeduct > 0 && sumGross > 0) {
    const ratio = (sumDeduct / sumGross) * 100
    insights.push({
      id: 'ps-ratio', tone: ratio > 35 ? 'warn' : 'good', title: 'نسبت کسورات به دریافتی',
      text: `کسورات ${fmtPct(ratio)} از جمع دریافتی ناخالص است${ratio > 35 ? ' — نسبت بالایی است؛ بازبینی اقلام کسور توصیه می‌شود' : ' — در محدوده متعارف قرار دارد'}.`,
    })
    kpis.push({ id: 'ps-ratio-kpi', label: 'نسبت کسورات', value: ratio, fmt: 'percent', hint: 'جمع کسورات تقسیم بر جمع دریافتی ناخالص', tone: ratio > 35 ? 'bad' : 'good' })
  }

  report.push({
    id: 'ps-rep-intro', heading: 'مقدمه',
    paragraphs: [
      `این گزارش به‌صورت خودکار از روی فایل فیش حقوقی بارگذاری‌شده ساخته شده است و ${faNum(records.length)} رکورد حقوق و دستمزد برای ${faNum(empCount)} نفر را پوشش می‌دهد.`,
      roles.period ? `داده‌ها بر اساس ستون «${roles.period.label}» دوره‌بندی شده‌اند و روند پرداخت‌ها در طول زمان قابل رصد است.` : 'در این فایل ستون دوره/ماه شناسایی نشد؛ با افزودن ستون ماه، روند پرداخت‌ها نیز تحلیل خواهد شد.',
    ],
  })
  report.push({
    id: 'ps-rep-findings', heading: 'یافته‌های کلیدی',
    paragraphs: [
      `جمع خالص پرداختی ${fmtMoney(sumNet)} و میانگین دریافتی هر نفر ${fmtMoney(avgNet)} است.`,
      sumDeduct > 0 ? `جمع کسورات (بیمه، مالیات و سایر اقلام) ${fmtMoney(sumDeduct)} معادل ${sumGross > 0 ? fmtPct((sumDeduct / sumGross) * 100) : '—'} از دریافتی ناخالص است.` : 'قلم کسوراتی در فایل شناسایی نشد.',
      ...insights.slice(0, 3).map(i => i.text),
    ],
    table: tables[0],
  })
  report.push({
    id: 'ps-rep-conclusion', heading: 'جمع‌بندی',
    paragraphs: [
      `ساختار پرداخت سازمان بر پایه ${compParts.filter(p => p.field).map(p => p.name).join('، ') || 'مؤلفه‌های شناسایی‌شده در فایل'} شکل گرفته است. برای کنترل هزینه، مقایسه دوره‌ای نسبت کسورات و سهم اضافه‌کاری مهم‌ترین شاخص‌های پیشنهادی است.`,
      'این تحلیل با هر بار به‌روزرسانی فایل‌های حقوق (بارگذاری مجدد یا تجمیع چند ماه) به‌صورت خودکار به‌روز می‌شود.',
    ],
  })

  return {
    template: 'payslip', templateLabel: 'فیش حقوقی',
    description: 'تحلیل خودکار حقوق و دستمزد: جمع و میانگین پرداختی‌ها، کسورات، ترکیب دریافتی و روند دوره‌ای',
    confidence: 0.9, matchedSignals: matched,
    kpis, charts, tables, insights, report,
  }
}

// ─────────────────────────── صورت مالی (سود و زیان) ───────────────────────────

export interface FinItemDef { key: string; label: string; kws: string[]; sign: -1 | 1 | 0 }

export const FIN_ITEMS: FinItemDef[] = [
  { key: 'sales', label: 'فروش / درآمد عملیاتی', kws: ['فروش خالص', 'درآمد عملیاتی', 'درآمدهای عملیاتی', 'فروش', 'درآمد', 'درامد'], sign: 1 },
  { key: 'cogs', label: 'بهای تمام‌شده کالای فروش‌رفته', kws: ['بهای تمام شده', 'قیمت تمام شده', 'هزینه تمام شده', 'بهاي تمام شده'], sign: -1 },
  { key: 'grossProfit', label: 'سود ناخالص', kws: ['سود ناخالص'], sign: 0 },
  { key: 'sga', label: 'هزینه‌های فروش و اداری', kws: ['هزینه های فروش', 'هزینه های اداری و عمومی', 'هزینه های عمومی', 'هزینه اداری', 'هزینه فروش'], sign: -1 },
  { key: 'opProfit', label: 'سود عملیاتی', kws: ['سود عملیاتی'], sign: 0 },
  { key: 'financeCost', label: 'هزینه‌های مالی', kws: ['هزینه های مالی', 'هزینه مالی'], sign: -1 },
  { key: 'preTax', label: 'سود قبل از کسر مالیات', kws: ['سود قبل از کسر', 'سود قبل از مالیات'], sign: 0 },
  { key: 'tax', label: 'مالیات بر درآمد', kws: ['مالیات بر درآمد', 'مالیات'], sign: -1 },
  { key: 'netProfit', label: 'سود خالص', kws: ['سود خالص'], sign: 0 },
]

const FIN_MAP = new Map(FIN_ITEMS.map(i => [i.key, i]))

// هم‌سان‌سازی متن فارسی/عربی برای تطابق اقلام (نسخه مشترک این ماژول)
export function normTextLocal(s: unknown): string {
  return String(s ?? '')
    .replace(/[\u200c\u200f\u200e]/g, ' ')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ۀة]/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// تطابق قلم صورت مالی — به‌ترتیب خاصیت (اقلام سود و مالیات پیش از فروش/درآمد عمومی)
// نکته: «هزینه‌های فروش و اداری» یا «مالیات بر درآمد» نباید به فروش نسبت داده شوند
export function matchFinItem(raw: string): FinItemDef | null {
  const text = normTextLocal(raw)
  const M = (k: string) => FIN_MAP.get(k) ?? null
  if (text.includes('سود ناخالص')) return M('grossProfit')
  if (text.includes('سود عملیاتی')) return M('opProfit')
  if (text.includes('سود خالص')) return M('netProfit')
  if (text.includes('سود قبل از کسر') || text.includes('سود قبل از مالیات')) return M('preTax')
  if (text.includes('مالیات')) return M('tax')
  if (text.includes('بهای تمام شده') || text.includes('قیمت تمام شده') || text.includes('هزینه تمام شده')) return M('cogs')
  if (text.includes('هزینه های مالی') || text.includes('هزینه مالی')) return M('financeCost')
  if (text.includes('هزینه') && (text.includes('فروش') || text.includes('اداری') || text.includes('عمومی'))) return M('sga')
  if (text.startsWith('فروش') || text.startsWith('درامد') || text.startsWith('درآمد')) return M('sales')
  if (text.includes('فروش خالص') || text.includes('درامد عملیاتی') || text.includes('درامدهای عملیاتی')) return M('sales')
  return null
}

interface FinStructure {
  mode: 'long' | 'wide'
  itemField?: FieldMeta     // حالت طولی: ستون شرح اقلام
  amountField?: FieldMeta   // حالت طولی: ستون مبلغ
  periodField?: FieldMeta   // دوره/سال
  fieldItems: { item: FinItemDef; field: FieldMeta }[] // حالت عرضی: هر ستون یک قلم
}

export function buildFinancialAnalysis(records: DataRow[], _fields: FieldMeta[], st: FinStructure): SmartAnalysis {
  const kpis: SmartKpi[] = []
  const charts: SmartChartSpec[] = []
  const tables: SmartTable[] = []
  const insights: SmartInsight[] = []
  const report: SmartReportBlock[] = []

  // جمع هر قلم از اقلام استاندارد — حالت طولی یا عرضی
  const itemTotals = new Map<string, number>()
  const addTotal = (key: string, v: number) => itemTotals.set(key, (itemTotals.get(key) ?? 0) + v)

  if (st.mode === 'long' && st.itemField && st.amountField) {
    for (const r of records) {
      const it = matchFinItem(str(r[st.itemField.id]))
      const v = num(r[st.amountField.id])
      if (it && v !== null) addTotal(it.key, Math.abs(v))
    }
  } else {
    for (const { item, field } of st.fieldItems) {
      let s = 0
      for (const r of records) { const v = num(r[field.id]); if (v !== null) s += Math.abs(v) }
      addTotal(item.key, s)
    }
  }

  // استخراج مقادیر کلیدی
  const g = (k: string) => itemTotals.get(k) ?? 0
  const sales = g('sales')
  const cogs = g('cogs')
  const gross = g('grossProfit') || (sales && cogs ? sales - cogs : 0)
  const sga = g('sga')
  const op = g('opProfit') || (gross && sga ? gross - sga : gross)
  const finCost = g('financeCost')
  const preTax = g('preTax') || (op && finCost ? op - finCost : op)
  const tax = g('tax')
  const net = g('netProfit') || (preTax && tax ? preTax - tax : preTax)

  kpis.push({ id: 'fin-sales', label: 'فروش کل', value: sales, fmt: 'currency', hint: 'جمع فروش / درآمد عملیاتی شناسایی‌شده در صورت مالی', tone: 'good' })
  if (gross) kpis.push({ id: 'fin-gross', label: 'سود ناخالص', value: gross, fmt: 'currency', hint: 'فروش منهای بهای تمام‌شده', tone: 'good' })
  if (op) kpis.push({ id: 'fin-op', label: 'سود عملیاتی', value: op, fmt: 'currency', hint: 'سود حاصل از عملیات جاری' })
  if (net) kpis.push({ id: 'fin-net', label: 'سود خالص', value: net, fmt: 'currency', hint: 'سود نهایی پس از همه هزینه‌ها و مالیات', tone: net > 0 ? 'good' : 'bad' })

  const gm = pctOf(gross, sales), om = pctOf(op, sales), nm = pctOf(net, sales)
  if (gm !== null) kpis.push({ id: 'fin-gm', label: 'حاشیه سود ناخالص', value: gm, fmt: 'percent', hint: 'سود ناخالص تقسیم بر فروش' })
  if (nm !== null) kpis.push({ id: 'fin-nm', label: 'حاشیه سود خالص', value: nm, fmt: 'percent', hint: 'سود خالص تقسیم بر فروش', tone: nm < 0 ? 'bad' : 'good' })

  // جدول صورت سود و زیان بازسازی‌شده
  const isRows: { label: string; values: (number | null)[]; highlight?: boolean }[] = []
  const pushIsRow = (label: string, v: number | null, derived: boolean, highlight = false) => {
    isRows.push({ label: derived ? `${label} (محاسبه‌شده)` : label, values: [v, v !== null && sales !== 0 ? (v / Math.abs(sales)) * 100 : null], highlight })
  }
  pushIsRow('فروش / درآمد عملیاتی', sales || null, false, true)
  pushIsRow('بهای تمام‌شده', -(cogs) || null, !g('cogs'))
  pushIsRow('سود ناخالص', gross || null, !g('grossProfit'), true)
  pushIsRow('هزینه‌های فروش و اداری', -(sga) || null, !g('sga'))
  pushIsRow('سود عملیاتی', op || null, !g('opProfit'), true)
  pushIsRow('هزینه‌های مالی', -(finCost) || null, !g('financeCost'))
  pushIsRow('سود قبل از مالیات', preTax || null, !g('preTax'))
  pushIsRow('مالیات', -(tax) || null, !g('tax'))
  pushIsRow('سود خالص', net || null, !g('netProfit'), true)
  tables.push({
    id: 'fin-is', title: 'صورت سود و زیان بازسازی‌شده',
    columns: ['قلم', 'مبلغ', 'درصد از فروش'],
    rows: isRows,
    note: 'اقلامی که در فایل نبودند با رنگ کم‌رنگ و برچسب «محاسبه‌شده» از اقلام دیگر به دست آمده‌اند',
  })

  // نمودار مقایسه اقلام اصلی
  const mainItems = [
    { name: 'فروش', v: sales }, { name: 'بهای تمام‌شده', v: cogs }, { name: 'سود ناخالص', v: gross },
    { name: 'هزینه عملیاتی', v: sga }, { name: 'سود عملیاتی', v: op }, { name: 'سود خالص', v: net },
  ].filter(i => i.v !== 0)
  if (mainItems.length >= 2) {
    charts.push({ id: 'fin-bars', title: 'مقایسه اقلام اصلی صورت مالی', kind: 'bar', data: mainItems.map(i => ({ name: i.name, value: i.v })), seriesKey: 'مبلغ' })
  }

  // روند دوره‌ای فروش و سود خالص
  if (st.periodField) {
    const sumByPeriod = (getV: (r: DataRow) => number | null) => {
      const map = new Map<string, { label: string; s: number }>()
      for (const r of records) {
        const p = periodLabel(r[st.periodField!.id])
        if (!p) continue
        const v = getV(r)
        if (v === null) continue
        const cur = map.get(p.key) ?? { label: p.label, s: 0 }
        cur.s += Math.abs(v)
        map.set(p.key, cur)
      }
      return sortAggByNumericKey([...map.values()].map(m => ({ label: m.label, count: 0, sums: new Map([['v', m.s]]) })))
    }
    const salesRows = sumByPeriod(r => {
      if (st.mode === 'long' && st.itemField && st.amountField) return matchFinItem(str(r[st.itemField.id]))?.key === 'sales' ? num(r[st.amountField.id]) : null
      const f = st.fieldItems.find(fi => fi.item.key === 'sales')?.field
      return f ? num(r[f.id]) : null
    })
    const netRows = sumByPeriod(r => {
      if (st.mode === 'long' && st.itemField && st.amountField) return matchFinItem(str(r[st.itemField.id]))?.key === 'netProfit' ? num(r[st.amountField.id]) : null
      const f = st.fieldItems.find(fi => fi.item.key === 'netProfit')?.field
      return f ? num(r[f.id]) : null
    })
    if (salesRows.length >= 2) {
      charts.push({
        id: 'fin-trend', title: 'روند فروش بر اساس دوره', kind: 'area',
        data: salesRows.map(a => ({ name: a.label, value: a.sums.get('v') ?? 0 })), seriesKey: 'فروش',
      })
      const vals = salesRows.map(a => a.sums.get('v') ?? 0)
      const gr = growth(vals[vals.length - 1], vals[vals.length - 2])
      if (gr !== null && Number.isFinite(gr)) insights.push({
        id: 'fin-sales-growth', tone: gr >= 0 ? 'good' : 'bad', title: `رشد فروش: ${gr >= 0 ? 'مثبت' : 'منفی'}`,
        text: `فروش در دوره «${salesRows[salesRows.length - 1].label}» نسبت به دوره قبل ${fmtPct(Math.abs(gr))} ${gr >= 0 ? 'رشد' : 'کاهش'} داشته است.`,
      })
    }
    if (netRows.length >= 2 && salesRows.length >= 2) {
      const sLast = salesRows[salesRows.length - 1].sums.get('v') ?? 0
      const sPrev = salesRows[salesRows.length - 2].sums.get('v') ?? 0
      const nLast = netRows[netRows.length - 1].sums.get('v') ?? 0
      const nPrev = netRows[netRows.length - 2].sums.get('v') ?? 0
      const gs = growth(sLast, sPrev), gn = growth(nLast, nPrev)
      if (gs !== null && gn !== null && gn < gs) insights.push({
        id: 'fin-margin-squeeze', tone: 'warn', title: 'فشار بر حاشیه سود',
        text: 'رشد سود خالص از رشد فروش کمتر است؛ به احتمال زیاد هزینه‌ها سریع‌تر از درآمد رشد کرده‌اند. تحلیل اقلام هزینه پیشنهاد می‌شود.',
      })
    }
  }

  if (nm !== null) insights.push({
    id: 'fin-margin', tone: nm >= 15 ? 'good' : nm >= 5 ? 'info' : 'warn', title: 'حاشیه سود خالص',
    text: `از هر ${faNum(100)} واحد فروش، ${faNum(Math.round(nm))} واحد سود خالص باقی می‌ماند${nm >= 15 ? ' — عملکرد سودآوری مطلوب است' : nm < 5 ? ' — حاشیه پایین است؛ کنترل هزینه‌ها اهمیت ویژه دارد' : ''}.`,
  })
  if (cogs && sales) insights.push({
    id: 'fin-cogs', tone: (cogs / sales) > 0.7 ? 'warn' : 'info', title: 'سهم بهای تمام‌شده',
    text: `بهای تمام‌شده ${fmtPct((cogs / sales) * 100)} از فروش است؛ هر کاهش یک‌درصدی این نسبت تقریباً ${fmtMoney(sales * 0.01)} به سود ناخالص می‌افزاید.`,
  })
  if (tax && preTax) insights.push({
    id: 'fin-tax', tone: 'info', title: 'سهم مالیات', text: `مالیات بر درآمد ${fmtPct((tax / preTax) * 100)} از سود قبل از مالیات است.`,
  })

  report.push({
    id: 'fin-rep-intro', heading: 'مقدمه',
    paragraphs: [
      `این گزارش از تحلیل خودکار فایل صورت مالی ساخته شده است و اقلام اصلی سود و زیان را بازسازی می‌کند. مبنای تحلیل ${faNum(records.length)} رکورد از فایل بارگذاری‌شده است.`,
      `در این دوره، فروش ${fmtMoney(sales)} و سود خالص ${fmtMoney(net)} ثبت شده است${nm !== null ? ` که حاشیه خالص ${fmtPct(nm)} را نشان می‌دهد` : ''}.`,
    ],
  })
  report.push({
    id: 'fin-rep-is', heading: 'صورت سود و زیان خلاصه',
    paragraphs: [
      `سود ناخالص ${fmtMoney(gross)} (حاشیه ${gm !== null ? fmtPct(gm) : '—'}) و سود عملیاتی ${fmtMoney(op)} (حاشیه ${om !== null ? fmtPct(om) : '—'}) است.`,
      cogs ? `بزرگ‌ترین هزینه عملیاتی، بهای تمام‌شده با ${fmtPct((cogs / sales) * 100)} از فروش است.` : 'بهای تمام‌شده در فایل شناسایی نشد.',
    ],
    table: tables[0],
  })
  report.push({
    id: 'fin-rep-conclusion', heading: 'جمع‌بندی و پیشنهادها',
    paragraphs: [
      net > 0 ? 'سازمان در این دوره سودآور بوده است. تمرکز بر پایداری حاشیه ناخالص و کنترل رشد هزینه‌های اداری پیشنهاد می‌شود.' : 'سازمان در این دوره زیان ثبت کرده است؛ بازبینی قیمت فروش، بهای تمام‌شده و ساختار هزینه‌ها ضروری است.',
      'با بارگذاری صورت مالی دوره‌های بعد، روند و رشد اقلام به‌صورت خودکار به این تحلیل افزوده می‌شود.',
    ],
  })

  return {
    template: 'financial', templateLabel: 'صورت مالی',
    description: 'بازسازی خودکار صورت سود و زیان، تحلیل عمودی، حاشیه‌های سود و روند دوره‌ای',
    confidence: 0.9, matchedSignals: ['اقلام صورت مالی شناسایی شد'],
    kpis, charts, tables, insights, report,
  }
}

// ─────────────────────────── تحلیل سود ───────────────────────────

export interface ProfitRoles {
  revenue?: FieldMeta; cost?: FieldMeta; profit?: FieldMeta
  item?: FieldMeta; period?: FieldMeta; qty?: FieldMeta
}

export function buildProfitAnalysis(records: DataRow[], _fields: FieldMeta[], roles: ProfitRoles): SmartAnalysis {
  const kpis: SmartKpi[] = []
  const charts: SmartChartSpec[] = []
  const tables: SmartTable[] = []
  const insights: SmartInsight[] = []
  const report: SmartReportBlock[] = []

  // سود هر رکورد: از ستون سود یا محاسبه درآمد منهای هزینه
  const profitOf = (r: DataRow): number | null => {
    if (roles.profit) { const v = num(r[roles.profit.id]); if (v !== null) return v }
    if (roles.revenue) {
      const rev = num(r[roles.revenue.id])
      const cost = roles.cost ? num(r[roles.cost.id]) ?? 0 : 0
      if (rev !== null) return rev - cost
    }
    return null
  }

  let totalRev = 0, totalCost = 0, totalProfit = 0, profitRows = 0
  for (const r of records) {
    const rev = roles.revenue ? num(r[roles.revenue.id]) : null
    const cost = roles.cost ? num(r[roles.cost.id]) : null
    if (rev !== null) totalRev += rev
    if (cost !== null) totalCost += cost
    const p = profitOf(r)
    if (p !== null) { totalProfit += p; profitRows++ }
  }
  const margin = pctOf(totalProfit, totalRev)

  kpis.push({ id: 'pr-rev', label: 'جمع درآمد', value: totalRev, fmt: 'currency', hint: `جمع ستون «${roles.revenue?.label ?? 'درآمد'}»`, tone: 'good' })
  if (roles.cost) kpis.push({ id: 'pr-cost', label: 'جمع هزینه / بهای تمام‌شده', value: totalCost, fmt: 'currency', hint: `جمع ستون «${roles.cost.label}»`, tone: 'bad' })
  kpis.push({ id: 'pr-profit', label: 'سود خالص', value: totalProfit, fmt: 'currency', hint: roles.profit ? 'جمع ستون سود' : 'درآمد منهای هزینه در هر رکورد', tone: totalProfit >= 0 ? 'good' : 'bad' })
  if (margin !== null) kpis.push({ id: 'pr-margin', label: 'حاشیه سود', value: margin, fmt: 'percent', hint: 'سود تقسیم بر درآمد', tone: margin < 0 ? 'bad' : margin < 5 ? 'warn' : 'good' })

  // سود به تفکیک قلم (محصول/مشتری/…)
  if (roles.item) {
    const rows: { label: string; rev: number; cost: number; profit: number; count: number }[] = []
    const map = new Map<string, { label: string; rev: number; cost: number; profit: number; count: number }>()
    for (const r of records) {
      const label = str(r[roles.item.id]) || 'نامشخص'
      const rev = roles.revenue ? num(r[roles.revenue.id]) ?? 0 : 0
      const cost = roles.cost ? num(r[roles.cost.id]) ?? 0 : 0
      const p = profitOf(r) ?? 0
      const cur = map.get(label) ?? { label, rev: 0, cost: 0, profit: 0, count: 0 }
      cur.rev += rev; cur.cost += cost; cur.profit += p; cur.count++
      map.set(label, cur)
    }
    rows.push(...map.values())
    const byProfit = [...rows].sort((a, b) => b.profit - a.profit)
    if (byProfit.length >= 2) {
      charts.push({ id: 'pr-item', title: `سود بر اساس ${roles.item.label}`, kind: 'bar', data: byProfit.slice(0, 10).map(a => ({ name: a.label, value: a.profit })), seriesKey: 'سود' })
      tables.push({
        id: 'pr-item-table', title: `تحلیل سود به تفکیک ${roles.item.label}`,
        columns: [roles.item.label, 'درآمد', 'هزینه', 'سود', 'حاشیه سود'],
        rows: byProfit.slice(0, 15).map(a => ({ label: a.label, values: [a.rev, a.cost, a.profit, a.rev !== 0 ? (a.profit / a.rev) * 100 : null] })),
      })
      const top = byProfit[0]
      const bottom = byProfit[byProfit.length - 1]
      const lossRows = byProfit.filter(a => a.profit < 0)
      insights.push({
        id: 'pr-top', tone: 'good', title: `سودآورترین: ${top.label}`,
        text: `«${top.label}» با ${fmtMoney(top.profit)} سود در صدر قرار دارد${margin !== null && top.rev > 0 ? ` (حاشیه ${fmtPct((top.profit / top.rev) * 100)})` : ''}.`,
      })
      if (lossRows.length > 0) {
        insights.push({
          id: 'pr-loss', tone: 'bad', title: `${faNum(lossRows.length)} قلم زیان‌ده`,
          text: `اقلام ${lossRows.slice(0, 3).map(a => `«${a.label}»`).join('، ')} زیان‌ده هستند؛ جمع زیان ${fmtMoney(lossRows.reduce((s, a) => s + a.profit, 0))} است. بازنگری قیمت یا هزینه این اقلام پیشنهاد می‌شود.`,
        })
      } else if (bottom && bottom.profit < (top.profit * 0.1)) {
        insights.push({ id: 'pr-weak', tone: 'warn', title: 'اقلام کم‌بازده', text: `«${bottom.label}» تنها ${fmtMoney(bottom.profit)} سود دارد — بسیار کمتر از سایر اقلام؛ بهبود حاشیه یا حذف آن بررسی شود.` })
      }
      // تمرکز سود
      const pos = byProfit.filter(a => a.profit > 0)
      const totalPos = pos.reduce((s, a) => s + a.profit, 0)
      if (totalPos > 0 && pos.length >= 3 && pos.slice(0, 2).reduce((s, a) => s + a.profit, 0) / totalPos > 0.7) {
        insights.push({ id: 'pr-conc', tone: 'warn', title: 'تمرکز سود در دو قلم', text: `${fmtPct((pos.slice(0, 2).reduce((s, a) => s + a.profit, 0) / totalPos) * 100)} از کل سود فقط از دو قلم به دست می‌آید؛ ریسک وابستگی سبد را کنترل کنید.` })
      }
      if (byProfit.length > 2) {
        charts.push({ id: 'pr-rev-share', title: `سهم درآمد بر اساس ${roles.item.label}`, kind: 'pie', data: [...rows].sort((a, b) => b.rev - a.rev).slice(0, 8).map(a => ({ name: a.label, value: a.rev })), seriesKey: 'درآمد' })
      }
    }
  }

  // روند سود دوره‌ای
  if (roles.period) {
    const map = new Map<string, { label: string; s: number; rev: number }>()
    for (const r of records) {
      const p = periodLabel(r[roles.period.id])
      if (!p) continue
      const v = profitOf(r)
      if (v === null) continue
      const cur = map.get(p.key) ?? { label: p.label, s: 0, rev: 0 }
      cur.s += v
      const rev = roles.revenue ? num(r[roles.revenue.id]) : null
      if (rev !== null) cur.rev += rev
      map.set(p.key, cur)
    }
    const series = sortAggByNumericKey([...map.values()].map(m => ({ label: m.label, count: 0, sums: new Map([['p', m.s], ['r', m.rev]]) })))
    if (series.length >= 2) {
      charts.push({ id: 'pr-trend', title: 'روند سود بر اساس دوره', kind: 'area', data: series.map(a => ({ name: a.label, value: a.sums.get('p') ?? 0 })), seriesKey: 'سود' })
      const vals = series.map(a => a.sums.get('p') ?? 0)
      const gr = growth(vals[vals.length - 1], vals[vals.length - 2])
      if (gr !== null && Number.isFinite(gr)) insights.push({
        id: 'pr-growth', tone: gr >= 0 ? 'good' : 'bad', title: `سود دوره آخر ${gr >= 0 ? 'رشد کرده' : 'کاهش یافته'} است`,
        text: `سود در «${series[series.length - 1].label}» نسبت به دوره قبل ${fmtPct(Math.abs(gr))} ${gr >= 0 ? 'افزایش' : 'کاهش'} یافته است.`,
      })
    }
  }

  if (margin !== null) insights.push({
    id: 'pr-margin', tone: margin >= 15 ? 'good' : margin >= 5 ? 'info' : 'warn', title: 'حاشیه سود کل',
    text: `از هر ${faNum(100)} واحد درآمد، ${faNum(Math.round(margin))} واحد سود باقی می‌ماند.`,
  })

  report.push({
    id: 'pr-rep-intro', heading: 'مقدمه',
    paragraphs: [
      `این گزارش به‌صورت خودکار از فایل داده‌های سود ساخته شده و ${faNum(records.length)} رکورد را تحلیل می‌کند.`,
      `جمع درآمد ${fmtMoney(totalRev)}، جمع هزینه ${fmtMoney(totalCost)} و سود خالص ${fmtMoney(totalProfit)} است${margin !== null ? ` (حاشیه ${fmtPct(margin)})` : ''}.`,
    ],
  })
  report.push({
    id: 'pr-rep-findings', heading: 'یافته‌های کلیدی',
    paragraphs: insights.slice(0, 4).map(i => i.text),
    table: tables[0],
  })
  report.push({
    id: 'pr-rep-conclusion', heading: 'جمع‌بندی',
    paragraphs: [
      totalProfit > 0 ? 'سبد کالا/خدمات در مجموع سودآور است؛ حفظ سهم اقلام پرسود و بهبود اقلام کم‌حاشیه مسیر رشد سود است.' : 'در مجموع زیان ثبت شده است؛ اولویت نخست، اصلاح قیمت یا ساختار هزینه اقلام زیان‌ده است.',
      'با تجمیع فایل‌های چند دوره در همین صفحه، روند سود و حاشیه به‌صورت خودکار محاسبه و به‌روز می‌شود.',
    ],
  })

  return {
    template: 'profit', templateLabel: 'تحلیل سود',
    description: 'محاسبه خودکار سود و حاشیه از درآمد و هزینه، به تفکیک قلم و دوره',
    confidence: 0.9, matchedSignals: ['ستون‌های درآمد و هزینه شناسایی شد'],
    kpis, charts, tables, insights, report,
  }
}
