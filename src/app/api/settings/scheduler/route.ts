// وضعیت زمان‌بند خودکار ارزیابی هشدارها — تکمیل بخش ۲۶.۲
// مشاهده برای همه کاربران واردشده (فقط خواندنی)

import { NextRequest } from 'next/server'
import { ok } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { getSchedulerState } from '@/lib/scheduler'
import { getSettings } from '@/lib/settings'

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const scheduler = getSchedulerState()
    // فاصلهٔ پیکربندی‌شدهٔ فعلی را نمایش بده (زمان‌بند در تیک بعدی خودش همگام می‌شود)
    try {
      const st = await getSettings()
      scheduler.intervalMinutes = st.alertEvalIntervalMinutes
    } catch { /* مقدار زمان‌بند باقی می‌ماند */ }
    return ok({ scheduler })
  } catch (e) {
    return errorResponse(e)
  }
}
