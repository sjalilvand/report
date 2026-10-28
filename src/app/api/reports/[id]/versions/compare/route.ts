// مقایسه دو نسخه گزارش — بخش ۲۶.۱ سند («مقایسه نسخه‌ها»)
// پارامترهای from و to: شماره نسخه مبدأ و مقصد
// نسخه «current» یعنی پیکربندی جاری گزارش

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { diffReportConfigs, ReportConfigLike } from '@/lib/reportdiff'
import { FieldMeta } from '@/lib/types'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(req)
    const { id } = await ctx.params
    const fromParam = req.nextUrl.searchParams.get('from')
    const toParam = req.nextUrl.searchParams.get('to')
    if (!fromParam || !toParam) return fail('شماره نسخه مبدأ (from) و مقصد (to) الزامی است.')

    const report = await db.report.findUnique({ where: { id } })
    if (!report) return fail('گزارش یافت نشد.', 404)

    // برچسب ستون‌ها برای نمایش قابل فهم تغییرات
    let fields: FieldMeta[] = []
    if (report.datasetId) {
      const ds = await db.dataset.findUnique({ where: { id: report.datasetId } })
      if (ds) fields = parseJson<FieldMeta[]>(ds.fields, [])
    }

    const resolveCfg = async (v: string): Promise<{ version: number; config: ReportConfigLike } | null> => {
      if (v === 'current') return { version: report!.version, config: parseJson<ReportConfigLike>(report!.config, {}) }
      const num = Number(v)
      if (!Number.isInteger(num)) return null
      const ver = await db.reportVersion.findUnique({
        where: { reportId_version: { reportId: id, version: num } },
      })
      if (!ver) return null
      return { version: ver.version, config: parseJson<ReportConfigLike>(ver.config, {}) }
    }

    const from = await resolveCfg(fromParam)
    const to = await resolveCfg(toParam)
    if (!from) return fail('نسخه مبدأ یافت نشد.', 404)
    if (!to) return fail('نسخه مقصد یافت نشد.', 404)

    const diff = diffReportConfigs(from.version, to.version, from.config, to.config, fields)
    return ok(diff)
  } catch (e) {
    return errorResponse(e)
  }
}
