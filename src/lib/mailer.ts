// کانال ایمیلی هشدارها — تکمیل بخش ۲۶.۲ سند
// ارسال اعلان‌های هشدار به گیرندگان سازمانی از طریق SMTP قابل پیکربندی در «مدیریت»
// بدون پیکربندی SMTP، ارسال با پرش موذبانه انجام می‌شود (خطا نیست)

import nodemailer from 'nodemailer'
import { getSettings } from './settings'

export interface MailResult {
  ok: boolean
  skipped?: boolean
  reason?: string
  messageId?: string
  to?: string[]
}

// قالب HTML ایمیل — راست‌به‌چپ، فارسی، بدون وابستگی به استایل میزبان
export function alertEmailHtml(title: string, intro: string, items: { title: string; message: string; severity: string; project?: string }[]): string {
  const sevColor: Record<string, string> = { info: '#2563eb', warning: '#d97706', critical: '#dc2626' }
  const rows = items.map(it => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">
        <span style="display:inline-block;padding:2px 10px;border-radius:9999px;color:#fff;font-size:12px;background:${sevColor[it.severity] ?? '#6b7280'}">${it.severity === 'critical' ? 'بحرانی' : it.severity === 'warning' ? 'هشدار' : 'اطلاع'}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:700;color:#111827;">${escapeHtml(it.title)}${it.project ? ` <span style="color:#6b7280;font-weight:400;font-size:12px;">— ${escapeHtml(it.project)}</span>` : ''}</div>
        <div style="color:#374151;font-size:13px;margin-top:2px;">${escapeHtml(it.message)}</div>
      </td>
    </tr>`).join('')
  return `<!doctype html>
<html dir="rtl" lang="fa"><head><meta charset="utf-8"></head>
<body style="font-family:Tahoma,'Segoe UI',sans-serif;background:#f9fafb;padding:24px;margin:0;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <div style="background:#111827;color:#fff;padding:16px 20px;">
      <div style="font-size:16px;font-weight:700;">سکوی هوشمند گزارش‌ساز — هشدارها و اعلان‌ها (بخش ۲۶.۲)</div>
      <div style="font-size:13px;color:#d1d5db;margin-top:4px;">${escapeHtml(title)}</div>
    </div>
    <div style="padding:16px 20px;color:#374151;font-size:13px;line-height:1.9;">${escapeHtml(intro)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${rows || '<tr><td style="padding:16px 20px;color:#6b7280;">موردی برای نمایش نیست.</td></tr>'}</table>
    <div style="padding:12px 20px;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;">این ایمیل به‌صورت خودکار توسط زمان‌بند ارزیابی هشدارها ارسال شده است.</div>
  </div>
</body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** ارسال ایمیل هشدار — اگر SMTP پیکربندی نشده باشد با skipped برمی‌گردد (خطا محسوب نمی‌شود) */
export async function sendMail(subject: string, html: string, toOverride?: string[]): Promise<MailResult> {
  const s = await getSettings()
  if (!s.emailEnabled) return { ok: false, skipped: true, reason: 'کانال ایمیلی فعال نیست (settings.emailEnabled).' }
  if (!s.smtpHost) return { ok: false, skipped: true, reason: 'سرور SMTP پیکربندی نشده است.' }
  const to = (toOverride ?? s.alertEmailTo.split(/[,،;؛\s]+/)).map(x => x.trim()).filter(Boolean)
  if (to.length === 0) return { ok: false, skipped: true, reason: 'گیرندگان ایمیل (alertEmailTo) تعیین نشده است.' }

  const port = Number(s.smtpPort) || 587
  const transporter = nodemailer.createTransport({
    host: s.smtpHost,
    port,
    secure: s.smtpSecure || port === 465,
    auth: s.smtpUser ? { user: s.smtpUser, pass: s.smtpPass } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  })
  const info = await transporter.sendMail({
    from: s.smtpFrom || s.smtpUser || 'report-platform@localhost',
    to: to.join(', '),
    subject,
    html,
  })
  return { ok: true, messageId: info.messageId, to }
}

/** ایمیل آزمایشی از تب مدیریت — بررسی سلامت پیکربندی SMTP */
export async function sendTestEmail(): Promise<MailResult> {
  const items = [{ title: 'ایمیل آزمایشی', message: 'پیکربندی SMTP سامانه گزارش‌ساز با موفقیت آزموده شد.', severity: 'info' }]
  return sendMail('ایمیل آزمایشی — سکوی هوشمند گزارش‌ساز', alertEmailHtml('آزمایش کانال ایمیلی', 'در صورت دریافت این پیام، پیکربندی SMTP صحیح است.', items))
}

/** ارسال خلاصه اعلان‌های جدید یک دوره به گیرندگان */
export async function sendNotificationsDigest(items: { title: string; message: string; severity: string; project?: string }[], since: Date): Promise<MailResult> {
  const fa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' })
  const title = `خلاصه هشدارهای جدید (${items.length} مورد) — از ${fa.format(since)}`
  const intro = items.length > 0
    ? 'اعلان‌های زیر در آخرین چرخه ارزیابی خودکار هشدارها ساخته شده‌اند. جزئیات کامل در زنگ اعلان‌های سامانه قابل مشاهده است.'
    : 'در آخرین چرخه ارزیابی، هشدار جدیدی ثبت نشد.'
  return sendMail(title, alertEmailHtml('خلاصه چرخه ارزیابی هشدارها', intro, items))
}
