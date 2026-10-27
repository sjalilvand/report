// بازگشت از سامانه هویتی سازمان — بخش ۲۹ سند
// تبادل کد با توکن، استخراج هویت، یافتن/ساخت کاربر و صدور نشست

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/server'
import { createSession, sessionCookie } from '@/lib/auth'
import { resolveSsoConfig, exchangeCode, fetchClaims, extractIdentity, resolveSsoUser, SSO_STATE_COOKIE } from '@/lib/sso'

export async function GET(req: NextRequest) {
  const failUrl = (message: string) =>
    NextResponse.redirect(new URL('/?ssoError=' + encodeURIComponent(message), req.url))

  try {
    const cfg = await resolveSsoConfig()
    if (!cfg) return failUrl('ورود سازمانی فعال نیست؛ با مدیر سامانه تماس بگیرید.')

    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')
    const expectedState = req.cookies.get(SSO_STATE_COOKIE)?.value
    if (!code) return failUrl('کد بازگشتی از سامانه هویتی دریافت نشد.')
    // محافظت CSRF — تطابق state کوکی و پارامتر (بخش ۲۹)
    if (!state || !expectedState || state !== expectedState) {
      return failUrl('اعتبارسنجی state ناموفق بود؛ ورود سازمانی از ابتدا تلاش شود.')
    }

    const origin = req.headers.get('origin') ?? req.nextUrl.origin
    const redirectUri = `${origin}/api/auth/sso/callback`
    const token = await exchangeCode(cfg, code, redirectUri)
    const claims = await fetchClaims(cfg, token.accessToken, token.idToken)
    const identity = extractIdentity(claims)
    if (!identity) return failUrl('شناسه یکتای کاربر (sub) در پاسخ سامانه هویتی یافت نشد.')

    const resolved = await resolveSsoUser(identity, cfg)
    if (!resolved.ok) return failUrl(resolved.message)

    const user = await db.user.findUnique({ where: { id: resolved.userId } })
    if (!user) return failUrl('حساب کاربری یافت نشد.')

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const sessionToken = await createSession(user.id)
    await logAudit(null, 'ورود سازمانی (SSO)', `«${user.name}» از طریق سامانه هویتی سازمان وارد شد (بخش ۲۹ سند)`, user.name)

    const res = NextResponse.redirect(new URL('/', req.url))
    const c = sessionCookie(sessionToken)
    res.cookies.set(c.name, c.value, c.options)
    res.cookies.set(SSO_STATE_COOKIE, '', { path: '/', maxAge: 0 })
    return res
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطای ناشناخته در ورود سازمانی'
    return failUrl(message)
  }
}
