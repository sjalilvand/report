// ذخیره داشبورد هوشمند به‌عنوان گزارش — «امکان ذخیره کردن و انتشار»
// POST: داشبورد هوشمند (نسخه لحظه‌ای چیدمان) به‌صورت گزارش در پروژه ذخیره می‌شود؛
// اگر پیش‌تر برای همین مجموعه‌داده ذخیره شده باشد، نسخه جدید ثبت می‌شود (نسخه‌بندی بخش ۲۶.۱)
// انتشار فوری مدیریتی: در صورت مجوز report.publish زنجیره تأیید (submit→approve→publish)
// با رویدادهای کامل ثبت و گزارش «منتشرشده» می‌شود تا لینک عمومی قابل صادر شدن باشد.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson, logAudit } from '@/lib/server'
import { requirePerm, errorResponse, can, ROLE_LABELS } from '@/lib/auth'
import { sanitizeLayout, AutoDashLayout } from '@/lib/autodash'

const AUTODASH_KIND = 'autodash'

function isAutoDashReport(configRaw: string): boolean {
  return parseJson<{ kind?: string }>(configRaw, {}).kind === AUTODASH_KIND
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'report.create')
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))

    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const projectId = String(body.projectId ?? ds.projectId)
    const title = String(body.title ?? '').trim() || `${ds.name} — داشبورد هوشمند`
    const description = String(body.description ?? '').trim() ||
      'داشبورد هوشمند تولیدشده خودکار توسط سامانه از ساختار داده — کارت شاخص، روند، تفکیک، ترکیب سهم و بینش‌های فارسی.'
    const layout: AutoDashLayout = sanitizeLayout(body?.layout)

    const config = JSON.stringify({
      kind: AUTODASH_KIND,
      layout,
      generatedAt: new Date().toISOString(),
      rowCount: ds.rowCount,
      dataVersion: ds.version,
    })

    // گزارش داشبورد هوشمند همین مجموعه‌داده — در صورت وجود، نسخه جدید ثبت می‌شود
    const candidates = await db.report.findMany({ where: { projectId, datasetId: id } })
    const existing = candidates.find(r => isAutoDashReport(r.config))

    let report
    if (existing) {
      const nextVersion = existing.version + 1
      report = await db.report.update({
        where: { id: existing.id },
        data: {
          title,
          description,
          config,
          version: nextVersion,
        },
      })
      await db.reportVersion.create({
        data: {
          reportId: existing.id,
          version: nextVersion,
          title,
          description,
          config,
          status: existing.status,
          reason: 'به‌روزرسانی خودکار از داشبورد هوشمند',
          createdBy: user.name,
        },
      })
    } else {
      report = await db.report.create({
        data: {
          projectId,
          datasetId: id,
          title,
          description,
          config,
          status: 'draft',
          createdBy: user.name,
          versions: {
            create: {
              version: 1,
              title,
              description,
              config,
              status: 'draft',
              reason: 'ذخیره داشبورد هوشمند سامانه',
              createdBy: user.name,
            },
          },
        },
      })
    }

    // گردش کار — انتشار فوری برای دارنده مجوز انتشار، یا ارسال برای تأیید
    let status = report.status
    const chain: { action: 'submit' | 'approve' | 'publish'; from: string; to: string }[] = []
    if (body?.publish === true && can(user.role, 'report.publish')) {
      chain.push(
        { action: 'submit', from: 'draft', to: 'pending' },
        { action: 'approve', from: 'pending', to: 'approved' },
        { action: 'publish', from: 'approved', to: 'published' },
      )
    } else if (body?.submit === true && can(user.role, 'report.submit') && report.status === 'draft') {
      chain.push({ action: 'submit', from: 'draft', to: 'pending' })
    }

    if (chain.length > 0) {
      let from = report.status
      for (const step of chain) {
        await db.approvalEvent.create({
          data: {
            reportId: report.id,
            action: step.action,
            fromStatus: from,
            toStatus: step.to,
            comment: 'انتشار/ارسال فوری از داشبورد هوشمند',
            actor: user.name,
            role: user.role,
          },
        })
        from = step.to
      }
      const toStatus = chain[chain.length - 1].to
      status = toStatus
      report = await db.report.update({
        where: { id: report.id },
        data: { status: toStatus, ...(toStatus === 'published' ? { publishedAt: new Date() } : {}) },
      })
    }

    await logAudit(projectId, existing ? 'به‌روزرسانی داشبورد هوشمند ذخیره‌شده' : 'ذخیره داشبورد هوشمند به‌عنوان گزارش',
      `«${title}» | نسخه ${report.version} | وضعیت: ${status} | توسط ${user.name} (${ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role})`, user.name)

    return ok({ report, created: !existing, status })
  } catch (e) {
    return errorResponse(e)
  }
}
