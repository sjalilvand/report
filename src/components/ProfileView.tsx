'use client'

// نمای پروفایل کیفیت داده — بخش ۹ سند
// شناسنامه هر ستون: خالی‌ها، متمایزها، کمینه/بیشینه، میانگین/میانه، پرتکرارها، کیفیت

import { useEffect, useState } from 'react'
import { api } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatNumber } from '@/lib/currency'
import { Gauge, TriangleAlert, CalendarClock } from 'lucide-react'

interface FieldProfile {
  fieldId: string
  total: number
  nullCount: number
  nullPercent: number
  distinctCount: number
  topValues: { value: string; count: number; percent: number }[]
  min?: number | string
  max?: number | string
  mean?: number
  median?: number
  minLength?: number
  maxLength?: number
  typeDistribution: Record<string, number>
  patternViolations: number
  quality: 'valid' | 'partial' | 'inconsistent'
}

interface DatasetProfile {
  rowCount: number
  duplicateRows: number
  fields: FieldProfile[]
  dateRange?: { field: string; from: string; to: string; invalid: number }
  warnings: string[]
}

const QUALITY: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  valid: { label: 'معتبر', variant: 'default' },
  partial: { label: 'ناقص', variant: 'secondary' },
  inconsistent: { label: 'ناسازگار', variant: 'destructive' },
}

export default function ProfileView({ datasetId, fields }: { datasetId: string; fields: { id: string; label: string; type: string }[] }) {
  const [profile, setProfile] = useState<DatasetProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const p = await api.get<DatasetProfile>(`/api/datasets/${datasetId}/profile`)
        if (!cancelled) setProfile(p)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [datasetId])

  if (loading) return <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}</div>
  if (!profile) return null

  const fieldLabel = (id: string) => fields.find(f => f.id === id)?.label ?? id

  return (
    <div className="space-y-4">
      {/* خلاصه مجموعه‌داده */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>تعداد کل رکوردها</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatNumber(profile.rowCount)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>سطرهای تکراری کامل</CardDescription></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${profile.duplicateRows > 0 ? 'text-amber-600' : ''}`}>{formatNumber(profile.duplicateRows)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>ستون‌های با کیفیت ناقص</CardDescription></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(profile.fields.filter(f => f.quality !== 'valid').length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><CalendarClock className="size-3.5" /> بازه پوشش زمانی</CardDescription></CardHeader>
          <CardContent>
            {profile.dateRange ? (
              <div className="text-xs space-y-0.5">
                <p>از {profile.dateRange.from} تا {profile.dateRange.to}</p>
                {profile.dateRange.invalid > 0 && <p className="text-amber-600">{profile.dateRange.invalid} تاریخ نامعتبر جداگانه گزارش شد (معیار ۳۳.۵)</p>}
              </div>
            ) : <p className="text-sm text-muted-foreground">ستون تاریخ یافت نشد</p>}
          </CardContent>
        </Card>
      </div>

      {profile.warnings.length > 0 && (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertDescription>
            <ul className="list-disc ps-4 space-y-1">
              {profile.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* شناسنامه ستون‌ها */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {profile.fields.map(p => (
          <Card key={p.fieldId}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm leading-6">{fieldLabel(p.fieldId)}</CardTitle>
                <Badge variant={QUALITY[p.quality].variant} className="text-[10px] shrink-0">{QUALITY[p.quality].label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <Stat label="خالی" value={`${formatNumber(p.nullCount)} (${Math.round(p.nullPercent * 100)}٪)`} warn={p.nullPercent > 0.15} />
                <Stat label="متمایز" value={formatNumber(p.distinctCount)} />
                <Stat label="کمینه" value={p.min !== undefined ? fmt(p.min) : '—'} />
                <Stat label="بیشینه" value={p.max !== undefined ? fmt(p.max) : '—'} />
                {p.mean !== undefined && <Stat label="میانگین" value={fmt(Math.round(p.mean * 100) / 100)} />}
                {p.median !== undefined && <Stat label="میانه" value={fmt(Math.round(p.median * 100) / 100)} />}
                {p.minLength !== undefined && <Stat label="طول کمینه" value={formatNumber(p.minLength)} />}
                {p.maxLength !== undefined && <Stat label="طول بیشینه" value={formatNumber(p.maxLength)} />}
              </div>

              <div>
                <p className="mb-1 text-muted-foreground">مقادیر پرتکرار (فراوانی — بخش ۹ سند):</p>
                <div className="space-y-1">
                  {p.topValues.slice(0, 4).map(tv => (
                    <div key={tv.value} className="flex items-center gap-2">
                      <span className="w-24 truncate" title={tv.value}>{tv.value || 'خالی'}</span>
                      <Progress value={tv.percent * 100} className="h-1.5 flex-1" />
                      <span className="w-14 text-left tabular-nums">{Math.round(tv.percent * 100)}٪</span>
                    </div>
                  ))}
                </div>
              </div>

              {p.patternViolations > 0 && (
                <p className="text-amber-600">{formatNumber(p.patternViolations)} مقدار خارج از الگوی نوع ستون</p>
              )}
              <div className="flex flex-wrap gap-1">
                {Object.entries(p.typeDistribution).map(([t, n]) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t === 'number' ? 'عدد' : t === 'date' ? 'تاریخ' : t === 'boolean' ? 'منطقی' : 'متن'}: {formatNumber(n)}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-medium ${warn ? 'text-amber-600' : ''}`}>{value}</span>
    </div>
  )
}

function fmt(v: number | string): string {
  if (typeof v === 'number') return formatNumber(v)
  return String(v).length > 20 ? String(v).slice(0, 20) + '…' : String(v)
}
