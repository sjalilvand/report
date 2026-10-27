// API قواعد هشدار — بخش ۲۶.۲ سند (هشدار و اعلان)
// فهرست و ایجاد قاعده؛ ویرایش/حذف در مسیر [id]؛ ارزیابی در مسیر evaluate

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { ALERT_TYPES } from '@/lib/alerts'

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'data.view')
    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return fail('شناسه پروژه الزامی است.')
    const rules = await db.alertRule.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })
    return ok(rules.map(r => ({
      ...r,
      lastState: r.lastState ? JSON.parse(r.lastState) : null,
    })))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'alert.manage')
    const body = await req.json()
    const projectId = String(body.projectId ?? '')
    const name = String(body.name ?? '').trim()
    const type = String(body.type ?? '')
    if (!projectId || !name) return fail('نام قاعده و پروژه الزامی است.')
    if (!(ALERT_TYPES as readonly string[]).includes(type)) {
      return fail('نوع هشدار نامعتبر است؛ انواع مجاز: threshold، quality، fileDelay، processFailure، structureChange، missingPeriod.')
    }

    const datasetId = body.datasetId ? String(body.datasetId) : null
    if (['threshold', 'quality', 'structureChange', 'missingPeriod', 'fileDelay'].includes(type) && !datasetId) {
      return fail('این نوع هشدار به مجموعه‌داده نیاز دارد.')
    }
    const type_ = type as (typeof ALERT_TYPES)[number]
    if (type_ === 'threshold' && !body.fieldId && body.aggregation !== 'count') {
      return fail('برای عبور شاخص از آستانه، ستون سنجه الزامی است.')
    }
    if (['threshold', 'quality'].includes(type_) && (body.threshold === undefined || body.threshold === null || Number.isNaN(+body.threshold))) {
      return fail('مقدار آستانه الزامی است.')
    }
    if (type_ === 'fileDelay' && (body.maxDays === undefined || body.maxDays === null || Number.isNaN(+body.maxDays))) {
      return fail('حداکثر فاصله مجاز روز الزامی است.')
    }

    const rule = await db.alertRule.create({
      data: {
        projectId,
        name,
        type,
        datasetId,
        fieldId: body.fieldId ? String(body.fieldId) : null,
        aggregation: String(body.aggregation ?? 'sum'),
        operator: String(body.operator ?? 'gt'),
        threshold: body.threshold !== undefined && body.threshold !== null && body.threshold !== '' ? +body.threshold : null,
        maxDays: body.maxDays !== undefined && body.maxDays !== null && body.maxDays !== '' ? +body.maxDays : null,
        severity: ['info', 'warning', 'critical'].includes(body.severity) ? body.severity : 'warning',
        active: body.active !== false,
        createdBy: user.name,
      },
    })

    await logAudit(projectId, 'ایجاد قاعده هشدار', `قاعده «${name}» از نوع ${type} ساخته شد`, user.name)
    return ok({ rule: { ...rule, lastState: null } }, 201)
  } catch (e) {
    return errorResponse(e)
  }
}
