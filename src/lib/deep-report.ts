// گزارش تحلیلی جامع (فاز هجدهم) — «پُر و پیمان، نه سطحی»
// ---------------------------------------------------------------
// رندرکنندهٔ HTML خودبسندهٔ گزارش از خروجی موتور تحلیل عمیق (deep-analysis).
// هدف: هم‌سطح داشبوردهای دستی جامع — خلاصه مدیریتی، KPI، روند سالانه/ماهانه/فصلی،
// ترکیب سبد، تحلیل مالی، قراردادها، SWOT، نقشه راه، اهداف KPI و صحت‌سنجی داده —
// با نمودارهای SVG خالص، چاپ‌پذیر (A4) و بدون هیچ وابستگی خارجی.

import { DeepAnalysis, DeepItem, faPct1, faGroupShort } from './deep-analysis'
import { svgLineChart, svgBarChart, svgGroupedBars, hBars, donutChart, faCompact, CHART_PALETTE } from './report-charts'

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const faNum = (n: number | string): string => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])

const faGroup = (n: number): string => {
  if (!Number.isFinite(n)) return '—'
  const s = Math.round(Math.abs(n) * 100) / 100
  const grouped = s.toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, '٬')
  return (n < 0 ? '−' : '') + faNum(grouped)
}

const faFull = (n: number): string => faNum(Math.round(n).toLocaleString('en-US').replace(/,/g, '٬'))
const fmtDateCell = (s: string): string => (s ? faNum(s) : '—')

export interface DeepReportMeta {
  title: string
  datasetName: string
  project?: string
  rowCount: number
  columnCount: number
  dataVersion: number
  generatedAtFa: string
  confidentialHidden?: number
  sourceFileName?: string
}

// ─────────────────────────── استایل (خودبسنده) ───────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif; background: #eef2f6; color: #0f172a; direction: rtl; padding: 20px; }
  .page { max-width: 1160px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
  .banner { background: linear-gradient(135deg, #064e3b 0%, #047857 45%, #10b981 100%); color: #fff; border-radius: 18px; padding: 30px 32px 24px; position: relative; overflow: hidden; }
  .banner::after { content: ''; position: absolute; inset-inline-start: -50px; top: -60px; width: 220px; height: 220px; border-radius: 50%; background: rgba(255,255,255,.08); }
  .banner::before { content: ''; position: absolute; inset-inline-end: -30px; bottom: -80px; width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,.06); }
  .banner h1 { font-size: 25px; font-weight: 800; margin-bottom: 8px; position: relative; }
  .banner .sub { font-size: 13.5px; opacity: .94; position: relative; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; position: relative; }
  .chip { background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.28); border-radius: 999px; padding: 4px 13px; font-size: 11.5px; }
  .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(15,23,42,.05); }
  .section > h2 { font-size: 16px; font-weight: 800; color: #065f46; display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .secno { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; border-radius: 8px; background: #065f46; color: #fff; font-size: 13px; }
  .muted { color: #64748b; font-size: 11px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .cols-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media (max-width: 760px) { .cols, .cols-3 { grid-template-columns: 1fr; } }
  .card { border: 1px solid #e2e8f0; border-radius: 13px; padding: 14px 16px; background: #fbfdfc; }
  .card .t { font-weight: 800; font-size: 12.5px; color: #0f172a; margin-bottom: 10px; }
  /* خلاصه مدیریتی */
  .assess { display: flex; gap: 16px; align-items: stretch; flex-wrap: wrap; }
  .assess .text { flex: 1.6; min-width: 300px; font-size: 13px; line-height: 2; color: #1e293b; text-align: justify; }
  .assess .text b { color: #065f46; }
  .verdict { flex: 1; min-width: 210px; border-radius: 13px; padding: 16px 18px; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
  .verdict .v-label { font-size: 11.5px; opacity: .85; }
  .verdict .v-value { font-size: 19px; font-weight: 800; }
  .verdict .v-sub { font-size: 11px; opacity: .85; line-height: 1.9; }
  .verdict.strong { background: linear-gradient(135deg,#065f46,#059669); color: #fff; }
  .verdict.grow { background: linear-gradient(135deg,#1d4ed8,#3b82f6); color: #fff; }
  .verdict.mixed { background: linear-gradient(135deg,#92400e,#f59e0b); color: #fff; }
  .verdict.warn { background: linear-gradient(135deg,#991b1b,#ef4444); color: #fff; }
  .ministats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 14px; }
  .ministat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 11px; padding: 10px 13px; }
  .ministat .k { font-size: 10.5px; color: #64748b; margin-bottom: 4px; }
  .ministat .v { font-size: 15px; font-weight: 800; color: #065f46; }
  /* KPI */
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(195px, 1fr)); gap: 11px; }
  .kpi { border: 1px solid #e2e8f0; border-inline-start: 4px solid var(--ac, #10b981); border-radius: 13px; padding: 13px 15px; background: #f8fafc; }
  .kpi .lbl { font-size: 11.5px; color: #475569; margin-bottom: 7px; }
  .kpi .val { font-size: 21px; font-weight: 800; color: #0f172a; line-height: 1.3; }
  .kpi .sub { margin-top: 7px; font-size: 10.5px; color: #64748b; line-height: 1.8; }
  .kpi .unit { font-size: 10px; color: #64748b; font-weight: 400; }
  .trend { display: inline-block; margin-top: 7px; font-size: 10.5px; border-radius: 999px; padding: 2px 9px; }
  .trend.up { background: #dcfce7; color: #166534; } .trend.down { background: #fee2e2; color: #991b1b; } .trend.flat { background: #f1f5f9; color: #475569; }
  /* جداول */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #ecfdf5; color: #065f46; font-weight: 700; padding: 9px 11px; text-align: right; border-bottom: 2px solid #a7f3d0; white-space: nowrap; font-size: 11.5px; }
  td { padding: 8px 11px; border-bottom: 1px solid #f1f5f9; text-align: right; }
  tbody tr:hover td { background: #f8fafc; }
  td.num, th.num { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
  td.strong { font-weight: 700; }
  .delta-up { color: #16a34a; font-weight: 700; } .delta-down { color: #dc2626; font-weight: 700; } .delta-flat { color: #64748b; }
  tr.total-row td { background: #f0fdf4; font-weight: 800; border-top: 2px solid #a7f3d0; }
  .rank { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 7px; background: #ecfdf5; color: #065f46; font-weight: 800; font-size: 11px; }
  .rank.r1 { background: #fbbf24; color: #78350f; } .rank.r2 { background: #e2e8f0; color: #334155; } .rank.r3 { background: #fdba74; color: #7c2d12; }
  /* میله افقی */
  .hbar-list { display: flex; flex-direction: column; gap: 2px; }
  .hbar { display: grid; grid-template-columns: minmax(90px, 150px) 1fr 92px 52px; gap: 8px; align-items: center; padding: 4px 0; font-size: 11.5px; }
  .hbar .track { background: #f1f5f9; border-radius: 999px; height: 14px; overflow: hidden; }
  .hbar .fill { height: 100%; border-radius: 999px; min-width: 2px; }
  .hbar .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #334155; }
  .hbar .vl { text-align: left; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 11px; }
  .hbar .pc { text-align: left; color: #059669; font-size: 10.5px; }
  /* دونات */
  .donut-row { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
  .donut { width: 178px; height: 178px; border-radius: 50%; position: relative; flex-shrink: 0; }
  .donut::after { content: ''; position: absolute; inset: 45px; background: #fff; border-radius: 50%; box-shadow: 0 0 0 1px #e2e8f0; }
  .legend { display: flex; flex-direction: column; gap: 6px; font-size: 11.5px; flex: 1; min-width: 190px; }
  .legend .li { display: flex; align-items: center; gap: 8px; }
  .legend .dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .legend .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .legend .vv { font-weight: 700; }
  /* SWOT */
  .swot { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 700px) { .swot { grid-template-columns: 1fr; } }
  .swot .q { border-radius: 13px; padding: 14px 16px; border: 1px solid; }
  .swot .q h3 { font-size: 12.5px; font-weight: 800; margin-bottom: 9px; display: flex; align-items: center; gap: 7px; }
  .swot .q ul { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .swot .q li { font-size: 11.8px; line-height: 1.9; padding-inline-start: 14px; position: relative; }
  .swot .q li::before { content: ''; position: absolute; inset-inline-start: 0; top: .72em; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .55; }
  .swot .s { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }
  .swot .w { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; }
  .swot .o { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
  .swot .t { background: #fffbeb; border-color: #fde68a; color: #713f12; }
  /* بینش */
  .insights { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  @media (max-width: 700px) { .insights { grid-template-columns: 1fr; } }
  .ins { border-radius: 13px; padding: 13px 15px; border: 1px solid; font-size: 12px; line-height: 1.95; }
  .ins .t { font-weight: 800; font-size: 12.5px; margin-bottom: 5px; display: flex; align-items: center; gap: 7px; }
  .ins .ico { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 7px; background: rgba(255,255,255,.75); font-size: 12px; }
  .ins.good { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }
  .ins.bad { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; }
  .ins.warn { background: #fffbeb; border-color: #fde68a; color: #713f12; }
  .ins.info { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
  /* نقشه راه */
  .roadmap { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 700px) { .roadmap { grid-template-columns: 1fr; } }
  .step { border: 1px solid #e2e8f0; border-radius: 13px; padding: 14px 16px; background: #fbfdfc; display: flex; gap: 12px; }
  .step .n { flex-shrink: 0; width: 30px; height: 30px; border-radius: 10px; background: linear-gradient(135deg,#065f46,#10b981); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13.5px; }
  .step .tt { font-weight: 800; font-size: 12.5px; color: #0f172a; margin-bottom: 5px; }
  .step .tx { font-size: 11.8px; color: #334155; line-height: 1.95; text-align: justify; }
  .masked-note { font-size: 11.5px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 11px; padding: 9px 14px; line-height: 1.9; }
  .foot { text-align: center; font-size: 11px; color: #64748b; padding: 10px 0 4px; line-height: 2; }
  @page { size: A4; margin: 11mm; }
  @media print {
    body { background: #fff; padding: 0; }
    .page { max-width: none; gap: 11px; }
    .section { box-shadow: none; break-inside: avoid; border-radius: 12px; }
    .banner { border-radius: 12px; }
  }
`

export const DEEP_REPORT_CSS = CSS

// ─────────────────────────── ارزیابی وضعیت ───────────────────────────

function assessStatus(deep: DeepAnalysis): { cls: string; label: string; sub: string } {
  const lastFull = [...deep.annual].reverse().find(a => a.revenueGrowth !== null)
  const top3 = deep.items.slice(0, 3).reduce((s, i) => s + i.share, 0)
  const zeros = deep.items.filter(i => (i.byYear[i.byYear.length - 1]?.amount ?? 0) === 0 && i.totalAmount > 0).length
  const integrityOk = deep.integrity.length > 0 && deep.integrity.every(i => i.diffPct < 1)
  let score = 0
  if (lastFull) { if (lastFull.revenueGrowth! > 20) score += 2; else if (lastFull.revenueGrowth! > 0) score += 1; else score -= 2 }
  if (top3 < 75) score += 1
  if (zeros === 0) score += 1
  if (zeros > 3) score -= 1
  if (integrityOk) score += 1
  if (score >= 4) return { cls: 'strong', label: 'وضعیت: قوی و صعودی', sub: 'رشد پایدار درآمد همراه با صحت‌سنجی موفق داده‌ها؛ تمرکز بر حفظ شتاب و کاهش ریسک تمرکز سبد.' }
  if (score >= 2) return { cls: 'grow', label: 'وضعیت: روبه‌رشد', sub: 'مسیر درآمد صعودی است؛ با فعال‌سازی خدمات کم‌بازده و مدیریت تمرکز، رشد تثبیت می‌شود.' }
  if (score >= 0) return { cls: 'mixed', label: 'وضعیت: متعادل با هشدار', sub: 'عملکرد کلان مثبت است اما نشانه‌های افت یا تمرکز در بخشی از سبد، پایش جدی می‌خواهد.' }
  return { cls: 'warn', label: 'وضعیت: نیازمند توجه', sub: 'افت درآمد یا تمرکز پرریسک در سبد خدمات مشاهده می‌شود؛ بازنگری راهبرد خدمت‌دهی اولویت دارد.' }
}

// ─────────────────────────── سازنده گزارش ───────────────────────────

export function buildDeepReportHtml(deep: DeepAnalysis, meta: DeepReportMeta): string {
  return `<!doctype html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(meta.title)}</title>
<style>${CSS}</style>
</head>
<body>
${buildDeepReportInner(deep, meta)}
</body>
</html>`
}

export function buildDeepReportInner(deep: DeepAnalysis, meta: DeepReportMeta): string {
  const parts: string[] = []
  const sec = (no: number, title: string, body: string, extraClass = '') =>
    parts.push(`<div class="section ${extraClass}"><h2><span class="secno">${faNum(no)}</span>${esc(title)}</h2>${body}</div>`)

  // ═══ بنر ═══
  const rangeChip = deep.years.length ? `<span class="chip">📅 بازه: ${faNum(deep.years[0])} تا ${faNum(deep.years[deep.years.length - 1])}</span>` : ''
  parts.push(`<div class="banner">
    <h1>${esc(meta.title)}</h1>
    <div class="sub">تحلیل جامع خودکار «${esc(meta.datasetName)}» توسط سامانه — روند، ترکیب، مالی، صحت‌سنجی و پیشنهادهای اجرایی در یک نگاه</div>
    <div class="chips">
      <span class="chip">🗂 مجموعه‌داده: ${esc(meta.datasetName)}</span>
      ${meta.project ? `<span class="chip">📁 پروژه: ${esc(meta.project)}</span>` : ''}
      ${meta.sourceFileName ? `<span class="chip">📎 منبع: ${esc(meta.sourceFileName)}</span>` : ''}
      <span class="chip">🧾 ${faFull(meta.rowCount)} رکورد</span>
      <span class="chip">📐 ${faNum(meta.columnCount)} ستون</span>
      <span class="chip">🔍 ${faNum(deep.sheetsUsed.length)} شیت تحلیل‌شده</span>
      ${rangeChip}
      <span class="chip">🗄 نسخه داده: ${faNum(meta.dataVersion)}</span>
      <span class="chip">🕓 ${esc(meta.generatedAtFa)}</span>
    </div>
  </div>`)

  if (meta.confidentialHidden) {
    parts.push(`<div class="masked-note">🔒 ${faNum(meta.confidentialHidden)} ستون محرمانه مطابق سیاست دسترسی از این گزارش حذف شده است (بخش ۲۹ سند).</div>`)
  }

  // ═══ ۱) خلاصه مدیریتی ═══
  const st = assessStatus(deep)
  const lastFull = [...deep.annual].reverse().find(a => a.revenueGrowth !== null)
  const top = deep.items[0]
  const peakMonth = deep.monthly.length ? deep.monthly.reduce((a, b) => (b.revenue > a.revenue ? b : a)) : null
  const summaryText = deep.years.length
    ? `طی بازه <b>${faNum(deep.years[0])} تا ${faNum(deep.years[deep.years.length - 1])}</b>، شرکت در <b>${faNum(deep.monthsWithData)}</b> ماه دارای فعالیت، مجموعاً <b>${faGroupShort(deep.servicesTotalAll || 1)} ریال</b> درآمد خدمات و <b>${faFull(deep.volumeAll)}</b> واحد خدمت به مددجویان ارائه کرده است. ${lastFull ? `آخرین مقایسه سال‌های کامل (<b>${faNum(lastFull.year)}</b>) رشد <b>${faPct1(lastFull.revenueGrowth ?? 0)}</b> درآمد را نشان می‌دهد` : 'با توجه به ناقص‌بودن بازه برخی سال‌ها، مقایسه سالانه صرفاً برای سال‌های کامل معتبر است'}. ${top ? `ستون اصلی درآمد، خدمت <b>«${esc(top.label)}»</b> با سهم ${faPct1(top.share)} است` : ''}${peakMonth ? ` و اوج درآمد ماهانه در <b>${esc(peakMonth.label)}</b> (${faGroupShort(peakMonth.revenue)} ریال) ثبت شده است` : ''}. ${deep.vatTotal > 0 ? `مالیات بر ارزش افزوده دوره ${faGroupShort(deep.vatTotal)} ریال و مجموع کل درآمد و مالیات ${faGroupShort(deep.grandTotalAll)} ریال است.` : ''} ${deep.integrity.length ? `جمع‌های بازمحاسبه‌شده سامانه با ردیف‌های مجموع فایل ${deep.integrity.every(i => i.diffPct < 1) ? '<b>کاملاً منطبق</b> است' : 'فاصله جزئی دارد'}؛ بنابراین ارقام این گزارش قابل استناد است.` : ''}`
    : 'داده کافی برای روایت تحلیلی یافت نشد؛ بخش‌های زیر بر اساس شیت‌های شناسایی‌شده ارائه شده است.'
  const ms = [
    { k: 'درآمد کل خدمات', v: `${faGroupShort(deep.servicesTotalAll || 0)} ریال` },
    { k: 'حجم کل خدمات', v: faFull(deep.volumeAll) },
    { k: 'اقلام خدمتی', v: `${faNum(deep.items.length)} قلم` },
    { k: 'ماه‌های دارای فعالیت', v: `${faNum(deep.monthsWithData)} ماه` },
    { k: 'مالیات ارزش افزوده', v: deep.vatTotal > 0 ? `${faGroupShort(deep.vatTotal)} ریال` : '—' },
    { k: 'میانگین هر واحد', v: deep.volumeAll > 0 ? `${faGroupShort(deep.servicesTotalAll / deep.volumeAll)} ریال` : '—' },
  ]
  sec(1, 'خلاصه مدیریتی', `
    <div class="assess">
      <div class="text">${summaryText}</div>
      <div class="verdict ${st.cls}">
        <div class="v-label">ارزیابی کلی سامانه</div>
        <div class="v-value">${esc(st.label)}</div>
        <div class="v-sub">${esc(st.sub)}</div>
      </div>
    </div>
    <div class="ministats">${ms.map(m => `<div class="ministat"><div class="k">${esc(m.k)}</div><div class="v">${esc(m.v)}</div></div>`).join('')}</div>`)

  // ═══ ۲) کارت‌های شاخص ═══
  if (deep.kpis.length) {
    const kpiHtml = deep.kpis.map((k, i) => {
      const val = k.fmt === 'percent' ? `${faGroup(k.value)}٪` : faCompact(k.value)
      const tone = k.tone === 'up' ? 'up' : k.tone === 'down' ? 'down' : 'flat'
      return `<div class="kpi" style="--ac:${CHART_PALETTE[i % CHART_PALETTE.length]}">
        <div class="lbl">${esc(k.label)}</div>
        <div class="val">${esc(val)}${k.unitHint ? ` <span class="unit">${esc(k.unitHint)}</span>` : ''}</div>
        ${k.tone && k.fmt === 'percent' ? `<span class="trend ${tone}">${k.tone === 'up' ? '▲ رشد' : k.tone === 'down' ? '▼ کاهش' : '● بدون تغییر'}</span>` : ''}
        ${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ''}
      </div>`
    }).join('')
    sec(2, 'کارت‌های شاخص کلیدی', `<div class="kpis">${kpiHtml}</div>`)
  }

  // ═══ ۳) روند و مقایسه سالانه ═══
  if (deep.annual.length >= 2) {
    const revBars = svgBarChart(deep.annual.map(a => ({ label: faNum(a.year), v: a.revenue, muted: a.partial, note: a.partial ? 'بازه ناقص' : undefined })), { color: '#059669', h: 220 })
    const volBars = svgBarChart(deep.annual.map(a => ({ label: faNum(a.year), v: a.volume, muted: a.partial })), { color: '#3b82f6', h: 220, valueFmt: faFull })
    const rows = deep.annual.map(a => `<tr>
      <td class="strong">${faNum(a.year)}${a.partial ? ' <span class="muted">(${faNum(a.monthsInYear)} ماه)</span>' : ''}</td>
      <td class="num" title="${esc(faFull(a.revenue))}">${esc(faCompact(a.revenue))}</td>
      <td class="num">${esc(faFull(a.volume))}</td>
      <td class="num ${a.revenueGrowth === null ? 'delta-flat' : a.revenueGrowth >= 0 ? 'delta-up' : 'delta-down'}">${a.revenueGrowth === null ? '—' : `${a.revenueGrowth >= 0 ? '▲' : '▼'} ${esc(faPct1(Math.abs(a.revenueGrowth)))}`}</td>
      <td class="num ${a.volumeGrowth === null ? 'delta-flat' : a.volumeGrowth >= 0 ? 'delta-up' : 'delta-down'}">${a.volumeGrowth === null ? '—' : `${a.volumeGrowth >= 0 ? '▲' : '▼'} ${esc(faPct1(Math.abs(a.volumeGrowth)))}`}</td>
      <td class="num">${esc(faPct1(a.share))}</td>
    </tr>`).join('')
    sec(3, 'روند و مقایسه سالانه', `
      <div class="cols">
        <div class="card"><div class="t">درآمد سالانه خدمات (ریال)</div>${revBars}</div>
        <div class="card"><div class="t">حجم خدمات ارائه‌شده (تعداد)</div>${volBars}</div>
      </div>
      <table style="margin-top:14px">
        <thead><tr><th>سال</th><th class="num">درآمد (ریال)</th><th class="num">حجم خدمات</th><th class="num">رشد درآمد</th><th class="num">رشد حجم</th><th class="num">سهم از کل</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${deep.annual.some(a => a.partial) ? `<div class="masked-note" style="margin-top:10px">ℹ سال‌های ناقص (کمتر از ۱۲ ماه داده) با رنگ خاکستری مشخص شده‌اند و در محاسبه نرخ رشد لحاظ نشده‌اند تا مقایسه گمراه‌کننده نباشد.</div>` : ''}`)
  }

  // ═══ ۴) روند ماهانه ═══
  if (deep.monthly.length >= 3) {
    const line = svgLineChart(deep.monthly.map(p => ({ label: p.label, v: p.revenue })), { h: 250, valueFmt: faCompact })
    const last12 = deep.monthly.slice(-12)
    const tRows = last12.map(p => `<tr>
      <td>${esc(p.label)}</td>
      <td class="num" title="${esc(faFull(p.revenue))}">${esc(faCompact(p.revenue))}</td>
      <td class="num">${esc(faFull(p.volume))}</td>
      <td class="num ${p.growth === null ? 'delta-flat' : p.growth >= 0 ? 'delta-up' : 'delta-down'}">${p.growth === null ? '—' : `${p.growth >= 0 ? '▲' : '▼'} ${esc(faPct1(Math.abs(p.growth)))}`}</td>
    </tr>`).join('')
    sec(4, 'روند ماهانه درآمد در طول زمان', `
      ${line}
      <div style="font-size:11px;color:#64748b;margin-top:6px">محور عمودی: درآمد خدمات (ریال) — نقاط قرمز/آبی: اوج و کف دوره — مجموع ${faNum(deep.monthly.length)} ماه از ${deep.years.length ? `${faNum(deep.years[0])} تا ${faNum(deep.years[deep.years.length - 1])}` : 'بازه داده'}</div>
      <table style="margin-top:12px">
        <thead><tr><th>ماه</th><th class="num">درآمد (ریال)</th><th class="num">حجم خدمات</th><th class="num">تغییر ماهانه</th></tr></thead>
        <tbody>${tRows}</tbody>
      </table>`)
  }

  // ═══ ۵) الگوی فصلی ═══
  if (deep.seasonal.some(s => s.avgRevenue > 0)) {
    const peak = deep.seasonal.reduce((a, b) => (b.avgRevenue > a.avgRevenue ? b : a))
    const low = deep.seasonal.filter(s => s.avgRevenue > 0).reduce((a, b) => (b.avgRevenue < a.avgRevenue ? b : a))
    const bars = svgBarChart(deep.seasonal.map(s => ({
      label: s.label, v: s.avgRevenue,
      muted: s.avgRevenue === 0,
    })), { color: '#0ea5e9', h: 215, w: 1060 })
    sec(5, 'الگوی فصلی — میانگین درآمد هر ماه شمسی', `
      ${bars}
      <div class="cols" style="margin-top:12px">
        <div class="ins good"><div class="t">🏁 اوج فصلی: ${esc(peak.label)}</div>میانگین درآمد این ماه در سال‌های دارای داده ${esc(faGroupShort(peak.avgRevenue))} ریال است؛ برنامه‌ریزی ظرفیت، جذب نیرو و موجودی باید برای این ماه تقویت شود.</div>
        <div class="ins warn"><div class="t">📉 کم‌درآمدترین ماه فعال: ${esc(low.label)}</div>میانگین ${esc(faGroupShort(low.avgRevenue))} ریال — تنها ${esc(faPct1(peak.avgRevenue > 0 ? (low.avgRevenue / peak.avgRevenue) * 100 : 0))} از ماه اوج؛ فرصت طراحی کمپین و قرارداد فصلی.</div>
      </div>`)
  }

  // ═══ ۶) ترکیب و سبد خدمات ═══
  if (deep.items.length >= 2 && deep.servicesTotalAll > 0) {
    const donut = donutChart(deep.items.map(i => ({ label: i.label, share: i.share })))
    const rankRows = deep.items.map((it, idx) => `<tr>
      <td><span class="rank ${idx < 3 ? `r${idx + 1}` : ''}">${faNum(idx + 1)}</span></td>
      <td class="strong">${esc(it.label)}${it.unit ? ` <span class="muted">(${esc(it.unit)})</span>` : ''}</td>
      <td class="num">${esc(faFull(it.totalQty))}</td>
      <td class="num" title="${esc(faFull(it.totalAmount))}">${esc(faCompact(it.totalAmount))}</td>
      <td class="num">${it.avgPerUnit !== null ? esc(faCompact(it.avgPerUnit)) : '—'}</td>
      <td class="num">${esc(faPct1(it.share))}</td>
      <td class="num ${it.growthLast === null ? 'delta-flat' : it.growthLast >= 0 ? 'delta-up' : 'delta-down'}">${it.growthLast === null ? '—' : `${it.growthLast >= 0 ? '▲' : '▼'} ${esc(faPct1(Math.abs(it.growthLast)))}`}</td>
    </tr>`).join('')
    sec(6, 'ترکیب و سبد خدمات', `
      <div class="cols">
        <div class="card">
          <div class="t">سهم هر خدمت از کل درآمد</div>
          <div class="donut-row">${donut.donut}<div class="legend">${donut.legend}</div></div>
        </div>
        <div class="card"><div class="t">رتبه‌بندی خدمات (کل بازه)</div>${hBars(deep.items.slice(0, 10).map(i => ({ label: i.label, v: i.totalAmount, share: i.share })))}</div>
      </div>
      <table style="margin-top:14px">
        <thead><tr><th>رتبه</th><th>خدمت</th><th class="num">حجم (واحد)</th><th class="num">درآمد (ریال)</th><th class="num">میانگین هر واحد</th><th class="num">سهم</th><th class="num">رشد آخرین سال</th></tr></thead>
        <tbody>${rankRows}</tbody>
      </table>`)
  }

  // ═══ ۷) روند سالانه اقلام اصلی ═══
  const topItems = deep.items.filter(i => i.totalAmount > 0).slice(0, 6)
  if (topItems.length >= 2 && deep.years.length >= 2) {
    // اگر یک خدمت غالب باشد (سهم بالا)، جداگانه رسم می‌شود تا بقیه در مقیاس آن گم نشوند
    const dominant = topItems[0].share >= 40 ? topItems[0] : null
    const rest = dominant ? topItems.slice(1) : topItems
    const groups = deep.annual.map(a => ({
      label: faNum(a.year),
      values: rest.map(it => ({ name: it.label, v: it.byYear.find(b => b.year === a.year)?.amount ?? 0 })),
    }))
    const chart = rest.length >= 2 ? svgGroupedBars(groups, rest.map(i => i.label), { h: 250 }) : ''
    const domSection = dominant ? `<div class="card" style="margin-top:12px"><div class="t">روند «${esc(dominant.label)}» — خدمت غالب سبد (${esc(faPct1(dominant.share))} از کل درآمد)</div>${svgBarChart(deep.annual.map(a => ({ label: faNum(a.year), v: dominant.byYear.find(b => b.year === a.year)?.amount ?? 0 })), { color: CHART_PALETTE[0], h: 195, w: 1060 })}</div>` : ''
    const pivot = deep.years.map(y => `<th class="num">${faNum(y)}</th>`).join('')
    const rows = topItems.map(it => `<tr>
      <td class="strong">${esc(it.label)}</td>
      ${deep.years.map(y => {
        const v = it.byYear.find(b => b.year === y)?.amount ?? 0
        return `<td class="num" title="${esc(faFull(v))}">${esc(faCompact(v))}</td>`
      }).join('')}
      <td class="num strong" title="${esc(faFull(it.totalAmount))}">${esc(faCompact(it.totalAmount))}</td>
    </tr>`).join('')
    sec(7, 'روند سالانه خدمت‌های اصلی', `
      ${chart}
      ${domSection}
      <table style="margin-top:12px">
        <thead><tr><th>خدمت</th>${pivot}<th class="num">جمع کل</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`)
  }

  // ═══ ۸) تحلیل مالی ═══
  if (deep.finance.some(f => f.servicesTotal !== null || f.grandTotal !== null)) {
    const finRows = deep.finance.map(f => {
      const infra = f.clinicsTotal ?? ((f.clinics ?? 0) + (f.contractMgmt ?? 0))
      const assoc = f.assoc ?? 0
      const total = f.servicesTotal ?? 0
      const svc = total - infra - assoc
      return `<tr>
        <td class="strong">${faNum(f.year)}</td>
        <td class="num" title="${esc(faFull(svc))}">${esc(faCompact(svc))}</td>
        <td class="num" title="${esc(faFull(f.clinics ?? 0))}">${f.clinics !== null ? `${esc(faCompact(f.clinics))} <span class="muted">(${esc(f.clinicsShareLabel)})</span>` : '—'}</td>
        <td class="num" title="${esc(faFull(f.contractMgmt ?? 0))}">${f.contractMgmt !== null ? esc(faCompact(f.contractMgmt)) : (f.clinicsTotal !== null ? `<span class="muted">داخل جمع ${esc(faCompact(f.clinicsTotal))}</span>` : '—')}</td>
        <td class="num" title="${esc(faFull(assoc))}">${assoc > 0 ? esc(faCompact(assoc)) : '—'}</td>
        <td class="num strong" title="${esc(faFull(total))}">${esc(faCompact(total))}</td>
        <td class="num" title="${esc(faFull(f.vat ?? 0))}">${f.vat !== null ? `${esc(faCompact(f.vat))} <span class="muted">(${esc(f.vatRateLabel)})</span>` : '—'}</td>
        <td class="num strong" title="${esc(faFull(f.grandTotal ?? 0))}">${f.grandTotal !== null ? esc(faCompact(f.grandTotal)) : '—'}</td>
      </tr>`
    }).join('')
    const vatNote = deep.vatTotal > 0 ? `<div class="ins info"><div class="t">🧾 مالیات بر ارزش افزوده</div>مجموع مالیات دوره ${esc(faGroupShort(deep.vatTotal))} ریال است؛ نسبت مالیات به عملکرد کل حدود ${esc(faPct1(deep.grandTotalAll > 0 ? (deep.vatTotal / deep.grandTotalAll) * 100 : 0))} است که در تسویه‌های فصلی باید در نقدینگی لحاظ شود.</div>` : ''
    const unitRows = deep.items.filter(i => i.avgPerUnit !== null).slice(0, 8)
      .sort((a, b) => (b.avgPerUnit ?? 0) - (a.avgPerUnit ?? 0))
    const unitChart = unitRows.length >= 2 ? svgBarChart(unitRows.map(i => ({ label: i.label.length > 14 ? i.label.slice(0, 13) + '…' : i.label, v: i.avgPerUnit ?? 0 })), { color: '#8b5cf6', h: 200, w: 1060 }) : ''
    sec(8, 'تحلیل مالی — ساختار درآمد، هزینه‌ها و مالیات', `
      <table>
        <thead><tr><th>سال</th><th class="num">درآمد خدمات</th><th class="num">تجهیز و راهبری کلینیک</th><th class="num">مدیریت پیمان</th><th class="num">راهبری انجمن</th><th class="num">مجموع عملکرد ریالی</th><th class="num">مالیات ارزش افزوده</th><th class="num">مجموع کل + مالیات</th></tr></thead>
        <tbody>${finRows}</tbody>
      </table>
      <div class="insights" style="margin-top:13px">
        ${vatNote}
        <div class="ins info"><div class="t">📊 درآمد هر واحد خدمت</div>نرخ مؤثر هر واحد (درآمد ÷ حجم) برابر ${esc(deep.volumeAll > 0 ? `${faGroupShort(deep.servicesTotalAll / deep.volumeAll)} ریال` : '—')} است؛ اختلاف نرخ خدمت‌ها در نمودار زیر، زمینه بازقیمت‌گذاری را نشان می‌دهد.</div>
      </div>
      ${unitChart ? `<div class="card" style="margin-top:12px"><div class="t">میانگین درآمد هر واحد خدمت (ریال)</div>${unitChart}</div>` : ''}`)
  }

  // ═══ ۹) تحلیل قراردادها ═══
  const contractMatrix = deep.matrices.find(m => m.kind === 'contract')
  if (contractMatrix) {
    const totals = contractMatrix.columns.map((c, i) => ({
      label: c.sub ? `${c.label} (${c.sub})` : c.label,
      v: contractMatrix.items.reduce((s, it) => s + (it.values[i] ?? 0), 0),
    })).sort((a, b) => b.v - a.v)
    const grand = totals.reduce((s, t) => s + t.v, 0) || 1
    const bars = hBars(totals.map(t => ({ label: t.label, v: t.v, share: (t.v / grand) * 100 })), { valueFmt: faFull })
    const topItemsByContract = contractMatrix.items
      .map(it => ({ label: it.label, total: it.total, values: it.values }))
      .sort((a, b) => b.total - a.total).slice(0, 8)
    const pivotHead = contractMatrix.columns.map(c => `<th class="num" style="max-width:130px">${esc(c.label)}</th>`).join('') + '<th class="num">جمع</th>'
    const pivotRows = topItemsByContract.map(it => `<tr>
      <td class="strong">${esc(it.label)}</td>
      ${contractMatrix.columns.map((_, i) => `<td class="num">${esc(faFull(it.values[i] ?? 0))}</td>`).join('')}
      <td class="num strong">${esc(faFull(it.total))}</td>
    </tr>`).join('')
    sec(9, 'تحلیل قراردادها', `
      <div class="cols">
        <div class="card"><div class="t">حجم خدمات هر قرارداد (تعداد)</div>${bars}</div>
        <div class="card"><div class="t">ترکیب خدمات در قراردادها (۸ خدمت اصلی)</div>
          <table><thead><tr><th>خدمت</th>${pivotHead}</tr></thead><tbody>${pivotRows}</tbody></table>
        </div>
      </div>`)
  }

  // ═══ ۱۰) ماتریس سالانه (حجم به تفکیک سال) ═══
  const yearMatrix = deep.matrices.find(m => m.kind === 'year')
  if (yearMatrix && deep.annual.length === 0) {
    const rows = yearMatrix.items.map(it => `<tr>
      <td class="strong">${esc(it.label)}</td>
      ${yearMatrix.columns.map((_, i) => `<td class="num">${esc(faFull(it.values[i] ?? 0))}</td>`).join('')}
      <td class="num strong">${esc(faFull(it.total))}</td>
    </tr>`).join('')
    const totalsRow = `<tr class="total-row"><td>جمع</td>${yearMatrix.totalsRow.map(t => `<td class="num">${t !== null ? esc(faFull(t)) : '—'}</td>`).join('')}<td class="num">${esc(faFull(yearMatrix.items.reduce((s, it) => s + it.total, 0)))}</td></tr>`
    sec(10, 'حجم خدمات به تفکیک سال', `
      <table><thead><tr><th>خدمت</th>${yearMatrix.columns.map(c => `<th class="num">${esc(c.label)}${c.sub ? ` <span class="muted">(${esc(c.sub)})</span>` : ''}</th>`).join('')}<th class="num">جمع</th></tr></thead>
      <tbody>${rows}${totalsRow}</tbody></table>`)
  }

  // ═══ ۱۱) بینش‌های خودکار ═══
  if (deep.insights.length) {
    const icons: Record<string, string> = { trophy: '🏆', trend: '📈', pie: '🥧', shield: '🛡', calendar: '📅', spark: '⚡' }
    sec(11, 'بینش‌های خودکار سامانه', `<div class="insights">${deep.insights.map(i => `<div class="ins ${i.tone}"><div class="t"><span class="ico">${icons[i.icon] ?? '💡'}</span>${esc(i.title)}</div><div>${esc(i.text)}</div></div>`).join('')}</div>`)
  }

  // ═══ ۱۲) SWOT ═══
  const sw = deep.swot
  if (sw.s.length || sw.w.length || sw.o.length || sw.t.length) {
    const list = (arr: string[]) => `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul>`
    sec(12, 'تحلیل نقاط قوت، ضعف، فرصت‌ها و تهدیدها', `
      <div class="swot">
        <div class="q s"><h3>💪 نقاط قوت</h3>${list(sw.s)}</div>
        <div class="q w"><h3>⚠ نقاط ضعف</h3>${list(sw.w)}</div>
        <div class="q o"><h3>🌱 فرصت‌ها</h3>${list(sw.o)}</div>
        <div class="q t"><h3>🚨 تهدیدها</h3>${list(sw.t)}</div>
      </div>`)
  }

  // ═══ ۱۳) نقشه راه پیشنهادی ═══
  if (deep.recommendations.length) {
    sec(13, 'نقشه راه پیشنهادی سامانه', `<div class="roadmap">${deep.recommendations.map((r, i) => `
      <div class="step"><div class="n">${faNum(i + 1)}</div><div><div class="tt">${esc(r.title)}</div><div class="tx">${esc(r.text)}</div></div></div>`).join('')}</div>`)
  }

  // ═══ ۱۴) اهداف کمّی پیشنهادی ═══
  if (deep.suggestedKpis.length) {
    const rows = deep.suggestedKpis.map((k, i) => `<tr><td><span class="rank">${faNum(i + 1)}</span></td><td class="strong">${esc(k.label)}</td><td>${esc(k.target)}</td></tr>`).join('')
    sec(14, 'اهداف کمّی پیشنهادی (KPI)', `<table><thead><tr><th style="width:50px">ردیف</th><th style="width:280px">شاخص</th><th>هدف پیشنهادی برای دوره بعد</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  // ═══ ۱۵) کیفیت داده و صحت‌سنجی ═══
  const intRows = deep.integrity.map(i => `<tr>
    <td class="strong">${faNum(i.year)}</td>
    <td class="num" title="${esc(faFull(i.computed))}">${esc(faCompact(i.computed))}</td>
    <td class="num" title="${esc(faFull(i.declared))}">${esc(faCompact(i.declared))}</td>
    <td class="num ${i.diffPct < 1 ? 'delta-up' : 'delta-down'}">${i.diffPct < 1 ? '✓ منطبق' : `${esc(faPct1(i.diffPct))} اختلاف`}</td>
  </tr>`).join('')
  const sheetsRows = deep.sheetsUsed.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.kind)}</td><td class="num">${faNum(s.rows)}</td></tr>`).join('')
  const qNotes = [
    ...deep.quality.notes,
    ...(deep.warnings ?? []),
  ]
  sec(15, 'کیفیت داده، صحت‌سنجی و شیت‌های تحلیل‌شده', `
    ${intRows ? `<div class="t" style="font-weight:800;font-size:12.5px;margin-bottom:8px">صحت‌سنجی جمع‌های بازمحاسبه‌شده در برابر ردیف‌های مجموع فایل</div>
    <table><thead><tr><th>سال</th><th class="num">محاسبه سامانه (ریال)</th><th class="num">اعلام فایل (ریال)</th><th class="num">نتیجه</th></tr></thead><tbody>${intRows}</tbody></table>` : ''}
    ${sheetsRows ? `<div class="t" style="font-weight:800;font-size:12.5px;margin:14px 0 8px">شیت‌های به‌کاررفته در تحلیل</div>
    <table><thead><tr><th>شیت</th><th>نوع ساختار شناسایی‌شده</th><th class="num">ردیف استفاده‌شده</th></tr></thead><tbody>${sheetsRows}</tbody></table>` : ''}
    ${qNotes.length ? `<div class="masked-note" style="margin-top:13px">🧹 ${qNotes.map(n => esc(n)).join(' — ')}</div>` : ''}`)

  // ═══ پانوشت ═══
  parts.push(`<div class="foot">این گزارش به‌صورت خودکار و با تحلیل عمیق ساختار فایل توسط سامانهٔ هوشمند آماده‌سازی داده و گزارش‌سازی تولید شده است — ${esc(meta.generatedAtFa)}<br>مجموعه‌داده «${esc(meta.datasetName)}» نسخه ${faNum(meta.dataVersion)} | ${faNum(deep.sheetsUsed.length)} شیت | ${faFull(deep.monthsWithData)} ماه داده | ${faFull(meta.rowCount)} رکورد</div>`)

  return `<div class="page">${parts.join('\n')}</div>`
}
