// گزارش هوشمند مستقل (فایل HTML) — «گزارشاتی که خود سامانه می‌سازد»
// GET: از هر مجموعه‌داده‌ای بدون پیکربندی، گزارش HTML زیبا و چاپ‌پذیر می‌سازد (مانند نمونه‌های کاربر)
// ?download=1 → دانلود فایل | بدون پارامتر → نمایش درون‌مرورگری
// ماسک اطلاعات حساس و قواعد دسترسی سطح سطر — همان داشبورد خودکار (بخش ۲۹ سند)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fail, parseJson } from '@/lib/server'
import { FieldMeta, DataRow } from '@/lib/types'
import { requireUser, errorResponse, applyRowRules, maskRecords, maskFieldsMeta, RowRule } from '@/lib/auth'
import { buildAutoDashboard, applyLayout, AutoDashLayout } from '@/lib/autodash'
import { buildSmartReportHtml, SmartReportMeta } from '@/lib/smart-report'

const faNow = (): string => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const ds = await db.dataset.findUnique({ where: { id }, include: { project: true } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const visibleFields = maskFieldsMeta(fields, user.role)
    const masked = maskRecords(records, fields, user.role)

    const dash = buildAutoDashboard(ds.name, masked, visibleFields)
    const config = parseJson<Record<string, unknown>>(ds.config, {})
    const layout = parseJson<AutoDashLayout | null>((config.autoDashLayout as string) ?? null, null)
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
    const download = req.nextUrl.searchParams.get('download') === '1'
    const baseName = `smart-report-${ds.name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60) || 'dataset'}`
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        ...(download ? { 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(baseName + '.html')}` } : {}),
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
