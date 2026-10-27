'use client'

// ورود به سامانه — بخش ۲۹ سند (احراز هویت امن)
// اگر سامانه هنوز کاربری نداشته باشد، نخستین کاربر به‌عنوان مدیر سامانه راه‌اندازی می‌شود

import { useState } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollText, LogIn, ShieldCheck } from 'lucide-react'

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body: Record<string, string> = { username, password }
      if (name.trim()) body.name = name.trim()
      const res = await api.post<{ user: AppUser; message?: string }>('/api/auth/login', body)
      onLoggedIn(res.user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg)
      if (msg.includes('راه‌اندازی اولیه')) setFirstRun(true)
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

          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
            <p className="text-[11px] font-medium flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> راهنمای راه‌اندازی اولیه</p>
            <p className="text-[10px] text-muted-foreground leading-5">
              نخستین کاربری که با تکمیل «نام و نام خانوادگی» وارد شود، مدیر سامانه خواهد بود و می‌تواند سایر نقش‌ها
              (مدیر داده، تحلیلگر، مشاهده‌کننده، ناظر) را از برگه «مدیریت» ایجاد کند.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
