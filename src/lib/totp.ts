// احراز هویت چندمرحله‌ای (MFA) با TOTP — بخش ۲۹ سند
// «احراز هویت چندمرحله‌ای برای نقش‌های حساس» — پیاده‌سازی RFC 6238 با crypto داخلی Node
// سازگار با اپلیکیشن‌های Google Authenticator / Microsoft Authenticator / Aegis و مشابه

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** تولید کلید تصادفی Base32 (۱۶۰ بیت پیش‌فرض — توصیه RFC) */
export function generateTotpSecret(bytes = 20): string {
  const buf = randomBytes(bytes)
  let bits = 0
  let value = 0
  let out = ''
  for (const b of buf) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

/** رمزگشایی Base32 (بدون padding) */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=-]/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** محاسبه کد TOTP برای شمارنده مشخص */
export function totpAt(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret)
  if (key.length === 0) return ''
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(Math.floor(counter)))
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

/** مقایسه با ایمنی زمانی — جلوگیری از حمله زمان‌سنجی (بخش ۲۹) */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/**
 * تأیید کد TOTP با پنجره ±۱ گام (۳۰ ثانیه‌ای) برای جبران اختلاف ساعت جزئی
 */
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const normalized = String(code ?? '').replace(/\D/g, '')
  if (normalized.length < 6) return false
  const counter = Math.floor(Date.now() / 30_000)
  for (let i = -window; i <= window; i++) {
    if (safeEqual(totpAt(secret, counter + i), normalized)) return true
  }
  return false
}

/** آدرس otpauth برای افزودن دستی یا با QR در اپلیکیشن احرازکننده */
export function otpauthUri(secret: string, account: string, issuer = 'سکوی گزارش‌ساز'): string {
  return (
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  )
}
