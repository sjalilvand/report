// علامت‌گذاری یک اعلان به‌عنوان خوانده‌شده — بخش ۲۶.۲ سند

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'

export async function PATCH(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(_req)
    const { id } = await ctx.params
    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) return fail('اعلان یافت نشد.', 404)
    const n = await db.notification.update({ where: { id }, data: { read: true, readAt: new Date() } })
    return ok({ updated: true, notification: n })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(_req)
    const { id } = await ctx.params
    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) return fail('اعلان یافت نشد.', 404)
    await db.notification.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
