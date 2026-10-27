// ویرایش و حذف اتصال خارجی — بخش ۳۱ سند
// مقدار ماسک‌شده (***) در پیکربندی یعنی «تغییر نکرده» و مقدار فعلی حفظ می‌شود (بخش ۲۹)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { CONNECTION_TYPE_LABELS, SECRET_CONFIG_KEYS, CONFIG_MASK, ConnectionType } from '@/lib/connectors'
import { maskConfig } from '../route'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm(req, 'data.view')
    const { id } = await ctx.params
    const row = await db.externalConnection.findUnique({ where: { id } })
    if (!row) return fail('اتصال یافت نشد.', 404)
    return ok({
      ...row,
      config: undefined,
      configRaw: maskConfig(row.config),
      typeLabel: CONNECTION_TYPE_LABELS[row.type as ConnectionType] ?? row.type,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'dataset.create')
    const { id } = await ctx.params
    const row = await db.externalConnection.findUnique({ where: { id } })
    if (!row) return fail('اتصال یافت نشد.', 404)
    const body = await req.json()

    const data: Record<string, unknown> = {}
    const changes: string[] = []

    if (body.name !== undefined) {
      data.name = String(body.name).trim()
      changes.push('نام')
    }
    if (body.query !== undefined) {
      data.query = body.query ? String(body.query) : null
      changes.push('پرس‌وجو')
    }
    if (body.syncIntervalMinutes !== undefined) {
      data.syncIntervalMinutes = Math.max(0, Math.min(10080, Number(body.syncIntervalMinutes) || 0))
      changes.push('فاصله همگام‌سازی')
    }
    if (body.config && typeof body.config === 'object') {
      const incoming = body.config as Record<string, unknown>
      const current = JSON.parse(row.config) as Record<string, unknown>
      // حفظ مقادیر محرمانه فعلی در صورت ارسال ماسک (بخش ۲۹)
      for (const k of SECRET_CONFIG_KEYS) {
        if (incoming[k] === CONFIG_MASK || incoming[k] === undefined) incoming[k] = current[k]
      }
      data.config = JSON.stringify(incoming)
      changes.push('پیکربندی اتصال')
      // تغییر پیکربندی، وضعیت آزمون قبلی را بی‌اعتبار می‌کند
      data.status = 'untested'
    }

    await db.externalConnection.update({ where: { id }, data })
    await logAudit(row.projectId, 'ویرایش اتصال خارجی', `«${row.name}»: ${changes.join('، ')} (بخش ۳۱ سند)`, user.name)
    return ok({ id, message: 'اتصال به‌روزرسانی شد.' })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'dataset.create')
    const { id } = await ctx.params
    const row = await db.externalConnection.findUnique({ where: { id } })
    if (!row) return fail('اتصال یافت نشد.', 404)
    await db.externalConnection.delete({ where: { id } })
    // مجموعه‌داده ساخته‌شده از این اتصال حذف نمی‌شود — داده واردشده مستقل باقی می‌ماند
    await logAudit(row.projectId, 'حذف اتصال خارجی', `«${row.name}» حذف شد؛ مجموعه‌داده واردشده حفظ شد`, user.name)
    return ok({ message: 'اتصال حذف شد.' })
  } catch (e) {
    return errorResponse(e)
  }
}
