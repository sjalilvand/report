// موتور ارزیابی هشدارها و تولید اعلان — بخش ۲۶.۲ سند
// شش محرک الزامی سند:
//   threshold        — عبور شاخص از آستانه
//   quality          — کاهش کیفیت داده
//   fileDelay        — تأخیر در دریافت فایل
//   processFailure   — شکست پردازش
//   structureChange  — تغییر ساختار
//   missingPeriod    — نبود داده در دوره مورد انتظار
// اعلان‌ها درون‌برنامه‌ای هستند؛ جلوگیری از تکرار با فحص اعلان بازِ همان قاعده (dedup)

import { db } from './db'
import { DataRow, FieldMeta } from './types'
import { profileDataset } from './profile'
import { toLatinDigits } from './digits'
import { parseJson } from './server'

export const ALERT_TYPES = ['threshold', 'quality', 'fileDelay', 'processFailure', 'structureChange', 'missingPeriod'] as const
export type AlertType = (typeof ALERT_TYPES)[number]

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  threshold: 'عبور شاخص از آستانه',
  quality: 'کاهش کیفیت داده',
  fileDelay: 'تأخیر در دریافت فایل',
  processFailure: 'شکست پردازش',
  structureChange: 'تغییر ساختار',
  missingPeriod: 'نبود داده در دوره مورد انتظار',
}

export const SEVERITY_LABELS: Record<string, string> = {
  info: 'اطلاعی',
  warning: 'هشدار',
  critical: 'بحرانی',
}

const AGG_LABELS: Record<string, string> = {
  sum: 'جمع', avg: 'میانگین', count: 'تعداد رکورد', min: 'کمینه', max: 'بیشینه', countDistinct: 'تعداد متمایز',
}

const OPS: Record<string, (a: number, b: number) => boolean> = {
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  eq: (a, b) => Math.abs(a - b) < 1e-9,
}

const OP_LABELS: Record<string, string> = { gt: 'بزرگ‌تر از', gte: 'بزرگ‌تر یا مساوی', lt: 'کوچک‌تر از', lte: 'کوچک‌تر یا مساوی', eq: 'مساوی' }

// محاسبه مقدار تجمیعی یک ستون — سازگار با مقادیر فارسی/اعشاری
export function aggregateField(records: DataRow[], fieldId: string | null | undefined, agg: string): number {
  if (agg === 'count') return records.length
  const values: number[] = []
  const distinct = new Set<string>()
  for (const r of records) {
    const raw = fieldId ? r[fieldId] : null
    const s = raw === null || raw === undefined ? '' : String(raw).trim()
    if (s === '') continue
    if (agg === 'countDistinct') { distinct.add(s); continue }
    const n = parseFloat(toLatinDigits(s).replace('٫', '.').replace(/[,\u060C]/g, ''))
    if (Number.isFinite(n)) values.push(n)
  }
  if (agg === 'countDistinct') return distinct.size
  if (values.length === 0) return 0
  switch (agg) {
    case 'sum': return values.reduce((a, b) => a + b, 0)
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length
    case 'min': return Math.min(...values)
    case 'max': return Math.max(...values)
    default: return values.length
  }
}

// امتیاز کیفیت کل مجموعه‌داده (۰ تا ۱۰۰) — بر پایه پروفایل بخش ۹
// کسرها: سطر تکراری، خالی‌بودن ستون‌ها، ستون‌های partial/inconsistent و خطاهای الگو
export function qualityScore(profile: ReturnType<typeof profileDataset>): number {
  const total = profile.rowCount
  if (total === 0) return 0
  let score = 100
  const dupPercent = (profile.duplicateRows / total) * 100
  score -= Math.min(20, dupPercent * 0.5)
  const fields = profile.fields.filter(f => f.total > 0)
  if (fields.length > 0) {
    const avgNull = fields.reduce((a, f) => a + f.nullPercent, 0) / fields.length * 100
    score -= Math.min(25, avgNull * 0.4)
    const inconsistent = fields.filter(f => f.quality === 'inconsistent').length
    const partial = fields.filter(f => f.quality === 'partial').length
    score -= (inconsistent / fields.length) * 30
    score -= (partial / fields.length) * 15
    const violations = fields.reduce((a, f) => a + f.patternViolations, 0)
    score -= Math.min(15, (violations / total) * 10)
  }
  return Math.max(0, Math.round(score * 10) / 10)
}

// امضای ساختار مجموعه‌داده — تغییر نام/ترتیب/نوع ستون‌ها را آشکار می‌کند
// برچسب (label) در امضا نیست چون تغییر نمایشی است و شناسه پایدار می‌ماند
function structureSignature(fields: FieldMeta[]): string {
  return JSON.stringify(fields.map(f => ({ n: f.sourceName, t: f.type, u: f.unit ?? null })).sort((a, b) => a.n.localeCompare(b.n, 'fa')))
}

interface NotifyInput {
  projectId: string
  ruleId?: string | null
  type: string
  severity: string
  title: string
  message: string
  entityType?: string
  entityId?: string
  value?: number | null
}

// ایجاد اعلان با جلوگیری از تکرار — اگر اعلانِ نخواندهٔ همان قاعده و همان نوع باز باشد، نسخه جدید ساخته نمی‌شود
export async function pushNotification(input: NotifyInput): Promise<{ created: boolean; id?: string }> {
  if (input.ruleId) {
    const open = await db.notification.findFirst({
      where: { ruleId: input.ruleId, type: input.type, read: false },
      select: { id: true },
    })
    if (open) return { created: false, id: open.id }
  }
  const n = await db.notification.create({
    data: {
      projectId: input.projectId,
      ruleId: input.ruleId ?? null,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      value: input.value ?? null,
    },
  })
  return { created: true, id: n.id }
}

// اعلان سیستمی بدون قاعده (شکست پردازش، توقف به‌روزرسانی و ...) — همیشه ثبت می‌شود
export async function pushSystemNotification(input: Omit<NotifyInput, 'ruleId'>): Promise<void> {
  await db.notification.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      value: input.value ?? null,
    },
  })
}

export interface EvalResult {
  ruleId: string
  ruleName: string
  type: AlertType
  fired: boolean
  created: boolean      // اعلان جدید ساخته شد؟ (dedup)
  stillOpen?: boolean   // اعلان باز قبلی وجود دارد
  value?: number | null
  message?: string
  skipped?: string      // دلیل ارزیابی‌نشدن
}

// ارزیابی یک قاعده هشدار — خروجی: آیا هشدار فعال شد و اعلان ساخته شد
export async function evaluateAlertRule(rule: {
  id: string; name: string; type: string; projectId: string
  datasetId: string | null; fieldId: string | null; aggregation: string
  operator: string; threshold: number | null; maxDays: number | null
  severity: string; lastEvalAt: Date | null; lastState: string | null
}): Promise<EvalResult> {
  const type = rule.type as AlertType
  const base: EvalResult = { ruleId: rule.id, ruleName: rule.name, type, fired: false, created: false }

  // مجموعه‌داده مرتبط (برای انواع داده‌محور الزامی است)
  let ds: { id: string; name: string; projectId: string; rowCount: number; fields: string; records: string; updatedAt: Date; fileId: string | null } | null = null
  if (['threshold', 'quality', 'fileDelay', 'structureChange', 'missingPeriod'].includes(type)) {
    if (!rule.datasetId) return { ...base, skipped: 'مجموعه‌داده مشخص نشده است.' }
    ds = await db.dataset.findUnique({
      where: { id: rule.datasetId },
      select: { id: true, name: true, projectId: true, rowCount: true, fields: true, records: true, updatedAt: true, fileId: true },
    })
    if (!ds) return { ...base, skipped: 'مجموعه‌داده یافت نشد.' }
  }

  let fireMessage = ''
  let observed: number | null = null

  switch (type) {
    case 'threshold': {
      if (!rule.fieldId && rule.aggregation !== 'count') return { ...base, skipped: 'ستون سنجه مشخص نشده است.' }
      if (rule.threshold === null || rule.threshold === undefined) return { ...base, skipped: 'آستانه مشخص نشده است.' }
      const records = parseJson<DataRow[]>(ds!.records, [])
      const value = aggregateField(records, rule.fieldId, rule.aggregation)
      observed = value
      const op = OPS[rule.operator] ?? OPS.gt
      if (op(value, rule.threshold)) {
        fireMessage = `${AGG_LABELS[rule.aggregation] ?? rule.aggregation} «${rule.name}» برابر ${value.toLocaleString('fa-IR')} است و از آستانه ${rule.threshold.toLocaleString('fa-IR')} عبور کرده (${OP_LABELS[rule.operator] ?? rule.operator} — بخش ۲۶.۲ سند).`
      } else {
        // عبور نکرده — اعلان باز قبلی (در صورت وجود) خودبه‌خود خوانده‌شده تلقی نمی‌شود؛ فقط وضعیت ثبت می‌شود
        await db.alertRule.update({ where: { id: rule.id }, data: { lastEvalAt: new Date(), lastState: JSON.stringify({ value, breach: false, at: new Date().toISOString() }) } })
        return { ...base, value }
      }
      break
    }

    case 'quality': {
      if (rule.threshold === null || rule.threshold === undefined) return { ...base, skipped: 'حد آستانه کیفیت مشخص نشده است.' }
      const fields = parseJson<FieldMeta[]>(ds!.fields, [])
      const records = parseJson<DataRow[]>(ds!.records, [])
      const score = qualityScore(profileDataset(records, fields))
      observed = score
      if (score < rule.threshold) {
        fireMessage = `امتیاز کیفیت مجموعه‌داده «${ds!.name}» به ${score.toLocaleString('fa-IR')} کاهش یافته و از حد مجاز ${rule.threshold.toLocaleString('fa-IR')} پایین‌تر است (بخش ۲۶.۲ سند: کاهش کیفیت داده).`
      } else {
        await db.alertRule.update({ where: { id: rule.id }, data: { lastEvalAt: new Date(), lastState: JSON.stringify({ score, breach: false, at: new Date().toISOString() }) } })
        return { ...base, value: score }
      }
      break
    }

    case 'fileDelay': {
      if (rule.maxDays === null || rule.maxDays === undefined) return { ...base, skipped: 'حداکثر فاصله مجاز مشخص نشده است.' }
      const file = ds?.fileId ? await db.sourceFile.findUnique({ where: { id: ds.fileId }, select: { name: true, createdAt: true } }) : null
      if (!file) return { ...base, skipped: 'فایل منبع یافت نشد.' }
      const ageMs = Date.now() - file.createdAt.getTime()
      const ageDays = ageMs / 86_400_000
      observed = Math.round(ageDays * 10) / 10
      if (ageDays > rule.maxDays) {
        fireMessage = `فایل «${file.name}» (منبع مجموعه‌داده «${ds!.name}») به مدت ${observed.toLocaleString('fa-IR')} روز به‌روزرسانی نشده و از سقف ${rule.maxDays.toLocaleString('fa-IR')} روز گذشته است (بخش ۲۶.۲ سند: تأخیر در دریافت فایل).`
      } else {
        await db.alertRule.update({ where: { id: rule.id }, data: { lastEvalAt: new Date(), lastState: JSON.stringify({ ageDays: observed, breach: false, at: new Date().toISOString() }) } })
        return { ...base, value: observed }
      }
      break
    }

    case 'processFailure': {
      // اسکن رویدادهای شکست پردازش پس از آخرین ارزیابی
      const since = rule.lastEvalAt ?? new Date(Date.now() - 7 * 86_400_000)
      const failures = await db.auditEvent.count({
        where: { projectId: rule.projectId, action: 'شکست پردازش', createdAt: { gt: since } },
      })
      observed = failures
      if (failures > 0) {
        fireMessage = `${failures.toLocaleString('fa-IR')} رویداد شکست پردازش از آخرین بررسی ثبت شده است (بخش ۲۶.۲ سند).`
      } else {
        await db.alertRule.update({ where: { id: rule.id }, data: { lastEvalAt: new Date(), lastState: JSON.stringify({ failures, breach: false, at: new Date().toISOString() }) } })
        return { ...base, value: 0 }
      }
      break
    }

    case 'structureChange': {
      const fields = parseJson<FieldMeta[]>(ds!.fields, [])
      const signature = structureSignature(fields)
      const prev = parseJson<{ signature?: string }>(rule.lastState, {})
      if (prev.signature && prev.signature !== signature) {
        fireMessage = `ساختار ستون‌های مجموعه‌داده «${ds!.name}» تغییر کرده است؛ بازبینی گزارش‌ها و روابط وابسته توصیه می‌شود (بخش ۲۶.۲ سند: تغییر ساختار).`
      } else {
        await db.alertRule.update({ where: { id: rule.id }, data: { lastEvalAt: new Date(), lastState: JSON.stringify({ signature, breach: false, at: new Date().toISOString() }) } })
        return { ...base }
      }
      break
    }

    case 'missingPeriod': {
      const minExpected = rule.threshold ?? 1
      const rc = ds!.rowCount
      observed = rc
      if (rc < minExpected) {
        fireMessage = `مجموعه‌داده «${ds!.name}» دارای ${rc.toLocaleString('fa-IR')} رکورد است؛ کمینه مورد انتظار دوره ${minExpected.toLocaleString('fa-IR')} رکورد بود (بخش ۲۶.۲ سند: نبود داده در دوره مورد انتظار).`
      } else {
        await db.alertRule.update({ where: { id: rule.id }, data: { lastEvalAt: new Date(), lastState: JSON.stringify({ rowCount: rc, breach: false, at: new Date().toISOString() }) } })
        return { ...base, value: rc }
      }
      break
    }

    default:
      return { ...base, skipped: 'نوع هشدار شناخته‌شده نیست.' }
  }

  const res = await pushNotification({
    projectId: rule.projectId,
    ruleId: rule.id,
    type,
    severity: rule.severity,
    title: rule.name,
    message: fireMessage,
    entityType: ds ? 'dataset' : 'rule',
    entityId: ds?.id ?? rule.id,
    value: observed,
  })
  await db.alertRule.update({
    where: { id: rule.id },
    data: {
      lastEvalAt: new Date(),
      lastState: JSON.stringify({ breach: true, value: observed, at: new Date().toISOString() }),
    },
  })
  return {
    ...base,
    fired: true,
    created: res.created,
    stillOpen: !res.created,
    value: observed,
    message: fireMessage,
  }
}

// ارزیابی همه قواعد فعال یک پروژه
export async function evaluateProjectRules(projectId: string): Promise<EvalResult[]> {
  const rules = await db.alertRule.findMany({ where: { projectId, active: true } })
  const results: EvalResult[] = []
  for (const r of rules) {
    try {
      results.push(await evaluateAlertRule(r))
    } catch (e) {
      results.push({ ruleId: r.id, ruleName: r.name, type: r.type as AlertType, fired: false, created: false, skipped: e instanceof Error ? e.message : 'خطای ارزیابی' })
    }
  }
  return results
}
