'use client'

// محیط بصری اتصال جداول — بخش ۱۶ سند
// بوم گرافیکی با کارت جدول‌ها، کشیدن ستون روی ستون، انواع رابطه و اتصال
// کنترل‌های الزامی پیش از اتصال (۱۶.۳)، جلوگیری از چندبرابرشدن مبالغ (۱۶.۴)
// پرس‌وجوی تجمیعی روی مدل اتصالی با گزینه تجمیع پیش از اتصال

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { detectGraphIssues, JOIN_TYPE_LABELS, CARDINALITY_LABELS, JoinCheckResult } from '@/lib/join'
import { FieldMeta } from '@/lib/types'
import { formatNumber } from '@/lib/currency'
import {
  Workflow, GripVertical, Link2, Unlink, Sparkles, ShieldAlert, Play, Save,
  Plus, X, Network, Table2, CheckCircle2, TriangleAlert, Layers,
} from 'lucide-react'

interface DatasetRow { id: string; name: string; sheetName: string; rowCount: number; version: number; status: string; fields: string }
interface ColumnPair { fromFieldId: string; toFieldId: string }
interface RelationDTO {
  id: string; name: string; fromDatasetId: string; toDatasetId: string
  cardinality: string; joinType: string; columnPairs: ColumnPair[]
  status: string; filterDirection: string; lastCheck?: string | null
}
interface SuggestionDTO {
  fromDatasetId: string; toDatasetId: string; fromDatasetName: string; toDatasetName: string
  pairs: ColumnPair[]; score: number; reason: string
}
type JqField = FieldMeta

const CARD_W = 208
const TYPE_FA: Record<string, string> = {
  text: 'متن', integer: 'عدد', decimal: 'اعشار', amount: 'مبلغ', percent: 'درصد',
  date: 'تاریخ', identifier: 'شناسه', category: 'دسته', boolean: 'منطقی', time: 'زمان', datetime: 'زمان‌تاریخ', geo: 'مکانی',
}

export default function RelationsView({ projectId, datasets, canEdit }: {
  projectId: string
  datasets: DatasetRow[]
  canEdit: boolean
}) {
  const { toast } = useToast()
  const [rels, setRels] = useState<RelationDTO[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionDTO[]>([])
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [dragCard, setDragCard] = useState<string | null>(null)
  const dragOffset = useRef({ dx: 0, dy: 0 })
  const [draft, setDraft] = useState<{ fromDs: string; toDs: string; pairs: ColumnPair[]; joinType: string; name: string } | null>(null)
  const [check, setCheck] = useState<JoinCheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [preAgg, setPreAgg] = useState(false)
  const [savingRel, setSavingRel] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  // پرس‌وجوی اتصالی
  const [rootId, setRootId] = useState('')
  const [pathRelIds, setPathRelIds] = useState<string[]>([])
  const [jqPreAgg, setJqPreAgg] = useState(true)
  const [jqFields, setJqFields] = useState<JqField[]>([])
  const [jqDim, setJqDim] = useState('')
  const [jqMeasures, setJqMeasures] = useState<{ fieldId: string; agg: string }[]>([])
  const [jqResult, setJqResult] = useState<{ rows: Record<string, unknown>[]; totals: Record<string, unknown>; warnings: string[]; path: string[]; graphIssues: { kind: string; message: string }[] } | null>(null)
  const [jqBusy, setJqBusy] = useState(false)
  const [jqError, setJqError] = useState('')

  const dsById = new Map(datasets.map(d => [d.id, d]))
  const fieldsOf = (dsId: string): FieldMeta[] => {
    try { return JSON.parse(dsById.get(dsId)?.fields ?? '[]') } catch { return [] }
  }

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        api.get<RelationDTO[]>(`/api/relations?projectId=${projectId}`),
        api.get<SuggestionDTO[]>(`/api/relations/suggest?projectId=${projectId}`),
      ])
      setRels(r)
      setSuggestions(s)
    } catch { /* بی‌صدا */ }
  }, [projectId])

  useEffect(() => { load() }, [load])

  // چیدمان اولیه کارت‌ها
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev }
      datasets.forEach((d, i) => {
        if (!next[d.id]) {
          const col = i % 2
          const row = Math.floor(i / 2)
          next[d.id] = { x: 16 + col * (CARD_W + 90), y: 16 + row * 240 }
        }
      })
      return next
    })
  }, [datasets])

  const graphIssues = detectGraphIssues(rels.map(r => ({ id: r.id, fromDatasetId: r.fromDatasetId, toDatasetId: r.toDatasetId, status: r.status })))

  // ---------- بوم: جابه‌جایی کارت ----------
  const onCanvasDrop = (e: React.DragEvent) => {
    if (!dragCard) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(rect.width - CARD_W, e.clientX - rect.left - dragOffset.current.dx))
    const y = Math.max(0, e.clientY - rect.top - dragOffset.current.dy)
    setPositions(p => ({ ...p, [dragCard]: { x, y } }))
    setDragCard(null)
  }

  // ---------- کشیدن ستون روی ستون ----------
  const onColumnDrop = (targetDs: string, targetFieldId: string, e: React.DragEvent) => {
    e.stopPropagation()
    const raw = e.dataTransfer.getData('application/x-column')
    if (!raw) return
    const src = JSON.parse(raw) as { dsId: string; fieldId: string }
    if (src.dsId === targetDs) {
      toast({ title: 'اتصال جدول به خودش ممکن نیست' })
      return
    }
    const fromDs = src.dsId
    const pair = { fromFieldId: src.fieldId, toFieldId: targetFieldId }
    setDraft(prev => {
      if (prev && prev.fromDs === fromDs && prev.toDs === targetDs) {
        return { ...prev, pairs: [...prev.pairs.filter(p => p.toFieldId !== pair.toFieldId), pair] }
      }
      const fromName = dsById.get(fromDs)?.name ?? ''
      const toName = dsById.get(targetDs)?.name ?? ''
      return { fromDs, toDs: targetDs, pairs: [pair], joinType: 'left', name: `${fromName} ← ${toName}` }
    })
    setCheck(null)
    setPreAgg(false)
  }

  // ---------- اجرای کنترل‌های پیش از اتصال (۱۶.۳) ----------
  const runCheck = async () => {
    if (!draft) return
    setChecking(true)
    try {
      const res = await api.post<{ check: JoinCheckResult }>('/api/relations/check', {
        fromDatasetId: draft.fromDs,
        toDatasetId: draft.toDs,
        columnPairs: draft.pairs,
        joinType: draft.joinType,
        preAggregate: preAgg,
      })
      setCheck(res.check)
    } catch (e) {
      toast({ title: 'خطا در کنترل اتصال', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setChecking(false)
    }
  }

  // ---------- ثبت رابطه ----------
  const saveRelation = async () => {
    if (!draft) return
    setSavingRel(true)
    try {
      const res = await api.post<{ blocked?: boolean; check?: JoinCheckResult; message?: string; graphIssues?: { message: string }[] }>('/api/relations', {
        projectId,
        fromDatasetId: draft.fromDs,
        toDatasetId: draft.toDs,
        columnPairs: draft.pairs,
        joinType: draft.joinType,
        name: draft.name,
        preAggregate: preAgg,
      })
      if (res.blocked) {
        setCheck(res.check ?? null)
        toast({ title: 'اتصال مسدود شد', description: res.message, variant: 'destructive' })
        return
      }
      toast({
        title: 'رابطه ثبت شد',
        description: `درصد تطبیق ${((res.check?.matchPercent ?? 0).toLocaleString('fa-IR'))}٪ — ${res.graphIssues?.length ? 'هشدار گراف روابط را ببینید' : 'بدون مشکل حلقه/ابهام'}`,
      })
      setDraft(null)
      setCheck(null)
      await load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSavingRel(false)
    }
  }

  const deleteRelation = async (id: string) => {
    try {
      await api.del(`/api/relations/${id}`)
      setPathRelIds(p => p.filter(x => x !== id))
      await load()
      toast({ title: 'رابطه حذف شد' })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const applySuggestion = async (s: SuggestionDTO, accept: boolean) => {
    if (accept) {
      setDraft({ fromDs: s.fromDatasetId, toDs: s.toDatasetId, pairs: s.pairs, joinType: 'left', name: `${s.fromDatasetName} ← ${s.toDatasetName}` })
      setCheck(null)
    } else {
      try {
        await api.post('/api/relations', {
          projectId, fromDatasetId: s.fromDatasetId, toDatasetId: s.toDatasetId,
          columnPairs: s.pairs, joinType: 'left', name: `${s.fromDatasetName} ← ${s.toDatasetName}`,
        })
        toast({ title: 'برای رد پیشنهاد، رابطه ساخته نشد', description: 'پیشنهاد از فهرست پیشنهادها حذف نمی‌شود؛ می‌توانید آن را نادیده بگیرید.' })
      } catch { /* noop */ }
      setSuggestions(prev => prev.filter(x => !(x.fromDatasetId === s.fromDatasetId && x.toDatasetId === s.toDatasetId)))
    }
  }

  // ---------- پرس‌وجوی اتصالی ----------
  const runJq = async () => {
    if (!rootId) {
      toast({ title: 'جدول پایه را انتخاب کنید', variant: 'destructive' })
      return
    }
    setJqBusy(true)
    setJqError('')
    try {
      const res = await api.post<typeof jqResult & { fields: JqField[]; scannedRecords: number }>('/api/relations/query', {
        rootDatasetId: rootId,
        relationIds: pathRelIds,
        preAggregate: jqPreAgg,
        spec: {
          dimensions: jqDim ? [jqDim] : [],
          measures: jqMeasures.length > 0 ? jqMeasures : [{ agg: 'count' }],
          limit: 50,
        },
      })
      setJqResult(res)
      if (res.fields?.length) setJqFields(res.fields)
    } catch (e) {
      setJqResult(null)
      setJqError(e instanceof Error ? e.message : 'خطا در اجرای پرس‌وجو')
    } finally {
      setJqBusy(false)
    }
  }

  const activeRels = rels.filter(r => r.status === 'active')

  // نقاط اتصال خطوط روی بوم
  const anchors = (r: RelationDTO) => {
    const a = positions[r.fromDatasetId]
    const b = positions[r.toDatasetId]
    if (!a || !b) return null
    const ay = a.y + 34
    const by = b.y + 34
    if (a.x + CARD_W <= b.x + 4) return { x1: a.x + CARD_W, y1: ay, x2: b.x, y2: by, label: (a.x + CARD_W + b.x) / 2, labelY: (ay + by) / 2 }
    if (b.x + CARD_W <= a.x + 4) return { x1: a.x, y1: ay, x2: b.x + CARD_W, y2: by, label: (a.x + b.x + CARD_W) / 2, labelY: (ay + by) / 2 }
    return { x1: a.x + CARD_W / 2, y1: a.y, x2: b.x + CARD_W / 2, y2: b.y, label: (a.x + b.x) / 2 + CARD_W / 2, labelY: Math.min(a.y, b.y) - 6 }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* بوم اتصال */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Network className="size-4 text-primary" /> بوم مدل‌سازی رابطه‌ها</CardTitle>
            <CardDescription>
              ستون یک جدول را روی ستون جدول دیگر بکشید تا رابطه ساخته شود؛ کلید مرکب = کشیدن چند ستون هنگام باز بودن پنل رابطه
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasRef}
              onDragOver={e => e.preventDefault()}
              onDrop={onCanvasDrop}
              className="relative h-[480px] rounded-lg border border-dashed bg-[radial-gradient(circle,_hsl(var(--border))_1px,_transparent_1px)] [background-size:18px_18px] overflow-hidden"
            >
              <svg className="absolute inset-0 size-full pointer-events-none">
                {activeRels.map(r => {
                  const a = anchors(r)
                  if (!a) return null
                  return (
                    <g key={r.id}>
                      <path
                        d={`M ${a.x1} ${a.y1} C ${(a.x1 + a.x2) / 2} ${a.y1}, ${(a.x1 + a.x2) / 2} ${a.y2}, ${a.x2} ${a.y2}`}
                        fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.65"
                      />
                      <circle cx={a.x1} cy={a.y1} r="4" fill="hsl(var(--primary))" />
                      <circle cx={a.x2} cy={a.y2} r="4" fill="hsl(var(--primary))" />
                      <text x={a.label} y={a.labelY} textAnchor="middle" className="fill-primary text-[10px] font-medium" direction="rtl">
                        {JOIN_TYPE_LABELS[r.joinType as keyof typeof JOIN_TYPE_LABELS]?.split(' ')[0] ?? r.joinType}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {datasets.map(ds => {
                const pos = positions[ds.id] ?? { x: 0, y: 0 }
                const fields = fieldsOf(ds.id)
                return (
                  <div
                    key={ds.id}
                    className="absolute rounded-xl border bg-card shadow-sm w-52 select-none"
                    style={{ left: pos.x, top: pos.y }}
                  >
                    <div
                      draggable={canEdit}
                      onDragStart={e => {
                        const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                        dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
                        setDragCard(ds.id)
                      }}
                      onDragEnd={() => setDragCard(null)}
                      className="flex items-center gap-1.5 px-2.5 py-2 border-b bg-muted/50 rounded-t-xl cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold truncate">{ds.name}</p>
                        <p className="text-[9px] text-muted-foreground">{formatNumber(ds.rowCount)} رکورد</p>
                      </div>
                    </div>
                    <ScrollArea className="h-[136px]">
                      <div className="py-1">
                        {fields.map(f => (
                          <div
                            key={f.id}
                            draggable={canEdit}
                            onDragStart={e => {
                              e.dataTransfer.setData('application/x-column', JSON.stringify({ dsId: ds.id, fieldId: f.id }))
                            }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => onColumnDrop(ds.id, f.id, e)}
                            className="flex items-center justify-between gap-1 px-2 py-1 text-[10px] hover:bg-accent/60 cursor-grab active:cursor-grabbing"
                            title="این ستون را بکشید و روی ستون جدول دیگر رها کنید"
                          >
                            <span className="truncate">{f.label}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              {f.role === 'measure' && <span className="text-[8px] rounded bg-amber-100 text-amber-700 px-1">سنجه</span>}
                              {f.role === 'identifier' && <span className="text-[8px] rounded bg-teal-100 text-teal-700 px-1">کلید</span>}
                              <Badge variant="outline" className="text-[8px] px-1 h-4">{TYPE_FA[f.type] ?? f.type}</Badge>
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )
              })}

              {datasets.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  ابتدا در برگه «فایل‌ها و مجموعه‌داده» حداقل دو مجموعه‌داده بسازید.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ستون کنار: پیشنهادها، روابط، هشدارهای گراف */}
        <div className="space-y-4">
          {graphIssues.length > 0 && (
            <Alert className="border-amber-300 bg-amber-50">
              <ShieldAlert className="size-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 space-y-1">
                {graphIssues.map((g, i) => <p key={i}>{g.message}</p>)}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5"><Sparkles className="size-3.5 text-primary" /> روابط پیشنهادی سامانه</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.length === 0 && <p className="text-xs text-muted-foreground">پیشنهاد جدیدی نیست؛ بر اساس همخوانی نام ستون‌ها و سازگاری نوع داده پیشنهاد می‌شوند.</p>}
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-lg border p-2.5 space-y-1.5">
                  <p className="text-[11px] font-medium">{s.fromDatasetName} ← {s.toDatasetName}</p>
                  <p className="text-[10px] text-muted-foreground">{s.reason} | اطمینان {Math.round(s.score * 100).toLocaleString('fa-IR')}٪</p>
                  {canEdit && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => applySuggestion(s, true)}>
                        <CheckCircle2 className="size-3" /> بررسی و پذیرش
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => applySuggestion(s, false)}>نادیده بگیر</Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5"><Link2 className="size-3.5 text-primary" /> روابط ثبت‌شده ({activeRels.length.toLocaleString('fa-IR')})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rels.length === 0 && <p className="text-xs text-muted-foreground">هنوز رابطه‌ای ثبت نشده است.</p>}
              {rels.map(r => {
                const lc = r.lastCheck ? JSON.parse(r.lastCheck) as JoinCheckResult : null
                return (
                  <div key={r.id} className={`rounded-lg border p-2.5 space-y-1 ${r.status !== 'active' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] font-medium truncate">{r.name}</p>
                      {canEdit && (
                        <Button size="icon" variant="ghost" className="size-5" onClick={() => deleteRelation(r.id)} title="حذف رابطه">
                          <Unlink className="size-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[9px]">{CARDINALITY_LABELS[r.cardinality as keyof typeof CARDINALITY_LABELS] ?? r.cardinality}</Badge>
                      <Badge variant="outline" className="text-[9px]">{r.joinType}</Badge>
                      {r.filterDirection === 'both' && <Badge variant="outline" className="text-[9px]">فیلتر دوسویه</Badge>}
                      {lc && <Badge variant="outline" className="text-[9px]">تطبیق {lc.matchPercent.toLocaleString('fa-IR')}٪</Badge>}
                      {lc?.status === 'warning' && <Badge className="text-[9px] bg-amber-100 text-amber-800">هشدار</Badge>}
                      <Badge variant="outline" className="text-[9px]">{r.status === 'active' ? 'فعال' : r.status === 'rejected' ? 'ردشده' : 'پیشنهاد'}</Badge>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* پنل پیکربندی و کنترل رابطه */}
      <Sheet open={!!draft} onOpenChange={v => !v && setDraft(null)}>
        <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle className="text-sm flex items-center gap-2"><Workflow className="size-4 text-primary" /> پیکربندی رابطه و کنترل‌های پیش از اتصال</SheetTitle>
            <SheetDescription>
              {draft && `${dsById.get(draft.fromDs)?.name ?? ''} ← ${dsById.get(draft.toDs)?.name ?? ''}`} — کنترل‌های الزامی بخش ۱۶.۳ سند
            </SheetDescription>
          </SheetHeader>
          {draft && (
            <div className="space-y-4 px-4 pb-6">
              <div className="space-y-1.5">
                <Label className="text-xs">نام رابطه</Label>
                <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="h-8 text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">جفت‌ستون‌های کلید (کلید ساده یا مرکب)</Label>
                <div className="space-y-1.5">
                  {draft.pairs.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs rounded-lg border p-2">
                      <span className="flex-1 truncate">{fieldsOf(draft.fromDs).find(f => f.id === p.fromFieldId)?.label ?? p.fromFieldId}</span>
                      <Link2 className="size-3 text-primary shrink-0" />
                      <span className="flex-1 truncate">{fieldsOf(draft.toDs).find(f => f.id === p.toFieldId)?.label ?? p.toFieldId}</span>
                      <Button size="icon" variant="ghost" className="size-5" onClick={() => setDraft({ ...draft, pairs: draft.pairs.filter((_, j) => j !== i) })}>
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">برای کلید مرکب، ستون دیگری را از بوم بکشید و روی جدول دوم رها کنید.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع اتصال (۱۶.۲)</Label>
                  <Select value={draft.joinType} onValueChange={v => { setDraft({ ...draft, joinType: v }); setCheck(null) }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(JOIN_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">تجمیع پیش از اتصال (۱۶.۴)</Label>
                  <div className="flex items-center gap-2 h-8">
                    <Switch checked={preAgg} onCheckedChange={v => { setPreAgg(v); setCheck(null) }} />
                    <span className="text-[10px] text-muted-foreground">برای سنجه‌های سمت «چند»</span>
                  </div>
                </div>
              </div>

              <Button size="sm" className="gap-1.5" onClick={runCheck} disabled={checking || draft.pairs.length === 0}>
                {checking ? <Play className="size-3.5 animate-pulse" /> : <Play className="size-3.5" />} اجرای کنترل‌های الزامی و پیش‌نمایش
              </Button>

              {check && (
                <div className="space-y-3">
                  <div className={`rounded-lg border p-3 space-y-2 ${check.status === 'blocked' ? 'border-red-300 bg-red-50' : check.status === 'warning' ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      {check.status === 'blocked' ? <ShieldAlert className="size-3.5 text-red-600" /> : check.status === 'warning' ? <TriangleAlert className="size-3.5 text-amber-600" /> : <CheckCircle2 className="size-3.5 text-emerald-600" />}
                      {check.status === 'blocked' ? 'اتصال مسدود شد' : check.status === 'warning' ? 'اتصال با هشدار' : 'کنترل‌ها پاس شد'}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <span>نوع رابطه تشخیص‌شده: <b>{CARDINALITY_LABELS[check.cardinalityDetected]}</b></span>
                      <span>درصد تطبیق: <b>{check.matchPercent.toLocaleString('fa-IR')}٪</b></span>
                      <span>سطر قبل (اصلی/دوم): <b>{check.rowsBefore.left.toLocaleString('fa-IR')} / {check.rowsBefore.right.toLocaleString('fa-IR')}</b></span>
                      <span>سطر بعد از اتصال: <b>{check.rowsAfter.toLocaleString('fa-IR')}</b></span>
                      <span>کلید خالی (اصلی/دوم): <b>{check.leftNulls.toLocaleString('fa-IR')} / {check.rightNulls.toLocaleString('fa-IR')}</b></span>
                      <span>گروه‌های تکراری (اصلی/دوم): <b>{check.leftDupGroups.toLocaleString('fa-IR')} / {check.rightDupGroups.toLocaleString('fa-IR')}</b></span>
                      <span>بدون تطبیق (اصلی/دوم): <b>{check.leftUnmatched.toLocaleString('fa-IR')} / {check.rightUnmatched.toLocaleString('fa-IR')}</b></span>
                      <span>انفجار سطر: <b>{check.rowExplosion ? 'بله' : 'خیر'}</b></span>
                    </div>
                    {check.errors.length > 0 && (
                      <ul className="text-[10px] text-red-700 space-y-1">
                        {check.errors.map((er, i) => <li key={i}>• {er}</li>)}
                      </ul>
                    )}
                    {check.warnings.length > 0 && (
                      <ul className="text-[10px] text-amber-800 space-y-1">
                        {check.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    )}
                    {check.remedies && (
                      <div className="text-[10px] space-y-1 rounded-md bg-white/70 p-2">
                        <p className="font-semibold text-red-700">راهکارهای بخش ۱۶.۴ برای جلوگیری از چندبرابرشدن مبالغ:</p>
                        {check.remedies.map((rm, i) => <p key={i}>{i + 1}. {rm}</p>)}
                      </div>
                    )}
                  </div>

                  {check.sampleRows.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">پیش‌نمایش نتیجه اتصال (۲۵ سطر نخست)</Label>
                      <div className="rounded-lg border overflow-auto max-h-56">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              {check.sampleFields.slice(0, 10).map(f => (
                                <TableHead key={f.id} className="text-right text-[9px] whitespace-nowrap">{f.label}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {check.sampleRows.map((row, i) => (
                              <TableRow key={i}>
                                {check.sampleFields.slice(0, 10).map(f => (
                                  <TableCell key={f.id} className="text-[9px] whitespace-nowrap max-w-28 truncate">
                                    {row[f.id] === null || row[f.id] === undefined ? '—' : String(row[f.id])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {check.status !== 'blocked' && canEdit && (
                    <Button size="sm" className="w-full gap-1.5" onClick={saveRelation} disabled={savingRel}>
                      <Save className="size-3.5" /> ثبت رابطه در مدل
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* پرس‌وجوی تجمیعی روی مدل اتصالی */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Layers className="size-4 text-primary" /> گزارش از چند جدول متصل</CardTitle>
          <CardDescription>
            جدول پایه و مسیر روابط را انتخاب کنید؛ برای جلوگیری از چندبرابرشدن مبالغ، گزینه تجمیع پیش از اتصال فعال است (بخش ۱۶.۴ سند)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">جدول پایه</Label>
              <Select value={rootId} onValueChange={v => { setRootId(v); setJqFields([]); setJqResult(null) }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>
                  {datasets.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs">مسیر روابط (به ترتیب اعمال)</Label>
              <div className="flex flex-wrap items-center gap-1.5 min-h-8">
                {pathRelIds.length === 0 && <span className="text-[10px] text-muted-foreground">رابطه‌ای انتخاب نشده — فقط جدول پایه گزارش می‌شود</span>}
                {pathRelIds.map(id => (
                  <Badge key={id} variant="secondary" className="text-[10px] gap-1">
                    {rels.find(r => r.id === id)?.name ?? id}
                    <button onClick={() => setPathRelIds(p => p.filter(x => x !== id))}><X className="size-3" /></button>
                  </Badge>
                ))}
                <Select value="" onValueChange={v => setPathRelIds(p => [...p, v])}>
                  <SelectTrigger className="h-7 w-36 text-[11px]"><SelectValue placeholder="+ افزودن رابطه" /></SelectTrigger>
                  <SelectContent>
                    {activeRels.filter(r => !pathRelIds.includes(r.id)).map(r => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تجمیع پیش از اتصال</Label>
              <div className="flex items-center gap-2 h-8">
                <Switch checked={jqPreAgg} onCheckedChange={setJqPreAgg} />
                <span className="text-[10px] text-muted-foreground">پیشنهاد سامانه: فعال</span>
              </div>
            </div>
          </div>

          {jqFields.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">بُعد گروه‌بندی</Label>
                <Select value={jqDim} onValueChange={setJqDim}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="بدون گروه‌بندی" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {jqFields.filter(f => f.role !== 'measure').map(f => (
                      <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}{f.id.startsWith('j__') ? ' (جدول دوم)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {jqMeasures.map((m, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">سنجه {i + 1}</Label>
                    <button onClick={() => setJqMeasures(p => p.filter((_, j) => j !== i))}><X className="size-3" /></button>
                  </div>
                  <div className="flex gap-1.5">
                    <Select value={m.fieldId} onValueChange={v => setJqMeasures(p => p.map((x, j) => j === i ? { ...x, fieldId: v } : x))}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="ستون" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {jqFields.filter(f => f.role === 'measure' || ['amount', 'integer', 'decimal', 'percent'].includes(f.type)).map(f => (
                          <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}{f.id.startsWith('j__') ? ' (جدول دوم)' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={m.agg} onValueChange={v => setJqMeasures(p => p.map((x, j) => j === i ? { ...x, agg: v } : x))}>
                      <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum" className="text-xs">جمع</SelectItem>
                        <SelectItem value="count" className="text-xs">تعداد</SelectItem>
                        <SelectItem value="countDistinct" className="text-xs">متمایز</SelectItem>
                        <SelectItem value="avg" className="text-xs">میانگین</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              {jqMeasures.length < 2 && (
                <div className="flex items-end">
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => setJqMeasures(p => [...p, { fieldId: '', agg: 'sum' }])}>
                    <Plus className="size-3" /> افزودن سنجه
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={runJq} disabled={jqBusy || !rootId}>
              {jqBusy ? <Play className="size-3.5 animate-pulse" /> : <Play className="size-3.5" />} اجرا
            </Button>
            {jqFields.length > 0 && <span className="text-[10px] text-muted-foreground">فهرست ستون‌ها از مدل اتصالی بارگذاری شد؛ بُعد و سنجه را انتخاب و دوباره اجرا کنید.</span>}
          </div>

          {jqError && (
            <Alert variant="destructive">
              <ShieldAlert className="size-4" />
              <AlertDescription className="text-xs">{jqError}</AlertDescription>
            </Alert>
          )}

          {jqResult && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {jqResult.path.map((p, i) => <Badge key={i} variant="outline" className="text-[10px]">{i === 0 ? 'پایه: ' : '+ '}{p}</Badge>)}
              </div>
              {jqResult.graphIssues?.length > 0 && (
                <Alert className="border-amber-300 bg-amber-50">
                  <TriangleAlert className="size-4 text-amber-600" />
                  <AlertDescription className="text-[10px] text-amber-800">
                    {jqResult.graphIssues.map((g, i) => <p key={i}>{g.message}</p>)}
                  </AlertDescription>
                </Alert>
              )}
              {jqResult.warnings.length > 0 && (
                <Alert className="border-amber-300 bg-amber-50">
                  <TriangleAlert className="size-4 text-amber-600" />
                  <AlertDescription className="text-[10px] text-amber-800 space-y-1">
                    {jqResult.warnings.map((w, i) => <p key={i}>• {w}</p>)}
                  </AlertDescription>
                </Alert>
              )}
              <div className="rounded-lg border overflow-auto max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      {jqResult.rows[0] && Object.keys(jqResult.rows[0]).filter(k => !k.startsWith('__label')).map(k => (
                        <TableHead key={k} className="text-right text-[10px] whitespace-nowrap">{jqFields.find(f => f.id === k)?.label ?? k}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jqResult.rows.map((row, i) => (
                      <TableRow key={i}>
                        {Object.keys(row).filter(k => !k.startsWith('__label')).map(k => (
                          <TableCell key={k} className="text-[10px] whitespace-nowrap">
                            {typeof row[k] === 'number' ? formatNumber(Math.round((row[k] as number) * 100) / 100) : String(row[k] ?? '—')}
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
