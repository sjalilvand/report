// API گزارش‌ها — بخش ۱۹ و ۲۴.۳ سند
// ذخیره طراحی گزارش، نسخه‌بندی و انتشار کنترل‌شده
// گردش کار تأیید (بخش ۲۶.۱) از مسیر /api/reports/[id]/status انجام می‌شود

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requireUser, requirePerm, errorResponse, can } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return fail('شناسه پروژه الزامی است.')
    // مشاهده‌کننده فقط گزارش‌های منتشرشده را می‌بیند — بخش ۲۹ سند
    const onlyPublished = !can(user.role, 'report.submit')
    const reports = await db.report.findMany({
      where: { projectId, ...(onlyPublished ? { status: 'published' } : {}) },
      orderBy: { updatedAt: 'desc' },
    })
    return ok(reports)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'report.create')
    const body = await req.json()
    const projectId = String(body.projectId ?? '')
    const title = String(body.title ?? '').trim()
    if (!projectId || !title) return fail('پروژه و عنوان گزارش الزامی است.')

    const configStr = JSON.stringify(body.config ?? {})
    const report = await db.report.create({
      data: {
        projectId,
        datasetId: body.datasetId ? String(body.datasetId) : null,
        title,
        description: body.description ? String(body.description) : null,
        config: configStr,
        status: 'draft',
        createdBy: user.name,
        // عکس‌فوری نسخه ۱ — بخش ۲۶.۱ (مقایسه نسخه‌ها)
        versions: {
          create: {
            version: 1,
            title,
            description: body.description ? String(body.description) : null,
            config: configStr,
            status: 'draft',
            reason: 'ایجاد نسخه اولیه',
            createdBy: user.name,
          },
        },
      },
      include: { versions: true },
    })
    await logAudit(projectId, 'ذخیره گزارش', `گزارش «${title}» به‌عنوان پیش‌نویس ذخیره شد (نسخه ۱)`, user.name)
    return ok(report, 201)
  } catch (e) {
    return errorResponse(e)
  }
}
