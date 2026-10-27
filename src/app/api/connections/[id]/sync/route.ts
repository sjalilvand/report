// همگام‌سازی منبع خارجی → مجموعه‌داده — بخش ۳۱ سند
// نخستین بار مجموعه‌داده ساخته می‌شود؛ بارهای بعد همان مجموعه‌داده با نسخه جدید جایگزین می‌شود
// شکست همگام‌سازی: آخرین نسخه سالم حفظ و اعلان «شکست پردازش» ثبت می‌شود (بخش‌های ۳۰.۲ و ۲۶.۲)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { syncConnectionDataset, toConnectionRecord } from '@/lib/connectors'
import { pushSystemNotification } from '@/lib/alerts'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePerm(req, 'dataset.create')
    const { id } = await ctx.params
    const row = await db.externalConnection.findUnique({ where: { id } })
    if (!row) return fail('اتصال یافت نشد.', 404)

    const res = await syncConnectionDataset(toConnectionRecord(row), user.name)
    if (!res.ok) {
      await pushSystemNotification({
        projectId: row.projectId,
        type: 'processFailure',
        severity: 'critical',
        title: 'شکست همگام‌سازی منبع خارجی',
        message: `اتصال «${row.name}»: ${res.message} — آخرین نسخه سالم مجموعه‌داده حفظ شد (بخش ۳۰.۲ سند).`,
        entityType: 'connection',
        entityId: row.id,
      }).catch(() => undefined)
      return fail(res.message, 502)
    }
    await logAudit(row.projectId, 'همگام‌سازی منبع خارجی', `«${row.name}»: ${res.message} (بخش ۳۱ سند)`, user.name)
    return ok(res)
  } catch (e) {
    return errorResponse(e)
  }
}
