// مدیریت گزارش — به‌روزرسانی محتوا و حذف (بخش‌های ۲۴.۳ سند)
// گذار وضعیت‌ها فقط از مسیر گردش کار /api/reports/[id]/status انجام می‌شود (بخش ۲۶.۱)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requireUser, requirePerm, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(req)
    const { id } = await ctx.params
    const report = await db.report.findUnique({ where: { id } })
    if (!report) return fail('گزارش یافت نشد.', 404)
    const approvals = await db.approvalEvent.findMany({ where: { reportId: id }, orderBy: { createdAt: 'desc' } })
    return ok({ ...report, approvals })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'report.create')
    const { id } = await ctx.params
    const body = await req.json()
    const existing = await db.report.findUnique({ where: { id } })
    if (!existing) return fail('گزارش یافت نشد.', 404)

    // فقط گزارش در وضعیت پیش‌نویس/ردشده قابل ویرایش است — بخش ۲۶.۱
    if (!['draft', 'rejected'].includes(existing.status)) {
      return fail('گزارش در گردش کار تأیید است؛ برای ویرایش، ابتدا باید بازگردانده شود یا در وضعیت پیش‌نویس باشد (بخش ۲۶.۱ سند).', 409)
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = String(body.title)
    if (body.description !== undefined) data.description = String(body.description)
    if (body.config !== undefined) data.config = JSON.stringify(body.config)
    if (body.datasetId !== undefined) data.datasetId = body.datasetId || null
    // وضعیت اینجا فقط برای بازگشت به پیش‌نویس (اصلاح پس از رد) مجاز است
    if (body.status !== undefined) {
      const status = String(body.status)
      if (status !== 'draft') {
        return fail('تغییر وضعیت گزارش از مسیر گردش کار تأیید انجام می‌شود: submit | approve | reject | publish (بخش ۲۶.۱ سند).')
      }
      data.status = 'draft'
    }
    data.version = existing.version + 1

    const report = await db.report.update({ where: { id }, data })
    await logAudit(existing.projectId, 'به‌روزرسانی گزارش', `گزارش «${report.title}» — نسخه ${report.version}`, user.name)
    return ok(report)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'report.delete')
    const { id } = await ctx.params
    const report = await db.report.findUnique({ where: { id } })
    if (!report) return fail('گزارش یافت نشد.', 404)
    await db.report.delete({ where: { id } })
    await logAudit(report.projectId, 'حذف گزارش', `گزارش «${report.title}» حذف شد`, user.name)
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
