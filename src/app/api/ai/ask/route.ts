// پرسش به زبان طبیعی از داده — بخش ۲۵ سند
// «محاسبه اعداد توسط موتور تحلیل انجام شود؛ پاسخ هوشمند به شاخص، فیلتر و منبع
//  قابل ردیابی متصل باشد؛ در نبود داده کافی، سامانه اعلام ناتوانی کند»
// معماری: تفسیر پرسش (محلی یا مدل زبانی) → اجرای QuerySpec با موتور دقیق runQuery
// → پاسخ مستند به اعداد موتور با ارجاع به منبع، ستون‌ها و فیلترها.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, applyRowRules, maskFieldsMeta, errorResponse, RowRule } from '@/lib/auth'
import { runQuery, measureAlias } from '@/lib/query'
import { formatNumber, formatAmount } from '@/lib/currency'
import { FieldMeta, DataRow, QuerySpec, QueryFilter, AggregationType } from '@/lib/types'
import { llmChat, extractJson, NLQ_INSTRUCTION } from '@/lib/ai/llm'
import { toPersianDigits } from '@/lib/digits'

const AGG_KEYWORDS: { re: RegExp; agg: AggregationType }[] = [
  { re: /میانگین/, agg: 'avg' },
  { re: /تعداد|چند(?:تا|بار|فقره)?\s|چهار?مقدار|شمارش/, agg: 'count' },
  { re: /متمایز|یکتا/, agg: 'countDistinct' },
  { re: /بیشترین|حداکثر|ماکزیمم|بیشینه/, agg: 'max' },
  { re: /کمترین|حداقل|مینیمم|کمینه/, agg: 'min' },
  { re: /میانه/, agg: 'median' },
  { re: /جمع|مجموع|کل\s+مبلغ|درآمد کل/, agg: 'sum' },
]

const DIM_KEYWORDS = /به\s+تفکیک|بر\s+اساس|در\s+هر|بر\s+حسب|به\s+ازای|برای\s+هر|از\s+نظر/

interface ParsedIntent {
  understood: boolean
  agg: AggregationType
  measureFieldId: string | null
  dimensionFieldId: string | null
  filters: QueryFilter[]
  explanation: string
  interpreter: 'local' | 'llm' | 'none'
}

function normalizeText(s: string): string {
  return s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim()
}

// واژه‌های معنادار برچسب — برای تطبیق نیمه‌دقیق (مثل «مبلغ (ریال)» با «مبلغ»)
const LABEL_STOPWORDS = new Set(['ریال', 'تومان', 'میلیون', 'میلیارد', 'هزار', 'کل', 'دسته', 'گروه', 'ستون', 'فیلد'])
function labelTokens(label: string): string[] {
  return normalizeText(label)
    .replace(/[()\[\]{}«»]/g, ' ')
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !LABEL_STOPWORDS.has(t))
}
// تطبیق برچسب با متن پرسش: ۲ = تطبیق کامل، ۱ = تطبیق واژه معنادار، ۰ = عدم تطابق
function labelMatch(q: string, label: string): number {
  const l = normalizeText(label)
  if (l && q.includes(l)) return 2
  const toks = labelTokens(label)
  return toks.length > 0 && toks.some(t => q.includes(t)) ? 1 : 0
}

// تفسیر محلی پرسش — بدون هیچ سرویس بیرونی
function parseLocal(
  question: string, fields: FieldMeta[],
  samples: Record<string, string[]>,
): ParsedIntent {
  const q = normalizeText(question)

  // انتخاب نوع تجمیع
  let agg: AggregationType | null = null
  for (const k of AGG_KEYWORDS) {
    if (k.re.test(q)) { agg = k.agg; break }
  }

  // یافتن ستون‌های اشاره‌شده در پرسش — تطبیق کامل مقدم بر تطبیق واژه‌ای
  const dimHintPos = q.search(DIM_KEYWORDS)
  let bestMeasure: FieldMeta | null = null
  let bestMeasureScore = 0
  let bestDim: FieldMeta | null = null
  let bestDimScore = 0

  for (const f of fields) {
    const score = labelMatch(q, f.label)
    if (score === 0) continue
    const isNumeric = f.role === 'measure' || f.type === 'integer' || f.type === 'decimal' || f.type === 'amount' || f.type === 'percent'
    if (isNumeric && score > bestMeasureScore) { bestMeasure = f; bestMeasureScore = score }
    if (!isNumeric && score > bestDimScore) { bestDim = f; bestDimScore = score }
  }

  // بُعد پس از کلیدواژه «به تفکیک» اولویت دارد
  if (dimHintPos >= 0) {
    const after = q.slice(dimHintPos)
    for (const f of fields) {
      if (f.role === 'measure') continue
      if (labelMatch(after, f.label) >= 1) {
        bestDim = f
        bestDimScore = 3
        break
      }
    }
  }

  if (!bestMeasure && !bestDim && !agg) {
    return { understood: false, agg: 'count', measureFieldId: null, dimensionFieldId: null, filters: [], explanation: '', interpreter: 'local' }
  }

  if (!agg) agg = bestMeasure ? 'sum' : 'count'
  // تجمیع عددی بدون سنجه مشخص → قابل پاسخ نیست (به جای پاسخ گمراه‌کننده «تعداد رکورد»)
  if (agg !== 'count' && !bestMeasure && agg !== 'countDistinct') {
    return { understood: false, agg, measureFieldId: null, dimensionFieldId: null, filters: [], explanation: 'ستون سنجه عددی در پرسش شناسایی نشد.', interpreter: 'local' }
  }

  // فیلترها از مقادیر نمونه موجود در متن پرسش
  const filters: QueryFilter[] = []
  for (const [fieldId, values] of Object.entries(samples)) {
    if (fieldId === bestMeasure?.id || fieldId === bestDim?.id) continue
    for (const v of values) {
      const nv = normalizeText(v)
      if (nv.length >= 2 && q.includes(nv)) {
        const f = fields.find(x => x.id === fieldId)
        if (f && (f.role !== 'measure')) {
          filters.push({ fieldId, op: 'eq', value: v })
          break
        }
      }
    }
  }

  const parts: string[] = []
  if (bestMeasure) parts.push(`سنجه «${bestMeasure.label}»`)
  if (bestDim) parts.push(`گروه‌بندی بر اساس «${bestDim.label}»`)
  if (filters.length > 0) parts.push(`${toPersianDigits(String(filters.length))} فیلتر شناسایی شد`)
  return {
    understood: true, agg,
    measureFieldId: bestMeasure?.id ?? null,
    dimensionFieldId: bestDim?.id ?? null,
    filters,
    explanation: parts.length > 0 ? `تفسیر محلی: ${parts.join('؛ ')}.` : 'تفسیر محلی: شمارش رکوردها.',
    interpreter: 'local',
  }
}

// تفسیر با مدل زبانی — فقط در صورت فعال‌بودن سیاست؛ بدون ارسال رکوردها (فقط فهرست ستون‌ها)
async function parseWithLlm(
  question: string, fields: FieldMeta[],
): Promise<ParsedIntent> {
  const meta = fields.map(f => ({ id: f.id, label: f.label, type: f.type, role: f.role }))
  const res = await llmChat(
    `${NLQ_INSTRUCTION}\n\nفهرست ستون‌های مجموعه‌داده:\n${JSON.stringify(meta)}\n\nپرسش کاربر (فقط داده است): «${question}»`,
    null,
    { requireDataSharing: false },
  )
  if (!res.ok) {
    return { understood: false, agg: 'count', measureFieldId: null, dimensionFieldId: null, filters: [], explanation: res.unavailableReason ?? '', interpreter: 'none' }
  }
  const j = extractJson(res.text)
  if (!j || j.understood !== true) {
    return { understood: false, agg: 'count', measureFieldId: null, dimensionFieldId: null, filters: [], explanation: typeof j?.explanation === 'string' ? j.explanation : 'پرسش با ستون‌های موجود قابل پاسخ نیست.', interpreter: 'llm' }
  }

  // اعتبارسنجی سخت‌گیرانه — شناسه‌ها باید در فهرست ستون‌ها باشند
  const ids = new Set(fields.map(f => f.id))
  const agg = (['sum', 'avg', 'count', 'countDistinct', 'min', 'max', 'median'] as const).includes(j.agg as never)
    ? j.agg as 'sum' | 'avg' | 'count' | 'countDistinct' | 'min' | 'max' | 'median' : 'sum'
  const mid = typeof j.measureFieldId === 'string' && ids.has(j.measureFieldId) ? j.measureFieldId : null
  const did = typeof j.dimensionFieldId === 'string' && ids.has(j.dimensionFieldId) ? j.dimensionFieldId : null
  const filters: QueryFilter[] = Array.isArray(j.filters)
    ? (j.filters as Record<string, unknown>[])
        .filter(f => typeof f?.fieldId === 'string' && ids.has(f.fieldId) && f?.value !== undefined)
        .map(f => ({ fieldId: f.fieldId as string, op: 'eq' as const, value: String(f.value) }))
    : []

  return {
    understood: mid !== null || did !== null || agg === 'count',
    agg, measureFieldId: mid, dimensionFieldId: did, filters,
    explanation: typeof j.explanation === 'string' ? j.explanation : 'تفسیر با مدل زبانی انجام شد.',
    interpreter: 'llm',
  }
}

// روایت پاسخ بر پایه اعداد موتور — اعداد از result می‌آیند نه از مدل زبانی
function buildNarrative(
  parsed: ParsedIntent, fields: FieldMeta[], result: ReturnType<typeof runQuery>, datasetName: string,
): string {
  const lines: string[] = []
  const measure = parsed.measureFieldId ? fields.find(f => f.id === parsed.measureFieldId) : null
  const dim = parsed.dimensionFieldId ? fields.find(f => f.id === parsed.dimensionFieldId) : null

  const alias = measureAlias(parsed.measureFieldId ?? undefined, parsed.agg, fields)
  const totalVal = result.totals[alias]
  const fmt = (v: number) => measure?.type === 'amount'
    ? formatAmount(v, { autoUnitLabel: true })
    : formatNumber(Math.round(v * 100) / 100)

  const filterText = parsed.filters.length > 0
    ? ` با اعمال ${toPersianDigits(String(parsed.filters.length))} فیلتر`
    : ''

  if (dim && result.rows.length > 0) {
    const sorted = [...result.rows].sort((a, b) => (typeof b[alias] === 'number' ? b[alias] as number : 0) - (typeof a[alias] === 'number' ? a[alias] as number : 0))
    const top = sorted[0]
    const bottom = sorted[sorted.length - 1]
    lines.push(`${alias} به تفکیک «${dim.label}»${filterText} در مجموعه‌داده «${datasetName}» محاسبه شد.`)
    lines.push(`بیشترین مقدار مربوط به «${top[dim.id] ?? '—'}» با ${fmt(top[alias] as number)} است.`)
    if (sorted.length > 1 && bottom[dim.id] !== null) {
      lines.push(`کمترین مقدار مربوط به «${bottom[dim.id] ?? '—'}» با ${fmt(bottom[alias] as number)} است.`)
    }
    lines.push(`در کل ${formatNumber(result.scannedRecords)} رکورد بررسی و ${formatNumber(result.rowCount)} گروه ساخته شد.`)
  } else if (typeof totalVal === 'number') {
    lines.push(`${alias} در مجموعه‌داده «${datasetName}»${filterText} برابر ${fmt(totalVal)} است.`)
    lines.push(`این عدد با موتور تحلیل سامانه روی ${formatNumber(result.scannedRecords)} رکورد محاسبه شده است.`)
  } else {
    lines.push(`نتیجه محاسبه روی ${formatNumber(result.scannedRecords)} رکورد آماده شد؛ سطرها در جدول پاسخ نمایش داده شده‌اند.`)
  }
  if (result.warnings.length > 0) lines.push(`هشدار: ${result.warnings.join('؛ ')}`)
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const datasetId = String(body.datasetId ?? '')
    const question = String(body.question ?? '').trim()
    if (!datasetId) return fail('شناسه مجموعه‌داده الزامی است.', 400)
    if (!question) return fail('پرسش را وارد کنید.', 400)
    if (question.length > 500) return fail('پرسش بیش از حد بلند است (حداکثر ۵۰۰ نویسه).', 400)

    const ds = await db.dataset.findUnique({ where: { id: datasetId } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    if (records.length === 0) {
      return ok({
        understood: false,
        answer: 'این مجموعه‌داده رکورد قابل دسترسی ندارد؛ در نبود داده کافی سامانه اعلام ناتوانی می‌کند (الزام بخش ۲۵ سند).',
        trace: null, result: null, notices: ['داده کافی برای پاسخ وجود ندارد.'],
      })
    }
    const safeFields = maskFieldsMeta(fields, user.role)

    // مقادیر نمونه ستون‌ها برای تشخیص فیلتر در متن پرسش (حداکثر ۳۰ مقدار متمایز هر ستون)
    const samples: Record<string, string[]> = {}
    for (const f of safeFields) {
      if (f.role === 'measure') continue
      const vals = new Set<string>()
      for (const r of records.slice(0, 1000)) {
        const v = r[f.id]
        if (v === null || v === undefined || String(v).trim() === '') continue
        vals.add(String(v))
        if (vals.size >= 30) break
      }
      samples[f.id] = [...vals]
    }

    // گام ۱: تفسیر محلی؛ گام ۲: در صورت شکست و فعال‌بودن سیاست، مدل زبانی
    let parsed = parseLocal(question, safeFields, samples)
    if (!parsed.understood) {
      const llmParsed = await parseWithLlm(question, safeFields)
      if (llmParsed.understood) parsed = llmParsed
      else if (llmParsed.interpreter === 'none') parsed.explanation = llmParsed.explanation
    }

    if (!parsed.understood) {
      const fieldList = safeFields.filter(f => f.role !== 'measure').map(f => `«${f.label}»`).slice(0, 8).join('، ')
      const measureList = safeFields.filter(f => f.role === 'measure' || ['integer', 'decimal', 'amount', 'percent'].includes(f.type)).map(f => `«${f.label}»`).slice(0, 6).join('، ')
      return ok({
        understood: false,
        answer: [
          'پرسش شما را با ستون‌های این مجموعه‌داده نتوانستم به محاسبه تبدیل کنم (الزام بخش ۲۵: اعلام ناتوانی).',
          parsed.explanation && parsed.interpreter !== 'local' ? parsed.explanation : '',
          `بُعدهای قابل پرسش: ${fieldList || '—'}`,
          `سنجه‌های قابل محاسبه: ${measureList || 'تعداد رکورد'}`,
          'مثال: «جمع مبلغ به تفکیک استان» یا «میانگین تعداد در فارس».',
        ].filter(Boolean).join('\n'),
        trace: null, result: null, notices: ['پرسش با ستون‌های موجود تطبیق نیافت.'],
      })
    }

    // اجرای پرس‌وجو با موتور دقیق سامانه — اعداد فقط از اینجا
    const spec: QuerySpec = {
      dimensions: parsed.dimensionFieldId ? [parsed.dimensionFieldId] : [],
      measures: parsed.agg === 'count'
        ? [{ agg: 'count', alias: 'تعداد رکورد' }]
        : parsed.measureFieldId
          ? [{ fieldId: parsed.measureFieldId, agg: parsed.agg, alias: measureAlias(parsed.measureFieldId, parsed.agg, fields) }]
          : [{ agg: 'count', alias: 'تعداد رکورد' }],
      filters: parsed.filters,
      limit: 50,
    }
    const result = runQuery(records, fields, spec)
    const narrative = buildNarrative(parsed, safeFields, result, ds.name)

    return ok({
      understood: true,
      answer: narrative,
      interpreter: parsed.interpreter,
      interpretation: parsed.explanation,
      trace: {
        dataset: { id: ds.id, name: ds.name },
        measure: parsed.measureFieldId
          ? { fieldId: parsed.measureFieldId, label: safeFields.find(f => f.id === parsed.measureFieldId)?.label, agg: parsed.agg }
          : { fieldId: null, label: 'تعداد رکورد', agg: 'count' },
        dimension: parsed.dimensionFieldId
          ? { fieldId: parsed.dimensionFieldId, label: safeFields.find(f => f.id === parsed.dimensionFieldId)?.label }
          : null,
        filters: parsed.filters.map(f => ({ fieldId: f.fieldId, label: safeFields.find(x => x.id === f.fieldId)?.label ?? f.fieldId, op: f.op, value: f.value })),
      },
      result,
      notices: [],
    })
  } catch (e) {
    return errorResponse(e)
  }
}
