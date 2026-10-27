// ورود به سامانه — بخش ۲۹ سند (احراز هویت امن)
// راه‌اندازی اولیه: اگر هیچ کاربری وجود نداشته باشد، نخستین کاربر با نقش مدیر سامانه ساخته می‌شود

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { verifyPassword, hashPassword, createSession, sessionCookie, ROLE_LABELS, Role } from '@/lib/auth'
import { getSettings } from '@/lib/settings'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    if (!username || !password) return fail('نام کاربری و گذرواژه الزامی است.')

    // راه‌اندازی اولیه سامانه — نخستین کاربر مدیر سامانه می‌شود
    const userCount = await db.user.count()
    if (userCount === 0) {
      if (!body.name || password.length < 6) {
        return fail('برای راه‌اندازی اولیه، نام کامل و گذرواژه حداقل ۶ نویسه لازم است.', 400)
      }
      const admin = await db.user.create({
        data: {
          username,
          name: String(body.name).trim(),
          passwordHash: hashPassword(password),
          role: 'admin',
          lastLoginAt: new Date(),
        },
      })
      await getSettings()
      const token = await createSession(admin.id)
      await logAudit(null, 'راه‌اندازی سامانه', `نخستین کاربر «${admin.name}» با نقش مدیر سامانه ایجاد شد`, admin.name)
      const res = NextResponse.json({
        user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, roleLabel: ROLE_LABELS[admin.role as Role] },
        message: 'راه‌اندازی اولیه انجام شد؛ شما مدیر سامانه هستید.',
      })
      const c = sessionCookie(token)
      res.cookies.set(c.name, c.value, c.options)
      return res
    }

    const user = await db.user.findUnique({ where: { username } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      // پیام مبهم برای جلوگیری از افشای اطلاعات — بخش ۲۹ سند
      return fail('نام کاربری یا گذرواژه نادرست است.', 401)
    }
    if (!user.active) return fail('حساب کاربری شما غیرفعال شده است؛ با مدیر سامانه تماس بگیرید.', 403)

    // سقف کاربران هم‌زمان — بخش ۳۰.۱ (اهداف ظرفیت)
    const settings = await getSettings()
    const activeSessions = await db.session.count({ where: { expiresAt: { gt: new Date() } } })
    if (activeSessions >= settings.maxConcurrentUsers) {
      return fail(`سقف کاربران هم‌زمان (${settings.maxConcurrentUsers.toLocaleString('fa-IR')}) پر است؛ بعداً تلاش کنید.`, 429)
    }

    // احراز هویت چندمرحله‌ای — بخش ۲۹ سند (نقش‌های حساس)
    // با فعال‌بودن MFA، نشست مستقیم صادر نمی‌شود؛ بلیت کوتاه‌عمر تک‌مصرف با کد TOTP مبادله می‌شود
    if (user.mfaEnabled && user.mfaSecret) {
      await db.mfaTicket.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } })
      const ticket = await db.mfaTicket.create({
        data: {
          id: randomBytes(24).toString('hex'),
          userId: user.id,
          expiresAt: new Date(Date.now() + 5 * 60_000),
        },
      })
      return ok({ mfaRequired: true, ticket: ticket.id, message: 'کد تأیید دوعاملی را وارد کنید.' })
    }

    const mfaAdvised = settings.mfaRequiredRoles
      .split(',')
      .map(r => r.trim())
      .includes(user.role)

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const token = await createSession(user.id)
    await logAudit(null, 'ورود به سامانه', `«${user.name}» با نقش ${ROLE_LABELS[user.role as Role]} وارد شد`, user.name)

    const res = NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role, roleLabel: ROLE_LABELS[user.role as Role] },
      ...(mfaAdvised ? { mfaAdvised: true, message: 'نقش شما نیازمند احراز هویت چندمرحله‌ای است؛ از نمای مدیریت حساب آن را فعال کنید.' } : {}),
    })
    const c = sessionCookie(token)
    res.cookies.set(c.name, c.value, c.options)
    return res
  } catch {
    return fail('خطا در ورود به سامانه', 500)
  }
}
