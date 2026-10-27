// موتور اتصال بصری جداول — بخش ۱۶ سند
// انواع رابطه (۱۶.۱)، انواع اتصال (۱۶.۲)، کنترل‌های الزامی پیش از اتصال (۱۶.۳)
// و جلوگیری از چندبرابرشدن مبالغ (۱۶.۴)

import { DataRow, FieldMeta } from './types'
import { toLatinDigits } from './digits'

export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'anti' | 'append'
export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' | 'unknown'

export const JOIN_TYPE_LABELS: Record<JoinType, string> = {
  inner: 'Inner Join — اشتراک تطبیق‌ها',
  left: 'Left Join — همه رکوردهای جدول اصلی',
  right: 'Right Join — همه رکوردهای جدول دوم',
  full: 'Full Outer Join — همه رکوردهای هر دو جدول',
  anti: 'Anti Join — رکوردهای بدون تطبیق',
  append: 'Append/Union — افزودن سطرهای هم‌ساختار',
}

export const CARDINALITY_LABELS: Record<Cardinality, string> = {
  'one-to-one': 'یک‌به‌یک',
  'one-to-many': 'یک‌به‌چند',
  'many-to-one': 'چندبه‌یک',
  'many-to-many': 'چندبه‌چند',
  'unknown': 'نامشخص',
}

export interface ColumnPair {
  fromFieldId: string
  toFieldId: string
}

// نتیجه کنترل‌های الزامی پیش از اتصال — بخش ۱۶.۳ سند
export interface JoinCheckResult {
  status: 'ok' | 'warning' | 'blocked'
  typeCompatible: boolean
  typeIssues: string[]
  leftNulls: number        // تعداد رکورد با کلید ناقص در جدول اصلی
  rightNulls: number       // تعداد رکورد با کلید ناقص در جدول دوم
  leftDupGroups: number    // گروه‌های کلید تکراری جدول اصلی
  rightDupGroups: number   // گروه‌های کلید تکراری جدول دوم
  leftMaxDup: number       // بیشینه تکرار یک کلید
  rightMaxDup: number
  matchPercent: number     // درصد تطبیق کلیدهای جدول اصلی در جدول دوم
  leftUnmatched: number    // رکوردهای بدون تطبیق جدول اصلی
  rightUnmatched: number
  rowsBefore: { left: number; right: number }
  rowsAfter: number        // تعداد رکورد پس از اتصال (به‌ازای joinType انتخابی)
  rowExplosion: boolean    // افزایش غیرمنتظره تعداد سطر — بخش ۱۶.۳
  cardinalityDetected: Cardinality
  sampleRows: DataRow[]    // پیش‌نمایش نتیجه اتصال
  sampleFields: FieldMeta[]
  warnings: string[]
  errors: string[]
  remedies?: string[]      // راهکارهای بخش ۱۶.۴ در صورت اتصال چندبه‌چند
}

// نرمال‌سازی مقدار کلید برای مقایسه — ارقام فارسی، فاصله و حروف عربی/فارسی
export function normalizeKey(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = toLatinDigits(String(v)).trim().replace(/\s+/g, ' ')
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    // مقایسه عددی: ۰۵ و ۵ برابرند اما کدهای شناسه متنی حفظ می‌شوند
    const n = Number(s)
    if (Number.isFinite(n)) return String(n)
  }
  // یکسان‌سازی ی/ک عربی با فارسی
  s = s.replace(/ي/g, 'ی').replace(/ك/g, 'ک')
  return s
}

function keyOf(rec: DataRow, pairs: ColumnPair[], side: 'from' | 'to'): string {
  return pairs.map(p => normalizeKey(rec[side === 'from' ? p.fromFieldId : p.toFieldId])).join('§')
}

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === ''
}

// سازگاری نوع داده کلیدها — بخش ۱۶.۳ (سازگاری نوع داده کلیدها)
const FAMILY: Record<string, string> = {
  text: 'text', category: 'text', identifier: 'text', geo: 'text', boolean: 'text',
  integer: 'number', decimal: 'number', amount: 'number', percent: 'number',
  date: 'time', time: 'time', datetime: 'time',
}

export function typeCompatible(a: string, b: string): boolean {
  const fa = FAMILY[a] ?? 'text'
  const fb = FAMILY[b] ?? 'text'
  return fa === fb
}

// ترکیب فیلدهای دو جدول — فیلدهای جدول دوم با پیشوند یکتا تا با جدول اصلی تداخل نکنند
export function buildCombinedFields(leftFields: FieldMeta[], rightFields: FieldMeta[], rightDatasetName: string): { left: FieldMeta[]; right: FieldMeta[]; combined: FieldMeta[] } {
  const right = rightFields.map(f => ({ ...f, id: `j__${f.id}`, description: `از جدول «${rightDatasetName}»${f.description ? ' — ' + f.description : ''}` }))
  return { left: leftFields, right, combined: [...leftFields, ...right] }
}

function nullRecord(fields: FieldMeta[]): DataRow {
  const out: DataRow = {}
  for (const f of fields) out[f.id] = null
  return out
}

// اجرای اتصال — انواع اتصال بخش ۱۶.۲
// مقدار بازگشتی رکوردهای کامل است؛ برای پیش‌نمایش در فراخوانی محدود کنید
export function executeJoin(
  leftRecs: DataRow[],
  rightRecs: DataRow[],
  pairs: ColumnPair[],
  joinType: JoinType,
  fields: { left: FieldMeta[]; right: FieldMeta[] }
): DataRow[] {
  if (pairs.length === 0) return []
  const rightNulls = nullRecord(fields.right)
  const leftNulls = nullRecord(fields.left)
  const rightIndex = new Map<string, DataRow[]>()
  for (const r of rightRecs) {
    const k = keyOf(r, pairs, 'to')
    if (k === '' || k.split('§').every(x => x === '')) continue // کلید خالی تطبیق نمی‌خورد
    const arr = rightIndex.get(k)
    if (arr) arr.push(r)
    else rightIndex.set(k, [r])
  }
  const leftIndex = new Map<string, DataRow[]>()
  for (const l of leftRecs) {
    const k = keyOf(l, pairs, 'from')
    const arr = leftIndex.get(k)
    if (arr) arr.push(l)
    else leftIndex.set(k, [l])
  }

  const out: DataRow[] = []
  switch (joinType) {
    case 'inner':
    case 'left':
    case 'full': {
      for (const l of leftRecs) {
        const k = keyOf(l, pairs, 'from')
        const matches = rightIndex.get(k)
        if (matches && matches.length > 0) {
          for (const r of matches) out.push({ ...l, ...r })
        } else if (joinType !== 'inner') {
          out.push({ ...l, ...rightNulls })
        }
      }
      if (joinType === 'full') {
        for (const r of rightRecs) {
          const k = keyOf(r, pairs, 'to')
          if (!leftIndex.has(k)) out.push({ ...leftNulls, ...r })
        }
      }
      return out
    }
    case 'right': {
      for (const r of rightRecs) {
        const k = keyOf(r, pairs, 'to')
        const matches = leftIndex.get(k)
        if (matches && matches.length > 0) {
          for (const l of matches) out.push({ ...l, ...r })
        } else {
          out.push({ ...leftNulls, ...r })
        }
      }
      return out
    }
    case 'anti': {
      for (const l of leftRecs) {
        const k = keyOf(l, pairs, 'from')
        if (!rightIndex.has(k)) out.push({ ...l })
      }
      return out
    }
    default:
      return []
  }
}

// Append/Union — افزودن سطرهای هم‌ساختار (بخش ۱۶.۲: دو عملیات متفاوت با اتصال کلیدی)
export function executeAppend(a: DataRow[], b: DataRow[], aFields: FieldMeta[], bFields: FieldMeta[]): { records: DataRow[]; fields: FieldMeta[]; warnings: string[] } {
  const warnings: string[] = []
  // نگاشت فیلدها بر اساس برچسب (نام نمایشی) — فیلدهای مشترک هم‌راستا می‌شوند
  const byLabel = new Map(bFields.map(f => [f.label.trim(), f]))
  const fields: FieldMeta[] = aFields.map(f => {
    const match = byLabel.get(f.label.trim())
    if (match && !typeCompatible(f.type, match.type)) {
      warnings.push(`نوع ستون «${f.label}» در دو فایل متفاوت است (${f.type} در برابر ${match.type})؛ پس از افزودن یکسان‌سازی کنید.`)
    }
    return f
  })
  const missing = bFields.filter(f => !aFields.some(x => x.label.trim() === f.label.trim()))
  for (const m of missing) {
    warnings.push(`ستون «${m.label}» در فایل دوم وجود دارد اما در فایل اصلی نیست؛ برای رکوردهای فایل اصلی مقدار خالی در نظر گرفته شد.`)
    fields.push({ ...m })
  }
  const align = (rec: DataRow, own: FieldMeta[]) => {
    const out: DataRow = {}
    for (const f of fields) {
      const src = own.find(x => x.label.trim() === f.label.trim())
      out[f.id] = src ? rec[src.id] ?? null : null
    }
    return out
  }
  return {
    records: [...a.map(r => align(r, aFields)), ...b.map(r => align(r, bFields))],
    fields,
    warnings,
  }
}

// تجمیع پیش از اتصال — راهکار بخش ۱۶.۴ برای جلوگیری از چندبرابرشدن مبالغ
// رکوردهای سمت «چند» بر اساس کلید تجمیع می‌شوند تا هر کلید یک سطر شود
export function preAggregate(recs: DataRow[], pairs: ColumnPair[], side: 'from' | 'to', fields: FieldMeta[]): { records: DataRow[]; aggregatedFields: string[] } {
  const keyFields = side === 'from' ? pairs.map(p => p.fromFieldId) : pairs.map(p => p.toFieldId)
  const measureFields = fields.filter(f => !keyFields.includes(f.id) && ['amount', 'decimal', 'integer', 'percent'].includes(f.type)).map(f => f.id)
  const groups = new Map<string, DataRow[]>()
  for (const r of recs) {
    const k = keyOf(r, pairs, side)
    const arr = groups.get(k)
    if (arr) arr.push(r)
    else groups.set(k, [r])
  }
  const out: DataRow[] = []
  for (const group of groups.values()) {
    const merged: DataRow = { ...group[0] }
    for (const fid of measureFields) {
      const vals = group.map(r => {
        const s = toLatinDigits(String(r[fid] ?? '')).replace(/[٫,\s]/g, m => (m === '٫' ? '.' : ''))
        const n = parseFloat(s)
        return Number.isFinite(n) ? n : null
      }).filter((v): v is number => v !== null)
      // جمع سنجه‌های جمع‌پذیر؛ سایر ستون‌ها اولین مقدار نگه داشته می‌شود
      if (vals.length > 0) merged[fid] = vals.reduce((a, b) => a + b, 0)
    }
    out.push(merged)
  }
  return { records: out, aggregatedFields: measureFields }
}

// کنترل‌های الزامی پیش از اتصال — بخش ۱۶.۳ سند
export function analyzeJoin(
  leftRecs: DataRow[],
  rightRecs: DataRow[],
  leftFields: FieldMeta[],
  rightFields: FieldMeta[],
  pairs: ColumnPair[],
  joinType: JoinType,
  options?: { preAggregated?: boolean }
): JoinCheckResult {
  const warnings: string[] = []
  const errors: string[] = []
  const typeIssues: string[] = []
  const lById = new Map(leftFields.map(f => [f.id, f]))
  const rById = new Map(rightFields.map(f => [f.id, f]))

  // اعتبارسنجی جفت‌ستون‌ها
  for (const p of pairs) {
    const lf = lById.get(p.fromFieldId)
    const rf = rById.get(p.toFieldId)
    if (!lf) errors.push(`ستون «${p.fromFieldId}» در جدول اصلی یافت نشد.`)
    if (!rf) errors.push(`ستون «${p.toFieldId}» در جدول دوم یافت نشد.`)
    if (lf && rf) {
      if (!typeCompatible(lf.type, rf.type)) {
        typeIssues.push(`نوع ستون «${lf.label}» (${lf.type}) با «${rf.label}» (${rf.type}) سازگار نیست — بخش ۱۶.۳ سند.`)
      }
    }
  }
  if (pairs.length === 0) errors.push('حداقل یک جفت‌ستون کلید باید انتخاب شود.')
  if (errors.length > 0) {
    return {
      status: 'blocked', typeCompatible: typeIssues.length === 0, typeIssues,
      leftNulls: 0, rightNulls: 0, leftDupGroups: 0, rightDupGroups: 0, leftMaxDup: 0, rightMaxDup: 0,
      matchPercent: 0, leftUnmatched: 0, rightUnmatched: 0,
      rowsBefore: { left: leftRecs.length, right: rightRecs.length }, rowsAfter: 0, rowExplosion: false,
      cardinalityDetected: 'unknown', sampleRows: [], sampleFields: [], warnings, errors,
    }
  }

  // تعداد مقادیر خالی کلید
  const leftNulls = leftRecs.filter(r => pairs.some(p => isBlank(r[p.fromFieldId]))).length
  const rightNulls = rightRecs.filter(r => pairs.some(p => isBlank(r[p.toFieldId]))).length

  // کلیدهای تکراری
  const dupStats = (recs: DataRow[], side: 'from' | 'to') => {
    const counts = new Map<string, number>()
    for (const r of recs) {
      const k = keyOf(r, pairs, side)
      if (k === '' || k.split('§').every(x => x === '')) continue
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    let groups = 0
    let maxDup = 0
    for (const c of counts.values()) {
      if (c > 1) groups++
      if (c > maxDup) maxDup = c
    }
    return { groups, maxDup }
  }
  const lDup = dupStats(leftRecs, 'from')
  const rDup = dupStats(rightRecs, 'to')

  // درصد تطبیق و رکوردهای بدون تطبیق
  const rightKeys = new Set<string>()
  for (const r of rightRecs) {
    const k = keyOf(r, pairs, 'to')
    if (k !== '' && !k.split('§').every(x => x === '')) rightKeys.add(k)
  }
  const leftKeys = new Set<string>()
  for (const l of leftRecs) {
    const k = keyOf(l, pairs, 'from')
    if (k !== '' && !k.split('§').every(x => x === '')) leftKeys.add(k)
  }
  let matched = 0
  for (const k of leftKeys) if (rightKeys.has(k)) matched++
  const matchPercent = leftKeys.size > 0 ? Math.round((matched / leftKeys.size) * 1000) / 10 : 0
  const leftUnmatched = leftKeys.size - matched
  let secondSideUnmatched = 0
  for (const k of rightKeys) if (!leftKeys.has(k)) secondSideUnmatched++

  // تشخیص خودکار نوع رابطه — بخش ۱۶.۱
  const leftUnique = lDup.maxDup <= 1
  const rightUnique = rDup.maxDup <= 1
  const cardinalityDetected: Cardinality =
    leftUnique && rightUnique ? 'one-to-one'
      : leftUnique && !rightUnique ? 'one-to-many'
        : !leftUnique && rightUnique ? 'many-to-one'
          : 'many-to-many'

  const comb = buildCombinedFields(leftFields, rightFields, '')

  // محاسبه تعداد رکورد پس از اتصال برای joinType انتخابی
  const joined = executeJoin(leftRecs, rightRecs, pairs, joinType, { left: leftFields, right: comb.right })
  const rowsAfter = joined.length
  const rowsBefore = { left: leftRecs.length, right: rightRecs.length }
  const rowExplosion = rowsAfter > Math.max(rowsBefore.left, rowsBefore.right) && rowsAfter >= Math.max(rowsBefore.left, rowsBefore.right) * 1.5

  // هشدارها و مسدودسازی — بخش ۱۶.۳ و ۱۶.۴
  if (typeIssues.length > 0) warnings.push(...typeIssues)
  if (lDup.groups > 0) warnings.push(`جدول اصلی ${lDup.groups.toLocaleString('fa-IR')} گروه کلید تکراری دارد (بیشینه ${lDup.maxDup.toLocaleString('fa-IR')} بار)؛ نوع رابطه «چندبه‌یک» را بررسی کنید.`)
  if (rDup.groups > 0) warnings.push(`جدول دوم ${rDup.groups.toLocaleString('fa-IR')} گروه کلید تکراری دارد (بیشینه ${rDup.maxDup.toLocaleString('fa-IR')} بار)؛ رکوردهای جدول اصلی پس از اتصال تکثیر می‌شوند.`)
  if (leftNulls > 0) warnings.push(`${leftNulls.toLocaleString('fa-IR')} رکورد جدول اصلی کلید خالی دارد و در اتصال تطبیق نمی‌خورد.`)
  if (rightNulls > 0) warnings.push(`${rightNulls.toLocaleString('fa-IR')} رکورد جدول دوم کلید خالی دارد.`)
  if (matchPercent < 80) warnings.push(`درصد تطبیق ${matchPercent.toLocaleString('fa-IR')}٪ است؛ کلید نرمال‌سازی‌نشده یا ارزش‌های متفاوت را بررسی کنید (تطبیق پس از نرمال‌سازی ارقام فارسی و فاصله‌ها انجام شده است).`)
  if (rowExplosion) warnings.push(`هشدار افزایش غیرمنتظره سطر: از ${rowsBefore.left.toLocaleString('fa-IR')} به ${rowsAfter.toLocaleString('fa-IR')} رکورد — بخش ۱۶.۳ سند.`)

  let status: JoinCheckResult['status'] = 'ok'
  let remedies: string[] | undefined

  if (cardinalityDetected === 'many-to-many') {
    // جلوگیری از چندبرابرشدن مبالغ — بخش ۱۶.۴ سند
    status = 'blocked'
    errors.push('اتصال چندبه‌چند مسدود شد: در این حالت مبالغ و تعدادها بدون هشدار چندبرابر می‌شوند (بخش ۱۶.۴ سند). تا رفع مشکل، مدل نباید منتشر شود.')
    remedies = [
      'استفاده از جدول واسط (Bridge) برای بازکردن رابطه چندبه‌چند',
      'تجمیع پیش از اتصال: سطرهای سمت «چند» بر اساس کلید جمع شوند (در پرس‌وجوی اتصالی گزینه «تجمیع پیش از اتصال» را فعال کنید)',
      'استفاده از شمارش متمایز (countDistinct) به‌جای تعداد رکورد',
      'تعریف سنجه در جدول مناسب (جدولی که سطح جزئیاتش با سنجه هم‌خوان است)',
    ]
  } else if (joinType === 'append') {
    warnings.push('Append افزودن سطر است نه اتصال کلیدی؛ ساختار دو فایل باید هم‌ساختار باشد (تفاوت مهم بخش ۱۶.۲ سند).')
  } else if (rDup.groups > 0 && rowsAfter > rowsBefore.left) {
    status = 'warning'
    warnings.push('با اتصال فعلی، سنجه‌های جدول دوم در رکوردهای جدول اصلی تکثیر می‌شوند؛ برای جمع سنجه‌های جدول دوم گزینه «تجمیع پیش از اتصال» را فعال کنید (بخش ۱۶.۴ سند).')
  }
  if (options?.preAggregated && rDup.groups > 0) {
    warnings.push('گزینه تجمیع پیش از اتصال فعال است: سطرهای جدول دوم پیش از اتصال بر اساس کلید جمع شدند تا مبالغ چندبرابر نشوند (بخش ۱۶.۴ سند).')
  }

  return {
    status,
    typeCompatible: typeIssues.length === 0,
    typeIssues,
    leftNulls, rightNulls,
    leftDupGroups: lDup.groups, rightDupGroups: rDup.groups,
    leftMaxDup: lDup.maxDup, rightMaxDup: rDup.maxDup,
    matchPercent,
    leftUnmatched, rightUnmatched: secondSideUnmatched,
    rowsBefore, rowsAfter, rowExplosion,
    cardinalityDetected,
    sampleRows: joined.slice(0, 25),
    sampleFields: [...leftFields, ...comb.right],
    warnings, errors, remedies,
  }
}

// تشخیص حلقه و مسیر مبهم در گراف روابط — بخش ۱۶.۳ (کنترل مسیرهای رابطه مبهم یا حلقه‌ای)
export interface GraphIssue {
  kind: 'cycle' | 'ambiguous'
  datasets: string[]
  message: string
}

export function detectGraphIssues(relations: { id: string; fromDatasetId: string; toDatasetId: string; status: string }[]): GraphIssue[] {
  const issues: GraphIssue[] = []
  const active = relations.filter(r => r.status === 'active')
  // حلقه: جست‌وجوی عمقی روی گراف بی‌جهت
  const adj = new Map<string, string[]>()
  const edgeOf = new Map<string, string>()
  for (const r of active) {
    if (!adj.has(r.fromDatasetId)) adj.set(r.fromDatasetId, [])
    if (!adj.has(r.toDatasetId)) adj.set(r.toDatasetId, [])
    adj.get(r.fromDatasetId)!.push(r.toDatasetId)
    adj.get(r.toDatasetId)!.push(r.fromDatasetId)
    edgeOf.set(`${r.fromDatasetId}§${r.toDatasetId}`, r.id)
    edgeOf.set(`${r.toDatasetId}§${r.fromDatasetId}`, r.id)
  }
  const nodes = [...adj.keys()]
  const visited = new Set<string>()
  for (const start of nodes) {
    if (visited.has(start)) continue
    // DFS با ثبت والد برای شناسایی حلقه
    const stack: { node: string; parent: string; path: string[] }[] = [{ node: start, parent: '', path: [start] }]
    const seenLocal = new Set<string>()
    while (stack.length) {
      const cur = stack.pop()!
      if (seenLocal.has(cur.node)) continue
      seenLocal.add(cur.node)
      visited.add(cur.node)
      for (const nb of adj.get(cur.node) ?? []) {
        if (nb === cur.parent) continue
        if (cur.path.includes(nb)) {
          const cyclePath = cur.path.slice(cur.path.indexOf(nb)).concat(nb)
          issues.push({
            kind: 'cycle',
            datasets: cyclePath,
            message: 'حلقه در گراف روابط شناسایی شد؛ جهت اثر فیلترها مبهم می‌شود. یکی از روابط حلقه را غیرفعال یا جهت آن را مشخص کنید (بخش ۱۶.۳ سند).',
          })
        } else {
          stack.push({ node: nb, parent: cur.node, path: [...cur.path, nb] })
        }
      }
    }
  }
  // مسیر مبهم: دو رابطه مستقیم بین همان جفت جدول
  const pairCount = new Map<string, number>()
  for (const r of active) {
    const pair = [r.fromDatasetId, r.toDatasetId].sort().join('§')
    pairCount.set(pair, (pairCount.get(pair) ?? 0) + 1)
  }
  for (const [pair, count] of pairCount) {
    if (count > 1) {
      issues.push({
        kind: 'ambiguous',
        datasets: pair.split('§'),
        message: 'بین دو جدول بیش از یک رابطه فعال وجود دارد؛ مسیر اتصال مبهم است و باید فقط یکی فعال بماند (بخش ۱۶.۳ سند).',
      })
    }
  }
  return issues
}

// پیشنهاد روابط — بخش ۱۶ (روابط پیشنهادی سامانه را بپذیرد یا رد کند)
export interface RelationSuggestion {
  fromDatasetId: string
  toDatasetId: string
  fromDatasetName: string
  toDatasetName: string
  pairs: ColumnPair[]
  score: number
  reason: string
}

function simTokens(a: string, b: string): number {
  const norm = (s: string) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c_\-().]/g, ' ').split(/\s+/).map(t => t.trim()).filter(Boolean)
  const ta = new Set(norm(a))
  const tb = new Set(norm(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / new Set([...norm(a), ...norm(b)]).size
}

export function suggestRelations(datasets: { id: string; name: string; fields: FieldMeta[]; rowCount: number }[]): RelationSuggestion[] {
  const out: RelationSuggestion[] = []
  for (let i = 0; i < datasets.length; i++) {
    for (let j = i + 1; j < datasets.length; j++) {
      const A = datasets[i]
      const B = datasets[j]
      let best: { pairs: ColumnPair[]; score: number; reason: string } | null = null
      for (const fa of A.fields) {
        if (!['identifier', 'category', 'text'].includes(fa.type)) continue
        for (const fb of B.fields) {
          if (!['identifier', 'category', 'text'].includes(fb.type)) continue
          if (!typeCompatible(fa.type, fb.type)) continue
          const na = fa.label.trim()
          const nb = fb.label.trim()
          let score = 0
          let reason = ''
          if (na === nb) {
            score = 0.98
            reason = `نام ستون «${na}» در هر دو جدول یکسان است`
          } else if (na.replace(/\s/g, '') === nb.replace(/\s/g, '')) {
            score = 0.95
            reason = `نام ستون «${na}» و «${nb}» پس از حذف فاصله یکسان‌اند`
          } else {
            const s = simTokens(na, nb)
            if (s >= 0.5) {
              score = s
              reason = `همخوانی نام «${na}» و «${nb}» حدود ${Math.round(s * 100)}٪ است`
            }
          }
          if (score >= 0.5 && (!best || score > best.score)) {
            best = { pairs: [{ fromFieldId: fa.id, toFieldId: fb.id }], score, reason }
          }
        }
      }
      if (best) {
        out.push({
          fromDatasetId: A.id, toDatasetId: B.id,
          fromDatasetName: A.name, toDatasetName: B.name,
          pairs: best.pairs, score: Math.round(best.score * 100) / 100, reason: best.reason,
        })
      }
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 10)
}
