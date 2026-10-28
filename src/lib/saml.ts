// ورود یکپارچه سازمانی با SAML 2.0 — بخش ۲۹ سند («امکان اتصال به ورود یکپارچه سازمانی»)
// مکمل OIDC موجود: همین سیاست‌ها (ساخت خودکار حساب، نقش پیش‌فرض، محدودیت دامنه) با resolveSsoUser اعمال می‌شود.
// سازگار با ADFS، Azure AD/Entra، Okta، Keycloak، Shibboleth و هر IdP استاندارد SAML 2.0.
// جریان: SP-initiated Redirect Binding برای درخواست + POST Binding برای پاسخ (ACS) + SP Metadata برای ثبت در IdP

import { SAML, ValidateInResponseTo } from '@node-saml/node-saml'
import { getSettings } from './settings'
import type { SsoIdentity } from './sso'

export const SAML_ERROR_PARAM = 'samlError'

export interface SamlPlatformConfig {
  entryPoint: string      // آدرس Single Sign-On سامانه هویتی
  idpCert: string         // گواهی X.509 عمومی IdP (PEM یا بدنه base64)
  issuer: string          // EntityID سمت SP — به‌طور پیش‌فرض آدرس metadata همین سامانه
  idpEntityId: string     // اختیاری — اعتبارسنجی صادرکننده پاسخ
}

const g = globalThis as unknown as { __samlClient?: { key: string; client: SAML } }

/** نرمال‌سازی گواهی — با یا بدون سطرهای BEGIN/END پذیرفته می‌شود */
function normalizeCert(raw: string): string {
  const body = raw
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '')
  return body
}

/** خواندن و اعتبارسنجی پیکربندی SAML از تنظیمات — غیرفعال یا ناقص → null */
export async function resolveSamlConfig(origin: string): Promise<SamlPlatformConfig | null> {
  const s = await getSettings()
  if (!s.samlEnabled) return null
  const entryPoint = s.samlIdpSsoUrl.trim()
  const idpCert = normalizeCert(s.samlIdpCert)
  if (!entryPoint || !idpCert) return null
  const issuer = s.samlIssuer.trim() || `${origin.replace(/\/+$/, '')}/api/auth/saml/metadata`
  return {
    entryPoint,
    idpCert,
    issuer,
    idpEntityId: s.samlIdpEntityId.trim(),
  }
}

/** ساخت کلاینت SAML — یکتا در سطح فرایند و بازساخته در صورت تغییر پیکربندی */
async function getSamlClient(origin: string): Promise<SAML | null> {
  const cfg = await resolveSamlConfig(origin)
  if (!cfg) return null
  const key = JSON.stringify(cfg)
  if (g.__samlClient?.key === key) return g.__samlClient.client
  const client = new SAML({
    entryPoint: cfg.entryPoint,
    issuer: cfg.issuer,
    callbackUrl: `${origin.replace(/\/+$/, '')}/api/auth/saml/acs`,
    idpCert: cfg.idpCert,
    idpIssuer: cfg.idpEntityId || undefined,
    audience: cfg.issuer,
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
    wantAssertionsSigned: true,
    signatureAlgorithm: 'sha256',
    validateInResponseTo: ValidateInResponseTo.never, // جریان IdP-initiated نیز پشتیبانی می‌شود
  })
  g.__samlClient = { key, client }
  return client
}

/** آدرس ورود IdP برای هدایت کاربر (Redirect Binding) */
export async function buildSamlLoginUrl(origin: string, relayState: string): Promise<string | null> {
  const client = await getSamlClient(origin)
  if (!client) return null
  return client.getAuthorizeUrlAsync(relayState, undefined)
}

/** SP Metadata XML برای ثبت سامانه در IdP سازمان */
export async function buildSamlMetadata(origin: string): Promise<string | null> {
  const client = await getSamlClient(origin)
  if (!client) return null
  return client.generateServiceProviderMetadata(null)
}

/** استخراج ایمیل و نام از ویژگی‌های رایج IdPها (AD FS، Entra، Okta، Keycloak، ...) */
function pickAttribute(profile: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = profile[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim()
  }
  return ''
}

/** تبدیل Profile استاندارد node-saml به هویت یکپارچه سامانه */
export function extractSamlIdentity(profile: Record<string, unknown>): SsoIdentity | null {
  const nameID = String(profile.nameID ?? '').trim()
  if (!nameID) return null
  const email = (
    pickAttribute(profile, [
      'email', 'mail',
      'urn:oid:0.9.2342.19200300.100.1.3',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      'http://schemas.auth0.com/email',
    ]) || nameID
  ).toLowerCase()
  const name = pickAttribute(profile, [
    'displayName', 'cn', 'name',
    'urn:oid:2.5.4.3',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  ]) || email || nameID
  return { sub: nameID, email, name }
}

export interface SamlValidateResult {
  ok: true
  identity: SsoIdentity
}

/** اعتبارسنجی پاسخ POST IdP — امضای XML با گواهی IdP بررسی می‌شود؛ پاسخ نامعتبر خطا می‌دهد */
export async function validateSamlResponse(origin: string, samlResponse: string): Promise<SamlValidateResult> {
  const client = await getSamlClient(origin)
  if (!client) throw new Error('ورود سازمانی SAML فعال نیست؛ با مدیر سامانه تماس بگیرید.')
  const result = await client.validatePostResponseAsync({ SAMLResponse: samlResponse })
  if (!result || result.loggedOut || !result.profile) {
    throw new Error('پاسخ سامانه هویتی معتبر شناخته نشد.')
  }
  const identity = extractSamlIdentity(result.profile as unknown as Record<string, unknown>)
  if (!identity) {
    throw new Error('شناسه یکتای کاربر (NameID) در پاسخ سامانه هویتی یافت نشد.')
  }
  return { ok: true, identity }
}
