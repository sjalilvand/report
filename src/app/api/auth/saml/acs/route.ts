// بازگشت از سامانه هویتی سازمان (Assertion Consumer Service) — بخش ۲۹ سند
// اعتبارسنجی امضای XML پاسخ با گواهی IdP، استخراج هویت، یافتن/ساخت کاربر و صدور نشست

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/server'
import { createSession, sessionCookie } from '@/lib/auth'
import { resolveSsoUser } from '@/lib/sso'
import { validateSamlResponse, resolveSamlConfig, SAML_ERROR_PARAM } from '@/lib/saml'
import { getSettings } from '@/lib/settings'

export async function POST(req: NextRequest) {
  const failUrl = (message: string) =>
    NextResponse.redirect(new URL(`/?${SAML_ERROR_PARAM}=` + encodeURIComponent(message), req.url))
  try {
    const origin = req.headers.get('origin') ?? req.nextUrl.origin
    const cfg = await resolveSamlConfig(origin)
    if (!cfg) return failUrl('ورود سازمانی SAML فعال نیست؛ با مدیر سامانه تماس بگیرید.')

    // پاسخ IdP همیشه form-urlencoded با فیلد SAMLResponse است
    const raw = await req.text()
    const params = new URLSearchParams(raw)
    const samlResponse = params.get('SAMLResponse')
    const relayState = params.get('RelayState') || '/'
    if (!samlResponse) return failUrl('پاسخ سامانه هویتی (SAMLResponse) دریافت نشد.')

    // اعتبارسنجی امضا + استخراج هویت — پاسخ بی‌امضا یا دستکاری‌شده اینجا رد می‌شود
    const result = await validateSamlResponse(origin, samlResponse)

    const settings = await getSettings()
    const resolved = await resolveSsoUser(result.identity, {
      autoProvision: settings.samlAutoProvision,
      defaultRole: settings.samlDefaultRole || 'viewer',
      allowedDomain: settings.samlAllowedDomain.trim().toLowerCase(),
    })
    if (!resolved.ok) return failUrl(resolved.message)

    const user = await db.user.findUnique({ where: { id: resolved.userId } })
    if (!user) return failUrl('حساب کاربری یافت نشد.')

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const sessionToken = await createSession(user.id)
    await logAudit(null, 'ورود سازمانی (SAML)', `«${user.name}» از طریق سامانه هویتی SAML سازمان وارد شد (بخش ۲۹ سند)`, user.name)

    const res = NextResponse.redirect(new URL(relayState.startsWith('/') ? relayState : '/', req.url))
    const c = sessionCookie(sessionToken)
    res.cookies.set(c.name, c.value, c.options)
    return res
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطای ناشناخته در ورود سازمانی SAML'
    return failUrl(message)
  }
}
