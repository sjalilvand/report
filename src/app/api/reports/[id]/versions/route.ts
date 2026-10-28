// فهرست نسخه‌های گزارش — بخش ۲۶.۱ سند («مقایسه نسخه‌ها»)
// خروجی سبک: بدون محتوای کامل پیکربندی (برای نمایش تاریخچه)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(req)
    const { id } = await ctx.params
    const report = await db.report.findUnique({ where: { id } })
    if (!report) return fail('گزارش یافت نشد.', 404)

    const versions = await db.reportVersion.findMany({
      where: { reportId: id },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, title: true, description: true, status: true, reason: true, createdBy: true, createdAt: true },
    })

    // نسخه جاری گزارش (که هنوز عکس‌فوری ندارد یا آخرین وضعیت است) نیز نمایش داده می‌شود
    const hasCurrent = versions.some(v => v.version === report.version)
    const list = hasCurrent ? versions : [
      ...versions,
      {
        id: 'current',
        version: report.version,
        title: report.title,
        description: report.description,
        status: report.status,
        reason: 'نسخه جاری گزارش',
        createdBy: report.createdBy,
        createdAt: report.updatedAt,
      },
    ].sort((a, b) => b.version - a.version)

    return ok({ currentVersion: report.version, versions: list })
  } catch (e) {
    return errorResponse(e)
  }
}
