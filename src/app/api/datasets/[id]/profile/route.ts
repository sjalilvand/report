// پروفایل کیفیت داده — بخش ۹ سند
// تعداد کل، خالی، متمایز، کمینه/بیشینه، میانگین/میانه، فراوانی، تکراری‌ها

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { profileDataset } from '@/lib/profile'
import { FieldMeta, DataRow } from '@/lib/types'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const ds = await db.dataset.findUnique({ where: { id } })
  if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)
  const fields = parseJson<FieldMeta[]>(ds.fields, [])
  const records = parseJson<DataRow[]>(ds.records, [])
  const profile = profileDataset(records, fields)
  return ok(profile)
}
