// موتور تحلیل متوسط DuckDB و لایه فایل آماده‌شده Parquet — بخش ۲۷.۲ سند
// «تحلیل متوسط: DuckDB یا موتور تحلیلی مشابه» + «فایل آماده‌شده: Parquet»
// این ماژول یک لایه اختیاری است: اگر بسته @duckdb/node-api نصب نباشد، سامانه با
// موتور داخلی (src/lib/query.ts) به کار خود ادامه می‌دهد — مطابق «گزینه‌های فناوری، نه الزام قطعی»
//
// جریان: رکوردهای نسخه جاری مجموعه‌داده → CSV تایپ‌شده → جدول DuckDB → COPY به Parquet
// پرس‌وجوی کاربر همیشه روی نمای read-only «ds» (فقط SELECT) با فهرست سیاه کلیدواژه‌ها اجرا می‌شود.

import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync, readFileSync } from 'fs'
import path from 'path'
import { db } from './db'

// ————————————————————————————— مسیر ذخیره‌سازی —————————————————————————————
const PARQUET_DIR = path.join(process.cwd(), 'data', 'parquet')

export interface ParquetMeta {
  version: number
  rows: number
  columns: number
  exportedAt: string
  bytes: number
}

interface DuckEngine {
  conn: {
    run(sql: string): Promise<{ getChunk(i: number): { getRows(): unknown[][] }; rowCount: number; chunkCount: number }>
  }
  // قفل نرم برای جلوگیری از تداخل پرس‌وجوهای هم‌زمان روی یک اتصال
  queue: Promise<unknown>
}

const g = globalThis as unknown as { __duckEngine?: DuckEngine | 'unavailable' }

type DuckDBModule = {
  DuckDBInstance: {
    create(path: string): Promise<{ connect(): Promise<DuckEngine['conn']> }>
  }
}

/** بارگذاری تنبل موتور — در نبود بسته یا باینری ناسازگار، «غیرموجود» گزارش می‌شود نه خطا */
async function loadModule(): Promise<DuckDBModule | null> {
  try {
    return (await import('@duckdb/node-api')) as unknown as DuckDBModule
  } catch {
    return null
  }
}

/** اتصال یکتا با صف اجرای متوالی — هر پرس‌وجو به ترتیب و بدون تداخل اجرا می‌شود */
async function getEngine(): Promise<DuckEngine | null> {
  if (g.__duckEngine === 'unavailable') return null
  if (g.__duckEngine) return g.__duckEngine
  const mod = await loadModule()
  if (!mod) {
    g.__duckEngine = 'unavailable'
    return null
  }
  try {
    const instance = await mod.DuckDBInstance.create(':memory:')
    const conn = await instance.connect()
    const engine: DuckEngine = { conn, queue: Promise.resolve() }
    g.__duckEngine = engine
    return engine
  } catch {
    g.__duckEngine = 'unavailable'
    return null
  }
}

/** اجرای متوالی روی اتصال مشترک — جلوگیری از تداخل تراکنش‌های موازی */
function enqueue<T>(engine: DuckEngine, task: () => Promise<T>): Promise<T> {
  const run = engine.queue.then(task, task)
  engine.queue = run.catch(() => undefined)
  return run
}

// ————————————————————————————— CSV تایپ‌شده —————————————————————————————

/** تبدیل مقدار رکورد به سلول CSV امن (RFC 4180) — خالی = NULL در DuckDB */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return ''
    return String(v)
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  const s = String(v)
  if (s === '') return ''
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

/** نگاشت نوع فیلد به نوع SQL — اعداد اعشاری DOUBLE، منطقی BOOLEAN، بقیه VARCHAR */
function duckTypeOf(type: string): 'DOUBLE' | 'BOOLEAN' | 'VARCHAR' {
  if (type === 'integer' || type === 'decimal' || type === 'amount' || type === 'percent') return 'DOUBLE'
  if (type === 'boolean') return 'BOOLEAN'
  return 'VARCHAR'
}

function quoteIdent(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"'
}

// ————————————————————————————— خروجی Parquet —————————————————————————————

export interface ExportResult extends ParquetMeta {
  tookMs: number
}

/** ساخت/نوسازی فایل Parquet نسخه جاری مجموعه‌داده — فایل آماده‌شده طبق بخش ۲۷.۲ */
export async function exportDatasetToParquet(datasetId: string): Promise<ExportResult> {
  const engine = await getEngine()
  if (!engine) throw new Error('موتور DuckDB در دسترس نیست؛ بستهٔ @duckdb/node-api را نصب کنید (npm install @duckdb/node-api).')

  const ds = await db.dataset.findUnique({ where: { id: datasetId } })
  if (!ds) throw new Error('مجموعه‌داده یافت نشد.')

  const fields = JSON.parse(ds.fields || '[]') as { id: string; label: string; type: string }[]
  const records = JSON.parse(ds.records || '[]') as Record<string, unknown>[]
  if (fields.length === 0) throw new Error('مجموعه‌داده فاقد ستون است.')

  const started = Date.now()
  mkdirSync(PARQUET_DIR, { recursive: true })

  // نام ستون در Parquet = label نمایشی (همان که کاربر در SQL می‌بیند)
  const labels = fields.map(f => f.label || f.id)
  const types = fields.map(f => duckTypeOf(f.type))

  const csvPath = path.join(PARQUET_DIR, `${ds.id}.from.csv`)
  const parquetPath = path.join(PARQUET_DIR, `${ds.id}.parquet`)

  // نوشتن CSV — سرستون + همه رکوردها (بدون BOM؛ DuckDB ورودی UTF-8 را مستقیم می‌خواند)
  const header = labels.map(csvCell).join(',')
  const lines = new Array<string>(records.length + 1)
  lines[0] = header
  for (let i = 0; i < records.length; i++) {
    const rec = records[i] as Record<string, unknown>
    lines[i + 1] = fields.map(f => csvCell(rec[f.id])).join(',')
  }
  writeFileSync(csvPath, lines.join('\n'), 'utf8')

  try {
    await enqueue(engine, async () => {
      // جدول تایپ‌شده از CSV — types دقیقاً به ترتیب ستون‌ها
      const cols = labels.map((l, i) => `${quoteIdent(l)}: ${types[i]}`).join(', ')
      await engine.conn.run(
        `CREATE OR REPLACE TABLE __stage AS SELECT * FROM read_csv('${csvPath.replace(/'/g, "''")}', header=true, columns={${cols}}, nullstr='', all_varchar=false)`
      )
      await engine.conn.run(
        `COPY __stage TO '${parquetPath.replace(/'/g, "''")}' (FORMAT PARQUET)`
      )
      await engine.conn.run('DROP TABLE __stage')
    })
  } finally {
    try { unlinkSync(csvPath) } catch { /* بی‌اهمیت */ }
  }

  const bytes = statSync(parquetPath).size
  const meta: ParquetMeta = {
    version: ds.version,
    rows: records.length,
    columns: fields.length,
    exportedAt: new Date().toISOString(),
    bytes,
  }
  writeFileSync(path.join(PARQUET_DIR, `${ds.id}.meta.json`), JSON.stringify(meta), 'utf8')
  return { ...meta, tookMs: Date.now() - started }
}

export interface ParquetStatus {
  engineAvailable: boolean
  exists: boolean
  meta: ParquetMeta | null
  stale: boolean // نسخه فایل با نسخه جاری مجموعه‌داده تفاوت دارد
  datasetVersion: number
  rowCount: number
}

/** وضعیت فایل Parquet مجموعه‌داده (بدون ساخت) */
export async function getParquetStatus(datasetId: string): Promise<ParquetStatus> {
  const engine = await getEngine()
  const ds = await db.dataset.findUnique({ where: { id: datasetId }, select: { version: true, rowCount: true } })
  const metaPath = path.join(PARQUET_DIR, `${datasetId}.meta.json`)
  const parquetPath = path.join(PARQUET_DIR, `${datasetId}.parquet`)
  const exists = existsSync(parquetPath)
  let meta: ParquetMeta | null = null
  if (exists && existsSync(metaPath)) {
    try {
      meta = JSON.parse(readFileSync(metaPath, 'utf8')) as ParquetMeta
      // اندازه واقعی فایل ملاک است
      meta.bytes = statSync(parquetPath).size
    } catch {
      meta = null
    }
  }
  return {
    engineAvailable: engine !== null,
    exists,
    meta,
    stale: Boolean(meta && ds && meta.version !== ds.version),
    datasetVersion: ds?.version ?? 0,
    rowCount: ds?.rowCount ?? 0,
  }
}

// ————————————————————————————— پرس‌وجوی امن DuckDB —————————————————————————————

/**
 * فهرست سیاه کلیدواژه‌ها — پرس‌وجوی کاربر فقط خواندنی است (بخش ۲۹ سند):
 * هرگونه DDL/DML، دسترسی فایل‌سیستم (read_csv/read_parquet/...)، پیکربندی و تراکنش مسدود است.
 * کاربر با نمای آماده «ds» کار می‌کند؛ خواندن مستقیم مسیر فایل‌ها ممنوع.
 */
const SQL_FORBIDDEN = new RegExp(
  [
    'copy', 'attach', 'detach', 'install', 'load', 'set', 'reset', 'pragma', 'call',
    'checkpoint', 'vacuum', 'export', 'import', 'insert', 'update', 'delete', 'drop',
    'alter', 'create', 'grant', 'revoke', 'use', 'begin', 'commit', 'rollback',
    'prepare', 'execute', 'read_csv', 'read_json', 'read_parquet', 'read_text',
    'read_blob', 'parquet_scan', 'glob', 'sniff_csv', 'write_file', 'sha256',
  ].join('|'),
  'i'
)

/** اعتبارسنجی پرس‌وجوی کاربر — تک‌دستوری، فقط SELECT/WITH، بدون کامنت پنهان‌کننده */
export function validateUserSql(raw: string): { ok: true; sql: string } | { ok: false; message: string } {
  const sql = raw.trim()
  if (!sql) return { ok: false, message: 'پرس‌وجو خالی است.' }
  // حذف کامنت‌ها تا کلیدواژه در کامنت پنهان نشود
  const stripped = sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
  // تک‌دستوری بودن — جداکننده در میان فقط با کامنت ممکن می‌شد
  if (/;/.test(stripped.replace(/;\s*$/, ''))) {
    return { ok: false, message: 'فقط یک دستور واحد پذیرفته می‌شود.' }
  }
  if (!/^\s*(select|with)\b/i.test(stripped)) {
    return { ok: false, message: 'فقط پرس‌وجوی خواندنی (SELECT یا WITH) مجاز است.' }
  }
  const forbidden = stripped.match(SQL_FORBIDDEN)
  if (forbidden) {
    return { ok: false, message: `کلیدواژه «${forbidden[0].toUpperCase()}» در پرس‌وجوی خواندنی مجاز نیست.` }
  }
  return { ok: true, sql: sql.replace(/;\s*$/, '') }
}

/** نرمال‌سازی مقادیر برگشتی DuckDB به JSON ساده */
function normalizeValue(v: unknown): unknown {
  if (v === null || v === undefined) return null
  const t = typeof v
  if (t === 'string' || t === 'boolean' || t === 'number') return v
  if (t === 'bigint') return Number(v)
  const ctor = (v as object).constructor?.name
  if (ctor === 'DuckDBDecimalValue') {
    const o = v as { value: bigint; scale: number }
    return Number(o.value) / Math.pow(10, o.scale)
  }
  if (ctor === 'DuckDBTimestampValue' || ctor === 'DuckDBTimestampMSValue' || ctor === 'DuckDBTimestampSecValue') {
    const o = v as { micros?: bigint; millis?: bigint; seconds?: bigint }
    if (o.micros !== undefined) return new Date(Number(o.micros / 1000n)).toISOString()
    if (o.millis !== undefined) return new Date(Number(o.millis)).toISOString()
    if (o.seconds !== undefined) return new Date(Number(o.seconds) * 1000).toISOString()
  }
  if (ctor === 'DuckDBDateValue') {
    const o = v as { days?: number }
    if (o.days !== undefined) return new Date(Date.UTC(1970, 0, 1) + o.days * 86400000).toISOString().slice(0, 10)
  }
  if (v instanceof Date) return v.toISOString()
  // پوشش بقیه انواع بسته‌شده (HugeInt و ...) با رشته
  const s = String(v)
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}

export interface DuckQueryResult {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  truncated: boolean
  tookMs: number
}

export const DUCK_ROW_LIMIT = 2000

/**
 * اجرای پرس‌وجوی خواندنی روی فایل Parquet مجموعه‌داده از طریق نمای «ds».
 * پرس‌وجو همیشه با سقف ردیف پوشانده می‌شود — حتی اگر کاربر LIMIT ننوشته باشد.
 */
export async function queryDatasetParquet(datasetId: string, userSql: string): Promise<DuckQueryResult> {
  const engine = await getEngine()
  if (!engine) throw new Error('موتور DuckDB در دسترس نیست.')

  const parquetPath = path.join(PARQUET_DIR, `${datasetId}.parquet`)
  if (!existsSync(parquetPath)) {
    throw new Error('فایل Parquet این مجموعه‌داده هنوز ساخته نشده است؛ ابتدا «ساخت فایل Parquet» را اجرا کنید.')
  }

  const check = validateUserSql(userSql)
  if (!check.ok) throw new Error(check.message)

  const started = Date.now()
  return enqueue(engine, async () => {
    // نمای read-only فقط برای همین مجموعه‌داده
    await engine.conn.run(
      `CREATE OR REPLACE VIEW ds AS SELECT * FROM read_parquet('${parquetPath.replace(/'/g, "''")}')`
    )
    const wrapped = `SELECT * FROM (${check.sql}) __user_q LIMIT ${DUCK_ROW_LIMIT + 1}`
    const result = await engine.conn.run(wrapped)
    const need = DUCK_ROW_LIMIT + 1
    const all: unknown[][] = []
    for (let c = 0; c < result.chunkCount && all.length < need; c++) {
      const rows = result.getChunk(c).getRows()
      for (const r of rows) {
        if (all.length >= need) break
        all.push(r.map(normalizeValue))
      }
    }
    const truncated = all.length > DUCK_ROW_LIMIT
    if (truncated) all.length = DUCK_ROW_LIMIT
    // نام ستون‌ها از توصیف همان پرس‌وجو — دقیق و مستقل از نحوه اجرا
    let columns: string[] = []
    try {
      const desc = await engine.conn.run(`DESCRIBE SELECT * FROM (${check.sql}) __user_q LIMIT 0`)
      if (desc.rowCount > 0) {
        const drows = desc.getChunk(0).getRows()
        columns = drows.map(r => String(r[0]))
      }
    } catch {
      columns = []
    }
    return { columns, rows: all, rowCount: all.length, truncated, tookMs: Date.now() - started }
  })
}
