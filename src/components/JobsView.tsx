'use client'

// پردازش‌های پس‌زمینه — بخش ۲۸ (Job) و ۳۰.۲ سند (پایداری)
// صف خروجی حجیم: وضعیت، پیشرفت، مدت و علت شکست، تلاش مجدد امن، لغو، دانلود با انقضا

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { toPersianDigits } from '@/lib/digits'
import { ListTodo, Download, RotateCcw, XCircle, RefreshCw } from 'lucide-react'

interface JobRow {
  id: string
  type: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'canceled'
  progress: number
  result: { fileName?: string; size?: number; ext?: string; expiresAt?: string } | null
  error: string | null
  attempts: number
  maxAttempts: number
  createdBy: string | null
  durationMs: number | null
  createdAt: string
  finishedAt: string | null
}

const STATUS: Record<JobRow['status'], { label: string; cls: string }> = {
  queued: { label: 'در صف', cls: 'bg-amber-500' },
  running: { label: 'در حال اجرا', cls: 'bg-blue-600' },
  done: { label: 'آماده', cls: 'bg-emerald-600' },
  failed: { label: 'ناموفق', cls: 'bg-destructive' },
  canceled: { label: 'لغوشده', cls: 'bg-muted-foreground' },
}

const TYPE_LABEL: Record<string, string> = {
  'export.xlsx': 'خروجی Excel',
  'export.csv': 'خروجی CSV',
  'export.pdf': 'خروجی PDF',
  'export.pptx': 'خروجی PowerPoint',
}

export default function JobsView({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const list = await api.get<JobRow[]>(`/api/jobs?projectId=${projectId}&limit=100`)
      setJobs(list)
      // ادامه نظرسنجی تا وقتی کار فعالی در صف یا اجراست
      return list.some(j => j.status === 'queued' || j.status === 'running')
    } catch {
      return false
    }
  }, [projectId])

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const cycle = async () => {
      if (stopped) return
      const active = await load()
      setLoading(false)
      if (!stopped) timer = setTimeout(cycle, active ? 3000 : 8000)
    }
    void cycle()
    return () => { stopped = true; if (timer) clearTimeout(timer) }
  }, [load])

  const download = async (j: JobRow) => {
    try {
      const res = await fetch(`/api/jobs/${j.id}/download`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'خطا در دانلود')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = j.result?.fileName ?? `export.${j.result?.ext ?? 'bin'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast({ title: 'دانلود ناموفق', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const retry = async (j: JobRow) => {
    try {
      const res = await api.post<{ message: string }>(`/api/jobs/${j.id}`, {})
      toast({ title: 'تلاش مجدد', description: res.message })
      await load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const cancelOrDelete = async (j: JobRow) => {
    const isCancel = j.status === 'queued'
    if (!window.confirm(isCancel ? 'این پردازش لغو شود؟' : 'پردازش و فایل خروجی آن حذف شود؟')) return
    try {
      await api.del(`/api/jobs/${j.id}`)
      toast({ title: isCancel ? 'پردازش لغو شد' : 'پردازش و فایل حذف شد' })
      await load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const fmtDur = (ms: number | null) => {
    if (ms === null || ms === undefined) return '—'
    if (ms < 1000) return `${toPersianDigits(String(ms))} میلی‌ثانیه`
    return `${toPersianDigits((ms / 1000).toFixed(1))} ثانیه`
  }

  const activeCount = jobs.filter(j => j.status === 'queued' || j.status === 'running').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          خروجی‌های حجیم به‌صورت غیرهم‌زمان تولید می‌شوند (بخش ۳۰.۲ سند): بازیابی پردازش شکست‌خورده، اجرای مجدد امن،
          ثبت مدت و علت شکست و انقضای خودکار لینک دانلود. {activeCount > 0 ? `الان ${toPersianDigits(String(activeCount))} پردازش فعال دارد.` : ''}
        </p>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => void load()}>
          <RefreshCw className="size-3.5" /> بازخوانی
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right text-xs">پردازش</TableHead>
                  <TableHead className="text-right text-xs">وضعیت</TableHead>
                  <TableHead className="text-right text-xs">پیشرفت</TableHead>
                  <TableHead className="text-right text-xs">تلاش</TableHead>
                  <TableHead className="text-right text-xs">مدت</TableHead>
                  <TableHead className="text-right text-xs">زمان ثبت</TableHead>
                  <TableHead className="text-right text-xs">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">در حال بارگذاری…</TableCell></TableRow>
                )}
                {!loading && jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <ListTodo className="size-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">پردازشی ثبت نشده است؛ از دکمه «خروجی پس‌زمینه» در گزارش‌ساز استفاده کنید.</p>
                    </TableCell>
                  </TableRow>
                )}
                {jobs.map(j => {
                  const badge = STATUS[j.status]
                  const expired = j.result?.expiresAt ? new Date(j.result.expiresAt).getTime() < Date.now() : false
                  return (
                    <TableRow key={j.id}>
                      <TableCell>
                        <p className="text-xs font-medium">{TYPE_LABEL[j.type] ?? j.type}</p>
                        {j.result?.fileName && <p className="text-[10px] text-muted-foreground truncate max-w-52" dir="ltr">{j.result.fileName}</p>}
                        {j.error && <p className="text-[10px] text-destructive mt-0.5 max-w-72 leading-4">{j.error}</p>}
                      </TableCell>
                      <TableCell><Badge className={`text-[10px] ${badge.cls}`}>{badge.label}</Badge></TableCell>
                      <TableCell className="w-28">
                        {j.status === 'running' ? (
                          <div className="space-y-1">
                            <Progress value={j.progress} className="h-1.5" />
                            <p className="text-[10px] text-muted-foreground tabular-nums">{toPersianDigits(String(j.progress))}٪</p>
                          </div>
                        ) : j.status === 'done' ? (
                          <span className="text-[11px] tabular-nums">{toPersianDigits(String(Math.round((j.result?.size ?? 0) / 1024)))} کیلوبایت</span>
                        ) : <span className="text-[11px] text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-[11px] tabular-nums">{toPersianDigits(String(j.attempts))} / {toPersianDigits(String(j.maxAttempts))}</TableCell>
                      <TableCell className="text-[11px] tabular-nums">{fmtDur(j.durationMs)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(j.createdAt))}
                        {j.createdBy && <p>{j.createdBy}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {j.status === 'done' && j.result && !expired && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => download(j)}>
                              <Download className="size-3" /> دانلود
                            </Button>
                          )}
                          {j.status === 'done' && expired && <span className="text-[10px] text-muted-foreground">فایل منقضی شد</span>}
                          {(j.status === 'failed' || j.status === 'canceled') && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => retry(j)}>
                              <RotateCcw className="size-3" /> تلاش مجدد
                            </Button>
                          )}
                          {(j.status === 'queued' || j.status === 'done' || j.status === 'failed' || j.status === 'canceled') && (
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive" onClick={() => cancelOrDelete(j)}>
                              <XCircle className="size-3" /> {j.status === 'queued' ? 'لغو' : 'حذف'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
