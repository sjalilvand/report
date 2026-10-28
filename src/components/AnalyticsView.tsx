'use client'

// تحلیل‌های پیشرفته — بخش ۲۱.۲ و ۲۱.۳ سند
// روند و پیش‌بینی سری زمانی، تحلیل Cohort و حفظ مخاطبان، بخش‌بندی و RFM،
// سناریوسازی (What-if)، همبستگی و تشخیص ناهنجاری
// همه خروجی‌ها: روش، تعداد نمونه، داده حذف‌شده و هشدارهای صحت تحلیل (بخش ۲۱.۳)

import { useState, useMemo } from 'react'
import { api } from '@/lib/client'
import type { QueryFilter } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, TrendingUp, Users, Crown, SlidersHorizontal, Grid3X3, Radar, Info } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts'
import { FieldMetaClient } from './ColumnsEditor'
import { toPersianDigits } from '@/lib/digits'

// ---------- انواع پاسخ API (مطابق lib/analytics.ts) ----------
interface Meta { used: number; skipped: number; scannedRecords: number; warnings: string[] }
interface SeriesPoint { key: string; label: string; value: number }
interface ForecastPoint { label: string; value: number; lo: number; hi: number; isForecast: boolean }
interface TrendResp {
  history: SeriesPoint[]
  fit: ForecastPoint[]
  forecast: ForecastPoint[]
  r2: number
  mae: number
  mape: number | null
  direction: 'up' | 'down' | 'flat'
  method: string
  meta: Meta
}
interface CorrResp {
  fields: { id: string; label: string }[]
  matrix: (number | null)[][]
  topPairs: { labelA: string; labelB: string; r: number; n: number; strength: string }[]
  method: string
  caveat: string
  meta: Meta
}
interface CohortResp {
  rows: { cohort: string; size: number; cells: { offset: number; count: number; pct: number | null }[] }[]
  maxOffset: number
  method: string
  meta: Meta
}
interface RfmResp {
  customers: { id: string; recencyDays: number; frequency: number; monetary: number; rScore: number; fScore: number; mScore: number; segment: string }[]
  segments: { key: string; label: string; count: number; pct: number; avgFrequency: number; avgMonetary: number }[]
  totalCustomers: number
  referenceDate: string
  hasMonetary: boolean
  method: string
  meta: Meta
}
interface WhatIfResp {
  rows: { dim: string; baseline: Record<string, number>; scenario: Record<string, number>; delta: Record<string, number>; deltaPct: Record<string, number | null>; factor: number }[]
  measureAliases: string[]
  totals: { baseline: Record<string, number>; scenario: Record<string, number>; delta: Record<string, number>; deltaPct: Record<string, number | null> }
  globalPct: number
  note: string
  meta: Meta
}
interface AnomalyResp {
  series: (SeriesPoint & { z: number; isAnomaly: boolean })[]
  threshold: number
  anomalies: (SeriesPoint & { z: number })[]
  method: string
  meta: Meta
}

type AnalyticsMode = 'trend' | 'cohort' | 'rfm' | 'whatif' | 'correlation' | 'anomaly'

const MODE_TABS: { key: AnalyticsMode; label: string; icon: React.ReactNode }[] = [
  { key: 'trend', label: 'روند و پیش‌بینی', icon: <TrendingUp className="size-3.5" /> },
  { key: 'cohort', label: 'گروه‌های زمانی (Cohort)', icon: <Users className="size-3.5" /> },
  { key: 'rfm', label: 'بخش‌بندی RFM', icon: <Crown className="size-3.5" /> },
  { key: 'whatif', label: 'سناریوسازی (What-if)', icon: <SlidersHorizontal className="size-3.5" /> },
  { key: 'correlation', label: 'همبستگی', icon: <Grid3X3 className="size-3.5" /> },
  { key: 'anomaly', label: 'ناهنجاری', icon: <Radar className="size-3.5" /> },
]

const GRAN_LABELS: Record<string, string> = { day: 'روز', month: 'ماه', quarter: 'فصل', year: 'سال' }
const AGG_LABELS: Record<string, string> = { sum: 'جمع', avg: 'میانگین', count: 'تعداد رکورد', min: 'کمینه', max: 'بیشینه', median: 'میانه' }

export default function AnalyticsView({ datasetId, fields }: {
  datasetId: string
  fields: FieldMetaClient[]
}) {
  // ستون‌های قابل انتخاب — بخش ۲۱.۲: پیش‌نیازهای هر تحلیل به‌صورت خودکار پیشنهاد می‌شود
  const dateFields = fields.filter(f => f.type === 'date' || f.type === 'datetime')
  const idFields = fields.filter(f => f.role === 'identifier' || f.type === 'identifier' || f.type === 'text')
  const measureFields = fields.filter(f => f.role === 'measure' || ['integer', 'decimal', 'amount', 'percent'].includes(f.type))
  const dimFields = fields.filter(f => f.role === 'dimension' || ['text', 'category', 'boolean'].includes(f.type))

  const [mode, setMode] = useState<AnalyticsMode>('trend')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // پارامترهای هر تحلیل
  const [trendDate, setTrendDate] = useState('')
  const [trendMeasure, setTrendMeasure] = useState('')
  const [trendAgg, setTrendAgg] = useState('sum')
  const [trendGran, setTrendGran] = useState('month')
  const [trendHorizon, setTrendHorizon] = useState('3')

  const [cohortId, setCohortId] = useState('')
  const [cohortDate, setCohortDate] = useState('')
  const [cohortGran, setCohortGran] = useState('month')

  const [rfmId, setRfmId] = useState('')
  const [rfmDate, setRfmDate] = useState('')
  const [rfmAmount, setRfmAmount] = useState('')

  const [wiDim, setWiDim] = useState('')
  const [wiMeasure, setWiMeasure] = useState('')
  const [wiAgg, setWiAgg] = useState('sum')
  const [wiGlobalPct, setWiGlobalPct] = useState('10')

  const [anomalyDate, setAnomalyDate] = useState('')
  const [anomalyMeasure, setAnomalyMeasure] = useState('')
  const [anomalyAgg, setAnomalyAgg] = useState('sum')
  const [anomalyGran, setAnomalyGran] = useState('month')

  // نتایج
  const [trend, setTrend] = useState<TrendResp | null>(null)
  const [cohort, setCohort] = useState<CohortResp | null>(null)
  const [rfm, setRfm] = useState<RfmResp | null>(null)
  const [whatif, setWhatif] = useState<WhatIfResp | null>(null)
  const [corr, setCorr] = useState<CorrResp | null>(null)
  const [anomaly, setAnomaly] = useState<AnomalyResp | null>(null)

  const run = async (m: AnalyticsMode) => {
    setLoading(true)
    setError('')
    try {
      let res: unknown
      switch (m) {
        case 'trend':
          if (!trendDate) { setError('ستون تاریخ را انتخاب کنید.'); return }
          res = await api.post<TrendResp>(`/api/datasets/${datasetId}/analytics`, {
            mode: 'trend', dateField: trendDate,
            measureField: trendMeasure || undefined,
            agg: trendMeasure ? trendAgg : 'count',
            granularity: trendGran, horizon: Number(trendHorizon) || 3,
          })
          setTrend(res as TrendResp)
          break
        case 'cohort':
          if (!cohortId || !cohortDate) { setError('ستون شناسه و ستون تاریخ را انتخاب کنید.'); return }
          res = await api.post<CohortResp>(`/api/datasets/${datasetId}/analytics`, {
            mode: 'cohort', idField: cohortId, dateField: cohortDate, granularity: cohortGran,
          })
          setCohort(res as CohortResp)
          break
        case 'rfm':
          if (!rfmId || !rfmDate) { setError('ستون شناسه و ستون تاریخ را انتخاب کنید.'); return }
          res = await api.post<RfmResp>(`/api/datasets/${datasetId}/analytics`, {
            mode: 'rfm', idField: rfmId, dateField: rfmDate, amountField: rfmAmount || undefined,
          })
          setRfm(res as RfmResp)
          break
        case 'whatif':
          if (!wiDim) { setError('بُعد سناریو را انتخاب کنید.'); return }
          res = await api.post<WhatIfResp>(`/api/datasets/${datasetId}/analytics`, {
            mode: 'whatif', dimensions: [wiDim],
            measures: wiMeasure ? [{ fieldId: wiMeasure, agg: wiAgg }] : [{ agg: 'count' }],
            globalPct: Number(wiGlobalPct) || 0,
          })
          setWhatif(res as WhatIfResp)
          break
        case 'correlation':
          res = await api.post<CorrResp>(`/api/datasets/${datasetId}/analytics`, { mode: 'correlation' })
          setCorr(res as CorrResp)
          break
        case 'anomaly':
          if (!anomalyDate) { setError('ستون تاریخ را انتخاب کنید.'); return }
          res = await api.post<AnomalyResp>(`/api/datasets/${datasetId}/analytics`, {
            mode: 'anomaly', dateField: anomalyDate,
            measureField: anomalyMeasure || undefined,
            agg: anomalyMeasure ? anomalyAgg : 'count',
            granularity: anomalyGran,
          })
          setAnomaly(res as AnomalyResp)
          break
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در اجرای تحلیل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={v => setMode(v as AnalyticsMode)}>
        <TabsList className="flex-wrap h-auto gap-1 justify-start w-full">
          {MODE_TABS.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="gap-1.5 text-xs">{t.icon} {t.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* روند و پیش‌بینی */}
        <TabsContent value="trend" className="mt-4 space-y-4">
          <ParamCard title="پارامترهای روند و پیش‌بینی (بخش ۲۱.۲)">
            <ParamSelect label="ستون تاریخ" value={trendDate} onChange={setTrendDate} options={dateFields} placeholder="انتخاب ستون تاریخ…" />
            <ParamSelect label="سنجه (اختیاری — خالی: تعداد رکورد)" value={trendMeasure} onChange={setTrendMeasure} options={measureFields} placeholder="تعداد رکورد" />
            {trendMeasure && <ParamSelect label="نوع تجمیع" value={trendAgg} onChange={setTrendAgg} options={Object.keys(AGG_LABELS).map(k => ({ id: k, label: AGG_LABELS[k] }))} />}
            <ParamSelect label="دوره‌بندی" value={trendGran} onChange={setTrendGran} options={Object.keys(GRAN_LABELS).map(k => ({ id: k, label: GRAN_LABELS[k] }))} />
            <ParamSelect label="افق پیش‌بینی" value={trendHorizon} onChange={setTrendHorizon} options={['1', '2', '3', '6', '12'].map(k => ({ id: k, label: `${toPersianDigits(k)} دوره` }))} />
            <RunButton loading={loading} onClick={() => run('trend')} />
          </ParamCard>
          {error && <ErrorAlert msg={error} />}
          {trend && <TrendResult resp={trend} />}
        </TabsContent>

        {/* Cohort */}
        <TabsContent value="cohort" className="mt-4 space-y-4">
          <ParamCard title="پارامترهای گروه‌های زمانی — نیازمند شناسه معتبر (بخش ۲۱.۲)">
            <ParamSelect label="ستون شناسه (مشتری/موکل/واحد…)" value={cohortId} onChange={setCohortId} options={idFields} placeholder="انتخاب ستون شناسه…" />
            <ParamSelect label="ستون تاریخ فعالیت" value={cohortDate} onChange={setCohortDate} options={dateFields} placeholder="انتخاب ستون تاریخ…" />
            <ParamSelect label="دوره‌بندی" value={cohortGran} onChange={setCohortGran} options={['month', 'quarter', 'year'].map(k => ({ id: k, label: GRAN_LABELS[k] }))} />
            <RunButton loading={loading} onClick={() => run('cohort')} />
          </ParamCard>
          {error && <ErrorAlert msg={error} />}
          {cohort && <CohortResult resp={cohort} />}
        </TabsContent>

        {/* RFM */}
        <TabsContent value="rfm" className="mt-4 space-y-4">
          <ParamCard title="پارامترهای RFM — در صورت تناسب داده (بخش ۲۱.۲)">
            <ParamSelect label="ستون شناسه مشتری" value={rfmId} onChange={setRfmId} options={idFields} placeholder="انتخاب ستون شناسه…" />
            <ParamSelect label="ستون تاریخ" value={rfmDate} onChange={setRfmDate} options={dateFields} placeholder="انتخاب ستون تاریخ…" />
            <ParamSelect label="ستون مبلغ (اختیاری)" value={rfmAmount} onChange={setRfmAmount} options={measureFields} placeholder="بدون سنجه مالی" />
            <RunButton loading={loading} onClick={() => run('rfm')} />
          </ParamCard>
          {error && <ErrorAlert msg={error} />}
          {rfm && <RfmResult resp={rfm} />}
        </TabsContent>

        {/* What-if */}
        <TabsContent value="whatif" className="mt-4 space-y-4">
          <ParamCard title="پارامترهای سناریوسازی — «اگر X درصد تغییر کند چه می‌شود؟» (بخش ۲۱.۲)">
            <ParamSelect label="بُعد تفکیک سناریو" value={wiDim} onChange={setWiDim} options={dimFields} placeholder="انتخاب بُعد…" />
            <ParamSelect label="سنجه (اختیاری — خالی: تعداد رکورد)" value={wiMeasure} onChange={setWiMeasure} options={measureFields} placeholder="تعداد رکورد" />
            {wiMeasure && <ParamSelect label="نوع تجمیع" value={wiAgg} onChange={setWiAgg} options={['sum', 'avg', 'count'].map(k => ({ id: k, label: AGG_LABELS[k] }))} />}
            <div className="space-y-1">
              <Label className="text-xs">تغییر درصدی سراسری (%)</Label>
              <Input type="number" step="1" className="h-8 text-xs" value={wiGlobalPct} onChange={e => setWiGlobalPct(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">مثال: ۱۰ یعنی رشد ۱۰٪ سنجه؛ ۱۵− یعنی کاهش ۱۵٪</p>
            </div>
            <RunButton loading={loading} onClick={() => run('whatif')} />
          </ParamCard>
          {error && <ErrorAlert msg={error} />}
          {whatif && <WhatIfResult resp={whatif} />}
        </TabsContent>

        {/* همبستگی */}
        <TabsContent value="correlation" className="mt-4 space-y-4">
          <ParamCard title="ماتریس همبستگی ستون‌های عددی (بخش ۲۱.۲)">
            <p className="text-[11px] text-muted-foreground">
              حداکثر ۸ ستون عددی نخست به‌طور خودکار انتخاب می‌شود؛ همبستگی به معنای رابطه علّی نیست (بخش ۲۱.۳ سند).
            </p>
            <RunButton loading={loading} onClick={() => run('correlation')} />
          </ParamCard>
          {error && <ErrorAlert msg={error} />}
          {corr && <CorrResult resp={corr} />}
        </TabsContent>

        {/* ناهنجاری */}
        <TabsContent value="anomaly" className="mt-4 space-y-4">
          <ParamCard title="تشخیص ناهنجاری پیشرفته (بخش ۲۱.۲)">
            <ParamSelect label="ستون تاریخ" value={anomalyDate} onChange={setAnomalyDate} options={dateFields} placeholder="انتخاب ستون تاریخ…" />
            <ParamSelect label="سنجه (اختیاری — خالی: تعداد رکورد)" value={anomalyMeasure} onChange={setAnomalyMeasure} options={measureFields} placeholder="تعداد رکورد" />
            {anomalyMeasure && <ParamSelect label="نوع تجمیع" value={anomalyAgg} onChange={setAnomalyAgg} options={['sum', 'avg', 'count'].map(k => ({ id: k, label: AGG_LABELS[k] }))} />}
            <ParamSelect label="دوره‌بندی" value={anomalyGran} onChange={setAnomalyGran} options={Object.keys(GRAN_LABELS).map(k => ({ id: k, label: GRAN_LABELS[k] }))} />
            <RunButton loading={loading} onClick={() => run('anomaly')} />
          </ParamCard>
          {error && <ErrorAlert msg={error} />}
          {anomaly && <AnomalyResult resp={anomaly} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------- اجزای کمکی ----------

function ParamCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{children}</div>
      </CardContent>
    </Card>
  )
}

function ParamSelect({ label, value, onChange, options, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { id: string; label: string }[]
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder ?? 'انتخاب…'} /></SelectTrigger>
        <SelectContent>
          {options.length === 0 && <div className="px-2 py-1.5 text-[11px] text-muted-foreground">ستون مناسبی یافت نشد</div>}
          {options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function RunButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <div className="flex items-end">
      <Button size="sm" className="h-8 text-xs gap-1.5" disabled={loading} onClick={onClick}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <TrendingUp className="size-3.5" />}
        اجرای تحلیل
      </Button>
    </div>
  )
}

function ErrorAlert({ msg }: { msg: string }) {
  return (
    <Alert variant="destructive">
      <Info className="size-4" />
      <AlertDescription className="text-xs">{msg}</AlertDescription>
    </Alert>
  )
}

function MetaStrip({ meta }: { meta: Meta }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
      <Badge variant="outline" className="text-[10px]">نمونه: {toPersianDigits(String(meta.used))}</Badge>
      {meta.skipped > 0 && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200">حذف‌شده: {toPersianDigits(String(meta.skipped))}</Badge>}
      <Badge variant="outline" className="text-[10px]">اسکن: {toPersianDigits(String(meta.scannedRecords))}</Badge>
    </div>
  )
}

function WarningsList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="space-y-1">
      {warnings.map((w, i) => (
        <li key={i} className="text-[11px] text-amber-700 flex items-start gap-1">
          <Info className="size-3 mt-0.5 shrink-0" /> {w}
        </li>
      ))}
    </ul>
  )
}

// ---------- رندر روند و پیش‌بینی ----------

function TrendResult({ resp }: { resp: TrendResp }) {
  const chartData = useMemo(() => {
    const history = resp.history.map((h, i) => ({
      label: h.label,
      actual: h.value,
      trend: resp.fit[i]?.value ?? null,
      band: null as number | null, // بازه عدم قطعیت فقط برای دوره‌های پیش‌بینی
    }))
    const forecast = resp.forecast.map(f => ({
      label: f.label,
      actual: null as number | null,
      trend: f.value,
      band: f.hi,
    }))
    return [...history, ...forecast]
  }, [resp])

  const dirLabel = resp.direction === 'up' ? 'صعودی' : resp.direction === 'down' ? 'نزولی' : 'تقریباً ثابت'
  const dirClass = resp.direction === 'up' ? 'text-emerald-700' : resp.direction === 'down' ? 'text-red-700' : 'text-slate-600'

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">سری زمانی، خط روند و پیش‌بینی</CardTitle>
          <CardDescription className="text-[11px]">{resp.method}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <StatCard label="جهت روند" value={<span className={dirClass}>{dirLabel}</span>} />
            <StatCard label="ضریب تعیین R²" value={toPersianDigits(resp.r2.toFixed(2))} />
            <StatCard label="خطای MAE" value={toPersianDigits(fmt(resp.mae))} />
            <StatCard label="خطای MAPE" value={resp.mape === null ? 'تعریف‌نشده' : `${toPersianDigits(resp.mape.toFixed(1))}٪`} />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData as unknown as Record<string, unknown>[]} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} width={70} tickFormatter={v => toPersianDigits(compactNum(v as number))} />
                <RTooltip contentStyle={{ fontSize: 11, direction: 'rtl' }} formatter={(v) => toPersianDigits(fmt(Number(v)))} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'actual' ? 'مقدار واقعی' : v === 'trend' ? 'خط روند/پیش‌بینی' : 'سقف بازه عدم قطعیت'} />
                <Bar dataKey="actual" name="actual" fill="#0d9488" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Area type="monotone" dataKey="band" name="band" stroke="none" fill="#f59e0b" fillOpacity={0.12} isAnimationActive={false} connectNulls={false} />
                <Line type="monotone" dataKey="trend" name="trend" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 3" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground">
            پیش‌بینی با بازه عدم قطعیت ۹۵٪ همراه است؛ خط‌چین طلایی مقدار پیش‌بینی و بازه بالایی را نشان می‌دهد (بخش ۲۱.۳ سند: ارائه روش، خطا و عدم قطعیت الزامی است).
          </p>
          <WarningsList warnings={resp.meta.warnings} />
          <MetaStrip meta={resp.meta} />
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  )
}

// ---------- رندر Cohort ----------

function CohortResult({ resp }: { resp: CohortResp }) {
  if (resp.rows.length === 0) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle className="text-xs">تحلیل Cohort اجرا نشد</AlertTitle>
        <AlertDescription className="text-xs">{resp.meta.warnings[0] ?? 'داده کافی یافت نشد.'}</AlertDescription>
      </Alert>
    )
  }
  const maxOffset = Math.max(...resp.rows.map(r => r.cells.length))
  const offsets = Array.from({ length: maxOffset }, (_, i) => i)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ماتریس حفظ و بازگشت مخاطبان</CardTitle>
        <CardDescription className="text-[11px]">{resp.method} — درصد سلول نسبت به اندازه گروه (ستون ۰)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-right text-xs sticky right-0 bg-muted/40">گروه (دوره نخست)</TableHead>
                <TableHead className="text-center text-xs">اندازه</TableHead>
                {offsets.map(o => <TableHead key={o} className="text-center text-xs">+{toPersianDigits(String(o))}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resp.rows.map(row => (
                <TableRow key={row.cohort}>
                  <TableCell className="text-xs font-medium sticky right-0 bg-background">{row.cohort}</TableCell>
                  <TableCell className="text-center text-xs">{toPersianDigits(String(row.size))}</TableCell>
                  {offsets.map(o => {
                    const cell = row.cells.find(c => c.offset === o)
                    if (!cell) return <TableCell key={o} className="text-center text-[10px] text-muted-foreground">—</TableCell>
                    const pct = cell.pct ?? 0
                    // رنگ‌بندی حرارتی بر اساس درصد حفظ
                    const bg = pct >= 70 ? 'bg-emerald-600 text-white' : pct >= 50 ? 'bg-emerald-400/80' : pct >= 30 ? 'bg-emerald-200' : pct >= 10 ? 'bg-slate-100' : 'bg-slate-50'
                    return (
                      <TableCell key={o} className={`text-center text-[10px] ${bg}`}>
                        {toPersianDigits(String(cell.count))}{cell.pct !== null && o > 0 ? <span className="opacity-70"> ({toPersianDigits(String(pct))}٪)</span> : ''}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <WarningsList warnings={resp.meta.warnings} />
        <MetaStrip meta={resp.meta} />
      </CardContent>
    </Card>
  )
}

// ---------- رندر RFM ----------

function RfmResult({ resp }: { resp: RfmResp }) {
  if (resp.segments.length === 0) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle className="text-xs">تحلیل RFM اجرا نشد</AlertTitle>
        <AlertDescription className="text-xs">{resp.meta.warnings[0] ?? 'داده کافی یافت نشد.'}</AlertDescription>
      </Alert>
    )
  }
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">بخش‌بندی مشتریان (RFM)</CardTitle>
          <CardDescription className="text-[11px]">
            {resp.method} | تاریخ مرجع: {resp.referenceDate ? new Date(resp.referenceDate).toLocaleDateString('fa-IR') : '—'} | {toPersianDigits(String(resp.totalCustomers))} شناسه متمایز
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right text-xs">بخش</TableHead>
                  <TableHead className="text-right text-xs">تعداد</TableHead>
                  <TableHead className="text-right text-xs">سهم</TableHead>
                  <TableHead className="text-right text-xs">میانگین فراوانی</TableHead>
                  {resp.hasMonetary && <TableHead className="text-right text-xs">میانگین مبلغ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resp.segments.map(s => (
                  <TableRow key={s.key}>
                    <TableCell className="text-xs font-medium">{s.label}</TableCell>
                    <TableCell className="text-xs">{toPersianDigits(String(s.count))}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-teal-600" style={{ width: `${Math.min(100, s.pct)}%` }} />
                        </div>
                        {toPersianDigits(String(s.pct))}٪
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{toPersianDigits(String(s.avgFrequency))}</TableCell>
                    {resp.hasMonetary && <TableCell className="text-xs">{toPersianDigits(fmt(s.avgMonetary))}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <WarningsList warnings={resp.meta.warnings} />
          <MetaStrip meta={resp.meta} />
        </CardContent>
      </Card>

      {resp.customers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">مشتریان برتر بر اساس مبلغ (حداکثر {toPersianDigits('100')} ردیف)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 sticky top-0">
                    <TableHead className="text-right text-xs">شناسه</TableHead>
                    <TableHead className="text-right text-xs">R (روز)</TableHead>
                    <TableHead className="text-right text-xs">F</TableHead>
                    {resp.hasMonetary && <TableHead className="text-right text-xs">M</TableHead>}
                    <TableHead className="text-right text-xs">امتیاز</TableHead>
                    <TableHead className="text-right text-xs">بخش</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resp.customers.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-medium">{c.id}</TableCell>
                      <TableCell className="text-xs">{toPersianDigits(String(c.recencyDays))}</TableCell>
                      <TableCell className="text-xs">{toPersianDigits(String(c.frequency))}</TableCell>
                      {resp.hasMonetary && <TableCell className="text-xs">{toPersianDigits(fmt(c.monetary))}</TableCell>}
                      <TableCell className="text-xs font-mono" dir="ltr">{toPersianDigits(String(c.rScore))}-{toPersianDigits(String(c.fScore))}{resp.hasMonetary ? `-${toPersianDigits(String(c.mScore))}` : ''}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.segment}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------- رندر What-if ----------

function WhatIfResult({ resp }: { resp: WhatIfResp }) {
  if (resp.rows.length === 0) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle className="text-xs">سناریویی محاسبه نشد</AlertTitle>
        <AlertDescription className="text-xs">{resp.meta.warnings[0] ?? 'داده کافی یافت نشد.'}</AlertDescription>
      </Alert>
    )
  }
  const fmtPct = (v: number | null) => v === null ? 'مبنای صفر' : `${toPersianDigits(String(v))}٪`
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">نتیجه سناریو: تغییر {toPersianDigits(String(resp.globalPct))}٪ سراسری</CardTitle>
        <CardDescription className="text-[11px]">{resp.note}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-right text-xs">مقدار بُعد</TableHead>
                <TableHead className="text-right text-xs">پایه</TableHead>
                <TableHead className="text-right text-xs">سناریو</TableHead>
                <TableHead className="text-right text-xs">تغییر</TableHead>
                <TableHead className="text-right text-xs">درصد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resp.rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{r.dim}</TableCell>
                  {resp.measureAliases.map(a => (
                    <TableCell key={a} className="text-xs">
                      <span>{toPersianDigits(fmt(r.baseline[a] ?? 0))}</span>
                      <span className="text-teal-700 font-medium"> → {toPersianDigits(fmt(r.scenario[a] ?? 0))}</span>
                      <span className={`ms-1 text-[10px] ${(r.delta[a] ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        ({(r.delta[a] ?? 0) >= 0 ? '+' : '−'}{toPersianDigits(fmt(Math.abs(r.delta[a] ?? 0)))})
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="text-xs">{fmtPct(r.deltaPct[resp.measureAliases[0]] ?? null)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-medium">
                <TableCell className="text-xs">جمع کل</TableCell>
                {resp.measureAliases.map(a => (
                  <TableCell key={a} className="text-xs">
                    <span>{toPersianDigits(fmt(resp.totals.baseline[a] ?? 0))}</span>
                    <span className="text-teal-700 font-medium"> → {toPersianDigits(fmt(resp.totals.scenario[a] ?? 0))}</span>
                    <span className={`ms-1 text-[10px] ${(resp.totals.delta[a] ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      ({(resp.totals.delta[a] ?? 0) >= 0 ? '+' : '−'}{toPersianDigits(fmt(Math.abs(resp.totals.delta[a] ?? 0)))})
                    </span>
                  </TableCell>
                ))}
                <TableCell className="text-xs">{fmtPct(resp.totals.deltaPct[resp.measureAliases[0]] ?? null)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <WarningsList warnings={resp.meta.warnings} />
        <MetaStrip meta={resp.meta} />
      </CardContent>
    </Card>
  )
}

// ---------- رندر همبستگی ----------

function CorrResult({ resp }: { resp: CorrResp }) {
  if (resp.fields.length < 2) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle className="text-xs">همبستگی محاسبه نشد</AlertTitle>
        <AlertDescription className="text-xs">{resp.meta.warnings[0] ?? 'حداقل دو ستون عددی لازم است.'}</AlertDescription>
      </Alert>
    )
  }
  const cellColor = (r: number) => {
    const a = Math.min(1, Math.abs(r))
    return r >= 0 ? `rgba(13, 148, 136, ${a})` : `rgba(220, 38, 38, ${a})`
  }
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ماتریس همبستگی پیرسون</CardTitle>
          <CardDescription className="text-[11px]">{resp.caveat}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right text-xs"></TableHead>
                  {resp.fields.map(f => <TableHead key={f.id} className="text-center text-[10px] max-w-24 truncate" title={f.label}>{f.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resp.fields.map((f, i) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-[10px] font-medium max-w-32 truncate" title={f.label}>{f.label}</TableCell>
                    {resp.fields.map((g, j) => {
                      const r = resp.matrix[i][j]
                      return (
                        <TableCell key={g.id} className="text-center text-[10px]" style={{ backgroundColor: i === j ? 'rgba(0,0,0,0.06)' : r === null ? 'rgba(0,0,0,0.03)' : cellColor(r), color: r !== null && Math.abs(r) > 0.5 && i !== j ? 'white' : undefined }}>
                          {i === j || r === null ? '—' : toPersianDigits(r.toFixed(2))}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <WarningsList warnings={resp.meta.warnings} />
          <MetaStrip meta={resp.meta} />
        </CardContent>
      </Card>

      {resp.topPairs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">جفت‌های پرهمبستگی</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right text-xs">جفت</TableHead>
                    <TableHead className="text-right text-xs">r</TableHead>
                    <TableHead className="text-right text-xs">شدت</TableHead>
                    <TableHead className="text-right text-xs">تعداد نمونه</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resp.topPairs.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{p.labelA} × {p.labelB}</TableCell>
                      <TableCell className="text-xs font-mono" dir="ltr">{toPersianDigits(p.r.toFixed(2))}</TableCell>
                      <TableCell className="text-xs">{p.strength}</TableCell>
                      <TableCell className="text-xs">{toPersianDigits(String(p.n))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------- رندر ناهنجاری ----------

function AnomalyResult({ resp }: { resp: AnomalyResp }) {
  if (resp.series.length === 0) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle className="text-xs">تشخیص ناهنجاری اجرا نشد</AlertTitle>
        <AlertDescription className="text-xs">{resp.meta.warnings[0] ?? 'داده کافی یافت نشد.'}</AlertDescription>
      </Alert>
    )
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">تشخیص ناهنجاری سری زمانی</CardTitle>
        <CardDescription className="text-[11px]">{resp.method}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={resp.series as unknown as Record<string, unknown>[]} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={70} tickFormatter={v => toPersianDigits(compactNum(v as number))} />
              <RTooltip contentStyle={{ fontSize: 11, direction: 'rtl' }} formatter={v => toPersianDigits(fmt(Number(v)))} />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'value' ? 'مقدار دوره' : 'ناهنجاری'} />
              <Bar dataKey="value" name="value" fill="#94a3b8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="isAnomaly" name="isAnomaly" fill="#dc2626" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {resp.anomalies.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right text-xs">دوره</TableHead>
                  <TableHead className="text-right text-xs">مقدار</TableHead>
                  <TableHead className="text-right text-xs">نمره Z</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resp.anomalies.map(a => (
                  <TableRow key={a.key} className="bg-red-50/50">
                    <TableCell className="text-xs font-medium">{a.label}</TableCell>
                    <TableCell className="text-xs">{toPersianDigits(fmt(a.value))}</TableCell>
                    <TableCell className="text-xs font-mono" dir="ltr">{toPersianDigits(String(a.z))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">ناهنجاری‌ای با آستانه {toPersianDigits(String(resp.threshold))} یافت نشد.</p>
        )}
        <WarningsList warnings={resp.meta.warnings} />
        <MetaStrip meta={resp.meta} />
      </CardContent>
    </Card>
  )
}

// ---------- ابزارهای نمایش ----------

function fmt(n: number): string {
  return n.toLocaleString('fa-IR', { maximumFractionDigits: 1 })
}

function compactNum(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(Math.round(n))
}
