'use client'

// زنگ اعلان‌ها — بخش ۲۶.۲ سند (هشدار و اعلان)
// شمارش نخوانده‌ها، فهرست اعلان‌ها با شدت، علامت‌گذاری خواندن و خواندن همه
// بررسی دوره‌ای هر ۴۵ ثانیه

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, BellRing, CheckCheck, AlertTriangle, Info, OctagonAlert, Database } from 'lucide-react'

interface NotificationItem {
  id: string
  type: string
  severity: string
  title: string
  message: string
  read: boolean
  value?: number | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  threshold: 'عبور از آستانه',
  quality: 'کیفیت داده',
  fileDelay: 'تأخیر فایل',
  processFailure: 'شکست پردازش',
  structureChange: 'تغییر ساختار',
  missingPeriod: 'نبود داده دوره',
  info: 'اطلاع',
}

const SEVERITY_STYLE: Record<string, { cls: string; icon: React.ReactNode }> = {
  critical: { cls: 'text-red-600 bg-red-50 border-red-200', icon: <OctagonAlert className="size-4 shrink-0" /> },
  warning: { cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: <AlertTriangle className="size-4 shrink-0" /> },
  info: { cls: 'text-sky-700 bg-sky-50 border-sky-200', icon: <Info className="size-4 shrink-0" /> },
}

function timeAgoFa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'همین حالا'
  if (m < 60) return `${m.toLocaleString('fa-IR')} دقیقه پیش`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h.toLocaleString('fa-IR')} ساعت پیش`
  return `${Math.floor(h / 24).toLocaleString('fa-IR')} روز پیش`
}

export default function NotificationBell({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: NotificationItem[]; unreadCount: number }>(`/api/notifications?projectId=${projectId}&limit=50`)
      setItems(res.items)
      setUnread(res.unreadCount)
      setLoaded(true)
    } catch { /* بی‌صدا */ }
  }, [projectId])

  useEffect(() => {
    load()
    timer.current = setInterval(load, 45_000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [load])

  const markRead = async (n: NotificationItem) => {
    if (n.read) return
    try {
      await api.patch(`/api/notifications/${n.id}`, {})
      setItems(prev => prev.map(i => (i.id === n.id ? { ...i, read: true } : i)))
      setUnread(u => Math.max(0, u - 1))
    } catch { /* بی‌صدا */ }
  }

  const markAll = async () => {
    try {
      await api.post('/api/notifications', { projectId, action: 'read-all' })
      setItems(prev => prev.map(i => ({ ...i, read: true })))
      setUnread(0)
    } catch { /* بی‌صدا */ }
  }

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (o) load() }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-1.5 text-xs" aria-label="اعلان‌ها">
          {unread > 0 ? <BellRing className="size-4 text-amber-600" /> : <Bell className="size-4" />}
          اعلان‌ها
          {unread > 0 && (
            <Badge className="absolute -top-2 -left-2 h-5 min-w-5 px-1 text-[10px] bg-red-600 hover:bg-red-600">
              {unread.toLocaleString('fa-IR')}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[26rem] p-0" dir="rtl" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold flex items-center gap-1.5"><Bell className="size-4" /> اعلان‌ها (بخش ۲۶.۲)</p>
          <Button variant="ghost" size="sm" className="gap-1 text-[11px]" onClick={markAll} disabled={unread === 0}>
            <CheckCheck className="size-3.5" /> خواندن همه
          </Button>
        </div>
        <ScrollArea className="h-80">
          {!loaded ? (
            <p className="text-xs text-muted-foreground text-center py-8">در حال دریافت…</p>
          ) : items.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Bell className="size-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">اعلانی وجود ندارد — همه‌چیز مرتب است.</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map(n => {
                const sev = SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.warning
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={`w-full text-right px-3 py-2.5 flex gap-2 items-start transition-colors hover:bg-muted/50 ${n.read ? 'opacity-60' : sev.cls}`}
                  >
                    <span className="mt-0.5">{sev.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{n.title}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{TYPE_LABELS[n.type] ?? n.type}</Badge>
                        {!n.read && <span className="size-1.5 rounded-full bg-red-500 inline-block" aria-label="نخوانده" />}
                      </span>
                      <span className="block text-[11px] leading-5 text-muted-foreground mt-0.5">{n.message}</span>
                      <span className="block text-[10px] text-muted-foreground/70 mt-0.5">{timeAgoFa(n.createdAt)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
        <div className="px-3 py-2 border-t text-[10px] text-muted-foreground flex items-center gap-1">
          <Database className="size-3" /> اعلان‌های درون‌برنامه‌ای — خواندن با کلیک روی هر ردیف
        </div>
      </PopoverContent>
    </Popover>
  )
}
