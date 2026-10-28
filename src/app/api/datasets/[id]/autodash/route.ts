// داشبورد هوشمند — تحلیل خودکار مجموعه‌داده (بخش ۲۵: پیشنهاد خودکار + بخش ۲۱ قواعد صحت)
// GET: محاسبه کامل داشبورد بر اساس ساختار شناسایی‌شده + چیدمان ذخیره‌شده کاربر
// PUT: ذخیره چیدمان ویرایش‌شده در config مجموعه‌داده

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { FieldMeta, DataRow } from '@/lib/types'
import { requireUser, requirePerm, errorResponse, applyRowRules, maskRecords, maskFieldsMeta, RowRule } from '@/lib/auth'
import { buildAutoDashboard, applyLayout, sanitizeLayout, AutoDashLayout } from '@/lib/autodash'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    // قواعد دسترسی سطح سطر و ماسک حساس — همان قواعد نمای داده (بخش ۲۹ سند)
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const visibleFields = maskFieldsMeta(fields, user.role)
    const visibleIds = new Set(visibleFields.map(f => f.id))
    const masked = maskRecords(records, fields, user.role)

    const dash = buildAutoDashboard(ds.name, masked, visibleFields)
    const config = parseJson<Record<string, unknown>>(ds.config, {})
    const layout = parseJson<AutoDashLayout | null>((config.autoDashLayout as string) ?? null, null)

    return ok({
      dashboard: applyLayout(dash, layout),
      raw: dash, // نسخه بدون چیدمان برای بازگردانی پیش‌فرض در ویرایشگر
      layout,
      dataVersion: ds.version,
      columnCount: visibleFields.length,
      effectiveFields: visibleFields.filter(f => visibleIds.has(f.id)).length,
      maskedForRole: user.role !== 'admin' && fields.some(f => f.sensitivity === 'confidential'),
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm(req, 'dataset.edit')
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    // reset=true یعنی بازگشت به چیدمان پیش‌فرض
    const config = parseJson<Record<string, unknown>>(ds.config, {})
    if (body?.reset === true) {
      delete config.autoDashLayout
      await db.dataset.update({ where: { id }, data: { config: JSON.stringify(config) } })
      return ok({ saved: true, reset: true })
    }

    const layout = sanitizeLayout(body?.layout)
    config.autoDashLayout = JSON.stringify(layout) as unknown
    await db.dataset.update({ where: { id }, data: { config: JSON.stringify(config) } })
    return ok({ saved: true, layout })
  } catch (e) {
    return errorResponse(e)
  }
}
