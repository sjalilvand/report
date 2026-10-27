// API مدیریت پروژه‌ها — بخش ۶ سند (مرحله اول: ایجاد پروژه)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { files: true, datasets: true, reports: true } },
    },
  })
  return ok(projects)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    if (!name) return fail('نام پروژه الزامی است.')
    const project = await db.project.create({
      data: {
        name,
        description: body.description ? String(body.description) : null,
        owner: body.owner ? String(body.owner) : null,
        domain: body.domain ? String(body.domain) : null,
      },
    })
    await logAudit(project.id, 'ایجاد پروژه', `پروژه «${name}» ایجاد شد`)
    return ok(project, 201)
  } catch {
    return fail('خطا در ایجاد پروژه')
  }
}
