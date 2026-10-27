// منابع داده خارجی — بخش ۳۱ سند («اتصال API و پایگاه‌داده»)
// فهرست و ایجاد اتصال؛ مقادیر محرمانه پیکربندی در پاسخ ماسک می‌شوند (بخش ۲۹)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { requirePerm, requireUser, errorResponse, ApiError } from '@/lib/auth'
import { CONNECTION_TYPES, CONNECTION_TYPE_LABELS, SECRET_CONFIG_KEYS, CONFIG_MASK, toConnectionRecord } from '@/lib/connectors'

/** ماسک مقادیر محرمانه پیکربندی در پاسخ — جلوگیری از نشت گذرواژه/توکن (بخش ۲۹) */
export function maskConfig(raw: string): string {
  const cfg = parseJson<Record<string, unknown>>(raw, {})
  for (const k of SECRET_CONFIG_KEYS) {
    if (cfg[k]) cfg[k] = CONFIG_MASK
  }
  return JSON.stringify(cfg)
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return fail('شناسه پروژه الزامی است.', 400)
    const rows = await db.externalConnection.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })
    return ok(
      rows.map(r => {
        const conn = toConnectionRecord(r)
        return {
          ...conn,
          configRaw: maskConfig(r.config),
          typeLabel: CONNECTION_TYPE_LABELS[conn.type] ?? conn.type,
        }
      })
    )
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'dataset.create')
    const body = await req.json()
    const projectId = String(body.projectId ?? '')
    const name = String(body.name ?? '').trim()
    const type = String(body.type ?? '')
    if (!projectId || !name) return fail('نام اتصال و پروژه الزامی است.', 400)
    if (!CONNECTION_TYPES.includes(type as (typeof CONNECTION_TYPES)[number])) {
      return fail(`نوع اتصال نامعتبر است؛ انواع مجاز: ${CONNECTION_TYPES.map(t => CONNECTION_TYPE_LABELS[t]).join('، ')}`, 400)
    }
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return fail('پروژه یافت نشد.', 404)

    const config = body.config && typeof body.config === 'object' ? body.config : {}
    const syncIntervalMinutes = Math.max(0, Math.min(10080, Number(body.syncIntervalMinutes ?? 0) || 0))
    const conn = await db.externalConnection.create({
      data: {
        projectId,
        name,
        type,
        config: JSON.stringify(config),
        query: body.query ? String(body.query) : null,
        syncIntervalMinutes,
        createdBy: user.name,
      },
    })
    await logAudit(projectId, 'ایجاد اتصال خارجی', `${CONNECTION_TYPE_LABELS[type as ConnectionTypeName]} «${name}» (بخش ۳۱ سند)`, user.name)
    return ok({ id: conn.id, message: 'اتصال ساخته شد؛ با «آزمون اتصال» صحت آن را بسنجید.' }, 201)
  } catch (e) {
    return errorResponse(e)
  }
}

type ConnectionTypeName = (typeof CONNECTION_TYPES)[number]

// جلوگیری از حذف بی‌استفاده — ApiError در مسیرهای دیگر هم استفاده می‌شود
void ApiError
