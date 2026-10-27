// ثبت رویداد — بخش ۴ (ردیابی) و بخش ۲۸ سند
// نمایش تاریخچه تغییرات برای نقش ناظر/حسابرس

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok } from '@/lib/server'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const events = await db.auditEvent.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok(events)
}
