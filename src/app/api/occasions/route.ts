// تقویم مناسبت‌ها — بخش ۱۵.۴ سند
// جدول مرجع مناسبت‌ها: نام، نوع تقویم، شروع/پایان در هر سال، دسته، سراسری/محلی،
// تعطیل/غیرتعطیل، منبع و نسخه، رنگ و برچسب نمایشی
// کنترل هم‌پوشانی (بخش ۱۵.۵) به‌صورت هشدار غیرمسدودکننده در پاسخ ثبت/به‌روزرسانی

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { toLatinDigits } from '@/lib/digits'

const CALENDAR_TYPES = ['shamsi', 'ghamari', 'miladi']
const CATEGORIES = ['official', 'religious', 'organizational', 'other']
const SCOPES = ['global', 'local']

interface OccasionBody {
  projectId?: string
  name?: string | null
  calendarType?: string | null
  year?: string | null
  startDate?: string | null
  endDate?: string | null
  category?: string | null
  scope?: string | null
  isHoliday?: boolean | string | null
  source?: string | null
  sourceVersion?: string | null
  color?: string | null
  label?: string | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function normDate(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = toLatinDigits(String(v)).trim()
  return DATE_RE.test(s) ? s : null
}

function normYear(v: unknown): string | null {
  if (v === undefined || v === null || String(v).trim() === '') return null
  return toLatinDigits(String(v)).trim()
}

/** اعتبارسنجی و نرمال‌سازی بدنه — خطاها را جمع می‌کند */
export function validate(body: OccasionBody): { data?: Record<string, unknown>; error?: string } {
  const name = String(body.name ?? '').trim()
  if (!name) return { error: 'نام مناسبت الزامی است.' }
  const start = normDate(body.startDate)
  if (!start) return { error: 'تاریخ شروع باید در قالب YYYY-MM-DD باشد.' }
  const end = normDate(body.endDate)
  if (end && end < start) return { error: 'تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد.' }
  const calendarType = CALENDAR_TYPES.includes(String(body.calendarType)) ? String(body.calendarType) : 'shamsi'
  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : 'official'
  const scope = SCOPES.includes(String(body.scope)) ? String(body.scope) : 'global'
  const color = /^#[0-9a-fA-F]{6}$/.test(String(body.color ?? '')) ? String(body.color) : '#2563eb'
  return {
    data: {
      name,
      calendarType,
      year: normYear(body.year),
      startDate: start,
      endDate: end,
      category,
      scope,
      isHoliday: body.isHoliday === true || body.isHoliday === 'true',
      source: body.source ? String(body.source).trim() : null,
      sourceVersion: body.sourceVersion ? String(body.sourceVersion).trim() : null,
      color,
      label: body.label ? String(body.label).trim() : null,
    },
  }
}

/** بازه دو مناسبت در یک تقویم هم‌پوشان است؟ (بخش ۱۵.۵) */
function overlaps(a: { startDate: string; endDate: string | null }, b: { startDate: string; endDate: string | null }): boolean {
  const aEnd = a.endDate ?? a.startDate
  const bEnd = b.endDate ?? b.startDate
  return a.startDate <= bEnd && b.startDate <= aEnd
}

export async function findOverlaps(projectId: string, calendarType: string, start: string, end: string | null, excludeId?: string) {
  const candidates = await db.occasion.findMany({
    where: { projectId, calendarType, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, name: true, year: true, startDate: true, endDate: true, isHoliday: true },
  })
  return candidates.filter(c => overlaps({ startDate: start, endDate: end }, c))
}

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'data.view')
    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return fail('projectId الزامی است.')
    const year = req.nextUrl.searchParams.get('year')
    const occasions = await db.occasion.findMany({
      where: { projectId, ...(year ? { year } : {}) },
      orderBy: [{ year: 'desc' }, { startDate: 'asc' }, { createdAt: 'desc' }],
    })
    return ok({ occasions })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requirePerm(req, 'dataset.edit')
    const body = (await req.json()) as OccasionBody
    if (!body.projectId) return fail('projectId الزامی است.')
    const project = await db.project.findUnique({ where: { id: body.projectId }, select: { id: true } })
    if (!project) return fail('پروژه یافت نشد.', 404)

    const { data, error } = validate(body)
    if (error || !data) return fail(error ?? 'ورودی نامعتبر است.')

    const occasion = await db.occasion.create({ data: { ...(data as { name: string; startDate: string; [k: string]: unknown }), projectId: body.projectId, createdBy: me.name } })
    const overlapWith = await findOverlaps(body.projectId, data.calendarType as string, data.startDate as string, (data.endDate as string | null) ?? null, occasion.id)
    await logAudit(body.projectId, 'ثبت مناسبت', `${data.name} — ${data.startDate}`, me.name)
    return ok({ occasion, overlapWith })
  } catch (e) {
    return errorResponse(e)
  }
}
