// انواع مشترک سامانه — مطابق بخش ۸ و ۱۱ سند نیازمندی‌ها

// انواع داده پشتیبانی‌شده — بخش ۸.۱ سند
export type FieldType =
  | 'text'        // متن
  | 'integer'     // عدد صحیح
  | 'decimal'     // عدد اعشاری
  | 'amount'      // مبلغ
  | 'percent'     // درصد
  | 'date'        // تاریخ
  | 'time'        // زمان
  | 'datetime'    // تاریخ و زمان
  | 'boolean'     // مقدار منطقی
  | 'category'    // دسته‌بندی
  | 'identifier'  // شناسه
  | 'geo'         // اطلاعات مکانی

// نقش تحلیلی فیلد — بخش ۸ سند
export type FieldRole = 'dimension' | 'measure' | 'identifier' | 'attribute'

// نوع تجمیع — بخش ۱۱.۴ سند (جمع‌پذیر، نیمه‌جمع‌پذیر، غیرجمع‌پذیر)
export type AggregationType =
  | 'sum'           // جمع (جمع‌پذیر)
  | 'count'         // تعداد رکورد
  | 'countDistinct' // تعداد متمایز
  | 'avg'           // میانگین ساده (غیرجمع‌پذیر)
  | 'weightedAvg'   // میانگین وزنی — نیازمند ستون وزن (weightFieldId)
  | 'min'
  | 'max'
  | 'median'        // میانه (غیرجمع‌پذیر)
  | 'last'          // آخرین مقدار (نیمه‌جمع‌پذیر)
  // محاسبات آماری پیشرفته — بخش ۱۳.۲ سند
  | 'mode'          // نما
  | 'range'         // دامنه تغییرات (بیشینه − کمینه)
  | 'variance'      // واریانس — نوع (جامع/نمونه) از تنظیمات مدیر
  | 'varianceSample' // واریانس نمونه (n−۱) — صریح
  | 'stdDev'        // انحراف معیار — نوع از تنظیمات مدیر
  | 'stdDevSample'  // انحراف معیار نمونه (n−۱) — صریح
  | 'quartile1'     // چارک اول (۲۵٪)
  | 'quartile3'     // چارک سوم (۷۵٪)
  | 'percentile'    // صدک — با percentileP (۰..۱)
  | 'iqr'           // فاصله بین چارکی
  | 'cv'            // ضریب تغییرات (انحراف معیار ÷ میانگین)

// تقویم پشتیبانی‌شده — بخش ۱۵.۱
export type CalendarKind = 'jalali' | 'gregorian' | 'auto'

// مشخصات یک ستون — پنل مشخصات ستون بخش ۸ سند
export interface FieldMeta {
  id: string              // نام فنی (شناسه پایدار داخلی) — بر اساس آن فرمول‌ها و روابط ساخته می‌شوند
  sourceName: string      // نام اصلی استخراج‌شده از فایل
  label: string           // برچسب نمایشی قابل ویرایش
  description?: string    // توضیح معنایی فیلد
  type: FieldType         // نوع تأییدشده (نهایی مدیر)
  detectedType?: FieldType // نوع تشخیص‌داده‌شده (پیشنهاد سامانه)
  confidence?: number     // میزان اطمینان تشخیص 0..1 (نه تضمین صحت)
  role: FieldRole         // نقش تحلیلی: بُعد، سنجه، شناسه، توصیفی
  unit?: string           // واحد: ریال، تومان، میلیون ریال، نفر، درصد و ...
  unitKind?: 'currency' | 'count' | 'percent' | 'other'
  format?: string         // قالب نمایش: number | currency | date | text
  calendar?: CalendarKind // برای تاریخ‌ها
  aggregation: AggregationType // قاعده تجمیع
  quality?: 'valid' | 'partial' | 'inconsistent' // وضعیت کیفیت
  sensitivity?: 'public' | 'internal' | 'confidential' // حساسیت
  invalidCount?: number   // تعداد مقدارهای نامعتبر
  examples?: string[]     // نمونه مقادیر واقعی
}

// یک مرحله تبدیل — دفترچه مراحل تبدیل بخش ۱۰.۳ سند
export interface TransformStep {
  id: string
  op: string              // نام عملیات
  config: Record<string, unknown> // تنظیمات
  userId?: string         // کاربر
  at: string              // زمان اجرا
  before: number          // تعداد رکورد قبل
  after: number           // تعداد رکورد بعد
  warnings?: string[]     // هشدارها
  errors?: string[]       // خطاها
  disabled?: boolean      // غیرفعال‌شده (برای بازگشت به نسخه قبلی)
}

// فیلتر پرس‌وجو
export interface QueryFilter {
  fieldId: string
  op: 'eq' | 'neq' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'notnull' | 'isnull'
  value?: unknown
  values?: unknown[]
}

// پرس‌وجوی تجمیعی — بخش ۱۱ و ۱۹
export interface QuerySpec {
  dimensions: string[]        // فیلدهای گروه‌بندی
  measures: {
    fieldId?: string          // برای count اختیاری است
    agg: AggregationType
    alias?: string
    displayUnit?: string      // واحد نمایش مبلغ — بخش ۱۴.۱
    weightFieldId?: string    // ستون وزن برای میانگین وزنی — بخش ۱۳.۱
    percentileP?: number      // صدک موردنظر ۰..۱ برای agg=percentile — بخش ۱۳.۲
  }[]
  filters?: QueryFilter[]
  orderBy?: { field: string; dir: 'asc' | 'desc' }[]
  limit?: number
  searchText?: string
  // گزینه‌های آماری — از تنظیمات مدیر (بخش ۱۳.۲: روش صدک، نوع انحراف معیار، رفتار خالی)
  statOptions?: StatOptions
  // محاسبات پنجره‌ای روی نتیجه تجمیع‌شده — بخش ۱۳.۲ (میانگین متحرک، مجموع تجمعی)
  windowCalcs?: WindowCalc[]
}

// تنظیمات آماری مدیر — بخش ۱۳.۲ سند
export interface StatOptions {
  percentileMethod: 'linear' | 'nearest' // روش صدک/چارک: درون‌یابی خطی (R-7) یا نزدیک‌ترین رتبه
  stdDevType: 'sample' | 'population'    // نوع پیش‌فرض انحراف معیار و واریانس
  nullBehavior: 'exclude' | 'zero'       // رفتار داده خالی: کنار گذاشتن یا صفر فرض کردن
}

// محاسبه پنجره‌ای روی ردیف‌های تجمیع‌شده — بخش ۱۳.۲ سند
export interface WindowCalc {
  type: 'cumsum' | 'movingAvg' // مجموع تجمعی یا میانگین متحرک
  fieldAlias: string           // نام ستون سنجه در نتیجه
  window?: number              // اندازه پنجره برای میانگین متحرک (پیش‌فرض ۳)
  alias: string                // نام ستون خروجی
}

// نتیجه پرس‌وجو
export interface QueryResult {
  rows: Record<string, unknown>[]
  totals: Record<string, unknown>
  rowCount: number
  scannedRecords: number
  warnings: string[]
}

// رکورد داده
export type DataRow = Record<string, unknown>

// واحد پول — بخش ۱۴.۲ سند
export interface CurrencyUnit {
  code: string
  label: string
  factor: number // معادل ریال
}
