// گردش کار تأیید گزارش — بخش ۲۶.۱ و ۳۶ سند (پیش‌نویس → در انتظار تأیید → تأییدشده → منتشرشده)
// هر گذار وضعیت با رویداد تأیید و ثبت حسابرسی همراه است؛ رد گزارش نیازمند دلیل است

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse, ROLE_LABELS } from '@/lib/auth'

type Action = 'submit' | 'approve' | 'reject' | 'publish' | 'unpublish'

const TARGET_STATUS: Record<Action, string> = {
  submit: 'pending',
  approve: 'approved',
  reject: 'rejected',
  publish: 'published',
  unpublish: 'approved',
}

const ACTION_LABELS: Record<Action, string> = {
  submit: 'ارسال برای تأیید',
  approve: 'تأیید گزارش',
  reject: 'رد گزارش',
  publish: 'انتشار گزارش',
  unpublish: 'لغو انتشار',
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = await req.json()
    const action = String(body.action ?? '') as Action
    const comment = body.comment ? String(body.comment).trim() : undefined
    if (!['submit', 'approve', 'reject', 'publish', 'unpublish'].includes(action)) {
      return fail('عملیات نامعتبر است (submit | approve | reject | publish | unpublish).')
    }

    const report = await db.report.findUnique({ where: { id } })
    if (!report) return fail('گزارش یافت نشد.', 404)

    // مجوز بر اساس عملیات — کنترل دسترسی مبتنی بر نقش (بخش ۲۹)
    const perm = action === 'submit' ? 'report.submit' : action === 'publish' || action === 'unpublish' ? 'report.publish' : 'report.approve'
    const user = await requirePerm(req, perm as 'report.submit' | 'report.publish' | 'report.approve')

    // قاعده گردش کار — بخش ۲۶.۱
    const from = report.status
    const validFrom: Record<Action, string[]> = {
      submit: ['draft', 'rejected'],
      approve: ['pending'],
      reject: ['pending'],
      publish: ['approved'],
      unpublish: ['published'],
    }
    if (!validFrom[action].includes(from)) {
      const statusFa: Record<string, string> = {
        draft: 'پیش‌نویس', pending: 'در انتظار تأیید', approved: 'تأییدشده', published: 'منتشرشده', rejected: 'ردشده',
      }
      return fail(`این عملیات از وضعیت «${statusFa[from] ?? from}» ممکن نیست. گردش کار: پیش‌نویس → در انتظار تأیید → تأییدشده → منتشرشده (بخش ۲۶.۱ سند).`)
    }
    if (action === 'reject' && !comment) {
      return fail('برای رد گزارش، ثبت دلیل الزامی است (بخش ۲۶.۱ سند).')
    }

    const to = TARGET_STATUS[action]
    const data: Record<string, unknown> = { status: to }
    if (action === 'publish') data.publishedAt = new Date()
    if (action === 'unpublish') data.publishedAt = null

    const [updated] = await Promise.all([
      db.report.update({ where: { id }, data }),
      db.approvalEvent.create({
        data: {
          reportId: id,
          action,
          fromStatus: from,
          toStatus: to,
          comment: comment ?? null,
          actor: user.name,
          role: user.role,
        },
      }),
    ])

    await logAudit(report.projectId, ACTION_LABELS[action],
      `گزارش «${report.title}»: ${from} → ${to}${comment ? ` | دلیل: ${comment}` : ''} | توسط ${user.name} (${ROLE_LABELS[user.role]})`, user.name)

    const approvals = await db.approvalEvent.findMany({ where: { reportId: id }, orderBy: { createdAt: 'desc' } })
    return ok({ report: updated, approvals })
  } catch (e) {
    return errorResponse(e)
  }
}
