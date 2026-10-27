// ارسال ایمیل آزمایشی برای بررسی پیکربندی SMTP — بخش ۲۶.۲ (کانال ایمیلی)
// فقط مدیر سامانه

import { NextRequest } from 'next/server'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { sendTestEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const me = await requirePerm(req, 'settings.manage')
    const res = await sendTestEmail()
    await logAudit(null, 'آزمایش کانال ایمیلی هشدار', JSON.stringify(res), me.name)
    if (!res.ok && !res.skipped) return fail(res.reason ?? 'ارسال ایمیل ناموفق بود.', 502)
    return ok({ result: res })
  } catch (e) {
    return errorResponse(e)
  }
}
