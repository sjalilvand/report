// احراز هویت و کنترل دسترسی مبتنی بر نقش — بخش ۵ و ۲۹ سند
// هش رمز عبور با scrypt، نشست با کوکی httpOnly، ماتریس مجوز نقش‌ها
// ماسک‌کردن اطلاعات حساس و قواعد دسترسی سطح سطر

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { db } from './db'
import { FieldMeta, DataRow } from './types'

export const SESSION_COOKIE = 'data_platform_session'
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // ۱۲ ساعت

// نقش‌های سامانه — بخش ۲.۲ سند
export type Role = 'admin' | 'steward' | 'analyst' | 'viewer' | 'auditor'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'مدیر سامانه',
  steward: 'مدیر داده',
  analyst: 'تحلیلگر و طراح گزارش',
  viewer: 'مشاهده‌کننده',
  auditor: 'ناظر / حسابرس',
}

// ماتریس مجوزها — کنترل دسترسی مبتنی بر نقش و منبع (بخش ۲۹ سند)
export type Permission =
  | 'project.create'   // ایجاد و مدیریت پروژه
  | 'project.edit'     // ویرایش و حذف پروژه
  | 'file.upload'      // بارگذاری فایل
  | 'file.delete'      // حذف فایل
  | 'dataset.create'   // ایجاد مجموعه‌داده از شیت
  | 'dataset.edit'     // ویرایش ستون‌ها، تبدیل‌ها، مدل
  | 'relation.edit'    // ایجاد و ویرایش روابط جداول — بخش ۱۶
  | 'report.create'    // طراحی و ذخیره گزارش
  | 'report.submit'    // ارسال گزارش برای تأیید
  | 'report.approve'   // تأیید یا رد گزارش
  | 'report.publish'   // انتشار گزارش (پس از تأیید)
  | 'report.delete'
  | 'export.run'       // دریافت خروجی
  | 'data.view'        // مشاهده داده
  | 'user.manage'      // مدیریت کاربران
  | 'settings.manage'  // مدیریت پیکربندی ظرفیت
  | 'audit.view'       // مشاهده ثبت رویدادها

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['project.create', 'project.edit', 'file.upload', 'file.delete', 'dataset.create', 'dataset.edit', 'relation.edit', 'report.create', 'report.submit', 'report.approve', 'report.publish', 'report.delete', 'export.run', 'data.view', 'user.manage', 'settings.manage', 'audit.view'],
  steward: ['file.upload', 'file.delete', 'dataset.create', 'dataset.edit', 'relation.edit', 'report.create', 'report.submit', 'report.approve', 'export.run', 'data.view'],
  analyst: ['dataset.create', 'dataset.edit', 'relation.edit', 'report.create', 'report.submit', 'export.run', 'data.view'],
  viewer: ['data.view'],
  auditor: ['data.view', 'audit.view', 'export.run'],
}

export function can(role: string, perm: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role]
  return perms?.includes(perm) ?? false
}

// نقش‌هایی که مقادیر ستون‌های «محرمانه» را بدون ماسک می‌بینند — بخش ۲۹ (ماسک‌کردن اطلاعات حساس)
export function seesSensitive(role: string): boolean {
  return role === 'admin' || role === 'steward' || role === 'auditor'
}

// ---------- هش رمز عبور ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

// ---------- نشست ----------

export async function createSession(userId: string, ip?: string, userAgent?: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await db.session.create({
    data: { id: token, userId, ip, userAgent, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  })
  return token
}

export async function destroySession(token: string) {
  await db.session.deleteMany({ where: { id: token } })
}

export interface SessionUser {
  id: string
  username: string
  name: string
  role: Role
  rowRules: RowRule[]
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({ where: { id: token }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.deleteMany({ where: { id: token } }).catch(() => undefined)
    return null
  }
  if (!session.user.active) return null
  return {
    id: session.user.id,
    username: session.user.username,
    name: session.user.name,
    role: session.user.role as Role,
    rowRules: parseRowRules(session.user.rowRules),
  }
}

export function parseRowRules(raw: string | null | undefined): RowRule[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// قاعده دسترسی سطح سطر — بخش ۲۹ (دسترسی سطح سطر)
// هر قاعده روی یک مجموعه‌داده مشخص، فیلدی و عملگر است و رکوردهای خارج از آن پنهان می‌شوند
export interface RowRule {
  datasetId: string
  fieldId: string
  op: 'eq' | 'neq' | 'in' | 'contains'
  value?: string
  values?: string[]
}

export function applyRowRules(records: DataRow[], rules: RowRule[], datasetId: string): DataRow[] {
  const mine = rules.filter(r => r.datasetId === datasetId)
  if (mine.length === 0) return records
  return records.filter(r =>
    mine.every(rule => {
      const v = r[rule.fieldId]
      const s = v === null || v === undefined ? '' : String(v).trim()
      switch (rule.op) {
        case 'eq': return s === String(rule.value ?? '')
        case 'neq': return s !== String(rule.value ?? '')
        case 'in': return (rule.values ?? []).map(String).includes(s)
        case 'contains': return s.includes(String(rule.value ?? ''))
        default: return true
      }
    })
  )
}

// ماسک مقدار حساس — بخش ۲۹ (ماسک‌کردن اطلاعات حساس)
export function maskValue(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  if (s === '') return ''
  if (/@/.test(s)) {
    // ایمیل: حفظ کاربر و دامنه ابتدایی
    const [user, domain] = s.split('@')
    const head = user.slice(0, 2)
    return `${head}${'•'.repeat(Math.max(2, user.length - 2))}@${domain ?? '***'}`
  }
  const head = s.slice(0, Math.min(2, s.length))
  return `${head}${'•'.repeat(Math.max(3, Math.min(10, s.length - 2)))}`
}

// اعمال ماسک روی رکوردها بر اساس حساسیت ستون‌ها و نقش کاربر
export function maskRecords(records: DataRow[], fields: FieldMeta[], role: string): DataRow[] {
  if (seesSensitive(role)) return records
  const sensitive = fields.filter(f => f.sensitivity === 'confidential').map(f => f.id)
  if (sensitive.length === 0) return records
  return records.map(r => {
    const out = { ...r }
    for (const id of sensitive) {
      if (out[id] !== null && out[id] !== undefined && String(out[id]) !== '') out[id] = maskValue(out[id])
    }
    return out
  })
}

// برچسب ماسک برای متادیتای فیلدها (کلاینت بداند ستون ماسک شده است)
export function maskFieldsMeta(fields: FieldMeta[], role: string): FieldMeta[] {
  if (seesSensitive(role)) return fields
  return fields.map(f => (f.sensitivity === 'confidential' ? { ...f, description: f.description ?? 'مقدارهای این ستون برای نقش شما ماسک شده‌اند (بخش ۲۹ سند)' } : f))
}

// ---------- گیت‌های مسیر API ----------

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(req)
  if (!user) throw new ApiError('برای ادامه باید وارد سامانه شوید (بخش ۲۹ سند: احراز هویت امن).', 401)
  return user
}

export async function requirePerm(req: NextRequest, perm: Permission): Promise<SessionUser> {
  const user = await requireUser(req)
  if (!can(user.role, perm)) {
    throw new ApiError(`نقش «${ROLE_LABELS[user.role]}» مجوز این عملیات را ندارد (کنترل دسترسی مبتنی بر نقش — بخش ۲۹ سند).`, 403)
  }
  return user
}

// تبدیل ApiError به پاسخ — استفاده در catch مسیرها
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
  return NextResponse.json({ error: e instanceof Error ? e.message : 'خطای داخلی سرور' }, { status: 500 })
}

// تنظیم کوکی نشست روی پاسخ
export function sessionCookie(token: string): { name: string; value: string; options: object } {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // در استقرار سازمانی با TLS فعال شود — بخش ۲۹ (رمزنگاری ارتباطات)
      path: '/',
      maxAge: SESSION_TTL_MS / 1000,
    },
  }
}
