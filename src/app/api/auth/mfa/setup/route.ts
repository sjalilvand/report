// راه‌اندازی احراز هویت چندمرحله‌ای (MFA/TOTP) — بخش ۲۹ سند
// تولید کلید، ساخت آدرس otpauth و تصویر QR برای اپلیکیشن احرازکننده

import { NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { ok, fail } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateTotpSecret, otpauthUri } from '@/lib/totp'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const row = await db.user.findUnique({ where: { id: user.id } })
    if (!row) return fail('کاربر یافت نشد.', 404)
    if (row.mfaEnabled) return fail('احراز هویت چندمرحله‌ای از قبل فعال است؛ ابتدا آن را غیرفعال کنید.', 400)

    // کلید جدید — تا پیش از فعال‌سازی می‌تواند چند بار بازتولید شود
    const secret = generateTotpSecret()
    await db.user.update({ where: { id: user.id }, data: { mfaSecret: secret, mfaEnabled: false } })
    const uri = otpauthUri(secret, row.username)
    const qr = await QRCode.toDataURL(uri, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
    return ok({
      secret,
      otpauth: uri,
      qr,
      message: 'کلید با اپلیکیشن احرازکننده اسکن یا به‌صورت دستی وارد شود، سپس کد شش‌رقمی تأیید شود.',
    })
  } catch (e) {
    return errorResponse(e)
  }
}
