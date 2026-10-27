// جزئیات مجموعه‌داده — فیلدها، نمونه رکوردها و دفترچه تبدیل (بخش ۸ و ۱۰.۳ سند)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { FieldMeta, TransformStep, DataRow } from '@/lib/types'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const ds = await db.dataset.findUnique({
    where: { id },
    include: { file: { select: { id: true, name: true, size: true, fingerprint: true } } },
  })
  if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

  const fields = parseJson<FieldMeta[]>(ds.fields, [])
  const transforms = parseJson<TransformStep[]>(ds.transforms, [])
  const records = parseJson<DataRow[]>(ds.records, [])
  const sample = records.slice(0, 30)

  return ok({
    id: ds.id,
    projectId: ds.projectId,
    name: ds.name,
    sheetName: ds.sheetName,
    rowCount: ds.rowCount,
    version: ds.version,
    status: ds.status,
    grain: ds.grain,
    currencyBase: ds.currencyBase,
    config: parseJson(ds.config, {}),
    fields,
    transforms,
    file: ds.file,
    sample,
    createdAt: ds.createdAt,
    updatedAt: ds.updatedAt,
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.grain !== undefined) data.grain = body.grain ? String(body.grain) : null
  if (body.status !== undefined) data.status = String(body.status)
  const ds = await db.dataset.update({ where: { id }, data })
  return ok({ updated: true, name: ds.name })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.dataset.delete({ where: { id } })
  return ok({ deleted: true })
}
