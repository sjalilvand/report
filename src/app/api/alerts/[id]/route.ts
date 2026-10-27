// ویرایش، فعال/غیرفعال‌سازی و حذف قاعده هشدار — بخش ۲۶.۲ سند

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'alert.manage')
    const { id } = await ctx.params
    const body = await req.json()
    const existing = await db.alertRule.findUnique({ where: { id } })
    if (!existing) return fail('قاعده هشدار یافت نشد.', 404)

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name).trim()
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.severity !== undefined && ['info', 'warning', 'critical'].includes(body.severity)) data.severity = body.severity
    if (body.operator !== undefined) data.operator = String(body.operator)
    if (body.aggregation !== undefined) data.aggregation = String(body.aggregation)
    if (body.threshold !== undefined) data.threshold = body.threshold === null || body.threshold === '' ? null : +body.threshold
    if (body.maxDays !== undefined) data.maxDays = body.maxDays === null || body.maxDays === '' ? null : +body.maxDays
    if (body.fieldId !== undefined) data.fieldId = body.fieldId ? String(body.fieldId) : null

    const rule = await db.alertRule.update({ where: { id }, data })
    await logAudit(existing.projectId, 'ویرایش قاعده هشدار', `قاعده «${rule.name}» به‌روزرسانی شد`, user.name)
    return ok({ updated: true, rule: { ...rule, lastState: rule.lastState ? JSON.parse(rule.lastState) : null } })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'alert.manage')
    const { id } = await ctx.params
    const existing = await db.alertRule.findUnique({ where: { id } })
    if (!existing) return fail('قاعده هشدار یافت نشد.', 404)
    await db.alertRule.delete({ where: { id } })
    await logAudit(existing.projectId, 'حذف قاعده هشدار', `قاعده «${existing.name}» حذف شد`, user.name)
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
