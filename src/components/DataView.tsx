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
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { formatNumber } from '@/lib/currency'
import { Tip } from './HelpTip'
import {
  Upload, FileSpreadsheet, Trash2, Database, AlertTriangle, CheckCircle2, FileDown,
  Loader2, Table2, Eye, Layers, Info, Combine, CheckCheck, XCircle, Sparkles,
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

// برچسب مراحل پایپ‌لاین خودکار — تجربه یک‌کلیکی پس از بارگذاری
const AUTO_STEP_LABELS: Record<string, string> = {
  detect: 'شناسایی ساختار',
  dataset: 'ساخت مجموعه‌داده',
  merge: 'تجمیع فایل‌های هم‌فرم',
  dash: 'تحلیل و داشبورد هوشمند',
}

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

  // ── تجمیع چند فایل هم‌فرم ──
  const [selectedFiles, setSelectedFiles] = useState<Record<string, string>>({}) // fileId → sheetName
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeCheck, setMergeCheck] = useState<null | {
    allMatch: boolean
    mismatch: { fileName: string; missing: string[]; extra: string[] }[]
    perFile: { fileId: string; fileName: string; sheetName: string; headers: string[]; rowCount: number; headerRow: number; ok: boolean; message?: string }[]
    totalRows: number
    headers: string[]
  }>(null)
  const [mergeName, setMergeName] = useState('')
  const [merging, setMerging] = useState(false)
  const [checking, setChecking] = useState(false)

  // ── پایپ‌لاین خودکار: بارگذاری ← مجموعه‌داده ← داشبورد هوشمند (بدون هیچ کلیک اضافه) ──
  const [autoBusy, setAutoBusy] = useState(false)
  const [autoStage, setAutoStage] = useState('')
  const [autoSteps, setAutoSteps] = useState<string[]>([])
  const [autoDetail, setAutoDetail] = useState('')

  const selectedCount = Object.keys(selectedFiles).length
  const toggleSelect = (f: ProjectFile, sheetName: string) => {
    setSelectedFiles(prev => {
      const next = { ...prev }
      if (next[f.id]) delete next[f.id]
      else next[f.id] = sheetName
      return next
    })
  }
  const openMergeDialog = async () => {
    if (selectedCount < 2) return
    setMergeOpen(true)
    setChecking(true)
    setMergeCheck(null)
    try {
      const res = await api.post<typeof mergeCheck & object>('/api/files/merge', {
        projectId,
        dryRun: true,
        items: Object.entries(selectedFiles).map(([fileId, sheetName]) => ({ fileId, sheetName })),
      })
      setMergeCheck(res)
    } catch (e) {
      toast({ title: 'خطا در بررسی ساختار فایل‌ها', description: e instanceof Error ? e.message : '', variant: 'destructive' })
      setMergeOpen(false)
    } finally {
      setChecking(false)
    }
  }
  const executeMerge = async () => {
    setMerging(true)
    try {
      const res = await api.post<{ datasetId: string; rowCount: number; fieldCount: number; sourceCount: number; error?: string }>('/api/files/merge', {
        projectId,
        dryRun: false,
        name: mergeName.trim() || undefined,
        items: Object.entries(selectedFiles).map(([fileId, sheetName]) => ({ fileId, sheetName })),
      })
      if (res.error) {
        toast({ title: 'تجمیع انجام نشد', description: res.error, variant: 'destructive' })
        return
      }
      toast({
        title: 'تجمیع کامل شد',
        description: `${formatNumber(res.rowCount)} رکورد از ${formatNumber(res.sourceCount)} فایل در یک مجموعه‌داده یکپارچه شد؛ داشبورد هوشمند ساخته می‌شود.`,
      })
      setMergeOpen(false)
      setSelectedFiles({})
      setMergeCheck(null)
      setMergeName('')
      onDatasetCreated(res.datasetId)
    } catch (e) {
      toast({ title: 'خطا در تجمیع', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setMerging(false)
    }
  }

  // بهترین برگه برای ساخت خودکار: بیشترین ناحیه داده با کمترین اخطار و سلول ادغام‌شده
  const pickBestSheet = (sheets: SheetInfo[]): SheetInfo | null => {
    const usable = sheets.filter(s => s.cols >= 2 && s.dataEndRow >= s.dataStartRow && s.dataEndRow - s.dataStartRow >= 1)
    if (usable.length === 0) return null
    const score = (s: SheetInfo) =>
      (s.dataEndRow - s.dataStartRow + 1) * s.cols - s.mergedCells * 2 - s.warnings.length * 5
    return [...usable].sort((a, b) => score(b) - score(a))[0]
  }

  const createDatasetAuto = async (fileId: string, sheetName: string, fileName: string) =>
    api.post<{ datasetId: string; rowCount: number; fieldCount: number }>('/api/datasets', {
      fileId,
      sheetName,
      name: `${fileName.replace(/\.[^.]+$/, '')} - ${sheetName}`,
    })

  const autoFail = (title: string, message: string) =>
    toast({ title, description: `${message} می‌توانید از دکمه‌های شیت، پیکربندی دستی را انجام دهید.`, variant: 'destructive' })

  // پایپ‌لاین ساخت خودکار: یک فایل ← بهترین برگه؛ چند فایل ← تجمیع خودکار هم‌فرم‌ها
  const autoPipeline = async (newFiles: { fileId: string; name: string; sheets: SheetInfo[] }[]) => {
    const multi = newFiles.length > 1
    setAutoSteps(multi ? ['detect', 'dataset', 'merge', 'dash'] : ['detect', 'dataset', 'dash'])
    const candidates = newFiles
      .map(f => ({ f, best: pickBestSheet(f.sheets) }))
      .filter((x): x is { f: { fileId: string; name: string; sheets: SheetInfo[] }; best: SheetInfo } => x.best !== null)
    if (candidates.length === 0) {
      autoFail('ساخت خودکار انجام نشد', 'در فایل(های) بارگذاری‌شده ناحیه داده قابل استخراج شناسایی نشد.')
      return
    }
    try {
      if (!multi) {
        const { f, best } = candidates[0]
        setAutoStage('dataset'); setAutoDetail(f.name)
        const res = await createDatasetAuto(f.fileId, best.name, f.name)
        setAutoStage('dash')
        toast({
          title: 'داشبورد هوشمند آماده شد',
          description: `از شیت «${best.name}» با ${formatNumber(res.rowCount)} رکورد، مجموعه‌داده و داشبورد هوشمند به‌طور خودکار ساخته شد.`,
        })
        onDatasetCreated(res.datasetId)
        return
      }
      // چند فایل: ابتدا بررسی هم‌فرم بودن، سپس تجمیع خودکار
      setAutoStage('merge'); setAutoDetail(`${formatNumber(candidates.length)} فایل`)
      const items = candidates.map(x => ({ fileId: x.f.fileId, sheetName: x.best.name }))
      const check = await api.post<typeof mergeCheck & object>('/api/files/merge', { projectId, dryRun: true, items })
      if (check.allMatch) {
        const res = await api.post<{ datasetId: string; rowCount: number; sourceCount: number }>('/api/files/merge', {
          projectId, dryRun: false, name: `تجمیع خودکار ${candidates.length} فایل`, items,
        })
        setAutoStage('dash')
        toast({
          title: 'تجمیع خودکار و داشبورد هوشمند آماده شد',
          description: `${formatNumber(res.rowCount)} رکورد از ${formatNumber(res.sourceCount)} فایل یکپارچه شد و داشبورد هوشمند ساخته شد.`,
        })
        onDatasetCreated(res.datasetId)
      } else {
        // ساختار فایل‌ها یکسان نیست ← بزرگ‌ترین فایل به‌عنوان مجموعه‌داده اصلی
        const sorted = [...candidates].sort((a, b) =>
          (b.best.dataEndRow - b.best.dataStartRow) - (a.best.dataEndRow - a.best.dataStartRow))
        const first = sorted[0]
        setAutoStage('dataset'); setAutoDetail(first.f.name)
        const res = await createDatasetAuto(first.f.fileId, first.best.name, first.f.name)
        setAutoStage('dash')
        toast({
          title: 'ساختار فایل‌ها یکسان نبود',
          description: `مجموعه‌داده و داشبورد از «${first.f.name}» ساخته شد؛ برای تجمیع سایر فایل‌ها، آن‌ها را در فهرست تیک بزنید و «تجمیع» را بزنید.`,
        })
        onDatasetCreated(res.datasetId)
      }
    } catch (e) {
      autoFail('ساخت خودکار داشبورد انجام نشد', e instanceof Error ? e.message : 'خطای ناشناخته.')
    }
  }

  // ساخت خودکار برای فایل‌های قبلاً بارگذاری‌شده (بدون بارگذاری مجدد)
  const autoCreateFromFile = async (f: ProjectFile) => {
    const sheets: SheetInfo[] = JSON.parse(f.sheetInfo || '[]')
    setAutoBusy(true)
    try {
      await autoPipeline([{ fileId: f.id, name: f.name, sheets }])
    } finally {
      setAutoBusy(false); setAutoStage(''); setAutoDetail('')
    }
  }

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
    setAutoBusy(true)
    setAutoSteps(fileList.length > 1 ? ['detect', 'dataset', 'merge', 'dash'] : ['detect', 'dataset', 'dash'])
    setAutoStage('detect')
    try {
      const newFiles: { fileId: string; name: string; sheets: SheetInfo[] }[] = []
      const dupNames: string[] = []
      for (const f of Array.from(fileList)) {
        const form = new FormData()
        form.append('file', f)
        form.append('projectId', projectId)
        const res = await api.postForm<{ duplicate: boolean; message?: string; fileId?: string; detection?: { sheets: SheetInfo[] } }>('/api/files/upload', form)
        if (res.duplicate || !res.fileId) {
          dupNames.push(f.name)
          continue
        }
        newFiles.push({ fileId: res.fileId, name: f.name, sheets: res.detection?.sheets ?? [] })
      }
      if (dupNames.length > 0) toast({ title: 'فایل تکراری', description: `${dupNames.join('، ')} قبلاً بارگذاری شده بود (تشخیص اثر انگشت — بخش ۷.۱ سند).` })
      if (newFiles.length > 0) {
        await loadFiles()
        // تجربه هوشمند: بدون هیچ کلیک اضافه، مجموعه‌داده و داشبورد هوشمند ساخته می‌شود
        await autoPipeline(newFiles)
      }
    } catch (e) {
      toast({ title: 'خطا در بارگذاری', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setUploading(false)
      setAutoBusy(false)
      setAutoStage('')
      setAutoDetail('')
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
            پس از بارگذاری، سامانه به‌طور خودکار بهترین برگه را انتخاب می‌کند، مجموعه‌داده می‌سازد و داشبورد هوشمند را نمایش می‌دهد — چند فایل هم‌فرم هم به‌طور خودکار تجمیع می‌شود (بخش‌های ۳.۱، ۳.۲ و ۶ سند)
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
              <Tip label="گام ۱ از مسیر: فایل اکسل (XLSX/XLS/XLSM) یا CSV را انتخاب کنید — چند فایل هم‌زمان مجاز است">
                <Button variant="link" onClick={() => inputRef.current?.click()} className="px-0">
                  از رایانه انتخاب کنید
                </Button>
              </Tip>
            </div>
            <p className="text-xs text-muted-foreground">پس از بارگذاری، ساخت داشبورد هوشمند به‌طور خودکار انجام می‌شود | حفظ داده خام: فایل اصلی تغییر نمی‌کند و هر فایل با اثر انگشت محتوا ثبت می‌شود (بخش ۴ و ۷.۱ سند)</p>
            <input
              ref={inputRef} type="file" className="hidden" multiple
              accept=".xlsx,.xls,.csv,.tsv,.xlsm"
              onChange={e => upload(e.target.files)}
              aria-label="انتخاب فایل اکسل"
            />
          </div>
          {/* نوار پیشرفت پایپ‌لاین خودکار — تجربه یک‌کلیکی */}
          {autoBusy && autoSteps.length > 0 && (
            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <Loader2 className="size-4 animate-spin" />
                در حال ساخت داشبورد هوشمند{autoDetail ? ` برای «${autoDetail}»` : ''}…
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {autoSteps.map((s, i) => {
                  const cur = autoSteps.indexOf(autoStage)
                  const done = cur > -1 && i < cur
                  const active = s === autoStage
                  return (
                    <span key={s} className={`flex items-center gap-1.5 text-xs ${active ? 'font-semibold text-primary' : done ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {done ? <CheckCircle2 className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : <span className="inline-block size-3.5 rounded-full border" aria-hidden />}
                      {i + 1}. {AUTO_STEP_LABELS[s] ?? s}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          {/* نمونه فایل‌های واقعی — بخش ۳۶ سند: نمونه فایل‌های واقعی برای آزمون */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3">
            <FileDown className="size-4 text-primary" />
            <span className="text-xs text-muted-foreground">فاقد فایل سازمانی برای آزمون؟ مجموعه نمونه نامنظم (تراکنش‌ها، مشتریان، محصولات) را دریافت و سناریوی آزمون اتصال را اجرا کنید:</span>
            <a href="/samples/۱-تراکنش‌های-فروش-مهر-و-آبان.xlsx" download className="text-xs font-medium text-primary hover:underline">تراکنش‌های فروش (دوره ۱)</a>
            <a href="/samples/۲-تراکنش‌های-فروش-آذر.xlsx" download className="text-xs font-medium text-primary hover:underline">تراکنش‌های فروش (دوره ۲)</a>
            <a href="/samples/۳-فهرست-مشتریان.xlsx" download className="text-xs font-medium text-primary hover:underline">مشتریان</a>
            <a href="/samples/۴-فهرست-محصولات.xlsx" download className="text-xs font-medium text-primary hover:underline">محصولات</a>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <span className="text-[11px] text-muted-foreground">قالب‌های هوشمند:</span>
            <a href="/samples/نمونه-فیش-حقوقی-مهر.xlsx" download className="text-xs font-medium text-primary hover:underline">فیش حقوقی (مهر)</a>
            <a href="/samples/نمونه-فیش-حقوقی-آبان.xlsx" download className="text-xs font-medium text-primary hover:underline">فیش حقوقی (آبان)</a>
            <a href="/samples/نمونه-صورت-مالی.xlsx" download className="text-xs font-medium text-primary hover:underline">صورت مالی</a>
            <a href="/samples/نمونه-سود-محصولات.xlsx" download className="text-xs font-medium text-primary hover:underline">سود محصولات</a>
            <a href="/samples/سناریوی-آزمون.txt" download className="text-[11px] text-muted-foreground hover:underline">سناریوی آزمون</a>
          </div>
        </CardContent>
      </Card>

      {/* فهرست فایل‌ها */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Layers className="size-4" /> فایل‌های پروژه «{activeProjectName}»</CardTitle>
            <CardDescription>
              دکمه «ساخت خودکار داشبورد» بهترین برگه را انتخاب و داشبورد را فوری می‌سازد | برای تجمیع چند فایل هم‌فرم (مثلاً فیش حقوقی چند ماه)، فایل‌ها را تیک بزنید و «تجمیع» را بزنید — ساختار فایل‌ها به‌صورت خودکار مقایسه می‌شود
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCount >= 2 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
                <p className="flex items-center gap-2 text-sm">
                  <Combine className="size-4 text-primary" />
                  <span>{formatNumber(selectedCount)} فایل برای تجمیع انتخاب شده است</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFiles({})}>لغو انتخاب</Button>
                  <Tip label="بررسی هم‌فرم بودن فایل‌ها و ساخت یک مجموعه‌داده یکپارچه + داشبورد و گزارش هوشمند">
                    <Button size="sm" className="gap-1.5" onClick={openMergeDialog} disabled={checking}>
                      {checking ? <Loader2 className="size-4 animate-spin" /> : <Combine className="size-4" />}
                      تجمیع و ساخت داشبورد
                    </Button>
                  </Tip>
                </div>
              </div>
            )}
            {files.map(f => {
              const sheets: SheetInfo[] = JSON.parse(f.sheetInfo || '[]')
              const isSelected = !!selectedFiles[f.id]
              return (
                <div key={f.id} className={`rounded-lg border p-4 space-y-3 ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(f, sheets[0]?.name ?? '')}
                        aria-label={`انتخاب ${f.name} برای تجمیع`}
                        className="shrink-0"
                      />
                      <FileSpreadsheet className="size-5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(f.size / 1024)} کیلوبایت | اثر انگشت: {f.fingerprint.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tip label="ساخت خودکار مجموعه‌داده از بهترین برگه و نمایش فوری داشبورد هوشمند — بدون پیکربندی دستی">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => autoCreateFromFile(f)} disabled={autoBusy}>
                          <Sparkles className="size-3.5 text-primary" />
                          ساخت خودکار داشبورد
                        </Button>
                      </Tip>
                      <Button variant="ghost" size="icon" onClick={() => deleteFile(f)} aria-label={`حذف ${f.name}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
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
                    {isSelected && sheets.length > 1 && (
                      <div className="w-44">
                        <Select value={selectedFiles[f.id] ?? sheets[0]?.name} onValueChange={v => setSelectedFiles(prev => ({ ...prev, [f.id]: v }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="شیت برای تجمیع" /></SelectTrigger>
                          <SelectContent>
                            {sheets.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                          {(Array.isArray(row) ? row : []).map((cell, ci) => (
                            <TableCell key={ci} className="text-xs whitespace-nowrap max-w-48 truncate">{cell === null || cell === undefined ? '' : String(cell)}</TableCell>
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

      {/* گفت‌وگوی تجمیع چند فایل هم‌فرم */}
      <Dialog open={mergeOpen} onOpenChange={o => { if (!o) { setMergeOpen(false); setMergeCheck(null) } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Combine className="size-4 text-primary" /> تجمیع فایل‌های هم‌فرم</DialogTitle>
            <DialogDescription>
              ساختار فایل‌های انتخابی مقایسه می‌شود؛ اگر همه هم‌فرم باشند، رکوردها در یک مجموعه‌داده یکپارچه می‌شوند و ستون «فایل مبدأ» افزوده می‌گردد.
            </DialogDescription>
          </DialogHeader>
          {checking ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> در حال مقایسه ساختار فایل‌ها…
            </div>
          ) : mergeCheck ? (
            <div className="flex flex-col gap-4 overflow-hidden">
              {mergeCheck.allMatch ? (
                <Alert className="border-emerald-500/40 bg-emerald-500/5">
                  <CheckCheck className="size-4 text-emerald-600" />
                  <AlertTitle className="text-sm">ساختار همه فایل‌ها هم‌فرم است</AlertTitle>
                  <AlertDescription className="text-xs">
                    جمعاً {formatNumber(mergeCheck.totalRows)} رکورد از {formatNumber(mergeCheck.perFile.filter(p => p.ok).length)} فایل تجمیع خواهد شد ({formatNumber(mergeCheck.headers.length)} ستون + ستون «فایل مبدأ»).
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="size-4" />
                  <AlertTitle className="text-sm">ساختار فایل‌ها یکسان نیست</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc ps-4 space-y-1 text-xs">
                      {mergeCheck.mismatch.map((m, i) => (
                        <li key={i}>
                          «{m.fileName}»:
                          {m.missing.length > 0 && <span> ستون‌های جاافتاده: {m.missing.join('، ')}</span>}
                          {m.extra.length > 0 && <span>{m.missing.length > 0 ? ' | ' : ''}ستون‌های اضافه: {m.extra.join('، ')}</span>}
                        </li>
                      ))}
                      {mergeCheck.perFile.filter(p => !p.ok).map(p => <li key={p.fileId}>«{p.fileName}»: {p.message}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="min-h-0 flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">فایل</TableHead>
                      <TableHead className="text-xs">شیت</TableHead>
                      <TableHead className="text-xs">ستون‌های شناسایی‌شده</TableHead>
                      <TableHead className="text-xs">رکورد</TableHead>
                      <TableHead className="text-xs">وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergeCheck.perFile.map(p => (
                      <TableRow key={p.fileId}>
                        <TableCell className="text-xs max-w-40 truncate">{p.fileName}</TableCell>
                        <TableCell className="text-xs">{p.sheetName}</TableCell>
                        <TableCell className="text-xs max-w-72 truncate text-muted-foreground">{p.headers.join('، ')}</TableCell>
                        <TableCell className="text-xs">{formatNumber(p.rowCount)}</TableCell>
                        <TableCell>
                          {p.ok ? <Badge className="gap-1 bg-emerald-600"><CheckCircle2 className="size-3" /> آماده</Badge> : <Badge variant="destructive" className="gap-1"><XCircle className="size-3" /> نامعتبر</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {mergeCheck.allMatch && (
                <div className="space-y-1.5">
                  <Label>نام مجموعه‌داده تجمیع‌شده</Label>
                  <Input value={mergeName} onChange={e => setMergeName(e.target.value)} placeholder={`تجمیع ${formatNumber(mergeCheck.perFile.filter(p => p.ok).length)} فایل`} />
                </div>
              )}

              <div className="flex justify-end gap-2 pb-2">
                <Button variant="outline" onClick={() => { setMergeOpen(false); setMergeCheck(null) }}>انصراف</Button>
                <Button onClick={executeMerge} disabled={merging || checking || !mergeCheck.allMatch} className="gap-2">
                  {merging ? <Loader2 className="size-4 animate-spin" /> : <Combine className="size-4" />}
                  تجمیع و ساخت داشبورد هوشمند
                </Button>
              </div>
            </div>
          ) : null}
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
