// سازنده نمودارهای SVG خالص — بدون هیچ کتابخانه یا جاوااسکریپت خارجی
// برای گزارش جامع چاپ‌پذیر (خودبسنده، سازگار با A4 و RTL)

import { faNum } from './deep-analysis'

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const faGroup = (n: number): string => {
  if (!Number.isFinite(n)) return '—'
  const s = Math.round(Math.abs(n) * 100) / 100
  const grouped = s.toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/,/g, '٬')
  return (n < 0 ? '−' : '') + faNum(grouped)
}

export function faCompact(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e12) return `${faGroup(n / 1e12)} همت`
  if (a >= 1e9) return `${faGroup(n / 1e9)} میلیارد`
  if (a >= 1e6) return `${faGroup(n / 1e6)} میلیون`
  if (a >= 1e3) return `${faGroup(n / 1e3)} هزار`
  return faGroup(n)
}

export const CHART_PALETTE = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48']

// ─────────────────────────── نمودار خطی (روند زمانی) ───────────────────────────

export interface LinePoint { label: string; v: number; highlight?: boolean }

export function svgLineChart(
  pts: LinePoint[],
  opts: { w?: number; h?: number; color?: string; valueFmt?: (n: number) => string } = {},
): string {
  const w = opts.w ?? 1080
  const h = opts.h ?? 240
  const padL = 8, padR = 8, padT = 22, padB = 30
  const iw = w - padL - padR
  const ih = h - padT - padB
  if (pts.length < 2) return ''
  const color = opts.color ?? '#059669'
  const fmt = opts.valueFmt ?? faCompact

  const max = Math.max(...pts.map(p => p.v), 1)
  const min = 0
  const x = (i: number) => padL + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw)
  const y = (v: number) => padT + ih - ((v - min) / (max - min || 1)) * ih

  // خطوط شبکه و برچسب محور عمودی
  const ticks = 4
  let grid = ''
  for (let t = 0; t <= ticks; t++) {
    const v = min + ((max - min) / ticks) * t
    const yy = y(v)
    grid += `<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}" stroke="#e2e8f0" stroke-width="1"/>`
    grid += `<text x="${w - padR - 2}" y="${yy - 3}" text-anchor="end" font-size="9.5" fill="#64748b">${esc(fmt(v))}</text>`
  }

  // برچسب محور افقی — حداکثر ۹ برچسب
  const labelEvery = Math.max(1, Math.ceil(pts.length / 9))
  let xLabels = ''
  pts.forEach((p, i) => {
    if (i % labelEvery === 0 || i === pts.length - 1) {
      xLabels += `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" font-size="9" fill="#64748b">${esc(p.label)}</text>`
    }
  })

  const coords = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const area = `${padL},${padT + ih} ${coords} ${w - padR},${padT + ih}`

  // نقاط اوج و کف
  const maxIdx = pts.reduce((a, p, i) => (p.v > pts[a].v ? i : a), 0)
  const nonZero = pts.map((p, i) => ({ ...p, i })).filter(p => p.v > 0)
  const minIdx = nonZero.length ? nonZero.reduce((a, p) => (p.v < pts[a].v ? p.i : a), nonZero[0].i) : maxIdx
  let markers = ''
  const mark = (i: number, col: string, above: boolean) => {
    const yy = y(pts[i].v)
    const dy = above ? -8 : 14
    markers += `<circle cx="${x(i)}" cy="${yy}" r="4" fill="${col}" stroke="#fff" stroke-width="1.5"/>`
    markers += `<text x="${x(i)}" y="${yy + dy}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${col}">${esc(fmt(pts[i].v))}</text>`
    markers += `<text x="${x(i)}" y="${yy + dy + (above ? -10 : 10)}" text-anchor="middle" font-size="8.5" fill="#475569">${esc(pts[i].label)}</text>`
  }
  mark(maxIdx, '#dc2626', true)
  if (minIdx !== maxIdx) mark(minIdx, '#2563eb', false)

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg" role="img">
    ${grid}
    <polygon points="${area}" fill="${color}" opacity="0.10"/>
    <polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((p, i) => p.highlight ? `<circle cx="${x(i)}" cy="${y(p.v)}" r="3" fill="${color}"/>` : '').join('')}
    ${markers}
    ${xLabels}
  </svg>`
}

// ─────────────────────────── نمودار ستونی عمودی ───────────────────────────

export interface BarItem { label: string; v: number; note?: string; muted?: boolean }

export function svgBarChart(
  items: BarItem[],
  opts: { w?: number; h?: number; color?: string; valueFmt?: (n: number) => string; showValues?: boolean } = {},
): string {
  const w = opts.w ?? 520
  const h = opts.h ?? 210
  if (items.length === 0) return ''
  const padL = 10, padR = 10, padT = 24, padB = 30
  const iw = w - padL - padR
  const ih = h - padT - padB
  const color = opts.color ?? '#059669'
  const fmt = opts.valueFmt ?? faCompact
  const max = Math.max(...items.map(b => Math.abs(b.v)), 1)
  const slot = iw / items.length
  const bw = Math.min(58, slot * 0.62)

  let grid = ''
  for (let t = 0; t <= 3; t++) {
    const yy = padT + ih - (ih / 3) * t
    grid += `<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}" stroke="#e2e8f0" stroke-width="1"/>`
  }

  const bars = items.map((b, i) => {
    const bh = Math.max(2, (Math.abs(b.v) / max) * ih)
    const bx = padL + slot * i + (slot - bw) / 2
    const by = padT + ih - bh
    const fill = b.muted ? '#94a3b8' : color
    const opacity = b.muted ? 0.55 : 1
    return `<g>
      <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="5" fill="${fill}" opacity="${opacity}"${b.muted ? ' stroke-dasharray="3,2" stroke="#64748b"' : ''}/>
      ${opts.showValues !== false ? `<text x="${(bx + bw / 2).toFixed(1)}" y="${(by - 5).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#334155">${esc(fmt(b.v))}</text>` : ''}
      ${b.note ? `<text x="${(bx + bw / 2).toFixed(1)}" y="${(by - 14).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${b.muted ? '#64748b' : '#059669'}">${esc(b.note)}</text>` : ''}
      <text x="${(bx + bw / 2).toFixed(1)}" y="${h - 9}" text-anchor="middle" font-size="9.5" fill="#475569">${esc(b.label)}</text>
    </g>`
  }).join('')

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg" role="img">
    ${grid}${bars}
  </svg>`
}

// ─────────────────────────── نمودار ستونی گروهی (چند سری) ───────────────────────────

export function svgGroupedBars(
  groups: { label: string; values: { name: string; v: number }[] }[],
  seriesNames: string[],
  opts: { w?: number; h?: number; valueFmt?: (n: number) => string } = {},
): string {
  const w = opts.w ?? 1060
  const h = opts.h ?? 250
  if (groups.length === 0 || seriesNames.length === 0) return ''
  const fmt = opts.valueFmt ?? faCompact
  const padL = 10, padR = 10, padT = 30, padB = 28
  const iw = w - padL - padR
  const ih = h - padT - padB
  const max = Math.max(...groups.flatMap(g => g.values.map(v => Math.abs(v.v))), 1)
  const slot = iw / groups.length
  const groupW = slot * 0.78
  const bw = Math.min(34, (groupW / seriesNames.length) * 0.72)

  let grid = ''
  for (let t = 0; t <= 3; t++) {
    const yy = padT + ih - (ih / 3) * t
    grid += `<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}" stroke="#e2e8f0" stroke-width="1"/>`
  }

  const legend = `<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:10.5px;color:#475569;margin-bottom:6px">${seriesNames.map((n, i) =>
    `<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:${CHART_PALETTE[i % CHART_PALETTE.length]}"></span>${esc(n)}</span>`).join('')}</div>`

  const bars = groups.map((g, gi) => {
    const gx = padL + slot * gi + (slot - groupW) / 2
    const parts = g.values.map((v, si) => {
      const idx = seriesNames.indexOf(v.name)
      const bh = Math.max(2, (Math.abs(v.v) / max) * ih)
      const bx = gx + (groupW / seriesNames.length) * si + ((groupW / seriesNames.length) - bw) / 2
      const by = padT + ih - bh
      return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3.5" fill="${CHART_PALETTE[(idx >= 0 ? idx : si) % CHART_PALETTE.length]}"><title>${esc(v.name)} — ${esc(g.label)}: ${esc(fmt(v.v))}</title></rect>`
    }).join('')
    const lbl = `<text x="${(gx + groupW / 2).toFixed(1)}" y="${h - 9}" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">${esc(g.label)}</text>`
    return parts + lbl
  }).join('')

  return `${legend}<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg" role="img">${grid}${bars}</svg>`
}

// ─────────────────────────── نمودار میله‌ای افقی HTML ───────────────────────────

export function hBars(
  rows: { label: string; v: number; share: number }[],
  opts: { valueFmt?: (n: number) => string; color?: string } = {},
): string {
  const fmt = opts.valueFmt ?? faCompact
  const color = opts.color ?? '#059669'
  const max = Math.max(...rows.map(r => Math.abs(r.v)), 1)
  return `<div class="hbar-list">${rows.map(r => `<div class="hbar">
    <span class="nm" title="${esc(r.label)}">${esc(r.label)}</span>
    <div class="track"><div class="fill" style="width:${Math.max(1.5, (Math.abs(r.v) / max) * 100).toFixed(1)}%;background:linear-gradient(270deg,${color},${color}cc)"></div></div>
    <span class="vl">${esc(fmt(r.v))}</span>
    <span class="pc">${esc(faGroup(r.share))}٪</span>
  </div>`).join('')}</div>`
}

// ─────────────────────────── دونات سهم ───────────────────────────

export function donutChart(
  rows: { label: string; share: number }[],
  opts: { colors?: string[] } = {},
): { donut: string; legend: string } {
  const colors = opts.colors ?? CHART_PALETTE
  const top = rows.slice(0, 8)
  const othersShare = rows.length > 8 ? Math.max(0, 100 - top.reduce((s, r) => s + r.share, 0)) : 0
  let acc = 0
  const segs: string[] = []
  top.forEach((r, i) => {
    const from = acc * 3.6
    acc += Math.max(0, r.share)
    const to = acc * 3.6
    segs.push(`${colors[i % colors.length]} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`)
  })
  if (othersShare > 0.5) segs.push(`#94a3b8 ${acc * 3.6}deg 360deg`)
  const legend = top.map((r, i) => `<div class="li"><span class="dot" style="background:${colors[i % colors.length]}"></span><span class="nm" title="${esc(r.label)}">${esc(r.label)}</span><span class="vv">${esc(faGroup(r.share))}٪</span></div>`).join('')
    + (othersShare > 0.5 ? `<div class="li"><span class="dot" style="background:#94a3b8"></span><span class="nm">سایر (${esc(faNum(rows.length - 8))} مورد)</span><span class="vv">${esc(faGroup(othersShare))}٪</span></div>` : '')
  return { donut: `<div class="donut" style="background:conic-gradient(${segs.join(',')})"></div>`, legend }
}
