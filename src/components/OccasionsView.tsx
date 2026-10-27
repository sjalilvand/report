// تقویم مناسبت‌ها — بخش ۱۵.۴ سند
// جدول مرجع مناسبت‌ها با هر هشت فیلد الزامی سند: نام، نوع تقویم، شروع/پایان در هر سال،
// دسته، سراسری/محلی، تعطیل/غیرتعطیل، منبع و نسخه، رنگ و برچسب نمایشی
// مناسبت قمری سال‌به‌سال با مرجع تأییدشده سازمان ثبت می‌شود؛ هم‌پوشانی (۱۵.۵) هشدار غیرمسدودکننده می‌دهد

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { toPersianDigits } from '@/lib/digits'
import { CalendarDays, Plus, Upload, Pencil, Trash2, Moon, AlertTriangle } from 'lucide-react'

interface Occasion {
  id: string
  name: string
  calendarType: string
  year: string | null
  startDate: string
  endDate: string | null
  category: string
  scope: string
  isHoliday: boolean
  source: string | null
  sourceVersion: string | null
  color: string
  label: string | null
}

const CALENDAR_LABELS: Record<string, string> = { shamsi: 'شمسی', ghamari: 'قمری', miladi: 'میلادی' }
const CATEGORY_LABELS: Record<string, string> = { official: 'رسمی', religious: 'دینی', organizational: 'سازمانی', other: 'سایر' }
const SCOPE_LABELS: Record<string, string> = { global: 'سراسری', local: 'محلی' }

const EMPTY_FORM = {
  id: '', name: '', calendarType: 'shamsi', year: '', startDate: '', endDate: '',
  category: 'official', scope: 'global', isHoliday: false, source: '', sourceVersion: '',
  color: '#2563eb', label: '',
}

export default function OccasionsView({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { toast } = useToast()
  const [items, setItems] = useState<Occasion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [yearFilter, setYearFilter] = useState<string>('all')

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ occasions: Occasion[] }>(`/api/occasions?projectId=${projectId}`)
      setItems(res.occasions)
    } catch { setItems([]) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const years = Array.from(new Set(items.map(i => i.year).filter(Boolean))) as string[]
  const shown = yearFilter === 'all' ? items : items.filter(i => i.year === yearFilter)

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setDialogOpen(true) }
  const openEdit = (o: Occasion) => {
    setForm({
      id: o.id, name: o.name, calendarType: o.calendarType, year: o.year ?? '',
      startDate: o.startDate, endDate: o.endDate ?? '', category: o.category, scope: o.scope,
      isHoliday: o.isHoliday, source: o.source ?? '', sourceVersion: o.sourceVersion ?? '',
      color: o.color, label: o.label ?? '',
    })
    setDialogOpen(true)
  }

  const notifyOverlap = (overlapWith: { name: string }[] | undefined) => {
    if (overlapWith && overlapWith.length > 0) {
      toast({
        title: 'هشدار هم‌پوشانی مناسبت‌ها (بخش ۱۵.۵ سند)',
        description: `بازه این مناسبت با ${toPersianDigits(String(overlapWith.length))} مناسبت دیگر هم‌پوشان است: ${overlapWith.map(o => o.name).join('، ')}`,
        variant: 'destructive',
      })
    }
  }

  const save = async () => {
    if (!form.name.trim() || !form.startDate.trim()) {
      toast({ title: 'نام مناسبت و تاریخ شروع الزامی است', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        projectId,
        name: form.name.trim(),
        calendarType: form.calendarType,
        year: form.year.trim() || null,
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim() || null,
        category: form.category,
        scope: form.scope,
        isHoliday: form.isHoliday,
        source: form.source.trim() || null,
        sourceVersion: form.sourceVersion.trim() || null,
        color: form.color,
        label: form.label.trim() || null,
      }
      if (form.id) {
        const res = await api.patch<{ overlapWith?: { name: string }[] }>(`/api/occasions/${form.id}`, payload)
        notifyOverlap(res.overlapWith)
        toast({ title: 'مناسبت ویرایش شد' })
      } else {
        const res = await api.post<{ overlapWith?: { name: string }[] }>('/api/occasions', payload)
        notifyOverlap(res.overlapWith)
        toast({ title: 'مناسبت ثبت شد', description: 'در جدول مرجع مناسبت‌های پروژه در دسترس است (بخش ۱۵.۴ سند).' })
      }
      setDialogOpen(false)
      await load()
    } catch (e) {
      toast({ title: 'خطا در ذخیره مناسبت', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const remove = async (o: Occasion) => {
    try {
      await api.del(`/api/occasions/${o.id}`)
      toast({ title: 'مناسبت حذف شد' })
      await load()
    } catch (e) {
      toast({ title: 'خطا در حذف', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const importFile = async (f: File) => {
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('projectId', projectId)
      fd.append('file', f)
      const res = await fetch('/api/occasions/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'خطا در ورود گروهی')
      toast({
        title: 'ورود گروهی کامل شد',
        description: `${toPersianDigits(String(json.imported))} مناسبت وارد شد${json.failed > 0 ? ` — ${toPersianDigits(String(json.failed))} سطر رد شد` : ''}${json.overlaps?.length > 0 ? ' — هم‌پوشانی شناسایی شد (بخش ۱۵.۵)' : ''}`,
        variant: json.failed > 0 ? 'destructive' : 'default',
      })
      if (json.errors?.length > 0) {
        toast({ title: 'سطرهای ردشده', description: json.errors.slice(0, 5).map((e: { row: number; reason: string }) => `سطر ${toPersianDigits(String(e.row))}: ${e.reason}`).join(' | ') })
      }
      await load()
    } catch (e) {
      toast({ title: 'خطا در ورود گروهی', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally { setImporting(false) }
  }

  const faDate = (s: string) => toPersianDigits(s)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> تقویم مناسبت‌ها</CardTitle>
            <CardDescription>
              جدول مرجع مناسبت‌های سازمان — نام، نوع تقویم (شمسی/قمری/میلادی)، بازه هر سال، دسته، سراسری/محلی، تعطیل، منبع و نسخه، رنگ و برچسب (بخش ۱۵.۴ سند). مناسبت قمری باید بر اساس مرجع تقویمی مورد تأیید سازمان، سال‌به‌سال ثبت شود.
            </CardDescription>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls,.csv,.tsv" className="hidden" onChange={e => {
                const f = e.target.files?.[0]
                if (f) void importFile(f)
                e.target.value = ''
              }} />
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => fileRef.current?.click()} disabled={importing}>
                <Upload className="size-3.5" /> {importing ? 'در حال ورود...' : 'ورود از اکسل/CSV'}
              </Button>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
                <Plus className="size-3.5" /> مناسبت جدید
              </Button>
            </div>
          )}
        </div>
        {years.length > 0 && (
          <div className="flex gap-2 pt-1">
            <Button variant={yearFilter === 'all' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setYearFilter('all')}>همه سال‌ها</Button>
            {years.slice(0, 8).map(y => (
              <Button key={y} variant={yearFilter === y ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setYearFilter(y)}>
                {toPersianDigits(y)}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">در حال بارگذاری مناسبت‌ها...</p>
        ) : shown.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
            هنوز مناسبی ثبت نشده است{canEdit ? ' — با «مناسبت جدید» شروع کنید یا جدول مناسبت‌های سازمان را از اکسل وارد کنید.' : '.'}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map(o => (
              <div key={o.id} className="rounded-lg border p-3 space-y-2" style={{ borderRightWidth: 4, borderRightColor: o.color }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {o.calendarType === 'ghamari' && <Moon className="size-3.5 text-muted-foreground shrink-0" />}
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: o.color }} />
                    <span className="font-medium text-sm truncate">{o.label || o.name}</span>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(o)}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => void remove(o)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  )}
                </div>
                {o.label && o.label !== o.name && <p className="text-xs text-muted-foreground">{o.name}</p>}
                <div className="text-xs text-muted-foreground">
                  {faDate(o.startDate)}{o.endDate ? ` تا ${faDate(o.endDate)}` : ''}{o.year ? ` — سال ${toPersianDigits(o.year)}` : ''}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{CALENDAR_LABELS[o.calendarType] ?? o.calendarType}</Badge>
                  <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[o.category] ?? o.category}</Badge>
                  <Badge variant="outline" className="text-[10px]">{SCOPE_LABELS[o.scope] ?? o.scope}</Badge>
                  {o.isHoliday && <Badge className="text-[10px] bg-red-100 text-red-800 hover:bg-red-100">تعطیل رسمی</Badge>}
                </div>
                {(o.source || o.sourceVersion) && (
                  <p className="text-[10px] text-muted-foreground">منبع: {o.source ?? '—'}{o.sourceVersion ? ` | نسخه: ${toPersianDigits(o.sourceVersion)}` : ''}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* دیالوگ ثبت/ویرایش مناسبت — هر هشت فیلد بخش ۱۵.۴ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{form.id ? 'ویرایش مناسبت' : 'مناسبت جدید'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">نام مناسبت *</Label>
              <Input className="h-8 text-xs" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: عید نوروز" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع تقویم</Label>
              <Select value={form.calendarType} onValueChange={v => setForm({ ...form, calendarType: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shamsi">شمسی</SelectItem>
                  <SelectItem value="ghamari">قمری (ثبت سال‌به‌سال با مرجع تأییدشده)</SelectItem>
                  <SelectItem value="miladi">میلادی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">سال (اختیاری)</Label>
              <Input className="h-8 text-xs" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="۱۴۰۴" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تاریخ شروع * (YYYY-MM-DD در همان تقویم)</Label>
              <Input className="h-8 text-xs" dir="ltr" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} placeholder="1404-01-01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تاریخ پایان (اختیاری)</Label>
              <Input className="h-8 text-xs" dir="ltr" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} placeholder="1404-01-13" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">دسته مناسبت</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">رسمی</SelectItem>
                  <SelectItem value="religious">دینی</SelectItem>
                  <SelectItem value="organizational">سازمانی</SelectItem>
                  <SelectItem value="other">سایر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">دامنه</Label>
              <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">سراسری</SelectItem>
                  <SelectItem value="local">محلی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رنگ نمایشی</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-8 w-12 rounded border cursor-pointer bg-transparent" />
                <Input className="h-8 text-xs flex-1" dir="ltr" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">برچسب نمایشی (اختیاری)</Label>
              <Input className="h-8 text-xs" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="مثلاً: نوروز ۱۴۰۴" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">منبع اطلاعات</Label>
              <Input className="h-8 text-xs" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="مثال: مصوبه هیئت وزیران" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نسخه اطلاعات</Label>
              <Input className="h-8 text-xs" value={form.sourceVersion} onChange={e => setForm({ ...form, sourceVersion: e.target.value })} placeholder="مثال: ۱۴۰۴-ر۱" />
            </div>
            <div className="rounded-lg border p-3 flex items-center justify-between gap-2 sm:col-span-2">
              <Label className="text-xs">تعطیل رسمی است</Label>
              <Switch checked={form.isHoliday} onCheckedChange={v => setForm({ ...form, isHoliday: v })} />
            </div>
            {form.calendarType === 'ghamari' && (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                مناسبت قمری: تاریخ متناظر باید بر اساس مرجع تقویمی مورد تأیید سازمان ثبت شود؛ تبدیل ثابت برای همه سال‌ها کافی نیست (بخش ۱۵.۴ سند).
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>انصراف</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره مناسبت'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
