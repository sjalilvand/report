'use client'

// سکوی هوشمند آماده‌سازی داده، مدل‌سازی و گزارش‌سازی
// پوسته برنامه: سایدبار راست‌به‌چپ گروه‌بندی‌شده + مسیر ۶ مرحله‌ای + راهنمای هر بخش + تور راهنما

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Tip } from '@/components/HelpTip'
import { GuideCard, GuideStep } from '@/components/GuideCard'
import { GuideTour, TOUR_SEEN_KEY } from '@/components/GuideTour'
import ProjectsView from '@/components/ProjectsView'
import DataView from '@/components/DataView'
import UpsertView from '@/components/UpsertView'
import ColumnsEditor, { FieldMetaClient } from '@/components/ColumnsEditor'
import ProfileView from '@/components/ProfileView'
import CleaningView from '@/components/CleaningView'
import ModelView from '@/components/ModelView'
import AnalyticsView from '@/components/AnalyticsView'
import ReportBuilder from '@/components/ReportBuilder'
import ReportWorkflow, { WorkflowUser } from '@/components/ReportWorkflow'
import RelationsView from '@/components/RelationsView'
import DataDictionaryView from '@/components/DataDictionaryView'
import AlertsView from '@/components/AlertsView'
import OccasionsView from '@/components/OccasionsView'
import AiAssistantView from '@/components/AiAssistantView'
import EngineView from '@/components/EngineView'
import ConnectionsView from '@/components/ConnectionsView'
import JobsView from '@/components/JobsView'
import AccountSecurity from '@/components/AccountSecurity'
import NotificationBell from '@/components/NotificationBell'
import AdminView from '@/components/AdminView'
import LoginView, { AppUser } from '@/components/LoginView'
import { TransformStep } from '@/lib/types'
import {
  Database, Columns3, Gauge, Wand2, Boxes, BarChart3,
  ScrollText, ArrowRight, Sparkles, FileCheck2, Network, ShieldCheck, LogOut, BookMarked,
  BellRing, CalendarDays, PlugZap, ListTodo, TrendingUp, DatabaseZap,
  Menu, Compass, Lock, ChevronLeft, Route, ArrowLeft, type LucideIcon,
} from 'lucide-react'

interface Project { id: string; name: string; description?: string | null; owner?: string | null; domain?: string | null }
interface DatasetRow {
  id: string
  name: string
  sheetName: string
  rowCount: number
  version: number
  status: string
  grain?: string | null
  fields: string
  transforms?: string
}
interface DatasetDetail extends Omit<DatasetRow, 'fields' | 'transforms'> {
  projectId: string
  config: Record<string, unknown>
  file: { id: string; name: string; size: number; fingerprint: string } | null // منابع خارجی (بخش ۳۱) فایل ندارند
  sample: Record<string, unknown>[]
  fields: FieldMetaClient[] // API جزئیات، فیلدها را پارس‌شده برمی‌گرداند
  transforms: TransformStep[]
}

type TabKey = 'projects' | 'data' | 'columns' | 'profile' | 'cleaning' | 'model' | 'analytics' | 'engine' | 'assistant' | 'relations' | 'dictionary' | 'occasions' | 'connections' | 'reports' | 'jobs' | 'alerts' | 'admin'

const fa = (n: number) => n.toLocaleString('fa-IR', { useGrouping: false })

// ── تعریف ناوبری: مسیر ۶ مرحله‌ای + گروه‌های تکمیلی ──
// lock: شرط فعال شدن تب — dataset: نیاز به مجموعه‌داده فعال | two: نیاز به دو مجموعه‌داده
interface NavItem {
  key: TabKey
  label: string
  icon: LucideIcon
  tip: string
  chip: string
  step?: number
  lock?: 'dataset' | 'two'
}

const PROCESS_STEPS: NavItem[] = [
  {
    key: 'data', label: 'فایل‌ها و مجموعه‌داده', icon: Database, step: 1,
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    tip: 'شروع مسیر: بارگذاری فایل اکسل/CSV و ساخت مجموعه‌داده نسخه‌دار (بخش‌های ۶ تا ۸ سند)',
  },
  {
    key: 'columns', label: 'ستون‌ها', icon: Columns3, step: 2, lock: 'dataset',
    chip: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300',
    tip: 'بازبینی نوع داده، نقش بُعد/سنجه، کلید یکتا و برچسب فارسی هر ستون (بخش ۴ سند)',
  },
  {
    key: 'profile', label: 'پروفایل و کیفیت', icon: Gauge, step: 3, lock: 'dataset',
    chip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
    tip: 'شناسنامه داده: خالی‌ها، متمایزها، کمینه/بیشینه، پرت‌ها و نمره کیفیت (بخش ۹ سند)',
  },
  {
    key: 'cleaning', label: 'پاک‌سازی و تبدیل', icon: Wand2, step: 4, lock: 'dataset',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
    tip: 'ابزارهای پاک‌سازی متنی/عددی/تاریخی و تبدیل‌های ساختاری با دفترچه مراحل قابل ردیابی (بخش ۱۰ سند)',
  },
  {
    key: 'model', label: 'مدل و شاخص‌ها', icon: Boxes, step: 5, lock: 'dataset',
    chip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
    tip: 'سطح جزئیات، آزمون یکتایی، تفکیک ابعاد از سنجه‌ها و فرمول‌نویسی امن (بخش‌های ۱۱ تا ۱۳ سند)',
  },
  {
    key: 'reports', label: 'گزارش‌ساز', icon: BarChart3, step: 6, lock: 'dataset',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    tip: 'پایان مسیر: طراحی گزارش و داشبورد بدون کدنویسی، فیلتر، انتشار و خروجی (بخش‌های ۱۹ تا ۲۳ سند)',
  },
]

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'تحلیل و هوشمند',
    items: [
      {
        key: 'analytics', label: 'تحلیل پیشرفته', icon: TrendingUp, lock: 'dataset',
        chip: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/60 dark:text-fuchsia-300',
        tip: 'روند و پیش‌بینی سری زمانی، Cohort و RFM، سناریوسازی What-if، همبستگی و ناهنجاری (بخش ۲۱.۲ سند)',
      },
      {
        key: 'engine', label: 'موتور تحلیلی', icon: DatabaseZap, lock: 'dataset',
        chip: 'bg-lime-100 text-lime-800 dark:bg-lime-900/60 dark:text-lime-300',
        tip: 'فایل آماده‌شده Parquet و کنسول SQL فقط‌خواندنی با موتور DuckDB — برای تحلیل داده حجیم (بخش ۲۷.۲ سند)',
      },
      {
        key: 'assistant', label: 'دستیار هوشمند', icon: Sparkles, lock: 'dataset',
        chip: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300',
        tip: 'پیشنهاد خودکار پیکربندی، پرسش به زبان طبیعی از داده و توضیح فرمول/خطا (بخش ۲۵ سند)',
      },
    ],
  },
  {
    title: 'ساختار و منابع',
    items: [
      {
        key: 'relations', label: 'روابط جداول', icon: Network, lock: 'two',
        chip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
        tip: 'اتصال بصری جداول با کنترل‌های الزامی برای جلوگیری از چندبرابرشدن مبالغ (بخش ۱۶ سند)',
      },
      {
        key: 'dictionary', label: 'فرهنگ داده', icon: BookMarked,
        chip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
        tip: 'تعریف یکتای شاخص‌های سازمانی با فرمول، منبع و مالک؛ تأییدشده‌ها همه‌جا یکسان (بخش ۱۸ سند)',
      },
      {
        key: 'connections', label: 'منابع داده خارجی', icon: PlugZap,
        chip: 'bg-lime-100 text-lime-800 dark:bg-lime-900/60 dark:text-lime-300',
        tip: 'اتصال به API و پایگاه‌داده PostgreSQL/MySQL با همگام‌سازی نسخه‌دار (بخش ۳۱ سند)',
      },
      {
        key: 'occasions', label: 'مناسبت‌ها', icon: CalendarDays,
        chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
        tip: 'تقویم مرجع مناسبت‌ها برای تفسیر درست جهش‌های زمانی در گزارش‌ها (بخش ۱۵.۴ سند)',
      },
    ],
  },
  {
    title: 'پایش و عملیات',
    items: [
      {
        key: 'jobs', label: 'پردازش‌ها', icon: ListTodo,
        chip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
        tip: 'صف خروجی حجیم: تولید پس‌زمینه با پیشرفت، تلاش مجدد امن و لینک دانلود موقت (بخش ۳۰.۲ سند)',
      },
      {
        key: 'alerts', label: 'هشدارها', icon: BellRing,
        chip: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
        tip: 'پایش خودکار آستانه شاخص، افت کیفیت، تأخیر فایل و شکست پردازش با اعلان (بخش ۲۶.۲ سند)',
      },
    ],
  },
  {
    title: 'سامانه',
    items: [
      {
        key: 'admin', label: 'مدیریت و امنیت', icon: ShieldCheck,
        chip: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
        tip: 'کاربران و نقش‌ها، دسترسی سطری، SSO/SAML و MFA، ظرفیت‌ها و حسابرسی (بخش‌های ۲۸ تا ۳۱ سند)',
      },
    ],
  },
]

// ── راهنمای هر بخش — با انتخاب تب نمایش داده می‌شود (کارت «گام به گام») ──
const SECTION_GUIDES: Partial<Record<TabKey, { steps: GuideStep[]; tip?: string }>> = {
  data: {
    steps: [
      { title: 'بارگذاری فایل', desc: 'فایل اکسل یا CSV را در کادر بارگذاری بکشید یا با دکمه «انتخاب فایل» انتخاب کنید.' },
      { title: 'بازبینی تشخیص خودکار', desc: 'شیت، سطر عنوان و بازه ردیف‌های داده پیشنهاد می‌شود و قابل اصلاح است.' },
      { title: 'تأیید پیش‌نمایش و نام‌گذاری', desc: 'پس از دیدن پیش‌نمایش، برای مجموعه‌داده نام فارسی خوانا بگذارید و «ایجاد» بزنید.' },
      { title: 'انتخاب نسخه فعال', desc: 'از فهرست «مجموعه‌داده‌های پروژه» روی کارت موردنظر بزنید تا بقیه مراحل فعال شوند.' },
    ],
    tip: 'بارگذاری مجدد همان فایل نسخه جدید می‌سازد (بخش ۲۴ سند) و نسخه قبلی حفظ می‌شود؛ پس بدون نگرانی فایل را به‌روزرسانی کنید.',
  },
  columns: {
    steps: [
      { title: 'بازبینی نوع داده', desc: 'برای هر ستون نوع (عدد، متن، تاریخ، بولی) پیشنهاد شده؛ اگر اشتباه است اصلاح کنید.' },
      { title: 'تعیین نقش', desc: 'ستون‌های گروه‌بندی «بُعد» و ستون‌های محاسباتی «سنجه» هستند.' },
      { title: 'تعیین کلید یکتا', desc: 'برای ستون شناسه، گزینه یکتایی را فعال کنید تا در آزمون مدل استفاده شود.' },
      { title: 'برچسب خوانا', desc: 'برچسب فارسی هر ستون در گزارش‌ها و خروجی‌ها نمایش داده می‌شود.' },
    ],
    tip: 'نوع اشتباه یعنی محاسبه غلط؛ اگر مبلغ به‌جای «عدد»، «متن» تشخیص داده شده حتماً اصلاح کنید.',
  },
  profile: {
    steps: [
      { title: 'نگاه کلی', desc: 'نمره کیفیت کل و تعداد رکوردهای کامل/ناقص را ببینید.' },
      { title: 'شناسایی مشکل', desc: 'ستون‌های با درصد خالی بالا، مقادیر خارج از الگو یا پرت‌ها را پیدا کنید.' },
      { title: 'بررسی جزئیات', desc: 'روی هر ستون باز کنید: کمینه/بیشینه، میانگین/میانه، پرتکرارها و توزیع نوع.' },
      { title: 'اقدام', desc: 'برای رفع مشکل‌ها به تب «پاک‌سازی و تبدیل» بروید.' },
    ],
    tip: 'نمره کیفیت پس از هر پاک‌سازی به‌روز می‌شود؛ پیش از مدل‌سازی، کیفیت را به وضعیت قابل قبول برسانید.',
  },
  cleaning: {
    steps: [
      { title: 'انتخاب تبدیل', desc: 'از پنل «تبدیل جدید» نوع عملیات را انتخاب کنید: متنی، عددی، تاریخ، ارز یا ساختاری (Unpivot/Pivot).' },
      { title: 'پیکربندی', desc: 'ستون‌ها و پارامترهای عملیات را تعیین کنید.' },
      { title: 'اجرا', desc: 'دکمه اجرا نسخه جدیدی از داده می‌سازد؛ داده اصلی دست‌نخورده می‌ماند.' },
      { title: 'دفترچه مراحل', desc: 'ترتیب و جزئیات همه تبدیل‌ها قابل ردیابی است (بخش ۱۰.۳ سند).' },
    ],
    tip: 'ترتیب تبدیل‌ها مهم است؛ دفترچه مراحل را پیش از اجرای عملیات سنگین بازبینی کنید.',
  },
  model: {
    steps: [
      { title: 'تعیین سطح جزئیات (grain)', desc: 'مشخص کنید هر سطر چه چیزی را توصیف می‌کند — مثلاً «یک تراکنش» یا «فروش ماهانه یک کالا».' },
      { title: 'آزمون یکتایی', desc: 'کلیدهای یکتا را آزمایش کنید تا سطر تکراری رد شود.' },
      { title: 'تفکیک ابعاد و سنجه‌ها', desc: 'نقش‌ها را نهایی کنید و در صورت نیاز سنجه محاسباتی با فرمول امن بسازید.' },
      { title: 'تکمیل مدل', desc: 'بازه‌بندی، فیلدهای مشتق‌شده و واحد مبالغ را تنظیم کنید.' },
    ],
    tip: 'مدل صحیح جلوی چندبرابرشدن مبالغ در روابط را می‌گیرد؛ پیش از گزارش‌سازی، «آزمون یکتایی» را سبز کنید.',
  },
  analytics: {
    steps: [
      { title: 'انتخاب نوع تحلیل', desc: 'روند و پیش‌بینی، Cohort و حفظ مخاطبان، بخش‌بندی و RFM، What-if، همبستگی یا ناهنجاری.' },
      { title: 'تعیین پارامترها', desc: 'ستون‌ها، بازه زمانی و تنظیمات روش را وارد کنید.' },
      { title: 'تفسیر خروجی', desc: 'روش، خطای ارزیابی و عدم قطعیت در کنار نتایج نمایش داده می‌شود.' },
    ],
    tip: 'تحلیل‌ها روی نسخه فعال داده اجرا می‌شوند؛ پس از پاک‌سازی مجدد، تحلیل را دوباره اجرا کنید.',
  },
  engine: {
    steps: [
      { title: 'ساخت فایل آماده‌شده', desc: 'دکمه «ساخت/نوسازی Parquet» نسخه جاری داده را به فایل بهینه تبدیل می‌کند.' },
      { title: 'پرس‌وجوی نمونه', desc: 'چند پرس‌وجوی آماده را ببینید و با یک کلیک اجرا کنید.' },
      { title: 'کنسول SQL', desc: 'پرس‌وجوی فقط‌خواندنی بنویسید — فقط SELECT/WITH با سقف ۲۰۰۰ سطر.' },
    ],
    tip: 'این بخش برای تحلیل‌گران و داده حجیم است؛ برای گزارش روزمره از «گزارش‌ساز» استفاده کنید.',
  },
  assistant: {
    steps: [
      { title: 'تحلیل هوشمند', desc: 'پیشنهاد نوع ستون، کلید، رابطه، پاک‌سازی و نمودار مناسب را ببینید و با یک کلیک اعمال کنید.' },
      { title: 'پرسش به زبان طبیعی', desc: 'مثلاً «فروش تهران در تیر چند بود؟» — پاسخ همیشه با موتور محاسبات سامانه ساخته می‌شود.' },
      { title: 'پیش‌نویس توصیفی', desc: 'متن توصیفی گزارش با تأیید انسانی تولید و ثبت می‌شود.' },
      { title: 'توضیح فرمول و خطا', desc: 'هر سنجه یا خطای محاسباتی را به زبان ساده توضیح می‌دهد.' },
    ],
    tip: 'همه اعداد از موتور تحلیل سامانه می‌آیند و منبع پاسخ (فیلتر/سنجه) قابل ردیابی است.',
  },
  relations: {
    steps: [
      { title: 'انتخاب جداول', desc: 'برای این بخش به دو مجموعه‌داده یا بیشتر نیاز دارید.' },
      { title: 'تعریف رابطه', desc: 'نوع رابطه (یک‌به‌یک، یک‌به‌چند یا چندبه‌چند با جدول واسط) و کلیدها را تعیین کنید.' },
      { title: 'کنترل‌های الزامی', desc: 'یکتایی کلید و تطابق نوع پیش از ثبت بررسی می‌شود.' },
      { title: 'جلوگیری از تکرار مبالغ', desc: 'جهت فیلتر و رفتار جمع را مطابق راهنمای رابطه تنظیم کنید.' },
    ],
    tip: 'رابطه نادرست رایج‌ترین علت «اعداد چندبرابر» است؛ کنترل‌های پیش از اتصال را رد نکنید.',
  },
  dictionary: {
    steps: [
      { title: 'تعریف شاخص', desc: 'نام، توضیح و فرمول شاخص سازمانی را ثبت کنید.' },
      { title: 'مستندسازی', desc: 'منبع داده، واحد و مالک شاخص را مشخص کنید.' },
      { title: 'تأیید', desc: 'شاخص برای تأیید به مدیر داده ارسال می‌شود.' },
      { title: 'استفاده یکسان', desc: 'شاخص تأییدشده در همه گزارش‌ها به یک شکل به کار می‌رود.' },
    ],
    tip: 'شاخص تأییدشده را دیگر نباید در گزارش‌ها بازتعریف کرد — این کارتفافوت اعداد سازمانی را می‌بندد.',
  },
  occasions: {
    steps: [
      { title: 'ورود مناسبت', desc: 'به‌صورت دستی یا بارگذاری گروهی از فایل اکسل.' },
      { title: 'تعیین تقویم و بازه', desc: 'نوع تقویم (شمسی/میلادی/قمری) و بازه زمانی هر سال.' },
      { title: 'دسته‌بندی و ظاهر', desc: 'دسته، سراسری/محلی، تعطیل، رنگ و برچسب.' },
      { title: 'استفاده در تحلیل', desc: 'برای مقایسه دوره‌های دارای مناسبت در گزارش‌های زمانی.' },
    ],
    tip: 'مناسبت‌ها تفسیر روند را دقیق می‌کنند تا جهش‌های مقطعی فروش اشتباه تحلیل نشوند.',
  },
  connections: {
    steps: [
      { title: 'اتصال جدید', desc: 'نوع منبع را انتخاب کنید: REST API یا پایگاه‌داده PostgreSQL/MySQL.' },
      { title: 'پیکربندی امن', desc: 'آدرس، اعتبارنامه و پرس‌وجوی فقط‌خواندنی را وارد کنید.' },
      { title: 'آزمون و همگام‌سازی', desc: 'دکمه «آزمون اتصال» و سپس همگام‌سازی دستی یا زمان‌بندی‌شده.' },
      { title: 'تبدیل به مجموعه‌داده', desc: 'خروجی همگام‌شده با نسخه‌بندی به پروژه اضافه می‌شود.' },
    ],
    tip: 'همگام‌سازی خودکار در پس‌زمینه نسخه جدید می‌سازد؛ نیازی به بارگذاری مجدد دستی نیست.',
  },
  reports: {
    steps: [
      { title: 'انتخاب مجموعه‌داده', desc: 'از فهرست بالای گزارش‌ساز، نسخه داده موردنظر را انتخاب کنید.' },
      { title: 'انتخاب نوع نمایش', desc: 'جدول، نمودار میله‌ای/خطی/دایره‌ای، کارت شاخص، جدول محوری، داشبورد، نقشه و…' },
      { title: 'پیکربندی', desc: 'ابعاد (سطر/گروه)، سنجه‌ها، فیلترها و مرتب‌سازی را تعیین کنید.' },
      { title: 'اجرای گزارش', desc: 'دکمه «اجرای گزارش» نتیجه را می‌سازد؛ پس از هر تغییر دوباره اجرا کنید.' },
      { title: 'ذخیره، انتشار و خروجی', desc: 'ذخیره پیش‌نویس، ارسال برای تأیید، انتشار و خروجی Excel/CSV/PDF/PowerPoint.' },
    ],
    tip: 'اگر نمی‌دانید از کجا شروع کنید، دکمه «پیشنهاد هوشمند (۲۵)» بر اساس داده شما پیکربندی مناسب را اعمال می‌کند.',
  },
  jobs: {
    steps: [
      { title: 'ایجاد پردازش', desc: 'در گزارش‌ساز دکمه «خروجی پس‌زمینه (صف — حجم بالا)» را بزنید.' },
      { title: 'پیگیری', desc: 'وضعیت، درصد پیشرفت و مدت اجرا را در همین تب ببینید.' },
      { title: 'دانلود', desc: 'لینک دانلود پس از اتمام فعال می‌شود و پس از انقضا حذف می‌گردد.' },
      { title: 'شکست‌ها', desc: 'پردازش شکست‌خورده با «اجرای مجدد امن» قابل تکرار است.' },
    ],
    tip: 'برای خروجی‌های سنگین همیشه از صف استفاده کنید تا مرورگر شما آزاد بماند.',
  },
  alerts: {
    steps: [
      { title: 'قاعده جدید', desc: 'سنجه، عملگر و آستانه را تعیین کنید — مثلاً «فروش کمتر از هدف».' },
      { title: 'نوع و شدت', desc: 'عبور از آستانه، افت کیفیت، تأخیر فایل، شکست پردازش یا تغییر ساختار.' },
      { title: 'ارزیابی خودکار', desc: 'هر ۶۰ دقیقه همه قواعد فعال بررسی می‌شوند؛ کانال ایمیل در تنظیمات.' },
      { title: 'اعلان‌ها', desc: 'نتایج در زنگ بالای صفحه و همین تب نمایش داده می‌شود.' },
    ],
    tip: 'قواعد را محدود و معنادار تعریف کنید تا هشدارهای بی‌اهمیت، اثر واقعی را نپوشانند.',
  },
  admin: {
    steps: [
      { title: 'کاربران و نقش‌ها', desc: 'ایجاد کاربر، تعیین نقش و غیرفعال‌سازی حساب.' },
      { title: 'دسترسی سطح سطر', desc: 'قواعد سطری و ماسک ستون‌های محرمانه.' },
      { title: 'تنظیمات سامانه', desc: 'ظرفیت‌ها، موتور تحلیلی، سیاست هوش مصنوعی، SSO و SAML.' },
      { title: 'امنیت حساب', desc: 'فعال‌سازی ورود دومرحله‌ای (MFA) از کارت «امنیت حساب» بالای همین تب.' },
      { title: 'ثبت رویدادها', desc: 'همه اقدامات مهم در گزارش حسابرسی ثبت می‌شود.' },
    ],
    tip: 'نخستین کاربر ثبت‌نام‌شده مدیر سامانه است؛ نقش‌ها را حداقلی بدهید و از قواعد سطری استفاده کنید.',
  },
}

// ── دکمه ناوبری با تولتیپ توضیحی ──
function NavButton({
  item, active, lockedReason, onSelect,
}: {
  item: NavItem
  active: boolean
  lockedReason?: string
  onSelect: (k: TabKey) => void
}) {
  const Icon = item.icon
  const locked = !!lockedReason
  return (
    <Tip label={lockedReason ? `${item.tip} — فعال‌سازی: ${lockedReason}` : item.tip} side="left">
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={() => !locked && onSelect(item.key)}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-xs transition-all cursor-pointer ${
          active
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
            : locked
              ? 'opacity-55 hover:bg-muted'
              : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        }`}
      >
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${active ? 'bg-white/20 text-white' : item.chip}`}>
          <Icon className="size-4" />
        </span>
        <span className="flex-1 truncate font-medium">{item.label}</span>
        {item.step ? (
          <span className={`num-fa rounded-full px-1.5 py-0.5 text-[9px] font-bold ${active ? 'bg-white/20' : 'bg-muted text-muted-foreground'}`}>
            {fa(item.step)}
          </span>
        ) : locked ? (
          <Lock className="size-3 shrink-0 text-muted-foreground" />
        ) : null}
      </button>
    </Tip>
  )
}

// ── محتوای ناوبری — مشترک بین سایدبار دسکتاپ و Sheet موبایل ──
function AppNav({
  tab, setTab, project, detail, datasetCount, user, onLogout, onDone,
}: {
  tab: TabKey
  setTab: (k: TabKey) => void
  project: Project | null
  detail: DatasetDetail | null
  datasetCount: number
  user: AppUser | null
  onLogout: () => void
  onDone?: () => void
}) {
  const lockDataset = detail ? undefined : 'ابتدا یک مجموعه‌داده بسازید یا انتخاب کنید'
  const lockTwo = datasetCount >= 2 ? undefined : 'به دو مجموعه‌داده یا بیشتر نیاز دارد'
  const select = (k: TabKey) => { setTab(k); onDone?.() }

  const renderItem = (it: NavItem) => (
    <NavButton
      key={it.key}
      item={it}
      active={tab === it.key}
      lockedReason={it.lock === 'dataset' ? lockDataset : it.lock === 'two' ? lockTwo : undefined}
      onSelect={select}
    />
  )

  return (
    <div className="flex h-full flex-col">
      {/* برند و پروژه جاری */}
      <div className="border-b bg-gradient-to-l from-primary/10 via-primary/5 to-transparent px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <ScrollText className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-5">سکوی هوشمند گزارش‌ساز</p>
            <p className="truncate text-[10px] text-muted-foreground">{project ? project.name : 'داده، مدل، گزارش'}</p>
          </div>
        </div>
        {project ? (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border bg-background/70 px-2.5 py-1.5 text-[10px] text-muted-foreground">
            <Database className="size-3 shrink-0 text-primary" />
            <span className="truncate">
              {detail ? `نسخه فعال: داده v${fa(detail.version)}${detail.grain ? ` | ${detail.grain}` : ''}` : 'هنوز مجموعه‌داده‌ای انتخاب نشده است'}
            </span>
          </div>
        ) : null}
      </div>

      {/* فهرست ناوبری */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3" aria-label="ناوبری اصلی">
        <div>
          <p className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] font-bold text-muted-foreground/80">
            <Route className="size-3" /> مسیر ساخت گزارش
          </p>
          <div className="space-y-1">{PROCESS_STEPS.map(renderItem)}</div>
        </div>
        {NAV_GROUPS.map(g => (
          <div key={g.title}>
            <p className="px-1 pb-1.5 text-[10px] font-bold text-muted-foreground/80">{g.title}</p>
            <div className="space-y-1">{g.items.map(renderItem)}</div>
          </div>
        ))}
      </nav>

      {/* کارت کاربر و خروج */}
      {user ? (
        <div className="space-y-2 border-t px-3 py-3">
          <div className="flex items-center gap-2 px-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {(user.name ?? 'ک').trim().charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{user.name}</p>
              <p className="text-[10px] text-muted-foreground">{user.roleLabel ?? user.role}</p>
            </div>
            <Tip label="خروج از حساب کاربری" side="top">
              <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={onLogout} aria-label="خروج">
                <LogOut className="size-3.5" />
              </Button>
            </Tip>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// تب‌های وابسته به مجموعه‌داده فعال
const NEEDS_DATASET: TabKey[] = ['columns', 'profile', 'cleaning', 'model', 'analytics', 'engine', 'assistant']

// ── نما وقتی مجموعه‌داده‌ای انتخاب نشده — به‌جای فضای خالی ──
function NoDatasetState({ onGo }: { onGo: () => void }) {
  return (
    <div className="anim-fade-up flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Database className="size-7" />
      </div>
      <h3 className="text-base font-bold">ابتدا یک مجموعه‌داده انتخاب کنید</h3>
      <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">
        این بخش روی داده کار می‌کند؛ در گام ۱ مسیر، فایل اکسل/CSV را بارگذاری کنید یا از فهرست «مجموعه‌داده‌های پروژه» نسخه فعال را انتخاب کنید تا همه ابزارها فعال شوند.
      </p>
      <Button className="mt-5 gap-2" onClick={onGo}>
        <ArrowLeft className="size-4" /> رفتن به فایل‌ها و مجموعه‌داده (گام ۱)
      </Button>
    </div>
  )
}

// ── سربرگ بخش با گرادیان + کارت راهنمای گام‌به‌گام ──
function SectionHead({
  icon, title, desc, tab,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  tab?: TabKey
}) {
  const guide = tab ? SECTION_GUIDES[tab] : undefined
  return (
    <div className="space-y-3">
      <div className="section-gradient flex items-start gap-3 rounded-xl border px-4 py-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-6">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{desc}</p>
        </div>
      </div>
      {guide ? <GuideCard steps={guide.steps} tip={guide.tip} /> : null}
    </div>
  )
}

// ── نوار مسیر ۵ گامی ساخت گزارش — بالای گزارش‌ساز ──
function ReportFlowBanner() {
  const steps = [
    { t: 'انتخاب مجموعه‌داده', d: 'از فهرست بالای گزارش‌ساز' },
    { t: 'انتخاب نوع نمایش', d: 'جدول، نمودار، کارت شاخص…' },
    { t: 'ابعاد و سنجه‌ها', d: 'سطرها، ستون‌ها و فیلترها' },
    { t: 'اجرای گزارش', d: 'دکمه «اجرای گزارش»' },
    { t: 'ذخیره و خروجی', d: 'Excel / PDF / PowerPoint' },
  ]
  return (
    <div className="rounded-xl border border-amber-300/60 bg-gradient-to-l from-amber-50/90 via-amber-50/40 to-transparent p-4 dark:border-amber-800/50 dark:from-amber-950/30 dark:via-amber-950/10">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
        <Compass className="size-4" /> مسیر ساخت گزارش در ۵ گام
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-sm">
              <span className="num-fa flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
                {fa(i + 1)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-4">{s.t}</p>
                <p className="text-[10px] leading-4 text-muted-foreground">{s.d}</p>
              </div>
            </div>
            {i < steps.length - 1 ? <ChevronLeft className="size-4 shrink-0 text-amber-400" /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const [project, setProject] = useState<Project | null>(null)
  const [tab, setTab] = useState<TabKey>('projects')
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DatasetDetail | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  // وضعیت نشست — بخش ۲۹ سند
  useEffect(() => {
    api.get<{ user: AppUser | null }>('/api/auth/me')
      .then(res => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  // تور راهنما — باز شدن خودکار در نخستین ورود به هر پروژه
  useEffect(() => {
    if (!project) return
    const t = setTimeout(() => {
      try {
        if (!localStorage.getItem(TOUR_SEEN_KEY)) {
          setGuideOpen(true)
          localStorage.setItem(TOUR_SEEN_KEY, '1')
        }
      } catch { /* حالت خصوصی مرورگر */ }
    }, 600)
    return () => clearTimeout(t)
  }, [project?.id])

  const markTourSeen = () => {
    try { localStorage.setItem(TOUR_SEEN_KEY, '1') } catch { /* بی‌صدا */ }
  }

  const role = user?.role ?? 'viewer'
  const canEditRelation = ['admin', 'steward', 'analyst'].includes(role)

  const logout = async () => {
    await api.post('/api/auth/logout', {}).catch(() => undefined)
    setUser(null)
    setProject(null)
    setTab('projects')
    setNavOpen(false)
    clearDataset()
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        if (!project) return
        const list = await api.get<DatasetRow[]>(`/api/datasets?projectId=${project.id}`)
        if (!cancelled) setDatasets(list)
      } catch { /* بی‌صدا */ }
    }
    run()
    return () => { cancelled = true }
  }, [project?.id])

  const refreshDatasets = useCallback(async () => {
    if (!project) return
    try {
      const list = await api.get<DatasetRow[]>(`/api/datasets?projectId=${project.id}`)
      setDatasets(list)
    } catch { /* بی‌صدا */ }
  }, [project])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!activeDatasetId || cancelled) return
      try {
        const d = await api.get<DatasetDetail>(`/api/datasets/${activeDatasetId}`)
        if (!cancelled) setDetail(d)
      } catch {
        if (!cancelled) setDetail(null)
      }
    }
    run()
    return () => { cancelled = true }
  }, [activeDatasetId])

  const refreshDetail = useCallback(async () => {
    if (!activeDatasetId) return
    try {
      const d = await api.get<DatasetDetail>(`/api/datasets/${activeDatasetId}`)
      setDetail(d)
    } catch { setDetail(null) }
  }, [activeDatasetId])

  const fields: FieldMetaClient[] = detail?.fields ?? []
  const transforms: TransformStep[] = detail?.transforms ?? []

  const selectProject = (p: Project) => {
    setProject(p)
    setTab('data')
    setActiveDatasetId(null)
    setDetail(null)
  }

  const clearDataset = () => {
    setActiveDatasetId(null)
    setDetail(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50/60 via-background to-background">
        <div className="animate-pulse text-sm text-muted-foreground">در حال بررسی نشست…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/60 via-background to-background dot-grid-bg">
        <LandingHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl w-full flex items-center justify-center">
          <LoginView onLoggedIn={u => { setUser(u); setTab('projects') }} />
        </main>
        <Footer />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/60 via-background to-background dot-grid-bg">
        <LandingHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl w-full">
          <ProjectsView onSelect={selectProject} />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background dot-grid-bg">
      {/* سایدبار دسکتاپ — در راست‌به‌چپ سمت راست است */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-l bg-sidebar xl:w-64 lg:block">
        <AppNav
          tab={tab}
          setTab={setTab}
          project={project}
          detail={detail}
          datasetCount={datasets.length}
          user={user}
          onLogout={logout}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* سربرگ چسبان — ناوبری موبایل، مسیر راهنما و اقدام‌های کاربر */}
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex w-full max-w-[1300px] items-center gap-2 px-4 py-2.5 lg:px-6">
            {/* منوی موبایل */}
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="size-8 shrink-0 lg:hidden" aria-label="باز کردن منو">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 gap-0 overflow-y-auto p-0">
                <SheetTitle className="sr-only">ناوبری پروژه</SheetTitle>
                <AppNav
                  tab={tab}
                  setTab={setTab}
                  project={project}
                  detail={detail}
                  datasetCount={datasets.length}
                  user={user}
                  onLogout={logout}
                  onDone={() => setNavOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/* مسیر راهنما */}
            <Tip label="بازگشت به فهرست پروژه‌ها" side="bottom">
              <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs" onClick={() => { setProject(null); setTab('projects'); clearDataset() }}>
                <ArrowRight className="size-4" /> پروژه‌ها
              </Button>
            </Tip>
            <div className="h-5 w-px shrink-0 bg-border" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold leading-5">{project.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {detail ? `داده v${fa(detail.version)}` : 'بدون مجموعه‌داده فعال'}{detail?.grain ? ` | ${detail.grain}` : ''}
              </p>
            </div>

            <div className="ms-auto flex shrink-0 items-center gap-1.5">
              <Tip label="تور راهنمای گام‌به‌گام: از بارگذاری فایل تا ساخت و انتشار گزارش" side="bottom">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-primary/40 text-xs text-primary hover:bg-primary/10"
                  onClick={() => { markTourSeen(); setGuideOpen(true) }}
                >
                  <Compass className="size-3.5" /> راهنما
                </Button>
              </Tip>
              <NotificationBell projectId={project.id} />
              <Tip label={`کاربر ${user.name} — نقش ${user.roleLabel ?? user.role}`} side="bottom">
                <Badge variant="outline" className="hidden gap-1 text-[10px] sm:inline-flex">
                  <ShieldCheck className="size-3" /> {user.name} — {user.roleLabel ?? user.role}
                </Badge>
              </Tip>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1300px] flex-1 px-4 py-5 lg:px-6">
          <div key={tab} className="anim-fade-up space-y-4">
            {/* نمای جایگزین وقتی تب به مجموعه‌داده فعال نیاز دارد و انتخاب نشده */}
            {NEEDS_DATASET.includes(tab) && !detail && (
              <SectionHead tab={tab} icon={<Route className="size-4" />} title="این بخش به داده نیاز دارد" desc="ابتدا مجموعه‌داده پروژه را بارگذاری یا انتخاب کنید" />
            )}
            {NEEDS_DATASET.includes(tab) && !detail && <NoDatasetState onGo={() => setTab('data')} />}

            {tab === 'data' && (
              <div className="space-y-6">
                <SectionHead
                  tab="data"
                  icon={<Database className="size-4" />}
                  title="فایل‌ها و مجموعه‌داده‌ها"
                  desc="بارگذاری فایل اکسل/CSV با تشخیص خودکار ساختار، ساخت مجموعه‌داده نسخه‌دار و به‌روزرسانی (بخش‌های ۶ تا ۸ و ۲۴ سند)"
                />
                <DataView
                  projectId={project.id}
                  activeProjectName={project.name}
                  onDatasetCreated={async (id) => {
                    await refreshDatasets()
                    setActiveDatasetId(id)
                    setDetail(null)
                    setTab('columns')
                  }}
                />
                {/* به‌روزرسانی فایل و Upsert — بخش ۲۴ سند */}
                {datasets.length > 0 && (
                  <UpsertView datasets={datasets} onUpdated={refreshDatasets} />
                )}
                {/* فهرست مجموعه‌داده‌های موجود */}
                {datasets.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Database className="size-4 text-primary" /> مجموعه‌داده‌های پروژه
                      <span className="text-[10px] font-normal text-muted-foreground">— برای ادامه مسیر، روی کارت بزنید</span>
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {datasets.map(d => (
                        <Tip key={d.id} label={`انتخاب «${d.name}» به‌عنوان نسخه فعال — سپس ستون‌ها، پروفایل و مدل‌سازی فعال می‌شوند`} side="top">
                          <button
                            onClick={() => { setActiveDatasetId(d.id); setDetail(null); setTab('columns') }}
                            className={`card-lift text-right rounded-xl border p-4 ${activeDatasetId === d.id ? 'border-primary ring-2 ring-primary/30' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="flex items-center gap-2 truncate text-sm font-medium">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                  <FileCheck2 className="size-3.5" />
                                </span>
                                {d.name}
                              </p>
                              <Badge variant="secondary" className="num-fa shrink-0 text-[10px]">v{fa(d.version)}</Badge>
                            </div>
                            <p className="num-fa mt-2 text-xs text-muted-foreground">
                              شیت «{d.sheetName}» | {d.rowCount.toLocaleString('fa-IR')} رکورد
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {d.status === 'confirmed' ? 'تأییدشده' : 'پیش‌نویس'}
                            </p>
                          </button>
                        </Tip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'columns' && detail && (
              <div className="space-y-4">
                <SectionHead
                  tab="columns"
                  icon={<Columns3 className="size-4" />}
                  title="نمایش و ویرایش مشخصات ستون‌ها"
                  desc={`مجموعه‌داده «${detail.name}» — ${detail.rowCount.toLocaleString('fa-IR')} رکورد | تشخیص خودکار پیشنهاد است، تصمیم نهایی با مدیر (بخش ۴ سند)`}
                />
                <ColumnsEditor
                  datasetId={detail.id}
                  fields={fields}
                  onChange={() => { refreshDetail(); refreshDatasets() }}
                />
              </div>
            )}

            {tab === 'profile' && detail && (
              <div className="space-y-4">
                <SectionHead
                  tab="profile"
                  icon={<Gauge className="size-4" />}
                  title="شناسنامه و کیفیت داده"
                  desc="برای هر ستون و مجموعه‌داده: خالی‌ها، متمایزها، کمینه/بیشینه، میانگین/میانه، فراوانی و وضعیت کیفیت (بخش ۹ سند)"
                />
                <ProfileView datasetId={detail.id} fields={fields} />
              </div>
            )}

            {tab === 'cleaning' && detail && (
              <div className="space-y-4">
                <SectionHead
                  tab="cleaning"
                  icon={<Wand2 className="size-4" />}
                  title="ابزارهای پاک‌سازی و تبدیل"
                  desc="تبدیل‌های متنی و ساختاری با دفترچه مراحل تبدیل قابل ردیابی (بخش ۱۰ سند)"
                />
                <CleaningView
                  datasetId={detail.id}
                  fields={fields}
                  fileName={detail.file?.name ?? 'منبع خارجی'}
                  sheetName={detail.sheetName}
                  transforms={transforms}
                  onChange={() => { refreshDetail(); refreshDatasets() }}
                />
              </div>
            )}

            {tab === 'model' && detail && (
              <div className="space-y-4">
                <SectionHead
                  tab="model"
                  icon={<Boxes className="size-4" />}
                  title="مدل معنایی: ابعاد، سنجه‌ها، کلیدها و فیلدهای مشتق‌شده"
                  desc="تفکیک ابعاد از سنجه‌ها، سطح جزئیات، آزمون یکتایی، فرمول‌نویسی امن و بازه‌سازی (بخش‌های ۱۱ تا ۱۳ و ۱۷ سند)"
                />
                <ModelView
                  datasetId={detail.id}
                  fields={fields}
                  grain={detail.grain ?? null}
                  records={detail.sample}
                  onChange={() => { refreshDetail(); refreshDatasets() }}
                />
              </div>
            )}

            {/* تحلیل‌های پیشرفته — بخش ۲۱.۲ سند */}
            {tab === 'analytics' && detail && (
              <div className="space-y-4">
                <SectionHead
                  tab="analytics"
                  icon={<TrendingUp className="size-4" />}
                  title="تحلیل‌های پیشرفته"
                  desc="روند و پیش‌بینی سری زمانی، گروه‌های زمانی (Cohort) و حفظ مخاطبان، بخش‌بندی و RFM، سناریوسازی (What-if)، همبستگی و تشخیص ناهنجاری — همراه با روش، خطای ارزیابی و عدم قطعیت (بخش‌های ۲۱.۲ و ۲۱.۳ سند)"
                />
                <AnalyticsView datasetId={detail.id} fields={fields} />
              </div>
            )}

            {/* موتور تحلیل متوسط DuckDB/Parquet — بخش ۲۷.۲ سند */}
            {tab === 'engine' && detail && (
              <div className="space-y-4">
                <SectionHead
                  tab="engine"
                  icon={<DatabaseZap className="size-4" />}
                  title="موتور تحلیل متوسط و فایل آماده‌شده"
                  desc="ساخت فایل آماده‌شده Parquet از نسخه جاری مجموعه‌داده و پرس‌وجوی فقط‌خواندنی با موتور تحلیلی DuckDB — گزینه فناوری بخش ۲۷.۲ سند که پس از آزمون با فایل‌های واقعی سازمان نهایی می‌شود"
                />
                <EngineView datasetId={detail.id} datasetName={detail.name} />
              </div>
            )}

            {/* دستیار هوشمند — بخش ۲۵ سند */}
            {tab === 'assistant' && detail && (
              <div className="space-y-4">
                <SectionHead
                  tab="assistant"
                  icon={<Sparkles className="size-4" />}
                  title="دستیار هوشمند و هوش مصنوعی"
                  desc="پیشنهاد نوع ستون، کلید یکتا، رابطه، پاک‌سازی، نمودار و شاخص؛ پرسش به زبان طبیعی از داده؛ پیش‌نویس توصیفی با تأیید انسانی؛ توضیح فرمول و خطا؛ الگوها و نقاط غیرعادی — اعداد با موتور تحلیل سامانه (بخش ۲۵ سند)"
                />
                <AiAssistantView
                  datasetId={detail.id}
                  datasetName={detail.name}
                  fields={fields.map(f => ({ id: f.id, label: f.label, type: f.type, role: f.role }))}
                />
              </div>
            )}

            {tab === 'relations' && (
              <div className="space-y-4">
                <SectionHead
                  tab="relations"
                  icon={<Network className="size-4" />}
                  title="محیط بصری اتصال جداول"
                  desc="بوم گرافیکی، انواع رابطه و اتصال، کنترل‌های الزامی پیش از اتصال و جلوگیری از چندبرابرشدن مبالغ (بخش ۱۶ سند)"
                />
                <RelationsView
                  projectId={project.id}
                  datasets={datasets}
                  canEdit={canEditRelation}
                />
              </div>
            )}

            {tab === 'dictionary' && project && (
              <div className="space-y-4">
                <SectionHead
                  tab="dictionary"
                  icon={<BookMarked className="size-4" />}
                  title="فرهنگ داده و شاخص‌های سازمانی"
                  desc="تعریف یکتای شاخص‌ها با فرمول، منبع، واحد و مالک؛ شاخص تأییدشده در همه گزارش‌ها به‌صورت یکسان به کار می‌رود (بخش ۱۸ سند)"
                />
                <DataDictionaryView
                  projectId={project.id}
                  datasets={datasets}
                  role={role}
                />
              </div>
            )}

            {/* تقویم مناسبت‌ها — بخش ۱۵.۴ سند */}
            {tab === 'occasions' && project && (
              <div className="space-y-4">
                <SectionHead
                  tab="occasions"
                  icon={<CalendarDays className="size-4" />}
                  title="تقویم مناسبت‌ها"
                  desc="جدول مرجع مناسبت‌ها با نوع تقویم، بازه هر سال، دسته، سراسری/محلی، تعطیل، منبع و نسخه، رنگ و برچسب — ورود دستی یا گروهی از اکسل (بخش ۱۵.۴ سند)"
                />
                <OccasionsView projectId={project.id} canEdit={['admin', 'steward', 'analyst'].includes(role)} />
              </div>
            )}

            {/* منابع داده خارجی — بخش ۳۱ سند */}
            {tab === 'connections' && project && (
              <div className="space-y-4">
                <SectionHead
                  tab="connections"
                  icon={<PlugZap className="size-4" />}
                  title="منابع داده خارجی: API و پایگاه‌داده"
                  desc="اتصال به سرویس REST/JSON و پایگاه‌داده PostgreSQL/MySQL با پرس‌وجوی فقط‌خواندنی، همگام‌سازی دستی یا زمان‌بندی‌شده و انتقال به مجموعه‌داده با نسخه‌بندی (بخش ۳۱ سند)"
                />
                <ConnectionsView projectId={project.id} canEdit={['admin', 'steward', 'analyst'].includes(role)} />
              </div>
            )}

            {tab === 'reports' && (
              <div className="space-y-5">
                <SectionHead
                  tab="reports"
                  icon={<BarChart3 className="size-4" />}
                  title="طراح گزارش و داشبورد"
                  desc="طراحی بدون کدنویسی با جدول، نمودار، کارت شاخص، فیلترها، گزارش توصیفی، انتشار و خروجی (بخش‌های ۱۹ تا ۲۳ سند)"
                />
                <ReportFlowBanner />
                <ReportBuilder
                  projectId={project.id}
                  datasets={datasets}
                  selectedDatasetId={activeDatasetId}
                  onSelectDataset={setActiveDatasetId}
                />
                <ReportWorkflow
                  projectId={project.id}
                  user={user as WorkflowUser}
                  datasets={datasets.map(d => ({ id: d.id, name: d.name }))}
                />
              </div>
            )}

            {/* صف پردازش خروجی حجیم — بخش ۲۸ (Job) و ۳۰.۲ سند */}
            {tab === 'jobs' && project && (
              <div className="space-y-4">
                <SectionHead
                  tab="jobs"
                  icon={<ListTodo className="size-4" />}
                  title="پردازش‌های پس‌زمینه (صف خروجی حجیم)"
                  desc="تولید غیرهم‌زمان خروجی‌های حجیم با پیشرفت، بازیابی پردازش شکست‌خورده، اجرای مجدد امن، ثبت مدت و علت شکست و انقضای خودکار لینک دانلود (بخش ۳۰.۲ سند)"
                />
                <JobsView projectId={project.id} />
              </div>
            )}

            {tab === 'alerts' && project && (
              <div className="space-y-4">
                <SectionHead
                  tab="alerts"
                  icon={<BellRing className="size-4" />}
                  title="هشدارها و اعلان‌ها"
                  desc="پایش خودکار: عبور شاخص از آستانه، کاهش کیفیت داده، تأخیر در دریافت فایل، شکست پردازش، تغییر ساختار و نبود داده در دوره مورد انتظار (بخش ۲۶.۲ سند)"
                />
                <AlertsView
                  projectId={project.id}
                  datasets={datasets.map(d => ({ id: d.id, name: d.name, rowCount: d.rowCount }))}
                  fields={fields.map(f => ({ id: f.id, label: f.label, type: f.type }))}
                  activeDatasetId={activeDatasetId}
                />
              </div>
            )}

            {tab === 'admin' && (
              <div className="space-y-4">
                <SectionHead
                  tab="admin"
                  icon={<ShieldCheck className="size-4" />}
                  title="مدیریت سامانه، امنیت و ظرفیت"
                  desc="کاربران و نقش‌ها، قواعد دسترسی سطح سطر، SSO و MFA، سقف‌های ظرفیت، صف پردازش و ثبت رویدادها (بخش‌های ۲۸ تا ۳۱ سند)"
                />
                {/* امنیت حساب شخصی — فعال‌سازی MFA برای همه نقش‌ها — بخش ۲۹ سند */}
                <AccountSecurity user={user} onChanged={u => setUser(prev => (prev ? { ...prev, ...u } : prev))} />
                <AdminView
                  canManageUsers={role === 'admin'}
                  canManageSettings={role === 'admin'}
                  canViewAudit={role === 'admin' || role === 'auditor'}
                />
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {/* تور راهنمای تعاملی */}
      <GuideTour open={guideOpen} onOpenChange={v => { setGuideOpen(v); if (!v) markTourSeen() }} onNavigate={k => { setTab(k as TabKey); markTourSeen() }} />
    </div>
  )
}

function LandingHeader() {
  return (
    <header className="border-b bg-background/85 backdrop-blur">
      <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-600/25">
            <ScrollText className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-7">سکوی هوشمند آماده‌سازی داده، مدل‌سازی و گزارش‌سازی</h1>
            <p className="text-xs text-muted-foreground">دریافت منعطف داده + آماده‌سازی قابل ردیابی + مدل‌سازی صحیح + گزارش‌سازی بدون کدنویسی + انتشار امن (بخش ۳۷ سند)</p>
          </div>
        </div>
        <Badge variant="secondary" className="border border-primary/20 bg-primary/5 text-primary">نسخه ۱.۲ — تکمیل فازهای سند</Badge>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 py-4">
        <p className="text-center text-[11px] text-muted-foreground">
          سکوی هوشمند گزارش‌ساز | مطابق سند نیازمندی‌های نسخه ۱.۰ | پشتیبانی فارسی و راست‌به‌چپ، تقویم شمسی، واحد پول با مبنای ریال (بخش ۴ سند)
        </p>
      </div>
    </footer>
  )
}
