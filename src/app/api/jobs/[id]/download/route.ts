// دانلود فایل خروجی تولیدشده در صف — بخش ۳۰.۲ و ۲۹ سند
// کنترل انقضا (ابطال خودکار لینک)، مجوز export.run و ثبت حسابرسی

import { NextRequest } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { db } from '@/lib/db'
import { fail, logAudit, parseJson } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { exportsDir, removeJobFile } from '@/lib/jobs'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'export.run')
    const { id } = await ctx.params
    const job = await db.job.findUnique({ where: { id } })
    if (!job) return fail('پردازش یافت نشد.', 404)
    if (job.status !== 'done' || !job.result) return fail('فایل خروجی آماده نیست.', 409)
    const result = parseJson<{ fileName?: string; ext?: string; mime?: string; size?: number; expiresAt?: string } | null>(job.result, null)
    if (!result?.ext || !result.fileName) return fail('اطلاعات فایل خروجی ناقص است.', 409)

    // انقضای لینک دانلود — ابطال خودکار (بخش ۲۹)
    if (result.expiresAt && new Date(result.expiresAt).getTime() < Date.now()) {
      await removeJobFile(job.id, result.ext)
      await db.job.update({ where: { id: job.id }, data: { result: null, error: 'فایل خروجی منقضی و حذف شد (سیاست نگهداری — بخش ۲۹)' } })
      return fail('اعتبار فایل خروجی به پایان رسیده است؛ لطفاً پردازش را دوباره اجرا کنید.', 410)
    }

    const filePath = path.join(exportsDir(), `${job.id}.${result.ext}`)
    const st = await stat(filePath).catch(() => null)
    if (!st) return fail('فایل خروجی روی دیسک یافت نشد؛ پردازش را دوباره اجرا کنید.', 410)
    const buf = await readFile(filePath)
    await logAudit(job.projectId, 'دانلود خروجی صف', `${result.fileName} (${(st.size / 1024).toFixed(1)} کیلوبایت)`, user.name)
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': result.mime ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
        'Content-Length': String(st.size),
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
