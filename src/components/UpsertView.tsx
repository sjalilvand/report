'use client'

// به‌روزرسانی فایل و Upsert — بخش ۲۴ سند
// سه روش: جایگزینی کامل، افزودن، Upsert بر اساس کلید
// کنترل تغییر ساختار (۲۴.۲) با نمایش تفاوت‌ها و اخذ تأیید مدیر
// نتیجه: درج/به‌روزرسانی/بدون تغییر + نسخه جدید داده (۲۴.۳)

import { useState, useMemo } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatNumber } from '@/lib/currency'
import {
  RefreshCw, Loader2, Upload, KeyRound, AlertTriangle, CheckCircle2, Info, RotateCcw,
} from 'lucide-react'

interface FieldLite { id: string; label: string; role: string; type: string }

interface UpsertResult {
  mode: string
  inserted: number
  updated: number
  unchanged: number
  previousRowCount: number
  rowCount: number
  fieldCount: number
  addedFields: string[]
  version: number
  structureChanges: { kind: string; field: string; detail: string }[]
  warnings: string[]
}

interface DiffResponse {
  requiresConfirmation: boolean
  structureChanges: { kind: string; field: string; detail: string }[]
  publishedReports: number
  message: string
  detected: { sheets: { name: string; rows: number; cols: number }[]; rowCount: number }
}

export default function UpsertView({
  datasets,
  onUpdated,
}: {
  datasets: { id: string; name: string; rowCount: number; version: number; fields: string }[]
  onUpdated: () => void
}) {
  const [datasetId, setDatasetId] = useState('')
  const [mode, setMode] = useState('upsert')
  const [keyIds, setKeyIds] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<UpsertResult | null>(null)
  const [diff, setDiff] = useState<DiffResponse | null>(null)
  const { toast } = useToast()

  const fields: FieldLite[] = useMemo(() => {
    const ds = datasets.find(d => d.id === datasetId)
    if (!ds) return []
    try {
      return JSON.parse(ds.fields || '[]') as FieldLite[]
    } catch {
      return []
    }
  }, [datasetId, datasets])

  // پیشنهاد کلید: ستون‌های شناسه و ابعاد در صدر فهرست
  const sortedFields = useMemo(() => {
    const rank = (r: string) => (r === 'identifier' ? 0 : r === 'dimension' ? 1 : r === 'attribute' ? 2 : 3)
    return [...fields].sort((a, b) => rank(a.role) - rank(b.role))
  }, [fields])

  const ds = datasets.find(d => d.id === datasetId)

  const submit = async (confirmStructureChange = false) => {
    if (!datasetId || !file) {
      toast({ title: 'اطلاعات ناقص', description: 'مجموعه‌داده و فایل جدید را انتخاب کنید.', variant: 'destructive' })
      return
    }
    if (mode === 'upsert' && keyIds.length === 0) {
      toast({ title: 'کلید Upsert الزامی است', description: 'حداقل یک فیلد کلید انتخاب کنید (بخش ۲۴.۱ سند).', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('mode', mode)
      form.append('keyFieldIds', JSON.stringify(keyIds))
      if (confirmStructureChange) form.append('confirmStructureChange', 'true')
      const res = await fetch(`/api/datasets/${datasetId}/upsert`, { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.requiresConfirmation) {
        setDiff(data as DiffResponse)
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'خطا در به‌روزرسانی فایل (بخش ۲۴ سند)')
      setResult(data as UpsertResult)
      setDiff(null)
      setFile(null)
      onUpdated()
      toast({ title: 'به‌روزرسانی انجام شد', description: `نسخه جدید داده: v${(data as UpsertResult).version} (بخش ۲۴.۳ سند)` })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const changeLabel = (kind: string) =>
    kind === 'added' ? 'ستون اضافه' : kind === 'removed' ? 'ستون حذف' : kind === 'typeChanged' ? 'تغییر نوع' : 'تغییر واحد'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="size-4" /> به‌روزرسانی فایل و Upsert (بخش ۲۴ سند)</CardTitle>
        <CardDescription>
          به‌روزرسانی مجموعه‌داده موجود با فایل دوره جدید: جایگزینی کامل، افزودن رکوردهای جدید یا درج/به‌روزرسانی بر اساس کلید — با کنترل تغییر ساختار و نسخه‌بندی (بخش‌های ۲۴.۱ تا ۲۴.۳ سند)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {datasets.length === 0 ? (
          <p className="text-xs text-muted-foreground">هنوز مجموعه‌داده‌ای ساخته نشده است؛ ابتدا از فایل یک مجموعه‌داده بسازید.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">مجموعه‌داده مقصد</Label>
                <Select value={datasetId} onValueChange={v => { setDatasetId(v); setKeyIds([]) }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {datasets.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name} — {formatNumber(d.rowCount)} رکورد (v{d.version})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">روش به‌روزرسانی (بخش ۲۴.۱)</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upsert">به‌روزرسانی و درج بر اساس کلید (Upsert)</SelectItem>
                    <SelectItem value="append">افزودن رکوردهای جدید</SelectItem>
                    <SelectItem value="replace">جایگزینی کامل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">فایل جدید (همان شیت «{ds?.name.split(' - ').pop() ?? ''}»)</Label>
                <label className="flex items-center gap-2 h-8 rounded-md border px-2 text-xs cursor-pointer hover:bg-muted">
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  <span className="truncate">{file ? file.name : 'انتخاب فایل XLSX/CSV'}</span>
                  <input
                    type="file" className="hidden" accept=".xlsx,.xlsm,.xls,.csv,.tsv"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            {mode === 'upsert' && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><KeyRound className="size-3.5" /> فیلدهای کلید Upsert (ترکیبی مجاز است)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {sortedFields.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setKeyIds(s => s.includes(f.id) ? s.filter(x => x !== f.id) : [...s, f.id])}
                      className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${keyIds.includes(f.id) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                    >
                      {f.label}
                      <span className="ms-1 opacity-60">({f.role === 'identifier' ? 'شناسه' : f.role === 'dimension' ? 'بُعد' : f.role === 'measure' ? 'سنجه' : 'توصیفی'})</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  مقدار خالی فایل جدید، مقدار قبلی را پاک نمی‌کند؛ کلیدهای جدید درج و کلیدهای موجود به‌روزرسانی می‌شوند (بخش ۲۴.۱ سند).
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={() => submit(false)} disabled={busy || !datasetId || !file} className="h-8 gap-1.5 text-xs">
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                بررسی و به‌روزرسانی
              </Button>
              <span className="text-[10px] text-muted-foreground">
                فایل اصلی پروژه حفظ می‌شود و نسخه جدید ثبت می‌گردد (بخش ۴ و ۲۴.۳ سند).
              </span>
            </div>

            {/* نتیجه به‌روزرسانی — بخش ۲۴.۳ */}
            {result && (
              <Alert className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <AlertTitle className="text-sm">به‌روزرسانی با موفقیت انجام شد — نسخه داده: v{result.version}</AlertTitle>
                <AlertDescription>
                  <div className="grid gap-2 sm:grid-cols-4 mt-2 text-xs">
                    <div className="rounded-md bg-white/70 dark:bg-black/20 p-2"><span className="text-muted-foreground">درج: </span><b className="tabular-nums">{formatNumber(result.inserted)}</b></div>
                    <div className="rounded-md bg-white/70 dark:bg-black/20 p-2"><span className="text-muted-foreground">به‌روزرسانی: </span><b className="tabular-nums">{formatNumber(result.updated)}</b></div>
                    <div className="rounded-md bg-white/70 dark:bg-black/20 p-2"><span className="text-muted-foreground">بدون تغییر: </span><b className="tabular-nums">{formatNumber(result.unchanged)}</b></div>
                    <div className="rounded-md bg-white/70 dark:bg-black/20 p-2"><span className="text-muted-foreground">کل رکورد: </span><b className="tabular-nums">{formatNumber(result.rowCount)}</b></div>
                  </div>
                  {result.addedFields.length > 0 && (
                    <p className="mt-2 text-xs">ستون‌های اضافه‌شده به مدل: {result.addedFields.map(f => `«${f}»`).join('، ')}</p>
                  )}
                  {result.structureChanges.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      تغییر ساختار با تأیید مدیر اعمال شد ({result.structureChanges.length.toLocaleString('fa-IR')} مورد — ثبت در رویدادها).
                    </p>
                  )}
                  {result.warnings.length > 0 && (
                    <ul className="list-disc ps-4 mt-2 space-y-0.5 text-[11px]">
                      {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>

      {/* گفت‌وگوی تأیید تغییر ساختار — بخش ۲۴.۲ */}
      <Dialog open={!!diff} onOpenChange={o => !o && setDiff(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" /> کنترل تغییر ساختار (بخش ۲۴.۲ سند)
            </DialogTitle>
            <DialogDescription className="text-xs">{diff?.message}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">نوع تغییر</TableHead>
                  <TableHead>ستون</TableHead>
                  <TableHead>توضیح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diff?.structureChanges.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant={c.kind === 'removed' ? 'destructive' : c.kind === 'added' ? 'secondary' : 'outline'} className="text-[10px]">
                        {changeLabel(c.kind)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{c.field}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {(diff?.publishedReports ?? 0) > 0 && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription className="text-xs">
                {diff?.publishedReports.toLocaleString('fa-IR')} گزارش منتشرشده به این مجموعه‌داده وابسته است؛ پس از تأیید، انتشار باید بازبینی شود (بخش ۲۴.۲ سند: توقف به‌روزرسانی انتشارشده).
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="outline" size="sm" onClick={() => setDiff(null)}>انصراف و بازگشت</Button>
            <Button variant="destructive" size="sm" className="gap-1.5" disabled={busy} onClick={() => submit(true)}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              تأیید مدیر و اعمال تغییر ساختار
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
