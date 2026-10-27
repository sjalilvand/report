// پیکربندی ظرفیت سامانه — بخش ۳۰.۱ (کارایی و ظرفیت) و ۳۶ (تصمیم‌های لازم پیش از قرارداد)
// مشاهده برای همه کاربران واردشده؛ تغییر فقط مدیر سامانه

import { NextRequest } from 'next/server'
import { ok, fail, logAudit } from '@/lib/server'
import { requireUser, requirePerm, errorResponse } from '@/lib/auth'
import { getMaskedSettings, saveSettings, SETTING_LABELS, PlatformSettings, SECRET_SETTINGS, MASK, DEFAULT_SETTINGS } from '@/lib/settings'

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const settings = await getMaskedSettings()
    return ok({ settings, labels: SETTING_LABELS })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const me = await requirePerm(req, 'settings.manage')
    const body = await req.json()
    const patch: Partial<Record<keyof PlatformSettings, unknown>> = {}
    const defaults = Object.keys(SETTING_LABELS) as (keyof PlatformSettings)[]
    for (const key of defaults) {
      if (body[key] !== undefined) patch[key] = body[key]
    }
    // مقدار ماسک‌شده (* * *) یعنی تغییر نکرده — گذرواژه فعلی حفظ می‌شود
    for (const k of SECRET_SETTINGS) {
      if (patch[k] === MASK) delete patch[k]
    }
    // اعتبارسنجی اعداد مثبت — فقط فیلدهای عددی؛ رشتهٔ خالی یعنی پاک‌سازی (SMTP اختیاری است)
    for (const key of defaults) {
      const def = patch[key]
      if (def === undefined || def === '') continue
      if (typeof DEFAULT_SETTINGS[key] !== 'number') continue
      const n = Number(def)
      if (Number.isFinite(n) && n <= 0) return fail('مقادیر ظرفیت باید عددی مثبت باشند.')
    }
    const settings = await saveSettings(patch)
    await logAudit(null, 'به‌روزرسانی پیکربندی سامانه', JSON.stringify({ keys: Object.keys(patch) }), me.name)
    const masked = { ...settings }
    for (const k of SECRET_SETTINGS) if (masked[k]) (masked[k] as string) = MASK
    return ok({ settings: masked, labels: SETTING_LABELS })
  } catch (e) {
    return errorResponse(e)
  }
}
