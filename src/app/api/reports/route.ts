// API گزارش‌ها — بخش ۱۹ و ۲۴.۳ سند
// ذخیره طراحی گزارش، نسخه‌بندی و انتشار کنترل‌شده

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return fail('شناسه پروژه الزامی است.')
  const reports = await db.report.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
  })
  return ok(reports)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const projectId = String(body.projectId ?? '')
    const title = String(body.title ?? '').trim()
    if (!projectId || !title) return fail('پروژه و عنوان گزارش الزامی است.')

    const report = await db.report.create({
      data: {
        projectId,
        datasetId: body.datasetId ? String(body.datasetId) : null,
        title,
        description: body.description ? String(body.description) : null,
        config: JSON.stringify(body.config ?? {}),
        status: 'draft',
        createdBy: 'طراح گزارش',
      },
    })
    await logAudit(projectId, 'ذخیره گزارش', `گزارش «${title}» به‌عنوان پیش‌نویس ذخیره شد (نسخه ۱)`)
    return ok(report, 201)
  } catch {
    return fail('خطا در ذخیره گزارش')
  }
}
