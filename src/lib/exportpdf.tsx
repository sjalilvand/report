// خروجی PDF — بخش ۲۳.۱ سند («مناسب چاپ، فارسی صحیح، فونت جاسازی‌شده و صفحه‌بندی»)
// موتور @react-pdf/renderer با فونت وزیرمتن جاسازی‌شده (OFL) و چینش راست‌به‌چپ
// سرستون جدول در هر صفحه تکرار می‌شود؛ شماره صفحه و شناسنامه در پانوشت است (بخش ۲۳.۲)

import React from 'react'
import path from 'path'
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer'
import { toPersianDigits } from './digits'

// ثبت یک‌بارهٔ فونت وزیرمتن از پوشه public/fonts مخزن (مستقل از node_modules)
const g = globalThis as unknown as { __vazirFontReady?: boolean }
function ensureFonts() {
  if (g.__vazirFontReady) return
  const base = path.join(process.cwd(), 'public', 'fonts')
  Font.register({
    family: 'Vazirmatn',
    fonts: [
      { src: path.join(base, 'Vazirmatn-Regular.ttf'), fontWeight: 400 },
      { src: path.join(base, 'Vazirmatn-Bold.ttf'), fontWeight: 700 },
    ],
  })
  Font.registerHyphenationCallback(w => [w]) // شکستن کلمه فارسی لازم نیست
  g.__vazirFontReady = true
}

export interface PdfInput {
  title: string
  datasetName: string
  dataVersion: number
  project?: string
  generatedAt: string          // متن فارسی زمان تولید
  filtersText: string          // فیلترهای اعمال‌شده — بخش ۲۳.۲
  headers: string[]
  rows: unknown[][]
  totalRow: unknown[]
  dimCount: number
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number' && Number.isFinite(v)) return new Intl.NumberFormat('fa-IR').format(v)
  return String(v)
}

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Vazirmatn', color: '#111827' },
  headerBox: { backgroundColor: '#1E293B', padding: 14, borderRadius: 6, marginBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: 700, textAlign: 'right' },
  meta: { color: '#CBD5E1', fontSize: 9, marginTop: 4, textAlign: 'right' },
  filters: { fontSize: 9, color: '#374151', backgroundColor: '#EFF6FF', borderLeftColor: '#2563EB', borderLeftWidth: 3, padding: 8, marginBottom: 12, textAlign: 'right' },
  table: { width: '100%' },
  row: { flexDirection: 'row-reverse', borderBottomWidth: 0.5, borderBottomColor: '#CBD5E1', minHeight: 18, alignItems: 'center' },
  headRow: { backgroundColor: '#1E293B', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  headCell: { color: '#FFFFFF', fontWeight: 700, fontSize: 9, padding: 5, textAlign: 'center', flex: 1 },
  dimCell: { fontSize: 9, padding: 5, textAlign: 'right', flex: 1.6 },
  mCell: { fontSize: 9, padding: 5, textAlign: 'center', flex: 1 },
  totalRow: { backgroundColor: '#EFF6FF', marginTop: 2 },
  totalCell: { fontWeight: 700, color: '#1E293B', fontSize: 9, padding: 5 },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, flexDirection: 'row-reverse', justifyContent: 'space-between', fontSize: 8, color: '#94A3B8' },
  empty: { textAlign: 'center', color: '#6B7280', padding: 16, fontSize: 10 },
})

function ReportPdf(input: PdfInput) {
  const dimFlex = 1.6
  const mFlex = Math.max(0.8, 3.4 / Math.max(1, input.headers.length - input.dimCount))
  const cellStyle = (i: number) => (i < input.dimCount ? [s.dimCell, { flex: dimFlex }] : [s.mCell, { flex: mFlex }])
  return (
    <Document
      title={input.title}
      author="سکوی هوشمند گزارش‌ساز"
      subject={`نسخه داده ${input.dataVersion}`}
    >
      <Page size="A4" style={s.page}>
        <View style={s.headerBox} fixed>
          <Text style={s.title}>{input.title}</Text>
          <Text style={s.meta}>
            مجموعه‌داده: {input.datasetName}   |   نسخه داده: {toPersianDigits(String(input.dataVersion))}   |   زمان تولید: {input.generatedAt}
            {input.project ? `   |   پروژه: ${input.project}` : ''}
          </Text>
        </View>
        {input.filtersText && input.filtersText !== '—' ? (
          <View style={s.filters}><Text>فیلترهای اعمال‌شده: {input.filtersText}</Text></View>
        ) : null}

        {input.rows.length === 0 ? (
          <Text style={s.empty}>داده‌ای برای نمایش با فیلترهای فعلی وجود ندارد.</Text>
        ) : (
          <View style={s.table} wrap>
            <View style={[s.row, s.headRow]} fixed>
              {input.headers.map((h, i) => (
                <Text key={i} style={[i < input.dimCount ? { ...s.headCell, flex: dimFlex, textAlign: 'right' } : { ...s.headCell, flex: mFlex }]}>{h}</Text>
              ))}
            </View>
            {input.rows.map((r, ri) => (
              <View key={ri} style={s.row} wrap={false}>
                {r.map((v, i) => (
                  <Text key={i} style={[...cellStyle(i), { fontWeight: 400 }]}>{fmt(v)}</Text>
                ))}
              </View>
            ))}
            <View style={[s.row, s.totalRow]} wrap={false}>
              {input.totalRow.map((v, i) => (
                <Text key={i} style={[...cellStyle(i), s.totalCell, { fontWeight: 700 }]}>{fmt(v)}</Text>
              ))}
            </View>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>سکوی هوشمند گزارش‌ساز — بخش ۲۳.۱ سند</Text>
          <Text render={({ pageNumber, totalPages }) => `صفحه ${toPersianDigits(String(pageNumber))} از ${toPersianDigits(String(totalPages))}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function buildPdf(input: PdfInput): Promise<Buffer> {
  ensureFonts()
  const buf = await renderToBuffer(<ReportPdf {...input} />)
  return buf as Buffer
}
