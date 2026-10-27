// پیشنهاد روابط سامانه — بخش ۱۶ سند (کاربر روابط پیشنهادی را بپذیرد یا رد کند)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { suggestRelations, ColumnPair } from '@/lib/join'
import { FieldMeta } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return fail('شناسه پروژه الزامی است.')
    const datasets = await db.dataset.findMany({ where: { projectId } })
    const suggestions = suggestRelations(
      datasets.map(d => ({
        id: d.id,
        name: d.name,
        rowCount: d.rowCount,
        fields: parseJson<FieldMeta[]>(d.fields, []),
      }))
    )
    return ok(suggestions.map(s => ({ ...s, pairs: s.pairs as ColumnPair[] })))
  } catch (e) {
    return errorResponse(e)
  }
}
