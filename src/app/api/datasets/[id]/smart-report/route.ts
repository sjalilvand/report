// گزارش هوشمند مستقل (فایل HTML) — «گزارشاتی که خود سامانه می‌سازد»
// GET: از هر مجموعه‌داده‌ای بدون پیکربندی گزارش می‌سازد.
// فاز هجدهم: اگر فایل منبع ساختار چندسطحی (شیت سالانه، ماه‌ها، مقدار/مبلغ) داشته باشد،
// موتور تحلیل عمیق فعال می‌شود و گزارش تحلیلی جامع (خلاصه مدیریتی، روند سالانه/ماهانه/فصلی،
// ترکیب سبد، تحلیل مالی، قراردادها، SWOT، نقشه راه و صحت‌سنجی) ساخته می‌شود؛
// در غیر این‌صورت گزارش عمومی داشبورد خودکار ارائه می‌شود.
// ?download=1 → دانلود فایل | بدون پارامتر → نمایش درون‌مرورگری
// ماسک اطلاعات حساس و قواعد دسترسی سطح سطر — همان داشبورد خودکار (بخش ۲۹ سند)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fail, parseJson } from '@/lib/server'
import { FieldMeta, DataRow } from '@/lib/types'
import { requireUser, errorResponse, applyRowRules, maskRecords, maskFieldsMeta, RowRule } from '@/lib/auth'
import { buildAutoDashboard, applyLayout, AutoDashLayout } from '@/lib/autodash'
import { buildSmartReportHtml, SmartReportMeta } from '@/lib/smart-report'
import { buildDeepAnalysis } from '@/lib/deep-analysis'
import { buildDeepReportHtml, DeepReportMeta } from '@/lib/deep-report'

const faNow = (): string => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const ds = await db.dataset.findUnique({ where: { id }, include: { project: true, file: true } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const visibleFields = maskFieldsMeta(fields, user.role)
    const masked = maskRecords(records, fields, user.role)

    const config = parseJson<Record<string, unknown>>(ds.config, {})
    const layout = parseJson<AutoDashLayout | null>((config.autoDashLayout as string) ?? null, null)

    const baseName = `smart-report-${ds.name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60) || 'dataset'}`
    const download = req.nextUrl.searchParams.get('download') === '1'
    const commonHeaders = {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...(download ? { 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(baseName + '.html')}` } : {}),
    }

    // ── مسیر تحلیل عمیق: فایل منبع باید موجود باشد ──
    if (ds.file?.content) {
      try {
        const buf = Buffer.from(ds.file.content, 'base64')
        const deep = buildDeepAnalysis(ds.name, [{ name: ds.file.name, buffer: buf }])
        if (deep.ok) {
          const meta: DeepReportMeta = {
            title: (layout?.title?.trim() || ds.name) + ' — گزارش تحلیلی جامع',
            datasetName: ds.name,
            project: ds.project?.name,
            rowCount: masked.length,
            columnCount: visibleFields.length,
            dataVersion: ds.version,
            generatedAtFa: faNow(),
            confidentialHidden: fields.length - visibleFields.length,
            sourceFileName: ds.file.name,
          }
          return new NextResponse(buildDeepReportHtml(deep, meta), { status: 200, headers: commonHeaders })
        }
      } catch {
        // خطای تحلیل عمیق → سقوط به مسیر عمومی
      }
    }

    // ── مسیر عمومی (داشبورد خودکار) ──
    const dash = buildAutoDashboard(ds.name, masked, visibleFields)
    const applied = applyLayout(dash, layout)

    const meta: SmartReportMeta = {
      title: (layout?.title?.trim() || ds.name) + ' — گزارش هوشمند',
      datasetName: ds.name,
      project: ds.project?.name,
      rowCount: masked.length,
      columnCount: visibleFields.length,
      dataVersion: ds.version,
      generatedAtFa: faNow(),
      confidentialHidden: fields.length - visibleFields.length,
    }

    const html = buildSmartReportHtml(applied, meta)
    return new NextResponse(html, { status: 200, headers: commonHeaders })
  } catch (e) {
    return errorResponse(e)
  }
}
