// پیکربندی سامانه و سقف‌های ظرفیت — بخش ۳۰.۱ (کارایی و ظرفیت) و ۳۶ (تصمیم‌های پیش از قرارداد)
// اعداد پیش‌فرض «اهداف پیشنهادی اولیه» هستند و مدیر سامانه می‌تواند پیش از قرارداد نهایی‌شان کند

import { db } from './db'

export interface PlatformSettings {
  maxFileSizeMB: number        // حداکثر اندازه فایل
  maxRowsPerDataset: number    // حداکثر سطر هر مجموعه‌داده
  maxColumnsPerDataset: number // حداکثر ستون هر مجموعه‌داده
  maxFilesPerProject: number   // حداکثر فایل هر پروژه
  maxDatasetsPerProject: number
  maxRelations: number         // حداکثر تعداد روابط هر پروژه — بخش ۱۶
  maxReportsPerProject: number
  maxConcurrentUsers: number   // تعداد کاربران هم‌زمان (اهداف پیشنهادی)
  sessionTimeoutMinutes: number
  multiOrg: boolean            // تک‌سازمانی یا چندسازمانی — تصمیم بخش ۳۶
  currencyBase: string         // واحد مبنای مبلغ — تصمیم بخش ۳۶ (مبنای ریال)
  // زمان‌بندی خودکار ارزیابی هشدارها — تکمیل بخش ۲۶.۲
  alertEvalIntervalMinutes: number // فاصله ارزیابی خودکار قواعد هشدار (دقیقه)
  // کانال ایمیلی هشدارها — بخش ۲۶.۲
  emailEnabled: boolean        // فعال‌بودن ارسال ایمیلی هشدارها
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean          // TLS مستقیم (۴۶۵) در برابر STARTTLS (۵۸۷)
  smtpUser: string
  smtpPass: string             // در پاسخ GET با *** ماسک می‌شود
  smtpFrom: string             // فرستنده، مثلا: هشدار گزارش‌ساز <alert@example.com>
  alertEmailTo: string         // گیرندگان، با کاما جدا می‌شوند
  // احراز هویت چندمرحله‌ای (MFA) — بخش ۲۹ سند
  mfaRequiredRoles: string     // نقش‌هایی که فعال‌سازی MFA برایشان توصیه/الزام می‌شود، با کاما
  // ورود یکپارچه سازمانی (SSO/OIDC) — بخش ۲۹ سند
  ssoEnabled: boolean
  ssoIssuer: string            // آدرس پایه سامانه هویتی (کشف خودکار نقاط انتها از /.well-known)
  ssoClientId: string
  ssoClientSecret: string      // در پاسخ GET با *** ماسک می‌شود
  ssoAuthorizeUrl: string      // در صورت ذکر issuer می‌تواند خالی بماند (کشف خودکار)
  ssoTokenUrl: string
  ssoUserinfoUrl: string
  ssoScopes: string            // پیش‌فرض: openid profile email
  ssoAutoProvision: boolean    // ساخت خودکار حساب برای کاربران جدید سازمان
  ssoDefaultRole: string       // نقش حساب‌های خودکار
  ssoAllowedDomain: string     // محدودیت دامنه ایمیل (خالی = بدون محدودیت)
  // ورود یکپارچه سازمانی SAML 2.0 — بخش ۲۹ سند (مکمل OIDC)
  samlEnabled: boolean
  samlIdpSsoUrl: string        // آدرس Single Sign-On سامانه هویتی (Entry Point)
  samlIdpCert: string          // گواهی X.509 عمومی IdP برای اعتبارسنجی امضا (PEM)
  samlIssuer: string           // EntityID سمت SP (خالی = آدرس metadata همین سامانه)
  samlIdpEntityId: string      // EntityID انتظاری IdP (اختیاری)
  samlAutoProvision: boolean   // ساخت خودکار حساب برای کاربران جدید سازمان
  samlDefaultRole: string      // نقش حساب‌های خودکار
  samlAllowedDomain: string    // محدودیت دامنه ایمیل (خالی = بدون محدودیت)
  // صف پردازش خروجی حجیم — بخش ۲۸ (Job/Export) و ۳۰.۲ (پایداری)
  exportQueueConcurrency: number // تعداد پردازش هم‌زمان صف خروجی
  exportFileTtlHours: number   // مدت اعتبار فایل خروجی و لینک دانلود — ابطال خودکار
  // قابلیت‌های هوشمند و هوش مصنوعی — بخش ۲۵ سند (سیاست و مجوز)
  aiEnabled: boolean           // فعال‌بودن دستیار هوشمند (پرسش به زبان طبیعی، توضیح فرمول، روایت‌سازی)
  aiAllowDataSharing: boolean  // مجوز ارسال نمونه داده به سرویس مدل زبانی بیرونی (الزام بخش ۲۵)
  aiMaxRowsShared: number      // سقف ردیف‌های نمونه قابل ارسال به سرویس بیرونی
  // گزینه‌های آماری محاسبات — بخش ۱۳.۲ سند (کنترل مدیر)
  statPercentileMethod: string // روش صدک/چارک: linear (درون‌یابی خطی R-7) یا nearest (نزدیک‌ترین رتبه)
  statStdDevDefault: string    // نوع پیش‌فرض انحراف معیار و واریانس: sample (n−۱) یا population (n)
  statNullBehavior: string     // رفتار داده خالی در محاسبات آماری: exclude یا zero
  // موتور تحلیل متوسط — بخش ۲۷.۲ سند (گزینه فناوری: DuckDB یا موتور داخلی)
  engineAnalytics: string      // internal (موتور داخلی) یا duckdb (DuckDB + فایل آماده‌شده Parquet)
}

// اهداف پیشنهادی اولیه سند — مشروط به آزمون با داده واقعی سازمان (بخش ۳۰.۱ و ۳۷)
export const DEFAULT_SETTINGS: PlatformSettings = {
  maxFileSizeMB: 25,
  maxRowsPerDataset: 200000,
  maxColumnsPerDataset: 120,
  maxFilesPerProject: 30,
  maxDatasetsPerProject: 60,
  maxRelations: 60,
  maxReportsPerProject: 50,
  maxConcurrentUsers: 50,
  sessionTimeoutMinutes: 720,
  multiOrg: false,
  currencyBase: 'rial',
  alertEvalIntervalMinutes: 60,
  emailEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
  alertEmailTo: '',
  mfaRequiredRoles: 'admin,steward',
  ssoEnabled: false,
  ssoIssuer: '',
  ssoClientId: '',
  ssoClientSecret: '',
  ssoAuthorizeUrl: '',
  ssoTokenUrl: '',
  ssoUserinfoUrl: '',
  ssoScopes: 'openid profile email',
  ssoAutoProvision: false,
  ssoDefaultRole: 'viewer',
  ssoAllowedDomain: '',
  samlEnabled: false,
  samlIdpSsoUrl: '',
  samlIdpCert: '',
  samlIssuer: '',
  samlIdpEntityId: '',
  samlAutoProvision: false,
  samlDefaultRole: 'viewer',
  samlAllowedDomain: '',
  exportQueueConcurrency: 1,
  exportFileTtlHours: 48,
  aiEnabled: true,
  aiAllowDataSharing: false,
  aiMaxRowsShared: 100,
  statPercentileMethod: 'linear',
  statStdDevDefault: 'sample',
  statNullBehavior: 'exclude',
  engineAnalytics: 'internal',
}

export const SETTING_LABELS: Record<keyof PlatformSettings, string> = {
  maxFileSizeMB: 'حداکثر اندازه هر فایل (مگابایت)',
  maxRowsPerDataset: 'حداکثر سطر هر مجموعه‌داده',
  maxColumnsPerDataset: 'حداکثر ستون هر مجموعه‌داده',
  maxFilesPerProject: 'حداکثر فایل هر پروژه',
  maxDatasetsPerProject: 'حداکثر مجموعه‌داده هر پروژه',
  maxRelations: 'حداکثر تعداد روابط هر پروژه',
  maxReportsPerProject: 'حداکثر گزارش هر پروژه',
  maxConcurrentUsers: 'کاربران هم‌زمان (هدف)',
  sessionTimeoutMinutes: 'مدت اعتبار نشست (دقیقه)',
  multiOrg: 'چندسازمانی',
  currencyBase: 'واحد مبنای مبلغ',
  alertEvalIntervalMinutes: 'فاصله ارزیابی خودکار هشدارها (دقیقه)',
  emailEnabled: 'ارسال ایمیلی هشدارها',
  smtpHost: 'سرور SMTP (مثلاً smtp.example.com)',
  smtpPort: 'پورت SMTP',
  smtpSecure: 'اتصال امن مستقیم TLS (پورت ۴۶۵)',
  smtpUser: 'نام کاربری SMTP',
  smtpPass: 'گذرواژه SMTP',
  smtpFrom: 'آدرس فرستنده',
  alertEmailTo: 'گیرندگان ایمیل هشدار (با کاما)',
  mfaRequiredRoles: 'نقش‌های الزام MFA (با کاما — مثلاً admin,steward)',
  ssoEnabled: 'ورود یکپارچه سازمانی (SSO/OIDC)',
  ssoIssuer: 'آدرس Issuer سامانه هویتی (کشف خودکار نقاط انتها)',
  ssoClientId: 'شناسه Client (از سامانه هویتی)',
  ssoClientSecret: 'رمز Client (از سامانه هویتی)',
  ssoAuthorizeUrl: 'آدرس Authorize (اختیاری با کشف خودکار)',
  ssoTokenUrl: 'آدرس Token (اختیاری با کشف خودکار)',
  ssoUserinfoUrl: 'آدرس Userinfo (اختیاری)',
  ssoScopes: 'محدوده‌های OIDC',
  ssoAutoProvision: 'ساخت خودکار حساب کاربران جدید سازمان',
  ssoDefaultRole: 'نقش پیش‌فرض حساب‌های خودکار',
  ssoAllowedDomain: 'محدودیت دامنه ایمیل (خالی = بدون محدودیت)',
  samlEnabled: 'ورود یکپارچه سازمانی SAML 2.0 (بخش ۲۹)',
  samlIdpSsoUrl: 'آدرس Single Sign-On سامانه هویتی (Entry Point)',
  samlIdpCert: 'گواهی X.509 عمومی IdP (PEM — چندسطری)',
  samlIssuer: 'EntityID سمت SP (خالی = آدرس metadata همین سامانه)',
  samlIdpEntityId: 'EntityID سامانه هویتی (اختیاری)',
  samlAutoProvision: 'ساخت خودکار حساب کاربران جدید سازمان (SAML)',
  samlDefaultRole: 'نقش پیش‌فرض حساب‌های خودکار (SAML)',
  samlAllowedDomain: 'محدودیت دامنه ایمیل SAML (خالی = بدون محدودیت)',
  exportQueueConcurrency: 'تعداد پردازش هم‌زمان صف خروجی',
  exportFileTtlHours: 'مدت اعتبار فایل خروجی (ساعت)',
  aiEnabled: 'دستیار هوشمند و هوش مصنوعی (بخش ۲۵)',
  aiAllowDataSharing: 'مجوز ارسال نمونه داده به سرویس مدل زبانی بیرونی',
  aiMaxRowsShared: 'سقف ردیف‌های قابل ارسال به سرویس بیرونی',
  statPercentileMethod: 'روش صدک و چارک (بخش ۱۳.۲)',
  statStdDevDefault: 'نوع پیش‌فرض انحراف معیار و واریانس (بخش ۱۳.۲)',
  statNullBehavior: 'رفتار داده‌های خالی در محاسبات آماری (بخش ۱۳.۲)',
  engineAnalytics: 'موتور تحلیل متوسط (بخش ۲۷.۲)',
}

// فیلدهایی که در پاسخ GET ماسک می‌شوند — جلوگیری از نشت گذرواژه (بخش ۲۹)
export const SECRET_SETTINGS: (keyof PlatformSettings)[] = ['smtpPass', 'ssoClientSecret']
export const MASK = '***'

export async function getSettings(): Promise<PlatformSettings> {
  try {
    const rows = await db.systemSetting.findMany()
    const map = new Map(rows.map(r => [r.key, r.value]))
    const out = { ...DEFAULT_SETTINGS }
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof PlatformSettings)[]) {
      const raw = map.get(key)
      if (raw === undefined) continue
      const def = DEFAULT_SETTINGS[key]
      if (typeof def === 'number') {
        const n = Number(raw)
        if (Number.isFinite(n) && n > 0) (out[key] as number) = n
      } else if (typeof def === 'boolean') {
        (out[key] as boolean) = raw === 'true'
      } else {
        (out[key] as string) = raw
      }
    }
    return out
  } catch {
    const d = { ...DEFAULT_SETTINGS }
    return d
  }
}

/** نسخه ماسک‌شده برای پاسخ API */
export async function getMaskedSettings(): Promise<PlatformSettings> {
  const s = await getSettings()
  for (const k of SECRET_SETTINGS) {
    if (s[k]) (s[k] as string) = MASK
  }
  return s
}

export async function saveSettings(patch: Partial<Record<keyof PlatformSettings, unknown>>): Promise<PlatformSettings> {
  const entries: { key: string; value: string }[] = []
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS) || value === undefined || value === null) continue
    entries.push({ key, value: String(value) })
  }
  for (const e of entries) {
    await db.systemSetting.upsert({
      where: { key: e.key },
      create: { key: e.key, value: e.value },
      update: { value: e.value },
    })
  }
  return getSettings()
}
