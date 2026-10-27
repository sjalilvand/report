// API بارگذاری فایل — بخش ۶ (مرحله دوم) و بخش ۷ سند
// شناسایی ساختار، ثبت اثر انگشت، تشخیص فایل تکراری
// امنیت فایل — بخش ۲۹: بررسی محتوای فایل نه فقط پسوند، سقف حجم و تعداد، عدم اجرای ماکرو

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { pushSystemNotification } from '@/lib/alerts'
import { detectWorkbook, fingerprintBuffer } from '@/lib/excel'
import { requirePerm, errorResponse } from '@/lib/auth'
import { getSettings } from '@/lib/settings'

export const maxDuration = 60

// بررسی امضای بایت (Magic Bytes) — بخش ۲۹ سند: بررسی محتوای فایل، نه فقط پسوند
function inspectContent(buf: Buffer, fileName: string): { ok: true; kind: string } | { ok: false; reason: string } {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  const hasOLE = buf.length > 8 && buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0
  const hasZIP = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4B && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)

  if (['xlsx', 'xlsm'].includes(ext)) {
    if (hasOLE) {
      // XLSX رمزگذاری‌شده در ظرف OLE ذخیره می‌شود — بخش ۳.۳ سند
      return { ok: false, reason: 'فایل اکسل رمزگذاری‌شده است (ساختار OLE شناسایی شد). نسخه بدون رمز را بارگذاری کنید (بخش ۳.۳ سند).' }
    }
    if (!hasZIP) return { ok: false, reason: 'محتوای فایل با پسوند XLSX هم‌خوان نیست؛ فایل باید یک بسته اکسل معتبر باشد (بررسی محتوای فایل — بخش ۲۹ سند).' }
    return { ok: true, kind: 'ooxml' }
  }
  if (ext === 'xls') {
    if (!hasOLE) return { ok: false, reason: 'محتوای فایل با پسوند XLS هم‌خوان نیست (بررسی محتوای فایل — بخش ۲۹ سند).' }
    return { ok: true, kind: 'ole' }
  }
  if (['csv', 'tsv', 'txt'].includes(ext)) {
    if (hasZIP || hasOLE) return { ok: false, reason: 'فایل متنی اعلام‌شده در واقع بسته باینری است؛ بارگذاری مسدود شد (بخش ۲۹ سند).' }
    // کنترل متن بودن: نبود بایت‌های کنترلی غیرمجاز
    const head = buf.subarray(0, Math.min(2048, buf.length))
    let suspicious = 0
    for (const b of head) if (b < 9 || (b > 13 && b < 32)) suspicious++
    if (suspicious > head.length * 0.05) return { ok: false, reason: 'محتوا متنی معتبر نیست؛ فایل خراب یا باینری است.' }
    return { ok: true, kind: 'text' }
  }
  if (ext === 'zip') return { ok: false, reason: 'بارگذاری ZIP در این نسخه فعال نیست (بخش ۳.۱ سند: توسعه‌ای با محدودیت امنیتی).' }
  return { ok: false, reason: 'پسوند فایل پشتیبانی نمی‌شود؛ فرمت‌های مجاز: XLSX، XLSM، XLS، CSV، TSV (بخش ۳.۱ سند).' }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'file.upload')
    const settings = await getSettings()
    const form = await req.formData()
    const file = form.get('file') as File | null
    const projectId = String(form.get('projectId') ?? '')
    if (!file) return fail('فایلی ارسال نشده است.')
    if (!projectId) return fail('پروژه مشخص نشده است.')

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return fail('پروژه یافت نشد.', 404)

    // سقف تعداد فایل پروژه — بخش ۳۰.۱ و ۳۶ سند (ظرفیت)
    const fileCount = await db.sourceFile.count({ where: { projectId } })
    if (fileCount >= settings.maxFilesPerProject) {
      return fail(`سقف تعداد فایل پروژه (${settings.maxFilesPerProject.toLocaleString('fa-IR')}) پر است؛ ظرفیت را در تنظیمات افزایش دهید (بخش ۳۰.۱ سند).`, 413)
    }

    // سقف حجم فایل — بخش ۳۰.۱ و ۳۶ سند
    if (file.size > settings.maxFileSizeMB * 1024 * 1024) {
      return fail(`حجم فایل بیش از سقف مجاز ${settings.maxFileSizeMB.toLocaleString('fa-IR')} مگابایت است (بخش ۳۰.۱ سند: اهداف ظرفیت).`, 413)
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length === 0) return fail('فایل خالی است.')

    // بررسی محتوای فایل نه فقط پسوند + مقابله با فایل مخرب — بخش ۲۹ سند
    const inspection = inspectContent(buf, file.name)
    if (!inspection.ok) {
      // شکست پردازش → اعلان خودکار — بخش ۲۶.۲ سند
      await pushSystemNotification({
        projectId,
        type: 'processFailure',
        severity: 'critical',
        title: 'شکست پردازش فایل',
        message: `پردازش فایل «${file.name}» ناموفق بود: ${inspection.reason}`,
        entityType: 'file',
      }).catch(() => undefined)
      await logAudit(projectId, 'شکست پردازش', `فایل «${file.name}» پذیرفته نشد: ${inspection.reason}`, user.name).catch(() => undefined)
      return fail(inspection.reason, 415)
    }

    const fp = fingerprintBuffer(buf)

    // تشخیص فایل تکراری بر اساس اثر انگشت محتوا — بخش ۷.۱
    const existing = await db.sourceFile.findUnique({ where: { projectId_fingerprint: { projectId, fingerprint: fp } } })
    if (existing) {
      return ok({ duplicate: true, message: 'این فایل قبلاً بارگذاری شده است (تشخیص بر اساس اثر انگشت محتوا — بخش ۷.۱ سند).', fileId: existing.id }, 200)
    }

    // شناسایی ساختار — بخش ۶ (مرحله سوم)
    const detection = detectWorkbook(buf)

    const saved = await db.sourceFile.create({
      data: {
        projectId,
        name: file.name,
        size: buf.length,
        mimeType: file.type || 'application/octet-stream',
        fingerprint: fp,
        content: buf.toString('base64'),
        sheetInfo: JSON.stringify(detection.sheets),
        uploadedBy: user.name,
      },
    })

    await logAudit(projectId, 'بارگذاری فایل', `فایل «${file.name}» با ${detection.sheets.length} شیت ثبت شد`, user.name)

    return ok({
      fileId: saved.id,
      name: saved.name,
      size: saved.size,
      fingerprint: fp,
      duplicate: false,
      detection,
    }, 201)
  } catch (e) {
    // شکست پردازش — اعلان خودکار در صورت شناسایی پروژه — بخش ۲۶.۲ سند
    try {
      const form = await req.formData().catch(() => null)
      const pid = form?.get('projectId')
      if (pid) {
        await pushSystemNotification({
          projectId: String(pid),
          type: 'processFailure',
          severity: 'critical',
          title: 'شکست پردازش فایل',
          message: `خطا در بارگذاری: ${e instanceof Error ? e.message : 'خطای ناشناخته'}`,
          entityType: 'file',
        })
        await logAudit(String(pid), 'شکست پردازش', e instanceof Error ? e.message : 'خطای ناشناخته')
      }
    } catch { /* بی‌صدا */ }
    return errorResponse(e)
  }
}
