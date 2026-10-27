'use client'

// نمای داده‌ها — بخش‌های ۶، ۷ و ۸ سند
// بارگذاری فایل، شناسایی ساختار، پیکربندی و ایجاد مجموعه‌داده

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { formatNumber } from '@/lib/currency'
import {
  Upload, FileSpreadsheet, Trash2, Database, AlertTriangle, CheckCircle2, FileDown,
  Loader2, Table2, Eye, Layers, Info,
} from 'lucide-react'

interface SheetInfo {
  name: string
  rows: number
  cols: number
  dataStartRow: number
  dataEndRow: number
  headerCandidate: number
  mergedCells: number
  warnings: string[]
  preview: string[][]
}

interface UploadedFile {
  id: string
  name: string
  size: number
  fingerprint: string
  createdAt: string
  sheetInfo: string
}

type ProjectFile = UploadedFile

export default function DataView({
  projectId,
  onDatasetCreated,
  activeProjectName,
}: {
  projectId: string
  onDatasetCreated: (id: string) => void
  activeProjectName: string
}) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<null | {
    fileId: string
    fileName: string
    sheet: SheetInfo
    config: { headerRow: number; firstDataRow: number; lastDataRow: number; mergedPolicy: string }
    result: {
      headers: string[]
      rowCount: number
      previewRows: string[][]
      warnings: string[]
      fields: { id: string; label: string; type: string; confidence: number; role: string }[]
    }
  }>(null)
  const [creating, setCreating] = useState(false)
  const [datasetName, setDatasetName] = useState('')
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    try {
      const p = await api.get<{ files: ProjectFile[] }>(`/api/projects/${projectId}`)
      setFiles(p.files)
    } catch (e) {
      toast({ title: 'خطا در دریافت فایل‌ها', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }, [projectId, toast])

  useEffect(() => { loadFiles() }, [loadFiles])

  const upload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      let okCount = 0
      let dupCount = 0
      for (const f of Array.from(fileList)) {
        const form = new FormData()
        form.append('file', f)
        form.append('projectId', projectId)
        const res = await api.postForm<{ duplicate: boolean; message?: string }>('/api/files/upload', form)
        if (res.duplicate) {
          dupCount++
          toast({ title: 'فایل تکراری', description: `${f.name}: ${res.message}`, variant: 'default' })
        } else okCount++
      }
      if (okCount > 0) toast({ title: 'بارگذاری کامل شد', description: `${okCount} فایل جدید پردازش و ساختار آن شناسایی شد (بخش ۶ سند — مرحله سوم).` })
      loadFiles()
    } catch (e) {
      toast({ title: 'خطا در بارگذاری', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const deleteFile = async (f: ProjectFile) => {
    if (!confirm(`فایل «${f.name}» حذف شود؟`)) return
    try {
      await api.del(`/api/files/${f.id}`)
      loadFiles()
      toast({ title: 'فایل حذف شد' })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const openPreview = async (f: ProjectFile, sheetName: string) => {
    try {
      const sheets: SheetInfo[] = JSON.parse(f.sheetInfo || '[]')
      const sheet = sheets.find(s => s.name === sheetName)
      if (!sheet) return
      const res = await api.get<{
        headers: string[]
        rowCount: number
        previewRows: string[][]
        warnings: string[]
        fields: { id: string; label: string; type: string; confidence: number; role: string }[]
        config: { headerRow: number; firstDataRow: number; lastDataRow: number; mergedPolicy: string }
      }>(`/api/files/${f.id}/preview?sheet=${encodeURIComponent(sheetName)}&mode=preview`)
      setPreview({ fileId: f.id, fileName: f.name, sheet, config: res.config, result: res })
      setDatasetName(`${f.name.replace(/\.[^.]+$/, '')} - ${sheetName}`)
    } catch (e) {
      toast({ title: 'خطا در پیش‌نمایش', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const reconfigure = async (opts: Partial<{ headerRow: number; firstDataRow: number; lastDataRow: number; mergedPolicy: string }>) => {
    if (!preview) return
    const cfg = { ...preview.config, ...opts }
    try {
      const res = await api.get<{
        headers: string[]; rowCount: number; previewRows: string[][]; warnings: string[]
        fields: { id: string; label: string; type: string; confidence: number; role: string }[]
        config: typeof cfg
      }>(`/api/files/${preview.fileId}/preview?sheet=${encodeURIComponent(preview.sheet.name)}&mode=preview`
        + `&headerRow=${cfg.headerRow}&firstDataRow=${cfg.firstDataRow}&lastDataRow=${cfg.lastDataRow}`
        + `&mergedPolicy=${cfg.mergedPolicy}&skipTotalRows=true`)
      setPreview({ ...preview, config: res.config, result: res })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const createDataset = async () => {
    if (!preview) return
    setCreating(true)
    try {
      const res = await api.post<{ datasetId: string; rowCount: number; fieldCount: number; warnings: string[] }>('/api/datasets', {
        fileId: preview.fileId,
        sheetName: preview.sheet.name,
        name: datasetName,
        headerRow: preview.config.headerRow,
        firstDataRow: preview.config.firstDataRow,
        lastDataRow: preview.config.lastDataRow,
        mergedPolicy: preview.config.mergedPolicy,
        skipTotalRows: true,
      })
      toast({
        title: 'مجموعه‌داده ساخته شد',
        description: `${formatNumber(res.rowCount)} رکورد و ${res.fieldCount} ستون با تشخیص خودکار نوع داده آماده شد. اکنون مشخصات ستون‌ها را تأیید کنید.`,
      })
      setPreview(null)
      onDatasetCreated(res.datasetId)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* بارگذاری فایل — بخش ۷.۱ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Upload className="size-4" /> بارگذاری فایل‌ها</CardTitle>
          <CardDescription>
            پشتیبانی از XLSX و CSV با چند شیت، سرستون در سطرهای بعدی، سلول‌های ادغام‌شده و ساختارهای نامنظم (بخش‌های ۳.۱ و ۳.۲ سند)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
          >
            {uploading ? (
              <Loader2 className="size-10 animate-spin text-primary" />
            ) : (
              <FileSpreadsheet className="size-10 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">فایل‌ها را اینجا رها کنید یا</p>
              <Button variant="link" onClick={() => inputRef.current?.click()} className="px-0">
                از رایانه انتخاب کنید
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">حفظ داده خام: فایل اصلی تغییر نمی‌کند و هر فایل با اثر انگشت محتوا ثبت می‌شود (بخش ۴ و ۷.۱ سند)</p>
            <input
              ref={inputRef} type="file" className="hidden" multiple
              accept=".xlsx,.xls,.csv,.tsv,.xlsm"
              onChange={e => upload(e.target.files)}
              aria-label="انتخاب فایل اکسل"
            />
          </div>
          {/* نمونه فایل‌های واقعی — بخش ۳۶ سند: نمونه فایل‌های واقعی برای آزمون */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3">
            <FileDown className="size-4 text-primary" />
            <span className="text-xs text-muted-foreground">فاقد فایل سازمانی برای آزمون؟ مجموعه نمونه نامنظم (تراکنش‌ها، مشتریان، محصولات) را دریافت و سناریوی آزمون اتصال را اجرا کنید:</span>
            <a href="/samples/۱-تراکنش‌های-فروش-مهر-و-آبان.xlsx" download className="text-xs font-medium text-primary hover:underline">تراکنش‌های فروش (دوره ۱)</a>
            <a href="/samples/۲-تراکنش‌های-فروش-آذر.xlsx" download className="text-xs font-medium text-primary hover:underline">تراکنش‌های فروش (دوره ۲)</a>
            <a href="/samples/۳-فهرست-مشتریان.xlsx" download className="text-xs font-medium text-primary hover:underline">مشتریان</a>
            <a href="/samples/۴-فهرست-محصولات.xlsx" download className="text-xs font-medium text-primary hover:underline">محصولات</a>
            <a href="/samples/سناریوی-آزمون.txt" download className="text-[11px] text-muted-foreground hover:underline">سناریوی آزمون</a>
          </div>
        </CardContent>
      </Card>

      {/* فهرست فایل‌ها */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Layers className="size-4" /> فایل‌های پروژه «{activeProjectName}»</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map(f => {
              const sheets: SheetInfo[] = JSON.parse(f.sheetInfo || '[]')
              return (
                <div key={f.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="size-5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(f.size / 1024)} کیلوبایت | اثر انگشت: {f.fingerprint.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteFile(f)} aria-label={`حذف ${f.name}`}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sheets.map(s => (
                      <Button key={s.name} variant="outline" size="sm" className="gap-2" onClick={() => openPreview(f, s.name)}>
                        <Table2 className="size-3.5" />
                        {s.name}
                        <Badge variant="secondary" className="text-[10px]">{formatNumber(s.rows)}×{formatNumber(s.cols)}</Badge>
                        {s.mergedCells > 0 && <AlertTriangle className="size-3.5 text-amber-500" />}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* گفت‌وگوی پیش‌نمایش و پیکربندی — بخش ۶ (مرحله سوم و چهارم) */}
      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>بررسی ساختار و ایجاد مجموعه‌داده</DialogTitle>
            <DialogDescription>
              فایل «{preview?.fileName}» | شیت «{preview?.sheet.name}» — پیشنهادهای سامانه را بازبینی و اصلاح کنید
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* هشدارهای شناسایی */}
              {preview.sheet.warnings.length > 0 && (
                <Alert>
                  <Info className="size-4" />
                  <AlertTitle>نکات شناسایی ساختار (بخش ۳.۲ و ۷ سند)</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc ps-4 space-y-1 mt-1">
                      {preview.sheet.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* پیکربندی */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>سطر سرستون</Label>
                  <Select
                    value={String(preview.config.headerRow)}
                    onValueChange={v => reconfigure({ headerRow: +v, firstDataRow: +v + 1 })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.min(15, preview.sheet.rows) }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          سطر {i + 1}
                          {i === preview.sheet.headerCandidate ? ' (پیشنهاد سامانه)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>نخستین سطر داده</Label>
                  <Input
                    type="number" min={0} value={preview.config.firstDataRow}
                    onChange={e => reconfigure({ firstDataRow: Math.max(+e.target.value, preview.config.headerRow + 1) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>آخرین سطر داده (۰ = تا پایان)</Label>
                  <Input
                    type="number" min={0} value={preview.config.lastDataRow}
                    onChange={e => reconfigure({ lastDataRow: +e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>سیاست سلول ادغام‌شده (بخش ۷.۲)</Label>
                  <Select value={preview.config.mergedPolicy} onValueChange={v => reconfigure({ mergedPolicy: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fill-down">پرکردن در سطرهای زیرین</SelectItem>
                      <SelectItem value="fill-right">پرکردن در ستون‌های بعدی</SelectItem>
                      <SelectItem value="fill-both">پرکردن در هر دو جهت</SelectItem>
                      <SelectItem value="keep-original">حفظ مقدار در سلول اصلی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>نام مجموعه‌داده</Label>
                <Input value={datasetName} onChange={e => setDatasetName(e.target.value)} />
              </div>

              {/* پیش‌نمایش داده — بخش ۷.۱ */}
              <div className="min-h-0 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5"><Eye className="size-3.5" /> پیش‌نمایش داده (۱۵ سطر از {formatNumber(preview.result.rowCount)} رکورد)</Label>
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="size-3" /> {preview.result.headers.length} ستون شناسایی شد
                  </Badge>
                </div>
                <ScrollArea className="h-56 rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        {preview.result.headers.map((h, i) => (
                          <TableHead key={i} className="whitespace-nowrap text-xs">
                            {h}
                            <div className="font-normal text-muted-foreground mt-0.5">
                              {preview.result.fields[i] && (
                                <>
                                  {typeLabel(preview.result.fields[i].type)}
                                  {` | اطمینان ${Math.round(preview.result.fields[i].confidence * 100)}٪`}
                                </>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.result.previewRows.map((row, ri) => (
                        <TableRow key={ri}>
                          {row.map((cell, ci) => (
                            <TableCell key={ci} className="text-xs whitespace-nowrap max-w-48 truncate">{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {preview.result.warnings.length > 0 && (
                  <Alert className="mt-3">
                    <AlertTriangle className="size-4" />
                    <AlertDescription>
                      <ul className="list-disc ps-4 space-y-1">
                        {preview.result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex justify-end gap-2 pb-2">
                <Button variant="outline" onClick={() => setPreview(null)}>انصراف</Button>
                <Button onClick={createDataset} disabled={creating || preview.result.rowCount === 0} className="gap-2">
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
                  ایجاد مجموعه‌داده
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function typeLabel(t: string): string {
  const map: Record<string, string> = {
    text: 'متن', integer: 'عدد صحیح', decimal: 'اعشاری', amount: 'مبلغ', percent: 'درصد',
    date: 'تاریخ', time: 'زمان', datetime: 'تاریخ و زمان', boolean: 'منطقی', category: 'دسته‌بندی',
    identifier: 'شناسه', geo: 'مکانی',
  }
  return map[t] ?? t
}
