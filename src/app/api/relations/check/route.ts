// کنترل‌های الزامی پیش از اتصال و پیش‌نمایش نتیجه — بخش ۱۶.۳ سند
// بدون ذخیره‌سازی: کاربر نتیجه را می‌بیند و سپس تصمیم می‌گیرد

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { analyzeJoin, JoinType, ColumnPair } from '@/lib/join'
import { FieldMeta, DataRow } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    await requireUser(req)
    const body = await req.json()
    const fromDatasetId = String(body.fromDatasetId ?? '')
    const toDatasetId = String(body.toDatasetId ?? '')
    const joinType = String(body.joinType ?? 'left') as JoinType
    const pairs: ColumnPair[] = Array.isArray(body.columnPairs) ? body.columnPairs : []
    if (!fromDatasetId || !toDatasetId) return fail('دو جدول باید مشخص باشند.')
    if (pairs.length === 0) return fail('حداقل یک جفت‌ستون کلید لازم است.')

    const [left, right] = await Promise.all([
      db.dataset.findUnique({ where: { id: fromDatasetId } }),
      db.dataset.findUnique({ where: { id: toDatasetId } }),
    ])
    if (!left || !right) return fail('مجموعه‌داده یافت نشد.', 404)

    const preAggregated = Boolean(body.preAggregate)
    let rightRecs = parseJson<DataRow[]>(right.records, [])
    const rightFields = parseJson<FieldMeta[]>(right.fields, [])

    // تجمیع پیش از اتصال — راهکار بخش ۱۶.۴ برای جلوگیری از چندبرابرشدن مبالغ
    let preAggNote: string | undefined
    if (preAggregated) {
      const { preAggregate } = await import('@/lib/join')
      const agg = preAggregate(rightRecs, pairs, 'to', rightFields)
      rightRecs = agg.records
      preAggNote = `${agg.aggregatedFields.length.toLocaleString('fa-IR')} ستون سنجه جدول دوم پیش از اتصال بر اساس کلید جمع شد.`
    }

    // Append/Union — کنترل هم‌ساختاری، نه Join — تفاوت بخش ۱۶.۲ سند
    if (joinType === 'append') {
      const { executeAppend } = await import('@/lib/join')
      const leftFields = parseJson<FieldMeta[]>(left.fields, [])
      const app = executeAppend(
        parseJson<DataRow[]>(left.records, []).slice(0, 50),
        rightRecs.slice(0, 50),
        leftFields, rightFields,
      )
      return ok({
        check: {
          status: 'ok', typeCompatible: true, typeIssues: [],
          leftNulls: 0, rightNulls: 0, leftDupGroups: 0, rightDupGroups: 0, leftMaxDup: 0, rightMaxDup: 0,
          matchPercent: 0, leftUnmatched: 0, rightUnmatched: 0,
          rowsBefore: { left: left.rowCount, right: right.rowCount },
          rowsAfter: left.rowCount + right.rowCount, rowExplosion: false,
          cardinalityDetected: 'unknown',
          sampleRows: app.records.slice(0, 25), sampleFields: app.fields,
          warnings: [...app.warnings, 'Append افزودن سطر است؛ سطرهای جدول دوم به انتهای جدول اصلی اضافه می‌شوند (بخش ۱۶.۲ سند).'],
          errors: [],
        },
      })
    }

    const check = analyzeJoin(
      parseJson<DataRow[]>(left.records, []),
      rightRecs,
      parseJson<FieldMeta[]>(left.fields, []),
      rightFields,
      pairs, joinType,
      { preAggregated },
    )
    if (preAggNote) check.warnings.push(preAggNote)

    return ok({ check })
  } catch (e) {
    return errorResponse(e)
  }
}
