'use client'

// ورود به سامانه — بخش ۲۹ سند (احراز هویت امن)
// اگر سامانه هنوز کاربری نداشته باشد، نخستین کاربر به‌عنوان مدیر سامانه راه‌اندازی می‌شود
// ورود یکپارچه سازمانی (SSO) و گام دوم احراز هویت چندمرحله‌ای (MFA) نیز در همین نما است

import { useState, useEffect } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollText, LogIn, ShieldCheck, KeyRound, Building2 } from 'lucide-react'

export interface AppUser {
  id: string
  username: string
  name: string
  role: string
  roleLabel?: string
}

export default function LoginView({ onLoggedIn }: { onLoggedIn: (u: AppUser) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [firstRun, setFirstRun] = useState(false)
  // گام دوم احراز هویت چندمرحله‌ای — بخش ۲۹ سند
  const [mfaTicket, setMfaTicket] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  // ورود سازمانی
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const [samlEnabled, setSamlEnabled] = useState(false)
  const [ssoError, setSsoError] = useState('')

  useEffect(() => {
    // وضعیت SSO عمومی است — فقط برای نمایش دکمه
    api.get<{ enabled: boolean }>('/api/auth/sso/status')
      .then(r => setSsoEnabled(r.enabled))
      .catch(() => undefined)
    // وضعیت SAML — بخش ۲۹ سند
    api.get<{ enabled: boolean }>('/api/auth/saml/status')
      .then(r => setSamlEnabled(r.enabled))
      .catch(() => undefined)
    // پیام خطای بازگشتی از callback سازمانی
    const params = new URLSearchParams(window.location.search)
    const err = params.get('ssoError') ?? params.get('samlError')
    if (err) setSsoError(err)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body: Record<string, string> = { username, password }
      if (name.trim()) body.name = name.trim()
      const res = await api.post<{ user?: AppUser; message?: string; mfaRequired?: boolean; ticket?: string }>('/api/auth/login', body)
      if (res.mfaRequired && res.ticket) {
        // گام دوم: کد TOTP — بخش ۲۹ سند (نقش‌های حساس)
        setMfaTicket(res.ticket)
        setError('')
        return
      }
      if (res.user) onLoggedIn(res.user)
      else setError(res.message ?? 'پاسخ ورود نامعتبر بود.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg)
      if (msg.includes('راه‌اندازی اولیه')) setFirstRun(true)
    } finally {
      setBusy(false)
    }
  }

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api.post<{ user: AppUser }>('/api/auth/mfa/verify', { ticket: mfaTicket, code: mfaCode })
      onLoggedIn(res.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'کد تأیید نادرست است.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto">
              <ScrollText className="size-6" />
            </div>
            <h1 className="font-bold text-lg">سکوی هوشمند آماده‌سازی داده، مدل‌سازی و گزارش‌سازی</h1>
            <p className="text-xs text-muted-foreground">ورود امن به سامانه — کنترل دسترسی مبتنی بر نقش (بخش ۲۹ سند)</p>
          </div>

          {ssoError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2.5 leading-5">{ssoError}</p>
          )}

          {mfaTicket ? (
            /* گام دوم — کد دوعاملی */
            <form onSubmit={verifyMfa} className="space-y-3">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
                <KeyRound className="size-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-medium">احراز هویت چندمرحله‌ای</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    کد شش‌رقمی اپلیکیشن احرازکننده (Google Authenticator و مشابه) را وارد کنید.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">کد تأیید (۶ رقم)</Label>
                <Input
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  className="h-10 text-center text-lg tracking-[0.5em] font-mono"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              {error && <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2.5 leading-5">{error}</p>}
              <Button type="submit" className="w-full gap-2" disabled={busy || mfaCode.length < 6}>
                <ShieldCheck className="size-4" /> {busy ? 'در حال تأیید…' : 'تأیید و ورود'}
              </Button>
              <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => { setMfaTicket(null); setMfaCode(''); setError('') }}>
                بازگشت به ورود با گذرواژه
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">نام کاربری</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} dir="ltr" className="h-9" autoComplete="username" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">گذرواژه</Label>
                  <Input value={password} onChange={e => setPassword(e.target.value)} type="password" dir="ltr" className="h-9" autoComplete="current-password" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    نام و نام خانوادگی
                    <Badge variant="outline" className="ms-2 text-[9px]">فقط راه‌اندازی اولیه</Badge>
                  </Label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="h-9" placeholder="اگر سامانه تازه راه‌اندازی می‌شود پر کنید" />
                </div>

                {error && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2.5 leading-5">{error}</p>
                )}

                <Button type="submit" className="w-full gap-2" disabled={busy || !username || !password}>
                  <LogIn className="size-4" /> {busy ? 'در حال ورود…' : 'ورود به سامانه'}
                </Button>
              </form>

              {/* ورود یکپارچه سازمانی — بخش ۲۹ سند */}
              {ssoEnabled && (
                <>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="h-px flex-1 bg-border" /> یا <div className="h-px flex-1 bg-border" />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => { window.location.href = '/api/auth/sso/start' }}
                  >
                    <Building2 className="size-4" /> ورود با حساب سازمانی (SSO)
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    احراز هویت از طریق سامانه هویتی سازمان (OIDC) انجام می‌شود — بخش ۲۹ سند
                  </p>
                </>
              )}

              {/* ورود سازمانی SAML 2.0 — بخش ۲۹ سند */}
              {samlEnabled && (
                <>
                  {!ssoEnabled && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="h-px flex-1 bg-border" /> یا <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => { window.location.href = '/api/auth/saml/login' }}
                  >
                    <Building2 className="size-4" /> ورود با حساب سازمانی (SAML)
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    احراز هویت از طریق سامانه هویتی سازمان با استاندارد SAML 2.0 انجام می‌شود — بخش ۲۹ سند
                  </p>
                </>
              )}

              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-[11px] font-medium flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> راهنمای راه‌اندازی اولیه</p>
                <p className="text-[10px] text-muted-foreground leading-5">
                  نخستین کاربری که با تکمیل «نام و نام خانوادگی» وارد شود، مدیر سامانه خواهد بود و می‌تواند سایر نقش‌ها
                  (مدیر داده، تحلیلگر، مشاهده‌کننده، ناظر) را از برگه «مدیریت» ایجاد کند.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
