// آزمون سریع موتور داشبورد هوشمند — داده شبیه فایل نمونه کاربر (مشاور × استان × ماه)
import { buildAutoDashboard, applyLayout, detectStructure } from '../src/lib/autodash'
import { FieldMeta, DataRow } from '../src/lib/types'

const fields: FieldMeta[] = [
  { id: 'f1', sourceName: 'استان', label: 'استان', type: 'text', role: 'dimension', aggregation: 'count' },
  { id: 'f2', sourceName: 'نام مشاور', label: 'نام مشاور', type: 'text', role: 'dimension', aggregation: 'count' },
  { id: 'f3', sourceName: 'ماه', label: 'ماه', type: 'date', role: 'dimension', aggregation: 'count' },
  { id: 'f4', sourceName: 'جمع مبلغ', label: 'جمع مبلغ', type: 'amount', role: 'measure', aggregation: 'sum', unit: 'rial' },
  { id: 'f5', sourceName: 'تعداد جلسات', label: 'تعداد جلسات', type: 'integer', role: 'measure', aggregation: 'sum' },
  { id: 'f6', sourceName: 'درصد سهم', label: 'درصد سهم', type: 'percent', role: 'measure', aggregation: 'avg' },
]

const provinces = ['تهران', 'اصفهان', 'فارس', 'خراسان رضوی', 'آذربایجان شرقی', 'البرز', 'گیلان', 'مازندران', 'کرمان', 'خوزستان']
const records: DataRow[] = []
let seed = 42
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

for (let m = 1; m <= 6; m++) {
  for (let i = 0; i < 40; i++) {
    const prov = provinces[Math.floor(rnd() * provinces.length)]
    records.push({
      f1: prov,
      f2: `مشاور ${i + 1}`,
      f3: `1404/0${m}/15`,
      f4: Math.round(rnd() * 90_000_000 + 2_000_000),
      f5: Math.round(rnd() * 120 + 5),
      f6: Math.round(rnd() * 1000) / 10,
    })
  }
}

const dash = buildAutoDashboard('خدمات آزاد شهریور ۱۴۰۴', records, fields)
console.log('=== ساختار تشخیص‌داده‌شده ===')
const st = detectStructure(records, fields)
console.log('measures:', st.measures.map(m => m.label))
console.log('dimensions:', st.dimensions.map(d => d.label))
console.log('date:', st.dateField?.label)

console.log('\n=== KPI ===')
dash.kpis.forEach(k => console.log(`- ${k.label}: ${k.value.toLocaleString('en-US')} fmt=${k.fmt} trend=${JSON.stringify(k.trend ?? null)}`))

console.log('\n=== روند ===')
dash.trend?.points.forEach(p => console.log(`- ${p.label}: ${Math.round(p.value).toLocaleString('en-US')}`))
console.log('trendTable rows:', dash.trendTable.length, 'deltas:', dash.trendTable.map(r => r.deltaPct === null ? '—' : Math.round(r.deltaPct * 10) / 10).join(', '))

console.log('\n=== تفکیک‌ها ===')
dash.breakdowns.forEach(b => {
  console.log(`- ${b.dimensionLabel}: ${b.rows.length} دسته برتر، سایر=${Math.round(b.othersValue).toLocaleString('en-US')}`)
  console.log('  top3:', b.rows.slice(0, 3).map(r => `${r.label}(${Math.round(r.share)}%)`).join(' | '))
})

console.log('\n=== بینش‌ها ===')
dash.insights.forEach(i => console.log(`- [${i.tone}] ${i.title}: ${i.text}`))

console.log('\n=== warnings ===')
dash.warnings.forEach(w => console.log('-', w))

// آزمون چیدمان
const layout = {
  hiddenKpis: ['kpi-count'],
  chartTypes: { trend: 'bar' as const, [dash.breakdowns[0]?.id ?? 'bd']: 'pie' as const },
  topLimit: 5,
  title: 'داشبورد من',
}
const applied = applyLayout(dash, layout)
console.log('\n=== پس از چیدمان ===')
console.log('title:', applied.title)
console.log('kpis:', applied.kpis.map(k => k.id).join(', '))
console.log('breakdown rows:', applied.breakdowns[0]?.rows.length)

// مجموع کنترلی: جمع کل مبلغ
const totalSum = records.reduce((s, r) => s + (r.f4 as number), 0)
const kpiSum = dash.kpis.find(k => k.id === 'kpi-sum')?.value ?? 0
console.log('\nکنترل جمع:', Math.abs(totalSum - kpiSum) < 1 ? 'OK' : `MISMATCH ${totalSum} vs ${kpiSum}`)
const bd = dash.breakdowns[0]
const bdTotal = bd.rows.reduce((s, r) => s + r.value, 0) + bd.othersValue
console.log('کنترل تفکیک:', Math.abs(bdTotal - totalSum) < 1 ? 'OK' : `MISMATCH ${bdTotal} vs ${totalSum}`)
const trendTotal = dash.trend!.points.reduce((s, p) => s + p.value, 0)
console.log('کنترل روند:', Math.abs(trendTotal - totalSum) < 1 ? 'OK' : `MISMATCH ${trendTotal} vs ${totalSum}`)
