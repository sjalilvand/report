'use client'

// پنل تحلیل تخصصی قالب هوشمند — فیش حقوقی، صورت مالی، سود
// خروجی موتور smarttemplates را به‌صورت کارت شاخص، نمودار، جدول، بینش و «گزارش هوشمند»
// قابل چاپ نمایش می‌دهد. مخفی‌سازی از طریق چیدمان داشبورد (hiddenTemplates) ذخیره می‌شود.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tip } from '@/components/HelpTip'
import { formatNumber } from '@/lib/currency'
import type { SmartAnalysis, SmartKpi, SmartChartSpec, SmartTable, SmartInsight } from '@/lib/smarttemplates'
import {
  BadgeCheck, Wallet, Landmark, TrendingUp, TrendingDown, Minus, Info, Lightbulb,
  FileText, Printer, Eye, EyeOff, BarChart3, PieChart as PieIcon,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts'

const fa = (v: number | string) => String(v).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])

const TEMPLATE_ICON = { payslip: Wallet, financial: Landmark, profit: TrendingUp }
const TEMPLATE_COLOR = { payslip: 'text-sky-600 bg-sky-100 dark:bg-sky-950/60', financial: 'text-violet-600 bg-violet-100 dark:bg-violet-950/60', profit: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60' }

const INSIGHT_STYLE: Record<SmartInsight['tone'], { icon: typeof Info; cls: string }> = {
  good: { icon: TrendingUp, cls: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300' },
  warn: { icon: Info, cls: 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300' },
  bad: { icon: TrendingDown, cls: 'border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300' },
  info: { icon: Lightbulb, cls: 'border-sky-500/40 bg-sky-500/5 text-sky-700 dark:text-sky-300' },
}

const CHART_COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#84cc16', '#6366f1', '#f97316']

function fmtValue(v: number, fmt: SmartKpi['fmt']): string {
  if (fmt === 'percent') return `${fa(Math.round(v * 10) / 10)}٪`
  if (fmt === 'currency') return fa(Math.round(Math.abs(v)).toLocaleString('en-US')).replace(/,/g, '٬') + (v < 0 ? ' −' : '')
  return fa(Math.round(Math.abs(v)).toLocaleString('en-US')).replace(/,/g, '٬') + (v < 0 ? ' −' : '')
}

function fmtAxis(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e9) return fa((v / 1e9).toFixed(1)) + ' میلیارد'
  if (abs >= 1e6) return fa((v / 1e6).toFixed(1)) + ' میلیون'
  if (abs >= 1e3) return fa((v / 1e3).toFixed(0)) + ' هزار'
  return fa(Math.round(v))
}

function SmartChart({ spec }: { spec: SmartChartSpec }) {
  const data = spec.data.filter(d => Number.isFinite(d.value))
  if (data.length === 0) return null
  const render = () => {
    if (spec.kind === 'pie') {
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <RTooltip formatter={(v: number) => fmtAxis(v)} contentStyle={{ direction: 'rtl', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11, direction: 'rtl' }} />
        </PieChart>
      )
    }
    if (spec.kind === 'area') {
      return (
        <AreaChart data={data} margin={{ top: 8, bottom: 0, left: 0, right: 8 }}>
          <defs>
            <linearGradient id={`g-${spec.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={70} />
          <RTooltip formatter={(v: number) => fmtAxis(v)} contentStyle={{ direction: 'rtl', borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="value" name={spec.seriesKey} stroke={CHART_COLORS[0]} strokeWidth={2} fill={`url(#g-${spec.id})`} />
        </AreaChart>
      )
    }
    return (
      <BarChart data={data} margin={{ top: 8, bottom: 0, left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={data.length > 5 ? -20 : 0} height={data.length > 5 ? 46 : 24} textAnchor={data.length > 5 ? 'end' : 'middle'} />
        <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={70} />
        <RTooltip formatter={(v: number) => fmtAxis(v)} contentStyle={{ direction: 'rtl', borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="value" name={spec.seriesKey} radius={[5, 5, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    )
  }
  const isPie = spec.kind === 'pie'
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          {isPie ? <PieIcon className="size-4 text-primary" /> : <BarChart3 className="size-4 text-primary" />}
          {spec.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`${isPie ? 'h-72' : 'h-60'}`}>
          <ResponsiveContainer width="100%" height="100%">
            {render() as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function SmartTableCard({ table }: { table: SmartTable }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-1.5 text-sm"><TableIcon /> {table.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                {table.columns.map((c, i) => <TableHead key={i} className="whitespace-nowrap text-xs">{c}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, ri) => (
                <TableRow key={ri} className={row.highlight ? 'bg-primary/5 font-medium' : ''}>
                  <TableCell className="whitespace-nowrap text-xs">{row.label}</TableCell>
                  {row.values.map((v, vi) => (
                    <TableCell key={vi} className="whitespace-nowrap text-xs tabular-nums">
                      {v === null || v === undefined ? '—' : (table.columns[vi + 1]?.includes('درصد') ? fmtValue(v, 'percent') : fmtValue(v, 'currency'))}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {table.note && <p className="mt-1.5 text-[10px] text-muted-foreground">{table.note}</p>}
      </CardContent>
    </Card>
  )
}

function TableIcon() {
  return <BarChart3 className="size-4 text-primary" />
}

export default function SmartTemplatePanel({
  analysis,
  confidence,
  matchedSignals,
  onHide,
}: {
  analysis: SmartAnalysis
  confidence: number
  matchedSignals: string[]
  onHide?: () => void
}) {
  const Icon = TEMPLATE_ICON[analysis.template] ?? BadgeCheck
  const printReport = () => window.print()

  return (
    <div className="space-y-4">
      {/* سربرگ قالب شناسایی‌شده */}
      <div className={`section-gradient relative overflow-hidden rounded-xl border px-5 py-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-bold leading-6">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TEMPLATE_COLOR[analysis.template]}`}><Icon className="size-4" /></span>
              تحلیل تخصصی: {analysis.templateLabel}
              <Badge variant="secondary" className="gap-1 text-[10px]"><BadgeCheck className="size-3" /> تشخیص خودکار {fa(Math.round(confidence * 100))}٪</Badge>
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{analysis.description}</p>
            {matchedSignals.length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">نشانه‌های شناسایی: {matchedSignals.join(' • ')}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onHide && (
              <Tip label="این تحلیل تخصصی مخفی می‌شود؛ از «ویرایش داشبورد» می‌توانید دوباره فعالش کنید" side="bottom">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onHide}><EyeOff className="size-3.5" /> مخفی کردن</Button>
              </Tip>
            )}
            <Tip label="چاپ گزارش هوشمند یا ذخیره PDF (از گفت‌وگوی چاپ)" side="bottom">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={printReport}><Printer className="size-3.5" /> چاپ گزارش</Button>
            </Tip>
          </div>
        </div>
      </div>

      {/* کارت‌های شاخص تخصصی */}
      {analysis.kpis.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {analysis.kpis.map(k => {
            const toneCls = k.tone === 'good' ? 'text-emerald-600' : k.tone === 'bad' ? 'text-red-600' : k.tone === 'warn' ? 'text-amber-600' : ''
            return (
              <Card key={k.id} className="card-lift">
                <CardContent className="p-4">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Info className="size-3 shrink-0" /> {k.label}</p>
                  <p className={`mt-1.5 text-xl font-bold tabular-nums ${toneCls}`} title={k.hint}>{fmtValue(k.value, k.fmt)}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{k.hint}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* نمودارها */}
      {analysis.charts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {analysis.charts.map(c => (
            <div key={c.id} className={c.kind === 'area' ? 'lg:col-span-2' : ''}>
              <SmartChart spec={c} />
            </div>
          ))}
        </div>
      )}

      {/* بینش‌های تخصصی */}
      {analysis.insights.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {analysis.insights.map(ins => {
            const st = INSIGHT_STYLE[ins.tone]
            const InsIcon = st.icon
            return (
              <div key={ins.id} className={`rounded-xl border px-4 py-3 ${st.cls}`}>
                <p className="flex items-center gap-1.5 text-xs font-bold"><InsIcon className="size-3.5 shrink-0" /> {ins.title}</p>
                <p className="mt-1 text-xs leading-6 opacity-90">{ins.text}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* جدول‌های تحلیلی */}
      {analysis.tables.length > 0 && (
        <div className="space-y-4">
          {analysis.tables.map(t => <SmartTableCard key={t.id} table={t} />)}
        </div>
      )}

      {/* گزارش هوشمند متنی — قابل چاپ */}
      <Card className="print-area">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <FileText className="size-4 text-primary" />
            گزارش هوشمند {analysis.templateLabel} — تحلیل خودکار متن
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {analysis.report.map(block => (
            <section key={block.id}>
              <h4 className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                <span className="h-4 w-1 rounded-full bg-primary" aria-hidden />
                {block.heading}
              </h4>
              <div className="space-y-1.5">
                {block.paragraphs.map((p, i) => (
                  p && <p key={i} className="text-[13px] leading-7 text-foreground/90">{p}</p>
                ))}
              </div>
              {block.table && (
                <div className="mt-2 rounded-lg border p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{block.table.title}</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {block.table.columns.map((c, i) => <TableHead key={i} className="text-xs">{c}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {block.table.rows.slice(0, 8).map((row, ri) => (
                        <TableRow key={ri}>
                          <TableCell className="text-xs">{row.label}</TableCell>
                          {row.values.map((v, vi) => (
                            <TableCell key={vi} className="text-xs tabular-nums">
                              {v === null || v === undefined ? '—' : (block.table!.columns[vi + 1]?.includes('درصد') ? fmtValue(v, 'percent') : fmtValue(v, 'currency'))}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          ))}
          <p className="border-t pt-3 text-[10px] text-muted-foreground">
            این گزارش به‌صورت خودکار و بدون دخالت انسان از روی داده فایل بارگذاری‌شده تولید شده است؛ با هر به‌روزرسانی داده، متن و اعداد نیز به‌روز می‌شوند.
          </p>
        </CardContent>
      </Card>

      {/* راهنمای نمایش دوباره */}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Eye className="size-3" />
        اگر این بخش را مخفی کنید، از دکمه «ویرایش داشبورد» در سربرگ بالا می‌توانید «تحلیل تخصصی» را دوباره فعال کنید.
      </p>
    </div>
  )
}
