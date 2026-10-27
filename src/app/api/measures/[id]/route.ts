// ویرایش، تأیید و حذف شاخص فرهنگ داده — بخش ۱۸ سند
// شاخص تأییدشده در گزارش‌های مختلف قابل استفاده مجدد است؛ هر تغییر نسخه را افزایش می‌دهد

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { requireUser, requirePerm, errorResponse } from '@/lib/auth'

const AGGS = ['sum', 'count', 'countDistinct', 'avg', 'min', 'max', 'median', 'last']

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'dataset.edit')
    const { id } = await ctx.params
    const body = await req.json()
    const m = await db.measureDefinition.findUnique({ where: { id } })
    if (!m) return fail('شاخص یافت نشد.', 404)

    const data: Record<string, unknown> = {}
    const changes: string[] = []

    if (body.action === 'approve' || body.action === 'reject') {
      // تأیید شاخص — مجوز مدیر یا مدیر داده؛ رد فقط با دلیل — متناسب گردش کار بخش ۲۶.۱
      if (!['admin', 'steward'].includes(user.role)) {
        return fail('تأیید شاخص تنها توسط مدیر سامانه یا مدیر داده ممکن است (بخش ۱۸ سند).', 403)
      }
      if (body.action === 'approve') {
        data.status = 'approved'
        data.approvedAt = new Date()
        data.approvedBy = user.name
        changes.push('تأیید شاخص')
      } else {
        if (!body.comment) return fail('برای رد شاخص، ثبت دلیل الزامی است.')
        data.status = 'draft'
        data.limitations = String(body.comment)
        changes.push(`رد شاخص: ${String(body.comment)}`)
      }
    } else {
      if (body.label !== undefined) { data.label = String(body.label); changes.push('نام') }
      if (body.description !== undefined) { data.description = body.description ? String(body.description) : null; changes.push('تعریف مدیریتی') }
      if (body.formula !== undefined) { data.formula = String(body.formula); changes.push('فرمول') }
      if (body.datasetId !== undefined) { data.datasetId = body.datasetId ? String(body.datasetId) : null; changes.push('جدول منبع') }
      if (body.sourceFieldId !== undefined) { data.sourceFieldId = body.sourceFieldId ? String(body.sourceFieldId) : null; changes.push('ستون منبع') }
      if (body.unit !== undefined) { data.unit = body.unit ? String(body.unit) : null; changes.push('واحد') }
      if (body.aggregation !== undefined) {
        const agg = String(body.aggregation)
        if (!AGGS.includes(agg)) return fail('نوع تجمیع نامعتبر است.')
        data.aggregation = agg
        changes.push('نوع تجمیع')
      }
      if (body.fixedFilters !== undefined) {
        if (!Array.isArray(body.fixedFilters)) return fail('فیلترهای ثابت باید آرایه باشند.')
        data.fixedFilters = JSON.stringify(body.fixedFilters)
        changes.push('فیلترهای ثابت')
      }
      if (body.scope !== undefined) { data.scope = body.scope ? String(body.scope) : null; changes.push('دامنه کاربرد') }
      if (body.limitations !== undefined) { data.limitations = body.limitations ? String(body.limitations) : null; changes.push('محدودیت‌ها') }
      // هر تغییر محتوایی، شاخص تأییدشده را به پیش‌نویس برمی‌گرداند و نسخه را افزایش می‌دهد — بخش ۱۸
      if (m.status === 'approved' && changes.length > 0) {
        data.status = 'draft'
        data.version = m.version + 1
        changes.push(`نسخه ${data.version} (نیازمند تأیید مجدد)`)
      }
    }

    const updated = await db.measureDefinition.update({ where: { id }, data })
    if (changes.length > 0) {
      await logAudit(m.projectId, 'ویرایش شاخص فرهنگ داده', `شاخص «${m.label}»: ${changes.join('، ')}`, user.name)
    }
    return ok({ ...updated, fixedFilters: parseJson<unknown[]>(updated.fixedFilters, []) })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'dataset.edit')
    const { id } = await ctx.params
    const m = await db.measureDefinition.findUnique({ where: { id } })
    if (!m) return fail('شاخص یافت نشد.', 404)
    if (m.status === 'approved') return fail('شاخص تأییدشده قابل حذف نیست؛ ابتدا آن را رد کنید (بخش ۱۸ سند).')
    await db.measureDefinition.delete({ where: { id } })
    await logAudit(m.projectId, 'حذف شاخص فرهنگ داده', `شاخص «${m.label}» حذف شد`, user.name)
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
