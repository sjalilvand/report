// پیش‌نمایش و استخراج جدول از شیت با پیکربندی مدیر — بخش ۶ (مرحله سوم و چهارم)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/server'
import { extractTable, ExtractConfig } from '@/lib/excel'
import { buildFieldMetas, rekeyRecords, parseJson } from '@/lib/server'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sp = req.nextUrl.searchParams
  const sheetName = sp.get('sheet') ?? ''
  const headerRowParam = sp.get('headerRow')
  const firstDataRowParam = sp.get('firstDataRow')
  const lastDataRowParam = sp.get('lastDataRow')
  const mergedPolicy = (sp.get('mergedPolicy') ?? 'fill-down') as ExtractConfig['mergedPolicy']
  const skipTotalRows = sp.get('skipTotalRows') !== 'false'
  const mode = sp.get('mode') ?? 'preview' // preview | full

  const file = await db.sourceFile.findUnique({ where: { id } })
  if (!file) return fail('فایل یافت نشد.', 404)

  try {
    const buf = Buffer.from(file.content, 'base64')
    const sheetInfo = parseJson<{ name: string; dataStartRow: number; dataEndRow: number; headerCandidate: number }[]>(file.sheetInfo, [])
    const info = sheetInfo.find(s => s.name === sheetName)

    const cfg: ExtractConfig = {
      // بدون پارامتر صریح، پیشنهاد شناسایی خودکار سامانه مبناست — بخش ۶ (مرحله سوم)
      headerRow: headerRowParam !== null && Number.isFinite(+headerRowParam) ? +headerRowParam : (info?.headerCandidate ?? 0),
      firstDataRow: firstDataRowParam !== null && Number.isFinite(+firstDataRowParam) && +firstDataRowParam >= 0 ? +firstDataRowParam : (info ? info.dataStartRow : 1),
      lastDataRow: lastDataRowParam !== null && Number.isFinite(+lastDataRowParam) ? +lastDataRowParam : (info ? info.dataEndRow : -1),
      mergedPolicy,
      skipTotalRows,
      skipHiddenRows: true,
    }

    const result = extractTable(buf, sheetName, cfg)
    const fields = buildFieldMetas(result.headers, result.records, result.colWidths)
    const keyed = rekeyRecords(result.records, fields)

    if (mode === 'full') {
      return ok({ ...result, records: keyed, rowCount: result.records.length, fields, config: cfg })
    }

    // پیش‌نمایش محدود — بخش ۳۰.۱ (پیش‌نمایش محدود به نمونه مناسب)
    const previewRows = result.records.slice(0, 15)
    return ok({ ...result, records: undefined, previewRows, rowCount: result.records.length, fields, config: cfg })
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'خطا در استخراج جدول')
  }
}
