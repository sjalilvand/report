// API روابط جداول — بخش ۱۶ سند (محیط بصری اتصال جداول)
// فهرست روابط پروژه و ایجاد رابطه جدید با کنترل‌های الزامی پیش از اتصال

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { requireUser, requirePerm, errorResponse } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { analyzeJoin, detectGraphIssues, JoinCheckResult, JoinType, ColumnPair } from '@/lib/join'
import { FieldMeta, DataRow } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return fail('شناسه پروژه الزامی است.')
    const relations = await db.relation.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    })
    return ok(relations.map(r => ({ ...r, columnPairs: parseJson<ColumnPair[]>(r.columnPairs, []) })))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePerm(req, 'relation.edit')
    const body = await req.json()
    const projectId = String(body.projectId ?? '')
    const fromDatasetId = String(body.fromDatasetId ?? '')
    const toDatasetId = String(body.toDatasetId ?? '')
    const joinType = String(body.joinType ?? 'left') as JoinType
    const pairs: ColumnPair[] = Array.isArray(body.columnPairs) ? body.columnPairs : []
    const cardinality = body.cardinality ? String(body.cardinality) : null
    if (!projectId || !fromDatasetId || !toDatasetId) return fail('پروژه و دو جدول باید مشخص باشند.')
    if (fromDatasetId === toDatasetId) return fail('اتصال جدول به خودش پشتیبانی نمی‌شود.')
    if (pairs.length === 0) return fail('حداقل یک جفت‌ستون کلید لازم است.')

    // سقف تعداد روابط — بخش ۳۰.۱
    const settings = await getSettings()
    const relCount = await db.relation.count({ where: { projectId, status: 'active' } })
    if (relCount >= settings.maxRelations) {
      return fail(`سقف تعداد روابط پروژه (${settings.maxRelations.toLocaleString('fa-IR')}) پر است (بخش ۳۰.۱ سند).`)
    }

    const [left, right] = await Promise.all([
      db.dataset.findUnique({ where: { id: fromDatasetId } }),
      db.dataset.findUnique({ where: { id: toDatasetId } }),
    ])
    if (!left || !right) return fail('مجموعه‌داده یافت نشد.', 404)

    // کنترل مسیرهای رابطه مبهم یا حلقه‌ای — بخش ۱۶.۳
    const existing = await db.relation.findMany({ where: { projectId, status: 'active' } })
    const graphIssues = detectGraphIssues([...existing, {
      id: 'new', fromDatasetId, toDatasetId, status: 'active',
    }])

    // Append/Union — افزودن سطرهای هم‌ساختار است، نه اتصال کلیدی؛ کنترل‌های Join بر آن بار نمی‌شود (تفاوت بخش ۱۶.۲ سند)
    if (joinType === 'append') {
      const { executeAppend } = await import('@/lib/join')
      const leftFields = parseJson<FieldMeta[]>(left.fields, [])
      const rightFields = parseJson<FieldMeta[]>(right.fields, [])
      const app = executeAppend(
        parseJson<DataRow[]>(left.records, []).slice(0, 50),
        parseJson<DataRow[]>(right.records, []).slice(0, 50),
        leftFields, rightFields,
      )
      const lightCheck: JoinCheckResult = {
        status: 'ok',
        typeCompatible: true, typeIssues: [],
        leftNulls: 0, rightNulls: 0, leftDupGroups: 0, rightDupGroups: 0, leftMaxDup: 0, rightMaxDup: 0,
        matchPercent: 0, leftUnmatched: 0, rightUnmatched: 0,
        rowsBefore: { left: left.rowCount, right: right.rowCount },
        rowsAfter: left.rowCount + right.rowCount, rowExplosion: false,
        cardinalityDetected: 'unknown',
        sampleRows: app.records.slice(0, 25), sampleFields: app.fields,
        warnings: app.warnings, errors: [],
      }
      const rel = await db.relation.create({
        data: {
          projectId,
          name: String(body.name ?? `${left.name} + ${right.name}`),
          fromDatasetId, toDatasetId,
          cardinality: 'unknown',
          joinType: 'append',
          columnPairs: JSON.stringify([]),
          status: 'active',
          filterDirection: 'single',
          lastCheck: JSON.stringify(lightCheck),
          createdBy: user.name,
        },
      })
      await logAudit(projectId, 'ایجاد رابطه Append', `افزودن سطرهای «${right.name}» به «${left.name}» — مجموع ${lightCheck.rowsAfter.toLocaleString('fa-IR')} رکورد`, user.name)
      return ok({ relation: { ...rel, columnPairs: [] }, check: lightCheck, graphIssues }, 201)
    }

    // کنترل‌های الزامی پیش از اتصال — بخش ۱۶.۳
    const check = analyzeJoin(
      parseJson<DataRow[]>(left.records, []),
      parseJson<DataRow[]>(right.records, []),
      parseJson<FieldMeta[]>(left.fields, []),
      parseJson<FieldMeta[]>(right.fields, []),
      pairs, joinType,
      { preAggregated: Boolean(body.preAggregate) },
    )
    if (check.status === 'blocked') {
      return ok({ blocked: true, check, message: check.errors[0] ?? 'اتصال مسدود شد.' }, 200)
    }

    const rel = await db.relation.create({
      data: {
        projectId,
        name: String(body.name ?? `${left.name} ← ${right.name}`),
        fromDatasetId,
        toDatasetId,
        cardinality: cardinality ?? check.cardinalityDetected,
        joinType,
        columnPairs: JSON.stringify(pairs),
        status: 'active',
        filterDirection: String(body.filterDirection ?? 'single'),
        lastCheck: JSON.stringify(check),
        createdBy: user.name,
      },
    })
    await logAudit(projectId, 'ایجاد رابطه جداول',
      `رابطه «${left.name}» به «${right.name}» با نوع ${joinType} و ${pairs.length.toLocaleString('fa-IR')} جفت‌ستون؛ درصد تطبیق ${check.matchPercent.toLocaleString('fa-IR')}٪؛ نوع تشخیص‌شده ${check.cardinalityDetected}`, user.name)

    return ok({
      relation: { ...rel, columnPairs: pairs },
      check,
      graphIssues,
    }, 201)
  } catch (e) {
    return errorResponse(e)
  }
}

export type { JoinCheckResult }
