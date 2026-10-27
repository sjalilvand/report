// اعمال تبدیل — بخش ۱۰ سند
// هر اقدام با اطلاعات کامل در دفترچه مراحل تبدیل ثبت می‌شود (بخش ۱۰.۳)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { applyTransform, makeStep } from '@/lib/transform'
import { FieldMeta, DataRow, TransformStep } from '@/lib/types'
import { requirePerm, errorResponse } from '@/lib/auth'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    await requirePerm(req, 'dataset.edit')
    const body = await req.json()
    const op = String(body.op ?? '')
    const config = (body.config ?? {}) as Record<string, unknown>

    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = parseJson<DataRow[]>(ds.records, [])
    const transforms = parseJson<TransformStep[]>(ds.transforms, [])

    const result = applyTransform(records, fields, op, config)
    if (result.errors.length > 0 && result.records.length === records.length && JSON.stringify(result.records) === JSON.stringify(records)) {
      // خطا در تنظیمات عملیات؛ تغییری اعمال نشد
      return fail(result.errors.join('؛ '))
    }

    // ثبت مرحله در دفترچه — نام عملیات، تنظیمات، زمان، کاربر، تعداد قبل/بعد، خطاها و هشدارها (بخش ۱۰.۳)
    const step = makeStep(op, config, records.length, result.records.length, result.warnings, result.errors)
    const newVersion = ds.version + 1

    await db.dataset.update({
      where: { id },
      data: {
        records: JSON.stringify(result.records),
        fields: JSON.stringify(result.fields),
        transforms: JSON.stringify([...transforms, step]),
        rowCount: result.records.length,
        version: newVersion,
      },
    })
    await logAudit(ds.projectId, 'اعمال تبدیل', `${op} اعمال شد؛ ${step.before} → ${step.after} رکورد؛ نسخه ${newVersion}`)

    return ok({
      step,
      version: newVersion,
      rowCount: result.records.length,
      warnings: result.warnings,
      errors: result.errors,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

// غیرفعال‌کردن مرحله و بازگشت به نسخه قبلی — بخش ۱۰.۳
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const stepId = req.nextUrl.searchParams.get('stepId')
  if (!stepId) return fail('شناسه مرحله الزامی است.')

  const ds = await db.dataset.findUnique({ where: { id } })
  if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

  const fields = parseJson<FieldMeta[]>(ds.fields, [])
  const transforms = parseJson<TransformStep[]>(ds.transforms, [])
  const stepIdx = transforms.findIndex(s => s.id === stepId)
  if (stepIdx < 0) return fail('مرحله یافت نشد.', 404)

  // بازپخش مراحل تا قبل از مرحله غیرفعال‌شده از حالت اولیه
  // برای MVP: مرحله غیرفعال علامت می‌خورد؛ بازگشت کامل با بازپخش از نسخه صفر در نسخه بعدی
  transforms[stepIdx].disabled = true

  await db.dataset.update({
    where: { id },
    data: { transforms: JSON.stringify(transforms) },
  })
  await logAudit(ds.projectId, 'غیرفعال‌سازی مرحله تبدیل', `مرحله ${stepId} غیرفعال شد (بخش ۱۰.۳ سند)`)
  return ok({ disabled: true })
}
