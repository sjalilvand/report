// مدیریت گزارش — به‌روزرسانی، انتشار و حذف (بخش‌های ۲۴.۳ و ۲۶.۱ سند)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const report = await db.report.findUnique({ where: { id } })
  if (!report) return fail('گزارش یافت نشد.', 404)
  return ok(report)
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const existing = await db.report.findUnique({ where: { id } })
    if (!existing) return fail('گزارش یافت نشد.', 404)

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = String(body.title)
    if (body.description !== undefined) data.description = String(body.description)
    if (body.config !== undefined) data.config = JSON.stringify(body.config)
    if (body.datasetId !== undefined) data.datasetId = body.datasetId || null
    if (body.status !== undefined) {
      const status = String(body.status)
      if (!['draft', 'confirmed', 'published'].includes(status)) return fail('وضعیت نامعتبر است (بخش ۲۶.۱: پیش‌نویس، در حال بررسی، تأییدشده، منتشرشده).')
      data.status = status
      // انتشار فقط پس از تأیید — بخش ۶ (مرحله هشتم)
      if (status === 'published' && existing.status === 'draft') {
        return fail('انتشار تنها پس از تأیید گزارش ممکن است (گردش کار بخش ۲۶.۱ سند).')
      }
      if (status === 'published') data.publishedAt = new Date()
    }
    data.version = existing.version + 1

    const report = await db.report.update({ where: { id }, data })
    await logAudit(existing.projectId, body.status === 'published' ? 'انتشار گزارش' : 'به‌روزرسانی گزارش', `گزارش «${report.title}» — نسخه ${report.version}`)
    return ok(report)
  } catch {
    return fail('خطا در به‌روزرسانی گزارش')
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const report = await db.report.findUnique({ where: { id } })
  if (!report) return fail('گزارش یافت نشد.', 404)
  await db.report.delete({ where: { id } })
  await logAudit(report.projectId, 'حذف گزارش', `گزارش «${report.title}» حذف شد`)
  return ok({ deleted: true })
}
