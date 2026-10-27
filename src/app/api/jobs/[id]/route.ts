// جزئیات پردازش، تلاش مجدد، لغو/حذف — بخش ۳۰.۲ سند (پایداری)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, requireUser, errorResponse } from '@/lib/auth'
import { retryJob, removeJobFile, getQueueState } from '@/lib/jobs'
import { parseJson } from '@/lib/server'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(req)
    const { id } = await ctx.params
    const job = await db.job.findUnique({ where: { id }, include: { project: { select: { name: true } } } })
    if (!job) return fail('پردازش یافت نشد.', 404)
    return ok({
      ...job,
      payload: undefined,
      result: parseJson<{ fileName?: string; size?: number; ext?: string; expiresAt?: string } | null>(job.result, null),
      projectName: job.project.name,
      queue: getQueueState(),
    })
  } catch (e) {
    return errorResponse(e)
  }
}

/** تلاش مجدد دستی — اجرای مجدد امن (بخش ۳۰.۲) */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'export.run')
    const { id } = await ctx.params
    const res = await retryJob(id)
    if (!res.ok) return fail(res.message, 400)
    await logAudit(null, 'تلاش مجدد پردازش', `پردازش ${id} دوباره به صف اضافه شد`, user.name)
    return ok({ message: res.message })
  } catch (e) {
    return errorResponse(e)
  }
}

/** لغو کار در صف یا حذف کار پایان‌یافته و فایل آن — ابطال دسترسی به خروجی (بخش ۲۹) */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'export.run')
    const { id } = await ctx.params
    const job = await db.job.findUnique({ where: { id } })
    if (!job) return fail('پردازش یافت نشد.', 404)

    if (job.status === 'running') {
      return fail('پردازش در حال اجراست و قابل لغو نیست؛ پس از پایان می‌توانید حذفش کنید.', 409)
    }
    if (job.status === 'queued') {
      await db.job.update({ where: { id }, data: { status: 'canceled', error: 'پیش از اجرا لغو شد' } })
      await logAudit(job.projectId, 'لغو پردازش صف', `${job.type} لغو شد`, user.name)
      return ok({ message: 'پردازش لغو شد.' })
    }
    // کارهای پایان‌یافته: حذف فایل و رکورد — سیاست نگهداری و ابطال لینک (بخش ۲۹)
    const result = parseJson<{ ext?: string } | null>(job.result, null)
    await removeJobFile(job.id, result?.ext)
    await db.job.delete({ where: { id } })
    await logAudit(job.projectId, 'حذف پردازش و فایل خروجی', `${job.type} و فایل آن حذف شد (بخش ۲۹ سند)`, user.name)
    return ok({ message: 'پردازش و فایل خروجی حذف شد.' })
  } catch (e) {
    return errorResponse(e)
  }
}
