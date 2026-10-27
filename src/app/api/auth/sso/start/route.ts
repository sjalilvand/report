// شروع جریان ورود یکپارچه سازمانی — بخش ۲۹ سند
// هدایت کاربر به سامانه هویتی سازمان (OIDC Authorization Code) با محافظت state

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { resolveSsoConfig, buildAuthorizeUrl, SSO_STATE_COOKIE } from '@/lib/sso'
import { logAudit } from '@/lib/server'

export async function GET(req: NextRequest) {
  const cfg = await resolveSsoConfig()
  if (!cfg) {
    return NextResponse.redirect(new URL('/?ssoError=' + encodeURIComponent('ورود سازمانی فعال نیست؛ با مدیر سامانه تماس بگیرید.'), req.url))
  }
  const state = randomBytes(16).toString('hex')
  // آدرس بازگشت از مبدأ واقعی درخواست ساخته می‌شود — سازگار با دسترسی LAN و دامنه سازمانی
  const origin = req.headers.get('origin') ?? req.nextUrl.origin
  const redirectUri = `${origin}/api/auth/sso/callback`
  const authorize = buildAuthorizeUrl(cfg, redirectUri, state)

  await logAudit(null, 'شروع ورود سازمانی (SSO)', 'هدایت به سامانه هویتی سازمان — بخش ۲۹ سند').catch(() => undefined)
  const res = NextResponse.redirect(authorize)
  res.cookies.set(SSO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // در استقرار سازمانی با TLS فعال شود — بخش ۲۹
    path: '/',
    maxAge: 600, // ده دقیقه
  })
  return res
}
