// خروجی گزارش — بخش ۲۳ سند
// Excel با نوع عدد و تاریخ مناسب، CSV با تعیین کدگذاری
// فیلترهای اعمال‌شده، زمان تولید و نسخه داده در خروجی ثبت می‌شود (بخش ۲۳.۲)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { fail, parseJson } from '@/lib/server'
import { runQuery } from '@/lib/query'
import { requirePerm, errorResponse, applyRowRules, RowRule, maskValue } from '@/lib/auth'
import { FieldMeta, DataRow, QuerySpec } from '@/lib/types'
import * as XLSX from 'xlsx'
import { toPersianDigits, toLatinDigits } from '@/lib/digits'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const user = await requirePerm(req, 'export.run')
    const body = await req.json()
    const format = String(body.format ?? 'xlsx')
    const spec: QuerySpec = {
      dimensions: Array.isArray(body.dimensions) ? body.dimensions : [],
      measures: Array.isArray(body.measures) && body.measures.length > 0 ? body.measures : [{ agg: 'count' }],
      filters: body.filters ?? [],
      orderBy: body.orderBy,
      limit: body.limit,
    }

    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)
    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    // قواعد سطح سطر — بخش ۲۹ سند
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)

    const result = runQuery(records, fields, spec)

    // ماسک مقادیر حساس در ابعاد خروجی — بخش ۲۹ سند
    const sensitiveIds = fields.filter(f => f.sensitivity === 'confidential').map(f => f.id)

    // ساخت سطرهای خروجی با برچسب‌های نمایشی
    const fieldById = new Map(fields.map(f => [f.id, f]))
    const dimCols = spec.dimensions.map(d => fieldById.get(d)?.label ?? d)
    const measureCols = spec.measures.map(m => m.alias ?? '')
    const headers = [...dimCols, ...measureCols]

    const rows = result.rows.map(r => {
      const row: unknown[] = []
      for (const d of spec.dimensions) {
        let v = r[d]
        if (sensitiveIds.includes(d) && v !== null && v !== undefined && String(v) !== '') v = maskValue(v)
        row.push(v)
      }
      for (const m of spec.measures) {
        const alias = m.alias ?? ''
        row.push(r[alias])
      }
      return row
    })
    // سطر جمع کل — بخش ۲۳.۲: مجموع خروجی با گزارش منطبق باشد
    const totalRow = [...Array(spec.dimensions.length).fill('جمع کل'), ...spec.measures.map(m => result.totals[m.alias ?? ''] ?? null)]
    const aoa = [headers, ...rows, totalRow]

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    // نوع عددی مناسب در اکسل — معیار پذیرش ۳۳.۱۲
    for (let R = 1; R < aoa.length; R++) {
      for (let C = dimCols.length; C < aoa[R].length; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })]
        if (cell && typeof cell.v === 'number') cell.t = 'n'
      }
    }
    ws['!cols'] = headers.map(h => ({ wch: Math.max(12, Math.min(40, h.length * 1.6)) }))

    const stamp = new Date().toISOString().slice(0, 16).replace('T', '_')
    const safeName = (ds.name || 'report').replace(/[^\w\u0600-\u06FF-]+/g, '_')

    if (format === 'csv') {
      // CSV با جداکننده و کدگذاری متداول — بخش ۲۳.۱
      const csv = aoa.map(row =>
        row.map(v => {
          const s = v === null || v === undefined ? '' : String(v)
          return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        }).join(';')
      ).join('\r\n')
      const withMeta = `# گزارش: ${ds.name} | نسخه داده: ${ds.version} | زمان تولید: ${stamp}\r\n` + csv
      return new Response('\uFEFF' + withMeta, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="report_${stamp}.csv"`,
        },
      })
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'گزارش')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['مشخصه', 'مقدار'],
      ['گزارش', ds.name],
      ['نسخه داده', ds.version],
      ['زمان تولید', stamp],
      ['فیلترهای اعمال‌شده', JSON.stringify(spec.filters ?? [])],
      ['ابعاد', spec.dimensions.map(d => fieldById.get(d)?.label ?? d).join('، ')],
    ]), 'شناسنامه')

    const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    return new Response(new Uint8Array(out), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="report_${stamp}.xlsx"`,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
