// ابزارهای مشترک سمت سرور

import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { FieldMeta, DataRow } from './types'
import { detectColumn, suggestRoles } from './detect'

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data as object, { status: init ?? 200 })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function logAudit(projectId: string | null, action: string, detail?: string, actor = 'مدیر سامانه') {
  await db.auditEvent.create({ data: { projectId, action, detail, actor } })
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ساخت متادیتای فیلدها از جدول استخراج‌شده — بخش ۸ سند
export function buildFieldMetas(
  headers: string[],
  records: DataRow[],
  colWidths: number[]
): FieldMeta[] {
  const metas: FieldMeta[] = headers.map((h, i) => {
    const values = records.slice(0, 800).map(r => r[h])
    const det = detectColumn(values, h)
    return {
      id: `f${i + 1}_${h.replace(/[\s\u200c()]+/g, '_').replace(/[()٫]/g, '').slice(0, 40)}`,
      sourceName: h,
      label: h,
      type: det.detectedType,
      detectedType: det.detectedType,
      confidence: det.confidence,
      role: det.roleSuggestion,
      unit: det.unitSuggestion,
      unitKind: det.unitSuggestion ? 'currency' : det.detectedType === 'percent' ? 'percent' : undefined,
      format: det.detectedType === 'amount' ? 'currency' : det.detectedType === 'date' ? 'date' : det.detectedType === 'text' ? 'text' : 'number',
      calendar: det.detectedType === 'date' ? 'auto' : undefined,
      aggregation: det.roleSuggestion === 'measure' ? 'sum' : det.detectedType === 'identifier' ? 'countDistinct' : 'count',
      invalidCount: det.invalidIndices.length,
      examples: [...new Set(values.filter(v => v !== null && String(v).trim() !== '').map(v => String(v)))].slice(0, 3),
    }
  })

  // اطمینان از تفکیک ابعاد و سنجه‌ها — بخش ۱۱ سند
  const roles = suggestRoles(metas.map(m => ({ id: m.id, label: m.label, type: m.type, distinctCount: undefined })))
  for (const m of metas) {
    if (roles[m.id]) m.role = roles[m.id]
  }
  return metas
}

// کلیدگذاری مجدد رکوردها با شناسه فنی پایدار — بخش ۸.۲ سند
// فرمول‌ها، تبدیل‌ها و روابط به شناسه داخلی وابسته‌اند نه برچسب ستون
export function rekeyRecords(records: DataRow[], fields: FieldMeta[]): DataRow[] {
  const map = new Map(fields.map(f => [f.sourceName, f.id]))
  return records.map(r => {
    const out: DataRow = {}
    for (const [k, v] of Object.entries(r)) {
      out[map.get(k) ?? k] = v
    }
    return out
  })
}
