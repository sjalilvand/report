// API فرهنگ داده — بخش ۱۸ سند
// شاخص‌های مرکزی قابل استفاده مجدد: پیش‌نویس → تأیید؛ شاخص تأییدشده در گزارش‌ساز قابل انتخاب است

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { requireUser, requirePerm, errorResponse } from '@/lib/auth'

const AGGS = ['sum', 'count', 'countDistinct', 'avg', 'min', 'max', 'median', 'last']

function dto(m: {
  id: string; projectId: string; name: string; label: string; description: string | null
  formula: string; datasetId: string | null; sourceFieldId: string | null; unit: string | null
  aggregation: string; fixedFilters: string; scope: string | null; owner: string | null
  limitations: string | null; status: string; version: number
  approvedAt: Date | null; approvedBy: string | null; updatedAt: Date
}) {
  return { ...m, fixedFilters: parseJson<unknown[]>(m.fixedFilters, []), updatedAt: m.updatedAt.toISOString(), approvedAt: m.approvedAt?.toISOString() ?? null }
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return fail('شناسه پروژه الزامی است.')
    const status = req.nextUrl.searchParams.get('status')
    const rows = await db.measureDefinition.findMany({
      where: { projectId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
    })
    return ok(rows.map(dto))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'dataset.edit')
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const label = String(body.label ?? '').trim()
    const projectId = String(body.projectId ?? '')
    if (!projectId) return fail('پروژه باید مشخص باشد.')
    if (!name || !label) return fail('کد و نام شاخص الزامی است.')
    const aggregation = String(body.aggregation ?? 'sum')
    if (!AGGS.includes(aggregation)) return fail('نوع تجمیع نامعتبر است.')

    // مثال سند ۱۸: «تعداد افراد» باید روشن کند تعداد رکورد است یا شناسه متمایز
    if (aggregation === 'count' && !String(body.description ?? '').trim()) {
      return fail('برای تجمیع «تعداد»، ثبت تعریف مدیریتی الزامی است تا روشن شود منظور تعداد رکورد است یا تعداد شناسه‌های متمایز (بخش ۱۸ سند).')
    }

    const dup = await db.measureDefinition.findFirst({ where: { projectId, name } })
    if (dup) return fail('شاخصی با همین کد در این پروژه ثبت شده است.')

    const m = await db.measureDefinition.create({
      data: {
        projectId,
        name,
        label,
        description: body.description ? String(body.description) : null,
        formula: String(body.formula ?? ''),
        datasetId: body.datasetId ? String(body.datasetId) : null,
        sourceFieldId: body.sourceFieldId ? String(body.sourceFieldId) : null,
        unit: body.unit ? String(body.unit) : null,
        aggregation,
        fixedFilters: JSON.stringify(Array.isArray(body.fixedFilters) ? body.fixedFilters : []),
        scope: body.scope ? String(body.scope) : null,
        owner: String(body.owner ?? user.name),
        limitations: body.limitations ? String(body.limitations) : null,
      },
    })
    await logAudit(projectId, 'ثبت شاخص در فرهنگ داده', `شاخص «${label}» (${name}) با تجمیع ${aggregation} ثبت شد`, user.name)
    return ok(dto(m), 201)
  } catch (e) {
    return errorResponse(e)
  }
}
