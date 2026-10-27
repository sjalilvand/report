// بازه‌سازی — بخش ۱۳.۳ سند
// بازه دستی، فاصله ثابت، کنترل تداخل و پوشش

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { createBandedField, suggestBands, BandDef } from '@/lib/formula'
import { FieldMeta, DataRow } from '@/lib/types'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const sourceFieldId = String(body.sourceFieldId ?? '')
    const bands = (body.bands ?? []) as BandDef[]
    const newName = String(body.newName ?? '').trim().replace(/\s+/g, '_')
    const newLabel = String(body.newLabel ?? newName)
    if (!sourceFieldId) return fail('ستون مبنا الزامی است.')
    if (bands.length === 0) return fail('حداقل یک بازه لازم است.')

    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = parseJson<DataRow[]>(ds.records, [])
    if (fields.some(f => f.id === newName || f.label === newLabel)) {
      return fail('فیلدی با این نام از قبل وجود دارد.')
    }

    const result = createBandedField(records, fields, sourceFieldId, bands, newName, newLabel)
    if (result.errors.length > 0) return fail(result.errors.join('؛ '))

    await db.dataset.update({
      where: { id },
      data: {
        records: JSON.stringify(result.records),
        fields: JSON.stringify([...fields, result.field]),
        version: ds.version + 1,
      },
    })
    await logAudit(ds.projectId, 'ساخت فیلد بازه‌ای', `بازه‌سازی «${newLabel}» روی ستون ${sourceFieldId} انجام شد (بخش ۱۳.۳ سند)`)

    return ok({ field: result.field, coverage: result.coverage, version: ds.version + 1 }, 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'خطا در بازه‌سازی')
  }
}

// پیشنهاد بازه‌های خودکار — فاصله ثابت (بخش ۱۳.۳)
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const fieldId = req.nextUrl.searchParams.get('fieldId') ?? ''
  const count = parseInt(req.nextUrl.searchParams.get('count') ?? '4', 10)

  const ds = await db.dataset.findUnique({ where: { id } })
  if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)
  const records = parseJson<DataRow[]>(ds.records, [])
  const vals = records.map(r => parseFloat(String(r[fieldId] ?? '').replace(/[,\u060C]/g, ''))).filter(Number.isFinite)
  if (vals.length === 0) return fail('داده عددی برای بازه‌سازی یافت نشد.')

  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return ok({ min, max, bands: suggestBands(min, max, count) })
}
