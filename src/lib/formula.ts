// ساخت فیلدهای جدید و محیط فرمول‌نویسی — بخش ۱۲ سند
// زبان امن و کنترل‌شده؛ بدون اجرای کد دلخواه روی سرور (بخش ۱۲.۲)
// پشتیبانی: عملگرهای + − × ÷، پرانتز، تابع اگر(شرط؛ آنگاه؛ وگرنه)، نسبت_ایمن(صورت؛ مخرج)، گرد، مقدار_خالی

import { DataRow, FieldMeta } from './types'
import { toLatinDigits } from './digits'

type Token = { t: 'num' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma' | 'func'; v: string }

const CMP_OPS = ['<=', '>=', '==', '!=', '=', '<', '>']

export function tokenize(src: string): Token[] {
  const s = toLatinDigits(src).replace(/[×✕]/g, '*').replace(/[÷]/g, '/').replace(/[−–]/g, '-')
  const tokens: Token[] = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/\s/.test(ch)) { i++; continue }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      tokens.push({ t: 'num', v: s.slice(i, j) })
      i = j
      continue
    }
    // جداکننده‌ها پیش از بررسی نام فیلد — چون «؛» و «،» در بازه یونیکد عربی‌اند
    if (ch === ',' || ch === '؛' || ch === ';' || ch === '،') { tokens.push({ t: 'comma', v: ',' }); i++; continue }
    if (/[A-Za-z_\u0600-\u06FF]/.test(ch)) {
      let j = i
      while (j < s.length && /[A-Za-z0-9_\u0600-\u06FF]/.test(s[j])) j++
      tokens.push({ t: 'ident', v: s.slice(i, j) })
      i = j
      continue
    }
    // عملگرهای مقایسه‌ای دوحرفی — برای شرط اگر() (بخش ۱۲.۱ فیلد شرطی)
    const two = s.slice(i, i + 2)
    if (CMP_OPS.includes(two)) {
      tokens.push({ t: 'op', v: two })
      i += 2
      continue
    }
    if (CMP_OPS.includes(ch)) {
      tokens.push({ t: 'op', v: ch })
      i++
      continue
    }
    if (ch === '(') { tokens.push({ t: 'lparen', v: ch }); i++; continue }
    if (ch === ')') { tokens.push({ t: 'rparen', v: ch }); i++; continue }
    if ('+-*/'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue }
    throw new Error(`کاراکتر غیرمجاز «${ch}» در فرمول — فقط عملگرهای ریاضی، مقایسه‌ای، پرانتز و نام فیلدها مجاز است (زبان امن بخش ۱۲.۲).`)
  }
  return tokens
}

interface Node { eval: (row: DataRow) => unknown }

function parse(tokens: Token[], fieldNames: Set<string>): Node {
  let pos = 0
  const peek = () => tokens[pos]
  const eat = (t: Token['t'], v?: string): Token => {
    const tok = tokens[pos]
    if (!tok || tok.t !== t || (v && tok.v !== v)) throw new Error(`ساختار فرمول نامعتبر است`)
    pos++
    return tok
  }

  function parseExpr(): Node {
    let left = parseTerm()
    while (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = tokens[pos++].v
      const right = parseTerm()
      const prev = left // کپی مقدار فعلی برای جلوگیری از ارجاع چرخه‌ای
      left = { eval: row => arith(prev.eval(row), right.eval(row), op) }
    }
    return left
  }

  function parseTerm(): Node {
    let left = parseUnary()
    while (peek()?.t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = tokens[pos++].v
      const right = parseTerm()
      const prev = left
      left = { eval: row => arith(prev.eval(row), right.eval(row), op) }
    }
    return left
  }

  function parseUnary(): Node {
    if (peek()?.t === 'op' && (peek().v === '-' || peek().v === '+')) {
      const op = tokens[pos++].v
      const node = parseUnary()
      return { eval: row => op === '-' ? -toNum(node.eval(row)) : toNum(node.eval(row)) }
    }
    return parsePrimary()
  }

  function parsePrimary(): Node {
    const tok = peek()
    if (!tok) throw new Error('فرمول ناتمام است')
    if (tok.t === 'num') {
      pos++
      return { eval: () => parseFloat(tok.v) }
    }
    if (tok.t === 'lparen') {
      eat('lparen')
      const inner = parseExpr()
      eat('rparen')
      return inner
    }
    if (tok.t === 'ident') {
      pos++
      const name = tok.v
      // توابع امن — بخش ۱۲.۲
      if (['اگر', 'اگرنه', 'if'].includes(name)) {
        eat('lparen')
        const cond = parseComparisonExpr()
        eat('comma')
        const thenV = parseExpr()
        eat('comma')
        const elseV = parseExpr()
        eat('rparen')
        return { eval: row => truthy(cond.eval(row)) ? thenV.eval(row) : elseV.eval(row) }
      }
      if (['نسبت_ایمن', 'safeDiv'].includes(name)) {
        eat('lparen')
        const a = parseExpr()
        eat('comma')
        const b = parseExpr()
        eat('rparen')
        return { eval: row => {
          const d = toNum(b.eval(row))
          // مدیریت تقسیم بر صفر — بخش ۱۲.۲: رفتار تعریف‌شده، نه خودکار صفر
          if (d === 0 || Number.isNaN(d)) return null
          return toNum(a.eval(row)) / d
        } }
      }
      if (['گرد', 'round'].includes(name)) {
        eat('lparen')
        const a = parseExpr()
        eat('rparen')
        return { eval: row => Math.round(toNum(a.eval(row))) }
      }
      if (['درصد', 'percentOf'].includes(name)) {
        eat('lparen')
        const a = parseExpr()
        eat('comma')
        const b = parseExpr()
        eat('rparen')
        return { eval: row => { const d = toNum(b.eval(row)); return d === 0 ? null : (toNum(a.eval(row)) / d) * 100 } }
      }
      // مرجع فیلد — فرمول‌ها به شناسه داخلی ستون وابسته‌اند (بخش ۸.۲)
      if (fieldNames.has(name)) {
        return { eval: row => row[name] }
      }
      throw new Error(`نام «${name}» نه فیلد شناخته‌شده است و نه تابع مجاز`)
    }
    throw new Error('ساختار فرمول نامعتبر است')
  }

  // عبارت مقایسه‌ای برای شرط اگر() — بخش ۱۲.۱ (فیلد شرطی)
  function parseComparisonExpr(): Node {
    const left = parseExpr()
    if (peek()?.t === 'op' && CMP_OPS.includes(peek().v)) {
      const op = tokens[pos++].v
      const right = parseExpr()
      return { eval: row => compare(left.eval(row), right.eval(row), op) }
    }
    return left
  }

  const root = parseExpr()
  if (pos !== tokens.length) throw new Error('بخش‌های اضافی در انتهای فرمول')
  return root
}

// مقایسه امن — برای فیلدهای شرطی (بخش ۱۲.۱)
function compare(a: unknown, b: unknown, op: string): boolean {
  const an = toNum(a)
  const bn = toNum(b)
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    switch (op) {
      case '=': case '==': return an === bn
      case '!=': return an !== bn
      case '<': return an < bn
      case '>': return an > bn
      case '<=': return an <= bn
      case '>=': return an >= bn
      default: return false
    }
  }
  const sa = String(a ?? ''), sb = String(b ?? '')
  switch (op) {
    case '=': case '==': return sa === sb
    case '!=': return sa !== sb
    default: return false
  }
}
function truthy(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  const n = toNum(v)
  return Number.isFinite(n) && n !== 0
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (v === null || v === undefined || v === '') return NaN
  const n = parseFloat(toLatinDigits(String(v)).replace(/[,\u060C\s]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function arith(a: unknown, b: unknown, op: string): number | null {
  const x = toNum(a)
  const y = toNum(b)
  if (Number.isNaN(x) || Number.isNaN(y)) return null // رفتار مقادیر خالی: خالی می‌ماند، نه صفر — بخش ۱۲.۲
  switch (op) {
    case '+': return x + y
    case '-': return x - y
    case '*': return x * y
    case '/': return y === 0 ? null : x / y // تقسیم بر صفر → خالی
    default: return null
  }
}

// اجرای فرمول روی همه رکوردها — ساخت ستون محاسباتی در سطح رکورد (بخش ۱۲.۱)
export function computeDerivedField(
  records: DataRow[], fields: FieldMeta[], formula: string, newName: string, newLabel: string
): { records: DataRow[]; field: FieldMeta; errors: string[]; preview: unknown[] } {
  const errors: string[] = []
  let node: Node
  try {
    node = parse(tokenize(formula), new Set(fields.map(f => f.id)))
  } catch (e) {
    return { records, field: fields[0], errors: [e instanceof Error ? e.message : 'خطای فرمول'], preview: [] }
  }
  const out = records.map(r => ({ ...r, [newName]: node.eval(r) }))
  const preview = out.slice(0, 10).map(r => r[newName])
  const field: FieldMeta = {
    id: newName, sourceName: newName, label: newLabel || newName,
    type: 'decimal', role: 'measure', aggregation: 'sum',
    description: `فیلد محاسباتی: ${formula} — بخش ۱۲ سند`,
  }
  return { records: out, field, errors, preview }
}

// بازه‌سازی — بخش ۱۳.۳ سند
export interface BandDef {
  label: string
  from?: number   // شامل مرز پایین
  to?: number     // کمتر از مرز بالا
}

export function createBandedField(
  records: DataRow[], fields: FieldMeta[], sourceFieldId: string,
  bands: BandDef[], newName: string, newLabel: string
): { records: DataRow[]; field: FieldMeta; errors: string[]; coverage: { uncovered: number; overlapping: boolean } } {
  const errors: string[] = []
  // کنترل تداخل بازه‌ها و پوشش — بخش ۱۳.۳
  const sorted = [...bands].sort((a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity))
  let overlapping = false
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (prev.to !== undefined && cur.from !== undefined && cur.from < prev.to) overlapping = true
  }
  if (overlapping) errors.push('بازه‌های هم‌پوشان شناسایی شد؛ مرزها باید روشن باشند (بخش ۱۳.۳ سند).')

  const src = fields.find(f => f.id === sourceFieldId)
  if (!src) { errors.push('ستون مبنای بازه‌سازی یافت نشد.'); return { records, field: fields[0], errors, coverage: { uncovered: 0, overlapping } } }

  let uncovered = 0
  const out = records.map(r => {
    const v = toNum(r[sourceFieldId])
    if (Number.isNaN(v)) return { ...r, [newName]: null }
    const band = sorted.find(b => (b.from === undefined || v >= b.from) && (b.to === undefined || v < b.to))
    if (!band) { uncovered++; return { ...r, [newName]: null } }
    return { ...r, [newName]: band.label }
  })

  const field: FieldMeta = {
    id: newName, sourceName: newName, label: newLabel || newName,
    type: 'category', role: 'dimension', aggregation: 'count',
    description: `بازه مبتنی بر «${src.label}» — مرزها: شامل مرز پایین، تا کمتر از مرز بالا (بخش ۱۳.۳ سند)`,
  }
  return { records: out, field, errors, coverage: { uncovered, overlapping } }
}

// بازه‌های پیشنهادی خودکار با فاصله ثابت — بخش ۱۳.۳
export function suggestBands(min: number, max: number, count = 4): BandDef[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return []
  const span = max - min
  const step = Math.pow(10, Math.floor(Math.log10(span / count)))
  const labels = ['کم', 'متوسط', 'زیاد', 'بسیار زیاد']
  const bands: BandDef[] = []
  let start = Math.floor(min / step) * step
  for (let i = 0; i < count; i++) {
    bands.push({ label: labels[i] ?? `گروه ${i + 1}`, from: start, to: start + step })
    start += step
  }
  bands[bands.length - 1].to = undefined // بازه باز در انتها: «بیش از …»
  return bands
}
