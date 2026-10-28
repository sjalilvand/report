'use client'

// گردش کار تأیید و انتشار گزارش — بخش ۲۶.۱ و ۳۶ سند
// پیش‌نویس → در انتظار تأیید → تأییدشده → منتشرشده (رد با ثبت دلیل)
// هر گذار در تاریخچه تأیید ثبت می‌شود

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  ClipboardCheck, CheckCircle2, Send, UploadCloud, Undo2, XCircle, History, FileBarChart2, GitCompareArrows, Plus, Minus, PenLine,
} from 'lucide-react'

export interface WorkflowUser {
  id: string
  name: string
  role: string
}

interface ApprovalEvent {
  id: string
  action: string
  fromStatus: string
  toStatus: string
  comment?: string | null
  actor: string
  role?: string | null
  createdAt: string
}

interface ReportRow {
  id: string
  title: string
  status: string
  version: number
  createdBy?: string | null
  publishedAt?: string | null
  updatedAt: string
  datasetId?: string | null
}

// نسخه‌های گزارش — بخش ۲۶.۱ (مقایسه نسخه‌ها)
interface VersionRow {
  id: string
  version: number
  title: string
  description?: string | null
  status: string
  reason?: string | null
  createdBy?: string | null
  createdAt: string
}

interface ChangeItem {
  kind: string
  kindLabel: string
  op: 'added' | 'removed' | 'changed'
  opLabel: string
  label: string
  from?: string
  to?: string
}

interface VersionDiff {
  fromVersion: number
  toVersion: number
  items: ChangeItem[]
  summary: { added: number; removed: number; changed: number }
  identical: boolean
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: 'پیش‌نویس', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending: { label: 'در انتظار تأیید', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'تأییدشده', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  published: { label: 'منتشرشده', className: 'bg-teal-600 text-white border-teal-600' },
  rejected: { label: 'ردشده', className: 'bg-red-50 text-red-700 border-red-200' },
}

const ACTION_LABELS: Record<string, string> = {
  submit: 'ارسال برای تأیید',
  approve: 'تأیید',
  reject: 'رد',
  publish: 'انتشار',
  unpublish: 'لغو انتشار',
}

export const STATUS_LABEL = (s: string) => STATUS_META[s]?.label ?? s

export default function ReportWorkflow({ projectId, user, datasets }: {
  projectId: string
  user: WorkflowUser | null
  datasets: { id: string; name: string }[]
}) {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [timeline, setTimeline] = useState<{ reportId: string; events: ApprovalEvent[] } | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ReportRow | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [busy, setBusy] = useState(false)
  // مقایسه نسخه‌ها — بخش ۲۶.۱
  const [versionsTarget, setVersionsTarget] = useState<ReportRow | null>(null)
  const [versionList, setVersionList] = useState<VersionRow[]>([])
  const [currentVersion, setCurrentVersion] = useState(1)
  const [fromVer, setFromVer] = useState('')
  const [toVer, setToVer] = useState('')
  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      const list = await api.get<ReportRow[]>(`/api/reports?projectId=${projectId}`)
      setReports(list)
    } catch { /* بی‌صدا */ }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const act = async (report: ReportRow, action: 'submit' | 'approve' | 'publish' | 'unpublish', comment?: string) => {
    setBusy(true)
    try {
      await api.post(`/api/reports/${report.id}/status`, { action, comment })
      toast({ title: `${ACTION_LABELS[action]} انجام شد`, description: `گزارش «${report.title}» — ثبت در تاریخچه تأیید (بخش ۲۶.۱ سند).` })
      await load()
      if (timeline?.reportId === report.id) await openTimeline(report.id)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const reject = async () => {
    if (!rejectTarget) return
    if (!rejectComment.trim()) {
      toast({ title: 'ثبت دلیل رد الزامی است', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      await api.post(`/api/reports/${rejectTarget.id}/status`, { action: 'reject', comment: rejectComment.trim() })
      toast({ title: 'گزارش رد شد', description: 'دلیل رد در تاریخچه ثبت شد؛ طراح می‌تواند اصلاح و دوباره ارسال کند.' })
      setRejectTarget(null)
      setRejectComment('')
      await load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const openTimeline = async (reportId: string) => {
    try {
      const detail = await api.get<ReportRow & { approvals: ApprovalEvent[] }>(`/api/reports/${reportId}`)
      setTimeline({ reportId, events: detail.approvals ?? [] })
    } catch {
      setTimeline({ reportId, events: [] })
    }
  }

  // بازکردن دیالوگ نسخه‌ها و مقایسه — بخش ۲۶.۱
  const openVersions = async (report: ReportRow) => {
    setVersionsTarget(report)
    setDiff(null)
    setVersionsLoading(true)
    try {
      const res = await api.get<{ currentVersion: number; versions: VersionRow[] }>(`/api/reports/${report.id}/versions`)
      setVersionList(res.versions)
      setCurrentVersion(res.currentVersion)
      // پیش‌فرض: قدیمی‌ترین نسخه ← نسخه جاری
      const oldest = res.versions.length > 0 ? String(res.versions[res.versions.length - 1].version) : '1'
      setFromVer(oldest)
      setToVer(String(res.currentVersion))
      await loadDiff(report.id, oldest, String(res.currentVersion))
    } catch {
      setVersionList([])
    } finally {
      setVersionsLoading(false)
    }
  }

  const loadDiff = async (reportId: string, from: string, to: string) => {
    if (!from || !to) return
    try {
      const d = await api.get<VersionDiff>(`/api/reports/${reportId}/versions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      setDiff(d)
    } catch {
      setDiff(null)
    }
  }

  const changeVersions = async (from: string, to: string) => {
    setFromVer(from)
    setToVer(to)
    if (versionsTarget) await loadDiff(versionsTarget.id, from, to)
  }

  const canSubmit = user?.role === 'admin' || user?.role === 'steward' || user?.role === 'analyst'
  const canApprove = user?.role === 'admin' || user?.role === 'steward'
  const canPublish = user?.role === 'admin'

  if (reports.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center space-y-2">
          <ClipboardCheck className="size-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">گزارش ذخیره‌شده‌ای وجود ندارد</p>
          <p className="text-xs text-muted-foreground">از طراح گزارش، پیش‌نویس را ذخیره کنید؛ سپس گردش کار تأیید (بخش ۲۶.۱ سند) از همین‌جا انجام می‌شود.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /> گزارش‌ها و گردش کار تأیید</CardTitle>
        <CardDescription>
          مسیر انتشار: پیش‌نویس → در انتظار تأیید → تأییدشده → منتشرشده؛ انتشار تنها پس از تأیید و با نقش مجاز (بخش ۲۶.۱ سند)
          {user ? ` | نقش شما: ${user.role === 'admin' ? 'مدیر سامانه' : user.role === 'steward' ? 'مدیر داده' : user.role === 'analyst' ? 'تحلیلگر' : user.role === 'auditor' ? 'ناظر' : 'مشاهده‌کننده'}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-right text-xs">گزارش</TableHead>
                <TableHead className="text-right text-xs">داده مبنای</TableHead>
                <TableHead className="text-right text-xs">نسخه</TableHead>
                <TableHead className="text-right text-xs">وضعیت</TableHead>
                <TableHead className="text-right text-xs">گردش کار</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(r => {
                const meta = STATUS_META[r.status] ?? { label: r.status, className: '' }
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium max-w-48">
                      <span className="flex items-center gap-1.5"><FileBarChart2 className="size-3.5 text-muted-foreground shrink-0" />{r.title}</span>
                      {r.status === 'rejected' && <span className="text-[10px] text-red-600 mt-0.5 block">نیازمند اصلاح و ارسال مجدد</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {datasets.find(d => d.id === r.datasetId)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">v{r.version.toLocaleString('fa-IR')}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${meta.className}`}>{meta.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {canSubmit && ['draft', 'rejected'].includes(r.status) && (
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={busy}
                            onClick={() => act(r, 'submit')}><Send className="size-3" /> ارسال برای تأیید</Button>
                        )}
                        {canApprove && r.status === 'pending' && (
                          <>
                            <Button size="sm" className="h-7 text-[11px] gap-1" disabled={busy}
                              onClick={() => act(r, 'approve')}><CheckCircle2 className="size-3" /> تأیید</Button>
                            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-red-600 hover:text-red-700" disabled={busy}
                              onClick={() => setRejectTarget(r)}><XCircle className="size-3" /> رد</Button>
                          </>
                        )}
                        {canPublish && r.status === 'approved' && (
                          <Button size="sm" className="h-7 text-[11px] gap-1" disabled={busy}
                            onClick={() => act(r, 'publish')}><UploadCloud className="size-3" /> انتشار</Button>
                        )}
                        {canPublish && r.status === 'published' && (
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={busy}
                            onClick={() => act(r, 'unpublish')}><Undo2 className="size-3" /> لغو انتشار</Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"
                          onClick={() => openTimeline(r.id)}><History className="size-3" /> تاریخچه</Button>
                        {/* مقایسه نسخه‌ها — بخش ۲۶.۱ سند */}
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"
                          onClick={() => openVersions(r)}><GitCompareArrows className="size-3" /> نسخه‌ها و مقایسه</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {timeline && (
          <div className="mt-4">
            <Alert>
              <History className="size-4" />
              <AlertDescription className="text-xs">
                <p className="font-medium mb-2">تاریخچه گردش کار این گزارش (از پایین به بالا):</p>
                {timeline.events.length === 0 ? (
                  <p className="text-muted-foreground">رویدادی ثبت نشده است.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {timeline.events.map(ev => (
                      <li key={ev.id} className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{ACTION_LABELS[ev.action] ?? ev.action}</Badge>
                        <span>{ev.actor}</span>
                        <span className="text-muted-foreground">({new Date(ev.createdAt).toLocaleString('fa-IR')})</span>
                        {ev.comment && <span className="text-muted-foreground">— دلیل: {ev.comment}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>

      {/* دیالوگ نسخه‌ها و مقایسه — بخش ۲۶.۱ (مقایسه نسخه‌ها + ثبت دلیل تغییر) */}
      <Dialog open={!!versionsTarget} onOpenChange={v => !v && setVersionsTarget(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <GitCompareArrows className="size-4 text-primary" /> نسخه‌های گزارش «{versionsTarget?.title}»
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* تاریخچه نسخه‌ها */}
            <div>
              <p className="text-xs font-medium mb-2">تاریخچه نسخه‌ها (ثبت دلیل تغییر — بخش ۲۶.۱ سند):</p>
              {versionsLoading ? (
                <p className="text-xs text-muted-foreground">در حال بارگذاری…</p>
              ) : versionList.length === 0 ? (
                <p className="text-xs text-muted-foreground">نسخه‌ای ثبت نشده است؛ با ذخیره دوباره گزارش (پیش‌نویس) نسخه‌بندی فعال می‌شود.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-right text-xs">نسخه</TableHead>
                        <TableHead className="text-right text-xs">وضعیت</TableHead>
                        <TableHead className="text-right text-xs">دلیل تغییر</TableHead>
                        <TableHead className="text-right text-xs">کاربر</TableHead>
                        <TableHead className="text-right text-xs">زمان</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versionList.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs font-medium">
                            v{v.version.toLocaleString('fa-IR')}
                            {v.version === currentVersion && <Badge variant="secondary" className="ms-1.5 text-[9px]">جاری</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">{STATUS_META[v.status]?.label ?? v.status}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-56">{v.reason ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{v.createdBy ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString('fa-IR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* انتخاب دو نسخه برای مقایسه */}
            {versionList.length >= 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">مقایسه دو نسخه:</p>
                <div className="flex items-center gap-2">
                  <Select value={fromVer || undefined} onValueChange={v => changeVersions(v, toVer)}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="نسخه مبدأ" /></SelectTrigger>
                    <SelectContent>
                      {versionList.map(v => <SelectItem key={v.id} value={String(v.version)}>نسخه {v.version.toLocaleString('fa-IR')}{v.version === currentVersion ? ' (جاری)' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <GitCompareArrows className="size-4 text-muted-foreground shrink-0" />
                  <Select value={toVer || undefined} onValueChange={v => changeVersions(fromVer, v)}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="نسخه مقصد" /></SelectTrigger>
                    <SelectContent>
                      {versionList.map(v => <SelectItem key={v.id} value={String(v.version)}>نسخه {v.version.toLocaleString('fa-IR')}{v.version === currentVersion ? ' (جاری)' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* نتیجه مقایسه */}
                {diff && (
                  <div className="space-y-2">
                    {diff.identical ? (
                      <Alert>
                        <AlertDescription className="text-xs">
                          این دو نسخه پیکربندی یکسانی دارند — تفاوتی یافت نشد.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-200 bg-emerald-50"><Plus className="size-3" /> {diff.summary.added.toLocaleString('fa-IR')} افزوده</Badge>
                          <Badge variant="outline" className="gap-1 text-red-700 border-red-200 bg-red-50"><Minus className="size-3" /> {diff.summary.removed.toLocaleString('fa-IR')} حذف</Badge>
                          <Badge variant="outline" className="gap-1 text-amber-700 border-amber-200 bg-amber-50"><PenLine className="size-3" /> {diff.summary.changed.toLocaleString('fa-IR')} تغییر</Badge>
                          <span className="text-muted-foreground">نسخه {diff.fromVersion.toLocaleString('fa-IR')} ← نسخه {diff.toVersion.toLocaleString('fa-IR')}</span>
                        </div>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/40">
                                <TableHead className="text-right text-xs">بخش</TableHead>
                                <TableHead className="text-right text-xs">تغییر</TableHead>
                                <TableHead className="text-right text-xs">شرح</TableHead>
                                <TableHead className="text-right text-xs">مقدار پیشین</TableHead>
                                <TableHead className="text-right text-xs">مقدار جدید</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {diff.items.map((it, i) => (
                                <TableRow key={i} className={it.op === 'added' ? 'bg-emerald-50/40' : it.op === 'removed' ? 'bg-red-50/40' : 'bg-amber-50/30'}>
                                  <TableCell className="text-xs">{it.kindLabel}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={`text-[10px] gap-1 ${it.op === 'added' ? 'text-emerald-700 border-emerald-200' : it.op === 'removed' ? 'text-red-700 border-red-200' : 'text-amber-700 border-amber-200'}`}>
                                      {it.op === 'added' ? <Plus className="size-3" /> : it.op === 'removed' ? <Minus className="size-3" /> : <PenLine className="size-3" />}
                                      {it.opLabel}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">{it.label}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground max-w-40 truncate" title={it.from}>{it.from ?? '—'}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground max-w-40 truncate" title={it.to}>{it.to ?? '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={v => !v && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm">رد گزارش «{rejectTarget?.title}»</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">ثبت دلیل رد الزامی است تا طراح گزارش بتواند اصلاح لازم را انجام دهد (بخش ۲۶.۱ سند).</p>
            <Textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} rows={3}
              placeholder="مثال: جمع مبالغ با فهرست مالی هم‌خوان نیست؛ بازه زمانی را اصلاح کنید." />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>انصراف</Button>
            <Button variant="destructive" size="sm" onClick={reject} disabled={busy}>ثبت رد گزارش</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
