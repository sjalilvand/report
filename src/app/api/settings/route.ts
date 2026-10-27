// پیکربندی ظرفیت سامانه — بخش ۳۰.۱ (کارایی و ظرفیت) و ۳۶ (تصمیم‌های لازم پیش از قرارداد)
// مشاهده برای همه کاربران واردشده؛ تغییر فقط مدیر سامانه

import { NextRequest } from 'next/server'
import { ok, fail, logAudit } from '@/lib/server'
import { requireUser, requirePerm, errorResponse } from '@/lib/auth'
import { getSettings, saveSettings, SETTING_LABELS, PlatformSettings } from '@/lib/settings'

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const settings = await getSettings()
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
    // اعتبارسنجی اعداد مثبت
    for (const key of defaults) {
      const def = patch[key]
      if (def === undefined) continue
      if (typeof def === 'number' || typeof def === 'string') {
        const n = Number(def)
        if (Number.isFinite(n) && n <= 0) return fail('مقادیر ظرفیت باید عددی مثبت باشند.')
      }
    }
    const settings = await saveSettings(patch)
    await logAudit(null, 'به‌روزرسانی پیکربندی ظرفیت', JSON.stringify(patch), me.name)
    return ok({ settings, labels: SETTING_LABELS })
  } catch (e) {
    return errorResponse(e)
  }
}
