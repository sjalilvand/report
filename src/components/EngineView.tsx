'use client'

// موتور تحلیل متوسط DuckDB و فایل آماده‌شده Parquet — بخش ۲۷.۲ سند
// «تحلیل متوسط: DuckDB یا موتور تحلیلی مشابه» + «فایل آماده‌شده: Parquet»
// کنسول SQL فقط‌خواندنی برای مدیر داده/سامانه روی نسخه آماده‌شده مجموعه‌داده

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { toPersianDigits } from '@/lib/digits'
import { Loader2, DatabaseZap, FileCheck2, PlayCircle, RefreshCw, Terminal, ShieldCheck, TriangleAlert } from 'lucide-react'

interface ParquetStatusResp {
  engineAvailable: boolean
  engineSetting: string
  parquet: {
    version: number | null
    rows: number | null
    columns: number | null
    bytes: number
    exportedAt: string | null
    stale: boolean
  } | null
  datasetVersion: number
  rowCount: number
}

interface DuckQueryResp {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  truncated: boolean
  tookMs: number
}

function formatBytes(n: number): string {
  if (n < 1024) return `${toPersianDigits(String(n))} بایت`
  if (n < 1024 * 1024) return `${toPersianDigits((n / 1024).toFixed(1))} کیلوبایت`
  return `${toPersianDigits((n / (1024 * 1024)).toFixed(2))} مگابایت`
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v.toLocaleString('fa-IR') : v.toLocaleString('fa-IR', { maximumFractionDigits: 4 })
  }
  return String(v)
}

// پرس‌وجوهای نمونه — کاربر می‌تواند از آن‌ها به‌عنوان الگو استفاده کند
const EXAMPLES: { label: string; sql: string }[] = [
  { label: 'نمونه ۲۰ ردیف', sql: 'SELECT * FROM ds LIMIT 20' },
  { label: 'شمارش رکوردها', sql: 'SELECT COUNT(*) AS "تعداد رکورد" FROM ds' },
  { label: 'خلاصه آماری', sql: 'SELECT COUNT(*) AS "تعداد", AVG("کد") AS "میانگین نمونه" FROM ds' },
]

export default function EngineView({ datasetId, datasetName }: { datasetId: string; datasetName: string }) {
  const { toast } = useToast()
  const [status, setStatus] = useState<ParquetStatusResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [sql, setSql] = useState('SELECT * FROM ds LIMIT 20')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DuckQueryResp | null>(null)
  const [sqlError, setSqlError] = useState('')

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.get<ParquetStatusResp>(`/api/datasets/${datasetId}/parquet`)
      setStatus(s)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [datasetId])

  useEffect(() => { void loadStatus() }, [loadStatus])

  const exportParquet = async () => {
    setExporting(true)
    try {
      const r = await api.post<{ version: number; rows: number; bytes: number; tookMs: number }>(`/api/datasets/${datasetId}/parquet`, {})
      toast({ title: 'فایل Parquet ساخته شد', description: `نسخه ${toPersianDigits(String(r.version))} با ${toPersianDigits(r.rows.toLocaleString('en-US'))} رکورد — ${formatBytes(r.bytes)} (${toPersianDigits(String(r.tookMs))} میلی‌ثانیه)` })
      await loadStatus()
    } catch (e) {
      toast({ title: 'ساخت فایل Parquet ناموفق بود', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const runSql = async (query?: string) => {
    const q = (query ?? sql).trim()
    if (!q) return
    setRunning(true)
    setSqlError('')
    try {
      const r = await api.post<DuckQueryResp>(`/api/datasets/${datasetId}/duck`, { sql: q })
      setResult(r)
    } catch (e) {
      setResult(null)
      setSqlError(e instanceof Error ? e.message : 'اجرای پرس‌وجو ناموفق بود')
    } finally {
      setRunning(false)
    }
  }

  const p = status?.parquet ?? null

  return (
    <div className="space-y-4">
      {/* وضعیت موتور و فایل آماده‌شده */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DatabaseZap className="size-4 text-primary" /> موتور تحلیل متوسط و فایل آماده‌شده (۲۷.۲)
          </CardTitle>
          <CardDescription>
            طبق سند، تحلیل متوسط با موتور تحلیلی DuckDB و فایل آماده‌شده با قالب ستونی Parquet انجام می‌شود؛ انتخاب نهایی موتور پس از آزمون با فایل‌های واقعی سازمان نهایی می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4"><Loader2 className="size-4 animate-spin" /> در حال بررسی وضعیت…</div>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-lg border p-3 space-y-1.5">
                  <p className="text-xs font-semibold">موتور تحلیلی</p>
                  {status?.engineAvailable ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="default" className="text-[10px] gap-1"><DatabaseZap className="size-3" /> DuckDB فعال</Badge>
                      <Badge variant={status.engineSetting === 'duckdb' ? 'secondary' : 'outline'} className="text-[10px]">
                        {status.engineSetting === 'duckdb' ? 'انتخاب مدیر: DuckDB' : 'انتخاب مدیر: موتور داخلی'}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-1 text-destructive border-destructive">
                      <TriangleAlert className="size-3" /> بسته @duckdb/node-api نصب نیست — موتور داخلی فعال است
                    </Badge>
                  )}
                  <p className="text-[10px] text-muted-foreground leading-4">اگر بسته نصب نباشد سامانه با موتور داخلی به کار خود ادامه می‌دهد؛ نصب: <code dir="ltr" className="text-[9px]">npm install @duckdb/node-api</code></p>
                </div>
                <div className="rounded-lg border p-3 space-y-1.5">
                  <p className="text-xs font-semibold flex items-center gap-1.5"><FileCheck2 className="size-3.5 text-primary" /> فایل آماده‌شده Parquet</p>
                  {p ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">نسخه {toPersianDigits(String(p.version ?? 0))}</Badge>
                      <Badge variant="outline" className="text-[10px]">{toPersianDigits(p.rows?.toLocaleString('en-US') ?? '0')} رکورد</Badge>
                      <Badge variant="outline" className="text-[10px]">{formatBytes(p.bytes)}</Badge>
                      {p.stale && <Badge variant="destructive" className="text-[10px] gap-1"><TriangleAlert className="size-3" /> نسخه فایل قدیمی است — نوسازی لازم</Badge>}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">هنوز ساخته نشده است.</p>
                  )}
                  {p?.exportedAt && <p className="text-[10px] text-muted-foreground">آخرین ساخت: {new Date(p.exportedAt).toLocaleString('fa-IR')}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="gap-1.5 text-xs" disabled={exporting || !status?.engineAvailable} onClick={exportParquet}>
                  {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  {p ? 'نوسازی فایل Parquet' : 'ساخت فایل Parquet'}
                </Button>
                {p && !p.stale && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> فایل با نسخه {toPersianDigits(String(status?.datasetVersion ?? 0))} مجموعه‌داده هم‌خوان است</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* کنسول SQL فقط‌خواندنی */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Terminal className="size-4 text-primary" /> کنسول SQL تحلیل متوسط</CardTitle>
          <CardDescription>
            پرس‌وجوی فقط‌خواندنی روی نمای <code dir="ltr" className="text-[10px] bg-muted px-1 rounded">ds</code> (فایل Parquet همین مجموعه‌داده). سقف پاسخ {toPersianDigits('۲٬۰۰۰')} ردیف؛ هر پرس‌وجو در رویدادها ثبت می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertDescription className="text-[11px] leading-5">
              فقط دستور SELECT/WITH واحد پذیرفته می‌شود؛ DDL/DML، دسترسی مستقیم فایل (read_parquet و ...) و تغییر پیکربندی مسدود است. این کنسول به‌دلیل دسترسی بدون ماسک به داده، فقط برای مدیر سامانه و مدیر داده فعال است (بخش ۲۹).
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map(ex => (
              <button key={ex.label} onClick={() => { setSql(ex.sql); void runSql(ex.sql) }}
                className="text-[10px] rounded-md border px-2 py-1 hover:bg-muted transition-colors">
                {ex.label}
              </button>
            ))}
          </div>
          <textarea
            dir="ltr"
            value={sql}
            onChange={e => setSql(e.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full rounded-md border bg-muted/40 p-3 font-mono text-xs leading-5 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="SELECT * FROM ds LIMIT 20"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5 text-xs" disabled={running || !status?.parquet || status?.parquet.stale} onClick={() => runSql()}>
              {running ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />} اجرای پرس‌وجو
            </Button>
            {status?.parquet?.stale && <span className="text-[10px] text-destructive">ابتدا فایل Parquet را نوسازی کنید (نسخه داده تغییر کرده است).</span>}
          </div>

          {sqlError && (
            <Alert variant="destructive">
              <TriangleAlert className="size-4" />
              <AlertDescription className="text-[11px]">{sqlError}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">{toPersianDigits(result.rowCount.toLocaleString('en-US'))} ردیف</Badge>
                <Badge variant="outline" className="text-[10px]">{toPersianDigits(String(result.tookMs))} میلی‌ثانیه</Badge>
                {result.truncated && <Badge variant="destructive" className="text-[10px]">نمایش تا سقف {toPersianDigits('۲٬۰۰۰')} ردیف</Badge>}
                <span>مجموعه‌داده «{datasetName}» — موتور DuckDB</span>
              </div>
              <div className="rounded-md border overflow-auto max-h-96">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/70 backdrop-blur">
                    <TableRow>
                      {result.columns.map((c, i) => (
                        <TableHead key={i} className="text-right text-[10px] whitespace-nowrap">{c}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className="text-[11px] whitespace-nowrap max-w-64 truncate" title={typeof cell === 'string' ? cell : undefined}>
                            {formatCell(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
