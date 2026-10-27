// جزئیات مجموعه‌داده — فیلدها، نمونه رکوردها و دفترچه تبدیل (بخش ۸ و ۱۰.۳ سند)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { FieldMeta, TransformStep, DataRow } from '@/lib/types'
import { requireUser, errorResponse, applyRowRules, maskRecords, maskFieldsMeta, RowRule } from '@/lib/auth'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const ds = await db.dataset.findUnique({
      where: { id },
      include: { file: { select: { id: true, name: true, size: true, fingerprint: true } } },
    })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const transforms = parseJson<TransformStep[]>(ds.transforms, [])
    // قواعد سطح سطر + ماسک حساس — بخش ۲۹ سند
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)
    const masked = maskRecords(records, fields, user.role)
    const sample = masked.slice(0, 30)

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
    fields: maskFieldsMeta(fields, user.role),
    transforms,
    file: ds.file,
    sample,
    createdAt: ds.createdAt,
    updatedAt: ds.updatedAt,
  })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm(req, 'dataset.edit')
    const { id } = await ctx.params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.grain !== undefined) data.grain = body.grain ? String(body.grain) : null
    if (body.status !== undefined) data.status = String(body.status)
    const ds = await db.dataset.update({ where: { id }, data })
    return ok({ updated: true, name: ds.name })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm(req, 'dataset.edit')
    const { id } = await ctx.params
    await db.dataset.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
