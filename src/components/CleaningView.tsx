'use client'

// ابزارهای پاک‌سازی و تبدیل — بخش ۱۰ سند
// عملیات متنی و ساختاری + دفترچه مراحل تبدیل با ثبت کامل هر اقدام (بخش ۱۰.۳)

import { useState } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatNumber } from '@/lib/currency'
import { Loader2, Wand2, History, CircleOff, Sparkles } from 'lucide-react'

interface TransformStepClient {
  id: string
  op: string
  config: Record<string, unknown>
  userId?: string
  at: string
  before: number
  after: number
  warnings?: string[]
  errors?: string[]
  disabled?: boolean
}

const OP_LABEL: Record<string, string> = {
  trim: 'حذف فاصله ابتدا و انتها', collapseSpaces: 'اصلاح فاصله‌های تکراری', unifyPersian: 'یکسان‌سازی «ی» و «ک»',
  toLatinDigits: 'تبدیل ارقام به لاتین', toPersianDigits: 'تبدیل ارقام به فارسی', replace: 'جست‌وجو و جایگزینی',
  mapValues: 'نگاشت مقادیر به مقدار مرجع', splitColumn: 'تقسیم ستون', mergeColumns: 'ادغام ستون‌ها',
  dropColumns: 'حذف ستون‌ها', keepColumns: 'نگهداری ستون‌ها', filterRows: 'فیلتر سطرها', sortRows: 'مرتب‌سازی',
  dedupe: 'حذف تکرار', fillNull: 'پرکردن مقدار خالی', addSourceColumn: 'افزودن ستون منشأ',
  unpivot: 'تبدیل ستون‌ها به سطر (Unpivot)', pivot: 'تبدیل سطرها به ستون (Pivot ساختاری)',
}

export default function CleaningView({
  datasetId,
  fields,
  fileName,
  sheetName,
  transforms,
  onChange,
}: {
  datasetId: string
  fields: { id: string; label: string; type: string }[]
  fileName: string
  sheetName: string
  transforms: TransformStepClient[]
  onChange: () => void
}) {
  const [op, setOp] = useState('')
  const [column, setColumn] = useState('')
  const [find, setFind] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [mapping, setMapping] = useState('')
  const [separator, setSeparator] = useState(',')
  const [filterOp, setFilterOp] = useState('notnull')
  const [filterValue, setFilterValue] = useState('')
  const [keep, setKeep] = useState('first')
  const [fillMethod, setFillMethod] = useState('value')
  // Unpivot/Pivot ساختاری — بخش ۱۰.۲
  const [unpKeep, setUnpKeep] = useState('')
  const [unpCols, setUnpCols] = useState('')
  const [unpAttrName, setUnpAttrName] = useState('شاخص')
  const [unpValueName, setUnpValueName] = useState('مقدار')
  const [pvKeys, setPvKeys] = useState('')
  const [pvAttr, setPvAttr] = useState('')
  const [pvValue, setPvValue] = useState('')
  const [pvAgg, setPvAgg] = useState('sum')
  const [pvFill, setPvFill] = useState('')
  const [running, setRunning] = useState(false)
  const { toast } = useToast()

  const textCols = fields.filter(f => ['text', 'category', 'identifier'].includes(f.type))
  const numericCols = fields.filter(f => ['integer', 'decimal', 'amount', 'percent'].includes(f.type))
  const allCols = fields

  const apply = async (operation: string, config: Record<string, unknown>) => {
    setRunning(true)
    try {
      const res = await api.post<{ step: TransformStepClient; version: number; rowCount: number; warnings: string[] }>(
        `/api/datasets/${datasetId}/transform`, { op: operation, config }
      )
      toast({
        title: 'تبدیل اعمال و ثبت شد',
        description: `${formatNumber(res.step.before)} → ${formatNumber(res.step.after)} رکورد؛ مرحله در دفترچه تبدیل ثبت شد (بخش ۱۰.۳ سند).` +
          (res.warnings.length ? ` هشدارها: ${res.warnings.join('؛ ')}` : ''),
      })
      onChange()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setRunning(false)
    }
  }

  const runSelected = () => {
    if (!op) { toast({ title: 'یک عملیات انتخاب کنید', variant: 'destructive' }); return }
    const config: Record<string, unknown> = {}
    switch (op) {
      case 'trim': case 'collapseSpaces': case 'unifyPersian': case 'toLatinDigits': case 'toPersianDigits':
        if (!column) { toast({ title: 'ستون را انتخاب کنید', variant: 'destructive' }); return }
        config.column = column
        break
      case 'replace':
        config.column = column; config.find = find; config.replaceWith = replaceWith
        break
      case 'mapValues':
        config.column = column; config.mapping = mapping
        break
      case 'splitColumn':
        config.column = column; config.separator = separator
        break
      case 'mergeColumns':
        config.columns = column; config.separator = separator; config.newName = find || 'ستون ترکیبی'
        break
      case 'dropColumns': case 'keepColumns':
        config.columns = column
        break
      case 'filterRows':
        config.column = column; config.op = filterOp; config.value = filterValue
        break
      case 'sortRows':
        config.column = column; config.dir = filterOp === 'notnull' ? 'asc' : filterOp
        break
      case 'dedupe':
        config.columns = column; config.keep = keep
        break
      case 'fillNull':
        config.column = column; config.method = fillMethod; config.value = filterValue
        break
      case 'addSourceColumn':
        config.fileName = fileName; config.sheetName = sheetName
        break
      case 'unpivot':
        config.keepColumns = unpKeep
        config.unpivotColumns = unpCols
        config.attrName = unpAttrName || 'شاخص'
        config.valueName = unpValueName || 'مقدار'
        break
      case 'pivot':
        config.keyColumns = pvKeys
        config.attributeColumn = pvAttr
        config.valueColumn = pvValue
        config.agg = pvAgg
        config.fillValue = pvFill
        break
    }
    apply(op, config)
  }

  // مثال نگاشت سند — بخش ۱۰.۱
  const loadMappingExample = () => {
    setMapping('تهران => تهران\nاستان تهران => تهران\nتهران  => تهران')
    setOp('mapValues')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* پنل عملیات */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Wand2 className="size-4" /> اعمال تبدیل</CardTitle>
          <CardDescription>ویرایش غیرمخرب: هر اقدام در مراحل تبدیل ثبت می‌شود و داده خام تغییر نمی‌کند (بخش ۴ و ۱۰ سند)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="text">
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1">متنی (۱۰.۱)</TabsTrigger>
              <TabsTrigger value="structural" className="flex-1">ساختاری (۱۰.۲)</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-3 pt-2">
              <OpSelect value={op} onChange={setOp} ops={['trim', 'collapseSpaces', 'unifyPersian', 'toLatinDigits', 'toPersianDigits', 'replace', 'mapValues', 'splitColumn']} />
              {needsColumn(op) && op !== 'mergeColumns' && (
                <ColPicker label="ستون" cols={op === 'mapValues' || op === 'replace' ? textCols : allCols} value={column} onChange={setColumn} />
              )}
              {op === 'mergeColumns' && (
                <ColPicker label="ستون‌ها (چندتایی مجاز)" cols={textCols} value={column} onChange={setColumn} multi />
              )}
              {op === 'replace' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">جست‌وجو</Label><Input className="h-8" value={find} onChange={e => setFind(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">جایگزین</Label><Input className="h-8" value={replaceWith} onChange={e => setReplaceWith(e.target.value)} /></div>
                </div>
              )}
              {op === 'mapValues' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">قواعد نگاشت (هر سطر: مقدار فعلی =&gt; مقدار مرجع)</Label>
                    <Button variant="link" size="sm" className="h-6 px-0 text-xs" onClick={loadMappingExample}>مثال سند: استان</Button>
                  </div>
                  <Textarea rows={4} value={mapping} onChange={e => setMapping(e.target.value)} placeholder={'تهران => تهران\nاستان تهران => تهران'} className="text-xs" />
                </div>
              )}
              {op === 'splitColumn' && (
                <div className="space-y-1"><Label className="text-xs">جداکننده</Label><Input className="h-8" value={separator} onChange={e => setSeparator(e.target.value)} /></div>
              )}
            </TabsContent>

            <TabsContent value="structural" className="space-y-3 pt-2">
              <OpSelect value={op} onChange={setOp} ops={['dropColumns', 'keepColumns', 'filterRows', 'sortRows', 'dedupe', 'fillNull', 'unpivot', 'pivot', 'addSourceColumn']} />
              {needsColumn(op) && op !== 'addSourceColumn' && (
                <ColPicker
                  label={op === 'dropColumns' || op === 'keepColumns' || op === 'dedupe' ? 'ستون‌ها (چندتایی مجاز؛ خالی برای همه)' : 'ستون'}
                  cols={allCols} value={column} onChange={setColumn} multi={['dropColumns', 'keepColumns', 'dedupe'].includes(op)}
                />
              )}
              {(op === 'filterRows' || op === 'sortRows') && (
                <div className="space-y-1">
                  <Label className="text-xs">{op === 'filterRows' ? 'شرط' : 'ترتیب'}</Label>
                  <Select value={filterOp} onValueChange={setFilterOp}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(op === 'filterRows' ? ['eq', 'neq', 'contains', 'gt', 'lt', 'notnull', 'isnull'] : ['asc', 'desc']).map(o => (
                        <SelectItem key={o} value={o}>
                          {({ eq: 'برابر', neq: 'نابرابر', contains: 'شامل', gt: 'بزرگ‌تر', lt: 'کوچک‌تر', notnull: 'نام خالی', isnull: 'خالی', asc: 'صعودی', desc: 'نزولی' } as Record<string, string>)[o]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(op === 'filterRows' || op === 'fillNull') && ['eq', 'neq', 'contains', 'gt', 'lt'].includes(filterOp) && (
                <div className="space-y-1"><Label className="text-xs">مقدار</Label><Input className="h-8" value={filterValue} onChange={e => setFilterValue(e.target.value)} /></div>
              )}
              {op === 'fillNull' && (
                <div className="space-y-1">
                  <Label className="text-xs">روش پرکردن</Label>
                  <Select value={fillMethod} onValueChange={setFillMethod}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value">با مقدار مشخص</SelectItem>
                      <SelectItem value="ffill">با مقدار سطر قبلی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {op === 'dedupe' && (
                <div className="space-y-1">
                  <Label className="text-xs">سیاست نگهداری (بخش ۱۷.۲)</Label>
                  <Select value={keep} onValueChange={setKeep}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">نگهداری اولین رکورد</SelectItem>
                      <SelectItem value="last">نگهداری آخرین رکورد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Unpivot — بخش ۱۰.۲: گسترش ستون‌ها به جفت شاخص/مقدار */}
              {op === 'unpivot' && (
                <div className="space-y-3">
                  <MultiColPicker label="ستون‌های ثابت (تکرار می‌شوند)" cols={allCols} value={unpKeep} onChange={setUnpKeep} placeholder="ستون‌هایی مانند استان و تاریخ که برای هر سطر جدید تکرار می‌شوند" />
                  <MultiColPicker label="ستون‌های تبدیل‌شونده به سطر" cols={numericCols.length > 0 ? numericCols : allCols} value={unpCols} onChange={setUnpCols} placeholder="هر ستون انتخابی به چند سطر تبدیل می‌شود" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">نام ستون شاخص</Label><Input className="h-8" value={unpAttrName} onChange={e => setUnpAttrName(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">نام ستون مقدار</Label><Input className="h-8" value={unpValueName} onChange={e => setUnpValueName(e.target.value)} /></div>
                  </div>
                </div>
              )}
              {/* Pivot ساختاری — بخش ۱۰.۲: فشرده‌سازی سطرها به ستون */}
              {op === 'pivot' && (
                <div className="space-y-3">
                  <MultiColPicker label="ستون‌های کلید گروه‌بندی" cols={allCols} value={pvKeys} onChange={setPvKeys} placeholder="هر ترکیب یکتای کلیدها یک سطر خروجی است" />
                  <ColPicker label="ستونی که مقادیرش ستون می‌شوند" cols={allCols} value={pvAttr} onChange={setPvAttr} />
                  <ColPicker label="ستون مقدار" cols={numericCols.length > 0 ? numericCols : allCols} value={pvValue} onChange={setPvValue} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">تجمیع</Label>
                      <Select value={pvAgg} onValueChange={setPvAgg}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(['sum', 'avg', 'count', 'min', 'max', 'first'] as const).map(a => (
                            <SelectItem key={a} value={a}>
                              {({ sum: 'جمع', avg: 'میانگین', count: 'تعداد', min: 'کمینه', max: 'بیشینه', first: 'نخستین مقدار' } as Record<string, string>)[a]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">پرکننده خانه خالی (اختیاری)</Label><Input className="h-8" value={pvFill} onChange={e => setPvFill(e.target.value)} placeholder="۰" /></div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Button onClick={runSelected} disabled={running || !op} className="w-full gap-2">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            اعمال تبدیل
          </Button>
        </CardContent>
      </Card>

      {/* دفترچه مراحل تبدیل — بخش ۱۰.۳ */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><History className="size-4" /> دفترچه مراحل تبدیل</CardTitle>
          <CardDescription>
            نام عملیات، تنظیمات، زمان، کاربر، تعداد رکورد قبل/بعد، هشدارها — قابلیت ویرایش و غیرفعال‌کردن مرحله (بخش ۱۰.۳ سند)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transforms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">هنوز تبدیلی اعمال نشده است. داده در وضعیت خام اصلی است.</p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2 pe-2">
                {transforms.map((s, i) => (
                  <div key={s.id} className={`rounded-lg border p-3 space-y-2 ${s.disabled ? 'opacity-50' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">مرحله {i + 1}</Badge>
                        <span className="text-sm font-medium">{OP_LABEL[s.op] ?? s.op}</span>
                        {s.disabled && <Badge variant="destructive" className="text-[10px] gap-1"><CircleOff className="size-3" /> غیرفعال</Badge>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(s.at).toLocaleString('fa-IR')} | {s.userId} | نسخه {formatNumber(s.before)} ← {formatNumber(s.after)} رکورد
                      </span>
                    </div>
                    {Object.keys(s.config).length > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground truncate" title={JSON.stringify(s.config)}>
                        تنظیمات: {JSON.stringify(s.config, null, 0)}
                      </p>
                    )}
                    {s.warnings?.map((w, wi) => <p key={wi} className="text-xs text-amber-600">⚠ {w}</p>)}
                    {s.errors?.map((er, ei) => <p key={ei} className="text-xs text-destructive">✕ {er}</p>)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="info">
              <AccordionTrigger className="text-xs">قواعد سیاست خطا — بخش ۹.۲ سند</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                <Table>
                  <TableBody>
                    {[
                      ['فقط هشدار', 'رکورد نمایش داده می‌شود و در گزارش علامت می‌خورد'],
                      ['جلوگیری از انتشار', 'داده نامعتبر اجازه انتشار گزارش نمی‌گیرد'],
                      ['قرنطینه', 'رکوردهای مشکوک به بخش جداگانه منتقل می‌شوند'],
                      ['اصلاح با قاعده', 'اصلاح خودکار با قاعده مشخص مدیر'],
                      ['پذیرش استثنا', 'با ثبت دلیل و تأیید مدیر'],
                    ].map(([k, v]) => (
                      <TableRow key={k}><TableCell className="font-medium w-40">{k}</TableCell><TableCell>{v}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}

function needsColumn(op: string): boolean {
  return ['trim', 'collapseSpaces', 'unifyPersian', 'toLatinDigits', 'toPersianDigits', 'replace', 'mapValues',
    'splitColumn', 'mergeColumns', 'dropColumns', 'keepColumns', 'filterRows', 'sortRows', 'dedupe', 'fillNull'].includes(op)
}

// انتخاب چندستونی برای Unpivot/Pivot — بخش ۱۰.۲
function MultiColPicker({ label, cols, value, onChange, placeholder }: {
  label: string
  cols: { id: string; label: string }[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const toggle = (id: string) => {
    const arr = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
    const idx = arr.indexOf(id)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(id)
    onChange(arr.join(','))
  }
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1 max-h-24 overflow-auto rounded border p-1.5">
        {cols.map(c => (
          <button
            key={c.id} type="button" onClick={() => toggle(c.id)}
            className={`rounded px-1.5 py-0.5 text-[11px] border ${selected.includes(c.id) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-background hover:bg-muted'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {placeholder && <p className="text-[10px] text-muted-foreground">{placeholder}</p>}
    </div>
  )
}

function OpSelect({ value, onChange, ops }: { value: string; onChange: (v: string) => void; ops: string[] }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">عملیات</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder="انتخاب عملیات" /></SelectTrigger>
        <SelectContent>
          {ops.map(o => <SelectItem key={o} value={o}>{OP_LABEL[o]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function ColPicker({ label, cols, value, onChange, multi }: {
  label: string
  cols: { id: string; label: string; type: string }[]
  value: string
  onChange: (v: string) => void
  multi?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder="انتخاب ستون" /></SelectTrigger>
        <SelectContent>
          {multi && <SelectItem value="*">همه ستون‌ها</SelectItem>}
          {cols.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
