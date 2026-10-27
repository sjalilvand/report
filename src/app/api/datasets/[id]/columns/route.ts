// ویرایش مشخصات ستون‌ها — بخش ۸ سند
// تغییر برچسب، نوع، نقش، واحد، قاعده تجمیع و حساسیت
// تغییر برچسب نباید فرمول‌ها و روابط را خراب کند: شناسه داخلی (id) تغییر نمی‌کند (معیار پذیرش ۳۳.۲)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { FieldMeta } from '@/lib/types'
import { toLatinDigits } from '@/lib/digits'
import { parseDateValue } from '@/lib/jalali'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = parseJson<Record<string, unknown>[]>(ds.records, [])
    const targetId = String(body.fieldId ?? '')
    const idx = fields.findIndex(f => f.id === targetId)
    if (idx < 0) return fail('ستون موردنظر یافت نشد.')

    const f = fields[idx]
    const warnings: string[] = []

    // اعمال تغییرات
    if (body.label !== undefined) f.label = String(body.label) // فقط برچسب؛ شناسه ثابت می‌ماند
    if (body.description !== undefined) f.description = String(body.description)
    if (body.unit !== undefined) f.unit = body.unit || undefined
    if (body.unitKind !== undefined) f.unitKind = body.unitKind || undefined
    if (body.sensitivity !== undefined) f.sensitivity = body.sensitivity
    if (body.format !== undefined) f.format = body.format

    if (body.type !== undefined) {
      const newType = String(body.type)
      if (newType !== f.type) {
        // تغییر نوع داده همراه با پیش‌نمایش مقدارهای نامعتبر — بخش ۸.۲
        let invalid = 0
        for (const r of records) {
          const v = r[f.id]
          if (v === null || v === undefined || String(v).trim() === '') continue
          if (['amount', 'decimal', 'integer', 'percent'].includes(newType)) {
            const s = toLatinDigits(String(v)).replace(/[,\u060C\s]/g, '')
            if (!/^-?\d*\.?\d+$/.test(s)) invalid++
          } else if (newType === 'date') {
            if (!parseDateValue(v).ok) invalid++
          }
        }
        f.type = newType as FieldMeta['type']
        f.invalidCount = invalid
        if (invalid > 0) {
          warnings.push(`${invalid} مقدار با نوع جدید «${newType}» سازگار نیست؛ فهرست مقادیر نامعتبر قابل بررسی است (بخش ۸.۲ سند).`)
        }
        // تغییر خودکار قاعده تجمیع مناسب
        if (newType === 'amount' && f.role === 'measure') f.aggregation = 'sum'
        if (newType === 'date' || newType === 'category' || newType === 'text') f.aggregation = 'count'
      }
    }

    if (body.role !== undefined) f.role = String(body.role) as FieldMeta['role']
    if (body.aggregation !== undefined) f.aggregation = String(body.aggregation) as FieldMeta['aggregation']

    fields[idx] = f
    await db.dataset.update({
      where: { id },
      data: { fields: JSON.stringify(fields) },
    })
    await logAudit(ds.projectId, 'ویرایش ستون', `مشخصات ستون «${f.label}» به‌روزرسانی شد (شناسه پایدار ${f.id} دست‌نخورده ماند)`)

    return ok({ field: f, warnings })
  } catch {
    return fail('خطا در ویرایش ستون')
  }
}
