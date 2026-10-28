// قالب‌های هوشمند — تشخیص خودکار نوع فایل اکسل و ساخت تحلیل تخصصی
// پس از بارگذاری، ساختار ستون‌ها (و در صورت مالی، متن اقلام) بررسی می‌شود و اگر فایل
// «فیش حقوقی»، «صورت مالی» یا «داده سود» باشد، داشبورد تخصصی و گزارش هوشمند ساخته می‌شود.

import { DataRow, FieldMeta } from './types'
import { num } from './query'
import {
  buildPayslipAnalysis, buildFinancialAnalysis, buildProfitAnalysis,
  matchFinItem, normTextLocal, PayRoles, FinStructure, ProfitRoles,
} from './smart-analysis'

// هم‌سان‌سازی متن فارسی/عربی — پیاده‌سازی اصلی در smart-analysis و از اینجا نیز صادر می‌شود
export const normText = normTextLocal

// ─────────────────────────── انواع خروجی ───────────────────────────

export type SmartTemplateKind = 'payslip' | 'financial' | 'profit'

export interface SmartKpi {
  id: string
  label: string
  value: number
  fmt: 'currency' | 'number' | 'percent'
  hint: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
}

export interface SmartChartSpec {
  id: string
  title: string
  kind: 'bar' | 'pie' | 'area'
  data: { name: string; value: number }[]
  seriesKey: string
}

export interface SmartTableRow { label: string; values: (number | null)[]; highlight?: boolean }

export interface SmartTable {
  id: string
  title: string
  columns: string[]
  rows: SmartTableRow[]
  note?: string
}

export interface SmartInsight { id: string; tone: 'good' | 'warn' | 'bad' | 'info'; title: string; text: string }

export interface SmartReportBlock { id: string; heading: string; paragraphs: string[]; table?: SmartTable }

export interface SmartAnalysis {
  template: SmartTemplateKind
  templateLabel: string
  description: string
  confidence: number
  matchedSignals: string[]
  kpis: SmartKpi[]
  charts: SmartChartSpec[]
  tables: SmartTable[]
  insights: SmartInsight[]
  report: SmartReportBlock[]
}

export interface SmartDetection {
  template: SmartTemplateKind | null
  confidence: number
  matchedSignals: string[]
}

// ─────────────────────────── نرمال‌سازی و جست‌وجوی ستون ───────────────────────────

function matchesAny(label: string, kws: string[]): string | null {
  for (const kw of kws) {
    if (label.includes(normText(kw))) return kw
  }
  return null
}

// یافتن ستون هر نقش با واژگان کلیدی — ستون‌ها بدون تکرار اختصاص می‌یابند
function assignFields<T extends string>(fields: FieldMeta[], defs: Record<T, string[]>): Partial<Record<T, FieldMeta>> {
  const used = new Set<string>()
  const out: Partial<Record<T, FieldMeta>> = {}
  for (const role of Object.keys(defs) as T[]) {
    let best: { f: FieldMeta; kw: string } | null = null
    for (const f of fields) {
      if (used.has(f.id)) continue
      const hit = matchesAny(normText(f.label), defs[role])
      if (hit && (!best || hit.length > best.kw.length)) best = { f, kw: hit }
    }
    if (best) { out[role] = best.f; used.add(best.f.id) }
  }
  return out
}

// ─────────────────────────── واژگان کلیدی ───────────────────────────

const PAYSLIP_KWS = {
  employee: ['نام و نام خانوادگی', 'نام خانوادگی', 'نام کارمند', 'نام کارگر', 'کارمند', 'پرسنلی', 'کد پرسنلی', 'شماره پرسنلی', 'پرسنل'],
  unit: ['واحد سازمانی', 'دپارتمان', 'دپارتمنت', 'واحد', 'بخش', 'سمت', 'عنوان شغل', 'شعبه', 'اداره'],
  period: ['ماه حقوق', 'ماه', 'دوره', 'تاریخ'],
  base: ['حقوق پایه', 'حقوق مبنا', 'مبلغ حقوق', 'حقوق'],
  overtime: ['اضافه کاری', 'اضافهکار', 'اضافه کار'],
  benefit: ['مزایا', 'کمک هزینه', 'ناهار', 'بن کارگری', 'بن', 'عیدی', 'سنوات', 'حق مسکن', 'حق اولاد', 'پاداش'],
  gross: ['جمع دریافتی', 'دریافتی ناخالص', 'ناخالص', 'جمع حقوق و مزایا', 'جمع حقوق'],
  net: ['خالص پرداختی', 'خالص پرداخت', 'پرداختی خالص', 'خالص'],
  deduction: ['کسورات', 'کسرات', 'جمع کسورات', 'کسور'],
  insurance: ['بیمه سهم', 'بیمه'],
  tax: ['مالیات'],
}

const PROFIT_KWS = {
  revenue: ['مبلغ فروش', 'فروش خالص', 'قیمت فروش', 'درآمد فروش', 'جمع فروش', 'فروش', 'درآمد', 'درامد', 'مبلغ قرارداد', 'مبلغ فاکتور'],
  cost: ['بهای تمام شده', 'قیمت تمام شده', 'هزینه تمام شده', 'مبلغ خرید', 'قیمت خرید', 'بها', 'هزینه', 'خرید'],
  profit: ['مبلغ سود', 'سود خالص', 'حاشیه سود', 'سود'],
  item: ['نام محصول', 'نام کالا', 'محصول', 'کالا', 'خدمت', 'پروژه', 'نام مشتری', 'مشتری', 'اقلام', 'شرح'],
  period: ['تاریخ', 'ماه', 'دوره', 'سال'],
  qty: ['تعداد', 'مقدار', 'حجم فروش'],
}

// ─────────────────────────── تشخیص قالب ───────────────────────────

export function detectSmartTemplate(records: DataRow[], fields: FieldMeta[]): SmartDetection {
  const signals: string[] = []
  const norm = fields.map(f => ({ f, label: normText(f.label) }))

  // ── فیش حقوقی ──
  const pay = assignFields(fields, PAYSLIP_KWS)
  let payScore = 0
  const paySignals: string[] = []
  if (pay.employee) { payScore += 0.2; paySignals.push('ستون نام کارمند/پرسنلی') }
  if (pay.base) { payScore += 0.2; paySignals.push('ستون حقوق') }
  if (pay.net) { payScore += 0.25; paySignals.push('ستون خالص پرداختی') }
  if (pay.deduction || pay.insurance || pay.tax) { payScore += 0.2; paySignals.push('ستون کسورات/بیمه/مالیات') }
  if (pay.gross) { payScore += 0.1; paySignals.push('ستون دریافتی ناخالص') }
  if (pay.overtime || pay.benefit) { payScore += 0.1; paySignals.push('ستون مزایا/اضافه‌کاری') }
  // نکته: ستون «تاریخ» برای فیش کافی نیست — حداقل دو سیگنال حقوقی لازم است
  const payConf = payScore >= 0.45 ? Math.min(1, payScore + 0.1) : payScore * 0.5

  // ── صورت مالی ──
  let finConf = 0
  const finSignals: string[] = []
  let finSt: FinStructure | null = null
  // حالت طولی: ستون شرح اقلام + ستون مبلغ
  const textFields = fields.filter(f => ['text', 'category', 'identifier'].includes(f.type) || f.role === 'dimension')
  for (const tf of textFields) {
    const vals = records.slice(0, 300).map(r => normText(r[tf.id])).filter(v => v !== '')
    if (vals.length === 0) continue
    const uniq = [...new Set(vals)]
    const hitCount = uniq.filter(v => matchFinItem(v) !== null).length
    if (hitCount >= 3 && hitCount / uniq.length >= 0.4) {
      const measureFields = fields.filter(f => ['amount', 'integer', 'decimal'].includes(f.type) || f.role === 'measure')
      const amountField = measureFields.map(f => {
        let s = 0
        for (const r of records.slice(0, 500)) { const v = num(r[f.id]); if (v !== null) s += Math.abs(v) }
        return { f, s }
      }).sort((a, b) => b.s - a.s)[0]?.f
      if (amountField) {
        finConf = Math.min(1, 0.55 + hitCount / Math.max(8, uniq.length) * 0.4)
        finSignals.push(`اقلام صورت مالی در ستون «${tf.label}» شناسایی شد (${hitCount} قلم)`)
        finSt = { mode: 'long', itemField: tf, amountField, periodField: fields.find(f => normText(f.label).match(/سال|دوره|ماه/)), fieldItems: [] }
        break
      }
    }
  }
  // حالت عرضی: هر ستون یک قلم صورت مالی
  if (!finSt) {
    const fieldItems: { item: NonNullable<ReturnType<typeof matchFinItem>>; field: FieldMeta }[] = []
    for (const { f, label } of norm) {
      const it = matchFinItem(label)
      if (it && (['amount', 'integer', 'decimal'].includes(f.type) || f.role === 'measure' || f.type === 'text')) fieldItems.push({ item: it, field: f })
    }
    const keys = new Set(fieldItems.map(x => x.item.key))
    if (keys.has('sales') && keys.size >= 3) {
      finConf = Math.min(1, 0.5 + keys.size * 0.07)
      finSignals.push(`${keys.size} قلم صورت مالی به‌عنوان ستون شناسایی شد`)
      finSt = { mode: 'wide', fieldItems, periodField: fields.find(f => normText(f.label).match(/سال|دوره|ماه/)) }
    }
  }

  // ── تحلیل سود ──
  const pr = assignFields(fields, PROFIT_KWS)
  let prConf = 0
  const prSignals: string[] = []
  if (pr.revenue) { prConf += 0.35; prSignals.push(`ستون درآمد: «${pr.revenue.label}»`) }
  if (pr.cost) { prConf += 0.35; prSignals.push(`ستون هزینه: «${pr.cost.label}»`) }
  if (pr.profit) { prConf += 0.15; prSignals.push('ستون سود') }
  if (pr.item) { prConf += 0.1; prSignals.push(`ستون قلم: «${pr.item.label}»`) }
  prConf = Math.min(1, prConf)
  // اگر ستون درآمد/هزینه با «سود» اشتباه گرفته شود (مثلاً فقط ستون سود ناخالص)، اعتبار کم می‌شود
  if (!pr.revenue || !pr.cost) prConf *= 0.4

  // انتخاب بهترین قالب — فیش حقوقی و صورت مالی اختصاصی‌ترند و اولویت دارند
  const candidates = ([
    { kind: 'payslip', conf: payConf, signals: paySignals },
    { kind: 'financial', conf: finConf, signals: finSignals },
    { kind: 'profit', conf: prConf, signals: prSignals },
  ] as { kind: SmartTemplateKind; conf: number; signals: string[] }[]).sort((a, b) => b.conf - a.conf)

  const best = candidates[0]
  if (!best || best.conf < 0.45) {
    return { template: null, confidence: best?.conf ?? 0, matchedSignals: [] }
  }
  return { template: best.kind, confidence: best.conf, matchedSignals: best.signals.length ? best.signals : signals }
}

// ─────────────────────────── ساخت تحلیل ───────────────────────────

export function buildSmartAnalysis(template: SmartTemplateKind, records: DataRow[], fields: FieldMeta[]): SmartAnalysis {
  if (template === 'payslip') {
    const roles = assignFields(fields, PAYSLIP_KWS) as PayRoles
    return buildPayslipAnalysis(records, fields, roles)
  }
  if (template === 'financial') {
    // بازسازی ساختار طولی/عرضی همانند تشخیص
    const det = detectSmartTemplate(records, fields)
    let st: FinStructure = { mode: 'wide', fieldItems: [], periodField: undefined }
    if (det.template === 'financial') {
      // اجرای دوباره منطق تشخیص ساختار (ارزان است — حداکثر ۳۰۰ رکورد بررسی می‌شود)
      const textFields = fields.filter(f => ['text', 'category', 'identifier'].includes(f.type) || f.role === 'dimension')
      for (const tf of textFields) {
        const vals = records.slice(0, 300).map(r => normText(r[tf.id])).filter(v => v !== '')
        const uniq = [...new Set(vals)]
        const hitCount = uniq.filter(v => matchFinItem(v) !== null).length
        if (hitCount >= 3 && uniq.length > 0 && hitCount / uniq.length >= 0.4) {
          const measureFields = fields.filter(f => ['amount', 'integer', 'decimal'].includes(f.type) || f.role === 'measure')
          const amountField = measureFields.map(f => {
            let s = 0
            for (const r of records.slice(0, 500)) { const v = num(r[f.id]); if (v !== null) s += Math.abs(v) }
            return { f, s }
          }).sort((a, b) => b.s - a.s)[0]?.f
          if (amountField) { st = { mode: 'long', itemField: tf, amountField, periodField: fields.find(f => normText(f.label).match(/سال|دوره|ماه/)), fieldItems: [] }; break }
        }
      }
      if (st.mode === 'wide') {
        const fieldItems: { item: NonNullable<ReturnType<typeof matchFinItem>>; field: FieldMeta }[] = []
        for (const f of fields) {
          const it = matchFinItem(normText(f.label))
          if (it) fieldItems.push({ item: it, field: f })
        }
        if (fieldItems.length > 0) st = { mode: 'wide', fieldItems, periodField: fields.find(f => normText(f.label).match(/سال|دوره|ماه/)) }
      }
    }
    return buildFinancialAnalysis(records, fields, st)
  }
  const roles = assignFields(fields, PROFIT_KWS) as ProfitRoles
  return buildProfitAnalysis(records, fields, roles)
}
