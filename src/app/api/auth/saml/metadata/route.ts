// SP Metadata برای ثبت سامانه در IdP سازمان — بخش ۲۹ سند
// این XML را در سامانه هویتی (ADFS / Entra / Okta / Keycloak / ...) به‌عنوان Relying Party ثبت کنید

import { NextRequest } from 'next/server'
import { buildSamlMetadata } from '@/lib/saml'

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') ?? req.nextUrl.origin
  const xml = await buildSamlMetadata(origin)
  if (!xml) {
    return new Response('ورود سازمانی SAML فعال نیست یا پیکربندی ناقص است.', { status: 404 })
  }
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
