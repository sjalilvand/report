'use client'

// سکوی هوشمند آماده‌سازی داده، مدل‌سازی و گزارش‌سازی
// صفحه اصلی — فرایند ۹ مرحله‌ای کاربر مطابق بخش ۶ سند

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import ProjectsView from '@/components/ProjectsView'
import DataView from '@/components/DataView'
import UpsertView from '@/components/UpsertView'
import ColumnsEditor, { FieldMetaClient } from '@/components/ColumnsEditor'
import ProfileView from '@/components/ProfileView'
import CleaningView from '@/components/CleaningView'
import ModelView from '@/components/ModelView'
import ReportBuilder from '@/components/ReportBuilder'
import ReportWorkflow, { WorkflowUser } from '@/components/ReportWorkflow'
import RelationsView from '@/components/RelationsView'
import DataDictionaryView from '@/components/DataDictionaryView'
import AlertsView from '@/components/AlertsView'
import OccasionsView from '@/components/OccasionsView'
import ConnectionsView from '@/components/ConnectionsView'
import JobsView from '@/components/JobsView'
import AccountSecurity from '@/components/AccountSecurity'
import NotificationBell from '@/components/NotificationBell'
import AdminView from '@/components/AdminView'
import LoginView, { AppUser } from '@/components/LoginView'
import { TransformStep } from '@/lib/types'
import {
  FolderKanban, Database, Columns3, Gauge, Wand2, Boxes, BarChart3,
  ScrollText, ArrowRight, Sparkles, FileCheck2, Network, ShieldCheck, LogOut, BookMarked, BellRing, CalendarDays, PlugZap, ListTodo,
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

type TabKey = 'projects' | 'data' | 'columns' | 'profile' | 'cleaning' | 'model' | 'relations' | 'dictionary' | 'occasions' | 'connections' | 'reports' | 'jobs' | 'alerts' | 'admin'

export default function Home() {
  const [project, setProject] = useState<Project | null>(null)
  const [tab, setTab] = useState<TabKey>('projects')
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DatasetDetail | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // وضعیت نشست — بخش ۲۹ سند
  useEffect(() => {
    api.get<{ user: AppUser | null }>('/api/auth/me')
      .then(res => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  const role = user?.role ?? 'viewer'
  const canEditRelation = ['admin', 'steward', 'analyst'].includes(role)

  const logout = async () => {
    await api.post('/api/auth/logout', {}).catch(() => undefined)
    setUser(null)
    setProject(null)
    setTab('projects')
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
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/60 via-background to-background">
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
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/60 via-background to-background">
        <LandingHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl w-full">
          <ProjectsView onSelect={selectProject} />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* سربرگ برنامه — بخش ۲۲: درج لوگو، سربرگ، نام کاربر و نقش */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setProject(null); setTab('projects'); clearDataset() }}>
                <ArrowRight className="size-4" /> پروژه‌ها
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="font-bold text-sm leading-6">{project.name}</h1>
                <p className="text-[10px] text-muted-foreground">
                  نسخه فعال: {detail ? `داده v${detail.version}` : 'بدون مجموعه‌داده'}
                  {detail?.grain ? ` | سطح جزئیات: ${detail.grain}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell projectId={project.id} />
              <Badge variant="outline" className="gap-1.5 text-[10px]">
                <ShieldCheck className="size-3" /> {user.name} — {user.roleLabel ?? user.role}
              </Badge>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={logout}>
                <LogOut className="size-3.5" /> خروج
              </Button>
            </div>
          </div>

          {/* ناوبری مراحل — بخش ۶ سند */}
          <Tabs value={tab} onValueChange={v => setTab(v as TabKey)} className="mt-3">
            <TabsList className="flex-wrap h-auto gap-1 justify-start w-full">
              <TabsTrigger value="data" className="gap-1.5 text-xs"><Database className="size-3.5" /> فایل‌ها و مجموعه‌داده</TabsTrigger>
              <TabsTrigger value="columns" className="gap-1.5 text-xs" disabled={!detail}><Columns3 className="size-3.5" /> ستون‌ها</TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5 text-xs" disabled={!detail}><Gauge className="size-3.5" /> پروفایل و کیفیت</TabsTrigger>
              <TabsTrigger value="cleaning" className="gap-1.5 text-xs" disabled={!detail}><Wand2 className="size-3.5" /> پاک‌سازی</TabsTrigger>
              <TabsTrigger value="model" className="gap-1.5 text-xs" disabled={!detail}><Boxes className="size-3.5" /> مدل و شاخص‌ها</TabsTrigger>
              <TabsTrigger value="relations" className="gap-1.5 text-xs" disabled={datasets.length < 2}><Network className="size-3.5" /> روابط جداول</TabsTrigger>
              <TabsTrigger value="dictionary" className="gap-1.5 text-xs" disabled={!project}><BookMarked className="size-3.5" /> فرهنگ داده</TabsTrigger>
              <TabsTrigger value="occasions" className="gap-1.5 text-xs" disabled={!project}><CalendarDays className="size-3.5" /> مناسبت‌ها</TabsTrigger>
              <TabsTrigger value="connections" className="gap-1.5 text-xs" disabled={!project}><PlugZap className="size-3.5" /> منابع داده</TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5 text-xs" disabled={!detail}><BarChart3 className="size-3.5" /> گزارش‌ساز</TabsTrigger>
              <TabsTrigger value="jobs" className="gap-1.5 text-xs" disabled={!project}><ListTodo className="size-3.5" /> پردازش‌ها</TabsTrigger>
              <TabsTrigger value="alerts" className="gap-1.5 text-xs" disabled={!project}><BellRing className="size-3.5" /> هشدارها</TabsTrigger>
              <TabsTrigger value="admin" className="gap-1.5 text-xs"><ShieldCheck className="size-3.5" /> مدیریت</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {tab === 'data' && (
          <div className="space-y-6">
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
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Database className="size-4" /> مجموعه‌داده‌های پروژه
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {datasets.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setActiveDatasetId(d.id); setDetail(null); setTab('columns') }}
                      className={`text-right rounded-xl border p-4 transition-all hover:shadow-md ${activeDatasetId === d.id ? 'border-primary ring-1 ring-primary' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{d.name}</p>
                        <Badge variant="secondary" className="text-[10px]">v{d.version}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        شیت «{d.sheetName}» | {d.rowCount.toLocaleString('fa-IR')} رکورد
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <FileCheck2 className="size-3" /> {d.status === 'confirmed' ? 'تأییدشده' : 'پیش‌نویس'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'columns' && detail && (
          <div className="space-y-4">
            <SectionHead
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

        {tab === 'relations' && (
          <div className="space-y-4">
            <SectionHead
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
              icon={<PlugZap className="size-4" />}
              title="منابع داده خارجی: API و پایگاه‌داده"
              desc="اتصال به سرویس REST/JSON و پایگاه‌داده PostgreSQL/MySQL با پرس‌وجوی فقط‌خواندنی، همگام‌سازی دستی یا زمان‌بندی‌شده و انتقال به مجموعه‌داده با نسخه‌بندی (بخش ۳۱ سند)"
            />
            <ConnectionsView projectId={project.id} canEdit={['admin', 'steward', 'analyst'].includes(role)} />
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <SectionHead
                icon={<BarChart3 className="size-4" />}
                title="طراح گزارش و داشبورد"
                desc="طراحی بدون کدنویسی با جدول، نمودار، کارت شاخص، فیلترها، گزارش توصیفی، انتشار و خروجی (بخش‌های ۱۹ تا ۲۳ سند)"
              />
              <ReportBuilder
                projectId={project.id}
                datasets={datasets}
                selectedDatasetId={activeDatasetId}
                onSelectDataset={setActiveDatasetId}
              />
            </div>
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
      </main>

      <Footer />
    </div>
  )
}

function SectionHead({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function LandingHeader() {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto px-4 py-4 max-w-6xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <ScrollText className="size-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-7">سکوی هوشمند آماده‌سازی داده، مدل‌سازی و گزارش‌سازی</h1>
            <p className="text-xs text-muted-foreground">دریافت منعطف داده + آماده‌سازی قابل ردیابی + مدل‌سازی صحیح + گزارش‌سازی بدون کدنویسی + انتشار امن (بخش ۳۷ سند)</p>
          </div>
        </div>
        <Badge variant="secondary">نسخه ۱.۱ — فازهای صفر تا هفتم سند</Badge>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <p className="text-center text-[11px] text-muted-foreground">
          سکوی هوشمند گزارش‌ساز | مطابق سند نیازمندی‌های نسخه ۱.۰ | پشتیبانی فارسی و راست‌به‌چپ، تقویم شمسی، واحد پول با مبنای ریال (بخش ۴ سند)
        </p>
      </div>
    </footer>
  )
}
