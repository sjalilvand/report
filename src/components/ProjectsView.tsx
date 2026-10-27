'use client'

// نمای پروژه‌ها — بخش ۶ سند (مرحله اول: ایجاد پروژه) و بخش ۵ (نقش‌ها)

import { useState, useEffect } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { FolderKanban, Plus, Trash2, ArrowLeft, Files, Database, FileBarChart } from 'lucide-react'

interface Project {
  id: string
  name: string
  description?: string | null
  owner?: string | null
  domain?: string | null
  createdAt: string
  _count?: { files: number; datasets: number; reports: number }
}

export default function ProjectsView({ onSelect }: { onSelect: (p: Project) => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', owner: '', domain: '' })
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      setProjects(await api.get<Project[]>('/api/projects'))
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name.trim()) {
      toast({ title: 'نام پروژه الزامی است', variant: 'destructive' })
      return
    }
    try {
      await api.post('/api/projects', form)
      setOpen(false)
      setForm({ name: '', description: '', owner: '', domain: '' })
      toast({ title: 'پروژه ایجاد شد' })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const remove = async (p: Project) => {
    if (!confirm(`پروژه «${p.name}» و همه داده‌های وابسته حذف شود؟`)) return
    try {
      await api.del(`/api/projects/${p.id}`)
      toast({ title: 'پروژه حذف شد' })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">پروژه‌ها</h2>
          <p className="text-sm text-muted-foreground mt-1">
            هر پروژه یک فضای کاری مستقل برای فایل‌ها، مدل داده و گزارش‌هاست (بخش ۶ سند — مرحله اول)
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="size-4" /> پروژه جدید</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>ایجاد پروژه</DialogTitle>
              <DialogDescription>نام، توضیح، مالک و حوزه کاری پروژه را تعیین کنید</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pname">نام پروژه *</Label>
                <Input id="pname" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: گزارش عملکرد ماهانه فروش" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdesc">توضیح</Label>
                <Textarea id="pdesc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="هدف و دامنه پروژه" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="powner">مالک</Label>
                  <Input id="powner" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="نام مالک" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pdomain">حوزه کاری</Label>
                  <Input id="pdomain" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="مثلاً: مالی، فروش" />
                </div>
              </div>
              <Button onClick={create} className="w-full">ایجاد پروژه</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <FolderKanban className="size-12 text-muted-foreground" />
            <p className="text-lg font-semibold">هنوز پروژه‌ای وجود ندارد</p>
            <p className="text-sm text-muted-foreground max-w-md">
              برای شروع، یک پروژه ایجاد کنید و سپس فایل‌های اکسل خود را بارگذاری نمایید. سامانه از فایل‌های نامنظم با شناسایی خودکار ساختار پشتیبانی می‌کند.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(p => (
            <Card key={p.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelect(p)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-7">{p.name}</CardTitle>
                  <Button
                    variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity -me-2 -mt-1"
                    onClick={e => { e.stopPropagation(); remove(p) }}
                    aria-label={`حذف پروژه ${p.name}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1"><Files className="size-3" /> {p._count?.files ?? 0} فایل</Badge>
                  <Badge variant="secondary" className="gap-1"><Database className="size-3" /> {p._count?.datasets ?? 0} مجموعه‌داده</Badge>
                  <Badge variant="secondary" className="gap-1"><FileBarChart className="size-3" /> {p._count?.reports ?? 0} گزارش</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.owner ? `مالک: ${p.owner}` : ''}{p.domain ? ` | حوزه: ${p.domain}` : ''}</span>
                  <span className="flex items-center gap-1 text-primary">ورود <ArrowLeft className="size-3" /></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">راهنمای نقش‌ها — بخش ۵ سند</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نقش</TableHead>
                  <TableHead>مسئولیت و مجوز</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['مدیر داده', 'بارگذاری، اصلاح ساختار، پاک‌سازی و تأیید مجموعه‌داده'],
                  ['مدل‌ساز', 'تعریف ابعاد، سنجه‌ها، روابط، کلیدها و فرمول‌ها'],
                  ['طراح گزارش', 'ساخت داشبورد، گزارش و قالب انتشار'],
                  ['مشاهده‌کننده', 'مشاهده گزارش‌های مجاز و استفاده از فیلترهای مجاز'],
                  ['ناظر یا حسابرس', 'بررسی تاریخچه تغییرات، منشأ داده و تأییدها'],
                ].map(([r, d]) => (
                  <TableRow key={r}>
                    <TableCell className="font-medium whitespace-nowrap">{r}</TableCell>
                    <TableCell className="text-muted-foreground">{d}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
