// ویرایش و حذف کاربر — بخش ۲۹ سند (مدیریت نقش‌ها، قواعد سطری، ابطال دسترسی)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse, hashPassword, parseRowRules, ROLE_LABELS, Role, RowRule } from '@/lib/auth'

const VALID_ROLES: Role[] = ['admin', 'steward', 'analyst', 'viewer', 'auditor']

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePerm(req, 'user.manage')
    const { id } = await ctx.params
    const body = await req.json()
    const user = await db.user.findUnique({ where: { id } })
    if (!user) return fail('کاربر یافت نشد.', 404)

    const data: Record<string, unknown> = {}
    const changes: string[] = []

    if (body.name !== undefined) { data.name = String(body.name).trim(); changes.push('نام') }
    if (body.role !== undefined) {
      const role = String(body.role)
      if (!VALID_ROLES.includes(role as Role)) return fail('نقش نامعتبر است.')
      if (user.id === me.id && role !== 'admin') return fail('نمی‌توانید نقش خودتان را از مدیر سامانه تغییر دهید.')
      data.role = role
      changes.push(`نقش به ${ROLE_LABELS[role as Role]}`)
    }
    if (body.active !== undefined) {
      if (user.id === me.id && body.active === false) return fail('نمی‌توانید حساب خودتان را غیرفعال کنید.')
      data.active = Boolean(body.active)
      // ابطال دسترسی — بخش ۲۹: غیرفعال‌سازی همه نشست‌های کاربر
      if (body.active === false) await db.session.deleteMany({ where: { userId: id } })
      changes.push(body.active ? 'فعال‌سازی' : 'غیرفعال‌سازی و ابطال نشست‌ها')
    }
    if (body.password) {
      const pw = String(body.password)
      if (pw.length < 6) return fail('گذرواژه باید حداقل ۶ نویسه باشد.')
      data.passwordHash = hashPassword(pw)
      await db.session.deleteMany({ where: { userId: id } })
      changes.push('تغییر گذرواژه (نشست‌ها ابطال شد)')
    }
    if (body.rowRules !== undefined) {
      const rules = Array.isArray(body.rowRules) ? body.rowRules : []
      // اعتبارسنجی ساختار قواعد سطری — بخش ۲۹
      for (const r of rules) {
        const rule = r as RowRule
        if (!rule.datasetId || !rule.fieldId || !['eq', 'neq', 'in', 'contains'].includes(rule.op)) {
          return fail('ساختار قاعده دسترسی سطری نامعتبر است.')
        }
      }
      data.rowRules = JSON.stringify(rules)
      changes.push('قواعد دسترسی سطح سطر')
    }
    if (body.mfaReset === true) {
      // بازنشانی MFA توسط مدیر — بخش ۲۹ (بازیابی دسترسی در گم‌شدن دستگاه احرازکننده)
      data.mfaEnabled = false
      data.mfaSecret = null
      await db.mfaTicket.deleteMany({ where: { userId: id } })
      changes.push('بازنشانی احراز هویت چندمرحله‌ای')
    }

    const updated = await db.user.update({ where: { id }, data, select: { id: true, username: true, name: true, role: true, active: true, rowRules: true } })
    if (changes.length > 0) {
      await logAudit(null, 'ویرایش کاربر', `کاربر «${user.name}»: ${changes.join('، ')}`, me.name)
    }
    return ok({ ...updated, rowRules: parseRowRules(updated.rowRules) })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePerm(req, 'user.manage')
    const { id } = await ctx.params
    if (id === me.id) return fail('حذف حساب خودتان ممکن نیست.')
    const user = await db.user.findUnique({ where: { id } })
    if (!user) return fail('کاربر یافت نشد.', 404)
    await db.user.delete({ where: { id } })
    await logAudit(null, 'حذف کاربر', `کاربر «${user.name}» حذف شد`, me.name)
    return ok({ deleted: true })
  } catch (e) {
    return errorResponse(e)
  }
}
