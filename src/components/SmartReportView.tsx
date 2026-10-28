'use client'

// گزارش چاپی هوشمند درون‌برنامه‌ای — همان گزارشی که سامانه خودش می‌سازد
// خروجی موتور داشبورد خودکار به سند چاپ‌پذیر (چاپ/PDF و دانلود HTML مستقل) تبدیل می‌شود؛
// دقیقاً همان ظاهر نمونه‌های HTML کاربر اما برای «هر» مجموعه‌داده و بدون هیچ پیکربندی.
// پیش‌نمایش درون‌برنامه‌ای از همان سازنده گزارش مستقل (buildSmartReportInner) استفاده می‌کند
// تا ظاهر پیش‌نمایش، فایل دانلودی و لینک عمومی همیشه یکسان بماند.

import { useMemo } from 'react'
import type { AutoDash } from '@/lib/autodash'
import { buildSmartReportInner, SMART_REPORT_CSS } from '@/lib/smart-report'
import { Button } from '@/components/ui/button'
import { Tip } from '@/components/HelpTip'
import { Printer, FileCode2 } from 'lucide-react'

export default function SmartReportView({ dash, datasetName, dataVersion, columnCount, projectName, canExportHtml, datasetId }: {
  dash: AutoDash
  datasetName: string
  dataVersion: number
  columnCount?: number
  projectName?: string
  canExportHtml?: boolean
  datasetId?: string
}) {
  const metaFa = useMemo(
    () => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()),
    [], // ثابت در عمر هر نصب — بازسازی هر بار که داشبورد بارگذاری می‌شود
  )

  // سند گزارش — بدون دستکاری memoization (سازگار با React Compiler)
  const html = buildSmartReportInner(dash, {
    title: dash.title || `${datasetName} — گزارش هوشمند`,
    datasetName,
    project: projectName,
    rowCount: dash.rowCount,
    columnCount: columnCount ?? 0,
    dataVersion,
    generatedAtFa: metaFa,
  })

  return (
    <div className="smart-report-doc space-y-3">
      {/* استایل گزارش + قاعده چاپ: هنگام چاپ فقط سند گزارش دیده می‌شود */}
      <style dangerouslySetInnerHTML={{ __html: SMART_REPORT_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .smart-report-doc, .smart-report-doc * { visibility: visible !important; }
          .smart-report-doc { position: absolute; inset: 0; padding: 0; }
          .smart-report-doc .no-print { display: none !important; }
          .smart-report-doc .page { max-width: none; }
        }
      ` }} />

      <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="text-xs leading-5 text-emerald-800 dark:text-emerald-300">
          این گزارش به‌صورت خودکار توسط سامانه ساخته شده است — برای دریافت فایل مشابه نمونه‌های HTML، از «دانلود HTML» استفاده کنید یا با «چاپ / PDF» خروجی بگیرید.
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tip label="چاپ گزارش یا ذخیره به‌صورت PDF — قالب A4 فارسی و راست‌به‌چپ" side="bottom">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => window.print()}>
              <Printer className="size-3.5" /> چاپ / PDF
            </Button>
          </Tip>
          {canExportHtml && datasetId && (
            <Tip label="دانلود گزارش به‌صورت فایل HTML مستقل — دقیقاً مشابه نمونه‌های ارسالی شما، قابل باز شدن در هر مرورگر" side="bottom">
              <Button size="sm" className="gap-1.5 text-xs" asChild>
                <a href={`/api/datasets/${datasetId}/smart-report?download=1`}>
                  <FileCode2 className="size-3.5" /> دانلود HTML
                </a>
              </Button>
            </Tip>
          )}
        </div>
      </div>

      {/* سند گزارش — همان خروجی فایل مستقل */}
      <div
        className="rounded-xl border bg-white p-4 dark:bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
