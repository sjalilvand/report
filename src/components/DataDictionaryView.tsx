'use client'

// فرهنگ داده و شاخص‌ها — بخش ۱۸ سند
// فرهنگ داده مرکزی برای جلوگیری از اختلاف تعریف؛ شاخص تأییدشده در گزارش‌های مختلف قابل استفاده مجدد است

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  BookMarked, Plus, CheckCircle2, CircleDashed, Pencil, Trash2, Sigma, Lock, History,
} from 'lucide-react'

export interface MeasureDTO {
  id: string
  projectId: string
  name: string
  label: string
  description: string | null
  formula: string
  datasetId: string | null
  sourceFieldId: string | null
  unit: string | null
  aggregation: string
  fixedFilters: unknown[]
  scope: string | null
  owner: string | null
  limitations: string | null
  status: string
  version: number
  approvedAt: string | null
  approvedBy: string | null
  updatedAt: string
}

const AGG_LABELS: Record<string, string> = {
  sum: 'جمع', count: 'تعداد رکورد', countDistinct: 'شمارش متمایز', avg: 'میانگین',
  min: 'کمینه', max: 'بیشینه', median: 'میانه', last: 'آخرین',
}

const emptyForm = {
  name: '', label: '', description: '', formula: '', datasetId: '', sourceFieldId: '',
  unit: '', aggregation: 'sum', scope: '', limitations: '',
}

export default function DataDictionaryView({
  projectId,
  datasets,
  role,
}: {
  projectId: string
  datasets: { id: string; name: string; fields: string }[]
  role: string
}) {
  const [measures, setMeasures] = useState<MeasureDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MeasureDTO | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const { toast } = useToast()

  const canEdit = role === 'admin' || role === 'steward' || role === 'analyst'
  const canApprove = role === 'admin' || role === 'steward'

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setMeasures(await api.get<MeasureDTO[]>(`/api/measures?projectId=${encodeURIComponent(projectId)}`))
    } catch {
      setMeasures([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  const openNew = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (m: MeasureDTO) => {
    setEditing(m)
    setForm({
      name: m.name, label: m.label, description: m.description ?? '', formula: m.formula,
      datasetId: m.datasetId ?? '', sourceFieldId: m.sourceFieldId ?? '', unit: m.unit ?? '',
      aggregation: m.aggregation, scope: m.scope ?? '', limitations: m.limitations ?? '',
    })
    setDialogOpen(true)
  }

  const save = async () => {
    try {
      if (editing) {
        await api.patch(`/api/measures/${editing.id}`, form)
        toast({ title: 'شاخص به‌روزرسانی شد', description: 'در صورت تأییدشده بودن، نسخه افزایش یافت و تأیید مجدد لازم است.' })
      } else {
        await api.post('/api/measures', { ...form, projectId })
        toast({ title: 'شاخص در فرهنگ داده ثبت شد' })
      }
      setDialogOpen(false)
      refresh()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : 'ثبت شاخص ناموفق بود', variant: 'destructive' })
    }
  }

  const act = async (m: MeasureDTO, action: 'approve' | 'reject') => {
    let comment: string | undefined
    if (action === 'reject') {
      comment = window.prompt('دلیل رد شاخص را ثبت کنید (الزامی):') ?? ''
      if (!comment.trim()) return
    }
    try {
      await api.patch(`/api/measures/${m.id}`, { action, comment })
      toast({ title: action === 'approve' ? 'شاخص تأیید شد' : 'شاخص رد شد', description: action === 'approve' ? 'از این پس در گزارش‌ساز قابل استفاده است.' : 'شاخص به پیش‌نویس بازگشت.' })
      refresh()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : 'عملیات ناموفق بود', variant: 'destructive' })
    }
  }

  const remove = async (m: MeasureDTO) => {
    if (!window.confirm(`شاخص «${m.label}» حذف شود؟`)) return
    try {
      await api.del(`/api/measures/${m.id}`)
      refresh()
      toast({ title: 'شاخص حذف شد' })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : 'حذف ناموفق بود', variant: 'destructive' })
    }
  }

  const dsName = (id: string | null) => datasets.find(d => d.id === id)?.name ?? '—'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookMarked className="size-4 text-teal-600" /> فرهنگ داده و شاخص‌های سازمانی
            </CardTitle>
            <CardDescription className="mt-1 text-xs leading-5">
              بخش ۱۸ سند — تعریف یکتای شاخص‌ها برای جلوگیری از اختلاف برداشت؛ شاخص تأییدشده در همه گزارش‌ها به‌صورت یکسان به کار می‌رود.
            </CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" className="gap-1.5" onClick={openNew}>
              <Plus className="size-4" /> شاخص جدید
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {measures.length === 0 && !loading && (
          <Alert>
            <AlertDescription className="text-xs leading-6">
              هنوز شاخصی در فرهنگ داده ثبت نشده است. هر شاخص شامل کد، تعریف مدیریتی، فرمول، جدول و ستون منبع، واحد، نوع تجمیع، فیلترهای ثابت، دامنه کاربرد، مالک، نسخه و محدودیت‌ها است.
              مثال سند: شاخص «تعداد افراد» باید روشن کند منظور تعداد رکوردهاست یا تعداد شناسه‌های متمایز.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {measures.map(m => (
            <div key={m.id} className="rounded-lg border p-3 space-y-2 bg-white/60">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{m.label}</div>
                  <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">{m.name}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {m.status === 'approved' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                      <CheckCircle2 className="size-3" /> تأییدشده
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
                      <CircleDashed className="size-3" /> پیش‌نویس
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1 text-[10px]"><History className="size-3" /> نسخه {m.version.toLocaleString('fa-IR')}</Badge>
                </div>
              </div>
              {m.description && <p className="text-xs leading-5 text-muted-foreground">{m.description}</p>}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <Badge variant="outline" className="gap-1"><Sigma className="size-3" /> {AGG_LABELS[m.aggregation] ?? m.aggregation}</Badge>
                {m.unit && <Badge variant="outline">{m.unit}</Badge>}
                {m.formula && <Badge variant="outline" className="font-mono text-[10px]" dir="ltr">{m.formula.slice(0, 40)}</Badge>}
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <div>جدول منبع: {dsName(m.datasetId)}</div>
                {m.scope && <div>دامنه کاربرد: {m.scope}</div>}
                <div>مالک: {m.owner ?? '—'}</div>
                {m.status === 'approved' && m.approvedBy && <div>تأییدکننده: {m.approvedBy}</div>}
                {m.limitations && <div className="text-amber-700">محدودیت: {m.limitations}</div>}
              </div>
              <div className="flex items-center gap-1 pt-1 border-t">
                {canEdit && (
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => openEdit(m)}>
                    <Pencil className="size-3" /> ویرایش
                  </Button>
                )}
                {canApprove && m.status === 'draft' && (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-emerald-700" onClick={() => act(m, 'approve')}>
                      <CheckCircle2 className="size-3" /> تأیید
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-red-700" onClick={() => act(m, 'reject')}>
                      رد
                    </Button>
                  </>
                )}
                {canEdit && m.status !== 'approved' && (
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-red-700 mr-auto" onClick={() => remove(m)}>
                    <Trash2 className="size-3" /> حذف
                  </Button>
                )}
                {m.status === 'approved' && (
                  <span className="mr-auto flex items-center gap-1 text-[10px] text-emerald-700">
                    <Lock className="size-3" /> در گزارش‌ها قابل استفاده
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editing ? `ویرایش شاخص «${editing.label}»` : 'ثبت شاخص جدید در فرهنگ داده'}</DialogTitle>
            <DialogDescription className="text-xs leading-5">
              بخش ۱۸ سند — همه ویژگی‌های شاخص را کامل ثبت کنید تا تعریف آن در کل سازمان یکسان بماند.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">کد شاخص *</Label>
                  <Input dir="ltr" className="text-sm" value={form.name} disabled={!!editing}
                    onChange={e => setForm({ ...form, name: e.target.value })} placeholder="SALES_TOTAL" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">نام شاخص *</Label>
                  <Input className="text-sm" value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })} placeholder="جمع مبلغ فروش" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">تعریف مدیریتی *</Label>
                <Textarea className="text-sm min-h-[60px]" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="تعریف دقیق: مثلاً «تعداد افراد» یعنی تعداد رکورد یا تعداد شناسه متمایز؟ (بخش ۱۸ سند)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">نوع تجمیع</Label>
                  <Select value={form.aggregation} onValueChange={v => setForm({ ...form, aggregation: v })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGG_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">واحد</Label>
                  <Input className="text-sm" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="ریال / میلیارد ریال / عدد" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">جدول منبع</Label>
                  <Select value={form.datasetId || undefined} onValueChange={v => setForm({ ...form, datasetId: v, sourceFieldId: '' })}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="انتخاب جدول" /></SelectTrigger>
                    <SelectContent>
                      {datasets.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ستون منبع</Label>
                  <Select value={form.sourceFieldId || undefined} onValueChange={v => setForm({ ...form, sourceFieldId: v })} disabled={!form.datasetId}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="انتخاب ستون" /></SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const ds = datasets.find(d => d.id === form.datasetId)
                        const fields = ds ? JSON.parse(ds.fields || '[]') as { id: string; label: string }[] : []
                        return fields.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">فرمول (در صورت محاسباتی بودن)</Label>
                <Input dir="ltr" className="text-sm font-mono" value={form.formula} onChange={e => setForm({ ...form, formula: e.target.value })} placeholder="sum(فروش) / countDistinct(مشتری)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">دامنه کاربرد</Label>
                  <Input className="text-sm" value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} placeholder="گزارش‌های فروش منطقه‌ای" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">محدودیت‌ها</Label>
                  <Input className="text-sm" value={form.limitations} onChange={e => setForm({ ...form, limitations: e.target.value })} placeholder="مثلاً شامل مرجوعی‌ها نیست" />
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>انصراف</Button>
            <Button size="sm" onClick={save}>{editing ? 'ذخیره تغییرات' : 'ثبت شاخص'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
