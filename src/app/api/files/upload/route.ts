// API بارگذاری فایل — بخش ۶ (مرحله دوم) و بخش ۷ سند
// شناسایی ساختار، ثبت اثر انگشت، تشخیص فایل تکراری

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { detectWorkbook, fingerprintBuffer } from '@/lib/excel'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const projectId = String(form.get('projectId') ?? '')
    if (!file) return fail('فایلی ارسال نشده است.')
    if (!projectId) return fail('پروژه مشخص نشده است.')

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return fail('پروژه یافت نشد.', 404)

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length === 0) return fail('فایل خالی است.')

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
        uploadedBy: 'مدیر داده',
      },
    })

    await logAudit(projectId, 'بارگذاری فایل', `فایل «${file.name}» با ${detection.sheets.length} شیت ثبت شد`)

    return ok({
      fileId: saved.id,
      name: saved.name,
      size: saved.size,
      fingerprint: fp,
      duplicate: false,
      detection,
    }, 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'خطا در پردازش فایل (بخش ۳.۳ سند: فایل خراب یا رمزگذاری‌شده).')
  }
}
