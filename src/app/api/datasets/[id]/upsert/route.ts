// API به‌روزرسانی فایل و Upsert — بخش ۲۴ سند
// ۲۴.۱: سه روش جایگزینی کامل، افزودن رکوردهای جدید، به‌روزرسانی و درج بر اساس کلید (Upsert)
// ۲۴.۲: کنترل تغییر ساختار فایل جدید (حذف/اضافه ستون، تغییر نام/نوع/واحد)
//        در صورت اثر بر گزارش منتشرشده → توقف به‌روزرسانی و اخذ تأیید مدیر
// ۲۴.۳: نسخه‌بندی داده و امکان بازگشت (نسخه در هر به‌روزرسانی افزایش می‌یابد)
// حفظ داده خام: فایل جدید به‌عنوان نسخه جدید SourceFile ثبت می‌شود و فایل قبلی دست‌نخورده می‌ماند (بخش ۴)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { extractTable, ExtractConfig, detectWorkbook, fingerprintBuffer } from '@/lib/excel'
import { detectColumn } from '@/lib/detect'
import { rekeyRecords } from '@/lib/server'
import { requirePerm, errorResponse, can, ROLE_LABELS } from '@/lib/auth'
import { pushSystemNotification } from '@/lib/alerts'
import { getSettings } from '@/lib/settings'
import { FieldMeta, DataRow } from '@/lib/types'

export const maxDuration = 60

interface StructureChange {
  kind: 'added' | 'removed' | 'typeChanged' | 'unitChanged'
  field: string
  detail: string
}

// بررسی امضای بایت — همان سیاست مسیر بارگذاری (بخش ۲۹ سند)
function inspectContent(buf: Buffer, fileName: string): { ok: boolean; reason?: string } {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  const hasOLE = buf.length > 8 && buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0
  const hasZIP = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4B && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)
  if (['xlsx', 'xlsm'].includes(ext)) {
    if (hasOLE) return { ok: false, reason: 'فایل اکسل رمزگذاری‌شده است؛ نسخه بدون رمز را بارگذاری کنید (بخش ۳.۳ سند).' }
    if (!hasZIP) return { ok: false, reason: 'محتوای فایل با پسوند XLSX هم‌خوان نیست (بخش ۲۹ سند).' }
    return { ok: true }
  }
  if (ext === 'xls') return hasOLE ? { ok: true } : { ok: false, reason: 'محتوای فایل با پسوند XLS هم‌خوان نیست.' }
  if (['csv', 'tsv', 'txt'].includes(ext)) {
    if (hasZIP || hasOLE) return { ok: false, reason: 'فایل متنی اعلام‌شده در واقع باینری است (بخش ۲۹ سند).' }
    return { ok: true }
  }
  return { ok: false, reason: 'پسوند پشتیبانی نمی‌شود؛ فرمت‌های مجاز: XLSX، XLSM، XLS، CSV، TSV (بخش ۳.۱ سند).' }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const user = await requirePerm(req, 'dataset.edit')
    const settings = await getSettings()
    const form = await req.formData()
    const file = form.get('file') as File | null
    const mode = String(form.get('mode') ?? 'upsert') // replace | append | upsert
    const keyFieldIds = parseJson<string[]>(String(form.get('keyFieldIds') ?? '[]'), [])
    const sheetName = String(form.get('sheetName') ?? '') || undefined
    const confirmStructureChange = String(form.get('confirmStructureChange') ?? '') === 'true'

    if (!file) return fail('فایلی ارسال نشده است.')
    if (!['replace', 'append', 'upsert'].includes(mode)) return fail('روش به‌روزرسانی نامعتبر است (بخش ۲۴.۱ سند).')

    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const oldFields = parseJson<FieldMeta[]>(ds.fields, [])
    const oldRecords = parseJson<DataRow[]>(ds.records, [])
    const dsCfg = parseJson<{ headerRow?: number; firstDataRow?: number; lastDataRow?: number; mergedPolicy?: string }>(ds.config, {})

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length === 0) return fail('فایل خالی است.')
    const inspection = inspectContent(buf, file.name)
    if (!inspection.ok) return fail(inspection.reason ?? 'فایل نامعتبر است.', 415)

    // فایل یکسان → به‌روزرسانی بی‌معنا (اثر انگشت محتوا — بخش ۷.۱)
    const fp = fingerprintBuffer(buf)
    const sourceFile = await db.sourceFile.findUnique({ where: { id: ds.fileId } })
    if (sourceFile && sourceFile.fingerprint === fp) {
      return fail('فایل بارگذاری‌شده با فایل فعلی مجموعه‌داده یکسان است (تشخیص با اثر انگشت محتوا — بخش ۷.۱ سند).')
    }

    // شناسایی شیت‌ها و انتخاب شیت — ۲۴.۱
    const detection = detectWorkbook(buf)
    const targetSheet = sheetName ?? ds.sheetName
    const sheet = detection.sheets.find(s => s.name === targetSheet)
    if (!sheet) {
      return fail(`شیت «${targetSheet}» در فایل جدید یافت نشد؛ شیت‌های موجود: ${detection.sheets.map(s => `«${s.name}»`).join('، ')}`)
    }

    // استخراج جدول با همان پیکربندی مجموعه‌داده — ۲۴.۲ (ثبات دامنه داده)
    const cfg: ExtractConfig = {
      headerRow: Number(form.get('headerRow') ?? dsCfg.headerRow ?? ds.headerRow),
      firstDataRow: Number(form.get('firstDataRow') ?? dsCfg.firstDataRow ?? ds.firstDataRow),
      lastDataRow: form.get('lastDataRow') !== null && form.get('lastDataRow') !== undefined && String(form.get('lastDataRow')) !== ''
        ? Number(form.get('lastDataRow'))
        : (dsCfg.lastDataRow ?? ds.lastDataRow),
      mergedPolicy: (String(form.get('mergedPolicy') ?? dsCfg.mergedPolicy ?? 'fill-down')) as ExtractConfig['mergedPolicy'],
      skipTotalRows: true,
      skipHiddenRows: true,
    }
    let result
    try {
      result = extractTable(buf, targetSheet, cfg)
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'استخراج جدول از فایل جدید ناموفق بود.')
    }
    if (result.records.length === 0) return fail('هیچ رکوردی در فایل جدید یافت نشد؛ پیکربندی سطرها را بررسی کنید.')

    // ---------- کنترل تغییر ساختار — بخش ۲۴.۲ ----------
    // فیلدهای محاسباتی (فرمول/بازه) از فایل نمی‌آیند و نباید «حذف‌شده» تلقی شوند
    const isDerived = (f: FieldMeta) =>
      (f.description ?? '').startsWith('فیلد محاسباتی') || (f.description ?? '').startsWith('بازه مبتنی بر')
    const sourceFields = oldFields.filter(f => !isDerived(f))
    const derivedFields = oldFields.filter(isDerived)
    const changes: StructureChange[] = []
    const oldBySource = new Map(sourceFields.map(f => [f.sourceName, f]))
    const newHeaders = result.headers
    const newSet = new Set(newHeaders)
    const oldSet = new Set(sourceFields.map(f => f.sourceName))

    for (const h of newHeaders) if (!oldSet.has(h)) {
      changes.push({ kind: 'added', field: h, detail: 'ستون در فایل جدید اضافه شده است.' })
    }
    for (const f of sourceFields) if (!newSet.has(f.sourceName)) {
      changes.push({ kind: 'removed', field: f.sourceName, detail: 'ستون از فایل جدید حذف شده است؛ تغییر نام ستون به‌صورت حذف+اضافه دیده می‌شود.' })
    }
    for (const h of newHeaders) {
      const old = oldBySource.get(h)
      if (!old) continue
      const values = result.records.slice(0, 800).map(r => r[h])
      const det = detectColumn(values, h)
      if (det.detectedType !== old.type && det.confidence >= 0.6) {
        changes.push({ kind: 'typeChanged', field: h, detail: `نوع ستون از «${old.type}» به «${det.detectedType}» تغییر کرده است (اطمینان ${Math.round(det.confidence * 100)}٪).` })
      }
      if (old.unit && det.unitSuggestion && old.unit !== det.unitSuggestion) {
        changes.push({ kind: 'unitChanged', field: h, detail: `واحد ستون از «${old.unit}» به «${det.unitSuggestion}» تغییر کرده است (بخش ۲۴.۲ سند: تغییر واحد).` })
      }
    }

    // اثر بر گزارش منتشرشده — ۲۴.۲: توقف به‌روزرسانی انتشارشده و اخذ تأیید مدیر
    const publishedCount = await db.report.count({ where: { datasetId: ds.id, status: 'published' } })
    if (changes.length > 0 && !confirmStructureChange) {
      // اعلان خودکار تغییر ساختار — بخش ۲۶.۲ سند
      await pushSystemNotification({
        projectId: ds.projectId,
        type: 'structureChange',
        severity: publishedCount > 0 ? 'critical' : 'warning',
        title: 'تغییر ساختار مجموعه‌داده',
        message: publishedCount > 0
          ? `به‌روزرسانی «${ds.name}» به‌دلیل تغییر ساختار (${changes.map(c => c.detail).join(' ')} متوقف شد؛ تأیید مدیر لازم است — ۲۴.۲.`
          : `تغییر ساختار در «${ds.name}» شناسایی شد: ${changes.map(c => c.detail).join(' ')}`,
        entityType: 'dataset',
        entityId: ds.id,
      }).catch(() => undefined)
      return ok({
        requiresConfirmation: true,
        structureChanges: changes,
        publishedReports: publishedCount,
        message: publishedCount > 0
          ? `تغییر ساختار بر ${publishedCount.toLocaleString('fa-IR')} گزارش منتشرشده اثر دارد؛ به‌روزرسانی انتشارشده متوقف شد و تأیید مدیر لازم است (بخش ۲۴.۲ سند).`
          : 'تغییر ساختار شناسایی شد؛ برای ادامه، تأیید صریح لازم است (بخش ۲۴.۲ سند).',
        detected: { sheets: detection.sheets.map(s => ({ name: s.name, rows: s.rows, cols: s.cols })), rowCount: result.records.length },
      }, 409)
    }
    if (changes.length > 0 && confirmStructureChange && !can(user.role, 'report.approve')) {
      return fail(`تغییر ساختار فقط با تأیید مدیر داده یا مدیر سامانه پذیرفته می‌شود؛ نقش شما «${ROLE_LABELS[user.role]}» است (بخش ۲۴.۲ سند).`, 403)
    }

    // ---------- کلیدگذاری رکوردهای جدید با شناسه پایدار — بخش ۸.۲ ----------
    const keyed = rekeyRecords(result.records, oldFields)
    // ستون‌های اضافه‌شده: متادیتای جدید با شناسه برابر نام ستون (کلید رکوردها همان نام است)
    const addedFields: FieldMeta[] = []
    for (const h of newHeaders.filter(h => !oldSet.has(h))) {
      const values = result.records.slice(0, 800).map(r => r[h])
      const det = detectColumn(values, h)
      addedFields.push({
        id: h,
        sourceName: h,
        label: h,
        type: det.detectedType,
        detectedType: det.detectedType,
        confidence: det.confidence,
        role: det.roleSuggestion,
        unit: det.unitSuggestion,
        unitKind: det.unitSuggestion ? 'currency' : det.detectedType === 'percent' ? 'percent' : undefined,
        aggregation: det.roleSuggestion === 'measure' ? 'sum' : 'count',
        examples: [...new Set<string>(values.filter(v => v !== null && String(v).trim() !== '').map(v => String(v)))].slice(0, 3),
      })
    }
    const finalFields = [...oldFields, ...addedFields]

    // ---------- اعمال روش به‌روزرسانی — بخش ۲۴.۱ ----------
    const warnings: string[] = [...result.warnings]
    if (derivedFields.length > 0) {
      warnings.push(`${derivedFields.length.toLocaleString('fa-IR')} فیلد محاسباتی/بازه‌ای در مدل حفظ شد؛ مقادیر آن بر داده جدید باید مجدداً محاسبه شوند (بخش ۲۴.۳ سند: نسخه فرایند آماده‌سازی).`)
    }
    let finalRecords: DataRow[] = []
    let inserted = 0, updated = 0, unchanged = 0

    if (mode === 'replace') {
      finalRecords = keyed
      inserted = keyed.length
    } else if (mode === 'append') {
      finalRecords = [...oldRecords, ...keyed]
      inserted = keyed.length
    } else {
      // Upsert — به‌روزرسانی و درج بر اساس کلید
      if (keyFieldIds.length === 0) return fail('برای Upsert انتخاب حداقل یک فیلد کلید الزامی است (بخش ۲۴.۱ سند).')
      const known = new Set(finalFields.map(f => f.id))
      const missing = keyFieldIds.filter(k => !known.has(k))
      if (missing.length > 0) {
        return fail(`فیلدهای کلید در فایل جدید موجود نیستند: ${missing.map(m => oldFields.find(f => f.id === m)?.label ?? m).join('، ')}`)
      }
      const keyOfRec = (r: DataRow) => keyFieldIds.map(k => String(r[k] ?? '').trim()).join('§§')
      // کلید تکراری در فایل جدید: آخرین رکورد ملاک است
      const newByKey = new Map<string, DataRow>()
      let dupNew = 0
      for (const r of keyed) {
        const k = keyOfRec(r)
        if (k.replace(/§/g, '') === '') { warnings.push('رکوردی با کلید خالی نادیده گرفته شد.'); continue }
        if (newByKey.has(k)) dupNew++
        newByKey.set(k, r)
      }
      if (dupNew > 0) warnings.push(`${dupNew.toLocaleString('fa-IR')} کلید تکراری در فایل جدید؛ آخرین رکورد ملاک قرار گرفت.`)

      // ایندکس رکوردهای فعلی
      const oldByKey = new Map<string, { rec: DataRow; idx: number }>()
      oldRecords.forEach((r, idx) => oldByKey.set(keyOfRec(r), { rec: r, idx }))
      const working = [...oldRecords]
      for (const [k, nr] of newByKey) {
        const hit = oldByKey.get(k)
        if (!hit) {
          working.push(nr)
          inserted++
        } else {
          // مقدار خالیِ فایل جدید، مقدار قبلی را پاک نمی‌کند (سیاست ایمن)
          let changed = false
          const merged: DataRow = { ...hit.rec }
          for (const [fk, v] of Object.entries(nr)) {
            const empty = v === null || v === undefined || String(v).trim() === ''
            if (!empty && String(merged[fk] ?? '') !== String(v)) { merged[fk] = v; changed = true }
          }
          if (changed) { working[hit.idx] = merged; updated++ } else unchanged++
        }
      }
      finalRecords = working
    }

    // سقف ظرفیت — بخش ۳۰.۱
    if (finalRecords.length > settings.maxRowsPerDataset) {
      return fail(`تعداد سطر پس از به‌روزرسانی (${finalRecords.length.toLocaleString('fa-IR')}) بیش از سقف مجاز ${settings.maxRowsPerDataset.toLocaleString('fa-IR')} است (بخش ۳۰.۱ سند).`, 413)
    }

    // ---------- ذخیره فایل جدید به‌عنوان نسخه جدید SourceFile — بخش ۴ و ۲۴.۳ ----------
    let newFileId: string | undefined
    try {
      const created = await db.sourceFile.create({
        data: {
          projectId: ds.projectId,
          name: file.name,
          size: buf.length,
          mimeType: file.type || 'application/octet-stream',
          fingerprint: fp,
          content: buf.toString('base64'),
          sheetInfo: JSON.stringify(detection.sheets),
          uploadedBy: user.name,
          version: (sourceFile?.version ?? 1) + 1,
        },
      })
      newFileId = created.id
    } catch {
      // اثر انگشت تکراری در پروژه (فایل مشابه قبلاً مستقل بارگذاری شده) — مانع به‌روزرسانی نیست
      warnings.push('این فایل قبلاً در پروژه ثبت شده بود؛ نسخه جدیدی از فایل ایجاد نشد و داده همان فایل قبلی مبنا قرار گرفت.')
      newFileId = ds.fileId
    }

    const newVersion = ds.version + 1
    await db.dataset.update({
      where: { id: ds.id },
      data: {
        fileId: newFileId,
        records: JSON.stringify(finalRecords),
        fields: JSON.stringify(finalFields),
        rowCount: finalRecords.length,
        version: newVersion,
      },
    })

    const changeDesc = changes.length > 0
      ? ` | تغییر ساختار با تأیید ${ROLE_LABELS[user.role]}: ${changes.map(c => `${c.kind === 'added' ? 'افزودن' : c.kind === 'removed' ? 'حذف' : c.kind === 'typeChanged' ? 'تغییر نوع' : 'تغییر واحد'} «${c.field}»`).join('، ')}`
      : ''
    await logAudit(
      ds.projectId,
      'به‌روزرسانی فایل (بخش ۲۴)',
      `مجموعه‌داده «${ds.name}» با روش ${mode === 'replace' ? 'جایگزینی کامل' : mode === 'append' ? 'افزودن' : 'Upsert'} | درج ${inserted.toLocaleString('fa-IR')}، به‌روزرسانی ${updated.toLocaleString('fa-IR')}، بدون تغییر ${unchanged.toLocaleString('fa-IR')} | نسخه داده: ${newVersion}${changeDesc}`,
      user.name
    )

    return ok({
      mode,
      inserted,
      updated,
      unchanged,
      previousRowCount: oldRecords.length,
      rowCount: finalRecords.length,
      fieldCount: finalFields.length,
      addedFields: addedFields.map(f => f.label),
      version: newVersion,
      structureChanges: changes,
      warnings,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
