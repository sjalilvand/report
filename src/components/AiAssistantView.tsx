'use client'

// دستیار هوشمند و هوش مصنوعی — بخش ۲۵ سند
// پیشنهاد نوع/کلید/رابطه/پاک‌سازی/نمودار/شاخص، پرسش به زبان طبیعی از داده،
// تولید پیش‌نویس گزارش توصیفی، توضیح فرمول و خطا، یافتن الگوها و نقاط غیرعادی
// الزامات کنترلی: اعداد از موتور تحلیل سامانه، پاسخ قابل ردیابی، اعلام ناتوانی،
// سیاست اشتراک داده با مدیر سامانه، تأیید انسانی برای متن رسمی.

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { formatNumber, formatAmount } from '@/lib/currency'
import { toPersianDigits } from '@/lib/digits'
import {
  Sparkles, Loader2, Send, Lightbulb, KeyRound, Network, BrushCleaning, ChartSpline, Calculator,
  Radar, FileText, HelpCircle, ShieldCheck, MessageCircleQuestion, CheckCircle2, TriangleAlert,
} from 'lucide-react'

interface FieldLite { id: string; label: string; type: string; role: string }

interface AiStatus {
  localEngine: boolean
  llmConfigured: boolean
  llmReason: string
  policy: { aiEnabled: boolean; aiAllowDataSharing: boolean; aiMaxRowsShared: number }
}

interface Suggestions {
  types: { fieldId: string; label: string; currentType: string; suggestedType: string; confidence: number; reason: string }[]
  uniqueKeys: { fields: string[]; labels: string[]; uniqueness: number; reason: string }[]
  relations: { fromFieldLabel: string; toDatasetName: string; toFieldLabel: string; valueOverlap: number; reason: string }[]
  cleaning: { kind: string; fieldLabel?: string; affected: number; description: string }[]
  charts: { chartType: string; title: string; reason: string; confidence: number }[]
  measures: { fieldId: string; agg: string; title: string; reason: string }[]
  anomalies: { kind: string; title: string; detail: string; severity: string }[]
  patterns: { kind: string; title: string; detail: string; confidence: number }[]
  geo: { fieldId: string; label: string; matchRatio: number } | null
  scannedRecords: number
  notices: string[]
}

interface AskResp {
  understood: boolean
  answer: string
  interpreter?: string
  interpretation?: string
  trace: {
    dataset: { name: string }
    measure: { fieldId: string | null; label: string | null; agg: string }
    dimension: { fieldId: string; label: string } | null
    filters: { label: string; op: string; value: string }[]
  } | null
  result: { rows: Record<string, unknown>[]; totals: Record<string, unknown>; rowCount: number; scannedRecords: number; warnings: string[] } | null
  notices: string[]
}

interface NarrateResp {
  engineText: string
  narrative: string | null
  requiresHumanApproval: boolean
  llmNote: string | null
  trace: { scannedRecords: number; rowCount: number; warnings: string[] }
}

interface ExplainResp {
  localRules: { title: string; explanation: string; suggestion: string }[]
  llmText: string | null
  llmNote: string | null
  source: string
}

const CHART_LABEL: Record<string, string> = {
  bar: 'میله‌ای', line: 'خطی', pie: 'دایره‌ای', kpi: 'کارت شاخص', scatter: 'پراکندگی',
  pivot: 'جدول محوری', geomap: 'نقشه جغرافیایی', compare: 'کارت مقایسه‌ای', table: 'جدول',
}

export default function AiAssistantView({
  datasetId, datasetName, fields,
}: {
  datasetId: string
  datasetName: string
  fields: FieldLite[]
}) {
  const { toast } = useToast()
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(false)

  // پرسش به زبان طبیعی
  const [question, setQuestion] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askResp, setAskResp] = useState<AskResp | null>(null)

  // پیش‌نویس توصیفی
  const [narrate, setNarrate] = useState<NarrateResp | null>(null)
  const [narrateLoading, setNarrateLoading] = useState(false)
  const [narrateApproved, setNarrateApproved] = useState(false)

  // توضیح فرمول
  const [formulaText, setFormulaText] = useState('')
  const [errorText, setErrorText] = useState('')
  const [explain, setExplain] = useState<ExplainResp | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)

  const loadStatus = useCallback(() => {
    api.get<AiStatus>('/api/ai/status').then(setStatus).catch(() => undefined)
  }, [])

  useEffect(() => {
    loadStatus()
    setSuggestions(null)
    setAskResp(null)
    setNarrate(null)
    setExplain(null)
  }, [datasetId, loadStatus])

  const runSuggestions = async () => {
    setSuggestLoading(true)
    try {
      const res = await api.post<Suggestions>('/api/ai/suggest', { datasetId })
      setSuggestions(res)
      if (res.notices.length > 0) toast({ title: 'محدودیت تحلیل', description: res.notices.join('؛ ') })
    } catch (e) {
      toast({ title: 'خطا در تحلیل هوشمند', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSuggestLoading(false)
    }
  }

  const ask = async (q?: string) => {
    const text = (q ?? question).trim()
    if (!text) return
    setAskLoading(true)
    try {
      const res = await api.post<AskResp>('/api/ai/ask', { datasetId, question: text })
      setAskResp(res)
    } catch (e) {
      toast({ title: 'خطا در پاسخ‌گویی', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setAskLoading(false)
    }
  }

  const runNarrate = async () => {
    setNarrateLoading(true)
    try {
      const res = await api.post<NarrateResp>('/api/ai/narrate', { datasetId })
      setNarrate(res)
      setNarrateApproved(false)
    } catch (e) {
      toast({ title: 'خطا در تولید پیش‌نویس', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setNarrateLoading(false)
    }
  }

  const runExplain = async () => {
    if (!formulaText.trim() && !errorText.trim()) return
    setExplainLoading(true)
    try {
      const res = await api.post<ExplainResp>('/api/ai/explain', { formula: formulaText, error: errorText })
      setExplain(res)
    } catch (e) {
      toast({ title: 'خطا در توضیح فرمول', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setExplainLoading(false)
    }
  }

  const isAmountRow = (v: unknown) => typeof v === 'number' && Math.abs(v) >= 100000

  return (
    <div className="space-y-4">
      {/* نوار وضعیت هوش مصنوعی — سیاست و مجوز بخش ۲۵ */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1 text-[10px]"><Sparkles className="size-3 text-primary" /> موتور هوشمند محلی: فعال</Badge>
            {status && (
              <>
                <Badge variant={status.policy.aiEnabled ? 'secondary' : 'destructive'} className="gap-1 text-[10px]">
                  <ShieldCheck className="size-3" /> دستیار مدل زبانی: {status.policy.aiEnabled ? (status.llmConfigured ? 'فعال' : 'پیکربندی نشده') : 'غیرفعال (سیاست مدیر)'}
                </Badge>
                <Badge variant={status.policy.aiAllowDataSharing ? 'secondary' : 'outline'} className="text-[10px]">
                  مجوز اشتراک داده با سرویس بیرونی: {status.policy.aiAllowDataSharing ? `فعال (سقف ${toPersianDigits(String(status.policy.aiMaxRowsShared))} ردیف)` : 'بسته'}
                </Badge>
              </>
            )}
            <span className="text-[10px] text-muted-foreground">
              اعداد همیشه با موتور تحلیل همین سامانه محاسبه می‌شود؛ مدل زبانی فقط تفسیر و روایت کمک می‌کند (بخش ۲۵ سند).
            </span>
          </div>
          {status && !status.llmConfigured && status.policy.aiEnabled && (
            <p className="text-[10px] text-muted-foreground mt-2">{status.llmReason}</p>
          )}
        </CardContent>
      </Card>

      {/* تحلیل هوشمند مجموعه‌داده — پیشنهادهای موتور محلی */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2"><Lightbulb className="size-4 text-primary" /> تحلیل هوشمند مجموعه‌داده «{datasetName}»</span>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={runSuggestions} disabled={suggestLoading}>
              {suggestLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {suggestions ? 'تحلیل مجدد' : 'تحلیل هوشمند'}
            </Button>
          </CardTitle>
          <CardDescription className="text-xs">
            پیشنهاد نوع ستون، کلید یکتا، رابطه، قواعد پاک‌سازی، نمودار مناسب، شاخص قابل محاسبه، الگوها و نقاط غیرعادی — مستقیماً از داده (بخش ۲۵ سند)
          </CardDescription>
        </CardHeader>
        {suggestions && (
          <CardContent className="space-y-3">
            {suggestions.notices.length > 0 && (
              <Alert><AlertDescription className="text-xs">{suggestions.notices.join('؛ ')}</AlertDescription></Alert>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {/* نمودار پیشنهادی */}
              <SuggestionBlock icon={<ChartSpline className="size-3.5" />} title="نمودار مناسب پیشنهادی" count={suggestions.charts.length}>
                {suggestions.charts.map((c, i) => (
                  <SuggestionItem key={i} title={`${CHART_LABEL[c.chartType] ?? c.chartType} — ${c.title}`} detail={c.reason} badge={`${Math.round(c.confidence * 100)}٪`} />
                ))}
              </SuggestionBlock>

              {/* شاخص‌های قابل محاسبه */}
              <SuggestionBlock icon={<Calculator className="size-3.5" />} title="شاخص‌های قابل محاسبه" count={suggestions.measures.length}>
                {suggestions.measures.map((m, i) => (
                  <SuggestionItem key={i} title={m.title} detail={m.reason} />
                ))}
              </SuggestionBlock>

              {/* نوع داده پیشنهادی */}
              <SuggestionBlock icon={<CheckCircle2 className="size-3.5" />} title="نوع داده و برچسب ستون" count={suggestions.types.length}>
                {suggestions.types.map((t, i) => (
                  <SuggestionItem key={i} title={`«${t.label}»: ${typeLabel(t.currentType)} → ${typeLabel(t.suggestedType)}`} detail={t.reason} badge={`${Math.round(t.confidence * 100)}٪`} />
                ))}
              </SuggestionBlock>

              {/* کلید یکتا */}
              <SuggestionBlock icon={<KeyRound className="size-3.5" />} title="کلید یکتا و سطح جزئیات" count={suggestions.uniqueKeys.length}>
                {suggestions.uniqueKeys.map((k, i) => (
                  <SuggestionItem key={i} title={k.labels.join(' + ')} detail={k.reason} badge={`${Math.round(k.uniqueness * 100)}٪`} />
                ))}
              </SuggestionBlock>

              {/* روابط پیشنهادی */}
              <SuggestionBlock icon={<Network className="size-3.5" />} title="روابط پیشنهادی میان جداول" count={suggestions.relations.length}>
                {suggestions.relations.map((r, i) => (
                  <SuggestionItem key={i} title={`${r.fromFieldLabel} ↔ ${r.toDatasetName}.${r.toFieldLabel}`} detail={r.reason} badge={`${Math.round(r.valueOverlap * 100)}٪`} />
                ))}
              </SuggestionBlock>

              {/* قواعد پاک‌سازی */}
              <SuggestionBlock icon={<BrushCleaning className="size-3.5" />} title="قواعد پاک‌سازی پیشنهادی" count={suggestions.cleaning.length}>
                {suggestions.cleaning.map((c, i) => (
                  <SuggestionItem key={i} title={c.fieldLabel ? `${c.fieldLabel}: ${c.description}` : c.description} detail="" badge={toPersianDigits(String(c.affected))} />
                ))}
              </SuggestionBlock>

              {/* الگوها و نقاط غیرعادی */}
              <SuggestionBlock icon={<Radar className="size-3.5" />} title="الگوها و نقاط غیرعادی" count={suggestions.anomalies.length + suggestions.patterns.length}>
                {suggestions.anomalies.map((a, i) => (
                  <SuggestionItem key={`a${i}`} title={a.title} detail={a.detail} severity={a.severity} />
                ))}
                {suggestions.patterns.map((p, i) => (
                  <SuggestionItem key={`p${i}`} title={p.title} detail={p.detail} />
                ))}
              </SuggestionBlock>

              {/* ستون مکانی */}
              {suggestions.geo && (
                <SuggestionBlock icon={<Radar className="size-3.5" />} title="ستون مکانی تشخیص‌داده‌شده (۱۹.۲)" count={1}>
                  <SuggestionItem
                    title={`«${suggestions.geo.label}» آماده نقشه جغرافیایی است`}
                    detail={`${Math.round(suggestions.geo.matchRatio * 100)}٪ مقادیر با استان‌های مرجع تطبیق دارند؛ در گزارش‌ساز نوع «نقشه جغرافیایی» را انتخاب کنید.`}
                    badge={`${Math.round(suggestions.geo.matchRatio * 100)}٪`}
                  />
                </SuggestionBlock>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{formatNumber(suggestions.scannedRecords)} رکورد تحلیل شد | تصمیم نهایی با مدیر داده است (بخش ۴ سند)</p>
          </CardContent>
        )}
        {!suggestions && (
          <CardContent>
            <p className="text-xs text-muted-foreground py-4 text-center">دکمه «تحلیل هوشمند» را بزنید تا پیشنهادها از داده استخراج شود.</p>
          </CardContent>
        )}
      </Card>

      {/* پرسش به زبان طبیعی */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><MessageCircleQuestion className="size-4 text-primary" /> پرسش به زبان طبیعی از داده</CardTitle>
          <CardDescription className="text-xs">
            تفسیر پرسش، اجرا با موتور دقیق محاسبات و پاسخ مستند به منبع، سنجه و فیلترها (بخش ۲۵ سند)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !askLoading) ask() }}
              placeholder="مثال: جمع مبلغ به تفکیک استان"
              className="h-9 text-sm"
            />
            <Button className="h-9 gap-1.5 text-xs" onClick={() => ask()} disabled={askLoading || !question.trim()}>
              {askLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} پرسش
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions(fields).map((q, i) => (
              <button key={i} onClick={() => { setQuestion(q); ask(q) }}
                className="rounded-full border px-2.5 py-0.5 text-[11px] hover:bg-muted transition-colors">
                {q}
              </button>
            ))}
          </div>

          {askResp && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
              {askResp.understood ? (
                <>
                  <p className="text-sm leading-6 whitespace-pre-line">{askResp.answer}</p>
                  {askResp.trace && (
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <Badge variant="outline" className="text-[10px]">منبع: {askResp.trace.dataset.name}</Badge>
                      <Badge variant="secondary" className="text-[10px]">سنجه: {askResp.trace.measure.label} ({aggLabel(askResp.trace.measure.agg)})</Badge>
                      {askResp.trace.dimension && <Badge variant="secondary" className="text-[10px]">بُعد: {askResp.trace.dimension.label}</Badge>}
                      {askResp.trace.filters.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">فیلتر: {f.label} = {f.value}</Badge>
                      ))}
                      <Badge variant="outline" className="text-[10px]">تفسیر: {askResp.interpreter === 'llm' ? 'مدل زبانی' : 'محلی'}</Badge>
                    </div>
                  )}
                  {askResp.result && askResp.result.rows.length > 0 && (
                    <div className="rounded-lg border max-h-56 overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            {askResp.trace?.dimension && <TableHead className="text-xs">{askResp.trace.dimension.label}</TableHead>}
                            <TableHead className="text-xs text-left">{askResp.trace?.measure.label ?? 'نتیجه'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {askResp.result.rows.slice(0, 15).map((r, i) => (
                            <TableRow key={i}>
                              {askResp.trace?.dimension && <TableCell className="text-xs">{String(r[askResp.trace.dimension.fieldId] ?? '—')}</TableCell>}
                              <TableCell className="text-xs text-left tabular-nums">
                                {formatCell(r, askResp.trace?.measure.label ?? '', isAmountRow(r[askResp.trace?.measure.label ?? '']))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-2">
                  <TriangleAlert className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs leading-6 whitespace-pre-line">{askResp.answer}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* پیش‌نویس گزارش توصیفی با تأیید انسانی */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4 text-primary" /> پیش‌نویس گزارش توصیفی هوشمند</CardTitle>
          <CardDescription className="text-xs">
            متن پایه از اعداد موتور قالبی (بخش ۲۰) و روایت غنی‌تر با مدل زبانی در صورت مجوز سیاست — هر دو نیازمند تأیید انسانی (الزام بخش ۲۵)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={runNarrate} disabled={narrateLoading}>
            {narrateLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} تولید پیش‌نویس
          </Button>
          {narrate && (
            <div className="space-y-2">
              {narrate.narrative && (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-[10px] text-teal-700 font-medium">روایت مدل زبانی — نیازمند تأیید انسانی پیش از استفاده رسمی</p>
                  <Textarea readOnly rows={8} value={narrate.narrative} className="text-xs leading-6" />
                </div>
              )}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground">متن پایه موتور قالبی — اعداد دقیق و سازگار با جدول (بخش ۲۰ سند)</p>
                <Textarea readOnly rows={7} value={narrate.engineText} className="text-xs leading-6 bg-muted/30" />
              </div>
              <label className="flex items-center justify-between rounded-lg border p-2.5 text-xs">
                <span>متن پیش‌نویس را بازبینی کردم و تأیید می‌کنم (امضای تأیید انسانی — بخش ۲۵)</span>
                <Switch checked={narrateApproved} onCheckedChange={setNarrateApproved} />
              </label>
              {narrateApproved && (
                <Alert><AlertDescription className="text-xs flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-teal-600" /> تأیید انسانی ثبت شد؛ متن برای استفاده رسمی آزاد است.</AlertDescription></Alert>
              )}
              {narrate.llmNote && <p className="text-[10px] text-muted-foreground">{narrate.llmNote}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* توضیح فرمول و خطا */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><HelpCircle className="size-4 text-primary" /> توضیح فرمول و خطا</CardTitle>
          <CardDescription className="text-xs">تفسیر فرمول‌نویسی امن و خطاهای محاسباتی با قواعد محلی و مدل زبانی (بخش ۲۵ سند)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">فرمول</Label>
            <Input value={formulaText} onChange={e => setFormulaText(e.target.value)} placeholder="مثال: نسبت_ایمن(مبلغ ؛ تعداد)" className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">متن خطا (اختیاری)</Label>
            <Input value={errorText} onChange={e => setErrorText(e.target.value)} placeholder="مثال: تقسیم بر صفر در سطر ۴" className="h-8 text-xs" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={runExplain} disabled={explainLoading || (!formulaText && !errorText)}>
            {explainLoading ? <Loader2 className="size-3.5 animate-spin" /> : <HelpCircle className="size-3.5" />} توضیح بده
          </Button>
          {explain && (
            <div className="rounded-lg border p-3 space-y-2">
              {explain.localRules.map((r, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-xs font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground leading-6">{r.explanation}</p>
                  <p className="text-xs text-teal-700 leading-6">پیشنهاد: {r.suggestion}</p>
                </div>
              ))}
              {explain.llmText && <Textarea readOnly rows={5} value={explain.llmText} className="text-xs leading-6" />}
              {!explain.llmText && explain.llmNote && <p className="text-[10px] text-muted-foreground">{explain.llmNote}</p>}
              <p className="text-[10px] text-muted-foreground">منبع: {explain.source}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────── اجزای کمکی ─────────────────────────

function SuggestionBlock({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  if (count === 0) {
    return (
      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">{icon} {title}</p>
        <p className="text-[11px] text-muted-foreground mt-1.5">موردی برای پیشنهاد یافت نشد.</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-xs font-medium flex items-center gap-1.5">{icon} {title} <Badge variant="secondary" className="text-[9px]">{toPersianDigits(String(count))}</Badge></p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function SuggestionItem({ title, detail, badge, severity }: { title: string; detail: string; badge?: string; severity?: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium leading-5">{title}</p>
        {badge && <Badge variant="outline" className="text-[9px] shrink-0">{badge}</Badge>}
      </div>
      {detail && <p className="text-[10px] text-muted-foreground leading-5 mt-0.5">{detail}</p>}
      {severity === 'medium' && <p className="text-[10px] text-amber-600 mt-0.5">اهمیت متوسط — بررسی توصیه می‌شود</p>}
    </div>
  )
}

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    text: 'متن', integer: 'عدد صحیح', decimal: 'اعشاری', amount: 'مبلغ', percent: 'درصد',
    date: 'تاریخ', time: 'زمان', datetime: 'تاریخ و زمان', boolean: 'منطقی', category: 'دسته‌بندی',
    identifier: 'شناسه', geo: 'مکانی',
  }
  return map[t] ?? t
}

function aggLabel(a: string): string {
  const map: Record<string, string> = {
    sum: 'جمع', avg: 'میانگین', count: 'تعداد', countDistinct: 'تعداد متمایز',
    min: 'کمینه', max: 'بیشینه', median: 'میانه',
  }
  return map[a] ?? a
}

function formatCell(row: Record<string, unknown>, key: string, isAmount: boolean): string {
  const v = row[key]
  if (typeof v !== 'number') return '—'
  return isAmount ? formatAmount(v, { autoUnitLabel: true }) : formatNumber(Math.round(v * 100) / 100)
}

// پرسش‌های پیشنهادی سریع بر اساس ستون‌های واقعی مجموعه‌داده
function quickQuestions(fields: FieldLite[]): string[] {
  const dim = fields.find(f => f.role === 'dimension' || f.type === 'category' || f.role === 'attribute')
  const measure = fields.find(f => f.role === 'measure' || ['integer', 'decimal', 'amount', 'percent'].includes(f.type))
  const out: string[] = []
  if (dim && measure) {
    out.push(`جمع ${measure.label} به تفکیک ${dim.label}`)
    out.push(`بیشترین ${measure.label} بر اساس ${dim.label}`)
  }
  if (measure) out.push(`میانگین ${measure.label}`)
  out.push('تعداد رکورد')
  return out.slice(0, 4)
}
