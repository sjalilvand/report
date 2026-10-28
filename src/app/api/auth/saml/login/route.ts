// شروع جریان ورود سازمانی SAML — بخش ۲۹ سند
// هدایت کاربر به سامانه هویتی سازمان با Redirect Binding

import { NextRequest, NextResponse } from 'next/server'
import { buildSamlLoginUrl, SAML_ERROR_PARAM } from '@/lib/saml'
import { logAudit } from '@/lib/server'

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') ?? req.nextUrl.origin
  const failUrl = (message: string) =>
    NextResponse.redirect(new URL(`/?${SAML_ERROR_PARAM}=` + encodeURIComponent(message), req.url))
  try {
    const url = await buildSamlLoginUrl(origin, '/')
    if (!url) {
      return failUrl('ورود سازمانی SAML فعال نیست یا پیکربندی ناقص است؛ با مدیر سامانه تماس بگیرید.')
    }
    await logAudit(null, 'شروع ورود سازمانی (SAML)', 'هدایت به سامانه هویتی سازمان — بخش ۲۹ سند').catch(() => undefined)
    return NextResponse.redirect(url)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطای ناشناخته در شروع ورود سازمانی'
    return failUrl(message)
  }
}
