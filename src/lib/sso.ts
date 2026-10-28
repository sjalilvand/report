// ورود یکپارچه سازمانی (SSO) با OIDC/OAuth2 — بخش ۲۹ سند
// «امکان اتصال به ورود یکپارچه سازمانی» — جریان Authorization Code سمت سرور
// سازگار با هر ارائه‌دهنده استاندارد: Keycloak، Azure AD/Entra، Google Workspace، Nextcloud، ...
// کشف خودکار نقاط انتها از طریق /.well-known/openid-configuration (در صورت ذخیره Issuer)

import { db } from './db'
import { getSettings } from './settings'

export const SSO_STATE_COOKIE = 'sso_state'

export interface SsoEndpoints {
  authorizeUrl: string
  tokenUrl: string
  userinfoUrl: string // می‌تواند خالی باشد — در این صورت از id_token رمزگشایی می‌شود
}

export interface SsoConfig extends SsoEndpoints {
  clientId: string
  clientSecret: string
  scopes: string
  autoProvision: boolean
  defaultRole: string
  allowedDomain: string // خالی = بدون محدودیت دامنه ایمیل
}

interface DiscoveryCache {
  at: number
  endpoints: SsoEndpoints
}

const g = globalThis as unknown as { __ssoDiscovery?: DiscoveryCache }
const DISCOVERY_TTL_MS = 60 * 60 * 1000 // یک ساعت

/** خواندن پیکربندی SSO از تنظیمات + کشف نقاط انتها در صورت نیاز؛ غیرفعال یا ناقص → null */
export async function resolveSsoConfig(): Promise<SsoConfig | null> {
  const s = await getSettings()
  if (!s.ssoEnabled) return null
  const cfg: SsoConfig = {
    clientId: s.ssoClientId,
    clientSecret: s.ssoClientSecret,
    scopes: s.ssoScopes || 'openid profile email',
    autoProvision: s.ssoAutoProvision,
    defaultRole: s.ssoDefaultRole || 'viewer',
    allowedDomain: s.ssoAllowedDomain.trim().toLowerCase(),
    authorizeUrl: s.ssoAuthorizeUrl.trim(),
    tokenUrl: s.ssoTokenUrl.trim(),
    userinfoUrl: s.ssoUserinfoUrl.trim(),
  }
  if (!cfg.clientId || !cfg.clientSecret) return null
  // اگر نقاط انتهای صریح نیست، از issuer کشف کن (سرویس‌های استاندارد OIDC)
  if (!cfg.authorizeUrl || !cfg.tokenUrl) {
    const discovered = await discoverEndpoints(s.ssoIssuer.trim())
    if (!discovered) return null
    cfg.authorizeUrl = cfg.authorizeUrl || discovered.authorizeUrl
    cfg.tokenUrl = cfg.tokenUrl || discovered.tokenUrl
    cfg.userinfoUrl = cfg.userinfoUrl || discovered.userinfoUrl
  }
  if (!cfg.authorizeUrl || !cfg.tokenUrl) return null
  return cfg
}

/** کشف نقاط انتهای OIDC از /.well-known/openid-configuration با کش یک‌ساعته */
async function discoverEndpoints(issuer: string): Promise<SsoEndpoints | null> {
  if (!issuer) return null
  const cached = g.__ssoDiscovery
  if (cached && Date.now() - cached.at < DISCOVERY_TTL_MS) return cached.endpoints
  try {
    const url = issuer.replace(/\/+$/, '') + '/.well-known/openid-configuration'
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const doc = (await res.json()) as { authorization_endpoint?: string; token_endpoint?: string; userinfo_endpoint?: string }
    if (!doc.authorization_endpoint || !doc.token_endpoint) return null
    const endpoints: SsoEndpoints = {
      authorizeUrl: doc.authorization_endpoint,
      tokenUrl: doc.token_endpoint,
      userinfoUrl: doc.userinfo_endpoint ?? '',
    }
    g.__ssoDiscovery = { at: Date.now(), endpoints }
    return endpoints
  } catch {
    return null
  }
}

/** ساخت آدرس authorize برای هدایت کاربر به سامانه هویتی سازمان */
export function buildAuthorizeUrl(cfg: SsoConfig, redirectUri: string, state: string): string {
  const u = new URL(cfg.authorizeUrl)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', cfg.clientId)
  u.searchParams.set('redirect_uri', redirectUri)
  u.searchParams.set('scope', cfg.scopes)
  u.searchParams.set('state', state)
  return u.toString()
}

/** تبادل کد با توکن — POST استاندارد x-www-form-urlencoded */
export async function exchangeCode(cfg: SsoConfig, code: string, redirectUri: string): Promise<{ accessToken?: string; idToken?: string }> {
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`سامانه هویتی تبادل توکن را نپذیرفت (کد ${res.status}). ${text.slice(0, 200)}`)
  }
  const token = (await res.json()) as { access_token?: string; id_token?: string }
  return { accessToken: token.access_token, idToken: token.id_token }
}

/** رمزگشایی payload ی id_token (بدون اعتبارسنجی امضا — امضا سمت ارائه‌دهنده بررسی می‌شود و توکن مستقیماً از endpoint رسمی گرفته شده است) */
function decodeIdToken(idToken: string): Record<string, unknown> {
  try {
    const part = idToken.split('.')[1]
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** استخراج مشخصات کاربر از userinfo یا id_token */
export async function fetchClaims(cfg: SsoConfig, accessToken?: string, idToken?: string): Promise<Record<string, unknown>> {
  if (cfg.userinfoUrl && accessToken) {
    const res = await fetch(cfg.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) {
      const info = (await res.json()) as Record<string, unknown>
      // ترکیب: فیلدهای id_token که در userinfo نیستند حفظ شوند
      return { ...decodeIdToken(idToken ?? ''), ...info }
    }
  }
  return decodeIdToken(idToken ?? '')
}

export interface SsoIdentity {
  sub: string
  email: string
  name: string
}

/** استخراج هویت یکتا از claims — sub الزامی است */
export function extractIdentity(claims: Record<string, unknown>): SsoIdentity | null {
  const sub = String(claims.sub ?? '').trim()
  if (!sub) return null
  const email = String(claims.email ?? claims.preferred_username ?? claims.upn ?? '').trim().toLowerCase()
  const name = String(claims.name ?? claims.given_name ?? email ?? sub).trim() || sub
  return { sub, email, name }
}

/** یافتن یا ساخت کاربر متناظر — اتصال حساب موجود با ssoSubject یا ساخت خودکار بر اساس سیاست
 *  سیاست مشترک SSO/OIDC و SAML — بخش ۲۹ سند */
export async function resolveSsoUser(
  identity: SsoIdentity,
  cfg: Pick<SsoConfig, 'autoProvision' | 'defaultRole' | 'allowedDomain'>
): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  // محدودیت دامنه ایمیل — بخش ۲۹ (کنترل دسترسی)
  if (cfg.allowedDomain) {
    const domain = identity.email.split('@')[1] ?? ''
    if (!domain.endsWith(cfg.allowedDomain)) {
      return { ok: false, message: `ورود سازمانی فقط برای دامنه «${cfg.allowedDomain}» مجاز است.` }
    }
  }

  // ۱) اتصال قبلی با شناسه یکتای سامانه هویتی
  const bySubject = await db.user.findUnique({ where: { ssoSubject: identity.sub } })
  if (bySubject) {
    if (!bySubject.active) return { ok: false, message: 'حساب کاربری شما غیرفعال شده است؛ با مدیر سامانه تماس بگیرید.' }
    return { ok: true, userId: bySubject.id }
  }

  // ۲) حساب محلی با همان نام کاربری (ایمیل) — پیوند داده می‌شود
  if (identity.email) {
    const byUsername = await db.user.findUnique({ where: { username: identity.email } })
    if (byUsername) {
      if (!byUsername.active) return { ok: false, message: 'حساب کاربری شما غیرفعال شده است؛ با مدیر سامانه تماس بگیرید.' }
      await db.user.update({ where: { id: byUsername.id }, data: { ssoSubject: identity.sub } })
      return { ok: true, userId: byUsername.id }
    }
  }

  // ۳) ساخت خودکار حساب — فقط با فعال‌بودن سیاست
  if (!cfg.autoProvision || !identity.email) {
    return { ok: false, message: 'حساب متناظر با حساب سازمانی شما در سامانه یافت نشد؛ با مدیر سامانه تماس بگیرید.' }
  }
  const created = await db.user.create({
    data: {
      username: identity.email,
      name: identity.name,
      // گذرواژه تصادفی غیرقابل حدس — ورود محلی عملاً بسته است؛ احراز هویت از طریق SSO انجام می‌شود
      passwordHash: 'sso:' + identity.sub + ':' + Math.random().toString(36).slice(2),
      role: cfg.defaultRole,
      ssoSubject: identity.sub,
    },
  })
  return { ok: true, userId: created.id }
}
