'use client'

// مدیریت سامانه — بخش ۲۹ (کنترل دسترسی، کاربران و نقش‌ها) و بخش ۳۰.۱/۳۶ (ظرفیت)
// سه بخش: کاربران و قواعد سطری، تنظیمات ظرفیت، ثبت رویدادها

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { formatNumber } from '@/lib/currency'
import { toPersianDigits } from '@/lib/digits'
import {
  Users2, Settings2, ScrollText, Plus, ShieldCheck, ShieldOff, Trash2, KeyRound, Rows3, BellRing, Send, ListTodo, KeySquare,
} from 'lucide-react'

interface UserRow {
  id: string; username: string; name: string; role: string; roleLabel: string
  active: boolean; lastLoginAt?: string | null; rowRules: RowRuleDTO[]
  mfaEnabled?: boolean; ssoSubject?: string | null
}
interface RowRuleDTO { datasetId: string; fieldId: string; op: string; value?: string; values?: string[] }
interface SettingsRow { settings: Record<string, string | number | boolean>; labels: Record<string, string> }

// تنظیمات چندگزینه‌ای — گزینه‌های مجاز (بخش ۱۳.۲ سند: روش صدک، نوع انحراف معیار، رفتار خالی)
const SETTING_ENUMS: Record<string, { value: string; label: string }[]> = {
  statPercentileMethod: [
    { value: 'linear', label: 'درون‌یابی خطی (R-7)' },
    { value: 'nearest', label: 'نزدیک‌ترین رتبه' },
  ],
  statStdDevDefault: [
    { value: 'sample', label: 'نمونه‌ای (n−۱)' },
    { value: 'population', label: 'جامع (n)' },
  ],
  statNullBehavior: [
    { value: 'exclude', label: 'کنار گذاشتن مقادیر خالی' },
    { value: 'zero', label: 'صفر فرض کردن' },
  ],
}
interface SchedulerStatus { running: boolean; intervalMinutes: number; startedAt: string | null; lastRunAt: string | null; lastRunProjects: number; lastRunEvaluated: number; lastRunCreated: number; lastEmailSent: boolean; lastConnSync?: number; lastConnSyncFailed?: number; lastError: string | null }
interface HealthStatus { status: string; uptimeSec: number; checks: { database: { status: string }; scheduler: { running: boolean; lastRunAt: string | null }; queue: { running: number; queued: number; lastFinishedAt: string | null; lastError: string | null } } }
interface AuditRow { id: string; action: string; detail?: string | null; actor?: string | null; createdAt: string; projectId?: string | null }
interface DatasetLite { id: string; name: string; fields: string }

const ROLE_OPTIONS = [
  { value: 'admin', label: 'مدیر سامانه' },
  { value: 'steward', label: 'مدیر داده' },
  { value: 'analyst', label: 'تحلیلگر' },
  { value: 'viewer', label: 'مشاهده‌کننده' },
  { value: 'auditor', label: 'ناظر / حسابرس' },
]

const ROLE_DESC: Record<string, string> = {
  admin: 'دسترسی کامل: کاربران، پیکربندی، تأیید و انتشار',
  steward: 'بارگذاری و آماده‌سازی داده، تأیید گزارش',
  analyst: 'ساخت مجموعه‌داده، مدل و گزارش؛ ارسال برای تأیید',
  viewer: 'مشاهده گزارش‌های منتشرشده',
  auditor: 'مشاهده داده‌ها و ثبت رویدادها (بدون تغییر)',
}

export default function AdminView({ canManageUsers, canManageSettings, canViewAudit }: {
  canManageUsers: boolean
  canManageSettings: boolean
  canViewAudit: boolean
}) {
  const { toast } = useToast()
  const [tab, setTab] = useState(canManageUsers ? 'users' : canManageSettings ? 'settings' : 'audit')
  const [users, setUsers] = useState<UserRow[]>([])
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [datasets, setDatasets] = useState<DatasetLite[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [rulesUser, setRulesUser] = useState<UserRow | null>(null)
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)

  // فرم ایجاد کاربر
  const [fName, setFName] = useState('')
  const [fUsername, setFUsername] = useState('')
  const [fPassword, setFPassword] = useState('')
  const [fRole, setFRole] = useState('viewer')

  const loadUsers = useCallback(async () => {
    try { setUsers(await api.get<UserRow[]>('/api/users')) } catch { /* بی‌صدا */ }
  }, [])
  const loadSettings = useCallback(async () => {
    try { setSettings(await api.get<SettingsRow>('/api/settings')) } catch { /* بی‌صدا */ }
    try { const r = await api.get<{ scheduler: SchedulerStatus }>('/api/settings/scheduler'); setScheduler(r.scheduler) } catch { /* بی‌صدا */ }
    try { setHealth(await api.get<HealthStatus>('/api/health')) } catch { /* بی‌صدا */ }
  }, [])
  const loadAudit = useCallback(async () => {
    try { setAudit(await api.get<AuditRow[]>('/api/audit')) } catch { /* بی‌صدا */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const results = await Promise.allSettled([
        api.get<UserRow[]>('/api/users'),
        api.get<SettingsRow>('/api/settings'),
        api.get<AuditRow[]>('/api/audit'),
        api.get<{ id: string; name: string }[]>('/api/projects'),
      ])
      if (cancelled) return
      if (results[0].status === 'fulfilled') setUsers(results[0].value)
      if (results[1].status === 'fulfilled') setSettings(results[1].value)
      if (results[2].status === 'fulfilled') setAudit(results[2].value)
      if (results[3].status === 'fulfilled') setProjects(results[3].value)
    }
    run()
    return () => { cancelled = true }
  }, [])

  const loadProjectDatasets = async (projectId: string) => {
    try {
      setDatasets(await api.get<DatasetLite[]>(`/api/datasets?projectId=${projectId}`))
    } catch { setDatasets([]) }
  }

  const createUser = async () => {
    try {
      await api.post('/api/users', { name: fName, username: fUsername, password: fPassword, role: fRole })
      toast({ title: 'کاربر ایجاد شد', description: `${fName} با نقش ${ROLE_OPTIONS.find(r => r.value === fRole)?.label}` })
      setCreateOpen(false)
      setFName(''); setFUsername(''); setFPassword(''); setFRole('viewer')
      await loadUsers()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const patchUser = async (id: string, data: Record<string, unknown>, desc: string) => {
    try {
      await api.patch(`/api/users/${id}`, data)
      toast({ title: desc })
      await loadUsers()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const saveRules = async () => {
    if (!rulesUser) return
    await patchUser(rulesUser.id, { rowRules: rulesUser.rowRules }, 'قواعد دسترسی سطح سطر به‌روزرسانی شد (بخش ۲۹ سند)')
    setRulesUser(null)
  }

  const saveSettings = async () => {
    if (!settings) return
    try {
      const res = await api.put<SettingsRow>('/api/settings', settings.settings)
      setSettings(res)
      toast({ title: 'پیکربندی ظرفیت ذخیره شد', description: 'سقف‌های جدید از این لحظه اعمال می‌شوند (بخش ۳۰.۱ سند).' })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        {canManageUsers && <TabsTrigger value="users" className="gap-1.5 text-xs"><Users2 className="size-3.5" /> کاربران و نقش‌ها</TabsTrigger>}
        {canManageSettings && <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings2 className="size-3.5" /> ظرفیت و پیکربندی</TabsTrigger>}
        {canViewAudit && <TabsTrigger value="audit" className="gap-1.5 text-xs"><ScrollText className="size-3.5" /> ثبت رویدادها</TabsTrigger>}
      </TabsList>

      {/* کاربران */}
      {canManageUsers && (
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Users2 className="size-4 text-primary" /> کاربران سامانه</CardTitle>
                  <CardDescription>کنترل دسترسی مبتنی بر نقش و منبع + قواعد دسترسی سطح سطر (بخش ۲۹ سند)</CardDescription>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}><Plus className="size-3.5" /> کاربر جدید</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-right text-xs">کاربر</TableHead>
                      <TableHead className="text-right text-xs">نقش</TableHead>
                      <TableHead className="text-right text-xs">قواعد سطری</TableHead>
                      <TableHead className="text-right text-xs">امنیت حساب</TableHead>
                      <TableHead className="text-right text-xs">آخرین ورود</TableHead>
                      <TableHead className="text-right text-xs">فعال</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <p className="text-xs font-medium">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground" dir="ltr">@{u.username}</p>
                        </TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={v => patchUser(u.id, { role: v }, `نقش ${u.name} تغییر کرد`)}>
                            <SelectTrigger className="h-7 w-40 text-[11px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(r => (
                                <SelectItem key={r.value} value={r.value} className="text-xs">{r.label} — {ROLE_DESC[r.value]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                            onClick={async () => {
                              setRulesUser(u)
                              if (projects[0]) await loadProjectDatasets(projects[0].id)
                            }}>
                            <Rows3 className="size-3" /> {u.rowRules.length > 0 ? `${u.rowRules.length.toLocaleString('fa-IR')} قاعده` : 'تعریف قاعده'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={u.mfaEnabled ? 'default' : 'outline'} className="text-[10px] gap-1 w-fit">
                              <KeyRound className="size-3" /> {u.mfaEnabled ? 'MFA فعال' : 'MFA غیرفعال'}
                            </Badge>
                            {u.ssoSubject && <Badge variant="secondary" className="text-[10px] w-fit">حساب سازمانی (SSO)</Badge>}
                            {u.mfaEnabled && (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-destructive px-1.5 w-fit"
                                onClick={() => {
                                  if (window.confirm(`MFA کاربر «${u.name}» بازنشانی شود؟ (برای بازیابی دسترسی در گم‌شدن دستگاه احرازکننده — بخش ۲۹)`)) {
                                    patchUser(u.id, { mfaReset: true }, 'احراز هویت چندمرحله‌ای کاربر بازنشانی شد')
                                  }
                                }}>
                                <KeySquare className="size-3" /> بازنشانی MFA
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('fa-IR') : '—'}
                        </TableCell>
                        <TableCell>
                          <Switch checked={u.active} onCheckedChange={v => patchUser(u.id, { active: v }, v ? 'کاربر فعال شد' : 'کاربر غیرفعال و نشست‌هایش ابطال شد')} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid gap-2 md:grid-cols-3 mt-3">
                {ROLE_OPTIONS.map(r => (
                  <div key={r.value} className="rounded-lg border p-2.5">
                    <p className="text-[11px] font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-primary" /> {r.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ROLE_DESC[r.value]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* ظرفیت */}
      {canManageSettings && settings && (
        <TabsContent value="settings">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Settings2 className="size-4 text-primary" /> سقف‌های ظرفیت</CardTitle>
              <CardDescription>تصمیم‌های بخش ۳۶ سند (اندازه و تعداد فایل، کاربران هم‌زمان) — اهداف پیشنهادی بخش ۳۰.۱، پیش از قرارداد با آزمون داده واقعی نهایی می‌شوند</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(settings.labels).map(([key, label]) => {
                  const val = settings.settings[key]
                  if (typeof val === 'boolean') {
                    return (
                      <div key={key} className="rounded-lg border p-3 flex items-center justify-between gap-2">
                        <Label className="text-xs">{label}</Label>
                        <Switch checked={val} onCheckedChange={v => setSettings({ ...settings, settings: { ...settings.settings, [key]: v } })} />
                      </div>
                    )
                  }
                  // تنظیمات چندگزینه‌ای — گزینه‌های مجاز بخش ۱۳.۲
                  const enumOpts = SETTING_ENUMS[key]
                  if (enumOpts && typeof val === 'string') {
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs">{label}</Label>
                        <Select value={val} onValueChange={v => setSettings({ ...settings, settings: { ...settings.settings, [key]: v } })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {enumOpts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  }
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        type={key === 'smtpPass' || key === 'ssoClientSecret' ? 'password' : typeof val === 'number' ? 'number' : 'text'}
                        value={String(val)}
                        onChange={e => {
                          const v = e.target.value
                          const num = Number(v)
                          setSettings({ ...settings, settings: { ...settings.settings, [key]: typeof val === 'number' ? (Number.isFinite(num) ? num : val) : v } })
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  )
                })}
              </div>
              <Button size="sm" onClick={saveSettings}>ذخیره پیکربندی</Button>

              {/* زمان‌بند خودکار ارزیابی هشدارها + کانال ایمیلی — تکمیل بخش ۲۶.۲ */}
              <div className="rounded-lg border p-4 space-y-3 mt-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2"><BellRing className="size-4 text-primary" /> زمان‌بند خودکار ارزیابی هشدارها</p>
                    <p className="text-[11px] text-muted-foreground mt-1">با شروع سرور فعال می‌شود و هر «فاصله ارزیابی» دقیقه همه قواعد فعال را می‌سنجد؛ تغییر فاصله بدون ری‌استارت اعمال می‌شود (بخش ۲۶.۲ سند).</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    disabled={testingEmail}
                    onClick={async () => {
                      setTestingEmail(true)
                      try {
                        const res = await api.post<{ result: { ok: boolean; skipped?: boolean; reason?: string; messageId?: string; to?: string[] } }>('/api/settings/email-test', {})
                        const r = res.result
                        if (r.ok) toast({ title: 'ایمیل آزمایشی ارسال شد', description: `به: ${r.to?.join('، ')}` })
                        else toast({ title: 'ارسال انجام نشد', description: r.reason ?? 'پیکربندی SMTP را بررسی کنید.', variant: 'destructive' })
                      } catch (e) {
                        toast({ title: 'خطای ارسال', description: e instanceof Error ? e.message : '', variant: 'destructive' })
                      } finally { setTestingEmail(false); void loadSettings() }
                    }}
                  >
                    <Send className="size-3.5" /> {testingEmail ? 'در حال ارسال...' : 'ارسال ایمیل آزمایشی'}
                  </Button>
                </div>
                {scheduler && (
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <Badge variant={scheduler.running ? 'default' : 'secondary'} className="text-[10px]">
                      {scheduler.running ? 'فعال' : 'غیرفعال'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">هر {toPersianDigits(String(scheduler.intervalMinutes))} دقیقه</Badge>
                    {scheduler.lastRunAt && (
                      <Badge variant="outline" className="text-[10px]">
                        آخرین چرخه: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(scheduler.lastRunAt))} — {toPersianDigits(String(scheduler.lastRunProjects))} پروژه، {toPersianDigits(String(scheduler.lastRunEvaluated))} قاعده، {toPersianDigits(String(scheduler.lastRunCreated))} اعلان جدید
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      ایمیل: {scheduler.lastEmailSent ? 'ارسال شد' : (settings?.settings.emailEnabled ? 'در انتظار اعلان جدید' : 'غیرفعال')}
                    </Badge>
                    {scheduler.lastError && <Badge variant="destructive" className="text-[10px]">خطا: {scheduler.lastError}</Badge>}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  برای کانال ایمیلی: «ارسال ایمیلی هشدارها» را فعال، مشخصات SMTP و گیرندگان (با کاما) را وارد و ذخیره کنید، سپس با «ارسال ایمیل آزمایشی» صحت پیکربندی را بسنجید. خلاصه اعلان‌های جدیدِ هر چرخه به گیرندگان ایمیل می‌شود.
                </p>

                {/* سلامت سرویس و صف پردازش خروجی — بخش ۳۰.۲ و ۲۸ سند */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2"><ListTodo className="size-4 text-primary" /> سلامت سرویس و صف پردازش خروجی</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      مانیتورینگ سلامت (بخش ۳۰.۲ سند): پایگاه‌داده، زمان‌بند و صف پردازش خروجی حجیم (بخش ۲۸: Job/Export). فایل‌های خروجی پس از «مدت اعتبار فایل خروجی» به‌طور خودکار ابطال می‌شوند.
                    </p>
                  </div>
                  {health && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <Badge variant={health.status === 'ok' ? 'default' : 'destructive'} className="text-[10px]">
                        سرویس: {health.status === 'ok' ? 'سالم' : 'اختلال'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">پایگاه‌داده: {health.checks.database.status === 'ok' ? 'سالم' : 'خطا'}</Badge>
                      <Badge variant="outline" className="text-[10px]">صف: {toPersianDigits(String(health.checks.queue.running))} در اجرا، {toPersianDigits(String(health.checks.queue.queued))} در انتظار</Badge>
                      {health.checks.queue.lastError && <Badge variant="destructive" className="text-[10px]">آخرین خطای صف: {health.checks.queue.lastError}</Badge>}
                      <Badge variant="outline" className="text-[10px]">فعالیت سرور: {toPersianDigits(String(Math.floor(health.uptimeSec / 60)))} دقیقه</Badge>
                    </div>
                  )}
                  {scheduler && (scheduler.lastConnSync ?? 0) + (scheduler.lastConnSyncFailed ?? 0) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      آخرین چرخه همگام‌سازی منابع خارجی: {toPersianDigits(String(scheduler.lastConnSync ?? 0))} موفق، {toPersianDigits(String(scheduler.lastConnSyncFailed ?? 0))} ناموفق (بخش ۳۱ سند)
                    </p>
                  )}
                </div>

                {/* امنیت: SSO و MFA — بخش ۲۹ سند */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> امنیت ورود: SSO سازمانی و MFA دوعاملی (بخش ۲۹ سند)</p>
                  <p className="text-[11px] text-muted-foreground leading-5">
                    «ورود یکپارچه سازمانی» را فعال و مشخصات OIDC سامانه هویتی (Keycloak، Azure AD، Google و ...) را وارد کنید؛
                    با ذکر «آدرس Issuer» نقاط انتهای Authorize/Token خودکار کشف می‌شوند. با فعال‌سازی «ساخت خودکار حساب»، کاربران جدید سازمان با نقش پیش‌فرض وارد می‌شوند.
                    برای احراز هویت چندمرحله‌ای، نقش‌های الزام MFA را در فیلد «نقش‌های الزام MFA» تعیین کنید؛ هر کاربر از نمای کاربران می‌تواند MFA خود را فعال کند و مدیر در شرایط اضطراری می‌تواند آن را بازنشانی کند.
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    نکته: پس از فعال‌سازی SSO، در صفحه ورود دکمه «ورود با حساب سازمانی» نمایش داده می‌شود؛ آدرس بازگشت (Redirect URI) در سامانه هویتی:
                    <code dir="ltr" className="ms-1 rounded bg-muted px-1.5 py-0.5">{'{آدرس سامانه}'}/api/auth/sso/callback</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* حسابرسی */}
      {canViewAudit && (
        <TabsContent value="audit">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><ScrollText className="size-4 text-primary" /> ثبت رویدادها (ردیابی)</CardTitle>
              <CardDescription>ثبت عملیات مدیریتی برای پیگیری منشأ و پاسخ‌گویی — بخش ۴ و ۲۹ سند</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-auto max-h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 sticky top-0">
                      <TableHead className="text-right text-xs">زمان</TableHead>
                      <TableHead className="text-right text-xs">عامل</TableHead>
                      <TableHead className="text-right text-xs">عملیات</TableHead>
                      <TableHead className="text-right text-xs">جزئیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.map(ev => (
                      <TableRow key={ev.id}>
                        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(ev.createdAt).toLocaleString('fa-IR')}</TableCell>
                        <TableCell className="text-[11px]">{ev.actor ?? '—'}</TableCell>
                        <TableCell className="text-[11px] font-medium">{ev.action}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{ev.detail ?? ''}</TableCell>
                      </TableRow>
                    ))}
                    {audit.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">رویدادی ثبت نشده است.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {!canManageUsers && !canManageSettings && !canViewAudit && (
        <Alert>
          <ShieldOff className="size-4" />
          <AlertDescription className="text-xs">نقش شما به مدیریت سامانه دسترسی ندارد (بخش ۲۹ سند).</AlertDescription>
        </Alert>
      )}

      {/* گفت‌وگوی ایجاد کاربر */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-sm">ایجاد کاربر جدید</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">نام کامل</Label>
              <Input value={fName} onChange={e => setFName(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نام کاربری (لاتین)</Label>
              <Input value={fUsername} onChange={e => setFUsername(e.target.value)} dir="ltr" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">گذرواژه (حداقل ۶ نویسه)</Label>
              <Input value={fPassword} onChange={e => setFPassword(e.target.value)} type="password" dir="ltr" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نقش</Label>
              <Select value={fRole} onValueChange={setFRole}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{ROLE_DESC[fRole]}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button size="sm" onClick={createUser} disabled={!fName || !fUsername || fPassword.length < 6}>ایجاد کاربر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* گفت‌وگوی قواعد سطح سطر */}
      <Dialog open={!!rulesUser} onOpenChange={v => !v && setRulesUser(null)}>
        <DialogContent className="sm:max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm">قواعد دسترسی سطح سطر — {rulesUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground">
              هر قاعده مشخص می‌کند کاربر فقط رکوردهایی را ببیند که شرط آن را دارند (دسترسی سطح سطر — بخش ۲۹ سند). مثال: استان = تهران
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">مجموعه‌داده قاعده‌ها</Label>
              <Select onValueChange={v => loadProjectDatasets(v)} >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="پروژه را برای انتخاب مجموعه‌داده انتخاب کنید" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {rulesUser && (
              <div className="space-y-2">
                {rulesUser.rowRules.map((r, i) => (
                  <div key={i} className="rounded-lg border p-2.5 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                    <Select value={r.datasetId} onValueChange={v => setRulesUser({ ...rulesUser, rowRules: rulesUser.rowRules.map((x, j) => j === i ? { ...x, datasetId: v } : x) })}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue placeholder="مجموعه‌داده" /></SelectTrigger>
                      <SelectContent>
                        {datasets.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={r.fieldId} onValueChange={v => setRulesUser({ ...rulesUser, rowRules: rulesUser.rowRules.map((x, j) => j === i ? { ...x, fieldId: v } : x) })}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue placeholder="ستون" /></SelectTrigger>
                      <SelectContent className="max-h-56">
                        {datasets.find(d => d.id === r.datasetId) ? (
                          (JSON.parse(datasets.find(d => d.id === r.datasetId)!.fields || '[]') as { id: string; label: string; role: string }[])
                            .filter(f => f.role !== 'measure')
                            .map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}</SelectItem>)
                        ) : <SelectItem value={r.fieldId} className="text-xs">{r.fieldId}</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Select value={r.op} onValueChange={v => setRulesUser({ ...rulesUser, rowRules: rulesUser.rowRules.map((x, j) => j === i ? { ...x, op: v } : x) })}>
                      <SelectTrigger className="h-8 text-[11px] w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq" className="text-xs">برابر</SelectItem>
                        <SelectItem value="neq" className="text-xs">نابرابر</SelectItem>
                        <SelectItem value="contains" className="text-xs">شامل</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1.5">
                      <Input value={r.value ?? ''} onChange={e => setRulesUser({ ...rulesUser, rowRules: rulesUser.rowRules.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })}
                        placeholder="مقدار" className="h-8 text-[11px] w-28" />
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => setRulesUser({ ...rulesUser, rowRules: rulesUser.rowRules.filter((_, j) => j !== i) })}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                  onClick={() => setRulesUser({ ...rulesUser, rowRules: [...rulesUser.rowRules, { datasetId: datasets[0]?.id ?? '', fieldId: '', op: 'eq', value: '' } as RowRuleDTO] })}
                  disabled={datasets.length === 0}>
                  <Plus className="size-3" /> افزودن قاعده
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRulesUser(null)}>انصراف</Button>
            <Button size="sm" onClick={saveRules}>ذخیره قواعد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
