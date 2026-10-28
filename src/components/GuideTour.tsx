'use client'

// تور راهنمای تعاملی — ترسیم فرایند ۶ مرحله‌ای ساخت گزارش تا هر کاربری بتواند با سامانه کار کند
// باز شدن خودکار در نخستین انتخاب پروژه (localStorage) و دکمه «راهنما» در سربرگ

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Database, Columns3, Gauge, Wand2, Boxes, BarChart3, BellRing, Compass,
  ChevronRight, ChevronLeft, Sparkles, ArrowLeft, PartyPopper,
} from 'lucide-react'

interface TourStep {
  icon: React.ReactNode
  title: string
  desc: string
  tab?: string
  cta?: string
  tint: string // کلاس رنگ چیپ آیکون
}

const STEPS: TourStep[] = [
  {
    icon: <Compass className="size-7" />,
    tint: 'bg-primary text-primary-foreground',
    title: 'به سکوی هوشمند گزارش‌ساز خوش آمدید',
    desc: 'مسیر کار ۶ گام دارد: بارگذاری داده، تنظیم ستون‌ها، بررسی کیفیت، پاک‌سازی، مدل‌سازی و در پایان ساخت گزارش. این تور کوتاه هر گام را نشان می‌دهد؛ می‌توانید در هر لحظه از دکمه «راهنما» در سربرگ دوباره آن را باز کنید.',
  },
  {
    icon: <Database className="size-7" />,
    tint: 'bg-emerald-600 text-white',
    title: 'گام ۱ — بارگذاری داده',
    desc: 'در تب «فایل‌ها و مجموعه‌داده» فایل اکسل یا CSV خود را بکشید و رها کنید یا انتخاب کنید. سامانه شیت‌ها، سطر عنوان و بازه داده را خودکار تشخیص می‌دهد؛ پس از تأیید پیش‌نمایش، برای مجموعه‌داده نام بگذارید و «ایجاد» بزنید.',
    tab: 'data',
    cta: 'رفتن به بارگذاری داده',
  },
  {
    icon: <Columns3 className="size-7" />,
    tint: 'bg-teal-600 text-white',
    title: 'گام ۲ — تنظیم ستون‌ها',
    desc: 'برای هر ستون نوع داده (عدد، متن، تاریخ)، نقش (بُعد یا سنجه) و برچسب فارسی پیشنهاد می‌شود. پیشنهادها را بازبینی کنید و در صورت نیاز اصلاح کنید — مبنای همه محاسبات بعدی همین‌جاست.',
    tab: 'columns',
    cta: 'رفتن به ستون‌ها',
  },
  {
    icon: <Gauge className="size-7" />,
    tint: 'bg-cyan-700 text-white',
    title: 'گام ۳ — بررسی کیفیت داده',
    desc: 'در «پروفایل و کیفیت» وضعیت هر ستون را ببینید: مقدارهای خالی، مقادیر تکراری، کمینه/بیشینه، پرت‌ها و نمره کیفیت. اگر ستونی مشکل دارد، به پاک‌سازی بروید.',
    tab: 'profile',
    cta: 'رفتن به پروفایل',
  },
  {
    icon: <Wand2 className="size-7" />,
    tint: 'bg-violet-600 text-white',
    title: 'گام ۴ — پاک‌سازی و تبدیل',
    desc: 'تب «پاک‌سازی» ابزارهای تبدیل را دارد: حذف تکراری‌ها، پر کردن خالی‌ها، نرمال‌سازی متن و اعداد، تبدیل ارز و تاریخ، Unpivot/Pivot. هر تبدیل در «دفترچه مراحل» ثبت می‌شود و قابل بازگشت است.',
    tab: 'cleaning',
    cta: 'رفتن به پاک‌سازی',
  },
  {
    icon: <Boxes className="size-7" />,
    tint: 'bg-orange-600 text-white',
    title: 'گام ۵ — مدل و شاخص‌ها',
    desc: 'در تب «مدل» سطح جزئیات (grain) را تعیین کنید، ابعاد را از سنجه‌ها جدا کنید و در صورت نیاز سنجه محاسباتی بسازید. مدل صحیح یعنی اعداد گزارش‌ها همیشه درست و بدون تکرار مبالغ.',
    tab: 'model',
    cta: 'رفتن به مدل',
  },
  {
    icon: <BarChart3 className="size-7" />,
    tint: 'bg-amber-600 text-white',
    title: 'گام ۶ — ساخت گزارش',
    desc: 'در «گزارش‌ساز» پنج حرکت کافی است: ۱) انتخاب مجموعه‌داده ۲) انتخاب نوع نمایش (جدول، نمودار، کارت شاخص و…) ۳) انتخاب ابعاد و سنجه‌ها و فیلترها ۴) دکمه «اجرای گزارش» ۵) ذخیره، انتشار و خروجی. بالای همین تب، نوار گام‌به‌گام راهنما را می‌بینید.',
    tab: 'reports',
    cta: 'رفتن به گزارش‌ساز',
  },
  {
    icon: <BellRing className="size-7" />,
    tint: 'bg-rose-600 text-white',
    title: 'گام تکمیلی — پایش و به‌اشتراک‌گذاری',
    desc: 'هشدارها عبور شاخص از آستانه را اطلاع می‌دهند، «پردازش‌ها» خروجی‌های حجیم را پس‌زمینه می‌سازند و گردش کار تأیید، انتشار گزارش را کنترل می‌کند. تمام شد — از داده خام تا گزارش منتشرشده!',
    tab: 'alerts',
    cta: 'رفتن به هشدارها',
  },
]

export function GuideTour({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onNavigate: (tab: string) => void
}) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  const close = () => onOpenChange(false)
  const go = () => {
    if (step.tab) onNavigate(step.tab)
    close()
  }
  const next = () => (last ? close() : setI(v => Math.min(v + 1, STEPS.length - 1)))

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setI(0); onOpenChange(false) } }}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" dir="rtl">
        {/* سربرگ گرادیانی */}
        <div className="section-gradient border-b px-6 pt-6 pb-5 text-center">
          <div className={`mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl shadow-lg ${step.tint}`}>
            {step.icon}
          </div>
          <DialogHeader className="space-y-1.5 text-center">
            <DialogTitle className="text-base">{step.title}</DialogTitle>
            <DialogDescription className="text-xs leading-6 text-muted-foreground">
              {step.desc}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* نشانگر پیشرفت */}
        <div className="flex items-center justify-center gap-1.5 border-b bg-muted/40 px-6 py-2.5">
          {STEPS.map((_, d) => (
            <button
              key={d}
              aria-label={`گام ${d + 1}`}
              onClick={() => setI(d)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${d === i ? 'w-6 bg-primary' : d < i ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-border'}`}
            />
          ))}
        </div>

        {/* دکمه‌ها */}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" className="gap-1 text-xs" disabled={i === 0} onClick={() => setI(v => v - 1)}>
            <ChevronRight className="size-3.5" /> قبلی
          </Button>
          <div className="flex items-center gap-2">
            {step.tab ? (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10" onClick={go}>
                <ArrowLeft className="size-3.5" /> {step.cta}
              </Button>
            ) : null}
            <Button size="sm" className="gap-1.5 text-xs" onClick={next}>
              {last ? (<><PartyPopper className="size-3.5" /> شروع به کار</>) : (<>بعدی <ChevronLeft className="size-3.5" /></>)}
            </Button>
          </div>
        </div>

        {/* نشان تکمیل مسیر */}
        {last ? (
          <div className="flex items-center justify-center gap-1.5 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            <Sparkles className="size-3 text-primary" /> مسیر کامل شد — سؤالی بود، دکمه «راهنما» بالای صفحه همیشه همراه شماست
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export const TOUR_SEEN_KEY = 'guide-tour-seen-v1'
