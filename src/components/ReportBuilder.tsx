'use client'

// طراح گزارش و داشبورد — بخش ۱۹ سند
// جدول، جدول محوری (۱۹.۲)، نمودار میله‌ای/خطی/دایره‌ای، داشبورد با Cross Filter
// و Drill Down / Drill Through (۱۹.۳)، کارت شاخص، فیلتر، گزارش توصیفی، انتشار و خروجی

import { useState, useMemo, useEffect, type ReactElement } from 'react'
import { api } from '@/lib/client'
import type { MeasureDTO } from './DataDictionaryView'
import type { QueryFilter } from '@/lib/types'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { formatNumber, formatAmount, autoDisplayUnit, getUnit, fromBaseRial } from '@/lib/currency'
import { toPersianDigits } from '@/lib/digits'
import {
  Loader2, Play, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Table2,
  Save, FileDown, FileText, Grid3X3, X, Plus, Kanban, BookMarked, LayoutDashboard,
  TableProperties, ChevronDown, ZoomIn, RotateCcw, Crosshair, Layers, Link2,
  Combine, Activity, Flame, Boxes, TrendingUp, Filter, LayoutGrid, Presentation,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, PieChart, Pie, Cell, LineChart, Line,
  ComposedChart, ScatterChart, Scatter, FunnelChart, Funnel, LabelList, Treemap,
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

// جدول محوری — بخش ۱۹.۲
interface PivotRowDTO {
  dimValues: { fieldId: string; value: string | null }[]
  depth: number
  isSubtotal: boolean
  cells: Record<string, number>
  rowTotals: Record<string, number>
  share?: number
  rank?: number
}
interface PivotResp {
  colKeys: string[]
  measureAliases: string[]
  rows: PivotRowDTO[]
  colTotals: Record<string, number>
  grandTotals: Record<string, number>
  shareBase?: string
  rankBase?: string
  warnings: string[]
  scannedRecords: number
}

type ChartType = 'table' | 'pivot' | 'matrix' | 'heatmap' | 'bar' | 'line' | 'pie' | 'kpi' | 'dashboard'
  | 'combined' | 'scatter' | 'histogram' | 'box' | 'waterfall' | 'funnel' | 'treemap'
type CrossFilterState = { fieldId: string; value: string } | null
type DrillStep = { fieldId: string; value: string }

// نمودارهای تخصصی — بخش ۱۹.۲
interface HistoResp {
  fieldId: string; fieldLabel: string; unit: string | null
  bins: { from: number; to: number; count: number }[]
  min: number; max: number; used: number; skipped: number
  scannedRecords: number; warnings: string[]
}
interface BoxResp {
  fieldId: string; fieldLabel: string; groupFieldId: string | null; unit: string | null
  groups: { name: string; stats: { min: number; loWhisker: number; q1: number; median: number; q3: number; hiWhisker: number; max: number; iqr: number; count: number; outliers: number[] } }[]
  used: number; skipped: number; scannedRecords: number; warnings: string[]
}

// فیلتر وابسته از روابط — بخش ۱۹.۳
interface RelLite {
  id: string; name: string; fromDatasetId: string; toDatasetId: string
  joinType: string; status: string
}
interface FilterOptionsResp {
  fieldId: string; viaRelation: string | null
  values: string[]; totalDistinct: number; matchedRecords: number; truncated: boolean
}
interface FilterEntry { fieldId: string; op: string; value: string; relationId?: string; lbl?: string }

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
  const [chartType, setChartType] = useState<ChartType>('table')
  const [result, setResult] = useState<QueryResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterField, setFilterField] = useState('')
  const [filterOp, setFilterOp] = useState('eq')
  const [filterValue, setFilterValue] = useState('')
  const [filters, setFilters] = useState<FilterEntry[]>([])
  // فیلتر وابسته — منبع فیلتر: همین جدول یا جدول مرتبط از طریق رابطه (بخش ۱۹.۳)
  const [filterRel, setFilterRel] = useState('')
  const [relations, setRelations] = useState<RelLite[]>([])
  const [opts, setOpts] = useState<FilterOptionsResp | null>(null)
  const [optsLoading, setOptsLoading] = useState(false)
  const [optsSearch, setOptsSearch] = useState('')
  const [descriptive, setDescriptive] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [approvedMeasures, setApprovedMeasures] = useState<MeasureDTO[]>([])
  const { toast } = useToast()

  // جدول محوری — بخش ۱۹.۲
  const [pivotRowDims, setPivotRowDims] = useState<string[]>([])
  const [pivotColDim, setPivotColDim] = useState('')
  const [pivotOpts, setPivotOpts] = useState({ subtotals: true, showShare: false, showRank: false, colLimit: 12 })
  const [pivotResult, setPivotResult] = useState<PivotResp | null>(null)
  const [pivotLoading, setPivotLoading] = useState(false)

  // Drill Down و Cross Filter — بخش ۱۹.۳
  const [drillPath, setDrillPath] = useState<DrillStep[]>([])
  const [crossFilter, setCrossFilter] = useState<CrossFilterState>(null)
  const [dashData, setDashData] = useState<{ main: QueryResp; chartA: QueryResp; chartB: QueryResp } | null>(null)
  const [dashLoading, setDashLoading] = useState(false)

  // Drill Through — صفحه جزئیات رکورد
  const [drillThrough, setDrillThrough] = useState<null | { title: string; filters: QueryFilter[] }>(null)
  const [dtRows, setDtRows] = useState<QueryRow[]>([])
  const [dtTotal, setDtTotal] = useState(0)
  const [dtLoading, setDtLoading] = useState(false)

  // نمودارهای تخصصی — هیستوگرام و جعبه‌ای (بخش ۱۹.۲)
  const [specialField, setSpecialField] = useState('')
  const [binCount, setBinCount] = useState(10)
  const [boxGroupField, setBoxGroupField] = useState('—')
  const [histo, setHisto] = useState<HistoResp | null>(null)
  const [box, setBox] = useState<BoxResp | null>(null)
  const [specialLoading, setSpecialLoading] = useState(false)

  // شاخص‌های تأییدشده فرهنگ داده — بخش ۱۸: قابل استفاده مجدد در گزارش‌های مختلف
  useEffect(() => {
    let alive = true
    api.get<MeasureDTO[]>(`/api/measures?projectId=${encodeURIComponent(projectId)}&status=approved`)
      .then(ms => { if (alive) setApprovedMeasures(ms) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [projectId])

  // تغییر سلسله‌مراتب ابعاد → بازگشت Drill Down به سطح اول (بخش ۱۹.۳)
  useEffect(() => { setDrillPath([]) }, [selDims.join('|')])

  const fieldLabel = (id?: string) => fields.find(f => f.id === id)?.label ?? id ?? ''

  const aliasOf = (m: { fieldId?: string; agg: string }) => {
    const label = fieldLabel(m.fieldId)
    const map: Record<string, string> = {
      sum: `جمع ${label}`, count: 'تعداد رکورد', countDistinct: `${label} متمایز`, avg: `میانگین ${label}`,
      min: `کمینه ${label}`, max: `بیشینه ${label}`, median: `میانه ${label}`, last: `آخرین ${label}`,
    }
    return map[m.agg] ?? label
  }

  const firstAlias = aliasOf(selMeasures[0] ?? { agg: 'count' })
  const isAmount = selMeasures[0]?.fieldId ? fields.find(f => f.id === selMeasures[0]?.fieldId)?.type === 'amount' : false

  // روابط فعال متصل به مجموعه‌داده جاری — مبناى فیلتر وابسته از جدول مرتبط (بخش‌های ۱۶ و ۱۹.۳)
  useEffect(() => {
    let alive = true
    if (!dataset) { setRelations([]); return }
    api.get<RelLite[]>(`/api/relations?projectId=${encodeURIComponent(projectId)}`)
      .then(rs => {
        if (!alive) return
        setRelations((rs ?? []).filter(r => r.status === 'active' && (r.fromDatasetId === dataset.id || r.toDatasetId === dataset.id)))
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [projectId, dataset?.id])

  const otherSideOf = (rel: RelLite) => rel.fromDatasetId === dataset?.id ? rel.toDatasetId : rel.fromDatasetId
  const otherFieldsOf = (rel: RelLite): FieldMetaClient[] => {
    const d = datasets.find(x => x.id === otherSideOf(rel))
    try { return d ? JSON.parse(d.fields || '[]') as FieldMetaClient[] : [] } catch { return [] }
  }

  // فیلترهای پایه کاربر (بدون فیلترهای از جدول مرتبط)
  const userFilters = (): QueryFilter[] =>
    filters.filter(f => !f.relationId).map(f => ({ fieldId: f.fieldId, op: f.op as QueryFilter['op'], value: f.value }))
  // فیلترهای وابسته از روابط — سمت سرور به فیلتر کلید اتصال تبدیل می‌کند (بخش ۱۹.۳)
  const relationFilters = () =>
    filters.filter(f => f.relationId).map(f => ({ relationId: f.relationId!, fieldId: f.fieldId, op: f.op as QueryFilter['op'], value: f.value }))

  const run = async (opts?: { descriptive?: boolean; cf?: CrossFilterState; drill?: DrillStep[] }) => {
    if (!dataset) return
    const cf = opts?.cf !== undefined ? opts.cf : crossFilter
    const dp = opts?.drill ?? drillPath
    setLoading(true)
    setDescriptive(opts?.descriptive ?? false)
    try {
      const res = await api.post<QueryResp>(`/api/datasets/${dataset.id}/query`, {
        // در حالت Drill Down سطح جاری نمایش داده می‌شود — بخش ۱۹.۳
        dimensions: dp.length > 0 ? [selDims[dp.length]].filter(Boolean) : selDims,
        measures: selMeasures.length > 0 ? selMeasures.map(m => ({ ...m, alias: aliasOf(m) })) : [{ agg: 'count', alias: 'تعداد رکورد' }],
        filters: [
          ...userFilters(),
          ...(cf ? [{ fieldId: cf.fieldId, op: 'eq' as const, value: cf.value }] : []),
          ...dp.map(d => ({ fieldId: d.fieldId, op: 'eq' as const, value: d.value })),
        ],
        relationFilters: relationFilters(),
        descriptive: opts?.descriptive ?? false,
        dateField: fields.find(f => f.type === 'date')?.id,
      })
      setResult(res)
      setPivotResult(null)
      setDashData(null)
      if (res.warnings.length > 0) {
        toast({ title: 'هشدارهای محاسبه', description: res.warnings.join('؛ ') })
      }
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // اجرای جدول محوری — بخش ۱۹.۲
  const runPivot = async (cf: CrossFilterState = crossFilter) => {
    if (!dataset) return
    if (pivotRowDims.length === 0) {
      toast({ title: 'جدول محوری', description: 'حداقل یک بُعد سطر انتخاب کنید (بخش ۱۹.۲ سند).', variant: 'destructive' })
      return
    }
    setPivotLoading(true)
    try {
      const res = await api.post<PivotResp>(`/api/datasets/${dataset.id}/pivot`, {
        rowDims: pivotRowDims,
        colDim: pivotColDim && pivotColDim !== '—' ? pivotColDim : undefined,
        measures: selMeasures.length > 0 ? selMeasures.map(m => ({ ...m, alias: aliasOf(m) })) : [{ agg: 'count', alias: 'تعداد رکورد' }],
        filters: [
          ...userFilters(),
          ...(cf ? [{ fieldId: cf.fieldId, op: 'eq' as const, value: cf.value }] : []),
        ],
        relationFilters: relationFilters(),
        showShare: pivotOpts.showShare,
        showRank: pivotOpts.showRank,
        subtotals: pivotOpts.subtotals,
        colLimit: pivotOpts.colLimit,
      })
      setPivotResult(res)
      setResult(null)
      setDashData(null)
      if (res.warnings.length > 0) toast({ title: 'هشدارهای جدول محوری', description: res.warnings.join('؛ ') })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setPivotLoading(false)
    }
  }

  // اجرای هیستوگرام و نمودار جعبه‌ای — بخش ۱۹.۲
  const runSpecial = async () => {
    if (!dataset) return
    if (!specialField) {
      toast({ title: 'نمودار تخصصی', description: 'ستون عددی را انتخاب کنید (بخش ۱۹.۲ سند).', variant: 'destructive' })
      return
    }
    setSpecialLoading(true)
    try {
      if (chartType === 'histogram') {
        const res = await api.post<HistoResp>(`/api/datasets/${dataset.id}/histogram`, {
          fieldId: specialField, binCount, filters: userFilters(), relationFilters: relationFilters(),
        })
        setHisto(res); setBox(null)
        if (res.warnings.length > 0) toast({ title: 'هشدارهای هیستوگرام', description: res.warnings.join('؛ ') })
      } else {
        const res = await api.post<BoxResp>(`/api/datasets/${dataset.id}/boxplot`, {
          fieldId: specialField,
          groupFieldId: boxGroupField && boxGroupField !== '—' ? boxGroupField : undefined,
          filters: userFilters(), relationFilters: relationFilters(),
        })
        setBox(res); setHisto(null)
        if (res.warnings.length > 0) toast({ title: 'هشدارهای نمودار جعبه‌ای', description: res.warnings.join('؛ ') })
      }
      setResult(null); setPivotResult(null); setDashData(null)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSpecialLoading(false)
    }
  }

  // گزینه‌های فیلتر وابسته — کاسکاد خودکار بر اساس سایر فیلترها (بخش ۱۹.۳)
  const loadOptions = async (fieldId: string, relId: string) => {
    if (!dataset || !fieldId) return
    setOptsLoading(true)
    try {
      const res = await api.post<FilterOptionsResp>(`/api/datasets/${dataset.id}/filter-options`, {
        fieldId,
        relationId: relId || undefined,
        filters: userFilters().filter(f => !relId && f.fieldId === fieldId ? false : true),
        limit: 60,
      })
      setOpts(res); setOptsSearch('')
    } catch {
      setOpts(null)
    } finally {
      setOptsLoading(false)
    }
  }

  // اجرای داشبورد با Cross Filter — بخش ۱۹.۳
  // نمودار انتخاب‌گر، خودش از فیلترِ بُعد خودش پاک می‌ماند تا مقایسه ممکن باشد
  const runDashboard = async (cf: CrossFilterState = crossFilter) => {
    if (!dataset) return
    if (selDims.length === 0) {
      toast({ title: 'داشبورد', description: 'حداقل یک بُعد برای داشبورد لازم است (بخش ۱۹.۳ سند).', variant: 'destructive' })
      return
    }
    setDashLoading(true)
    try {
      const base = userFilters()
      const meas = selMeasures.length > 0 ? selMeasures.map(m => ({ ...m, alias: aliasOf(m) })) : [{ agg: 'count', alias: 'تعداد رکورد' }]
      const dimA = selDims[0]
      const dimB = selDims[1] ?? selDims[0]
      const stripCf = (fs: QueryFilter[], dim: string): QueryFilter[] => {
        if (!cf || cf.fieldId === dim) return fs
        return [...fs, { fieldId: cf.fieldId, op: 'eq', value: cf.value }]
      }
      const mainFilters: QueryFilter[] = cf ? [...base, { fieldId: cf.fieldId, op: 'eq', value: cf.value }] : base
      const rf = relationFilters()
      const [resA, resB, resMain] = await Promise.all([
        api.post<QueryResp>(`/api/datasets/${dataset.id}/query`, { dimensions: [dimA], measures: meas, filters: stripCf(base, dimA), relationFilters: rf }),
        api.post<QueryResp>(`/api/datasets/${dataset.id}/query`, { dimensions: [dimB], measures: meas, filters: stripCf(base, dimB), relationFilters: rf }),
        api.post<QueryResp>(`/api/datasets/${dataset.id}/query`, { dimensions: selDims.slice(0, 2), measures: meas, filters: mainFilters, relationFilters: rf }),
      ])
      setDashData({ chartA: resA, chartB: resB, main: resMain })
      setResult(null)
      setPivotResult(null)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setDashLoading(false)
    }
  }

  // Cross Filter — بخش ۱۹.۳: انتخاب یک مقدار در نمودار، سایر اجزا را فیلتر می‌کند
  const applyCross = (fieldId: string, value: string) => {
    const same = crossFilter && crossFilter.fieldId === fieldId && crossFilter.value === value
    const next: CrossFilterState = same ? null : { fieldId, value }
    setCrossFilter(next)
    if (chartType === 'dashboard') runDashboard(next)
    else run({ cf: next })
  }

  // Drill Down — بخش ۱۹.۳: ورود به سطح بعدی سلسله‌مراتب
  const drillInto = (value: string) => {
    const dim = selDims[drillPath.length]
    if (dim === undefined) return
    const dp: DrillStep[] = [...drillPath, { fieldId: dim, value }]
    setDrillPath(dp)
    run({ drill: dp })
  }
  const drillTo = (level: number) => {
    const dp = drillPath.slice(0, level)
    setDrillPath(dp)
    run({ drill: dp })
  }
  // بازگشت به وضعیت پیش‌فرض — بخش ۱۹.۳
  const resetInteractions = () => {
    setDrillPath([])
    setCrossFilter(null)
    if (chartType === 'dashboard') runDashboard(null)
    else run({ drill: [], cf: null })
  }

  // Drill Through — بخش ۱۹.۳: نمایش جزئیات رکورد مطابق مجوز (قواعد سطری و ماسک سمت سرور)
  const openDrillThrough = async (title: string, rowFilters: QueryFilter[]) => {
    setDrillThrough({ title, filters: rowFilters })
    setDtLoading(true)
    try {
      const res = await api.get<{ total: number; rows: QueryRow[] }>(
        `/api/datasets/${dataset!.id}/records?limit=50&filters=${encodeURIComponent(JSON.stringify(rowFilters))}`
      )
      setDtRows(res.rows)
      setDtTotal(res.total)
    } catch (e) {
      toast({ title: 'خطا در دریافت جزئیات', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setDtLoading(false)
    }
  }

  const addMeasure = () => {
    const m = measures[0]
    setSelMeasures(ms => [...ms, { fieldId: m?.id, agg: m ? 'sum' : 'count' }])
  }

  const exportReport = async (format: 'xlsx' | 'csv' | 'pptx' | 'pdf') => {
    if (!dataset) return
    setExporting(true)
    try {
      const res = await fetch(`/api/datasets/${dataset.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          title: saveTitle.trim() || undefined,
          chartType: format === 'pptx' ? chartType : undefined,
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
      const extMap: Record<string, string> = { xlsx: 'xlsx', csv: 'csv', pptx: 'pptx', pdf: 'pdf' }
      a.download = `گزارش.${extMap[format]}`
      a.click()
      URL.revokeObjectURL(url)
      const descMap: Record<string, string> = {
        xlsx: 'فایل اکسل با نوع عدد و تاریخ مناسب و شیت شناسنامه (بخش ۲۳.۱ سند).',
        csv: 'فایل CSV با کدگذاری UTF-8 و جداکننده (بخش ۲۳.۱ سند).',
        pptx: 'ارائه مدیریتی PowerPoint با اسلاید عنوان، نمودار بومی و جدول — قابل توسعه در پاورپوینت (بخش ۲۳.۱ سند).',
        pdf: 'PDF مناسب چاپ با فونت جاسازی‌شده وزیرمتن، فارسی صحیح و صفحه‌بندی (بخش ۲۳.۱ سند).',
      }
      toast({ title: 'خروجی آماده شد', description: descMap[format] })
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
        config: {
          dimensions: selDims, measures: selMeasures, filters, chartType,
          pivot: { rowDims: pivotRowDims, colDim: pivotColDim, ...pivotOpts },
          special: { fieldId: specialField, binCount, groupFieldId: boxGroupField },
        },
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

  // واحد نمایش جدول محوری — بخش ۱۹.۴ (ثابت در کل ستون)
  const pivotUnit = useMemo(() => {
    if (!pivotResult || !isAmount) return undefined
    const vals = [
      ...pivotResult.rows.flatMap(r => Object.values(r.cells)).filter(v => typeof v === 'number').map(v => Math.abs(v as number)),
      ...pivotResult.rows.map(r => Math.abs(r.rowTotals[pivotResult.measureAliases[0]] ?? 0)),
      Math.abs(pivotResult.grandTotals[pivotResult.measureAliases[0]] ?? 0),
    ]
    const max = Math.max(0, ...vals)
    return max > 0 ? autoDisplayUnit(max) : undefined
  }, [pivotResult, isAmount])

  // واحد نمایش داشبورد — بخش ۱۹.۴
  const dashUnit = useMemo(() => {
    if (!dashData || !isAmount) return undefined
    const alias = firstAlias
    const vals = [
      ...dashData.main.rows.flatMap(r => Object.entries(r).filter(([k]) => k === alias).map(([, v]) => (typeof v === 'number' ? Math.abs(v) : 0))),
      typeof dashData.main.totals[alias] === 'number' ? Math.abs(dashData.main.totals[alias] as number) : 0,
    ]
    const max = Math.max(0, ...vals)
    return max > 0 ? autoDisplayUnit(max) : undefined
  }, [dashData, isAmount, firstAlias])

  // داده نمودار: تبدیل برچسب‌ها و تبدیل واحد نمایش
  const chartDim = drillPath.length > 0 ? selDims[drillPath.length] : selDims[0]
  const chartData = useMemo(() => {
    if (!result || !chartDim || selMeasures.length === 0) return []
    const firstMeasure = selMeasures[0]
    const alias = aliasOf(firstMeasure)
    return result.rows.slice(0, 12).map(r => ({
      name: String(r[chartDim] ?? '—'),
      value: typeof r[alias] === 'number'
        ? (isAmount ? fromBaseRial(r[alias] as number, amountUnit ?? 'rial') : r[alias] as number)
        : 0,
    }))
  }, [result, chartDim, selMeasures, isAmount, amountUnit])

  // داده داشبورد — بخش ۱۹.۳
  const dashA = useMemo(() => {
    if (!dashData || !selDims[0]) return []
    return dashData.chartA.rows.slice(0, 15).map(r => ({
      name: String(r[selDims[0]] ?? '—'),
      value: typeof r[firstAlias] === 'number'
        ? (isAmount ? fromBaseRial(r[firstAlias] as number, dashUnit ?? 'rial') : r[firstAlias] as number)
        : 0,
    }))
  }, [dashData, selDims, firstAlias, isAmount, dashUnit])
  const dashB = useMemo(() => {
    if (!dashData || !selDims[1]) return []
    return dashData.chartB.rows.slice(0, 12).map(r => ({
      name: String(r[selDims[1]] ?? '—'),
      value: typeof r[firstAlias] === 'number'
        ? (isAmount ? fromBaseRial(r[firstAlias] as number, dashUnit ?? 'rial') : r[firstAlias] as number)
        : 0,
    }))
  }, [dashData, selDims, firstAlias, isAmount, dashUnit])

  // داده نمودارهای چندسنجه‌ای — ترکیبی، پراکندگی، قیفی (بخش ۱۹.۲)
  const multiData = useMemo(() => {
    if (!result || !chartDim) return []
    const m1 = selMeasures[0] ?? { agg: 'count' }
    const m2 = selMeasures[1]
    const a1 = aliasOf(m1)
    const a2 = m2 ? aliasOf(m2) : ''
    return result.rows.slice(0, 30).map(r => ({
      name: String(r[chartDim] ?? '—'),
      v1: typeof r[a1] === 'number' ? r[a1] as number : 0,
      v2: a2 && typeof r[a2] === 'number' ? r[a2] as number : 0,
    }))
  }, [result, chartDim, selMeasures])

  // واحد نمایش نمودارهای تخصصی — بیشینه کل داده‌ها (بخش ۱۹.۴)
  const specialUnit = useMemo(() => {
    if (!isAmount) return undefined
    const vals = multiData.flatMap(r => [Math.abs(r.v1), Math.abs(r.v2)])
    const max = Math.max(0, ...vals)
    return max > 0 ? autoDisplayUnit(max) : undefined
  }, [multiData, isAmount])
  const fmtSpecial = (v: number) => isAmount ? formatAmount(v, { displayUnit: specialUnit }) : formatNumber(Math.round(v * 100) / 100)

  // آبشاری — مرتب‌شده نزولی با سهم تجمعی؛ ستون آخر جمع کل (بخش ۱۹.۲)
  const waterfallData = useMemo(() => {
    const rows = [...multiData].sort((a, b) => b.v1 - a.v1)
    let acc = 0
    const out = rows.map(r => { const base = acc; acc += r.v1; return { name: r.name, base, value: r.v1 } })
    out.push({ name: 'جمع کل', base: 0, value: acc })
    return out
  }, [multiData])

  // قیفی — دسته‌ها مرتب نزولی بر اساس سنجه نخست (بخش ۱۹.۲)
  const funnelData = useMemo(() =>
    [...multiData].sort((a, b) => b.v1 - a.v1).map(r => ({ name: r.name, value: r.v1 })),
  [multiData])

  // سهم گروه‌ها — خروجی درخت‌نگار با سهم درصدی (بخش ۱۹.۲)
  const treemapData = useMemo(() => {
    const total = multiData.reduce((a, b) => a + Math.abs(b.v1), 0)
    return multiData.map(r => ({ name: r.name, value: Math.abs(r.v1), share: total > 0 ? (Math.abs(r.v1) / total) * 100 : 0 }))
  }, [multiData])

  // برچسب بازه‌های هیستوگرام
  const histoData = useMemo(() =>
    (histo?.bins ?? []).map(b => ({ name: `${formatNumber(Math.round(b.from))} تا ${formatNumber(Math.round(b.to))}`, count: b.count })),
  [histo])

  // دامنه کلی نمودار جعبه‌ای برای مقیاس مشترک گروه‌ها
  const boxDomain = useMemo(() => {
    if (!box || box.groups.length === 0) return { lo: 0, hi: 1 }
    let lo = Infinity, hi = -Infinity
    for (const g of box.groups) {
      lo = Math.min(lo, g.stats.min, ...g.stats.outliers)
      hi = Math.max(hi, g.stats.max, ...g.stats.outliers)
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) return { lo, hi: lo === hi ? lo + 1 : hi }
    return { lo, hi }
  }, [box])

  // مقادیر مبلغ به مبنای ریال برگردانده می‌شوند؛ نمایش با واحد مناسب (بخش ۱۴ سند)
  const fmtVal = (v: number) => isAmount ? formatAmount(v, { displayUnit: amountUnit }) : formatNumber(Math.round(v * 100) / 100)
  const fmtPivot = (v: number) => isAmount ? formatAmount(v, { displayUnit: pivotUnit }) : formatNumber(Math.round(v * 100) / 100)
  const fmtDash = (v: number) => isAmount ? formatAmount(v, { displayUnit: dashUnit }) : formatNumber(Math.round(v * 100) / 100)
  const unitSuffix = (m: { fieldId?: string; agg: string }) => {
    const f = fields.find(x => x.id === m.fieldId)
    if (f?.type !== 'amount' || !amountUnit) return ''
    return ` (${getUnit(amountUnit).label})`
  }

  // ابعاد قابل نمایش در جدول — در حالت Drill فقط سطح جاری
  const visibleDims = drillPath.length > 0 ? [selDims[drillPath.length]].filter(Boolean) : selDims
  const drillable = selDims.length > 1 && drillPath.length < selDims.length - 1
  const pivotHasColDim = !!pivotResult && pivotResult.colKeys.some(k => k !== '§total')

  // مسیر اجرا بر اساس نوع گزارش
  const execute = () => {
    if (chartType === 'pivot' || chartType === 'matrix' || chartType === 'heatmap') runPivot()
    else if (chartType === 'histogram' || chartType === 'box') runSpecial()
    else if (chartType === 'dashboard') runDashboard()
    else run()
  }

  // رنگ‌بندی آستانه‌ای ماتریس/حرارتی — بخش ۱۹.۴ (مقیاس سبز روشن تا تیره)
  const matrixHeat = useMemo(() => {
    if (!pivotResult) return { lo: 0, hi: 1 }
    const cellVals = pivotResult.rows.filter(r => !r.isSubtotal).flatMap(r =>
      pivotResult.colKeys.map(ck => (r.cells[`${ck}||${pivotResult.measureAliases[0]}`] ?? 0) as number)
    )
    const all = cellVals.length > 0 ? cellVals : pivotResult.rows.map(r => (r.rowTotals[pivotResult.measureAliases[0]] ?? 0) as number)
    const finite = all.filter(v => Number.isFinite(v))
    return { lo: Math.min(0, ...finite), hi: Math.max(1, ...finite) }
  }, [pivotResult])
  const heatColor = (v: number) => {
    const t = matrixHeat.hi > matrixHeat.lo ? Math.max(0, Math.min(1, (v - matrixHeat.lo) / (matrixHeat.hi - matrixHeat.lo))) : 0
    const c0 = [240, 253, 244], c1 = [5, 150, 105]
    const c = c0.map((a, i) => Math.round(a + (c1[i] - a) * t))
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
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
            <Select value={selectedDatasetId ?? ''} onValueChange={id => { onSelectDataset(id); setSelDims([]); setSelMeasures([]); setResult(null); setPivotResult(null); setDashData(null); setDrillPath([]); setCrossFilter(null); setPivotRowDims([]); setPivotColDim(''); setHisto(null); setBox(null); setSpecialField(''); setFilters([]); setFilterRel(''); setFilterField(''); setOpts(null) }}>
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
            <CardDescription className="text-xs">
              ترتیب انتخاب، سلسله‌مراتب Drill Down را می‌سازد (بخش ۱۹.۳)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {dims.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelDims(s => s.includes(f.id) ? s.filter(x => x !== f.id) : [...s, f.id])}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${selDims.includes(f.id) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                >
                  {selDims.includes(f.id) && <span className="me-1 opacity-70">{toPersianDigits(String(selDims.indexOf(f.id) + 1))}.</span>}
                  {f.label}
                </button>
              ))}
              {dims.length === 0 && <p className="text-xs text-muted-foreground">بُعدی یافت نشد؛ نقش ستون‌ها را در برگه ستون‌ها تنظیم کنید.</p>}
            </div>
          </CardContent>
        </Card>

        {/* پیکربندی جدول محوری / ماتریس / حرارتی — بخش ۱۹.۲ */}
        {(chartType === 'pivot' || chartType === 'matrix' || chartType === 'heatmap') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><TableProperties className="size-4" /> پیکربندی {chartType === 'pivot' ? 'جدول محوری' : chartType === 'matrix' ? 'ماتریس' : 'نقشه حرارتی'}</CardTitle>
              <CardDescription className="text-xs">
                {chartType === 'pivot' ? 'سطرها به‌ترتیب کلیک سلسله‌مراتب می‌سازند (بخش ۱۹.۲ سند)' : 'سطرها × ستون‌ها با رنگ‌بندی آستانه‌ای بر اساس بیشینه/کمینه (بخش‌های ۱۹.۲ و ۱۹.۴ سند)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">سطرها ({toPersianDigits(String(pivotRowDims.length))} سطح)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {dims.filter(f => !pivotRowDims.includes(f.id)).map(f => (
                    <button key={f.id} onClick={() => setPivotRowDims(s => [...s, f.id])}
                      className="rounded-md border px-2 py-1 text-[11px] hover:bg-muted">
                      + {f.label}
                    </button>
                  ))}
                </div>
                {pivotRowDims.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 rounded-md bg-muted/40 p-2">
                    {pivotRowDims.map((id, i) => (
                      <Badge key={id} variant="secondary" className="gap-1 text-[10px]">
                        {toPersianDigits(String(i + 1))}. {fieldLabel(id)}
                        <button onClick={() => setPivotRowDims(s => s.filter(x => x !== id))} aria-label="حذف سطح"><X className="size-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">بُعد ستون‌ها (اختیاری)</Label>
                <Select value={pivotColDim} onValueChange={setPivotColDim}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="بدون بُعد ستون" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="—">بدون بُعد ستون</SelectItem>
                    {dims.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between"><span>جمع جزء هر گروه</span><Switch checked={pivotOpts.subtotals} onCheckedChange={v => setPivotOpts(o => ({ ...o, subtotals: v }))} /></label>
                <label className="flex items-center justify-between"><span>سهم از کل (۱۹.۴)</span><Switch checked={pivotOpts.showShare} onCheckedChange={v => setPivotOpts(o => ({ ...o, showShare: v }))} /></label>
                <label className="flex items-center justify-between"><span>رتبه‌بندی (۱۹.۴)</span><Switch checked={pivotOpts.showRank} onCheckedChange={v => setPivotOpts(o => ({ ...o, showRank: v }))} /></label>
                <div className="flex items-center justify-between gap-2">
                  <span>حداکثر ستون‌ها</span>
                  <Input type="number" min={2} max={50} value={pivotOpts.colLimit} onChange={e => setPivotOpts(o => ({ ...o, colLimit: Math.max(2, Math.min(50, +e.target.value || 12)) }))} className="h-7 w-20 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* پیکربندی هیستوگرام و جعبه‌ای — بخش ۱۹.۲ */}
        {(chartType === 'histogram' || chartType === 'box') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Boxes className="size-4" /> پیکربندی {chartType === 'histogram' ? 'هیستوگرام' : 'نمودار جعبه‌ای'}</CardTitle>
              <CardDescription className="text-xs">
                {chartType === 'histogram'
                  ? 'توزیع فراوانی یک ستون عددی در بازه‌های هم‌عرض (بخش ۱۹.۲ سند)'
                  : 'چهارک‌ها، میانه، سبیل‌ها و نقاط دورافتاده به تفکیک یک بُعد اختیاری (بخش ۱۹.۲ سند)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1.5">
                <Label className="text-xs">ستون عددی</Label>
                <Select value={specialField} onValueChange={setSpecialField}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="انتخاب ستون عددی" /></SelectTrigger>
                  <SelectContent>
                    {measures.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {chartType === 'histogram' ? (
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">تعداد بازه‌ها (۱ تا ۵۰)</Label>
                  <Input type="number" min={1} max={50} value={binCount} onChange={e => setBinCount(Math.max(1, Math.min(50, +e.target.value || 10)))} className="h-7 w-20 text-xs" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">بُعد گروه‌بندی (اختیاری)</Label>
                  <Select value={boxGroupField} onValueChange={setBoxGroupField}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="—">بدون گروه‌بندی (کل داده)</SelectItem>
                      {dims.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">فیلتر سراسری و وابسته (بخش ۱۹.۳)</CardTitle>
            <CardDescription className="text-xs">
              گزینه‌ها بر اساس فیلترهای دیگر محدود می‌شوند (کاسکاد خودکار)؛ ستون جدول‌های مرتبط از طریق روابط (بخش ۱۶) هم قابل فیلتر است
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {filters.map((f, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <Badge variant="secondary" className={`flex-1 truncate ${f.relationId ? 'border border-teal-300 bg-teal-50 text-teal-800' : ''}`}>
                  {f.relationId && <Link2 className="me-1 inline size-3" />}{f.lbl ?? fieldLabel(f.fieldId)} {(opLabels as Record<string, string>)[f.op]} «{f.value}»
                </Badge>
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setFilters(fs => fs.filter((_, j) => j !== i))}><X className="size-3" /></Button>
              </div>
            ))}
            {/* منبع فیلتر: همین جدول یا جدول مرتبط از طریق رابطه فعال — بخش ۱۹.۳ */}
            <Select value={filterRel} onValueChange={v => { setFilterRel(v); setFilterField(''); setOpts(null) }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">همین مجموعه‌داده</SelectItem>
                {relations.map(r => {
                  const other = datasets.find(d => d.id === otherSideOf(r))
                  return <SelectItem key={r.id} value={r.id}>از جدول «{other?.name ?? 'مرتبط'}» — رابطه {r.name}</SelectItem>
                })}
              </SelectContent>
            </Select>
            <Select value={filterField} onValueChange={v => { setFilterField(v); loadOptions(v, filterRel) }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="ستون فیلتر" /></SelectTrigger>
              <SelectContent>
                {(filterRel ? otherFieldsOf(relations.find(r => r.id === filterRel)!) : fields).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
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
            {/* گزینه‌های پویا — کاسکاد خودکار بر اساس سایر فیلترها (بخش ۱۹.۳) */}
            {filterField && (
              <div className="rounded-lg border bg-muted/30 p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {optsLoading ? <Loader2 className="size-3 animate-spin" /> : <Link2 className="size-3" />}
                    {opts?.viaRelation ? `گزینه‌ها از رابطه «${opts.viaRelation}»` : 'گزینه‌های پیشنهادی از داده'}
                    {opts && <span> — {toPersianDigits(String(opts.totalDistinct))} مقدار متمایز</span>}
                  </span>
                  <button className="underline hover:text-foreground" onClick={() => loadOptions(filterField, filterRel)}>به‌روزرسانی</button>
                </div>
                {opts && opts.values.length > 12 && (
                  <Input className="h-7 text-[11px]" placeholder="جست‌وجو در گزینه‌ها…" value={optsSearch} onChange={e => setOptsSearch(e.target.value)} />
                )}
                <div className="flex flex-wrap gap-1 max-h-24 overflow-auto">
                  {(opts?.values ?? [])
                    .filter(v => !optsSearch || v.includes(optsSearch))
                    .slice(0, 30)
                    .map(v => (
                      <button
                        key={v}
                        title={`انتخاب «${v}»`}
                        onClick={() => { setFilterOp('eq'); setFilterValue(v) }}
                        className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${filterOp === 'eq' && filterValue === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-white hover:bg-muted dark:bg-black/20'}`}
                      >
                        {v}
                      </button>
                    ))}
                  {opts && opts.truncated && <span className="text-[10px] text-muted-foreground self-center">و بیشتر…</span>}
                  {opts && opts.values.length === 0 && <span className="text-[10px] text-muted-foreground">مقداری یافت نشد.</span>}
                </div>
                {opts && <p className="text-[9px] text-muted-foreground">بر پایه {formatNumber(opts.matchedRecords)} رکورد باقیمانده از سایر فیلترها (کاسکاد خودکار — بخش ۱۹.۳ سند)</p>}
              </div>
            )}
            <Button
              variant="outline" size="sm" className="w-full h-7 text-xs gap-1"
              disabled={!filterField || !filterValue}
              onClick={() => {
                const src = filterRel ? relations.find(r => r.id === filterRel) : null
                const lbl = src
                  ? `${(datasets.find(d => d.id === otherSideOf(src))?.name ?? 'جدول مرتبط')} · ${(otherFieldsOf(src).find(x => x.id === filterField)?.label) ?? filterField}`
                  : fieldLabel(filterField)
                setFilters(fs => [...fs, { fieldId: filterField, op: filterOp, value: filterValue, relationId: filterRel || undefined, lbl }])
                setFilterValue('')
              }}
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
                <Select value={chartType} onValueChange={v => setChartType(v as ChartType)}>
                  <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table"><span className="flex items-center gap-1.5"><Table2 className="size-3.5" /> جدول</span></SelectItem>
                    <SelectItem value="pivot"><span className="flex items-center gap-1.5"><TableProperties className="size-3.5" /> جدول محوری (۱۹.۲)</span></SelectItem>
                    <SelectItem value="matrix"><span className="flex items-center gap-1.5"><Grid3X3 className="size-3.5" /> ماتریس با رنگ‌بندی (۱۹.۲)</span></SelectItem>
                    <SelectItem value="heatmap"><span className="flex items-center gap-1.5"><Flame className="size-3.5" /> نقشه حرارتی (۱۹.۲)</span></SelectItem>
                    <SelectItem value="dashboard"><span className="flex items-center gap-1.5"><LayoutDashboard className="size-3.5" /> داشبورد Cross Filter (۱۹.۳)</span></SelectItem>
                    <SelectItem value="bar"><span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" /> میله‌ای/ستونی</span></SelectItem>
                    <SelectItem value="line"><span className="flex items-center gap-1.5"><LineChartIcon className="size-3.5" /> خطی</span></SelectItem>
                    <SelectItem value="pie"><span className="flex items-center gap-1.5"><PieChartIcon className="size-3.5" /> دایره‌ای</span></SelectItem>
                    <SelectItem value="combined"><span className="flex items-center gap-1.5"><Combine className="size-3.5" /> ترکیبی میله‌ای + خطی</span></SelectItem>
                    <SelectItem value="scatter"><span className="flex items-center gap-1.5"><Activity className="size-3.5" /> پراکندگی</span></SelectItem>
                    <SelectItem value="histogram"><span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" /> هیستوگرام</span></SelectItem>
                    <SelectItem value="box"><span className="flex items-center gap-1.5"><Boxes className="size-3.5" /> جعبه‌ای</span></SelectItem>
                    <SelectItem value="waterfall"><span className="flex items-center gap-1.5"><TrendingUp className="size-3.5" /> آبشاری</span></SelectItem>
                    <SelectItem value="funnel"><span className="flex items-center gap-1.5"><Filter className="size-3.5" /> قیفی</span></SelectItem>
                    <SelectItem value="treemap"><span className="flex items-center gap-1.5"><LayoutGrid className="size-3.5" /> سهم گروه‌ها</span></SelectItem>
                    <SelectItem value="kpi"><span className="flex items-center gap-1.5"><Kanban className="size-3.5" /> کارت شاخص</span></SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={execute}
                  disabled={loading || pivotLoading || dashLoading || specialLoading} className="h-8 gap-1.5 text-xs"
                >
                  {loading || pivotLoading || dashLoading || specialLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} اجرای گزارش
                </Button>
              </div>
            </div>
            <CardDescription>
              نوع تجمیع، واحد و فیلتر هر شاخص قابل مشاهده است — شفافیت محاسبات (بخش ۴ سند)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* نوار تعامل‌ها — Drill Down و Cross Filter (بخش ۱۹.۳) */}
            {(drillPath.length > 0 || crossFilter) && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs mb-3">
                {drillPath.length > 0 && (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="gap-1 text-[10px]"><Layers className="size-3" /> Drill Down</Badge>
                    <button onClick={() => drillTo(0)} className="rounded border px-1.5 py-0.5 hover:bg-muted">همه داده‌ها</button>
                    {drillPath.map((d, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-muted-foreground">›</span>
                        <button
                          onClick={() => drillTo(i + 1)}
                          className={`rounded border px-1.5 py-0.5 ${i === drillPath.length - 1 ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                        >
                          {d.value}
                        </button>
                      </span>
                    ))}
                  </span>
                )}
                {crossFilter && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Crosshair className="size-3" /> Cross Filter: {fieldLabel(crossFilter.fieldId)} = {crossFilter.value}
                    <button onClick={() => applyCross(crossFilter.fieldId, crossFilter.value)} aria-label="حذف فیلتر متقابل"><X className="size-3" /></button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="ms-auto h-6 gap-1 px-2 text-[11px]" onClick={resetInteractions}>
                  <RotateCcw className="size-3" /> بازگشت به وضعیت پیش‌فرض
                </Button>
              </div>
            )}

            {(chartType === 'pivot' || chartType === 'matrix' || chartType === 'heatmap') ? (
              pivotResult ? (
                <div className="space-y-3">
                  {pivotHasColDim && selMeasures.length > 1 && (
                    <p className="text-xs text-amber-600">
                      با انتخاب بُعد ستون، نخستین سنجه («{pivotResult.measureAliases[0]}») در ستون‌ها نمایش داده می‌شود؛ سایر سنجه‌ها بدون بُعد ستون قابل مشاهده‌اند.
                    </p>
                  )}
                  {chartType === 'pivot' ? (
                  <div className="rounded-lg border max-h-[32rem] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="min-w-52">ابعاد سطر</TableHead>
                          {pivotHasColDim
                            ? pivotResult.colKeys.map(ck => (
                                <TableHead key={ck} className="text-left whitespace-nowrap">{ck === '§total' ? 'جمع' : ck}</TableHead>
                              ))
                            : pivotResult.measureAliases.map(a => <TableHead key={a} className="text-left whitespace-nowrap">{a}</TableHead>)}
                          <TableHead className="text-left">جمع سطر</TableHead>
                          {pivotResult.rankBase && <TableHead className="text-center w-16">رتبه</TableHead>}
                          {pivotResult.shareBase && <TableHead className="text-left w-20">سهم از کل</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pivotResult.rows.map((r, i) => (
                          <TableRow key={i} className={r.isSubtotal ? 'bg-muted/60 font-medium' : ''}>
                            <TableCell style={{ paddingInlineStart: `${12 + r.depth * 24}px` }} className="whitespace-nowrap">
                              {r.isSubtotal
                                ? `جمع جزء — ${r.dimValues[r.dimValues.length - 1]?.value ?? ''}`
                                : r.dimValues[r.dimValues.length - 1]?.value ?? '—'}
                            </TableCell>
                            {pivotHasColDim
                              ? pivotResult.colKeys.map(ck => (
                                  <TableCell key={ck} className="text-left tabular-nums">
                                    {fmtPivot(r.cells[`${ck}||${pivotResult.measureAliases[0]}`] ?? 0)}
                                  </TableCell>
                                ))
                              : pivotResult.measureAliases.map(a => (
                                  <TableCell key={a} className="text-left tabular-nums">{fmtPivot(r.cells[`§total||${a}`] ?? 0)}</TableCell>
                                ))}
                            <TableCell className="text-left tabular-nums font-medium">
                              {fmtPivot(r.rowTotals[pivotResult.measureAliases[0]] ?? 0)}
                            </TableCell>
                            {pivotResult.rankBase && <TableCell className="text-center tabular-nums">{r.rank ?? '—'}</TableCell>}
                            {pivotResult.shareBase && (
                              <TableCell className="text-left tabular-nums">{r.share !== undefined ? `${r.share.toFixed(1)}٪` : '—'}</TableCell>
                            )}
                          </TableRow>
                        ))}
                        {/* جمع کل — بخش ۱۹.۴ */}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>جمع کل</TableCell>
                          {pivotHasColDim
                            ? pivotResult.colKeys.map(ck => (
                                <TableCell key={ck} className="text-left tabular-nums">
                                  {fmtPivot(pivotResult.colTotals[`${ck}||${pivotResult.measureAliases[0]}`] ?? 0)}
                                </TableCell>
                              ))
                            : pivotResult.measureAliases.map(a => (
                                <TableCell key={a} className="text-left tabular-nums">{fmtPivot(pivotResult.grandTotals[a] ?? 0)}</TableCell>
                              ))}
                          <TableCell className="text-left tabular-nums">{fmtPivot(pivotResult.grandTotals[pivotResult.measureAliases[0]] ?? 0)}</TableCell>
                          {pivotResult.rankBase && <TableCell className="text-center">—</TableCell>}
                          {pivotResult.shareBase && <TableCell className="text-left">۱۰۰٪</TableCell>}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  ) : (
                    /* ماتریس و نقشه حرارتی — سطر × ستون با رنگ‌بندی آستانه‌ای (۱۹.۲ و ۱۹.۴) */
                    <div className="rounded-lg border max-h-[32rem] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="min-w-40">{pivotRowDims.map(fieldLabel).join(' › ') || 'سطر'}</TableHead>
                            {pivotResult.colKeys.map(ck => (
                              <TableHead key={ck} className="text-center whitespace-nowrap">{ck === '§total' ? 'جمع' : ck}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pivotResult.rows.filter(r => !r.isSubtotal).map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="whitespace-nowrap text-xs">
                                {r.dimValues.map(d => d.value ?? '—').join(' › ')}
                              </TableCell>
                              {pivotResult.colKeys.map(ck => {
                                const v = (r.cells[`${ck}||${pivotResult.measureAliases[0]}`] ?? 0) as number
                                const t = matrixHeat.hi > matrixHeat.lo ? Math.max(0, Math.min(1, (v - matrixHeat.lo) / (matrixHeat.hi - matrixHeat.lo))) : 0
                                return (
                                  <TableCell
                                    key={ck}
                                    className={`text-center tabular-nums text-xs ${chartType === 'heatmap' && ck !== '§total' ? 'cursor-pointer' : ''}`}
                                    style={{ backgroundColor: heatColor(v), color: t > 0.55 ? '#fff' : undefined }}
                                    title={`${ck === '§total' ? 'جمع' : ck} — ${fmtPivot(v)}`}
                                    onClick={() => { if (chartType === 'heatmap' && ck !== '§total' && pivotColDim && pivotColDim !== '—') applyCross(pivotColDim, ck) }}
                                  >
                                    {chartType === 'matrix' || ck === '§total' ? fmtPivot(v) : ' '}
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell>جمع کل</TableCell>
                            {pivotResult.colKeys.map(ck => (
                              <TableCell key={ck} className="text-center tabular-nums">
                                {fmtPivot(pivotResult.colTotals[`${ck}||${pivotResult.measureAliases[0]}`] ?? 0)}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {isAmount && pivotUnit && (
                    <p className="text-[10px] text-muted-foreground">
                      واحد نمایش ستون‌های مبلغ: {getUnit(pivotUnit).label} — مبنای ذخیره‌سازی ریال (بخش‌های ۱۴ و ۱۹.۴ سند)
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {chartType === 'pivot'
                      ? `${formatNumber(pivotResult.scannedRecords)} رکورد بررسی شد | سلسله‌مراتب سطرها با جمع جزء هر گروه (بخش ۱۹.۲ سند)`
                      : `${formatNumber(pivotResult.scannedRecords)} رکورد بررسی شد | رنگ‌بندی آستانه‌ای از ${fmtPivot(matrixHeat.lo)} تا ${fmtPivot(matrixHeat.hi)} (بخش ۱۹.۴ سند)${chartType === 'heatmap' ? ' | برای Cross Filter روی سلول‌ها کلیک کنید (۱۹.۳)' : ''}`}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <TableProperties className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">سطرها و بُعد ستون را در پنل پیکربندی جدول محوری انتخاب و اجرا کنید (بخش ۱۹.۲ سند)</p>
                </div>
              )
            ) : chartType === 'dashboard' ? (
              dashData ? (
                <div className="space-y-4">
                  {/* کارت‌های شاخص — اثر Cross Filter */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-bl from-emerald-50 to-transparent dark:from-emerald-950/30">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">تعداد رکورد بررسی‌شده</p>
                        <p className="text-xl font-bold mt-1 tabular-nums">{formatNumber(dashData.main.scannedRecords)}</p>
                      </CardContent>
                    </Card>
                    {selMeasures.slice(0, 3).map((m, i) => (
                      <Card key={i} className="bg-gradient-to-bl from-emerald-50 to-transparent dark:from-emerald-950/30">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">{aliasOf(m)}</p>
                          <p className="text-xl font-bold mt-1 tabular-nums">
                            {typeof dashData.main.totals[aliasOf(m)] === 'number' ? fmtDash(dashData.main.totals[aliasOf(m)] as number) : '—'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {/* دو نمودار هم‌عرض با Cross Filter — بخش ۱۹.۳ */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-72 rounded-lg border p-3">
                      <p className="text-xs font-medium mb-1">{fieldLabel(selDims[0])} — برای Cross Filter کلیک کنید</p>
                      <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={dashA} margin={{ top: 8, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatNumber(v as number)} width={80} />
                          <RTooltip formatter={v => fmtDash(v as number)} />
                          <Bar
                            dataKey="value" radius={[5, 5, 0, 0]} cursor="pointer"
                            onClick={(d: unknown) => {
                              const label = (d as { activeLabel?: string })?.activeLabel
                              if (label) applyCross(selDims[0], String(label))
                            }}
                          >
                            {dashA.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={crossFilter?.fieldId === selDims[0] && crossFilter.value === entry.name ? CHART_COLORS[2] : CHART_COLORS[0]}
                                fillOpacity={crossFilter?.fieldId === selDims[0] && crossFilter.value !== entry.name ? 0.35 : 1}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-72 rounded-lg border p-3">
                      <p className="text-xs font-medium mb-1">{fieldLabel(selDims[1] ?? selDims[0])} — برای Cross Filter کلیک کنید</p>
                      <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                          <Pie
                            data={dashB} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={45} paddingAngle={2}
                            cursor="pointer"
                            onClick={(d: unknown) => {
                              const name = (d as { name?: string })?.name
                              if (name) applyCross(selDims[1] ?? selDims[0], String(name))
                            }}
                          >
                            {dashB.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                fillOpacity={crossFilter?.fieldId === (selDims[1] ?? selDims[0]) && crossFilter.value !== entry.name ? 0.35 : 1}
                                stroke={crossFilter?.fieldId === (selDims[1] ?? selDims[0]) && crossFilter.value === entry.name ? '#111' : undefined}
                                strokeWidth={crossFilter?.fieldId === (selDims[1] ?? selDims[0]) && crossFilter.value === entry.name ? 2 : 0}
                              />
                            ))}
                          </Pie>
                          <RTooltip formatter={v => fmtDash(v as number)} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* جدول اثر فیلتر متقابل */}
                  <div className="rounded-lg border max-h-72 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          {selDims.slice(0, 2).map(d => <TableHead key={d}>{fieldLabel(d)}</TableHead>)}
                          <TableHead className="text-left">
                            {firstAlias}{isAmount && dashUnit ? ` (${getUnit(dashUnit).label})` : ''}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashData.main.rows.slice(0, 100).map((r, i) => (
                          <TableRow
                            key={i} className="cursor-pointer hover:bg-muted/50"
                            onClick={() => applyCross(selDims[0], String(r[selDims[0]] ?? ''))}
                            title="برای Cross Filter کلیک کنید"
                          >
                            {selDims.slice(0, 2).map(d => <TableCell key={d} className="text-xs">{String(r[d] ?? '—')}</TableCell>)}
                            <TableCell className="text-left tabular-nums text-xs">
                              {typeof r[firstAlias] === 'number' ? fmtDash(r[firstAlias] as number) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    انتخاب مقدار در هر نمودار یا جدول، سایر اجزا را فیلتر می‌کند (Cross Filter — بخش ۱۹.۳ سند)؛ نمودار انتخاب‌گر از فیلتر بُعد خودش پاک می‌ماند تا مقایسه ممکن باشد.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <LayoutDashboard className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">ابعاد (ترجیحاً دو بُعد) و سنجه را انتخاب و داشبورد را اجرا کنید (بخش ۱۹.۳ سند)</p>
                </div>
              )
            ) : (chartType === 'histogram' || chartType === 'box') ? (
              chartType === 'histogram' ? (
                histo ? (
                  <div className="space-y-3">
                    <div className="h-80 rounded-lg border p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histoData} margin={{ top: 8, bottom: 52 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={68} interval={0} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatNumber(v as number)} width={70} allowDecimals={false} />
                          <RTooltip formatter={v => [`${formatNumber(v as number)} رکورد`, 'فراوانی']} />
                          <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatNumber(histo.used)} رکورد وارد محاسبه شد | کمینه {formatNumber(Math.round(histo.min))} تا بیشینه {formatNumber(Math.round(histo.max))} |
                      {histo.skipped > 0 ? ` ${formatNumber(histo.skipped)} مقدار خالی/نامعتبر کنار گذاشته شد (۳۳.۹)` : ' بدون مقدار نامعتبر'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                    <BarChart3 className="size-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">ستون عددی و تعداد بازه‌ها را انتخاب و اجرا کنید (بخش ۱۹.۲ سند)</p>
                  </div>
                )
              ) : box ? (
                <div className="space-y-3">
                  <div className="rounded-lg border p-4 space-y-4">
                    {box.groups.map(g => {
                      const span = boxDomain.hi - boxDomain.lo || 1
                      const pos = (v: number) => `${((v - boxDomain.lo) / span) * 100}%`
                      const boxW = `calc(${pos(g.stats.q3)} - ${pos(g.stats.q1)})`
                      const medianLeft = `${((g.stats.median - g.stats.q1) / (g.stats.q3 - g.stats.q1 || 1)) * 100}%`
                      return (
                        <div key={g.name} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 truncate text-xs" title={g.name}>{g.name}</span>
                          <div dir="ltr" className="relative flex-1 h-10">
                            {/* سبیل‌ها و سر سبیل */}
                            <div className="absolute top-1/2 h-px bg-muted-foreground/50" style={{ left: pos(g.stats.loWhisker), width: `calc(${pos(g.stats.q1)} - ${pos(g.stats.loWhisker)})` }} />
                            <div className="absolute top-1/2 h-px bg-muted-foreground/50" style={{ left: pos(g.stats.q3), width: `calc(${pos(g.stats.hiWhisker)} - ${pos(g.stats.q3)})` }} />
                            <div className="absolute top-2.5 bottom-2.5 w-px bg-muted-foreground/50" style={{ left: pos(g.stats.loWhisker) }} />
                            <div className="absolute top-2.5 bottom-2.5 w-px bg-muted-foreground/50" style={{ left: pos(g.stats.hiWhisker) }} />
                            {/* جعبه با میانه */}
                            <div
                              className="absolute top-2 bottom-2 rounded border-2 border-emerald-600 bg-emerald-500/20"
                              style={{ left: pos(g.stats.q1), width: boxW }}
                              title={`چهارک اول: ${formatNumber(Math.round(g.stats.q1))} | میانه: ${formatNumber(Math.round(g.stats.median))} | چهارک سوم: ${formatNumber(Math.round(g.stats.q3))}`}
                            >
                              <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-800" style={{ left: medianLeft }} />
                            </div>
                            {/* نقاط دورافتاده — قاعده ۱٫۵×IQR */}
                            {g.stats.outliers.map((o, j) => (
                              <div
                                key={j}
                                className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-red-500"
                                style={{ left: pos(o) }}
                                title={`نقطه دورافتاده: ${formatNumber(Math.round(o))}`}
                              />
                            ))}
                          </div>
                          <span className="w-36 shrink-0 text-left text-[10px] text-muted-foreground tabular-nums" dir="ltr">
                            n={formatNumber(g.stats.count)} | med={formatNumber(Math.round(g.stats.median))}
                          </span>
                        </div>
                      )
                    })}
                    {box.groups.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">داده عددی معتبری برای نمودار جعبه‌ای یافت نشد.</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formatNumber(box.used)} رکورد وارد محاسبه شد | سبیل‌ها در محدوده ۱٫۵ برابر پراکندگی چهارکی (IQR)؛ نقاط قرمز دورافتاده‌اند |
                    {box.skipped > 0 ? ` ${formatNumber(box.skipped)} مقدار خالی/نامعتبر کنار گذاشته شد (۳۳.۹)` : ' بدون مقدار نامعتبر'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <Boxes className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">ستون عددی و بُعد گروه‌بندی را انتخاب و اجرا کنید (بخش ۱۹.۲ سند)</p>
                </div>
              )
            ) : !result ? (
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
                  <>
                    <div className="rounded-lg border max-h-[28rem] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            {visibleDims.map(d => <TableHead key={d}>{fieldLabel(d)}</TableHead>)}
                            {selMeasures.map((m, i) => <TableHead key={i} className="text-left">{aliasOf(m).replace(/\s*\([^)]*\)\s*$/, '')}{unitSuffix(m)}</TableHead>)}
                            {selMeasures.length === 0 && <TableHead className="text-left">تعداد رکورد</TableHead>}
                            <TableHead className="w-20 text-center">عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.rows.map((r, i) => (
                            <TableRow key={i}>
                              {visibleDims.map(d => <TableCell key={d}>{String(r[d] ?? '—')}</TableCell>)}
                              {selMeasures.map((m, j) => {
                                const alias = aliasOf(m)
                                return <TableCell key={j} className="text-left tabular-nums">{typeof r[alias] === 'number' ? fmtVal(r[alias] as number) : '—'}</TableCell>
                              })}
                              {selMeasures.length === 0 && <TableCell className="text-left tabular-nums">۱</TableCell>}
                              <TableCell>
                                <div className="flex items-center justify-center gap-0.5">
                                  {drillable && (
                                    <Button
                                      variant="ghost" size="icon" className="size-6" title="Drill Down — ورود به سطح بعد سلسله‌مراتب"
                                      onClick={() => drillInto(String(r[visibleDims[visibleDims.length - 1]] ?? ''))}
                                    >
                                      <ChevronDown className="size-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost" size="icon" className="size-6" title="Drill Through — جزئیات رکوردها"
                                    onClick={() => openDrillThrough(
                                      visibleDims.map(d => `${fieldLabel(d)} = ${String(r[d] ?? '—')}`).join('، '),
                                      [
                                        ...userFilters(),
                                        ...(crossFilter ? [{ fieldId: crossFilter.fieldId, op: 'eq' as const, value: crossFilter.value }] : []),
                                        ...drillPath.map(d => ({ fieldId: d.fieldId, op: 'eq' as const, value: d.value })),
                                        ...visibleDims.map(d => ({ fieldId: d, op: 'eq' as const, value: String(r[d] ?? '') })),
                                      ]
                                    )}
                                  >
                                    <ZoomIn className="size-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* جمع کل از مقادیر دقیق — بخش ۱۴.۴ */}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={visibleDims.length || 1}>جمع کل</TableCell>
                            {selMeasures.map((m, j) => {
                              const alias = aliasOf(m)
                              const v = result.totals[alias]
                              return <TableCell key={j} className="text-left tabular-nums">{typeof v === 'number' ? fmtVal(v) : '—'}</TableCell>
                            })}
                            {selMeasures.length === 0 && <TableCell className="text-left">{formatNumber(result.scannedRecords)}</TableCell>}
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    {selDims.length > 1 && (
                      <p className="text-[10px] text-muted-foreground">
                        ترتیب انتخاب ابعاد، سلسله‌مراتب Drill Down را می‌سازد؛ دکمه ⌄ وارد سطح بعد می‌شود و ذره‌بین جزئیات رکورد را مطابق مجوز نشان می‌دهد (بخش ۱۹.۳ سند).
                      </p>
                    )}
                  </>
                ) : (
                  <div className="h-96 rounded-lg border p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 8, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={70} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v as number)} width={90} />
                          <RTooltip formatter={v => fmtVal(v as number)} />
                          <Bar
                            dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} cursor="pointer"
                            onClick={(d: unknown) => {
                              const label = (d as { activeLabel?: string })?.activeLabel
                              if (label && chartDim) applyCross(chartDim, String(label))
                            }}
                          />
                        </BarChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={chartData} margin={{ top: 8, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={70} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v as number)} width={90} />
                          <RTooltip formatter={v => fmtVal(v as number)} />
                          <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 4 }} />
                        </LineChart>
                      ) : chartType === 'combined' ? (
                        /* نمودار ترکیبی: میله‌ای سنجه نخست + خطی سنجه دوم — بخش ۱۹.۲ */
                        selMeasures.length < 2 ? (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">برای نمودار ترکیبی، دو سنجه انتخاب کنید (بخش ۱۹.۲ سند).</div>
                        ) : (
                          <ComposedChart data={multiData} margin={{ top: 8, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatNumber(v as number)} width={90} />
                            <RTooltip formatter={(v, n) => [fmtSpecial(v as number), String(n)]} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="v1" name={aliasOf(selMeasures[0] ?? { agg: 'count' })} fill={CHART_COLORS[0]} radius={[5, 5, 0, 0]} />
                            <Line dataKey="v2" name={aliasOf(selMeasures[1])} stroke={CHART_COLORS[2]} strokeWidth={2.5} dot={{ r: 4 }} />
                          </ComposedChart>
                        )
                      ) : chartType === 'scatter' ? (
                        /* نمودار پراکندگی: سنجه نخست (محور افقی) در برابر سنجه دوم (محور عمودی) — بخش ۱۹.۲ */
                        selMeasures.length < 2 ? (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">برای نمودار پراکندگی، دو سنجه انتخاب کنید (بخش ۱۹.۲ سند).</div>
                        ) : (
                          <ScatterChart margin={{ top: 12, bottom: 30, left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                            <XAxis type="number" dataKey="v1" name={aliasOf(selMeasures[0] ?? { agg: 'count' })} tick={{ fontSize: 10 }} tickFormatter={v => formatNumber(v as number)} />
                            <YAxis type="number" dataKey="v2" name={aliasOf(selMeasures[1])} tick={{ fontSize: 10 }} tickFormatter={v => formatNumber(v as number)} width={90} />
                            <RTooltip formatter={(v, n) => [fmtSpecial(v as number), String(n)]} labelFormatter={() => ''} />
                            <Scatter data={multiData} fill={CHART_COLORS[0]} cursor="pointer"
                              onClick={(d: unknown) => {
                                const name = (d as { payload?: { name?: string } })?.payload?.name
                                if (name && chartDim) applyCross(chartDim, name)
                              }}
                            />
                          </ScatterChart>
                        )
                      ) : chartType === 'waterfall' ? (
                        /* نمودار آبشاری — سهم تجمعی دسته‌ها مرتب نزولی با ستون جمع کل — بخش ۱۹.۲ */
                        <BarChart data={waterfallData} margin={{ top: 8, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatNumber(v as number)} width={90} />
                          <RTooltip formatter={(v, n, p) => n === 'سهم دسته' ? [fmtSpecial(v as number), 'سهم دسته'] : ['', String(n)]} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="base" name="مبنای تجمعی" stackId="wf" fill="transparent" />
                          <Bar dataKey="value" name="سهم دسته" stackId="wf">
                            {waterfallData.map((d, i) => (
                              <Cell key={i} fill={i === waterfallData.length - 1 ? CHART_COLORS[2] : CHART_COLORS[0]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : chartType === 'funnel' ? (
                        /* نمودار قیفی — دسته‌ها مرتب نزولی — بخش ۱۹.۲ */
                        <FunnelChart>
                          <RTooltip formatter={v => fmtSpecial(v as number)} />
                          <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                            {funnelData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            <LabelList position="right" dataKey="name" fill="#334155" fontSize={10} />
                          </Funnel>
                        </FunnelChart>
                      ) : chartType === 'treemap' ? (
                        /* سهم گروه‌ها — درخت‌نگار با سهم درصدی — بخش ۱۹.۲ */
                        <Treemap
                          data={treemapData} dataKey="value" stroke="#fff" fill={CHART_COLORS[0]} isAnimationActive={false}
                          content={((props: Record<string, unknown>) => {
                            const p = props as unknown as { x: number; y: number; width: number; height: number; index: number; name?: string; share?: number }
                            if (!p || p.width <= 0 || p.height <= 0) return <g />
                            return (
                              <g>
                                <rect x={p.x} y={p.y} width={p.width} height={p.height} fill={CHART_COLORS[p.index % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} rx={4} />
                                {p.width > 60 && p.height > 36 && (
                                  <>
                                    <text x={p.x + p.width / 2} y={p.y + p.height / 2 - 4} textAnchor="middle" fill="#fff" fontSize={11}>{p.name}</text>
                                    {typeof p.share === 'number' && (
                                      <text x={p.x + p.width / 2} y={p.y + p.height / 2 + 12} textAnchor="middle" fill="#fff" fontSize={10} opacity={0.85}>
                                        {p.share.toFixed(1)}٪
                                      </text>
                                    )}
                                  </>
                                )}
                              </g>
                            )
                          }) as unknown as ReactElement}
                          onClick={(d: unknown) => {
                            const name = (d as { name?: string })?.name
                            if (name && chartDim) applyCross(chartDim, name)
                          }}
                        />
                      ) : (
                        <PieChart>
                          <Pie
                            data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={50} paddingAngle={2} label={d => d.name}
                            cursor="pointer"
                            onClick={(d: unknown) => {
                              const name = (d as { name?: string })?.name
                              if (name && chartDim) applyCross(chartDim, String(name))
                            }}
                          >
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
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportReport('pptx')} disabled={exporting || !result}>
                <Presentation className="size-3.5" /> خروجی PowerPoint
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportReport('pdf')} disabled={exporting || !result}>
                <FileText className="size-3.5" /> خروجی PDF
              </Button>
              <span className="text-[10px] text-muted-foreground self-center">
                خروجی فیلترها، نسخه داده و زمان تولید را ثبت می‌کند؛ مجموع خروجی با گزارش منطبق است (بخش ۲۳.۲ سند).
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* گفت‌وگوی Drill Through — بخش ۱۹.۳ */}
      <Dialog open={!!drillThrough} onOpenChange={o => !o && setDrillThrough(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><ZoomIn className="size-4" /> Drill Through — جزئیات رکوردها</DialogTitle>
            <DialogDescription className="text-xs">
              {drillThrough?.title} | {formatNumber(dtTotal)} رکورد مطابق مجوز شما؛ نمایش حداکثر ۵۰ سطر (بخش ۱۹.۳ سند)
            </DialogDescription>
          </DialogHeader>
          {dtLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <ScrollArea className="h-72 rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    {fields.map(f => <TableHead key={f.id} className="whitespace-nowrap text-xs">{f.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dtRows.map((r, i) => (
                    <TableRow key={i}>
                      {fields.map(f => (
                        <TableCell key={f.id} className="text-xs whitespace-nowrap max-w-44 truncate">
                          {r[f.id] === null || r[f.id] === undefined || String(r[f.id]) === '' ? '—' : String(r[f.id])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {dtRows.length === 0 && (
                    <TableRow><TableCell colSpan={fields.length} className="text-center text-xs text-muted-foreground py-8">رکوردی مطابق فیلترها یافت نشد.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const opLabels = {
  eq: 'برابر', neq: 'نابرابر', contains: 'شامل', gt: 'بزرگ‌تر', lt: 'کوچک‌تر',
} as const

// اعداد فارسی برای نمایش ارقام (قابل تنظیم — بخش ۲۲ سند)
export { toPersianDigits }
