// مدیریت کاربران — بخش ۲.۲ و ۲۹ سند (فقط مدیر سامانه)
// قواعد دسترسی سطح سطر هر کاربر اینجا تعریف می‌شود

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse, hashPassword, parseRowRules, RowRule, ROLE_LABELS, Role } from '@/lib/auth'

const VALID_ROLES: Role[] = ['admin', 'steward', 'analyst', 'viewer', 'auditor']

export async function GET(req: NextRequest) {
  try {
    const me = await requirePerm(req, 'user.manage')
    const users = await db.user.findMany({
      select: { id: true, username: true, name: true, role: true, rowRules: true, active: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    await logAudit(null, 'مشاهده فهرست کاربران', '', me.name)
    return ok(users.map(u => ({ ...u, rowRules: parseRowRules(u.rowRules), roleLabel: ROLE_LABELS[u.role as Role] })))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requirePerm(req, 'user.manage')
    const body = await req.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const name = String(body.name ?? '').trim()
    const password = String(body.password ?? '')
    const role = String(body.role ?? 'viewer')
    if (!username || !name || !password) return fail('نام کاربری، نام کامل و گذرواژه الزامی است.')
    if (password.length < 6) return fail('گذرواژه باید حداقل ۶ نویسه باشد (بخش ۲۹ سند: احراز هویت امن).')
    if (!VALID_ROLES.includes(role as Role)) return fail('نقش نامعتبر است.')
    const exists = await db.user.findUnique({ where: { username } })
    if (exists) return fail('این نام کاربری قبلاً ثبت شده است.')
    const user = await db.user.create({
      data: {
        username,
        name,
        passwordHash: hashPassword(password),
        role,
        rowRules: JSON.stringify(Array.isArray(body.rowRules) ? body.rowRules : []),
      },
    })
    await logAudit(null, 'ایجاد کاربر', `کاربر «${name}» با نقش ${ROLE_LABELS[role as Role]} ایجاد شد`, me.name)
    return ok({ id: user.id, username: user.username, name: user.name, role: user.role, active: user.active }, 201)
  } catch (e) {
    return errorResponse(e)
  }
}
