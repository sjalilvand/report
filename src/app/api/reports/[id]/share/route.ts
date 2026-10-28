// لینک اشتراک عمومی گزارش منتشرشده — «امکان انتشار»
// POST: صدور یا لغو توکن لینک عمومی (/share/<token>) فقط برای گزارش منتشرشده و با مجوز report.publish
// لغو انتشار گزارش (unpublish) لینک عمومی را نیز غیرفعال می‌کند (صفحه اشتراک وضعیت published را می‌سنجد)

import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'report.publish')
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const enabled = body?.enabled !== false

    const report = await db.report.findUnique({ where: { id } })
    if (!report) return fail('گزارش یافت نشد.', 404)

    if (enabled) {
      if (report.status !== 'published') {
        return fail('فقط گزارش منتشرشده قابل اشتراک عمومی است. گردش کار: پیش‌نویس → در انتظار تأیید → تأییدشده → منتشرشده (بخش ۲۶.۱ سند).')
      }
      const token = randomBytes(16).toString('hex')
      await db.report.update({ where: { id }, data: { shareToken: token, sharedAt: new Date() } })
      await logAudit(report.projectId, 'صدور لینک عمومی گزارش',
        `گزارش «${report.title}» برای اشتراک عمومی فعال شد | توسط ${user.name}`, user.name)
      return ok({ enabled: true, sharePath: `/share/${token}`, sharedAt: new Date().toISOString() })
    }

    await db.report.update({ where: { id }, data: { shareToken: null, sharedAt: null } })
    await logAudit(report.projectId, 'لغو لینک عمومی گزارش',
      `لینک عمومی گزارش «${report.title}» غیرفعال شد | توسط ${user.name}`, user.name)
    return ok({ enabled: false })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm(req, 'report.create')
    const { id } = await ctx.params
    const report = await db.report.findUnique({ where: { id }, select: { shareToken: true, sharedAt: true, status: true } })
    if (!report) return fail('گزارش یافت نشد.', 404)
    return ok({
      enabled: Boolean(report.shareToken) && report.status === 'published',
      sharePath: report.shareToken && report.status === 'published' ? `/share/${report.shareToken}` : null,
      sharedAt: report.sharedAt,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
