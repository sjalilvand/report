// تجمیع چند فایل هم‌فرم — چندین فایل اکسل با ساختار یکسان (مثلاً فیش حقوقی چند ماه یا
// تراکنش‌های چند دوره) به یک مجموعه‌داده تبدیل می‌شوند تا داشبورد و گزارش هوشمند روی
// کل داده ساخته شود.
//
// POST با dryRun=true: فقط بررسی و مقایسه ساختار فایل‌ها (بدون ساخت مجموعه‌داده)
// POST با dryRun=false: تجمیع واقعی و ساخت مجموعه‌داده یکپارچه + ستون «فایل مبدأ»

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson, buildFieldMetas, rekeyRecords } from '@/lib/server'
import { extractTable, ExtractConfig } from '@/lib/excel'
import { requirePerm, errorResponse } from '@/lib/auth'
import { getSettings } from '@/lib/settings'

export const maxDuration = 120

interface MergeItem { fileId: string; sheetName: string }

function normHeader(h: string): string {
  return h.replace(/[\u200c\u200f\u200e]/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim().toLowerCase()
}

// استخراج رکوردهای یک شیت با پیکربندی شناسایی‌شده خودِ فایل
function extractOf(buf: Buffer, sheetName: string, sheetInfoRaw: string): { result: ReturnType<typeof extractTable> | null; headerRow: number; error?: string } {
  const infos = parseJson<{ name?: string; dataStartRow: number; dataEndRow: number; headerCandidate: number }[]>(sheetInfoRaw, [])
  const info = infos.find(s => s.name === sheetName)
  const headerRow = info?.headerCandidate ?? 0
  const cfg: ExtractConfig = {
    headerRow,
    firstDataRow: info?.dataStartRow ?? 1,
    lastDataRow: info ? info.dataEndRow : -1,
    mergedPolicy: 'fill-down',
    skipTotalRows: true,
    skipHiddenRows: true,
  }
  try {
    return { result: extractTable(buf, sheetName, cfg), headerRow }
  } catch (e) {
    return { result: null, headerRow, error: e instanceof Error ? e.message : 'خطا در خواندن شیت' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'dataset.create')
    const settings = await getSettings()
    const body = await req.json().catch(() => null)
    if (!body) return fail('درخواست نامعتبر است.')
    const projectId = String(body.projectId ?? '')
    const items = Array.isArray(body.items) ? (body.items as MergeItem[]) : []
    const dryRun = body.dryRun === true
    const name = String(body.name ?? '').trim()
    if (!projectId) return fail('پروژه مشخص نشده است.')
    if (items.length < 2) return fail('برای تجمیع، دست‌کم دو فایل باید انتخاب شود.')

    // ظرفیت مجموعه‌داده — بخش ۳۰.۱ سند
    const dsCount = await db.dataset.count({ where: { projectId } })
    if (!dryRun && dsCount >= settings.maxDatasetsPerProject) {
      return fail(`سقف تعداد مجموعه‌داده پروژه (${settings.maxDatasetsPerProject.toLocaleString('fa-IR')}) پر است.`, 413)
    }

    // بارگذاری همه فایل‌ها و بررسی تعلق به پروژه
    const fileIds = [...new Set(items.map(i => String(i.fileId ?? '')))]
    const files = await db.sourceFile.findMany({ where: { id: { in: fileIds }, projectId } })
    const fileMap = new Map(files.map(f => [f.id, f]))

    const perFile: {
      fileId: string; fileName: string; sheetName: string
      headers: string[]; rowCount: number; headerRow: number; ok: boolean; message?: string
    }[] = []
    const parsed: { fileName: string; headers: string[]; records: Record<string, unknown>[] }[] = []

    for (const item of items) {
      const file = fileMap.get(String(item.fileId))
      const sheetName = String(item.sheetName ?? '')
      if (!file) {
        perFile.push({ fileId: item.fileId, fileName: item.fileId, sheetName, headers: [], rowCount: 0, headerRow: 0, ok: false, message: 'فایل یافت نشد یا به این پروژه تعلق ندارد.' })
        continue
      }
      const buf = Buffer.from(file.content, 'base64')
      const ex = extractOf(buf, sheetName, file.sheetInfo)
      if (!ex.result) {
        perFile.push({ fileId: file.id, fileName: file.name, sheetName, headers: [], rowCount: 0, headerRow: ex.headerRow, ok: false, message: ex.error ?? 'خواندن شیت ناموفق بود.' })
        continue
      }
      const res = ex.result
      if (res.records.length === 0) {
        perFile.push({ fileId: file.id, fileName: file.name, sheetName, headers: res.headers, rowCount: 0, headerRow: ex.headerRow, ok: false, message: 'در دامنه شناسایی‌شده این شیت رکوردی یافت نشد.' })
        continue
      }
      perFile.push({ fileId: file.id, fileName: file.name, sheetName, headers: res.headers, rowCount: res.records.length, headerRow: ex.headerRow, ok: true })
      parsed.push({ fileName: file.name, headers: res.headers, records: res.records as Record<string, unknown>[] })
    }

    // مقایسه ساختار (هم‌فرم بودن)
    const successful = parsed.filter(p => p.headers.length > 0)
    let allMatch = successful.length === items.length && successful.length >= 2
    const mismatch: { fileName: string; missing: string[]; extra: string[] }[] = []
    if (successful.length >= 2) {
      const baseSig = normHeader(successful[0].headers.join('\u0001'))
      for (const p of successful.slice(1)) {
        const sig = normHeader(p.headers.join('\u0001'))
        if (sig !== baseSig) {
          allMatch = false
          const baseSet = new Set(successful[0].headers.map(normHeader))
          const curSet = new Set(p.headers.map(normHeader))
          mismatch.push({
            fileName: p.fileName,
            missing: successful[0].headers.filter(h => !curSet.has(normHeader(h))),
            extra: p.headers.filter(h => !baseSet.has(normHeader(h))),
          })
        }
      }
    }

    if (dryRun) {
      return ok({
        dryRun: true, allMatch, mismatch, perFile,
        totalRows: successful.reduce((s, p) => s + p.records.length, 0),
        headers: successful[0]?.headers ?? [],
      })
    }

    if (successful.length < 2) {
      return fail('دست‌کم دو فایل با رکورد معتبر برای تجمیع لازم است.')
    }
    if (!allMatch) {
      return ok({ allMatch, mismatch, perFile, error: 'ساختار ستون‌های همه فایل‌ها یکسان نیست؛ تجمیع مستقیم ممکن نیست.' }, 200)
    }

    // تجمیع رکوردها + ستون «فایل مبدأ»
    const headers = successful[0].headers
    const SOURCE_COL = 'فایل مبدأ'
    const allHeaders = [...headers, SOURCE_COL]
    const merged: Record<string, unknown>[] = []
    for (const p of successful) {
      for (const rec of p.records) {
        const row: Record<string, unknown> = {}
        for (const h of headers) row[h] = rec[h] ?? null
        row[SOURCE_COL] = p.fileName.replace(/\.[^.]+$/, '')
        merged.push(row)
      }
    }

    // ظرفیت ردیف/ستون — بخش ۳۰.۱ سند
    if (merged.length > settings.maxRowsPerDataset) {
      return fail(`تعداد سطر تجمیع‌شده (${merged.length.toLocaleString('fa-IR')}) بیش از سقف مجاز ${settings.maxRowsPerDataset.toLocaleString('fa-IR')} است.`, 413)
    }
    if (allHeaders.length > settings.maxColumnsPerDataset) {
      return fail(`تعداد ستون (${allHeaders.length.toLocaleString('fa-IR')}) بیش از سقف مجاز است.`, 413)
    }

    // نخستین فایل به‌عنوان منبع ثبت می‌شود (داده کامل در خود مجموعه‌داده ذخیره می‌شود)
    const primaryFile = fileMap.get(items[0].fileId)
    const fields = buildFieldMetas(allHeaders, merged, allHeaders.map(() => 18))
    const keyed = rekeyRecords(merged, fields)
    const dsName = name || `تجمیع ${successful.length.toLocaleString('fa-IR')} فایل`

    const dataset = await db.dataset.create({
      data: {
        projectId,
        fileId: primaryFile?.id ?? null,
        name: dsName,
        sheetName: 'تجمیع',
        headerRow: perFile.find(p => p.ok)?.headerRow ?? 0,
        firstDataRow: 1,
        lastDataRow: 0,
        config: JSON.stringify({
          merged: true,
          sources: successful.map(p => ({ fileName: p.fileName, sheetName: perFile.find(x => x.fileName === p.fileName)?.sheetName, rows: p.records.length })),
          mergedAt: new Date().toISOString(),
          mergedBy: user.name,
        }),
        fields: JSON.stringify(fields),
        records: JSON.stringify(keyed),
        rowCount: merged.length,
        version: 1,
      },
    })

    await logAudit(projectId, 'تجمیع فایل‌ها', `${successful.length.toLocaleString('fa-IR')} فایل با ${merged.length.toLocaleString('fa-IR')} رکورد در مجموعه‌داده «${dsName}» تجمیع شد`, user.name)

    return ok({
      datasetId: dataset.id,
      rowCount: merged.length,
      fieldCount: allHeaders.length,
      sourceCount: successful.length,
      sources: successful.map(p => ({ fileName: p.fileName, rows: p.records.length })),
      warnings: [],
    }, 201)
  } catch (e) {
    return errorResponse(e)
  }
}
