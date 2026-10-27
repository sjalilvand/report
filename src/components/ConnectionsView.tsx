'use client'

// منابع داده خارجی — بخش ۳۱ سند («اتصال API و پایگاه‌داده» — اختیاری / مرحله توسعه)
// اتصال به سرویس REST/JSON و پایگاه‌داده PostgreSQL/MySQL، آزمون، پیش‌نمایش،
// همگام‌سازی دستی یا زمان‌بندی‌شده به مجموعه‌داده پروژه با نسخه‌بندی

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { toPersianDigits } from '@/lib/digits'
import { PlugZap, Plus, RefreshCw, Trash2, Pencil, FlaskConical, Eye, Database, Globe, Server, Clock } from 'lucide-react'

interface ConnectionRow {
  id: string
  name: string
  type: 'api' | 'postgres' | 'mysql'
  typeLabel: string
  configRaw: string
  query: string | null
  syncIntervalMinutes: number
  status: string
  lastMessage: string | null
  lastSyncAt: string | null
  lastSyncRows: number
  datasetId: string | null
}

const TYPE_OPTIONS = [
  { value: 'api', label: 'سرویس API (REST/JSON)' },
  { value: 'postgres', label: 'پایگاه‌داده PostgreSQL' },
  { value: 'mysql', label: 'پایگاه‌داده MySQL / MariaDB' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ok: { label: 'متصل', cls: 'bg-emerald-600' },
  error: { label: 'خطا', cls: 'bg-destructive' },
  untested: { label: 'آزمون‌نشده', cls: 'bg-muted-foreground' },
}

interface PreviewData {
  rows: Record<string, unknown>[]
  fields: { id: string; label: string; type: string; role: string }[]
  message: string
}

export default function ConnectionsView({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { toast } = useToast()
  const [conns, setConns] = useState<ConnectionRow[]>([])
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)

  // فرم اتصال
  const [fName, setFName] = useState('')
  const [fType, setFType] = useState<'api' | 'postgres' | 'mysql'>('api')
  const [fUrl, setFUrl] = useState('')
  const [fMethod, setFMethod] = useState('GET')
  const [fHeaders, setFHeaders] = useState('')
  const [fBody, setFBody] = useState('')
  const [fAuthToken, setFAuthToken] = useState('')
  const [fResponsePath, setFResponsePath] = useState('')
  const [fHost, setFHost] = useState('')
  const [fPort, setFPort] = useState('')
  const [fDatabase, setFDatabase] = useState('')
  const [fUser, setFUser] = useState('')
  const [fPassword, setFPassword] = useState('')
  const [fSsl, setFSsl] = useState(false)
  const [fQuery, setFQuery] = useState('')
  const [fInterval, setFInterval] = useState('0')

  const load = useCallback(async () => {
    try {
      setConns(await api.get<ConnectionRow[]>(`/api/connections?projectId=${projectId}`))
    } catch { /* بی‌صدا */ }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const resetForm = () => {
    setEditId(null); setFName(''); setFType('api'); setFUrl(''); setFMethod('GET'); setFHeaders('')
    setFBody(''); setFAuthToken(''); setFResponsePath(''); setFHost(''); setFPort(''); setFDatabase('')
    setFUser(''); setFPassword(''); setFSsl(false); setFQuery(''); setFInterval('0')
  }

  const openCreate = () => { resetForm(); setOpen(true) }

  const openEdit = (c: ConnectionRow) => {
    resetForm()
    setEditId(c.id)
    setFName(c.name)
    setFType(c.type)
    const cfg = JSON.parse(c.configRaw || '{}') as Record<string, unknown>
    if (c.type === 'api') {
      setFUrl(String(cfg.url ?? ''))
      setFMethod(String(cfg.method ?? 'GET'))
      setFHeaders(cfg.headers ? JSON.stringify(cfg.headers, null, 2) : '')
      setFBody(String(cfg.body ?? ''))
      setFAuthToken(cfg.authToken ? String(cfg.authToken) : '')
      setFResponsePath(String(cfg.responsePath ?? ''))
    } else {
      setFHost(String(cfg.host ?? ''))
      setFPort(String(cfg.port ?? ''))
      setFDatabase(String(cfg.database ?? ''))
      setFUser(String(cfg.user ?? ''))
      setFPassword(cfg.password ? String(cfg.password) : '')
      setFSsl(Boolean(cfg.ssl))
    }
    setFQuery(c.query ?? '')
    setFInterval(String(c.syncIntervalMinutes))
    setOpen(true)
  }

  const buildConfig = (): Record<string, unknown> => {
    if (fType === 'api') {
      let headers: Record<string, string> = {}
      if (fHeaders.trim()) {
        try { headers = JSON.parse(fHeaders) } catch { headers = {} }
      }
      return {
        url: fUrl.trim(),
        method: fMethod,
        headers,
        body: fMethod === 'POST' && fBody.trim() ? fBody : undefined,
        authToken: fAuthToken.trim() || undefined,
        responsePath: fResponsePath.trim() || undefined,
      }
    }
    return {
      host: fHost.trim(),
      port: Number(fPort) || undefined,
      database: fDatabase.trim(),
      user: fUser.trim(),
      password: fPassword || undefined,
      ssl: fSsl,
    }
  }

  const save = async () => {
    try {
      if (editId) {
        await api.patch(`/api/connections/${editId}`, {
          name: fName,
          query: fQuery || null,
          syncIntervalMinutes: Number(fInterval) || 0,
          config: buildConfig(),
        })
        toast({ title: 'اتصال به‌روزرسانی شد' })
      } else {
        await api.post('/api/connections', {
          projectId,
          name: fName,
          type: fType,
          query: fQuery || null,
          syncIntervalMinutes: Number(fInterval) || 0,
          config: buildConfig(),
        })
        toast({ title: 'اتصال ساخته شد', description: 'با «آزمون اتصال» صحت آن را بسنجید.' })
      }
      setOpen(false)
      await load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const runTest = async (c: ConnectionRow) => {
    setBusyId(c.id)
    try {
      const res = await api.post<{ result: { ok: boolean; message: string; fieldCount?: number; rowCount?: number } }>(`/api/connections/${c.id}/test`, {})
      const r = res.result
      if (r.ok) toast({ title: 'اتصال موفق', description: `${r.message} — ${toPersianDigits(String(r.fieldCount ?? 0))} ستون شناسایی شد` })
      else toast({ title: 'اتصال ناموفق', description: r.message, variant: 'destructive' })
      await load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally { setBusyId(null) }
  }

  const runPreview = async (c: ConnectionRow) => {
    setBusyId(c.id)
    try {
      const res = await api.post<PreviewData>(`/api/connections/${c.id}/preview`, {})
      setPreview(res)
    } catch (e) {
      toast({ title: 'خطا در پیش‌نمایش', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally { setBusyId(null) }
  }

  const runSync = async (c: ConnectionRow) => {
    setBusyId(c.id)
    try {
      const res = await api.post<{ message: string; created?: boolean; version?: number }>(`/api/connections/${c.id}/sync`, {})
      toast({ title: 'همگام‌سازی انجام شد', description: res.message })
      await load()
    } catch (e) {
      toast({ title: 'همگام‌سازی ناموفق', description: e instanceof Error ? e.message : '', variant: 'destructive' })
      await load()
    } finally { setBusyId(null) }
  }

  const remove = async (c: ConnectionRow) => {
    if (!window.confirm(`اتصال «${c.name}» حذف شود؟ مجموعه‌داده واردشده حفظ می‌شود.`)) return
    try {
      await api.del(`/api/connections/${c.id}`)
      toast({ title: 'اتصال حذف شد' })
      await load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const TypeIcon = (t: string) => t === 'api' ? <Globe className="size-4" /> : <Server className="size-4" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          داده از منبع خارجی خوانده، ستون‌ها به‌طور خودکار شناسایی و به‌صورت مجموعه‌داده پروژه با نسخه‌بندی منتقل می‌شود (بخش ۳۱ سند). پرس‌وجوی پایگاه‌داده فقط‌خواندنی است.
        </p>
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="size-3.5" /> اتصال جدید</Button>
        )}
      </div>

      {conns.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <PlugZap className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">هنوز اتصالی تعریف نشده است</p>
            <p className="text-xs text-muted-foreground">
              سرویس API سازمان یا پایگاه‌داده PostgreSQL/MySQL را متصل کنید تا داده به‌صورت زمان‌بندی‌شده وارد سامانه شود.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {conns.map(c => {
          const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.untested
          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-primary shrink-0">{TypeIcon(c.type)}</div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm leading-6 truncate">{c.name}</CardTitle>
                      <CardDescription className="text-[10px]">{c.typeLabel}</CardDescription>
                    </div>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${badge.cls}`}>{badge.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <p className="text-[11px] text-muted-foreground leading-5 line-clamp-2" title={c.lastMessage ?? ''}>
                  {c.lastMessage ?? 'هنوز آزمون نشده است.'}
                </p>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {c.syncIntervalMinutes > 0 ? (
                    <Badge variant="outline" className="text-[10px] gap-1"><Clock className="size-3" /> هر {toPersianDigits(String(c.syncIntervalMinutes))} دقیقه</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">همگام‌سازی دستی</Badge>
                  )}
                  {c.lastSyncAt && (
                    <Badge variant="outline" className="text-[10px]">
                      آخرین دریافت: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(c.lastSyncAt))} — {toPersianDigits(String(c.lastSyncRows))} رکورد
                    </Badge>
                  )}
                  {c.datasetId && <Badge variant="secondary" className="text-[10px] gap-1"><Database className="size-3" /> مجموعه‌داده مقصد دارد</Badge>}
                </div>
                {canEdit && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={busyId === c.id} onClick={() => runTest(c)}>
                      <FlaskConical className="size-3" /> آزمون
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={busyId === c.id} onClick={() => runPreview(c)}>
                      <Eye className="size-3" /> پیش‌نمایش
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={busyId === c.id} onClick={() => runSync(c)}>
                      <RefreshCw className={`size-3 ${busyId === c.id ? 'animate-spin' : ''}`} /> دریافت داده
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => openEdit(c)}>
                      <Pencil className="size-3" /> ویرایش
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive" onClick={() => remove(c)}>
                      <Trash2 className="size-3" /> حذف
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* گفت‌وگوی ساخت/ویرایش اتصال */}
      <Dialog open={open} onOpenChange={v => { if (!v) setOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm">{editId ? 'ویرایش اتصال' : 'اتصال منبع داده خارجی'} (بخش ۳۱ سند)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">نام اتصال</Label>
              <Input value={fName} onChange={e => setFName(e.target.value)} className="h-8 text-xs" placeholder="مثلاً: API فروش سازمان" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع منبع</Label>
              <Select value={fType} onValueChange={v => setFType(v as typeof fType)} disabled={!!editId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {fType === 'api' ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">آدرس سرویس (URL)</Label>
                  <Input value={fUrl} onChange={e => setFUrl(e.target.value)} dir="ltr" className="h-8 text-xs" placeholder="https://api.example.com/v1/sales" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">متد</Label>
                    <Select value={fMethod} onValueChange={setFMethod}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="GET" className="text-xs">GET</SelectItem><SelectItem value="POST" className="text-xs">POST</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">مسیر آرایه داده در پاسخ</Label>
                    <Input value={fResponsePath} onChange={e => setFResponsePath(e.target.value)} dir="ltr" className="h-8 text-xs" placeholder="data.items" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">توکن احراز (Bearer — اختیاری)</Label>
                  <Input value={fAuthToken} onChange={e => setFAuthToken(e.target.value)} dir="ltr" type="password" className="h-8 text-xs" placeholder="eyJhbGciOi..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">سربرگ‌های اضافی (JSON — اختیاری)</Label>
                  <Textarea value={fHeaders} onChange={e => setFHeaders(e.target.value)} dir="ltr" className="text-xs font-mono" rows={2} placeholder='{"X-Api-Key": "..."}' />
                </div>
                {fMethod === 'POST' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">بدنه درخواست (JSON)</Label>
                    <Textarea value={fBody} onChange={e => setFBody(e.target.value)} dir="ltr" className="text-xs font-mono" rows={2} />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">میزبان (Host)</Label>
                    <Input value={fHost} onChange={e => setFHost(e.target.value)} dir="ltr" className="h-8 text-xs" placeholder="db.example.local" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">پورت</Label>
                    <Input value={fPort} onChange={e => setFPort(e.target.value)} dir="ltr" className="h-8 text-xs" placeholder={fType === 'postgres' ? '5432' : '3306'} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">نام پایگاه‌داده</Label>
                  <Input value={fDatabase} onChange={e => setFDatabase(e.target.value)} dir="ltr" className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">نام کاربری</Label>
                    <Input value={fUser} onChange={e => setFUser(e.target.value)} dir="ltr" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">گذرواژه</Label>
                    <Input value={fPassword} onChange={e => setFPassword(e.target.value)} dir="ltr" type="password" className="h-8 text-xs" />
                  </div>
                </div>
              </>
            )}

            {(fType === 'postgres' || fType === 'mysql') && (
              <div className="space-y-1.5">
                <Label className="text-xs">پرس‌وجوی فقط‌خواندنی (SELECT)</Label>
                <Textarea value={fQuery} onChange={e => setFQuery(e.target.value)} dir="ltr" className="text-xs font-mono" rows={3} placeholder="SELECT * FROM sales WHERE year = 1404" />
                <p className="text-[10px] text-muted-foreground">فقط SELECT/WITH مجاز است — جلوگیری از تزریق و تغییر داده (بخش ۲۹ سند).</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">فاصله همگام‌سازی خودکار (دقیقه — صفر = دستی)</Label>
              <Input value={fInterval} onChange={e => setFInterval(e.target.value)} type="number" min={0} className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>انصراف</Button>
            <Button size="sm" onClick={save} disabled={!fName || (fType === 'api' ? !fUrl : !fHost || !fDatabase)}>
              {editId ? 'ذخیره تغییرات' : 'ایجاد اتصال'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* پیش‌نمایش داده */}
      <Dialog open={!!preview} onOpenChange={v => { if (!v) setPreview(null) }}>
        <DialogContent className="sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm">پیش‌نمایش داده منبع خارجی</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">{preview?.message}</p>
          <div className="rounded-lg border overflow-auto max-h-80">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 sticky top-0">
                  {preview?.fields.map(f => <TableHead key={f.id} className="text-right text-xs whitespace-nowrap">{f.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview?.rows.map((r, i) => (
                  <TableRow key={i}>
                    {preview.fields.map(f => (
                      <TableCell key={f.id} className="text-[11px] whitespace-nowrap">{r[f.id] === null || r[f.id] === undefined ? '—' : String(r[f.id])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
