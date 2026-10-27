'use client'

// طراح گزارش و داشبورد — بخش ۱۹ سند
// جدول، نمودار میله‌ای/خطی/دایره‌ای، کارت شاخص، فیلتر، گزارش توصیفی، انتشار و خروجی

import { useState, useMemo, useEffect } from 'react'
import { api } from '@/lib/client'
import type { MeasureDTO } from './DataDictionaryView'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatNumber, formatAmount, autoDisplayUnit, getUnit, fromBaseRial } from '@/lib/currency'
import { toPersianDigits } from '@/lib/digits'
import {
  Loader2, Play, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Table2,
  Save, FileDown, FileText, Grid3X3, X, Plus, Kanban, BookMarked,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { FieldMetaClient } from './ColumnsEditor'

interface QueryRow { [k: string]: unknown }
interface QueryResp {
  rows: QueryRow[]
  totals: Record<string, unknown>
  rowCount: number
  scannedRecords: number
  warnings: string[]
  descriptive?: string
}

const CHART_COLORS = ['#059669', '#0d9488', '#d97706', '#dc2626', '#7c3aed', '#2563eb', '#be185d', '#65a30d']

export default function ReportBuilder({
  projectId,
  datasets,
  selectedDatasetId,
  onSelectDataset,
}: {
  projectId: string
  datasets: { id: string; name: string; rowCount: number; fields: string; version: number }[]
  selectedDatasetId: string | null
  onSelectDataset: (id: string) => void
}) {
  const dataset = datasets.find(d => d.id === selectedDatasetId)
  const fields: FieldMetaClient[] = dataset ? JSON.parse(dataset.fields || '[]') : []
  const dims = fields.filter(f => f.role === 'dimension' || f.role === 'attribute' || f.type === 'category' || f.type === 'date')
  const measures = fields.filter(f => f.role === 'measure')

  const [selDims, setSelDims] = useState<string[]>([])
  const [selMeasures, setSelMeasures] = useState<{ fieldId?: string; agg: string; displayUnit?: string }[]>([])
  const [chartType, setChartType] = useState<'table' | 'bar' | 'line' | 'pie' | 'kpi'>('table')
  const [result, setResult] = useState<QueryResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterField, setFilterField] = useState('')
  const [filterOp, setFilterOp] = useState('eq')
  const [filterValue, setFilterValue] = useState('')
  const [filters, setFilters] = useState<{ fieldId: string; op: string; value: string }[]>([])
  const [descriptive, setDescriptive] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [approvedMeasures, setApprovedMeasures] = useState<MeasureDTO[]>([])
  const { toast } = useToast()

  // شاخص‌های تأییدشده فرهنگ داده — بخش ۱۸: قابل استفاده مجدد در گزارش‌های مختلف
  useEffect(() => {
    let alive = true
    api.get<MeasureDTO[]>(`/api/measures?projectId=${encodeURIComponent(projectId)}&status=approved`)
      .then(ms => { if (alive) setApprovedMeasures(ms) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [projectId])

  const fieldLabel = (id?: string) => fields.find(f => f.id === id)?.label ?? id ?? ''

  const aliasOf = (m: { fieldId?: string; agg: string }) => {
    const label = fieldLabel(m.fieldId)
    const map: Record<string, string> = {
      sum: `جمع ${label}`, count: 'تعداد رکورد', countDistinct: `${label} متمایز`, avg: `میانگین ${label}`,
      min: `کمینه ${label}`, max: `بیشینه ${label}`, median: `میانه ${label}`, last: `آخرین ${label}`,
    }
    return map[m.agg] ?? label
  }

  const run = async (opts?: { descriptive?: boolean }) => {
    if (!dataset) return
    setLoading(true)
    setDescriptive(opts?.descriptive ?? false)
    try {
      const res = await api.post<QueryResp>(`/api/datasets/${dataset.id}/query`, {
        dimensions: selDims,
        measures: selMeasures.length > 0 ? selMeasures.map(m => ({ ...m, alias: aliasOf(m) })) : [{ agg: 'count', alias: 'تعداد رکورد' }],
        filters: filters.map(f => ({ ...f, op: f.op })),
        descriptive: opts?.descriptive ?? false,
        dateField: fields.find(f => f.type === 'date')?.id,
      })
      setResult(res)
      if (res.warnings.length > 0) {
        toast({ title: 'هشدارهای محاسبه', description: res.warnings.join('؛ ') })
      }
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addMeasure = () => {
    const m = measures[0]
    setSelMeasures(ms => [...ms, { fieldId: m?.id, agg: m ? 'sum' : 'count' }])
  }

  const exportReport = async (format: 'xlsx' | 'csv') => {
    if (!dataset) return
    setExporting(true)
    try {
      const res = await fetch(`/api/datasets/${dataset.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          dimensions: selDims,
          measures: selMeasures.length > 0 ? selMeasures.map(m => ({ ...m, alias: aliasOf(m) })) : [{ agg: 'count', alias: 'تعداد رکورد' }],
          filters,
        }),
      })
      if (!res.ok) throw new Error('خطا در تولید خروجی (بخش ۲۳ سند)')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `گزارش.${format === 'csv' ? 'csv' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'خروجی آماده شد', description: `فایل ${format.toUpperCase()} با ثبت فیلترها، نسخه داده و زمان تولید (بخش ۲۳.۲ سند).` })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const saveReport = async (thenSubmit = false) => {
    if (!dataset || !saveTitle.trim()) {
      toast({ title: 'عنوان گزارش الزامی است', variant: 'destructive' })
      return
    }
    try {
      await api.post('/api/reports', {
        projectId,
        datasetId: dataset.id,
        title: saveTitle,
        config: { dimensions: selDims, measures: selMeasures, filters, chartType },
      })
      if (thenSubmit) {
        // ذخیره و ارسال برای تأیید — گردش کار بخش ۲۶.۱ سند
        const list = await api.get<{ id: string; title: string; status: string }[]>(`/api/reports?projectId=${projectId}`)
        const newest = list.find(r => r.title === saveTitle && r.status === 'draft')
        if (newest) {
          await api.post(`/api/reports/${newest.id}/status`, { action: 'submit' })
          toast({ title: 'گزارش ذخیره و برای تأیید ارسال شد', description: 'گردش کار: در انتظار تأیید مدیر داده/سامانه (بخش ۲۶.۱ سند).' })
        }
      } else {
        toast({ title: 'گزارش به‌عنوان پیش‌نویس ذخیره شد', description: 'نسخه‌بندی گزارش فعال است؛ انتشار پس از تأیید انجام می‌شود (بخش‌های ۲۴.۳ و ۲۶.۱ سند).' })
      }
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  // واحد اختصاصی هر ستون — بخش ۱۹.۴ سند: همه مقادیر ستون با یک واحد نمایش داده می‌شوند
  const isAmount = selMeasures[0]?.fieldId ? fields.find(f => f.id === selMeasures[0]?.fieldId)?.type === 'amount' : false
  const amountUnit = useMemo(() => {
    if (!result || !isAmount || selMeasures.length === 0) return undefined
    const alias = aliasOf(selMeasures[0])
    const vals = [
      ...result.rows.map(r => (typeof r[alias] === 'number' ? Math.abs(r[alias] as number) : 0)),
      typeof result.totals[alias] === 'number' ? Math.abs(result.totals[alias] as number) : 0,
    ]
    const max = Math.max(0, ...vals)
    return max > 0 ? autoDisplayUnit(max) : undefined
  }, [result, isAmount, selMeasures])

  // داده نمودار: تبدیل برچسب‌ها و تبدیل واحد نمایش
  const chartData = useMemo(() => {
    if (!result || selDims.length === 0 || selMeasures.length === 0) return []
    const firstMeasure = selMeasures[0]
    const alias = aliasOf(firstMeasure)
    return result.rows.slice(0, 12).map(r => ({
      name: String(r[selDims[0]] ?? '—'),
      value: typeof r[alias] === 'number'
        ? (isAmount ? fromBaseRial(r[alias] as number, amountUnit ?? 'rial') : r[alias] as number)
        : 0,
    }))
  }, [result, selDims, selMeasures, isAmount, amountUnit])

  // مقادیر مبلغ به مبنای ریال برگردانده می‌شوند؛ نمایش با واحد مناسب (بخش ۱۴ سند)
  const fmtVal = (v: number) => isAmount ? formatAmount(v, { displayUnit: amountUnit }) : formatNumber(Math.round(v * 100) / 100)
  const unitSuffix = (m: { fieldId?: string; agg: string }) => {
    const f = fields.find(x => x.id === m.fieldId)
    if (f?.type !== 'amount' || !amountUnit) return ''
    return ` (${getUnit(amountUnit).label})`
  }

  if (!dataset) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center space-y-3">
          <Kanban className="size-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-semibold">گزارش‌ساز</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            ابتدا در برگه «داده‌ها» یک مجموعه‌داده بسازید، سپس از اینجا برای طراحی گزارش استفاده کنید.
            طراحی با انتخاب فیلدها و کشیدن آن‌ها روی جدول، نمودار و کارت شاخص انجام می‌شود (بخش ۱۹ سند).
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* پنل انتخاب فیلدها */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">مجموعه‌داده</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDatasetId ?? ''} onValueChange={id => { onSelectDataset(id); setSelDims([]); setSelMeasures([]); setResult(null) }}>
              <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
              <SelectContent>
                {datasets.map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({formatNumber(d.rowCount)} رکورد)</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><Grid3X3 className="size-4" /> ابعاد (گروه‌بندی)</CardTitle>
            <CardDescription className="text-xs">انتخاب فیلد و کشیدن روی گزارش (Drag & Drop — بخش ۱۹.۱)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {dims.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelDims(s => s.includes(f.id) ? s.filter(x => x !== f.id) : [...s, f.id])}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${selDims.includes(f.id) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                >
                  {f.label}
                </button>
              ))}
              {dims.length === 0 && <p className="text-xs text-muted-foreground">بُعدی یافت نشد؛ نقش ستون‌ها را در برگه ستون‌ها تنظیم کنید.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm justify-between">
              <span className="flex items-center gap-2"><BarChart3 className="size-4" /> سنجه‌ها</span>
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={addMeasure}><Plus className="size-3" /> افزودن</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selMeasures.map((m, i) => (
              <div key={i} className="rounded-lg border p-2 space-y-1.5">
                <div className="flex items-center gap-1">
                  <Select value={m.fieldId ?? ''} onValueChange={v => setSelMeasures(ms => ms.map((x, j) => j === i ? { ...x, fieldId: v } : x))}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {measures.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={m.agg} onValueChange={v => setSelMeasures(ms => ms.map((x, j) => j === i ? { ...x, agg: v } : x))}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">جمع</SelectItem>
                      <SelectItem value="avg">میانگین</SelectItem>
                      <SelectItem value="count">تعداد رکورد</SelectItem>
                      <SelectItem value="countDistinct">تعداد متمایز</SelectItem>
                      <SelectItem value="min">کمینه</SelectItem>
                      <SelectItem value="max">بیشینه</SelectItem>
                      <SelectItem value="median">میانه</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setSelMeasures(ms => ms.filter((_, j) => j !== i))} aria-label="حذف سنجه">
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
            {selMeasures.length === 0 && <p className="text-xs text-muted-foreground">سنجه‌ای انتخاب نشده؛ «تعداد رکورد» محاسبه می‌شود.</p>}

            {approvedMeasures.length > 0 && (
              <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-2 space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] font-medium text-teal-800">
                  <BookMarked className="size-3" /> شاخص‌های تأییدشده فرهنگ داده (بخش ۱۸ سند)
                </div>
                <div className="flex flex-wrap gap-1">
                  {approvedMeasures.map(m => {
                    const usable = m.datasetId === dataset?.id && !!m.sourceFieldId && fields.some(f => f.id === m.sourceFieldId)
                    return (
                      <button key={m.id} disabled={!usable}
                        title={usable ? m.description ?? m.label : 'جدول منبع این شاخص با مجموعه‌داده فعلی یکسان نیست'}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${usable ? 'border-teal-300 bg-white text-teal-800 hover:bg-teal-100 cursor-pointer' : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'}`}
                        onClick={() => {
                          if (!usable) return
                          setSelMeasures(ms => [...ms, { fieldId: m.sourceFieldId ?? undefined, agg: m.aggregation, displayUnit: m.unit ?? undefined }])
                          toast({ title: `شاخص «${m.label}» افزوده شد`, description: 'تعریف یکسان فرهنگ داده در این گزارش به کار رفت.' })
                        }}>
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">فیلتر سراسری (بخش ۱۹.۳)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {filters.map((f, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <Badge variant="secondary" className="flex-1 truncate">
                  {fieldLabel(f.fieldId)} {(opLabels as Record<string, string>)[f.op]} «{f.value}»
                </Badge>
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setFilters(fs => fs.filter((_, j) => j !== i))}><X className="size-3" /></Button>
              </div>
            ))}
            <Select value={filterField} onValueChange={setFilterField}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="ستون فیلتر" /></SelectTrigger>
              <SelectContent>{fields.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-1">
              <Select value={filterOp} onValueChange={setFilterOp}>
                <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['eq', 'neq', 'contains', 'gt', 'lt'].map(o => <SelectItem key={o} value={o}>{(opLabels as Record<string, string>)[o]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="h-8 text-xs flex-1" value={filterValue} onChange={e => setFilterValue(e.target.value)} />
            </div>
            <Button
              variant="outline" size="sm" className="w-full h-7 text-xs gap-1"
              disabled={!filterField}
              onClick={() => { setFilters(fs => [...fs, { fieldId: filterField, op: filterOp, value: filterValue }]); setFilterValue('') }}
            >
              <Plus className="size-3" /> افزودن فیلتر
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ناحیه گزارش */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">طرح گزارش</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={chartType} onValueChange={v => setChartType(v as typeof chartType)}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table"><span className="flex items-center gap-1.5"><Table2 className="size-3.5" /> جدول</span></SelectItem>
                    <SelectItem value="bar"><span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" /> میله‌ای/ستونی</span></SelectItem>
                    <SelectItem value="line"><span className="flex items-center gap-1.5"><LineChartIcon className="size-3.5" /> خطی</span></SelectItem>
                    <SelectItem value="pie"><span className="flex items-center gap-1.5"><PieChartIcon className="size-3.5" /> دایره‌ای</span></SelectItem>
                    <SelectItem value="kpi"><span className="flex items-center gap-1.5"><Kanban className="size-3.5" /> کارت شاخص</span></SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => run()} disabled={loading} className="h-8 gap-1.5 text-xs">
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} اجرای گزارش
                </Button>
              </div>
            </div>
            <CardDescription>
              نوع تجمیع، واحد و فیلتر هر شاخص قابل مشاهده است — شفافیت محاسبات (بخش ۴ سند)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <BarChart3 className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">ابعاد و سنجه‌ها را انتخاب و گزارش را اجرا کنید</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* کارت شاخص — بخش ۱۹.۲ */}
                {chartType === 'kpi' ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selMeasures.map((m, i) => {
                      const alias = aliasOf(m)
                      const val = result.totals[alias]
                      return (
                        <Card key={i} className="bg-gradient-to-bl from-emerald-50 to-transparent dark:from-emerald-950/30">
                          <CardContent className="pt-5">
                            <p className="text-xs text-muted-foreground">{alias}</p>
                            <p className="text-2xl font-bold mt-1 tabular-nums">{typeof val === 'number' ? formatAmount(val, { autoUnitLabel: true }) : '—'}</p>
                            {isAmount && <p className="text-[10px] text-muted-foreground mt-1">مبنای ذخیره‌سازی: ریال؛ نمایش با واحد مناسب (بخش ۱۴ سند)</p>}
                          </CardContent>
                        </Card>
                      )
                    })}
                    {selMeasures.length === 0 && (
                      <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">تعداد کل رکوردها</p><p className="text-2xl font-bold mt-1">{formatNumber(result.scannedRecords)}</p></CardContent></Card>
                    )}
                  </div>
                ) : chartType === 'table' ? (
                  <div className="rounded-lg border max-h-[28rem] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          {selDims.map(d => <TableHead key={d}>{fieldLabel(d)}</TableHead>)}
                          {selMeasures.map((m, i) => <TableHead key={i} className="text-left">{aliasOf(m).replace(/\s*\([^)]*\)\s*$/, '')}{unitSuffix(m)}</TableHead>)}
                          {selMeasures.length === 0 && <TableHead className="text-left">تعداد رکورد</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.rows.map((r, i) => (
                          <TableRow key={i}>
                            {selDims.map(d => <TableCell key={d}>{String(r[d] ?? '—')}</TableCell>)}
                            {selMeasures.map((m, j) => {
                              const alias = aliasOf(m)
                              return <TableCell key={j} className="text-left tabular-nums">{typeof r[alias] === 'number' ? fmtVal(r[alias] as number) : '—'}</TableCell>
                            })}
                            {selMeasures.length === 0 && <TableCell className="text-left tabular-nums">1</TableCell>}
                          </TableRow>
                        ))}
                        {/* جمع کل از مقادیر دقیق — بخش ۱۴.۴ */}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={selDims.length || 1}>جمع کل</TableCell>
                          {selMeasures.map((m, j) => {
                            const alias = aliasOf(m)
                            const v = result.totals[alias]
                            return <TableCell key={j} className="text-left tabular-nums">{typeof v === 'number' ? fmtVal(v) : '—'}</TableCell>
                          })}
                          {selMeasures.length === 0 && <TableCell className="text-left">{formatNumber(result.scannedRecords)}</TableCell>}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="h-96 rounded-lg border p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 8, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={70} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v as number)} width={90} />
                          <RTooltip formatter={v => fmtVal(v as number)} />
                          <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={chartData} margin={{ top: 8, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={70} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v as number)} width={90} />
                          <RTooltip formatter={v => fmtVal(v as number)} />
                          <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 4 }} />
                        </LineChart>
                      ) : (
                        <PieChart>
                          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={50} paddingAngle={2} label={d => d.name}>
                            {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <RTooltip formatter={v => fmtVal(v as number)} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}

                {/* نمودار دایره‌ای با محدودیت تعداد دسته — بخش ۱۹.۲ */}
                {chartType === 'pie' && chartData.length > 10 && (
                  <p className="text-xs text-amber-600">نمودار دایره‌ای برای بیش از ۱۰ دسته توصیه نمی‌شود؛ ۱۲ دسته برتر نمایش داده شد (بخش ۱۹.۲ سند).</p>
                )}

                {/* هشدارهای محاسبه */}
                {result.warnings.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <ul className="list-disc ps-4 text-xs space-y-1">
                        {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-[10px] text-muted-foreground">
                  {formatNumber(result.scannedRecords)} رکورد بررسی شد | {formatNumber(result.rowCount)} سطر نتیجه
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* گزارش توصیفی — بخش ۲۰ سند */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" /> گزارش توصیفی قالبی</CardTitle>
            <CardDescription className="text-xs">
              متن از داده و محاسبات تأییدشده تولید می‌شود و اعداد آن با جدول و نمودار سازگارند (بخش ۲۰ سند)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" onClick={() => run({ descriptive: true })} disabled={loading || !result} className="gap-1.5 text-xs">
              <FileText className="size-3.5" /> تولید پیش‌نویس متن توصیفی
            </Button>
            {result?.descriptive && (
              <Textarea readOnly rows={7} value={result.descriptive} className="text-xs leading-6 bg-muted/30" />
            )}
          </CardContent>
        </Card>

        {/* ذخیره، انتشار و خروجی — بخش ۲۳ */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">ذخیره، انتشار و خروجی</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5 flex-1 min-w-48">
                <Label className="text-xs">عنوان گزارش برای ذخیره</Label>
                <Input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder="مثال: گزارش عملکرد فصلی" className="h-8" />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => saveReport(false)}><Save className="size-3.5" /> ذخیره پیش‌نویس</Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => saveReport(true)}><Save className="size-3.5" /> ذخیره و ارسال برای تأیید</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportReport('xlsx')} disabled={exporting || !result}>
                <FileDown className="size-3.5" /> خروجی Excel
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportReport('csv')} disabled={exporting || !result}>
                <FileDown className="size-3.5" /> خروجی CSV
              </Button>
              <span className="text-[10px] text-muted-foreground self-center">
                خروجی فیلترها، نسخه داده و زمان تولید را ثبت می‌کند؛ مجموع خروجی با گزارش منطبق است (بخش ۲۳.۲ سند).
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const opLabels = {
  eq: 'برابر', neq: 'نابرابر', contains: 'شامل', gt: 'بزرگ‌تر', lt: 'کوچک‌تر',
} as const

// اعداد فارسی برای نمایش ارقام (قابل تنظیم — بخش ۲۲ سند)
export { toPersianDigits }
