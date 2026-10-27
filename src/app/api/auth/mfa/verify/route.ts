// گام دوم ورود دوعاملی — بخش ۲۹ سند (احراز هویت چندمرحله‌ای)
// بلیت کوتاه‌عمر تک‌مصرف صادرشده در گام اول با کد TOTP به نشست کامل تبدیل می‌شود

import { NextRequest, NextResponse } from 'next/server'
import { ok, fail, logAudit } from '@/lib/server'
import { db } from '@/lib/db'
import { createSession, sessionCookie, ROLE_LABELS, Role, errorResponse } from '@/lib/auth'
import { verifyTotp } from '@/lib/totp'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const ticketId = String(body.ticket ?? '')
    const code = String(body.code ?? '')
    if (!ticketId || !code) return fail('بلیت و کد تأیید الزامی است.', 400)

    const ticket = await db.mfaTicket.findUnique({ where: { id: ticketId }, include: { user: true } })
    if (!ticket) return fail('بلیت ورود نامعتبر است؛ دوباره وارد شوید.', 401)
    if (ticket.expiresAt.getTime() < Date.now()) {
      await db.mfaTicket.delete({ where: { id: ticketId } }).catch(() => undefined)
      return fail('بلیت ورود منقضی شده است؛ دوباره وارد شوید.', 401)
    }
    if (!ticket.user.active) return fail('حساب کاربری شما غیرفعال شده است.', 403)
    if (!ticket.user.mfaSecret || !verifyTotp(ticket.user.mfaSecret, code)) {
      // بلیت باقی می‌ماند تا کاربر چند بار تلاش کند؛ انقضای پنج‌دقیقه‌ای سقف تلاش را کنترل می‌کند
      return fail('کد تأیید نادرست است.', 401)
    }

    // تک‌مصرف بودن بلیت — ابطال پس از استفاده و پاک‌سازی بلیت‌های منقضی (بخش ۲۹)
    await db.mfaTicket.deleteMany({ where: { OR: [{ id: ticketId }, { userId: ticket.userId, expiresAt: { lt: new Date() } }] } })
    await db.user.update({ where: { id: ticket.userId }, data: { lastLoginAt: new Date() } })
    const token = await createSession(ticket.userId)
    await logAudit(null, 'ورود با احراز هویت دوعاملی', `«${ticket.user.name}» با کد TOTP وارد شد (بخش ۲۹ سند)`, ticket.user.name)

    const res = NextResponse.json({
      user: {
        id: ticket.user.id,
        username: ticket.user.username,
        name: ticket.user.name,
        role: ticket.user.role,
        roleLabel: ROLE_LABELS[ticket.user.role as Role],
      },
    })
    const c = sessionCookie(token)
    res.cookies.set(c.name, c.value, c.options)
    return res
  } catch (e) {
    return errorResponse(e)
  }
}
