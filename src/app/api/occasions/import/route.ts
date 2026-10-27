// ورود گروهی مناسبت‌ها از فایل اکسل/CSV — بخش ۱۵.۴ سند («ایجاد یا وارد کند»)
// سرستون‌های قابل قبول (فارسی یا انگلیسی):
//   نام مناسبت | name — الزامی
//   نوع تقویم | calendarType — شمسی/قمری/میلادی یا shamsi/ghamari/miladi
//   سال | year
//   تاریخ شروع | startDate — الزامی (YYYY-MM-DD)
//   تاریخ پایان | endDate
//   دسته | category — رسمی/دینی/سازمانی/سایر
//   دامنه | scope — سراسری/محلی
//   تعطیل | isHoliday — بله/خیر/تعطیل/عادی
//   منبع | source | نسخه | sourceVersion | رنگ | color | برچسب | label
// سطرهای نامعتبر رد و با دلیل گزارش می‌شوند؛ هم‌پوشانی‌ها (۱۵.۵) در پایان اعلام می‌شوند

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { toLatinDigits } from '@/lib/digits'
import * as XLSX from 'xlsx'
import { findOverlaps } from '../route'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function normStr(v: unknown): string {
  return v === undefined || v === null ? '' : String(v).trim()
}

function normDate(v: unknown): string | null {
  // سری تاریخ اکسل — sheetjs رشته‌های میلادی معتبر را در پارس CSV به سری عددی تبدیل می‌کند
  const rawStr = normStr(v)
  if (typeof v === 'number' || /^\d{5}(\.\d+)?$/.test(rawStr)) {
    const serial = Number(v)
    if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
      return new Date(Math.round((serial - 25569) * 86400000)).toISOString().slice(0, 10)
    }
    return null
  }
  let s = toLatinDigits(rawStr).replace(/[./]/g, '-')
  if (DATE_RE.test(s)) return s
  // قالب شمسی بدون صفر پیشرو: ۱۴۰۴/۱/۱ → 1404-01-01
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return null
}

function mapCalendar(v: string): string {
  const s = normStr(v)
  if (/قمری|ghamari|hijri/i.test(s)) return 'ghamari'
  if (/میلادی|miladi|gregorian/i.test(s)) return 'miladi'
  return 'shamsi'
}

function mapCategory(v: string): string {
  const s = normStr(v)
  if (/دینی|religious/i.test(s)) return 'religious'
  if (/سازمانی|organizational|internal/i.test(s)) return 'organizational'
  if (/سایر|other/i.test(s)) return 'other'
  return 'official'
}

function mapScope(v: string): string {
  return /محلی|local/i.test(normStr(v)) ? 'local' : 'global'
}

function mapHoliday(v: unknown): boolean {
  const s = normStr(v)
  if (!s) return false
  return /بله|تعطیل|true|yes|1| holiday /i.test(s.toLowerCase()) || s === '1'
}

// نگاشت سرستون‌های انعطاف‌پذیر
const COLUMN_MAP: Record<string, string> = {
  'نام مناسبت': 'name', 'نام': 'name', 'عنوان': 'name', 'name': 'name', 'title': 'name',
  'نوع تقویم': 'calendarType', 'تقویم': 'calendarType', 'calendartype': 'calendarType', 'calendar': 'calendarType',
  'سال': 'year', 'year': 'year',
  'تاریخ شروع': 'startDate', 'شروع': 'startDate', 'startdate': 'startDate', 'start': 'startDate',
  'تاریخ پایان': 'endDate', 'پایان': 'endDate', 'enddate': 'endDate', 'end': 'endDate',
  'دسته': 'category', 'دسته مناسبت': 'category', 'category': 'category',
  'دامنه': 'scope', 'سراسری/محلی': 'scope', 'scope': 'scope',
  'تعطیل': 'isHoliday', 'تعطیل بودن': 'isHoliday', 'isholiday': 'isHoliday', 'holiday': 'isHoliday',
  'منبع': 'source', 'منبع اطلاعات': 'source', 'source': 'source',
  'نسخه': 'sourceVersion', 'نسخه اطلاعات': 'sourceVersion', 'sourceversion': 'sourceVersion', 'version': 'sourceVersion',
  'رنگ': 'color', 'color': 'color',
  'برچسب': 'label', 'برچسب نمایشی': 'label', 'label': 'label',
}

export async function POST(req: NextRequest) {
  try {
    const me = await requirePerm(req, 'dataset.edit')
    const form = await req.formData()
    const projectId = String(form.get('projectId') ?? '')
    if (!projectId) return fail('projectId الزامی است.')
    const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!project) return fail('پروژه یافت نشد.', 404)
    const file = form.get('file')
    if (!(file instanceof File)) return fail('فایل اکسل/CSV مناسبت‌ها الزامی است.')

    const buf = Buffer.from(await file.arrayBuffer())
    const ext = (file.name.toLowerCase().split('.').pop() ?? '')
    // CSV/TSV: رمزگشایی مستقیم UTF-8 (در باندلر، مسیر codepage sheetjs قابل اعتماد نیست)
    const wb = ['csv', 'tsv', 'txt'].includes(ext)
      ? XLSX.read(new TextDecoder('utf-8').decode(buf), { type: 'string' })
      : XLSX.read(buf, { type: 'buffer', codepage: 65001 })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    if (!sheet) return fail('فایل فاقد شیت داده است.')
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (rows.length === 0) return fail('فایل هیچ سطر داده‌ای ندارد.')

    // نگاشت سرستون‌ها بر اساس سطر اول — col: هدف → سرستون خام فایل
    const first = rows[0]
    const keyMap: Record<string, string> = {}
    for (const raw of Object.keys(first)) {
      const clean = normStr(raw).toLowerCase()
      const target = COLUMN_MAP[clean] ?? COLUMN_MAP[normStr(raw)]
      if (target && !Object.values(keyMap).includes(target)) keyMap[raw] = target
    }
    const col: Record<string, string> = {}
    for (const [rawKey, target] of Object.entries(keyMap)) col[target] = rawKey
    if (col['name'] === undefined || col['startDate'] === undefined) {
      return fail('سرستون‌های الزامی «نام مناسبت» و «تاریخ شروع» در فایل یافت نشد. قالب نمونه را ببینید.')
    }

    const created: string[] = []
    const errors: { row: number; reason: string }[] = []
    const pending: { name: string; calendarType: string; year: string | null; startDate: string; endDate: string | null; category: string; scope: string; isHoliday: boolean; source: string | null; sourceVersion: string | null; color: string; label: string | null }[] = []

    rows.forEach((r, i) => {
      const rowNo = i + 2 // با احتساب سطر سرستون
      const name = normStr(r[col['name']])
      const start = normDate(r[col['startDate']])
      if (!name) { errors.push({ row: rowNo, reason: 'نام مناسبت خالی است.' }); return }
      if (!start) { errors.push({ row: rowNo, reason: 'تاریخ شروع نامعتبر است (قالب YYYY-MM-DD).' }); return }
      const endRaw = col['endDate'] !== undefined ? normDate(r[col['endDate']]) : null
      if (endRaw && endRaw < start) { errors.push({ row: rowNo, reason: 'تاریخ پایان پیش از شروع است.' }); return }
      const yearRaw = col['year'] !== undefined ? normStr(r[col['year']]) : ''
      pending.push({
        name,
        calendarType: col['calendarType'] !== undefined ? mapCalendar(normStr(r[col['calendarType']])) : 'shamsi',
        year: yearRaw ? toLatinDigits(yearRaw) : null,
        startDate: start,
        endDate: endRaw,
        category: col['category'] !== undefined ? mapCategory(normStr(r[col['category']])) : 'official',
        scope: col['scope'] !== undefined ? mapScope(normStr(r[col['scope']])) : 'global',
        isHoliday: col['isHoliday'] !== undefined ? mapHoliday(r[col['isHoliday']]) : false,
        source: col['source'] !== undefined ? normStr(r[col['source']]) || null : null,
        sourceVersion: col['sourceVersion'] !== undefined ? normStr(r[col['sourceVersion']]) || null : null,
        color: col['color'] !== undefined && /^#[0-9a-fA-F]{6}$/.test(normStr(r[col['color']])) ? normStr(r[col['color']]) : '#2563eb',
        label: col['label'] !== undefined ? normStr(r[col['label']]) || null : null,
      })
    })

    for (const p of pending) {
      const occ = await db.occasion.create({ data: { ...p, projectId, createdBy: me.name } })
      created.push(occ.id)
    }

    // اعلام هم‌پوشانی‌های نهایی (بخش ۱۵.۵) — غیرمسدودکننده
    const overlaps: { name: string; startDate: string; endDate: string | null; with: string[] }[] = []
    if (created.length > 0) {
      const all = await db.occasion.findMany({ where: { projectId }, select: { id: true, name: true, calendarType: true, startDate: true, endDate: true } })
      for (const a of all) {
        const withIds = all.filter(b => b.id !== a.id && b.calendarType === a.calendarType && a.startDate <= (b.endDate ?? b.startDate) && b.startDate <= (a.endDate ?? a.startDate))
        if (withIds.length > 0) overlaps.push({ name: a.name, startDate: a.startDate, endDate: a.endDate, with: withIds.map(w => w.name) })
      }
    }

    await logAudit(projectId, 'ورود گروهی مناسبت', `${created.length} سطر از فایل ${file.name}`, me.name)
    return ok({ imported: created.length, failed: errors.length, errors: errors.slice(0, 20), overlaps: overlaps.slice(0, 20) })
  } catch (e) {
    return errorResponse(e)
  }
}
