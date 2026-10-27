// صف پردازش پس‌زمینه برای خروجی حجیم — بخش ۲۸ (Job/Export) و ۳۰.۲ سند (پایداری)
// الزامات پیاده‌شده:
//   - پردازش غیرهم‌زمان با تعداد پردازشگر قابل پیکربندی (بخش ۳۰.۱)
//   - بازیابی پردازش شکست‌خورده و یتیم پس از ری‌استارت سرور (۳۰.۲)
//   - اجرای مجدد امن: تولید خروجی بی‌اثر بر داده است؛ تلاش مجدد فایل جدید می‌سازد نه داده تکراری
//   - نگهداری آخرین نسخه سالم: فایل با نام موقت نوشته و فقط پس از موفقیت جابه‌جا می‌شود
//   - ثبت مدت (durationMs) و علت شکست (error) — بخش ۳۰.۲
//   - ابطال لینک دانلود با انقضای خودکار فایل (بخش ۲۹)

import { db } from './db'
import { parseJson, logAudit } from './server'
import { getSettings } from './settings'
import { pushSystemNotification } from './alerts'
import { buildExportBuffer, EXPORT_FORMATS, ExportFormat, filtersTextOf } from './exporters'
import { runQuery } from './query'
import { applyRowRules, RowRule } from './auth'
import { FieldMeta, DataRow, QuerySpec } from './types'
import { mkdir, writeFile, rename, unlink } from 'fs/promises'
import path from 'path'

export interface QueueState {
  running: number
  queued: number
  pumping: boolean
  lastFinishedAt: string | null
  lastError: string | null
  startedAt: string | null
}

interface QueueInternals extends QueueState {
  active: Set<string>
}

const g = globalThis as unknown as { __jobQueue?: QueueInternals }

function internals(): QueueInternals {
  if (!g.__jobQueue) {
    g.__jobQueue = {
      running: 0,
      queued: 0,
      pumping: false,
      lastFinishedAt: null,
      lastError: null,
      startedAt: new Date().toISOString(),
      active: new Set(),
    }
  }
  return g.__jobQueue
}

/** پوشه ذخیره فایل‌های خروجی — کنار دیتابیس، خارج از گیت */
export function exportsDir(): string {
  return path.join(process.cwd(), 'exports')
}

/** وضعیت صف برای سلامت سرویس (۳۰.۲: مانیتورینگ سلامت) */
export function getQueueState(): QueueState {
  const s = internals()
  const active = s.active.size
  return { running: active, queued: s.queued, pumping: s.pumping, lastFinishedAt: s.lastFinishedAt, lastError: s.lastError, startedAt: s.startedAt }
}

async function refreshQueuedCount(): Promise<number> {
  const n = await db.job.count({ where: { status: 'queued' } })
  const s = internals()
  s.queued = n
  return n
}

export interface EnqueueExportInput {
  projectId: string
  datasetId: string
  type: string
  spec: QuerySpec
  title?: string
  chartType?: string
  rowRules: RowRule[]
  createdBy?: string
  maxAttempts?: number
}

/** افزودن کار خروجی به صف — اجرای مجدد امن: هر کار شناسه مستقل دارد و فایل اختصاصی تولید می‌کند */
export async function enqueueExportJob(input: EnqueueExportInput): Promise<{ id: string }> {
  const format = input.type.replace(/^export\./, '') as ExportFormat
  const job = await db.job.create({
    data: {
      projectId: input.projectId,
      type: `export.${format}`,
      status: 'queued',
      payload: JSON.stringify({
        datasetId: input.datasetId,
        spec: input.spec,
        title: input.title ?? '',
        chartType: input.chartType ?? '',
        rowRules: input.rowRules,
      }),
      createdBy: input.createdBy,
      maxAttempts: Math.max(1, input.maxAttempts ?? 2),
    },
  })
  await refreshQueuedCount()
  void pump()
  return { id: job.id }
}

/** شروع صف — از instrumentation فراخوانی می‌شود؛ بازیابی کارهای یتیم پس از ری‌استارت (۳۰.۲) */
export function startJobQueue(): void {
  const s = internals()
  if (s.startedAt && s.startedAt === new Date(0).toISOString()) return
  void (async () => {
    try {
      // بازیابی پردازش‌های نیمه‌کاره از اجرای قبلی سرور — بدون داده تکراری: فایل‌ها مستقل‌اند
      const orphan = await db.job.updateMany({
        where: { status: 'running' },
        data: { status: 'queued', error: 'پردازش پس از ری‌استارت سرور بازیابی و در صف قرار گرفت (بخش ۳۰.۲)' },
      })
      if (orphan.count > 0) console.log(`[صف] ${orphan.count} پردازش یتیم بازیابی شد`)
      await refreshQueuedCount()
      void pump()
      if (orphan.count > 0 || s.queued > 0) console.log(`[صف] پردازش خروجی پس‌زمینه فعال شد — ${s.queued} کار در صف`)
    } catch (e) {
      console.error('[صف] خطا در بازیابی صف:', e instanceof Error ? e.message : e)
    }
  })()
  console.log('[صف] موتور پردازش پس‌زمینه خروجی آماده است (بخش ۳۰.۲)')
}

/** پمپ صف — تا سقف هم‌زمانی، قدیمی‌ترین کارهای صف را اجرا می‌کند */
export async function pump(): Promise<void> {
  const s = internals()
  if (s.pumping) return
  s.pumping = true
  try {
    for (;;) {
      const settings = await getSettings()
      const concurrency = Math.max(1, Math.min(4, settings.exportQueueConcurrency))
      if (s.active.size >= concurrency) break
      const next = await db.job.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
      })
      if (!next) break
      s.active.add(next.id)
      await refreshQueuedCount()
      // اجرای موازی بدون انتظار — سقف هم‌زمانی در حلقه کنترل می‌شود
      void runJob(next.id)
        .catch(e => console.error('[صف] خطای اجرای کار:', e instanceof Error ? e.message : e))
        .finally(() => {
          s.active.delete(next.id)
          void refreshQueuedCount().then(() => void pump())
        })
    }
  } finally {
    s.pumping = false
  }
}

interface JobPayload {
  datasetId: string
  spec: QuerySpec
  title: string
  chartType: string
  rowRules: RowRule[]
}

/** اجرای یک کار خروجی — ساخت فایل با نام موقت و جابه‌جایی فقط پس از موفقیت (نگهداری آخرین نسخه سالم) */
async function runJob(jobId: string): Promise<void> {
  const started = Date.now()
  let job = await db.job.findUnique({ where: { id: jobId } })
  if (!job || job.status !== 'queued') return
  await db.job.update({
    where: { id: jobId },
    data: { status: 'running', progress: 5, startedAt: new Date(), attempts: { increment: 1 } },
  })

  try {
    const payload = parseJson<JobPayload>(job.payload, { datasetId: '', spec: { dimensions: [], measures: [] }, title: '', chartType: '', rowRules: [] })
    const format = job.type.replace(/^export\./, '') as ExportFormat
    if (!EXPORT_FORMATS.includes(format)) {
      throw new Error(`قالب خروجی «${format}» پشتیبانی نمی‌شود (قالب‌های مجاز: ${EXPORT_FORMATS.join('، ')})`)
    }
    const ds = await db.dataset.findUnique({ where: { id: payload.datasetId } })
    if (!ds) throw new Error('مجموعه‌داده مرتبط با این پردازش یافت نشد — ممکن است حذف شده باشد.')

    await db.job.update({ where: { id: jobId }, data: { progress: 15 } })

    // قواعد سطح سطرِ درخواست‌کننده در لحظه ثبت کار قفل می‌شوند — بخش ۲۹
    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), payload.rowRules ?? [], ds.id)
    const spec: QuerySpec = {
      dimensions: payload.spec.dimensions ?? [],
      measures: payload.spec.measures && payload.spec.measures.length > 0 ? payload.spec.measures : [{ agg: 'count' }],
      filters: payload.spec.filters ?? [],
      orderBy: payload.spec.orderBy,
      limit: payload.spec.limit,
    }
    const result = runQuery(records, fields, spec)

    await db.job.update({ where: { id: jobId }, data: { progress: 45 } })

    // ماسک مقادیر حساس در ابعاد خروجی — بخش ۲۹ سند (سازگار با خروجی مستقیم)
    const sensitiveIds = fields.filter(f => f.sensitivity === 'confidential').map(f => f.id)
    const fieldById = new Map(fields.map(f => [f.id, f]))
    const dimCols = spec.dimensions.map(d => fieldById.get(d)?.label ?? d)
    const measureCols = spec.measures.map(m => m.alias ?? '')
    const headers = [...dimCols, ...measureCols]
    const rows = result.rows.map(r => {
      const row: unknown[] = []
      for (const d of spec.dimensions) {
        let v = r[d]
        if (sensitiveIds.includes(d) && v !== null && v !== undefined && String(v) !== '') {
          v = String(v).slice(0, 2) + '•'.repeat(Math.max(3, Math.min(10, String(v).length - 2)))
        }
        row.push(v)
      }
      for (const m of spec.measures) row.push(r[m.alias ?? ''])
      return row
    })
    const totalRow = [...Array(spec.dimensions.length).fill('جمع کل'), ...spec.measures.map(m => result.totals[m.alias ?? ''] ?? null)]
    const filtersText = filtersTextOf(spec.filters as { fieldId?: string; op?: string; value?: unknown; values?: unknown }[] | undefined, fieldById)

    const settings = await getSettings()
    const built = await buildExportBuffer({
      format,
      title: payload.title || `گزارش ${ds.name}`,
      datasetName: ds.name,
      dataVersion: ds.version,
      filtersJson: spec.filters ?? [],
      filtersText,
      headers,
      rows,
      totalRow,
      dimCount: spec.dimensions.length,
      chartType: payload.chartType || undefined,
    })

    await db.job.update({ where: { id: jobId }, data: { progress: 80 } })

    // نگهداری آخرین نسخه سالم — نوشتن موقت و جابه‌جایی اتمی پس از موفقیت (۳۰.۲)
    await mkdir(exportsDir(), { recursive: true })
    const finalPath = path.join(exportsDir(), `${jobId}.${built.ext}`)
    const tmpPath = finalPath + '.tmp'
    await writeFile(tmpPath, built.buf)
    await rename(tmpPath, finalPath)

    const expiresAt = new Date(Date.now() + settings.exportFileTtlHours * 3600_000)
    const finished = new Date()
    await db.job.update({
      where: { id: jobId },
      data: {
        status: 'done',
        progress: 100,
        result: JSON.stringify({ fileName: built.fileName, size: built.buf.length, mime: built.mime, ext: built.ext, expiresAt: expiresAt.toISOString() }),
        error: null,
        finishedAt: finished,
        durationMs: Date.now() - started,
      },
    })
    const s = internals()
    s.lastFinishedAt = finished.toISOString()
    s.lastError = null
    console.log(`[صف] خروجی ${format} آماده شد — ${built.fileName} (${(built.buf.length / 1024).toFixed(1)} کیلوبایت، ${Date.now() - started} میلی‌ثانیه)`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطای ناشناخته در پردازش خروجی'
    const fresh = await db.job.findUnique({ where: { id: jobId } })
    const attempts = fresh?.attempts ?? 1
    const maxAttempts = fresh?.maxAttempts ?? 2
    const finished = new Date()
    if (attempts < maxAttempts) {
      // بازیابی خودکار: تلاش مجدد امن در صف (۳۰.۲) — تولید خروجی اثر جانبی روی داده ندارد
      await db.job.update({
        where: { id: jobId },
        data: { status: 'queued', progress: 0, error: message, finishedAt: finished, durationMs: Date.now() - started },
      }).catch(() => undefined)
      console.warn(`[صف] کار ${jobId} شکست خورد؛ تلاش مجدد خودکار (${attempts}/${maxAttempts}): ${message}`)
      return
    }
    await db.job.update({
      where: { id: jobId },
      data: { status: 'failed', progress: 0, error: message, finishedAt: finished, durationMs: Date.now() - started },
    }).catch(() => undefined)
    const s = internals()
    s.lastFinishedAt = finished.toISOString()
    s.lastError = message
    // اعلان شکست پردازش — بخش ۲۶.۲ (محرک processFailure)
    if (fresh) {
      await pushSystemNotification({
        projectId: fresh.projectId,
        type: 'processFailure',
        severity: 'critical',
        title: 'شکست پردازش خروجی پس‌زمینه',
        message: `پردازش «${fresh.type}» پس از ${attempts.toLocaleString('fa-IR')} تلاش ناموفق بود: ${message}`,
        entityType: 'job',
        entityId: fresh.id,
      }).catch(() => undefined)
      await logAudit(fresh.projectId, 'شکست پردازش خروجی', `${fresh.type} — ${message}`, fresh.createdBy ?? 'صف پردازش').catch(() => undefined)
    }
  }
}

/** تلاش مجدد دستی — فقط برای کارهای شکست‌خورده یا لغوشده (اجرای مجدد امن) */
export async function retryJob(jobId: string): Promise<{ ok: boolean; message: string }> {
  const job = await db.job.findUnique({ where: { id: jobId } })
  if (!job) return { ok: false, message: 'پردازش یافت نشد.' }
  if (!['failed', 'canceled'].includes(job.status)) {
    return { ok: false, message: 'فقط پردازش شکست‌خورده یا لغوشده قابل تلاش مجدد است.' }
  }
  await db.job.update({
    where: { id: jobId },
    data: { status: 'queued', progress: 0, error: null, startedAt: null, finishedAt: null, durationMs: null, result: null },
  })
  await refreshQueuedCount()
  void pump()
  return { ok: true, message: 'پردازش دوباره به صف اضافه شد (اجرای مجدد امن — بخش ۳۰.۲).' }
}

/** حذف فایل خروجی از دیسک — در لغو، حذف و انقضا */
export async function removeJobFile(jobId: string, ext?: string): Promise<void> {
  if (!ext) return
  await unlink(path.join(exportsDir(), `${jobId}.${ext}`)).catch(() => undefined)
}

/** پاک‌سازی فایل‌های منقضی — ابطال خودکار لینک دانلود (بخش ۲۹) */
export async function cleanupExpiredExports(): Promise<number> {
  const jobs = await db.job.findMany({ where: { status: 'done', result: { not: null } } })
  let removed = 0
  const now = Date.now()
  for (const job of jobs) {
    const result = parseJson<{ ext?: string; expiresAt?: string }>(job.result, {})
    if (result.expiresAt && new Date(result.expiresAt).getTime() < now) {
      await removeJobFile(job.id, result.ext)
      await db.job.update({ where: { id: job.id }, data: { result: null, error: 'فایل خروجی منقضی و حذف شد (سیاست نگهداری — بخش ۲۹)' } })
      removed++
    }
  }
  return removed
}
