// ارزیابی قواعد هشدار — بخش ۲۶.۲ سند
// POST { projectId } → ارزیابی همه قواعد فعال پروژه
// POST { ruleId }    → ارزیابی یک قاعده خاص

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit } from '@/lib/server'
import { requirePerm, errorResponse } from '@/lib/auth'
import { evaluateProjectRules, evaluateAlertRule } from '@/lib/alerts'

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'alert.manage')
    const body = await req.json().catch(() => ({}))
    const ruleId = body.ruleId ? String(body.ruleId) : null
    const projectId = body.projectId ? String(body.projectId) : null

    if (ruleId) {
      const rule = await db.alertRule.findUnique({ where: { id: ruleId } })
      if (!rule) return fail('قاعده هشدار یافت نشد.', 404)
      if (!rule.active) return fail('قاعده غیرفعال است؛ ابتدا فعال کنید.')
      const result = await evaluateAlertRule(rule)
      await logAudit(rule.projectId, 'ارزیابی قاعده هشدار', `قاعده «${rule.name}»: ${result.fired ? (result.created ? 'هشدار جدید ثبت شد' : 'هشدار باز موجود است') : 'بدون هشدار'}${result.skipped ? ' — ' + result.skipped : ''}`, user.name)
      return ok({ results: [result] })
    }

    if (!projectId) return fail('شناسه پروژه یا قاعده الزامی است.')
    const results = await evaluateProjectRules(projectId)
    const fired = results.filter(r => r.fired).length
    const created = results.filter(r => r.created).length
    await logAudit(projectId, 'ارزیابی هشدارها', `${results.length.toLocaleString('fa-IR')} قاعده بررسی شد؛ ${fired.toLocaleString('fa-IR')} هشدار فعال و ${created.toLocaleString('fa-IR')} اعلان جدید`, user.name)
    return ok({ results, summary: { total: results.length, fired, created } })
  } catch (e) {
    return errorResponse(e)
  }
}
