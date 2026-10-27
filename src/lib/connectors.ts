// اتصال به پایگاه‌داده و API خارجی — بخش ۳۱ سند («اتصال API و پایگاه‌داده» — اختیاری / مرحله توسعه)
// انواع پشتیبانی‌شده: api (سرویس REST/JSON) | postgres | mysql
// نکات امنیتی (بخش ۲۹): پرس‌وجوی فقط‌خواندنی، مهلت زمانی، سقف سطر، ماسک مقادیر محرمانه در پاسخ API

import { db } from './db'
import { parseJson, buildFieldMetas, rekeyRecords } from './server'
import { DataRow, FieldMeta } from './types'
import { getSettings } from './settings'

export const CONNECTION_TYPES = ['api', 'postgres', 'mysql'] as const
export type ConnectionType = (typeof CONNECTION_TYPES)[number]

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  api: 'سرویس API (REST/JSON)',
  postgres: 'پایگاه‌داده PostgreSQL',
  mysql: 'پایگاه‌داده MySQL / MariaDB',
}

export interface ApiConfig {
  url: string
  method?: string // GET | POST (پیش‌فرض GET)
  headers?: Record<string, string>
  body?: string
  authToken?: string // در صورت مقدار، سربرگ Authorization: Bearer ساخته می‌شود (ماسک می‌شود)
  responsePath?: string // مسیر آرایه داده در پاسخ، مثلاً data.items — خالی = کل پاسخ
}

export interface DbConfig {
  host: string
  port?: number
  database: string
  user: string
  password?: string
  ssl?: boolean
}

export interface ConnectionRecord {
  id: string
  projectId: string
  name: string
  type: ConnectionType
  config: Partial<ApiConfig> & Partial<DbConfig>
  query: string | null
  syncIntervalMinutes: number
  status: string
  lastMessage: string | null
  lastSyncAt: Date | null
  lastSyncRows: number
  datasetId: string | null
}

export interface FetchResult {
  rows: DataRow[]
  fields: FieldMeta[]
  message: string
}

const REQUEST_TIMEOUT_MS = 15_000
const MAX_PREVIEW_ROWS = 20

// کلیدهای محرمانه پیکربندی که در پاسخ API ماسک می‌شوند — بخش ۲۹
export const SECRET_CONFIG_KEYS = ['password', 'authToken']
export const CONFIG_MASK = '***'

/** پرس‌وجوی SQL فقط‌خواندنی — جلوگیری از تزریق و تغییر داده (بخش ۲۹: حفاظت در برابر تزریق) */
export function assertReadOnlySql(sql: string): void {
  const clean = sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) throw new Error('دستور SQL خالی است.')
  if (!/^(select|with)\b/i.test(clean)) {
    throw new Error('فقط دستور SELECT (یا WITH) مجاز است — اتصال‌های تحلیلی فقط‌خواندنی هستند (بخش ۲۹ سند).')
  }
  const inner = clean.replace(/;+\s*$/, '')
  if (/;/.test(inner)) throw new Error('چند دستور SQL در یک درخواست مجاز نیست.')
}

/** پوشش خطاهای رایج اتصال با پیام فارسی عملیاتی */
export function describeConnectionError(e: unknown): string {
  const err = e as { code?: string; message?: string; cause?: { code?: string } }
  const code = err?.code ?? err?.cause?.code ?? ''
  const msg = err instanceof Error ? err.message : String(e)
  if (code === 'ECONNREFUSED') return 'اتصال به میزبان برقرار نشد (ECONNREFUSED) — آدرس و پورت را بررسی کنید.'
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'میزبان یافت نشد (ENOTFOUND) — نام host/URL را بررسی کنید.'
  if (code === 'ETIMEDOUT' || /timeout/i.test(msg)) return 'مهلت اتصال به پایان رسید — میزبان یا شبکه پاسخگو نبود.'
  if (code === 'ERR_INVALID_URL') return 'آدرس URL نامعتبر است.'
  if (/access denied|authentication failed|password authentication failed|28P01|1045/i.test(msg)) {
    return 'احراز هویت رد شد — نام کاربری یا گذرواژه نادرست است.'
  }
  if (/unknown database|does not exist|3D000|1049/i.test(msg)) return 'پایگاه‌داده موردنظر یافت نشد.'
  return msg
}

/** استخراج آرایه داده از پاسخ API بر اساس مسیر نقطه‌ای (مثلاً data.items) */
function pickPath(payload: unknown, path?: string): unknown {
  if (!path || !path.trim()) return payload
  let cur: unknown = payload
  for (const part of path.split('.').filter(Boolean)) {
    if (cur === null || cur === undefined) return null
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

/** ساخت متادیتای فیلد از رکوردهای خام — ستون‌ها از اتحاد کلیدها */
function buildFieldsFromRows(rows: DataRow[]): { fields: FieldMeta[]; records: DataRow[] } {
  const headerSet = new Set<string>()
  for (const r of rows.slice(0, 200)) {
    for (const k of Object.keys(r)) headerSet.add(k)
  }
  const headers = [...headerSet]
  const records = rows.map(r => {
    const out: DataRow = {}
    for (const h of headers) out[h] = r[h] ?? null
    return out
  })
  const fields = buildFieldMetas(headers, records, headers.map(() => 20))
  return { fields, records: rekeyRecords(records, fields) }
}

/** دریافت داده از سرویس API خارجی */
async function fetchFromApi(cfg: ApiConfig, limit: number): Promise<FetchResult> {
  if (!cfg.url) throw new Error('آدرس URL سرویس تنظیم نشده است.')
  const headers: Record<string, string> = { Accept: 'application/json', ...(cfg.headers ?? {}) }
  if (cfg.authToken) headers.Authorization = `Bearer ${cfg.authToken}`
  const method = (cfg.method ?? 'GET').toUpperCase()
  const res = await fetch(cfg.url, {
    method,
    headers,
    body: method === 'GET' || !cfg.body ? undefined : cfg.body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`سرویس خارجی پاسخ ${res.status} داد. ${text.slice(0, 200)}`)
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (!/json/i.test(contentType)) throw new Error(`پاسخ سرویس JSON نیست (${contentType || 'نامشخص'}) — بخش ۳۱ فقط پاسخ JSON را پشتیبانی می‌کند.`)
  const payload: unknown = await res.json()
  const picked = pickPath(payload, cfg.responsePath)
  if (picked === null || picked === undefined) {
    throw new Error(`مسیر «${cfg.responsePath}» در پاسخ یافت نشد — responsePath را بررسی کنید.`)
  }
  const list = Array.isArray(picked) ? picked : [picked]
  const rows: DataRow[] = []
  for (const item of list) {
    if (item === null || typeof item !== 'object') continue
    rows.push(item as DataRow)
    if (rows.length >= limit) break
  }
  const { fields, records } = buildFieldsFromRows(rows)
  return { rows: records, fields, message: `${rows.length.toLocaleString('fa-IR')} رکورد از سرویس API دریافت شد` }
}

/** دریافت داده از PostgreSQL — درایور pg به‌صورت پویا بارگذاری می‌شود */
async function fetchFromPostgres(cfg: DbConfig, sql: string, limit: number): Promise<FetchResult> {
  assertReadOnlySql(sql)
  let ClientCtor: (typeof import('pg'))['Client']
  try {
    const mod = await import('pg')
    ClientCtor = mod.Client
  } catch {
    throw new Error('درایور PostgreSQL نصب نیست — بسته pg را نصب کنید (npm install).')
  }
  const client = new ClientCtor({
    host: cfg.host,
    port: cfg.port ?? 5432,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: REQUEST_TIMEOUT_MS,
  })
  try {
    await client.connect()
    const res = await client.query(sql)
    const raw = Array.isArray(res) ? res[0].rows : res.rows
    const rows: DataRow[] = raw.slice(0, limit).map(r => ({ ...(r as DataRow) }))
    const { fields, records } = buildFieldsFromRows(rows)
    return { rows: records, fields, message: `${rows.length.toLocaleString('fa-IR')} رکورد از PostgreSQL دریافت شد` }
  } finally {
    await client.end().catch(() => undefined)
  }
}

/** دریافت داده از MySQL / MariaDB — درایور mysql2 به‌صورت پویا بارگذاری می‌شود */
async function fetchFromMysql(cfg: DbConfig, sql: string, limit: number): Promise<FetchResult> {
  assertReadOnlySql(sql)
  let mysql: typeof import('mysql2/promise')
  try {
    mysql = await import('mysql2/promise')
  } catch {
    throw new Error('درایور MySQL نصب نیست — بسته mysql2 را نصب کنید (npm install).')
  }
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port ?? 3306,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: REQUEST_TIMEOUT_MS,
  })
  try {
    const [rowsRaw] = await conn.query(sql)
    const list = Array.isArray(rowsRaw) ? rowsRaw : [rowsRaw]
    const rows: DataRow[] = (list as DataRow[]).slice(0, limit).map(r => ({ ...r }))
    const { fields, records } = buildFieldsFromRows(rows)
    return { rows: records, fields, message: `${rows.length.toLocaleString('fa-IR')} رکورد از MySQL دریافت شد` }
  } finally {
    await conn.end().catch(() => undefined)
  }
}

/** دریافت داده از منبع خارجی بر اساس نوع اتصال */
export async function fetchExternalRows(conn: ConnectionRecord, limit?: number): Promise<FetchResult> {
  const settings = await getSettings()
  const cap = Math.min(limit ?? settings.maxRowsPerDataset, settings.maxRowsPerDataset)
  try {
    let result: FetchResult
    if (conn.type === 'api') {
      result = await fetchFromApi(conn.config as ApiConfig, cap)
    } else if (conn.type === 'postgres') {
      result = await fetchFromPostgres(conn.config as DbConfig, conn.query ?? '', cap)
    } else if (conn.type === 'mysql') {
      result = await fetchFromMysql(conn.config as DbConfig, conn.query ?? '', cap)
    } else {
      throw new Error(`نوع اتصال «${conn.type}» پشتیبانی نمی‌شود.`)
    }
    if (result.rows.length === 0) throw new Error('منبع خارجی هیچ رکوردی برنگرداند — پرس‌وجو یا مسیر پاسخ را بررسی کنید.')
    return result
  } catch (e) {
    throw new Error(describeConnectionError(e))
  }
}

/** آزمون اتصال — بدون تغییر داده؛ وضعیت و پیام در رکورد اتصال ثبت می‌شود */
export async function testConnection(conn: ConnectionRecord): Promise<{ ok: boolean; message: string; fieldCount?: number; rowCount?: number }> {
  try {
    const result = await fetchExternalRows(conn, MAX_PREVIEW_ROWS)
    await db.externalConnection.update({
      where: { id: conn.id },
      data: { status: 'ok', lastMessage: result.message },
    })
    return { ok: true, message: result.message, fieldCount: result.fields.length, rowCount: result.rows.length }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطای ناشناخته'
    await db.externalConnection
      .update({ where: { id: conn.id }, data: { status: 'error', lastMessage: message } })
      .catch(() => undefined)
    return { ok: false, message }
  }
}

/** ساخت مجموعه‌داده از رکوردهای منبع خارجی و جایگزینی نسخه‌ها در همگام‌سازی بعدی */
export async function syncConnectionDataset(
  conn: ConnectionRecord,
  actor: string
): Promise<{ ok: boolean; message: string; datasetId?: string; created?: boolean; version?: number; rowCount?: number }> {
  try {
    const result = await fetchExternalRows(conn)
    const existing = conn.datasetId ? await db.dataset.findUnique({ where: { id: conn.datasetId } }) : null

    if (existing) {
      // جایگزینی نسخه — گزارش‌ها و روابط حفظ می‌شوند؛ نسخه افزایش می‌یابد (بخش ۲۴.۳)
      const updated = await db.dataset.update({
        where: { id: existing.id },
        data: {
          records: JSON.stringify(result.rows),
          fields: JSON.stringify(result.fields),
          rowCount: result.rows.length,
          version: { increment: 1 },
          config: JSON.stringify({ sourceConnection: conn.id, sourceType: conn.type, syncedAt: new Date().toISOString() }),
        },
      })
      await db.externalConnection.update({
        where: { id: conn.id },
        data: { status: 'ok', lastMessage: result.message, lastSyncAt: new Date(), lastSyncRows: result.rows.length },
      })
      return { ok: true, message: `مجموعه‌داده «${existing.name}» به نسخه v${updated.version} به‌روزرسانی شد`, datasetId: existing.id, created: false, version: updated.version, rowCount: result.rows.length }
    }

    const created = await db.dataset.create({
      data: {
        projectId: conn.projectId,
        name: conn.name,
        sheetName: `اتصال ${conn.type.toUpperCase()}`,
        fields: JSON.stringify(result.fields),
        records: JSON.stringify(result.rows),
        rowCount: result.rows.length,
        status: 'draft',
        config: JSON.stringify({ sourceConnection: conn.id, sourceType: conn.type, syncedAt: new Date().toISOString() }),
      },
    })
    await db.externalConnection.update({
      where: { id: conn.id },
      data: { status: 'ok', lastMessage: result.message, lastSyncAt: new Date(), lastSyncRows: result.rows.length, datasetId: created.id },
    })
    return { ok: true, message: `مجموعه‌داده «${conn.name}» با ${result.rows.length.toLocaleString('fa-IR')} رکورد ساخته شد`, datasetId: created.id, created: true, version: created.version, rowCount: result.rows.length }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'خطای ناشناخته همگام‌سازی'
    await db.externalConnection
      .update({ where: { id: conn.id }, data: { status: 'error', lastMessage: message } })
      .catch(() => undefined)
    return { ok: false, message }
  }
}

/** چرخه همگام‌سازی زمان‌بندی‌شده — از tick زمان‌بند فراخوانی می‌شود (بخش ۳۱: زمان‌بندی بسته به منبع داده) */
export async function runDueConnectionSyncs(): Promise<{ checked: number; synced: number; failed: number }> {
  const conns = await db.externalConnection.findMany({ where: { syncIntervalMinutes: { gt: 0 } } })
  let synced = 0
  let failed = 0
  const now = Date.now()
  for (const row of conns) {
    const due = !row.lastSyncAt || now - row.lastSyncAt.getTime() >= row.syncIntervalMinutes * 60_000
    if (!due) continue
    const conn = toConnectionRecord(row)
    const res = await syncConnectionDataset(conn, 'زمان‌بند همگام‌سازی')
    if (res.ok) synced++
    else failed++
  }
  return { checked: conns.length, synced, failed }
}

/** تبدیل رکورد Prisma به ساختار با config پارس‌شده */
export function toConnectionRecord(row: {
  id: string
  projectId: string
  name: string
  type: string
  config: string
  query: string | null
  syncIntervalMinutes: number
  status: string
  lastMessage: string | null
  lastSyncAt: Date | null
  lastSyncRows: number
  datasetId: string | null
}): ConnectionRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    type: row.type as ConnectionType,
    config: parseJson<Partial<ApiConfig> & Partial<DbConfig>>(row.config, {}),
    query: row.query,
    syncIntervalMinutes: row.syncIntervalMinutes,
    status: row.status,
    lastMessage: row.lastMessage,
    lastSyncAt: row.lastSyncAt,
    lastSyncRows: row.lastSyncRows,
    datasetId: row.datasetId,
  }
}
