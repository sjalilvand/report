// API مجموعه‌داده‌ها — بخش ۶ (مرحله چهارم و پنجم) و بخش ۸ سند
// ایجاد مجموعه‌داده از شیت انتخاب‌شده با متادیتای فیلدها

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { extractTable, ExtractConfig } from '@/lib/excel'
import { parseJson, buildFieldMetas, rekeyRecords } from '@/lib/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const fileId = String(body.fileId ?? '')
    const sheetName = String(body.sheetName ?? '')
    const name = String(body.name ?? '').trim() || `${sheetName}`
    if (!fileId || !sheetName) return fail('فایل و شیت باید مشخص باشند.')

    const file = await db.sourceFile.findUnique({ where: { id: fileId } })
    if (!file) return fail('فایل یافت نشد.', 404)

    const buf = Buffer.from(file.content, 'base64')
    const sheetInfo = parseJson<{ dataStartRow: number; dataEndRow: number; headerCandidate: number }[]>(file.sheetInfo, [])
    const info = sheetInfo.find(s => s.name === sheetName)

    const cfg: ExtractConfig = {
      headerRow: Number(body.headerRow ?? info?.headerCandidate ?? 0),
      firstDataRow: Number(body.firstDataRow ?? info?.dataStartRow ?? 1),
      lastDataRow: body.lastDataRow !== undefined && body.lastDataRow !== null ? Number(body.lastDataRow) : (info ? info.dataEndRow : -1),
      mergedPolicy: (body.mergedPolicy ?? 'fill-down') as ExtractConfig['mergedPolicy'],
      skipTotalRows: body.skipTotalRows !== false,
      skipHiddenRows: true,
    }

    const result = extractTable(buf, sheetName, cfg)
    if (result.records.length === 0) return fail('هیچ رکوردی در دامنه انتخابی یافت نشد؛ دامنه داده را اصلاح کنید.')

    const fields = buildFieldMetas(result.headers, result.records, result.colWidths)
    const keyed = rekeyRecords(result.records, fields)

    const dataset = await db.dataset.create({
      data: {
        projectId: file.projectId,
        fileId,
        name,
        sheetName,
        headerRow: cfg.headerRow,
        firstDataRow: cfg.firstDataRow,
        lastDataRow: cfg.lastDataRow,
        config: JSON.stringify({ ...cfg, warnings: result.warnings }),
        fields: JSON.stringify(fields),
        records: JSON.stringify(keyed),
        rowCount: result.records.length,
        version: 1,
      },
    })

    await logAudit(file.projectId, 'ایجاد مجموعه‌داده', `مجموعه‌داده «${name}» با ${result.records.length} رکورد و ${fields.length} ستون ساخته شد`)

    return ok({ datasetId: dataset.id, rowCount: result.records.length, fieldCount: fields.length, warnings: result.warnings }, 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'خطا در ایجاد مجموعه‌داده')
  }
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return fail('شناسه پروژه الزامی است.')
  const datasets = await db.dataset.findMany({
    where: { projectId },
    select: { id: true, name: true, sheetName: true, rowCount: true, version: true, status: true, updatedAt: true, fields: true },
    orderBy: { updatedAt: 'desc' },
  })
  return ok(datasets)
}
