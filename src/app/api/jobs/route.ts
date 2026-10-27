// صف پردازش خروجی حجیم — بخش ۲۸ (Job/Export) و ۳۰.۲ سند (پایداری)
// ثبت کار خروجی در صف پس‌زمینه و مشاهده وضعیت پردازش‌ها

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { requirePerm, requireUser, errorResponse, RowRule } from '@/lib/auth'
import { enqueueExportJob } from '@/lib/jobs'
import { QuerySpec } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const projectId = req.nextUrl.searchParams.get('projectId')
    const status = req.nextUrl.searchParams.get('status')
    const limit = Math.min(100, Number(req.nextUrl.searchParams.get('limit') ?? 50) || 50)
    if (!projectId) return fail('شناسه پروژه الزامی است.', 400)
    const rows = await db.job.findMany({
      where: { projectId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return ok(
      rows.map(r => ({
        id: r.id,
        projectId: r.projectId,
        type: r.type,
        status: r.status,
        progress: r.progress,
        result: parseJson<{ fileName?: string; size?: number; ext?: string; expiresAt?: string } | null>(r.result, null),
        error: r.error,
        attempts: r.attempts,
        maxAttempts: r.maxAttempts,
        createdBy: r.createdBy,
        durationMs: r.durationMs,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        createdAt: r.createdAt,
      }))
    )
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'export.run')
    const body = await req.json()
    const projectId = String(body.projectId ?? '')
    const datasetId = String(body.datasetId ?? '')
    const format = String(body.format ?? 'xlsx')
    if (!projectId || !datasetId) return fail('پروژه و مجموعه‌داده الزامی است.', 400)
    // قالب شناخته‌شده یا الگوی معتبر — قالب ناشناخته در صف با پیام فارسی شکست می‌خورد (رفتار صف ناهم‌زمان)
    if (!/^[a-z0-9]{1,10}$/.test(format)) return fail('قالب خروجی نامعتبر است.', 400)
    const ds = await db.dataset.findUnique({ where: { id: datasetId } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const spec: QuerySpec = {
      dimensions: Array.isArray(body.spec?.dimensions) ? body.spec.dimensions : [],
      measures: Array.isArray(body.spec?.measures) && body.spec.measures.length > 0 ? body.spec.measures : [{ agg: 'count' }],
      filters: body.spec?.filters ?? [],
      orderBy: body.spec?.orderBy,
      limit: body.spec?.limit,
    }
    // قواعد دسترسی سطح سطرِ درخواست‌کننده در لحظه ثبت قفل می‌شود — بخش ۲۹
    const job = await enqueueExportJob({
      projectId,
      datasetId,
      type: `export.${format}`,
      spec,
      title: body.title ? String(body.title) : undefined,
      chartType: body.chartType ? String(body.chartType) : undefined,
      rowRules: (user.rowRules ?? []) as RowRule[],
      createdBy: user.name,
    })
    await logAudit(projectId, 'ثبت پردازش خروجی در صف', `قالب ${format} برای «${ds.name}» (بخش ۳۰.۲ سند)`, user.name)
    return ok({ id: job.id, message: 'پردازش به صف اضافه شد؛ وضعیت در تب «پردازش‌ها» قابل پیگیری است.' }, 202)
  } catch (e) {
    return errorResponse(e)
  }
}
