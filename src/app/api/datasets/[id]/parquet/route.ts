// وضعیت و ساخت فایل آماده‌شده Parquet — بخش ۲۷.۲ سند
// GET: وضعیت موتور و فایل | POST: ساخت/نوسازی فایل Parquet نسخه جاری (نیازمند dataset.edit)

import { NextRequest } from 'next/server'
import { ok, fail, logAudit } from '@/lib/server'
import { requireUser, requirePerm, errorResponse } from '@/lib/auth'
import { getParquetStatus, exportDatasetToParquet } from '@/lib/duck'
import { getSettings } from '@/lib/settings'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(req)
    const { id } = await ctx.params
    const status = await getParquetStatus(id)
    const s = await getSettings()
    return ok({
      engineAvailable: status.engineAvailable,
      engineSetting: s.engineAnalytics,
      parquet: status.exists ? {
        version: status.meta?.version ?? null,
        rows: status.meta?.rows ?? null,
        columns: status.meta?.columns ?? null,
        bytes: status.meta?.bytes ?? 0,
        exportedAt: status.meta?.exportedAt ?? null,
        stale: status.stale,
      } : null,
      datasetVersion: status.datasetVersion,
      rowCount: status.rowCount,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePerm(req, 'dataset.edit')
    const { id } = await ctx.params
    try {
      const result = await exportDatasetToParquet(id)
      await logAudit(null, 'ساخت فایل Parquet (۲۷.۲)', `مجموعه‌داده ${id} — نسخه ${result.version} با ${result.rows} رکورد در ${result.tookMs} میلی‌ثانیه`, me.name)
      return ok(result)
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'ساخت فایل Parquet ناموفق بود.')
    }
  } catch (e) {
    return errorResponse(e)
  }
}
