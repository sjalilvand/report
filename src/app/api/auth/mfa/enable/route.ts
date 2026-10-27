// فعال‌سازی MFA — بخش ۲۹ سند (احراز هویت چندمرحله‌ای برای نقش‌های حساس)

import { NextRequest } from 'next/server'
import { ok, fail, logAudit } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { db } from '@/lib/db'
import { verifyTotp } from '@/lib/totp'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const code = String(body.code ?? '')
    const row = await db.user.findUnique({ where: { id: user.id } })
    if (!row?.mfaSecret) return fail('ابتدا کلید راه‌اندازی تولید شود (گام اول).', 400)
    if (row.mfaEnabled) return fail('احراز هویت چندمرحله‌ای از قبل فعال است.', 400)
    if (!verifyTotp(row.mfaSecret, code)) {
      return fail('کد تأیید نادرست است یا منقضی شده؛ دوباره تلاش کنید.', 401)
    }
    await db.user.update({ where: { id: user.id }, data: { mfaEnabled: true } })
    await logAudit(null, 'فعال‌سازی MFA', `احراز هویت چندمرحله‌ای برای «${row.name}» فعال شد (بخش ۲۹ سند)`, row.name)
    return ok({ enabled: true, message: 'احراز هویت چندمرحله‌ای فعال شد؛ از این پس کد تأیید اپلیکیشن در ورود لازم است.' })
  } catch (e) {
    return errorResponse(e)
  }
}
