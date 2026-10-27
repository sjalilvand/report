// ویرایش و حذف مناسبت — بخش ۱۵.۴ سند
// کنترل هم‌پوشانی (۱۵.۵) در به‌روزرسانی نیز انجام می‌شود

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { validate, findOverlaps } from '../route'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const me = await requirePerm(req, 'dataset.edit')
    const body = (await req.json()) as Record<string, unknown>
    const existing = await db.occasion.findUnique({ where: { id } })
    if (!existing) return fail('مناسبت یافت نشد.', 404)

    const merged = {
      projectId: existing.projectId,
      name: body.name !== undefined ? body.name : existing.name,
      calendarType: body.calendarType !== undefined ? body.calendarType : existing.calendarType,
      year: body.year !== undefined ? body.year : existing.year,
      startDate: body.startDate !== undefined ? body.startDate : existing.startDate,
      endDate: body.endDate !== undefined ? body.endDate : existing.endDate,
      category: body.category !== undefined ? body.category : existing.category,
      scope: body.scope !== undefined ? body.scope : existing.scope,
      isHoliday: body.isHoliday !== undefined ? body.isHoliday : existing.isHoliday,
      source: body.source !== undefined ? body.source : existing.source,
      sourceVersion: body.sourceVersion !== undefined ? body.sourceVersion : existing.sourceVersion,
      color: body.color !== undefined ? body.color : existing.color,
      label: body.label !== undefined ? body.label : existing.label,
    }
    const { data, error } = validate(merged as Parameters<typeof validate>[0])
    if (error || !data) return fail(error ?? 'ورودی نامعتبر است.')

    const occasion = await db.occasion.update({ where: { id }, data: data as { name: string; startDate: string; [k: string]: unknown } })
    const overlapWith = await findOverlaps(existing.projectId, occasion.calendarType, occasion.startDate, occasion.endDate, id)
    await logAudit(existing.projectId, 'ویرایش مناسبت', occasion.name, me.name)
    return ok({ occasion, overlapWith })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const me = await requirePerm(req, 'dataset.edit')
    const existing = await db.occasion.findUnique({ where: { id } })
    if (!existing) return fail('مناسبت یافت نشد.', 404)
    await db.occasion.delete({ where: { id } })
    await logAudit(existing.projectId, 'حذف مناسبت', existing.name, me.name)
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
