'use client'

// امنیت حساب کاربری — بخش ۲۹ سند (احراز هویت چندمرحله‌ای برای نقش‌های حساس)
// فعال‌سازی MFA با QR و کلید دستی، غیرفعال‌سازی با تأیید کد

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { KeyRound, ShieldCheck, ShieldOff, Building2 } from 'lucide-react'

export interface AccountInfo {
  id: string
  username: string
  name: string
  role: string
  roleLabel?: string
  mfaEnabled?: boolean
  hasSso?: boolean
  mfaAdvised?: boolean
}

interface SetupResponse {
  secret: string
  otpauth: string
  qr: string
  message: string
}

export default function AccountSecurity({ user, onChanged }: { user: AccountInfo; onChanged?: (u: AccountInfo) => void }) {
  const { toast } = useToast()
  const [setup, setSetup] = useState<SetupResponse | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled ?? false)

  useEffect(() => { setMfaEnabled(user.mfaEnabled ?? false) }, [user.mfaEnabled])

  const refreshMe = useCallback(async () => {
    try {
      const res = await api.get<{ user: AccountInfo }>('/api/auth/me')
      if (res.user) {
        setMfaEnabled(!!res.user.mfaEnabled)
        onChanged?.(res.user)
      }
    } catch { /* بی‌صدا */ }
  }, [onChanged])

  const startSetup = async () => {
    setBusy(true)
    try {
      const res = await api.post<SetupResponse>('/api/auth/mfa/setup', {})
      setSetup(res)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const enable = async () => {
    setBusy(true)
    try {
      await api.post('/api/auth/mfa/enable', { code })
      toast({ title: 'احراز هویت چندمرحله‌ای فعال شد', description: 'از ورود بعدی، کد اپلیکیشن احرازکننده لازم است (بخش ۲۹ سند).' })
      setSetup(null)
      setCode('')
      await refreshMe()
    } catch (e) {
      toast({ title: 'تأیید ناموفق', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await api.post('/api/auth/mfa/disable', { code })
      toast({ title: 'احراز هویت چندمرحله‌ای غیرفعال شد' })
      setCode('')
      await refreshMe()
    } catch (e) {
      toast({ title: 'تأیید ناموفق', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> امنیت حساب شما</CardTitle>
            <CardDescription>احراز هویت چندمرحله‌ای (MFA) با اپلیکیشن احرازکننده — بخش ۲۹ سند (نقش‌های حساس)</CardDescription>
          </div>
          <div className="flex gap-1.5">
            <Badge variant={mfaEnabled ? 'default' : 'outline'} className="text-[10px] gap-1">
              <KeyRound className="size-3" /> {mfaEnabled ? 'MFA فعال' : 'MFA غیرفعال'}
            </Badge>
            {user.hasSso && <Badge variant="secondary" className="text-[10px] gap-1"><Building2 className="size-3" /> حساب سازمانی</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {user.mfaAdvised && !mfaEnabled && (
          <p className="text-xs bg-amber-500/10 text-amber-700 rounded-md p-2.5 leading-5">
            نقش «{user.roleLabel ?? user.role}» در فهرست نقش‌های حساس است؛ فعال‌سازی احراز هویت چندمرحله‌ای توصیه می‌شود.
          </p>
        )}
        {mfaEnabled ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground leading-5">
              حساب شما با لایه دوم حفاظت (کد TOTP) محافظت می‌شود. برای غیرفعال‌سازی، کد فعلی اپلیکیشن را وارد کنید.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">کد تأیید فعلی</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} dir="ltr" inputMode="numeric" maxLength={6} className="h-8 w-32 text-center font-mono" />
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-destructive" disabled={busy || code.length < 6} onClick={disable}>
                <ShieldOff className="size-3.5" /> غیرفعال‌سازی
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground leading-5">
              با فعال‌سازی، در ورود به سامانه علاوه بر گذرواژه، کد شش‌رقمی اپلیکیشن احرازکننده (Google Authenticator، Microsoft Authenticator، Aegis و ...) نیز لازم می‌شود.
            </p>
            <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={busy} onClick={startSetup}>
              <ShieldCheck className="size-3.5" /> فعال‌سازی MFA
            </Button>
          </div>
        )}
      </CardContent>

      {/* گفت‌وگوی راه‌اندازی با QR */}
      <Dialog open={!!setup} onOpenChange={v => { if (!v) { setSetup(null); setCode('') } }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm">راه‌اندازی احراز هویت چندمرحله‌ای</DialogTitle>
          </DialogHeader>
          {setup && (
            <div className="space-y-3">
              <div className="flex justify-center">
                {/* تصویر QR تولیدشده سمت سرور (data URL) */}
                <img src={setup.qr} alt="QR احرازکننده" className="rounded-lg border p-1.5 size-52" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  در اپلیکیشن احرازکننده اسکن کنید یا کلید را دستی وارد کنید:
                </p>
                <code dir="ltr" className="block text-center text-sm font-mono bg-muted rounded-md p-2 tracking-widest select-all">{setup.secret}</code>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">کد شش‌رقمی نمایش‌داده‌شده در اپلیکیشن</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} dir="ltr" inputMode="numeric" maxLength={6} className="h-9 text-center font-mono tracking-[0.4em]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setSetup(null); setCode('') }}>انصراف</Button>
            <Button size="sm" onClick={enable} disabled={busy || code.length < 6}>تأیید و فعال‌سازی</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
