'use client'

// مدل معنایی — بخش‌های ۱۱، ۱۲، ۱۳ و ۱۷ سند
// تفکیک ابعاد و سنجه‌ها، سطح جزئیات، آزمون یکتایی، فیلد محاسباتی و بازه‌سازی

import { useEffect, useState } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { formatNumber, formatAmount, getUnit, isCurrencyUnit } from '@/lib/currency'
import { Loader2, Braces, Grid3X3, Sigma, AlertTriangle, CheckCircle2, Layers, Calculator, SlidersHorizontal } from 'lucide-react'
import { FieldMetaClient } from './ColumnsEditor'

interface BandDef { label: string; from?: number; to?: number }

export default function ModelView({
  datasetId,
  fields,
  grain,
  records,
  onChange,
}: {
  datasetId: string
  fields: FieldMetaClient[]
  grain: string | null
  records: Record<string, unknown>[]
  onChange: () => void
}) {
  const dims = fields.filter(f => f.role === 'dimension')
  const measures = fields.filter(f => f.role === 'measure')
  const ids = fields.filter(f => f.role === 'identifier')
  const [grainText, setGrainText] = useState(grain ?? '')
  const { toast } = useToast()

  const saveGrain = async () => {
    try {
      await api.patch(`/api/datasets/${datasetId}`, { grain: grainText })
      toast({ title: 'سطح جزئیات ثبت شد', description: 'هر سطر نماینده چیست؟ این مشخصه در مدل ثبت و مبنای اتصال‌ها و تجمیع شاخص‌هاست (بخش ۱۱.۳ سند).' })
      onChange()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const unitLabel = (f: FieldMetaClient): string => {
    if (!f.unit) return '—'
    if (isCurrencyUnit(f.unit)) return getUnit(f.unit).label.replace(' (هزار میلیارد تومان)', '')
    const map: Record<string, string> = { person: 'نفر', item: 'فقره' }
    return map[f.unit] ?? f.unit
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="dims">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dims" className="gap-1.5"><Grid3X3 className="size-3.5" /> ابعاد و سنجه‌ها (۱۱)</TabsTrigger>
          <TabsTrigger value="uniqueness" className="gap-1.5"><Layers className="size-3.5" /> کلید یکتا (۱۷)</TabsTrigger>
          <TabsTrigger value="derived" className="gap-1.5"><Calculator className="size-3.5" /> فیلد محاسباتی (۱۲)</TabsTrigger>
          <TabsTrigger value="bands" className="gap-1.5"><SlidersHorizontal className="size-3.5" /> بازه‌سازی (۱۳.۳)</TabsTrigger>
        </TabsList>

        {/* ابعاد و سنجه‌ها */}
        <TabsContent value="dims" className="space-y-4 pt-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">سطح جزئیات داده — بخش ۱۱.۳</CardTitle>
              <CardDescription>برای هر جدول باید مشخص شود هر سطر نماینده چیست؛ اتصال جدول‌ها و تجمیع شاخص‌ها به آن وابسته است.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 flex-1 min-w-64">
                <Label htmlFor="grain">هر سطر این مجموعه‌داده نماینده چیست؟</Label>
                <Select value={grainText} onValueChange={setGrainText}>
                  <SelectTrigger id="grain"><SelectValue placeholder="انتخاب سطح جزئیات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="یک تراکنش">یک تراکنش</SelectItem>
                    <SelectItem value="یک شخص">یک شخص</SelectItem>
                    <SelectItem value="یک پرونده">یک پرونده</SelectItem>
                    <SelectItem value="یک واحد در یک ماه">یک واحد در یک ماه</SelectItem>
                    <SelectItem value="یک ردیف بودجه">یک ردیف بودجه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveGrain}>ثبت</Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <FieldListCard title="ابعاد (Dimensions)" desc="فیلدهای دسته‌بندی، فیلتر و تفکیک — بخش ۱۱.۱" icon={<Grid3X3 className="size-4" />} items={dims.map(f => f.label)} color="sky" />
            <FieldListCard title="سنجه‌ها (Measures)" desc="مقادیر قابل محاسبه و تحلیل — بخش ۱۱.۲" icon={<Sigma className="size-4" />} items={measures.map(f => `${f.label} (${unitLabel(f)})`)} color="emerald" />
            <FieldListCard title="شناسه‌ها" desc="کلیدهای بالقوه برای اتصال و یکتایی" icon={<Layers className="size-4" />} items={ids.map(f => f.label)} color="amber" />
          </div>

          {/* نوع تجمیع — بخش ۱۱.۴ */}
          {measures.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">نوع تجمیع سنجه‌ها — بخش ۱۱.۴</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>سنجه</TableHead>
                      <TableHead>واحد</TableHead>
                      <TableHead>قاعده تجمیع</TableHead>
                      <TableHead>نوع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {measures.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.label}</TableCell>
                        <TableCell>{unitLabel(f)}</TableCell>
                        <TableCell>{f.aggregation}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {f.aggregation === 'avg' || f.aggregation === 'median' ? 'غیرجمع‌پذیر' : f.aggregation === 'last' ? 'نیمه‌جمع‌پذیر' : 'جمع‌پذیر'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Alert className="mt-3">
                  <AlertTriangle className="size-4" />
                  <AlertDescription className="text-xs">
                    میانگین چند شعبه نباید بدون توجه به تعداد رکورد هر شعبه با میانگین ساده جمع‌بندی شود (بخش ۱۱.۴ سند).
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* آزمون یکتایی */}
        <TabsContent value="uniqueness" className="pt-3">
          <UniquenessCheck datasetId={datasetId} candidates={[...ids, ...dims].map(f => ({ id: f.id, label: f.label }))} />
        </TabsContent>

        {/* فیلد محاسباتی */}
        <TabsContent value="derived" className="pt-3">
          <DerivedFieldForm datasetId={datasetId} fields={fields} onChange={onChange} />
        </TabsContent>

        {/* بازه‌سازی */}
        <TabsContent value="bands" className="pt-3">
          <BandingForm datasetId={datasetId} fields={fields} onChange={onChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FieldListCard({ title, desc, icon, items, color }: { title: string; desc: string; icon: React.ReactNode; items: string[]; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-sm text-${color}-700`}>{icon} {title}</CardTitle>
        <CardDescription className="text-xs">{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-xs text-muted-foreground">یافت نشد — نقش ستون‌ها را در برگه «ستون‌ها» تنظیم کنید.</p> : (
          <div className="flex flex-wrap gap-1.5">
            {items.map(i => <Badge key={i} variant="secondary" className="text-[11px]">{i}</Badge>)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// آزمون یکتایی — بخش ۱۷.۱ و معیار پذیرش ۳۳.۷
function UniquenessCheck({ datasetId, candidates }: { datasetId: string; candidates: { id: string; label: string }[] }) {
  const [key, setKey] = useState('')
  const [result, setResult] = useState<null | {
    total: number; distinct: number; unique: boolean; message: string
    duplicateGroups: { key: string; count: number }[]
  }>(null)
  const [loading, setLoading] = useState(false)

  const check = async () => {
    if (!key) return
    setLoading(true)
    try {
      const res = await api.get<{ total: number; distinct: number; unique: boolean; message: string; duplicateGroups: { key: string; count: number }[] }>(
        `/api/datasets/${datasetId}/uniqueness?fields=${encodeURIComponent(key)}`
      )
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">آزمون یکتایی کلید</CardTitle>
        <CardDescription>پیشنهاد کلید، آزمون بر کل مجموعه‌داده، نمایش گروه‌های تکراری — سامانه کلید را بی‌هشدار یکتا اعلام نمی‌کند (بخش ۱۷.۱ سند).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 flex-1 min-w-56">
            <Label>ستون کلید (کاندید)</Label>
            <Select value={key} onValueChange={setKey}>
              <SelectTrigger><SelectValue placeholder="انتخاب ستون" /></SelectTrigger>
              <SelectContent>
                {candidates.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={check} disabled={!key || loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Braces className="size-4" />} آزمون یکتایی
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            <Alert variant={result.unique ? 'default' : 'destructive'}>
              {result.unique ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
              <AlertDescription>
                {result.message} (کل: {formatNumber(result.total)} | متمایز: {formatNumber(result.distinct)})
              </AlertDescription>
            </Alert>
            {result.duplicateGroups.length > 0 && (
              <div className="rounded-lg border max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow><TableHead>مقدار کلید تکراری</TableHead><TableHead className="w-24">تعداد</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.duplicateGroups.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{g.key}</TableCell>
                        <TableCell className="text-amber-600 font-bold">{formatNumber(g.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// فرمول‌ساز — بخش ۱۲.۲ (زبان امن)
function DerivedFieldForm({ datasetId, fields, onChange }: { datasetId: string; fields: FieldMetaClient[]; onChange: () => void }) {
  const [formula, setFormula] = useState('')
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<unknown[] | null>(null)
  const [running, setRunning] = useState(false)
  const { toast } = useToast()

  const fieldById = fields.map(f => ({ id: f.id, label: f.label }))

  const insertField = (id: string) => setFormula(f => f + (f && !f.endsWith(' ') ? ' ' : '') + id + ' ')

  const run = async (previewOnly: boolean) => {
    setRunning(true)
    try {
      const res = await api.post<{ preview: unknown[]; field?: unknown; confirmed: boolean }>(
        `/api/datasets/${datasetId}/formula`,
        { formula, newName: name, newLabel: name, previewOnly }
      )
      setPreview(res.preview)
      if (!previewOnly) {
        toast({ title: 'فیلد محاسباتی ساخته شد', description: 'فرمول به شناسه داخلی ستون وابسته است؛ تغییر برچسب آن را خراب نمی‌کند (بخش ۸.۲ سند).' })
        onChange()
      }
    } catch (e) {
      toast({ title: 'خطای فرمول', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">ساخت فیلد محاسباتی — زبان امن (بخش ۱۲.۲)</CardTitle>
        <CardDescription>
          عملگرها: <code className="font-mono">+ − * /</code> | توابع: <code className="font-mono">اگر(شرط؛ آنگاه؛ وگرنه)</code>، <code className="font-mono">نسبت_ایمن(صورت؛ مخرج)</code> برای مدیریت تقسیم بر صفر، <code className="font-mono">گرد(x)</code>، <code className="font-mono">درصد(الف؛ ب)</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {fieldById.map(f => (
            <Button key={f.id} variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => insertField(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>فرمول (نمونه سند: مبلغ_ناخالص - تخفیف - برگشت)</Label>
            <Input value={formula} onChange={e => setFormula(e.target.value)} placeholder="مثال: نسبت_ایمن(عملکرد؛ هدف) * 100" dir="rtl" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>نام فیلد جدید</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: درصد_تحقق" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => run(true)} disabled={!formula || running}>پیش‌نمایش نتیجه</Button>
          <Button onClick={() => run(false)} disabled={!formula || !name || running} className="gap-2">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />} ساخت فیلد
          </Button>
        </div>
        {preview && (
          <div className="space-y-1">
            <Label className="text-xs">پیش‌نمایش ۱۰ مقدار نخست — مدیریت تقسیم بر صفر و مقادیر خالی طبق بخش ۱۲.۲ (خالی می‌ماند، نه صفر)</Label>
            <div className="flex flex-wrap gap-1.5">
              {preview.map((v, i) => (
                <Badge key={i} variant="outline" className="font-mono text-[11px]">{v === null ? '—' : typeof v === 'number' ? Math.round(v * 100) / 100 : String(v)}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// بازه‌سازی — بخش ۱۳.۳
function BandingForm({ datasetId, fields, onChange }: { datasetId: string; fields: FieldMetaClient[]; onChange: () => void }) {
  const numeric = fields.filter(f => ['integer', 'decimal', 'amount', 'percent'].includes(f.type))
  const [src, setSrc] = useState('')
  const [name, setName] = useState('')
  const [bands, setBands] = useState<BandDef[]>([
    { label: 'کم', from: 0 },
    { label: 'متوسط' },
    { label: 'زیاد' },
  ])
  const { toast } = useToast()

  const autoBands = async () => {
    if (!src) return
    try {
      const res = await api.get<{ min: number; max: number; bands: BandDef[] }>(`/api/datasets/${datasetId}/bands?fieldId=${encodeURIComponent(src)}&count=4`)
      setBands(res.bands)
      toast({ title: 'بازه‌های پیشنهادی با فاصله ثابت ساخته شد', description: `کمینه ${formatAmount(res.min)} تا بیشینه ${formatAmount(res.max)} — مرزها: شامل پایین، تا کمتر از بالا (بخش ۱۳.۳ سند).` })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const create = async () => {
    const valid = bands.filter(b => b.label.trim())
    try {
      await api.post(`/api/datasets/${datasetId}/bands`, {
        sourceFieldId: src, bands: valid.map(b => ({ label: b.label, from: b.from === null || b.from === undefined || (b.from as unknown as string) === '' ? undefined : Number(b.from), to: b.to === null || b.to === undefined || (b.to as unknown as string) === '' ? undefined : Number(b.to) })),
        newName: name, newLabel: name,
      })
      toast({ title: 'فیلد بازه‌ای ساخته شد', description: 'تداخل بازه‌ها و مقادیر خارج از پوشش کنترل و گزارش می‌شود (بخش ۱۳.۳ سند).' })
      onChange()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const updateBand = (i: number, patch: Partial<BandDef>) => setBands(bs => bs.map((b, j) => j === i ? { ...b, ...patch } : b))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">بازه‌سازی و گروه‌بندی مبلغی — بخش ۱۳.۳</CardTitle>
        <CardDescription>بازه دستی یا فاصله ثابت؛ مرزها روشن: شامل مرز پایین، تا کمتر از مرز بالا. مثال سند: «گروه_مبلغ = اگر مبلغ &lt; ۱٬۰۰۰٬۰۰۰ آنگاه کم ...»</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>ستون مبنای عددی</Label>
            <Select value={src} onValueChange={setSrc}>
              <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
              <SelectContent>{numeric.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>نام فیلد جدید</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: گروه_مبلغ" />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={autoBands} disabled={!src} className="w-full">پیشنهاد بازه خودکار</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>بازه‌ها</Label>
          {bands.map((b, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-end">
              <div className="space-y-1"><Label className="text-[10px]">برچسب</Label><Input className="h-8" value={b.label} onChange={e => updateBand(i, { label: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-[10px]">از (شامل)</Label><Input className="h-8" type="number" value={b.from ?? ''} onChange={e => updateBand(i, { from: e.target.value === '' ? undefined : +e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-[10px]">تا (کمتر از؛ خالی = باز)</Label><Input className="h-8" type="number" value={b.to ?? ''} onChange={e => updateBand(i, { to: e.target.value === '' ? undefined : +e.target.value })} /></div>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setBands(bs => bs.filter((_, j) => j !== i))} disabled={bands.length <= 1}>حذف</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setBands(bs => [...bs, { label: '' }])}>افزودن بازه</Button>
        </div>

        <Button onClick={create} disabled={!src || !name} className="gap-2"><Calculator className="size-4" /> ساخت فیلد بازه‌ای</Button>
      </CardContent>
    </Card>
  )
}
