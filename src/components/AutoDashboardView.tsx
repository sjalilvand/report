'use client'

// داشبورد هوشمند — پس از بارگذاری فایل اکسل، داشبورد و تحلیل‌ها به‌صورت خودکار ساخته می‌شوند
// کارت شاخص، روند دوره‌ای، تفکیک و ترکیب سهم، بینش‌های فارسی و جدول مقایسه — بدون هیچ پیکربندی
// حالت ویرایش: مخفی/نمایش، جابه‌جایی، تغییر نوع نمودار، تغییر عنوان و ذخیره چیدمان (PUT autodash)

import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '@/lib/client'
import { formatNumber } from '@/lib/currency'
import type { AutoDash, AutoDashLayout, AutoDashKpi, AutoDashBreakdown } from '@/lib/autodash'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tip } from '@/components/HelpTip'
import {
  LayoutDashboard, RefreshCw, Pencil, Save, RotateCcw, Eye, EyeOff, ArrowUp, ArrowDown,
  Trophy, TrendingUp, TrendingDown, Minus, PieChart as PieIcon, ShieldCheck, CalendarDays,
  Sparkles, Loader2, Table2, BarChart3, Lightbulb, Layers, Users, Info, AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts'

// ────────────────────────── قالب‌بندی اعداد فارسی ──────────────────────────
const fa = (n: number, d = 0) => formatNumber(n, true, d)
const faCompact = (n: number): string => {
  if (!Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e9) return `${fa(n / 1e9, 2)} میلیارد`
  if (a >= 1e6) return `${fa(n / 1e6, 1)} میلیون`
  if (a >= 1e3) return `${fa(n / 1e3, 1)} هزار`
  return fa(Math.round(n))
}
const fmtKpi = (k: AutoDashKpi): string => {
  if (k.fmt === 'percent') return `${fa(k.value, 1)}٪`
  return fa(k.value)
}
const fmtPct = (v: number | null, d = 1): string => (v === null || !Number.isFinite(v) ? '—' : `${fa(Math.round(v * 10 ** d) / 10 ** d, d)}٪`)

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48']
const KPI_ACCENTS = [
  { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' },
  { bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300' },
  { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' },
  { bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' },
  { bar: 'bg-violet-500', chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300' },
  { bar: 'bg-cyan-500', chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300' },
  { bar: 'bg-lime-500', chip: 'bg-lime-100 text-lime-700 dark:bg-lime-900/60 dark:text-lime-300' },
]

const INSIGHT_STYLE = {
  good: { ring: 'border-r-emerald-500', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300', Icon: TrendingUp },
  bad: { ring: 'border-r-rose-500', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300', Icon: TrendingDown },
  warn: { ring: 'border-r-amber-500', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300', Icon: AlertTriangle },
  info: { ring: 'border-r-sky-500', chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300', Icon: Info },
} as const

const INSIGHT_ICON = {
  trophy: Trophy, trend: TrendingUp, pie: PieIcon, shield: ShieldCheck, calendar: CalendarDays, spark: Sparkles,
} as const

type ChartKind = 'area' | 'bar' | 'pie'
type DashTab = 'overview' | 'trend' | 'breakdown' | 'insights' | 'table'

// ────────────────────────── اعمال چیدمان روی داشبورد خام (سمت کلاینت) ──────────────────────────
function applyClientLayout(raw: AutoDash, l: AutoDashLayout): AutoDash {
  const hiddenSections = l.hiddenSections ?? []
  const has = (s: string) => hiddenSections.includes(s as never)
  const kpis = raw.kpis
    .filter(k => !(l.hiddenKpis ?? []).includes(k.id))
    .sort((a, b) => {
      const ia = l.kpiOrder?.indexOf(a.id) ?? -1, ib = l.kpiOrder?.indexOf(b.id) ?? -1
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  const limit = l.topLimit
  const trim = (b: AutoDashBreakdown): AutoDashBreakdown => {
    if (!limit || limit >= b.rows.length) return b
    const rows = b.rows.slice(0, limit)
    const hidden = b.rows.slice(limit)
    return {
      ...b, rows, topLimit: limit,
      othersValue: b.othersValue + hidden.reduce((s, r) => s + r.value, 0),
      othersCount: b.othersCount + hidden.reduce((s, r) => s + r.count, 0),
    }
  }
  const breakdowns = raw.breakdowns
    .filter(b => !(l.hiddenBreakdowns ?? []).includes(b.id))
    .sort((a, b) => {
      const ia = l.breakdownOrder?.indexOf(a.id) ?? -1, ib = l.breakdownOrder?.indexOf(b.id) ?? -1
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    .map(trim)
  return {
    ...raw,
    title: l.title?.trim() || raw.title,
    kpis,
    breakdowns,
    trend: has('trend') ? undefined : raw.trend,
    trendTable: has('trend') ? [] : raw.trendTable,
    insights: has('insights') ? [] : raw.insights,
    summary: has('summary') ? undefined : raw.summary,
  }
}

// ────────────────────────── چیپ تغییر (مثل نمونه‌های داشبورد کاربر) ──────────────────────────
function DeltaChip({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct)) return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"><Minus className="size-3" /> —</span>
  const up = pct >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'}`}>
      <Icon className="size-3" /> {fa(Math.abs(Math.round(pct * 10) / 10), 1)}٪
    </span>
  )
}

// ────────────────────────── کارت شاخص ──────────────────────────
function KpiCard({ kpi, accent, editMode, onToggle, onMove, canUp, canDown, index }: {
  kpi: AutoDashKpi
  accent: (typeof KPI_ACCENTS)[number]
  editMode: boolean
  onToggle: () => void
  onMove: (dir: -1 | 1) => void
  canUp: boolean
  canDown: boolean
  index: number
}) {
  const compact = Math.abs(kpi.value) >= 1e6 && kpi.fmt !== 'percent'
  return (
    <div className={`card-lift relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm`}>
      <span className={`absolute inset-y-0 right-0 w-1.5 ${accent.bar}`} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          {kpi.label}
          <Tip label={kpi.hint} side="top">
            <span className="inline-flex cursor-help text-muted-foreground/60 hover:text-primary"><Info className="size-3.5" /></span>
          </Tip>
        </p>
        {editMode ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Tip label="جابه‌جایی به عقب" side="top">
              <Button variant="ghost" size="icon" className="size-6" disabled={!canUp} onClick={() => onMove(-1)} aria-label="جابه‌جایی عقب"><ArrowUp className="size-3" /></Button>
            </Tip>
            <Tip label="جابه‌جایی به جلو" side="top">
              <Button variant="ghost" size="icon" className="size-6" disabled={!canDown} onClick={() => onMove(1)} aria-label="جابه‌جایی جلو"><ArrowDown className="size-3" /></Button>
            </Tip>
            <Tip label="مخفی کردن این کارت" side="top">
              <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={onToggle} aria-label="مخفی"><EyeOff className="size-3" /></Button>
            </Tip>
          </div>
        ) : (
          <span className={`num-fa flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${accent.chip}`}>{fa(index + 1)}</span>
        )}
      </div>
      <p className="mt-2 break-words text-xl font-extrabold leading-8">{fmtKpi(kpi)}{kpi.fmt === 'currency' && kpi.unitHint ? <span className="ms-1 text-xs font-medium text-muted-foreground">{kpi.unitHint}</span> : null}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {kpi.trend ? <DeltaChip pct={kpi.trend.pct} /> : null}
        {compact ? <span className="num-fa text-[10px] text-muted-foreground">≈ {faCompact(kpi.value)}</span> : null}
      </div>
    </div>
  )
}

// ────────────────────────── نمودار روند ──────────────────────────
function TrendChart({ dash, kind, height = 300 }: { dash: AutoDash; kind: ChartKind; height?: number }) {
  const t = dash.trend
  if (!t || t.points.length === 0) return null
  const data = t.points.map(p => ({ label: p.label, value: p.value, count: p.count }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === 'bar' ? (
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" angle={-25} textAnchor="end" height={56} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={faCompact} width={64} />
          <RTooltip formatter={(v: number | string, n: string) => [fa(Number(v)), n === 'value' ? t.measureLabel : 'تعداد']} labelStyle={{ fontWeight: 700 }} contentStyle={{ direction: 'rtl', borderRadius: 10, fontSize: 12 }} />
          <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} maxBarSize={46} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" angle={-25} textAnchor="end" height={56} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={faCompact} width={64} />
          <RTooltip formatter={(v: number | string) => [fa(Number(v)), t.measureLabel]} labelStyle={{ fontWeight: 700 }} contentStyle={{ direction: 'rtl', borderRadius: 10, fontSize: 12 }} />
          <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2.5} fill="url(#trendFill)" dot={{ r: 3, fill: CHART_COLORS[0] }} activeDot={{ r: 5 }} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  )
}

// ────────────────────────── نمودار تفکیک (میله‌ای/افقی/دونات) ──────────────────────────
function BreakdownChart({ bd, kind }: { bd: AutoDashBreakdown; kind: ChartKind }) {
  const rows = [...bd.rows]
  if (bd.othersValue > 0) {
    rows.push({ label: 'سایر', value: bd.othersValue, count: bd.othersCount, share: bd.total !== 0 ? (bd.othersValue / bd.total) * 100 : 0 })
  }
  if (kind === 'pie') {
    return (
      <div className="flex flex-col items-center gap-2">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius="52%" outerRadius="80%" paddingAngle={2} stroke="none">
              {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <RTooltip formatter={(v: number | string, n: string) => [`${fa(Number(v))} (${fmtPct(rows.find(r => r.label === n)?.share ?? null)})`, n]} contentStyle={{ direction: 'rtl', borderRadius: 10, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, direction: 'rtl' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }
  // bar — افقی برای خوانایی برچسب‌های فارسی
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 34 + 40)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={faCompact} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={130} />
        <RTooltip formatter={(v: number | string) => [fa(Number(v)), bd.measureLabel]} contentStyle={{ direction: 'rtl', borderRadius: 10, fontSize: 12 }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ────────────────────────── نمای اصلی ──────────────────────────
export default function AutoDashboardView({ datasetId, datasetName, canEdit, onDatasetEdited }: {
  datasetId: string
  datasetName: string
  canEdit: boolean
  onDatasetEdited?: () => void
}) {
  const [raw, setRaw] = useState<AutoDash | null>(null)
  const [layout, setLayout] = useState<AutoDashLayout>({})
  const [savedLayout, setSavedLayout] = useState<AutoDashLayout>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [tab, setTab] = useState<DashTab>('overview')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<{ dashboard: AutoDash; raw: AutoDash; layout: AutoDashLayout | null }>(`/api/datasets/${datasetId}/autodash`)
      setRaw(res.raw ?? res.dashboard)
      const l = res.layout ?? {}
      setLayout(l)
      setSavedLayout(l)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ساخت داشبورد')
    } finally {
      setLoading(false)
    }
  }, [datasetId])

  useEffect(() => { load() }, [load])

  const dash = useMemo(() => (raw ? applyClientLayout(raw, layout) : null), [raw, layout])
  const dirty = useMemo(() => JSON.stringify(layout) !== JSON.stringify(savedLayout), [layout, savedLayout])

  // ── ویرایش چیدمان ──
  const patchLayout = (p: Partial<AutoDashLayout>) => setLayout(prev => ({ ...prev, ...p }))
  const toggleKpi = (id: string) => patchLayout({ hiddenKpis: (layout.hiddenKpis ?? []).includes(id) ? (layout.hiddenKpis ?? []).filter(x => x !== id) : [...(layout.hiddenKpis ?? []), id] })
  const moveKpi = (id: string, dir: -1 | 1) => {
    const order = [...(layout.kpiOrder ?? (raw?.kpis ?? []).map(k => k.id))]
    const i = order.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    patchLayout({ kpiOrder: order })
  }
  const toggleBreakdown = (id: string) => patchLayout({ hiddenBreakdowns: (layout.hiddenBreakdowns ?? []).includes(id) ? (layout.hiddenBreakdowns ?? []).filter(x => x !== id) : [...(layout.hiddenBreakdowns ?? []), id] })
  const moveBreakdown = (id: string, dir: -1 | 1) => {
    const order = [...(layout.breakdownOrder ?? (raw?.breakdowns ?? []).map(b => b.id))]
    const i = order.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    patchLayout({ breakdownOrder: order })
  }
  const setChartType = (id: string, t: ChartKind) => patchLayout({ chartTypes: { ...(layout.chartTypes ?? {}), [id]: t } })
  const toggleSection = (s: NonNullable<AutoDashLayout['hiddenSections']>[number]) => {
    const cur = layout.hiddenSections ?? []
    patchLayout({ hiddenSections: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] })
  }

  const saveLayout = async () => {
    setSaving(true)
    try {
      await api.put(`/api/datasets/${datasetId}/autodash`, { layout })
      setSavedLayout(layout)
      setEditMode(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره چیدمان')
    } finally {
      setSaving(false)
    }
  }
  const resetLayout = async () => {
    setSaving(true)
    try {
      await api.put(`/api/datasets/${datasetId}/autodash`, { reset: true })
      setLayout({})
      setSavedLayout({})
      setEditMode(false)
      onDatasetEdited?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بازگردانی')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }
  if (error && !dash) {
    return <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>خطا</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
  }
  if (!dash) return null

  const isHidden = (s: NonNullable<AutoDashLayout['hiddenSections']>[number]) => (layout.hiddenSections ?? []).includes(s)
  const trendType: ChartKind = layout.chartTypes?.['trend'] ?? 'area'
  const firstBd = dash.breakdowns[0]
  const topInsights = dash.insights.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* بنر داشبورد */}
      <div className="section-gradient relative overflow-hidden rounded-xl border px-5 py-4">
        <div className="pointer-events-none absolute -left-8 -top-10 size-36 rounded-full bg-primary/10 blur-2xl" aria-hidden />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold leading-7">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"><LayoutDashboard className="size-4" /></span>
              {dash.title}
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="size-3" /> {fa(dash.rowCount)} رکورد</span>
              {dash.dateRange ? <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" /> از {dash.dateRange.from} تا {dash.dateRange.to} ({fa(dash.dateRange.periods)} دوره)</span> : null}
              {dash.primaryMeasureLabel ? <span className="inline-flex items-center gap-1"><BarChart3 className="size-3" /> سنجه اصلی: {dash.primaryMeasureLabel}</span> : null}
              {dash.primaryDimensionLabel ? <span className="inline-flex items-center gap-1"><Layers className="size-3" /> بُعد اصلی: {dash.primaryDimensionLabel}</span> : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Tip label="محاسبه مجدد داشبورد با آخرین نسخه داده و ستون‌ها" side="bottom">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={load} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> بازسازی</Button>
            </Tip>
            {canEdit ? (
              editMode ? (
                <>
                  <Tip label="ذخیره چیدمان ویرایش‌شده — برای همه کاربران همین مجموعه‌داده اعمال می‌شود" side="bottom">
                    <Button size="sm" className="gap-1.5 text-xs" onClick={saveLayout} disabled={saving || !dirty}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} ذخیره چیدمان{dirty ? ' *' : ''}</Button>
                  </Tip>
                  <Tip label="بازگشت به چیدمان پیش‌فرض سامانه" side="bottom">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={resetLayout} disabled={saving}><RotateCcw className="size-3.5" /> بازگردانی پیش‌فرض</Button>
                  </Tip>
                  <Tip label="اتمام ویرایش و خروج از حالت چیدمان" side="bottom">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setEditMode(false)}><Eye className="size-3.5" /> اتمام ویرایش</Button>
                  </Tip>
                </>
              ) : (
                <Tip label="ویرایش داشبورد: مخفی/نمایش کارت‌ها، جابه‌جایی، تغییر نوع نمودار و عنوان" side="bottom">
                  <Button variant="outline" size="sm" className="gap-1.5 border-primary/40 text-xs text-primary hover:bg-primary/10" onClick={() => setEditMode(true)}><Pencil className="size-3.5" /> ویرایش داشبورد</Button>
                </Tip>
              )
            ) : null}
          </div>
        </div>
        {editMode ? (
          <p className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[11px] text-primary">
            <Pencil className="size-3 shrink-0" />
            حالت ویرایش فعال است: روی هر کارت دکمه‌های مخفی‌سازی و جابه‌جایی ظاهر شده و نوع نمودارها قابل تغییر است. پس از پایان، «ذخیره چیدمان» را بزنید.
          </p>
        ) : null}
        {error ? <p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">{error}</p> : null}
      </div>

      {dash.warnings.length > 0 ? (
        <Alert>
          <Info className="size-4" />
          <AlertTitle className="text-sm">نکته‌های تشخیص خودکار</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1 text-xs leading-6">
              {dash.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={v => setTab(v as DashTab)} className="gap-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><LayoutDashboard className="size-3.5" /> نمای کلی</TabsTrigger>
          {!isHidden('trend') ? <TabsTrigger value="trend" className="gap-1.5 text-xs" disabled={!dash.trend}><TrendingUp className="size-3.5" /> روند دوره‌ای</TabsTrigger> : null}
          {!isHidden('breakdowns') ? <TabsTrigger value="breakdown" className="gap-1.5 text-xs" disabled={dash.breakdowns.length === 0}><Layers className="size-3.5" /> تفکیک و ترکیب</TabsTrigger> : null}
          {!isHidden('insights') ? <TabsTrigger value="insights" className="gap-1.5 text-xs" disabled={dash.insights.length === 0}><Lightbulb className="size-3.5" /> بینش‌های خودکار</TabsTrigger> : null}
          {!isHidden('summary') ? <TabsTrigger value="table" className="gap-1.5 text-xs" disabled={!dash.summary}><Table2 className="size-3.5" /> جدول خلاصه</TabsTrigger> : null}
        </TabsList>

        {/* ── نمای کلی: KPI + روند + دونات + بینش‌های برتر ── */}
        <TabsContent value="overview" className="space-y-4">
          {dash.kpis.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dash.kpis.map((k, i) => (
                <KpiCard key={k.id} kpi={k} index={i} accent={KPI_ACCENTS[i % KPI_ACCENTS.length]} editMode={editMode}
                  onToggle={() => toggleKpi(k.id)} onMove={d => moveKpi(k.id, d)} canUp={i > 0} canDown={i < dash.kpis.length - 1} />
              ))}
            </div>
          ) : (
            <Alert><Info className="size-4" /><AlertTitle className="text-sm">کارت شاخصی ساخته نشد</AlertTitle><AlertDescription className="text-xs">هیچ ستون عددی یا متن قابل گروه‌بندی شناسایی نشد؛ نوع ستون‌ها را در گام «ستون‌ها» بازبینی و داشبورد را بازسازی کنید.</AlertDescription></Alert>
          )}
          {dash.trend && !isHidden('trend') ? (
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5"><TrendingUp className="size-4 text-primary" /> {dash.trend.title}</span>
                    {editMode ? <ChartTypePicker id="trend" value={trendType} onChange={setChartType} /> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent><TrendChart dash={dash} kind={trendType} /></CardContent>
              </Card>
              {firstBd ? (
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5"><PieIcon className="size-4 text-primary" /> ترکیب {firstBd.dimensionLabel}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent><BreakdownChart bd={firstBd} kind="pie" /></CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
          {topInsights.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {topInsights.map(ins => {
                const st = INSIGHT_STYLE[ins.tone]
                const Ic = INSIGHT_ICON[ins.icon] ?? Sparkles
                return (
                  <div key={ins.id} className={`card-lift rounded-xl border border-r-4 bg-card p-4 shadow-sm ${st.ring}`}>
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${st.chip}`}><Ic className="size-3.5" /></span>
                      {ins.title}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{ins.text}</p>
                  </div>
                )
              })}
            </div>
          ) : null}
        </TabsContent>

        {/* ── روند دوره‌ای: نمودار + جدول مقایسه با چیپ تغییر ── */}
        <TabsContent value="trend" className="space-y-4">
          {dash.trend ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5"><TrendingUp className="size-4 text-primary" /> {dash.trend.title}</span>
                    {editMode ? <ChartTypePicker id="trend" value={trendType} onChange={setChartType} /> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent><TrendChart dash={dash} kind={trendType} height={340} /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-sm"><Table2 className="size-4 text-primary" /> مقایسه دوره‌ای — جمع، میانگین و تغییر نسبت به دوره قبل</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                        <TableRow>
                          <TableHead className="text-right">دوره ({dash.trend.granularity === 'month' ? 'ماه' : dash.trend.granularity === 'quarter' ? 'فصل' : 'سال'})</TableHead>
                          <TableHead className="text-center">تعداد رکورد</TableHead>
                          <TableHead className="text-center">جمع {dash.trend.measureLabel}</TableHead>
                          <TableHead className="text-center">میانگین</TableHead>
                          <TableHead className="text-center">تغییر</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dash.trendTable.map((r, i) => (
                          <TableRow key={i} className={i === dash.trendTable.length - 1 ? 'bg-primary/5 font-semibold' : ''}>
                            <TableCell className="text-right text-xs font-medium">{r.label}</TableCell>
                            <TableCell className="num-fa text-center text-xs">{fa(r.count)}</TableCell>
                            <TableCell className="num-fa text-center text-xs">{fa(r.sum)}</TableCell>
                            <TableCell className="num-fa text-center text-xs">{fa(r.avg)}</TableCell>
                            <TableCell className="text-center"><DeltaChip pct={r.deltaPct} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">تغییر درصدی برای دوره نخست تعریف ندارد و با «—» نمایش داده می‌شود؛ مبنا جمع دوره قبل است (قاعده ۲۱.۳ سند).</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert><Info className="size-4" /><AlertTitle className="text-sm">روند دوره‌ای در دسترس نیست</AlertTitle><AlertDescription className="text-xs">ستون تاریخ شناسایی نشد یا تنها یک دوره زمانی در داده وجود دارد. اگر ستون تاریخ دارید، نوع آن را در گام «ستون‌ها» تأیید کنید و «بازسازی» را بزنید.</AlertDescription></Alert>
          )}
          {editMode ? <SectionHideToggle id="trend" hidden={isHidden('trend')} onToggle={() => toggleSection('trend')} label="کل بخش روند دوره‌ای" /> : null}
        </TabsContent>

        {/* ── تفکیک و ترکیب: هر بُعد یک کارت نمودار ── */}
        <TabsContent value="breakdown" className="space-y-4">
          {dash.breakdowns.length > 0 ? (
            <div className={dash.breakdowns.length > 1 ? 'grid gap-4 xl:grid-cols-2' : ''}>
              {dash.breakdowns.map((bd, i) => {
                const kind: ChartKind = layout.chartTypes?.[bd.id] ?? 'bar'
                return (
                  <Card key={bd.id} className="card-lift">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-1.5"><Layers className="size-4 text-primary" /> {bd.measureLabel} به تفکیک «{bd.dimensionLabel}»</span>
                        {editMode ? (
                          <div className="flex items-center gap-1">
                            <ChartTypePicker id={bd.id} value={kind} onChange={setChartType} allowPie />
                            <Tip label="جابه‌جایی به عقب" side="top"><Button variant="ghost" size="icon" className="size-6" disabled={i === 0} onClick={() => moveBreakdown(bd.id, -1)}><ArrowUp className="size-3" /></Button></Tip>
                            <Tip label="جابه‌جایی به جلو" side="top"><Button variant="ghost" size="icon" className="size-6" disabled={i === dash.breakdowns.length - 1} onClick={() => moveBreakdown(bd.id, 1)}><ArrowDown className="size-3" /></Button></Tip>
                            <Tip label="مخفی کردن این تفکیک" side="top"><Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={() => toggleBreakdown(bd.id)}><EyeOff className="size-3" /></Button></Tip>
                          </div>
                        ) : null}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BreakdownChart bd={bd} kind={kind} />
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                        <span>جمع کل: {fa(bd.total)}</span>
                        <span>{fa(bd.rows.length)} دسته برتر{bd.topLimit ? ` از ${fa(bd.topLimit)}+` : ''}</span>
                        {bd.othersValue > 0 ? <span>سایر: {fa(bd.othersValue)} در {fa(bd.othersCount)} رکورد</span> : null}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Alert><Info className="size-4" /><AlertTitle className="text-sm">تفکیکی ساخته نشد</AlertTitle><AlertDescription className="text-xs">ستون دسته‌بندی مناسب (متن با تعداد مقادیر محدود) یافت نشد؛ نوع ستون‌های متنی را در گام «ستون‌ها» روی «دسته‌بندی» یا «متن» بگذارید.</AlertDescription></Alert>
          )}
          {editMode && dash.breakdowns.length > 0 ? <SectionHideToggle id="breakdowns" hidden={isHidden('breakdowns')} onToggle={() => toggleSection('breakdowns')} label="کل بخش تفکیک‌ها" /> : null}
        </TabsContent>

        {/* ── بینش‌های خودکار ── */}
        <TabsContent value="insights" className="space-y-3">
          {dash.insights.length > 0 ? (
            dash.insights.map(ins => {
              const st = INSIGHT_STYLE[ins.tone]
              const Ic = INSIGHT_ICON[ins.icon] ?? Sparkles
              return (
                <div key={ins.id} className={`rounded-xl border border-r-4 bg-card p-4 shadow-sm ${st.ring}`}>
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${st.chip}`}><Ic className="size-3.5" /></span>
                    {ins.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{ins.text}</p>
                </div>
              )
            })
          ) : (
            <Alert><Info className="size-4" /><AlertTitle className="text-sm">بینشی تولید نشد</AlertTitle><AlertDescription className="text-xs">بینش‌ها پس از داشتن داده عددی و حداقل دو دوره زمانی یا دو دسته تولید می‌شوند.</AlertDescription></Alert>
          )}
          {editMode && dash.insights.length > 0 ? <SectionHideToggle id="insights" hidden={isHidden('insights')} onToggle={() => toggleSection('insights')} label="کل بخش بینش‌ها" /> : null}
        </TabsContent>

        {/* ── جدول خلاصه ── */}
        <TabsContent value="table" className="space-y-4">
          {dash.summary ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm"><Table2 className="size-4 text-primary" /> خلاصه عملکرد به تفکیک «{dash.summary.dimensionLabel}» — {dash.summary.measureLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[28rem] overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                      <TableRow>
                        <TableHead className="text-right">{dash.summary.dimensionLabel}</TableHead>
                        <TableHead className="text-center">تعداد رکورد</TableHead>
                        <TableHead className="text-center">جمع</TableHead>
                        <TableHead className="text-center">میانگین</TableHead>
                        <TableHead className="text-center">سهم از کل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dash.summary.rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-right text-xs font-medium">{r.label}</TableCell>
                          <TableCell className="num-fa text-center text-xs">{fa(r.count)}</TableCell>
                          <TableCell className="num-fa text-center text-xs">{fa(r.sum)}</TableCell>
                          <TableCell className="num-fa text-center text-xs">{fa(r.avg)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <span className="num-fa w-12 text-xs">{fmtPct(r.share)}</span>
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(2, r.share))}%` }} />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-primary/5 font-bold">
                        <TableCell className="text-right text-xs">جمع کل</TableCell>
                        <TableCell className="num-fa text-center text-xs">{fa(dash.summary.rows.reduce((s, r) => s + r.count, 0))}</TableCell>
                        <TableCell className="num-fa text-center text-xs">{fa(dash.summary.rows.reduce((s, r) => s + r.sum, 0))}</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">—</TableCell>
                        <TableCell className="num-fa text-center text-xs">{fmtPct(dash.summary.rows.reduce((s, r) => s + r.share, 0))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert><Info className="size-4" /><AlertTitle className="text-sm">جدول خلاصه در دسترس نیست</AlertTitle><AlertDescription className="text-xs">برای جدول خلاصه، یک ستون دسته‌بندی و یک ستون عددی لازم است.</AlertDescription></Alert>
          )}
          {editMode && dash.summary ? <SectionHideToggle id="summary" hidden={isHidden('summary')} onToggle={() => toggleSection('summary')} label="کل بخش جدول خلاصه" /> : null}
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Sparkles className="size-3" />
        این داشبورد به‌صورت خودکار از ساختار داده ساخته شده است — می‌توانید چیدمان را ویرایش کنید یا برای کنترل کامل از «گزارش‌ساز» (گام ۶) استفاده کنید.
      </p>
    </div>
  )
}

// انتخاب نوع نمودار در حالت ویرایش
function ChartTypePicker({ id, value, onChange, allowPie = false }: {
  id: string
  value: ChartKind
  onChange: (id: string, t: ChartKind) => void
  allowPie?: boolean
}) {
  const options: { v: ChartKind; l: string }[] = [
    { v: 'area', l: 'نمودار مساحی' },
    { v: 'bar', l: 'میله‌ای' },
    ...(allowPie ? [{ v: 'pie' as ChartKind, l: 'دونات' }] : []),
  ]
  return (
    <Select value={value} onValueChange={v => onChange(id, v as ChartKind)}>
      <Tip label="نوع نمایش این نمودار را تغییر دهید" side="left">
        <SelectTrigger className="h-7 w-36 text-xs" aria-label="نوع نمودار"><SelectValue /></SelectTrigger>
      </Tip>
      <SelectContent>
        {options.map(o => <SelectItem key={o.v} value={o.v} className="text-xs">{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

// دکمه مخفی/نمایش کل بخش در حالت ویرایش
function SectionHideToggle({ id, hidden, onToggle, label }: { id: string; hidden: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="flex items-center justify-end">
      <Tip label={hidden ? 'نمایش دوباره این بخش در داشبورد' : 'این بخش از داشبورد مخفی می‌شود (پس از ذخیره چیدمان)'} side="top">
        <Button variant="outline" size="sm" className={`gap-1.5 text-xs ${hidden ? 'border-destructive/40 text-destructive' : ''}`} onClick={onToggle} data-section={id}>
          {hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {hidden ? `نمایش ${label}` : `مخفی کردن ${label}`}
        </Button>
      </Tip>
    </div>
  )
}
