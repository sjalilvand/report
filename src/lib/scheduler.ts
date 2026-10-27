// زمان‌بند خودکار ارزیابی هشدارها — تکمیل بخش ۲۶.۲ سند
// با شروع سرور (instrumentation) فعال می‌شود؛ هر alertEvalIntervalMinutes دقیقه
// همه قواعد فعال همه پروژه‌ها را ارزیابی و اعلان‌های جدید را ثبت می‌کند؛
// در صورت فعال‌بودن کانال ایمیلی، خلاصه اعلان‌های همان چرخه به گیرندگان ارسال می‌شود.

import { db } from './db'
import { getSettings } from './settings'
import { evaluateProjectRules } from './alerts'
import { sendNotificationsDigest } from './mailer'

export interface SchedulerState {
  running: boolean
  intervalMinutes: number
  startedAt: string | null
  lastRunAt: string | null
  lastRunProjects: number
  lastRunEvaluated: number
  lastRunCreated: number
  lastEmailSent: boolean
  lastError: string | null
}

interface SchedulerInternals extends SchedulerState {
  timer: ReturnType<typeof setInterval> | null
  ticking: boolean
  tickCount: number
}

// سینگلتون روی globalThis تا در hot-reload دوباره ساخته نشود
const g = globalThis as unknown as { __alertScheduler?: SchedulerInternals }

export function getSchedulerState(): SchedulerState {
  const s = g.__alertScheduler
  if (!s) return { running: false, intervalMinutes: 0, startedAt: null, lastRunAt: null, lastRunProjects: 0, lastRunEvaluated: 0, lastRunCreated: 0, lastEmailSent: false, lastError: null }
  return {
    running: s.running,
    intervalMinutes: s.intervalMinutes,
    startedAt: s.startedAt,
    lastRunAt: s.lastRunAt,
    lastRunProjects: s.lastRunProjects,
    lastRunEvaluated: s.lastRunEvaluated,
    lastRunCreated: s.lastRunCreated,
    lastEmailSent: s.lastEmailSent,
    lastError: s.lastError,
  }
}

/** یک چرخه کامل ارزیابی — همان مسیر دکمه «بررسی الآن»، برای همه پروژه‌های دارای قاعده فعال */
export async function runEvaluationCycle(): Promise<{ projects: number; evaluated: number; created: number; emailSent: boolean; emailSkipped?: string }> {
  const since = new Date()
  const projectIds = (
    await db.alertRule.findMany({ where: { active: true }, select: { projectId: true }, distinct: ['projectId'] })
  ).map(r => r.projectId)

  let evaluated = 0
  let created = 0
  for (const pid of projectIds) {
    try {
      const results = await evaluateProjectRules(pid)
      evaluated += results.length
      created += results.filter(r => r.created).length
    } catch (e) {
      console.error('[زمان‌بند] خطا در ارزیابی پروژه:', e instanceof Error ? e.message : e)
    }
  }

  // ارسال ایمیل خلاصه — فقط وقتی اعلان جدیدی ساخته شده (بخش ۲۶.۲ کانال ایمیلی)
  let emailSent = false
  let emailSkipped: string | undefined
  try {
    const fresh = created > 0
      ? await db.notification.findMany({ where: { createdAt: { gte: since } }, include: { rule: { select: { name: true } } } })
      : []
    if (fresh.length > 0) {
      const items = fresh.map(n => ({
        title: n.rule?.name || n.title,
        message: n.message,
        severity: n.severity,
      }))
      const res = await sendNotificationsDigest(items, since)
      emailSent = res.ok
      if (res.skipped) emailSkipped = res.reason
    }
  } catch (e) {
    emailSkipped = e instanceof Error ? e.message : 'خطای ناشناخته ارسال ایمیل'
    console.error('[زمان‌بند] خطای ارسال ایمیل:', emailSkipped)
  }

  return { projects: projectIds.length, evaluated, created, emailSent, emailSkipped }
}

async function tick() {
  const s = g.__alertScheduler
  if (!s || s.ticking) return
  s.ticking = true
  try {
    // همگام‌سازی دوره با تنظیمات — تغییر فاصله در تب مدیریت بدون ری‌استارت اعمال می‌شود
    const settings = await getSettings()
    if (s.intervalMinutes !== settings.alertEvalIntervalMinutes) {
      s.intervalMinutes = settings.alertEvalIntervalMinutes
      if (s.timer) clearInterval(s.timer)
      s.timer = setInterval(tick, Math.max(1, s.intervalMinutes) * 60_000)
      console.log(`[زمان‌بند] دوره جدید ارزیابی: هر ${s.intervalMinutes} دقیقه`)
    }

    const res = await runEvaluationCycle()
    s.lastRunAt = new Date().toISOString()
    s.lastRunProjects = res.projects
    s.lastRunEvaluated = res.evaluated
    s.lastRunCreated = res.created
    s.lastEmailSent = res.emailSent
    s.lastError = null
    if (res.evaluated > 0) {
      console.log(`[زمان‌بند] ارزیابی خودکار: ${res.projects} پروژه، ${res.evaluated} قاعده، ${res.created} اعلان جدید${res.emailSent ? ' (ایمیل ارسال شد)' : res.emailSkipped ? ` (ایمیل: ${res.emailSkipped})` : ''}`)
    }
  } catch (e) {
    if (s) s.lastError = e instanceof Error ? e.message : 'خطای ناشناخته'
    console.error('[زمان‌بند] خطا در چرخه ارزیابی:', e)
  } finally {
    s.ticking = false
  }
}

/** شروع زمان‌بند — فقط یک‌بار؛ از instrumentation.ts فراخوانی می‌شود */
export function startAlertScheduler(): void {
  if (g.__alertScheduler?.running) return
  const s: SchedulerInternals = g.__alertScheduler ?? {
    running: false, intervalMinutes: 60, startedAt: null, lastRunAt: null,
    lastRunProjects: 0, lastRunEvaluated: 0, lastRunCreated: 0, lastEmailSent: false,
    lastError: null, timer: null, ticking: false, tickCount: 0,
  }
  g.__alertScheduler = s
  if (s.timer) clearInterval(s.timer)
  s.running = true
  s.startedAt = new Date().toISOString()

  // نخستین چرخه با تأخیر کوتاه تا سرور کامل بالا بیاید، سپس طبق تنظیمات
  setTimeout(() => { void tick() }, 20_000)
  getSettings()
    .then(st => {
      s.intervalMinutes = Math.max(1, st.alertEvalIntervalMinutes)
      s.timer = setInterval(tick, s.intervalMinutes * 60_000)
      console.log(`[زمان‌بند] ارزیابی خودکار هشدارها فعال شد — هر ${s.intervalMinutes} دقیقه (بخش ۲۶.۲)`)
    })
    .catch(() => {
      s.timer = setInterval(tick, 60 * 60_000)
      console.log('[زمان‌بند] با دوره پیش‌فرض ۶۰ دقیقه فعال شد')
    })
}
