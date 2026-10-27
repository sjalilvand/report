// API اعلان‌ها — بخش ۲۶.۲ سند (هشدار و اعلان)
// فهرست اعلان‌ها با شمارش نخوانده‌ها + علامت‌گذاری همه به‌عنوان خوانده‌شده

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const sp = req.nextUrl.searchParams
    const projectId = sp.get('projectId')
    if (!projectId) return fail('شناسه پروژه الزامی است.')
    const unreadOnly = sp.get('unread') === '1'
    const limit = Math.min(200, Math.max(1, +(sp.get('limit') ?? 100)))

    const [items, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { projectId, ...(unreadOnly ? { read: false } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      db.notification.count({ where: { projectId, read: false } }),
    ])
    return ok({ items, unreadCount })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req)
    const body = await req.json()
    const projectId = String(body.projectId ?? '')
    if (!projectId) return fail('شناسه پروژه الزامی است.')
    if (body.action === 'read-all') {
      const res = await db.notification.updateMany({ where: { projectId, read: false }, data: { read: true, readAt: new Date() } })
      return ok({ updated: res.count })
    }
    return fail('عملیات ناشناخته است.')
  } catch (e) {
    return errorResponse(e)
  }
}
