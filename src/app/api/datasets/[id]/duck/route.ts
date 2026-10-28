// کنسول SQL تحلیل متوسط روی موتور DuckDB — بخش ۲۷.۲ سند
// فقط پرس‌وجوی خواندنی روی فایل Parquet (نمای «ds») — محدود به نقش‌های داده‌محور
// ⚠️ داده پارتیشن‌بندی سطری و ماسک ستونی در موتور DuckDB اعمال نمی‌شود؛
//    بنابراین این مسیر فقط برای مدیر سامانه و مدیر داده (دارای دسترسی بدون ماسک) باز است — بخش ۲۹

import { NextRequest } from 'next/server'
import { ok, logAudit, fail } from '@/lib/server'
import { requireUser, errorResponse, seesSensitive } from '@/lib/auth'
import { queryDatasetParquet } from '@/lib/duck'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser(req)
    if (!seesSensitive(me.role)) {
      return fail('کنسول SQL موتور تحلیلی فقط برای مدیر سامانه و مدیر داده فعال است (داده بدون ماسک و بدون قواعد سطری ارزیابی می‌شود — بخش ۲۹).', 403)
    }
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({})) as { sql?: string }
    const sql = String(body.sql ?? '').trim()
    if (!sql) return fail('پرس‌وجو خالی است.')
    try {
      const result = await queryDatasetParquet(id, sql)
      await logAudit(null, 'پرس‌وجوی DuckDB (۲۷.۲)', `مجموعه‌داده ${id} — ${result.rowCount} ردیف در ${result.tookMs} میلی‌ثانیه | ${sql.slice(0, 120)}`, me.name)
      return ok(result)
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'اجرای پرس‌وجو ناموفق بود.')
    }
  } catch (e) {
    return errorResponse(e)
  }
}
