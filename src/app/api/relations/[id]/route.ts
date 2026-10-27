// مدیریت رابطه — پذیرش/رد پیشنهاد، تغییر نوع اتصال و رابطه، حذف (بخش ۱۶ سند)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { JoinType, ColumnPair } from '@/lib/join'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'relation.edit')
    const { id } = await ctx.params
    const body = await req.json()
    const rel = await db.relation.findUnique({ where: { id } })
    if (!rel) return fail('رابطه یافت نشد.', 404)

    const data: Record<string, unknown> = {}
    const changes: string[] = []
    if (body.joinType !== undefined) {
      data.joinType = String(body.joinType) as JoinType
      changes.push(`نوع اتصال به «${data.joinType}»`)
    }
    if (body.cardinality !== undefined) {
      data.cardinality = String(body.cardinality)
      changes.push(`نوع رابطه به «${data.cardinality}»`)
    }
    if (body.filterDirection !== undefined) {
      data.filterDirection = String(body.filterDirection)
      changes.push('جهت اثر فیلترها')
    }
    if (body.name !== undefined) { data.name = String(body.name); changes.push('نام') }
    if (body.columnPairs !== undefined) {
      const pairs: ColumnPair[] = Array.isArray(body.columnPairs) ? body.columnPairs : []
      if (pairs.length === 0) return fail('حداقل یک جفت‌ستون کلید لازم است.')
      data.columnPairs = JSON.stringify(pairs)
      data.lastCheck = null // کنترل باید دوباره اجرا شود
      changes.push(`کلیدها (${pairs.length.toLocaleString('fa-IR')} جفت‌ستون)`)
    }
    if (body.status !== undefined) {
      const status = String(body.status)
      if (!['active', 'rejected', 'suggested'].includes(status)) return fail('وضعیت نامعتبر است.')
      data.status = status
      changes.push(status === 'active' ? 'پذیرش رابطه' : status === 'rejected' ? 'رد رابطه' : 'بازگشت به پیشنهاد')
    }
    if (body.lastCheck !== undefined) data.lastCheck = JSON.stringify(body.lastCheck)

    const updated = await db.relation.update({ where: { id }, data })
    if (changes.length > 0) {
      await logAudit(rel.projectId, 'ویرایش رابطه جداول', `رابطه «${rel.name}»: ${changes.join('، ')}`, user.name)
    }
    return ok({ ...updated, columnPairs: parseJson<ColumnPair[]>(updated.columnPairs, []) })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'relation.edit')
    const { id } = await ctx.params
    const rel = await db.relation.findUnique({ where: { id } })
    if (!rel) return fail('رابطه یافت نشد.', 404)
    await db.relation.delete({ where: { id } })
    await logAudit(rel.projectId, 'حذف رابطه جداول', `رابطه «${rel.name}» حذف شد`, user.name)
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
