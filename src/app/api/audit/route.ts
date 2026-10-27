// ثبت رویداد — بخش ۴ (ردیابی) و بخش ۲۹ سند
// مشاهده تاریخچه فقط برای مدیر سامانه و ناظر/حسابرس

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'audit.view')
    const projectId = req.nextUrl.searchParams.get('projectId')
    const events = await db.auditEvent.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok(events)
  } catch (e) {
    return errorResponse(e)
  }
}
