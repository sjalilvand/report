'use client'

// ویرایش مشخصات ستون‌ها — بخش ۸ سند
// پنل کامل مشخصات هر ستون: نام اصلی، نام فنی، برچسب، نوع، نقش، واحد، تجمیع، حساسیت

import { useState } from 'react'
import { api } from '@/lib/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { typeLabel } from './DataView'
import { Loader2, KeyRound, Ruler, Eye, Shapes, Fingerprint } from 'lucide-react'

export interface FieldMetaClient {
  id: string
  sourceName: string
  label: string
  description?: string
  type: string
  detectedType?: string
  confidence?: number
  role: string
  unit?: string
  unitKind?: string
  aggregation: string
  sensitivity?: string
  invalidCount?: number
  examples?: string[]
}

const ROLE_LABEL: Record<string, string> = {
  dimension: 'بُعد', measure: 'سنجه', identifier: 'شناسه', attribute: 'توصیفی',
}
const AGG_LABEL: Record<string, string> = {
  sum: 'جمع', count: 'تعداد رکورد', countDistinct: 'تعداد متمایز', avg: 'میانگین',
  min: 'کمینه', max: 'بیشینه', median: 'میانه', last: 'آخرین مقدار', weightedAvg: 'میانگین وزنی',
}
const SENS_LABEL: Record<string, string> = { public: 'عمومی', internal: 'داخلی', confidential: 'محرمانه' }
const ROLE_OPTIONS = [
  { v: 'dimension', l: 'بُعد (Dimensions)' },
  { v: 'measure', l: 'سنجه (Measures)' },
  { v: 'identifier', l: 'شناسه' },
  { v: 'attribute', l: 'اطلاعات توصیفی' },
]
const TYPE_OPTIONS = ['text', 'integer', 'decimal', 'amount', 'percent', 'date', 'boolean', 'category', 'identifier']
const UNIT_OPTIONS = [
  { v: 'rial', l: 'ریال' }, { v: 'toman', l: 'تومان' }, { v: 'k_rial', l: 'هزار ریال' },
  { v: 'm_rial', l: 'میلیون ریال' }, { v: 'b_rial', l: 'میلیارد ریال' },
  { v: 'k_toman', l: 'هزار تومان' }, { v: 'm_toman', l: 'میلیون تومان' }, { v: 'b_toman', l: 'میلیارد تومان' },
  { v: 'hemt', l: 'همت' },
  { v: 'none', l: '— بدون واحد —' },
  { v: 'person', l: 'نفر' }, { v: 'item', l: 'فقره' },
]
const AGG_OPTIONS = ['sum', 'count', 'countDistinct', 'avg', 'min', 'max', 'median', 'last']

export default function ColumnsEditor({
  datasetId,
  fields,
  onChange,
}: {
  datasetId: string
  fields: FieldMetaClient[]
  onChange: () => void
}) {
  const [savingId, setSavingId] = useState<string | null>(null)
  const { toast } = useToast()

  const patch = async (fieldId: string, data: Record<string, unknown>) => {
    setSavingId(fieldId)
    try {
      const res = await api.patch<{ field: FieldMetaClient; warnings: string[] }>(`/api/datasets/${datasetId}/columns`, { fieldId, ...data })
      if (res.warnings?.length) {
        toast({ title: 'با هشدار ثبت شد', description: res.warnings.join('؛ ') })
      } else {
        toast({ title: 'مشخصات ستون ذخیره شد', description: 'شناسه پایدار داخلی بدون تغییر مانده و فرمول‌ها و روابط سالم می‌مانند (معیار پذیرش ۳۳.۲).' })
      }
      onChange()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="whitespace-nowrap">ستون (نام اصلی فایل)</TableHead>
              <TableHead className="whitespace-nowrap">برچسب نمایشی</TableHead>
              <TableHead className="whitespace-nowrap">نوع داده</TableHead>
              <TableHead className="whitespace-nowrap">اطمینان</TableHead>
              <TableHead className="whitespace-nowrap">نقش تحلیلی</TableHead>
              <TableHead className="whitespace-nowrap">واحد</TableHead>
              <TableHead className="whitespace-nowrap">قاعده تجمیع</TableHead>
              <TableHead className="whitespace-nowrap">حساسیت</TableHead>
              <TableHead className="whitespace-nowrap">نمونه مقادیر</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map(f => (
              <TableRow key={f.id}>
                <TableCell className="min-w-44 max-w-56">
                  <div className="font-medium text-sm truncate" title={f.sourceName}>{f.sourceName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate flex items-center gap-1" title={f.id}>
                    <Fingerprint className="size-3" /> {f.id}
                  </div>
                  {f.invalidCount !== undefined && f.invalidCount > 0 && (
                    <Badge variant="destructive" className="mt-1 text-[10px]">
                      {f.invalidCount} مقدار نامعتبر
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    defaultValue={f.label}
                    className="h-8 w-40 text-xs"
                    onBlur={e => { if (e.target.value !== f.label) patch(f.id, { label: e.target.value }) }}
                    aria-label={`برچسب ستون ${f.sourceName}`}
                  />
                </TableCell>
                <TableCell>
                  <Select value={f.type} onValueChange={v => patch(f.id, { type: v })}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {f.detectedType && f.detectedType !== f.type && (
                    <div className="text-[10px] text-muted-foreground mt-1">پیشنهاد: {typeLabel(f.detectedType)}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={f.confidence !== undefined && f.confidence >= 0.8 ? 'default' : f.confidence !== undefined && f.confidence >= 0.6 ? 'secondary' : 'outline'}
                    className="text-[10px]"
                  >
                    {f.confidence !== undefined ? `${Math.round(f.confidence * 100)}٪` : '—'}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ms-1 align-middle"><Eye className="size-3 text-muted-foreground" /></span>
                    </TooltipTrigger>
                    <TooltipContent>میزان اطمینان تشخیص خودکار است، نه تضمین صحت (بخش ۸ سند)</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Select value={f.role} onValueChange={v => patch(f.id, { role: v })}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {f.role === 'identifier' && (
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <KeyRound className="size-3" /> کاندید کلید
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {(f.type === 'amount' || f.type === 'decimal' || f.type === 'integer') && (
                    <Select value={f.unit ?? 'none'} onValueChange={v => patch(f.id, { unit: v === 'none' ? '' : v })}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="واحد" /></SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map(u => <SelectItem key={u.v} value={u.v}>{u.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {f.type === 'percent' && <span className="text-xs text-muted-foreground flex items-center gap-1"><Ruler className="size-3" /> درصد</span>}
                  {!['amount', 'decimal', 'integer', 'percent'].includes(f.type) && <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {f.role === 'measure' ? (
                    <Select value={f.aggregation} onValueChange={v => patch(f.id, { aggregation: v })}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AGG_OPTIONS.map(a => <SelectItem key={a} value={a}>{AGG_LABEL[a]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Shapes className="size-3" /> {AGG_LABEL[f.aggregation] ?? '—'}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select value={f.sensitivity ?? 'internal'} onValueChange={v => patch(f.id, { sensitivity: v })}>
                    <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">عمومی</SelectItem>
                      <SelectItem value="internal">داخلی</SelectItem>
                      <SelectItem value="confidential">محرمانه</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="max-w-44">
                  <div className="text-[10px] text-muted-foreground truncate" title={f.examples?.join(' | ')}>
                    {f.examples?.join(' | ') || '—'}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {savingId && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> در حال ذخیره...
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        نکته: شماره ملی، کدپستی، شماره تلفن و کدهای دارای صفر ابتدایی باید به‌صورت «شناسه» یا «متن» نگهداری شوند، نه عدد (بخش ۸.۱ سند).
        تغییر نوع داده همراه با شمارش مقدارهای نامعتبر انجام می‌شود (بخش ۸.۲).
      </p>
    </TooltipProvider>
  )
}
