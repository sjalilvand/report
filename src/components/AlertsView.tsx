'use client'

// مدیریت قواعد هشدار — بخش ۲۶.۲ سند (هشدار و اعلان)
// شش محرک: عبور از آستانه، کاهش کیفیت، تأخیر فایل، شکست پردازش، تغییر ساختار، نبود داده دوره

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { formatNumber } from '@/lib/currency'
import {
  BellRing, Plus, Trash2, PlayCircle, Loader2, AlertOctagon, Gauge, FileClock,
  Bug, GitCompareArrows, CalendarX2, TrendingUp, Power,
} from 'lucide-react'

interface AlertRule {
  id: string
  name: string
  type: string
  datasetId?: string | null
  fieldId?: string | null
  aggregation: string
  operator: string
  threshold?: number | null
  maxDays?: number | null
  severity: string
  active: boolean
  createdBy?: string | null
  lastEvalAt?: string | null
  lastState?: { breach?: boolean; value?: number; score?: number; ageDays?: number; failures?: number; rowCount?: number } | null
}

interface FieldLite { id: string; label: string; type: string }

interface DatasetLite { id: string; name: string; rowCount: number }

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; hint: string }> = {
  threshold: { label: 'عبور شاخص از آستانه', icon: <TrendingUp className="size-4" />, hint: 'جمع/میانگین یک سنجه از حد مشخص عبور کند (مثال: جمع مبلغ فروش بیش از سقف).' },
  quality: { label: 'کاهش کیفیت داده', icon: <Gauge className="size-4" />, hint: 'امتیاز کیفیت مجموعه‌داده (۰ تا ۱۰۰ بر پایه خالی‌ها، تکراری‌ها و ناسازگاری) زیر حد برود.' },
  fileDelay: { label: 'تأخیر در دریافت فایل', icon: <FileClock className="size-4" />, hint: 'فایل منبع بیش از N روز به‌روزرسانی نشده باشد.' },
  processFailure: { label: 'شکست پردازش', icon: <Bug className="size-4" />, hint: 'رویداد شکست پردازش (بارگذاری ناموفق و ...) از آخرین بررسی ثبت شده باشد.' },
  structureChange: { label: 'تغییر ساختار', icon: <GitCompareArrows className="size-4" />, hint: 'ستون‌های مجموعه‌داده (نام/نوع/واحد) تغییر کنند.' },
  missingPeriod: { label: 'نبود داده در دوره مورد انتظار', icon: <CalendarX2 className="size-4" />, hint: 'تعداد رکورد از کمینه مورد انتظار دوره کمتر شود.' },
}

const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  critical: { label: 'بحرانی', cls: 'bg-red-100 text-red-700 border-red-200' },
  warning: { label: 'هشدار', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  info: { label: 'اطلاعی', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
}

const AGG_LABELS: Record<string, string> = {
  sum: 'جمع', avg: 'میانگین', count: 'تعداد رکورد', min: 'کمینه', max: 'بیشینه', countDistinct: 'تعداد متمایز',
}

const OP_LABELS: Record<string, string> = { gt: 'بزرگ‌تر از', gte: 'بزرگ‌تر یا مساوی', lt: 'کوچک‌تر از', lte: 'کوچک‌تر یا مساوی', eq: 'مساوی' }

function ruleSummary(r: AlertRule): string {
  switch (r.type) {
    case 'threshold':
      return `${AGG_LABELS[r.aggregation] ?? r.aggregation} ${r.operator ? OP_LABELS[r.operator] : ''} ${formatNumber(r.threshold ?? 0)}`
    case 'quality':
      return `امتیاز کیفیت کمتر از ${formatNumber(r.threshold ?? 0)}`
    case 'fileDelay':
      return `بیش از ${formatNumber(r.maxDays ?? 0)} روز بدون به‌روزرسانی`
    case 'processFailure':
      return 'هر رویداد شکست از آخرین بررسی'
    case 'structureChange':
      return 'هر تغییر نام/نوع/واحد ستون‌ها'
    case 'missingPeriod':
      return `کمینه رکورد دوره: ${formatNumber(r.threshold ?? 1)}`
    default:
      return r.type
  }
}

export default function AlertsView({
  projectId,
  datasets,
  fields,
  activeDatasetId,
}: {
  projectId: string
  datasets: DatasetLite[]
  fields: FieldLite[]
  activeDatasetId: string | null
}) {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [evalSummary, setEvalSummary] = useState<string | null>(null)
  const { toast } = useToast()

  // فرم قاعده جدید
  const [name, setName] = useState('')
  const [type, setType] = useState('threshold')
  const [datasetId, setDatasetId] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [aggregation, setAggregation] = useState('sum')
  const [operator, setOperator] = useState('gt')
  const [threshold, setThreshold] = useState('')
  const [maxDays, setMaxDays] = useState('7')
  const [severity, setSeverity] = useState('warning')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await api.get<AlertRule[]>(`/api/alerts?projectId=${projectId}`)
      setRules(list)
    } catch (e) {
      toast({ title: 'خطا در دریافت قواعد', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (dialogOpen && !datasetId && activeDatasetId) setDatasetId(activeDatasetId)
  }, [dialogOpen, activeDatasetId, datasetId])

  const canManage = true // سمت سرور کنترل می‌شود؛ دکمه‌ها برای همه نقش‌های مجاز فعال است

  const createRule = async () => {
    if (!name.trim()) { toast({ title: 'نام قاعده الزامی است', variant: 'destructive' }); return }
    setSaving(true)
    try {
      await api.post('/api/alerts', {
        projectId, name: name.trim(), type, datasetId: datasetId || undefined,
        fieldId: fieldId || undefined, aggregation, operator,
        threshold: threshold === '' ? undefined : +threshold,
        maxDays: maxDays === '' ? undefined : +maxDays,
        severity,
      })
      toast({ title: 'قاعده هشدار ساخته شد', description: 'از «بررسی الآن» برای ارزیابی فوری استفاده کنید.' })
      setDialogOpen(false)
      setName(''); setThreshold(''); setFieldId(''); setType('threshold'); setDatasetId(activeDatasetId ?? '')
      load()
    } catch (e) {
      toast({ title: 'خطا در ایجاد قاعده', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggleRule = async (r: AlertRule) => {
    try {
      await api.patch(`/api/alerts/${r.id}`, { active: !r.active })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const deleteRule = async (r: AlertRule) => {
    if (!confirm(`قاعده «${r.name}» حذف شود؟`)) return
    try {
      await api.del(`/api/alerts/${r.id}`)
      load()
      toast({ title: 'قاعده حذف شد' })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const evaluateAll = async () => {
    setEvaluating(true)
    setEvalSummary(null)
    try {
      const res = await api.post<{ results: { ruleName: string; fired: boolean; created: boolean; skipped?: string; value?: number | null }[]; summary: { total: number; fired: number; created: number } }>(
        '/api/alerts/evaluate', { projectId }
      )
      const firedNames = res.results.filter(r => r.fired).map(r => r.ruleName)
      setEvalSummary(
        `${formatNumber(res.summary.total)} قاعده بررسی شد | ${formatNumber(res.summary.fired)} هشدار فعال${firedNames.length ? ': ' + firedNames.join('، ') : ''}` +
        (res.results.some(r => r.skipped) ? ` | توجه: ${res.results.filter(r => r.skipped).length} قاعده ارزیابی نشد` : '')
      )
      load()
    } catch (e) {
      toast({ title: 'خطا در ارزیابی', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <BellRing className="size-4" />
        <AlertDescription>
          هشدارها بر شش محرک بخش ۲۶.۲ سند پایش می‌شوند: عبور شاخص از آستانه، کاهش کیفیت داده، تأخیر در دریافت فایل، شکست پردازش، تغییر ساختار و نبود داده در دوره مورد انتظار. اعلان‌ها درون‌برنامه‌ای از زنگ بالای صفحه قابل مشاهده‌اند؛ شکست پردازش و توقف به‌روزرسانی ساختاری به‌طور خودکار اعلان می‌سازند.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <AlertOctagon className="size-4" /> قواعد هشدار پروژه ({formatNumber(rules.length)})
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={evaluateAll} disabled={evaluating || rules.length === 0}>
            {evaluating ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
            بررسی الآن
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)} disabled={!canManage}>
            <Plus className="size-4" /> قاعده جدید
          </Button>
        </div>
      </div>

      {evalSummary && (
        <Alert className="border-emerald-200 bg-emerald-50/60">
          <AlertDescription className="text-emerald-800 text-xs">{evalSummary}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">در حال دریافت…</div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <BellRing className="size-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium">هنوز قاعده‌ای تعریف نشده است</p>
            <p className="text-xs text-muted-foreground">با «قاعده جدید» پایش شاخص‌ها و سلامت داده را آغاز کنید.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map(r => {
            const meta = TYPE_META[r.type]
            const sev = SEVERITY_META[r.severity] ?? SEVERITY_META.warning
            return (
              <Card key={r.id} className={r.active ? '' : 'opacity-60'}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {meta?.icon}
                      {r.name}
                      {!r.active && <Badge variant="outline" className="text-[9px]">غیرفعال</Badge>}
                    </CardTitle>
                    <Badge variant="outline" className={`text-[10px] ${sev.cls}`}>{sev.label}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {meta?.label} — {ruleSummary(r)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    آخرین بررسی: {r.lastEvalAt ? new Date(r.lastEvalAt).toLocaleString('fa-IR') : '—'}
                    {r.lastState?.breach && <span className="text-amber-600 font-medium"> | هشدار فعال</span>}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="gap-1 text-[11px]" onClick={() => toggleRule(r)}>
                      <Power className="size-3.5" /> {r.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-[11px] text-destructive hover:text-destructive" onClick={() => deleteRule(r)}>
                      <Trash2 className="size-3.5" /> حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* گفت‌وگوی ایجاد قاعده */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>قاعده هشدار جدید (بخش ۲۶.۲)</DialogTitle>
            <DialogDescription>نوع محرک را انتخاب کنید؛ فیلدهای لازم بر همان اساس نمایش داده می‌شود.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>نام قاعده</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: سقف فروش ماهانه" />
            </div>
            <div className="space-y-1.5">
              <Label>نوع محرک</Label>
              <Select value={type} onValueChange={v => { setType(v); setFieldId('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">{m.icon} {m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{TYPE_META[type]?.hint}</p>
            </div>

            {type !== 'processFailure' && (
              <div className="space-y-1.5">
                <Label>مجموعه‌داده</Label>
                <Select value={datasetId} onValueChange={v => { setDatasetId(v); setFieldId('') }}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {datasets.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name} ({formatNumber(d.rowCount)} رکورد)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'threshold' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>نوع تجمیع</Label>
                    <Select value={aggregation} onValueChange={setAggregation}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(AGG_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>ستون سنجه</Label>
                    <Select value={fieldId} onValueChange={setFieldId} disabled={aggregation === 'count'}>
                      <SelectTrigger><SelectValue placeholder={aggregation === 'count' ? 'لازم نیست' : 'انتخاب کنید'} /></SelectTrigger>
                      <SelectContent>
                        {fields.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>شرط</Label>
                    <Select value={operator} onValueChange={setOperator}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(OP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>مقدار آستانه</Label>
                    <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {type === 'quality' && (
              <div className="space-y-1.5">
                <Label>حداقل امتیاز کیفیت قابل قبول (۰ تا ۱۰۰)</Label>
                <Input type="number" min={0} max={100} value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="مثال: 80" />
              </div>
            )}

            {type === 'fileDelay' && (
              <div className="space-y-1.5">
                <Label>حداکثر فاصله مجاز (روز)</Label>
                <Input type="number" min={0} value={maxDays} onChange={e => setMaxDays(e.target.value)} />
              </div>
            )}

            {type === 'missingPeriod' && (
              <div className="space-y-1.5">
                <Label>کمینه رکورد مورد انتظار دوره</Label>
                <Input type="number" min={1} value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="مثال: 100" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>شدت</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">اطلاعی</SelectItem>
                    <SelectItem value="warning">هشدار</SelectItem>
                    <SelectItem value="critical">بحرانی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>وضعیت</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch checked onCheckedChange={() => undefined} disabled />
                  <span className="text-xs text-muted-foreground">فعال (پیش‌فرض)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button onClick={createRule} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                ایجاد قاعده
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
