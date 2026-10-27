// غیرفعال‌سازی MFA — بخش ۲۹ سند
// برای امنیت، غیرفعال‌سازی نیز نیازمند کد تأیید معتبر است (کاربر فعلی)

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
    if (!row) return fail('کاربر یافت نشد.', 404)
    if (!row.mfaEnabled || !row.mfaSecret) return fail('احراز هویت چندمرحله‌ای فعال نیست.', 400)
    if (!verifyTotp(row.mfaSecret, code)) {
      return fail('کد تأیید نادرست است؛ غیرفعال‌سازی انجام نشد.', 401)
    }
    await db.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null } })
    await db.mfaTicket.deleteMany({ where: { userId: user.id } })
    await logAudit(null, 'غیرفعال‌سازی MFA', `احراز هویت چندمرحله‌ای برای «${row.name}» غیرفعال شد`, row.name)
    return ok({ enabled: false, message: 'احراز هویت چندمرحله‌ای غیرفعال شد.' })
  } catch (e) {
    return errorResponse(e)
  }
}
