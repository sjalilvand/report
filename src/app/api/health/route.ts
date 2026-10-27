// سلامت سرویس — بخش ۳۰.۲ سند (مانیتورینگ سلامت)
// عمومی و سبک؛ برای پایش زیرساخت (uptime، پایگاه‌داده، صف پردازش، زمان‌بند)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok } from '@/lib/server'
import { getSchedulerState } from '@/lib/scheduler'
import { getQueueState } from '@/lib/jobs'

const startedAt = Date.now()

export async function GET(_req: NextRequest) {
  let dbStatus = 'ok'
  let dbError: string | undefined
  try {
    await db.$queryRaw`SELECT 1`
  } catch (e) {
    dbStatus = 'error'
    dbError = e instanceof Error ? e.message.slice(0, 200) : 'خطای پایگاه‌داده'
  }
  const scheduler = getSchedulerState()
  const queue = getQueueState()
  const healthy = dbStatus === 'ok'
  return ok(
    {
      status: healthy ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      checks: {
        database: { status: dbStatus, error: dbError ?? null },
        scheduler: {
          running: scheduler.running,
          intervalMinutes: scheduler.intervalMinutes,
          lastRunAt: scheduler.lastRunAt,
          lastError: scheduler.lastError,
        },
        queue: {
          running: queue.running,
          queued: queue.queued,
          lastFinishedAt: queue.lastFinishedAt,
          lastError: queue.lastError,
        },
      },
      version: '۱.۱ — فاز هفتم',
    },
    healthy ? 200 : 503
  )
}
