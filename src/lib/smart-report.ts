// گزارش هوشمند مستقل — «گزارشاتی که خود سامانه می‌سازد»
// از هر مجموعه‌داده‌ای بدون هیچ پیکربندی، گزارشی زیبا و چاپ‌پذیر (HTML مستقل با استایل درونی)
// می‌سازد — دقیقاً همان تجربه نمونه‌های HTML کاربر: سربرگ، کارت شاخص، روند، تفکیک، سهم،
// بینش‌های خودکار و جدول خلاصه. این گزارش برای «هر» اکسلی کار می‌کند، نه فقط ساختارهای نمونه.
//
// خروجی یک فایل HTML خودبسنده است (بدون وابستگی خارجی) و برای چاپ/PDF بهینه است (A4).

import { AutoDash } from './autodash'

export { CSS as SMART_REPORT_CSS }

export interface SmartReportMeta {
  title: string
  subtitle?: string
  datasetName: string
  project?: string
  rowCount: number
  columnCount: number
  dataVersion: number
  generatedAtFa: string
  confidentialHidden?: number // تعداد ستون‌های ماسک‌شده
}

// ─────────────────────────── ابزارهای قالب‌بندی ───────────────────────────

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const faNum = (n: number | string): string => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])

const faGroup = (n: number): string => {
  if (!Number.isFinite(n)) return '—'
  const s = Math.round(Math.abs(n) * 100) / 100
  const grouped = s.toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, '٬')
  return (n < 0 ? '−' : '') + faNum(grouped)
}

const faCompact = (n: number): string => {
  if (!Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e9) return `${faGroup(n / 1e9)} میلیارد`
  if (a >= 1e6) return `${faGroup(n / 1e6)} میلیون`
  if (a >= 1e3) return `${faGroup(n / 1e3)} هزار`
  return faGroup(n)
}

const fmtKpi = (k: { value: number; fmt: string }): string =>
  k.fmt === 'percent' ? `${faGroup(k.value)}٪` : faGroup(k.value)

const faPct = (v: number): string => `${faNum((Math.round(v * 1000) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/,/g, '٬'))}٪`

const fmtDateCell = (s: string): string => (s ? faNum(s) : '—')

// درصد از مقدار «آماده» (۰–۱۰۰) — برخلاف faPct که کسر ۰–۱ می‌گیرد؛
// این تفکیک باگ دوبرابرشدن درصد (۷۵٫۷٪ → ۷٬۵۷۳٪) در تفکیک‌ها را رفع می‌کند
const faPctReady = (v: number): string => `${faNum((Math.round(v * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/,/g, '٬'))}٪`

// ─────────────────────────── استایل درونی (خودبسنده) ───────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif; background: #f1f5f9; color: #0f172a; direction: rtl; padding: 18px; }
  .page { max-width: 880px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
  .banner { background: linear-gradient(135deg, #065f46 0%, #059669 60%, #10b981 100%); color: #fff; border-radius: 16px; padding: 26px 28px 22px; position: relative; overflow: hidden; }
  .banner::after { content: ''; position: absolute; inset-inline-start: -40px; top: -40px; width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,.08); }
  .banner h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
  .banner .sub { font-size: 13px; opacity: .92; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .chip { background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.25); border-radius: 999px; padding: 4px 12px; font-size: 11.5px; }
  .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(15,23,42,.06); }
  .section h2 { font-size: 15px; font-weight: 800; color: #065f46; display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .section h2::before { content: ''; width: 8px; height: 8px; border-radius: 2px; background: #10b981; display: inline-block; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
  .kpi { border: 1px solid #e2e8f0; border-inline-start: 4px solid var(--ac, #10b981); border-radius: 12px; padding: 12px 14px; background: #f8fafc; }
  .kpi .lbl { font-size: 11.5px; color: #475569; margin-bottom: 6px; }
  .kpi .val { font-size: 20px; font-weight: 800; color: #0f172a; }
  .kpi .trend { display: inline-block; margin-top: 6px; font-size: 10.5px; border-radius: 999px; padding: 2px 8px; }
  .trend.up { background: #dcfce7; color: #166534; } .trend.down { background: #fee2e2; color: #991b1b; } .trend.flat { background: #f1f5f9; color: #475569; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 700px) { .cols { grid-template-columns: 1fr; } }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f0fdf4; color: #065f46; font-weight: 700; padding: 8px 10px; text-align: right; border-bottom: 2px solid #bbf7d0; white-space: nowrap; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; }
  tr:nth-child(even) td { background: #fafcfa; }
  td.num, th.num { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
  .vbar-wrap { display: flex; align-items: flex-end; gap: 6px; height: 150px; padding: 4px 2px 0; }
  .vbar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; min-width: 0; height: 100%; }
  .vbar .bar { width: 70%; max-width: 42px; background: linear-gradient(180deg, #34d399, #059669); border-radius: 6px 6px 2px 2px; min-height: 3px; }
  .vbar .v { font-size: 9.5px; color: #334155; font-weight: 600; white-space: nowrap; }
  .vbar .l { font-size: 9.5px; color: #64748b; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hbar { display: grid; grid-template-columns: 110px 1fr 88px 44px; gap: 8px; align-items: center; padding: 5px 0; font-size: 11.5px; }
  .hbar .track { background: #f1f5f9; border-radius: 999px; height: 14px; overflow: hidden; }
  .hbar .fill { height: 100%; border-radius: 999px; background: linear-gradient(270deg, #10b981, #34d399); min-width: 2px; }
  .hbar .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #334155; }
  .hbar .vl { text-align: left; font-weight: 700; font-variant-numeric: tabular-nums; }
  .hbar .pc { text-align: left; color: #059669; font-size: 10.5px; }
  .donut-row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
  .donut { width: 168px; height: 168px; border-radius: 50%; position: relative; flex-shrink: 0; }
  .donut::after { content: ''; position: absolute; inset: 42px; background: #fff; border-radius: 50%; box-shadow: 0 0 0 1px #e2e8f0; }
  .legend { display: flex; flex-direction: column; gap: 6px; font-size: 11.5px; flex: 1; min-width: 180px; }
  .legend .li { display: flex; align-items: center; gap: 8px; }
  .legend .dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .legend .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .legend .vv { font-weight: 700; }
  .insights { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media (max-width: 700px) { .insights { grid-template-columns: 1fr; } }
  .ins { border-radius: 12px; padding: 12px 14px; border: 1px solid; font-size: 12px; }
  .ins .t { font-weight: 800; font-size: 12.5px; margin-bottom: 4px; }
  .ins.good { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }
  .ins.bad { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; }
  .ins.warn { background: #fffbeb; border-color: #fde68a; color: #713f12; }
  .ins.info { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
  .foot { text-align: center; font-size: 11px; color: #64748b; padding: 8px 0 4px; }
  .masked-note { font-size: 11px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 8px 12px; }
  @page { size: A4; margin: 12mm; }
  @media print {
    body { background: #fff; padding: 0; }
    .page { max-width: none; gap: 10px; }
    .section { box-shadow: none; break-inside: avoid; }
    .banner { border-radius: 10px; }
  }
`

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48']

const TONE_LABEL = { up: '▲ رشد', down: '▼ کاهش', flat: '● بدون تغییر' } as const

// ─────────────────────────── سازنده گزارش ───────────────────────────

/** ساخت بدنهٔ گزارش (بدون پوستهٔ HTML) — برای صفحهٔ اشتراک عمومی و فایل مستقل */
export function buildSmartReportInner(dash: AutoDash, meta: SmartReportMeta): string {
  const parts: string[] = []

  // سربرگ
  parts.push(`<div class="banner">
    <h1>${esc(meta.title || dash.title || 'گزارش هوشمند')}</h1>
    <div class="sub">${esc(meta.subtitle || `تحلیل خودکار «${meta.datasetName}» توسط سامانه — بدون نیاز به طراحی دستی`)}</div>
    <div class="chips">
      <span class="chip">🗂 مجموعه‌داده: ${esc(meta.datasetName)}</span>
      ${meta.project ? `<span class="chip">📁 پروژه: ${esc(meta.project)}</span>` : ''}
      <span class="chip">🧾 ${faNum(meta.rowCount.toLocaleString('en-US')).replace(/,/g, '٬')} رکورد</span>
      <span class="chip">📐 ${faNum(meta.columnCount)} ستون</span>
      ${dash.dateRange ? `<span class="chip">📅 بازه: ${fmtDateCell(dash.dateRange.from)} تا ${fmtDateCell(dash.dateRange.to)}</span>` : ''}
      <span class="chip">🗄 نسخه داده: ${faNum(meta.dataVersion)}</span>
      <span class="chip">🕓 ${esc(meta.generatedAtFa)}</span>
    </div>
  </div>`)

  if (meta.confidentialHidden) {
    parts.push(`<div class="masked-note">🔒 ${faNum(meta.confidentialHidden)} ستون محرمانه مطابق سیاست دسترسی از این گزارش حذف شده است (بخش ۲۹ سند).</div>`)
  }

  // کارت‌های شاخص
  if (dash.kpis.length > 0) {
    parts.push(`<div class="section"><h2>کارت‌های شاخص کلیدی</h2><div class="kpis">`)
    for (const k of dash.kpis) {
      const t = k.trend
      parts.push(`<div class="kpi" style="--ac:${PALETTE[dash.kpis.indexOf(k) % PALETTE.length]}">
        <div class="lbl">${esc(k.label)}</div>
        <div class="val">${esc(fmtKpi(k))}${k.unitHint ? ` <span style="font-size:10px;color:#64748b">${esc(k.unitHint)}</span>` : ''}</div>
        ${t ? `<span class="trend ${t.dir}">${TONE_LABEL[t.dir]} ${t.pct === null ? '' : `${faPct(Math.abs(t.pct))}`}</span>` : ''}
      </div>`)
    }
    parts.push(`</div></div>`)
  }

  // روند دوره‌ای
  if (dash.trend && dash.trend.points.length > 1) {
    const pts = dash.trend.points
    const max = Math.max(...pts.map(p => Math.abs(p.value)), 1)
    const bars = pts.map(p => `<div class="vbar" title="${esc(p.label)}: ${faGroup(p.value)}">
        <span class="v">${faCompact(p.value)}</span>
        <div class="bar" style="height:${Math.max(3, Math.round((Math.abs(p.value) / max) * 100))}%"></div>
        <span class="l">${esc(p.label)}</span>
      </div>`).join('')
    const rows = dash.trendTable.map(r => `<tr>
        <td>${esc(r.label)}</td>
        <td class="num">${faNum(faGroup(r.count))}</td>
        <td class="num">${faGroup(r.sum)}</td>
        <td class="num">${faGroup(r.avg)}</td>
        <td class="num" style="color:${r.deltaPct === null ? '#64748b' : r.deltaPct >= 0 ? '#16a34a' : '#dc2626'}">${r.deltaPct === null ? '—' : `${r.deltaPct >= 0 ? '▲' : '▼'} ${faPct(Math.abs(r.deltaPct))}`}</td>
      </tr>`).join('')
    parts.push(`<div class="section"><h2>روند دوره‌ای — ${esc(dash.trend.title)}</h2>
      <div style="font-size:11px;color:#64748b;margin-bottom:8px">سنجه: ${esc(dash.trend.measureLabel)} | بُعد زمانی: ${esc(dash.trend.dateLabel)} | تفکیک: ${esc(dash.trend.granularity === 'month' ? 'ماهانه' : dash.trend.granularity === 'quarter' ? 'فصلی' : 'سالانه')}${dash.trend.skipped ? ` | ${faNum(dash.trend.skipped)} رکورد بدون تاریخ صرف‌نظر شد` : ''}</div>
      <div class="vbar-wrap">${bars}</div>
      ${dash.trendTable.length ? `<table style="margin-top:12px">
        <thead><tr><th>دوره</th><th class="num">تعداد</th><th class="num">جمع ${esc(dash.trend.measureLabel)}</th><th class="num">میانگین</th><th class="num">تغییر</th></tr></thead>
        <tbody>${rows}</tbody></table>` : ''}
    </div>`)
  }

  // تفکیک‌ها + ترکیب سهم
  if (dash.breakdowns.length > 0) {
    parts.push(`<div class="section"><h2>تفکیک و ترکیب سهم</h2><div class="cols">`)
    dash.breakdowns.forEach((bd, bi) => {
      const max = Math.max(...bd.rows.map(r => Math.abs(r.value)), 1)
      const total = bd.total || 1
      const bars = bd.rows.map(r => `<div class="hbar">
          <span class="nm" title="${esc(r.label)}">${esc(r.label)}</span>
          <div class="track"><div class="fill" style="width:${Math.max(1.5, Math.round((Math.abs(r.value) / max) * 100))}%"></div></div>
          <span class="vl">${faCompact(r.value)}</span>
          <span class="pc">${faPctReady(r.share)}</span>
        </div>`).join('')
      // دونات سهم — ۶ ردیف برتر + سایر
      const top6 = bd.rows.slice(0, 6)
      const othersShare = bd.rows.length > 6 ? 100 - top6.reduce((s, r) => s + r.share * 100, 0) : 0
      let acc = 0
      const segs: string[] = []
      top6.forEach((r, i) => {
        const from = acc * 3.6
        acc += r.share
        const to = acc * 3.6
        segs.push(`${PALETTE[i % PALETTE.length]} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`)
      })
      if (othersShare > 0.5) segs.push(`#94a3b8 ${acc * 3.6}deg 360deg`)
      const legend = top6.map((r, i) => `<div class="li"><span class="dot" style="background:${PALETTE[i % PALETTE.length]}"></span><span class="nm" title="${esc(r.label)}">${esc(r.label)}</span><span class="vv">${faPctReady(r.share)}</span></div>`).join('')
        + (othersShare > 0.5 ? `<div class="li"><span class="dot" style="background:#94a3b8"></span><span class="nm">سایر (${faNum(bd.rows.length - 6)} مورد)</span><span class="vv">${faPct(othersShare / 100)}</span></div>` : '')
      const tableRows = bd.rows.map(r => `<tr><td>${esc(r.label)}</td><td class="num">${faNum(faGroup(r.count))}</td><td class="num">${faGroup(r.value)}</td><td class="num">${faGroup(r.count ? r.value / r.count : 0)}</td><td class="num" style="color:#059669">${faPctReady(r.share)}</td></tr>`).join('')
      const othersRow = bd.othersValue || bd.othersCount ? `<tr style="background:#f8fafc"><td>سایر (${faNum(bd.othersCount)} مورد)</td><td class="num">${faNum(faGroup(bd.othersCount))}</td><td class="num">${faGroup(bd.othersValue)}</td><td class="num">${faGroup(bd.othersCount ? bd.othersValue / bd.othersCount : 0)}</td><td class="num" style="color:#64748b">${faPctReady(bd.total ? bd.othersValue / bd.total * 100 : 0)}</td></tr>` : ''
      parts.push(`<div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#fbfdff">
        <div style="font-weight:800;font-size:12.5px;color:#0f172a;margin-bottom:10px">${esc(bd.dimensionLabel)} <span style="font-weight:400;color:#64748b;font-size:10.5px">| سنجه: ${esc(bd.measureLabel)}</span></div>
        <div class="donut-row">
          <div class="donut" style="background:conic-gradient(${segs.join(',')})"></div>
          <div class="legend">${legend}</div>
        </div>
        <div style="margin-top:12px">${bars}</div>
        <table style="margin-top:12px">
          <thead><tr><th>${esc(bd.dimensionLabel)}</th><th class="num">تعداد</th><th class="num">جمع</th><th class="num">میانگین</th><th class="num">سهم</th></tr></thead>
          <tbody>${tableRows}${othersRow}</tbody>
        </table>
      </div>`)
      void bi
    })
    parts.push(`</div></div>`)
  }

  // بینش‌های خودکار
  if (dash.insights.length > 0) {
    parts.push(`<div class="section"><h2>بینش‌های خودکار</h2><div class="insights">`)
    for (const ins of dash.insights) {
      parts.push(`<div class="ins ${ins.tone}"><div class="t">${esc(ins.title)}</div><div>${esc(ins.text)}</div></div>`)
    }
    parts.push(`</div></div>`)
  }

  // جدول خلاصه
  if (dash.summary && dash.summary.rows.length > 0) {
    const totalSum = dash.summary.rows.reduce((s, r) => s + r.sum, 0)
    const rows = dash.summary.rows.map(r => `<tr>
        <td>${esc(r.label)}</td><td class="num">${faNum(faGroup(r.count))}</td>
        <td class="num">${faGroup(r.sum)}</td><td class="num">${faGroup(r.avg)}</td>
        <td class="num">${totalSum ? faPct(r.sum / totalSum) : '—'}</td></tr>`).join('')
    parts.push(`<div class="section"><h2>جدول خلاصه — ${esc(dash.summary.dimensionLabel)} / ${esc(dash.summary.measureLabel)}</h2>
      <table><thead><tr><th>${esc(dash.summary.dimensionLabel)}</th><th class="num">تعداد</th><th class="num">جمع ${esc(dash.summary.measureLabel)}</th><th class="num">میانگین</th><th class="num">سهم</th></tr></thead>
      <tbody>${rows}</tbody></table>
      ${dash.summary.warnings.length ? `<div style="margin-top:8px" class="masked-note">⚠ ${dash.summary.warnings.map(w => esc(w)).join(' | ')}</div>` : ''}
    </div>`)
  }

  // پانوشت
  parts.push(`<div class="foot">این گزارش به‌صورت خودکار توسط سامانهٔ هوشمند آماده‌سازی داده و گزارش‌سازی تولید شده است — ${esc(meta.generatedAtFa)} | مجموعه‌داده «${esc(meta.datasetName)}» نسخه ${faNum(meta.dataVersion)} | ${faNum(meta.rowCount.toLocaleString('en-US')).replace(/,/g, '٬')} رکورد</div>`)

  return `<div class="page">${parts.join('\n')}</div>`
}

/** ساخت فایل HTML خودبسندهٔ گزارش هوشمند از خروجی موتور داشبورد خودکار */
export function buildSmartReportHtml(dash: AutoDash, meta: SmartReportMeta): string {
  const inner = buildSmartReportInner(dash, meta)
  return `<!doctype html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(meta.title || dash.title || 'گزارش هوشمند')}</title>
<style>${CSS}</style>
</head>
<body>
${inner}
</body>
</html>`
}
