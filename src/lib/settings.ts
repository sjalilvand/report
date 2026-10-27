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
}

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
    return { ...DEFAULT_SETTINGS }
  }
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
