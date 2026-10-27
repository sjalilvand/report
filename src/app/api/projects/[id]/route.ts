// جزئیات پروژه — فایل‌ها، مجموعه‌داده‌ها و گزارش‌ها

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const project = await db.project.findUnique({
    where: { id },
    include: {
      files: {
        select: { id: true, name: true, size: true, mimeType: true, fingerprint: true, version: true, createdAt: true, uploadedBy: true, sheetInfo: true },
        orderBy: { createdAt: 'desc' },
      },
      datasets: {
        select: { id: true, name: true, sheetName: true, rowCount: true, version: true, status: true, updatedAt: true, fields: true, grain: true },
        orderBy: { updatedAt: 'desc' },
      },
      reports: { orderBy: { updatedAt: 'desc' } },
      measures: true,
    },
  })
  if (!project) return fail('پروژه یافت نشد.', 404)
  return ok(project)
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    await db.project.delete({ where: { id } })
    return ok({ deleted: true })
  } catch {
    return fail('حذف پروژه ممکن نشد.', 500)
  }
}
