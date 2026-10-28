// صفحه اشتراک عمومی گزارش منتشرشده — «انتشار» بدون نیاز به ورود
// دسترسی با توکن لینک (/share/<token>) فقط برای گزارش «منتشرشده»؛ لغو انتشار یا غیرفعال‌سازی
// لینک بلافاصله صفحه را از دسترس خارج می‌کند. داده‌ها با نقش مشاهده‌کننده ماسک می‌شود
// (ستون‌های محرمانه هرگز در لینک عمومی نمایش داده نمی‌شوند — بخش ۲۹ سند).

import { db } from '@/lib/db'
import { parseJson } from '@/lib/server'
import { FieldMeta, DataRow, QuerySpec } from '@/lib/types'
import { maskRecords, maskFieldsMeta } from '@/lib/auth'
import { buildAutoDashboard, applyLayout, AutoDashLayout } from '@/lib/autodash'
import { runQuery, measureAlias } from '@/lib/query'
import { buildSmartReportInner, SMART_REPORT_CSS } from '@/lib/smart-report'
import { toPersianDigits } from '@/lib/digits'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false } }

const faNum = (n: number | string): string => toPersianDigits(String(n))

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const faGroup = (n: unknown): string => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return '—'
  const s = (Math.round(v * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, '٬')
  return (v < 0 ? '−' : '') + faNum(s)
}

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '18px' }}>
      <style dangerouslySetInnerHTML={{ __html: SMART_REPORT_CSS }} />
      {children}
    </div>
  )
}

function NotAvailable({ reason }: { reason: string }) {
  return (
    <Shell>
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="banner" style={{ background: 'linear-gradient(135deg,#334155,#64748b)' }}>
          <h1 style={{ fontSize: 19 }}>گزارش در دسترس نیست</h1>
          <div className="sub">{reason}</div>
        </div>
        <div className="section" style={{ fontSize: 13, lineHeight: 2 }}>
          این لینک عمومی معتبر نیست یا اشتراک گزارش لغو شده است. لطفاً برای دریافت لینک جدید با مدیر سامانه یا طراح گزارش تماس بگیرید.
          <br />
          گزارش‌های منتشرشده از مسیر «گزارش‌ها ← انتشار» و صدور لینک عمومی در دسترس قرار می‌گیرند.
        </div>
      </div>
    </Shell>
  )
}

/** رندر گزارش طراح‌گزارش (بدون داشبورد هوشمند) به‌صورت HTML ایستا با همان استایل */
function builderReportHtml(
  reportTitle: string,
  description: string,
  fields: FieldMeta[],
  records: DataRow[],
  cfg: { dimensions?: string[]; measures?: { fieldId?: string; agg: string }[]; filters?: QuerySpec['filters']; chartType?: string },
  metaFa: string,
): string {
  const spec: QuerySpec = {
    dimensions: Array.isArray(cfg.dimensions) ? cfg.dimensions.slice(0, 3) : [],
    measures: Array.isArray(cfg.measures) ? cfg.measures.map(m => ({ fieldId: m.fieldId, agg: m.agg as QuerySpec['measures'][number]['agg'] })) : [],
    filters: cfg.filters ?? [],
    limit: 200,
  }
  let result
  try {
    result = runQuery(records, fields, spec)
  } catch {
    return `<div class="section">اجرای پرس‌وجوی این گزارش ممکن نشد — پیکربندی گزارش با ساختار فعلی داده سازگار نیست.</div>`
  }
  if (result.rows.length === 0) {
    return `<div class="section">این گزارش در حال حاضر ردیفی برای نمایش ندارد (فیلترها یا داده تغییر کرده است).</div>`
  }

  const aliases = spec.measures.map(m => measureAlias(m.fieldId, m.agg, fields))
  const dimKeys = spec.dimensions
  const headerCells = [...dimKeys.map(k => esc(fields.find(f => f.id === k)?.label ?? k)), ...aliases.map(a => esc(a))]
  const bodyRows = result.rows.slice(0, 100).map(r => `<tr>
    ${dimKeys.map(k => `<td>${esc(r[k] ?? '—')}</td>`).join('')}
    ${aliases.map(a => `<td class="num">${faGroup(r[a])}</td>`).join('')}
  </tr>`).join('')
  const totalRow = `<tr style="background:#f0fdf4;font-weight:700">
    <td>جمع کل</td>
    ${dimKeys.slice(1).map(() => '<td></td>').join('')}
    ${aliases.map(a => `<td class="num">${faGroup(result.totals[a])}</td>`).join('')}
  </tr>`

  // نمودار میله‌ای ایستا — سنجه اول × بُعد اول
  let chart = ''
  if (dimKeys.length > 0 && aliases.length > 0) {
    const m = aliases[0]
    const top = [...result.rows].sort((a, b) => Math.abs(Number(b[m]) || 0) - Math.abs(Number(a[m]) || 0)).slice(0, 10)
    const max = Math.max(...top.map(r => Math.abs(Number(r[m]) || 0)), 1)
    const bars = top.map((r, i) => `<div class="hbar">
      <span class="nm" title="${esc(r[dimKeys[0]] ?? '—')}">${esc(r[dimKeys[0]] ?? '—')}</span>
      <div class="track"><div class="fill" style="width:${Math.max(1.5, Math.round((Math.abs(Number(r[m]) || 0) / max) * 100))}%;background:${PALETTE[i % PALETTE.length]}"></div></div>
      <span class="vl">${faGroup(Number(r[m]) || 0)}</span><span class="pc"></span>
    </div>`).join('')
    chart = `<div class="section"><h2>نمودار گزارش — ${esc(aliases[0])} به تفکیک ${esc(fields.find(f => f.id === dimKeys[0])?.label ?? '')}</h2>${bars}</div>`
  }

  return `
  <div class="banner">
    <h1>${esc(reportTitle)}</h1>
    ${description ? `<div class="sub">${esc(description)}</div>` : ''}
    <div class="chips">
      <span class="chip">🕘 ${esc(metaFa)}</span>
      <span class="chip">🧾 ${faNum(result.rowCount.toLocaleString('en-US')).replace(/,/g, '٬')} ردیف تجمیع‌شده</span>
      ${cfg.chartType ? `<span class="chip">نوع نمایش: ${esc(cfg.chartType)}</span>` : ''}
    </div>
  </div>
  ${chart}
  <div class="section"><h2>جدول گزارش</h2>
    <table>
      <thead><tr>${headerCells.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${bodyRows}${totalRow}</tbody>
    </table>
    ${result.warnings.length ? `<div class="masked-note" style="margin-top:8px">⚠ ${result.warnings.map(w => esc(w)).join(' | ')}</div>` : ''}
  </div>
  <div class="foot">این صفحه از طریق لینک عمومی گزارش منتشرشده در دسترس است — لغو انتشار، لینک را بلافاصله غیرفعال می‌کند | ${esc(metaFa)}</div>`
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const report = await db.report.findUnique({ where: { shareToken: token } })

  if (!report || report.status !== 'published') {
    return <NotAvailable reason="لینک نامعتبر است یا اشتراک این گزارش لغو شده است." />
  }
  if (!report.datasetId) {
    return <NotAvailable reason="این گزارش به مجموعه‌داده‌ای متصل نیست و قابل نمایش عمومی نیست." />
  }

  const ds = await db.dataset.findUnique({ where: { id: report.datasetId } })
  if (!ds) return <NotAvailable reason="مجموعه‌داده این گزارش حذف شده است." />

  // ماسک با نقش مشاهده‌کننده — ستون‌های محرمانه در لینک عمومی نمایش داده نمی‌شوند
  const fields = parseJson<FieldMeta[]>(ds.fields, [])
  const records = parseJson<DataRow[]>(ds.records, [])
  const visibleFields = maskFieldsMeta(fields, 'viewer')
  const masked = maskRecords(records, fields, 'viewer')

  const cfg = parseJson<Record<string, unknown>>(report.config, {})
  const metaFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' }).format(report.publishedAt ?? new Date())

  let inner = ''
  if (cfg.kind === 'autodash') {
    const dash = buildAutoDashboard(ds.name, masked, visibleFields)
    // چیدمان در config گزارش به‌صورت آبجکت ذخیره شده (و در نسخه‌های قدیمی رشته JSON)
    const layoutRaw: unknown = cfg.layout
    const layout: AutoDashLayout = typeof layoutRaw === 'string'
      ? parseJson<AutoDashLayout>(layoutRaw, {})
      : layoutRaw && typeof layoutRaw === 'object' ? (layoutRaw as AutoDashLayout) : {}
    const applied = applyLayout(dash, layout)
    inner = buildSmartReportInner(applied, {
      title: report.title,
      subtitle: report.description ?? undefined,
      datasetName: ds.name,
      rowCount: masked.length,
      columnCount: visibleFields.length,
      dataVersion: ds.version,
      generatedAtFa: `${metaFa} | انتشار عمومی`,
      confidentialHidden: fields.length - visibleFields.length,
    })
    // پانوشت اختصاصی اشتراک عمومی
    inner += `<div class="foot">🔒 این صفحه از طریق لینک عمومی گزارش منتشرشده در دسترس است؛ لغو انتشار، لینک را بلافاصله غیرفعال می‌کند.</div>`
  } else {
    inner = `<div class="page">${builderReportHtml(
      report.title,
      report.description ?? '',
      visibleFields,
      masked,
      cfg as never,
      metaFa,
    )}</div>`
  }

  return (
    <Shell>
      <div dangerouslySetInnerHTML={{ __html: inner }} />
    </Shell>
  )
}
