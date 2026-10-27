#!/bin/bash
# تست انتها به انتهای سامانه — سناریوهای پذیرش بخش ۳۳ سند
set -e
BASE="http://localhost:3000/api"

echo "═══ ۱) ایجاد پروژه ═══"
PROJECT=$(curl -s -X POST "$BASE/projects" -H 'Content-Type: application/json' -d '{"name":"آزمون گزارش فروش","description":"پروژه آزمون انتها به انتها","owner":"مدیر داده","domain":"فروش"}')
PID=$(echo "$PROJECT" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
echo "projectId=$PID"

echo "═══ ۲) بارگذاری فایل اکسل نامنظم (سناریو ۳۳.۱) ═══"
UPLOAD=$(curl -s -X POST "$BASE/files/upload" -F "file=@/home/z/my-project/upload/نمونه-گزارش-فروش.xlsx" -F "projectId=$PID")
FID=$(echo "$UPLOAD" | python3 -c "import json,sys; print(json.load(sys.stdin)['fileId'])")
echo "$UPLOAD" | python3 -c "
import json,sys
d=json.load(sys.stdin)
det=d['detection']
s=det['sheets'][0]
print('شیت:', s['name'], '| سطرها:', s['rows'], '| سرستون پیشنهادی (صفرمبنا):', s['headerCandidate'], '| دامنه داده:', s['dataStartRow'], 'تا', s['dataEndRow'])
print('هشدارها:', s['warnings'])"
echo "fileId=$FID"

echo "═══ ۳) پیش‌نمایش و تشخیص نوع ستون‌ها (بخش ۸) ═══"
SHEET_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('فروش'))")
PREVIEW=$(curl -s "$BASE/files/$FID/preview?sheet=$SHEET_ENC&mode=full")
echo "$PREVIEW" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('دامنه پیکربندی:', d['config'])
print('تعداد رکورد:', d['rowCount'])
for f in d['fields']:
    print(f\"  - {f['id']}: نوع={f['type']} اطمینان={round(f.get('confidence',0)*100)}% نقش={f['role']} واحد={f.get('unit','-')} نمونه={f.get('examples',[])}\")"

# استخراج شناسه فیلدها به صورت پویا
read F_PROV F_CITY F_BRANCH F_DATE F_AMT F_CNT <<< $(echo "$PREVIEW" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ids=[f['id'] for f in d['fields']]
# ترتیب: استان، شهرستان، کد شعبه، تاریخ، مبلغ، تعداد
print(ids[0], ids[1], ids[2], ids[3], ids[4], ids[5])")

echo "═══ ۴) ایجاد مجموعه‌داده ═══"
DS=$(curl -s -X POST "$BASE/datasets" -H 'Content-Type: application/json' -d "{\"fileId\":\"$FID\",\"sheetName\":\"فروش\",\"name\":\"فروش شعب - تابستان ۱۴۰۲\",\"headerRow\":3,\"firstDataRow\":4,\"lastDataRow\":12,\"mergedPolicy\":\"fill-down\",\"skipTotalRows\":true}")
echo "$DS" | python3 -c "import json,sys; d=json.load(sys.stdin); print('رکورد:', d.get('rowCount'), '| ستون:', d.get('fieldCount'), '| هشدار:', d.get('warnings'))"
DSID=$(echo "$DS" | python3 -c "import json,sys; print(json.load(sys.stdin)['datasetId'])")

echo "═══ ۵) پروفایل کیفیت داده (بخش ۹) ═══"
curl -s "$BASE/datasets/$DSID/profile" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('رکورد:', d['rowCount'], '| سطر تکراری کامل:', d['duplicateRows'])
for f in d['fields']:
    top=f['topValues'][0] if f['topValues'] else {}
    print(f\"  - {f['fieldId'][:28]}: خالی={f['nullCount']} متمایز={f['distinctCount']} کیفیت={f['quality']} کمینه={f.get('min','-')} بیشینه={f.get('max','-')} پرتکرار={top.get('value','-')}({top.get('count','-')})\")"

echo "═══ ۶) تبدیل متنی: یکسان‌سازی ی/ک و حذف فاصله (بخش ۱۰.۱) ═══"
curl -s -X POST "$BASE/datasets/$DSID/transform" -H 'Content-Type: application/json' -d "{\"op\":\"unifyPersian\",\"config\":{\"column\":\"$F_PROV\"}}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('مرحله ثبت شد:', d['step']['op'], d['step']['before'], '←', d['step']['after'], '| نسخه داده:', d['version'])"

echo "═══ ۷) تبدیل: نگاشت استان‌ها به مقدار مرجع — مثال سند ۱۰.۱ ═══"
curl -s -X POST "$BASE/datasets/$DSID/transform" -H 'Content-Type: application/json' -d "{\"op\":\"mapValues\",\"config\":{\"column\":\"$F_PROV\",\"mapping\":\"استان تهران => تهران\nتهران  => تهران\nاستان اصفهان => اصفهان\nاصفهان => اصفهان\nاستان خراسان رضوی => خراسان رضوی\nفارس => فارس\"}}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('هشدار:', d.get('warnings'))"

echo "═══ ۸) پرس‌وجوی تجمیعی: جمع مبلغ به تفکیک استان (بخش ۱۱ و ۱۳) ═══"
Q=$(curl -s -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"},{\"fieldId\":\"$F_CNT\",\"agg\":\"sum\",\"alias\":\"جمع تعداد\"}],\"descriptive\":true}")
echo "$Q" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d['rows']:
    print(' ', r.get('f1_استان', list(r.values())[0]), '| مبلغ:', r.get('جمع مبلغ'), '| تعداد:', r.get('جمع تعداد'))
print('جمع کل:', d['totals'])
print('هشدارها:', d['warnings'])
print('── گزارش توصیفی تولیدشده (بخش ۲۰) ──')
print(d.get('descriptive',''))"

echo "═══ ۹) آزمون یکتایی کلید (سناریو ۳۳.۷) ═══"
FBRANCH_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$F_BRANCH")
curl -s "$BASE/datasets/$DSID/uniqueness?fields=$FBRANCH_ENC" | python3 -c "import json,sys; d=json.load(sys.stdin); print('یکتا:', d['unique'], '| کل:', d['total'], '| متمایز:', d['distinct'], '| پیام:', d['message'])"

echo "═══ ۱۰) فیلد محاسباتی با زبان امن: نسبت_ایمن (بخش ۱۲.۲) ═══"
curl -s -X POST "$BASE/datasets/$DSID/formula" -H 'Content-Type: application/json' -d "{\"formula\":\"نسبت_ایمن($F_AMT ؛ $F_CNT)\",\"newName\":\"میانگین_تراکنش\",\"newLabel\":\"میانگین مبلغ هر تراکنش\"}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('فیلد جدید:', d.get('field',{}).get('label','خطا: '+str(d.get('error'))), '| پیش‌نمایش:', d.get('preview'))"

echo "═══ ۱۱) بازه‌سازی مبلغ (بخش ۱۳.۳ — معیار مرزها) ═══"
curl -s -X POST "$BASE/datasets/$DSID/bands" -H 'Content-Type: application/json' -d "{\"sourceFieldId\":\"$F_AMT\",\"bands\":[{\"label\":\"کم\",\"from\":0,\"to\":200},{\"label\":\"متوسط\",\"from\":200,\"to\":300},{\"label\":\"زیاد\",\"from\":300}],\"newName\":\"گروه_مبلغ\",\"newLabel\":\"گروه مبلغ\"}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('فیلد بازه‌ای:', d.get('field',{}).get('label','خطا: '+str(d.get('error'))), '| پوشش:', d.get('coverage'))"

echo "═══ ۱۲) پرس‌وجو با بازه‌ها + تاریخ (فصل شمسی - معیار ۳۳.۵) ═══"
curl -s -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"گروه_مبلغ\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}]}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d['rows']: print(' ', r)"

echo "═══ ۱۳) ذخیره گزارش (بخش ۱۹) ═══"
curl -s -X POST "$BASE/reports" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DSID\",\"title\":\"گزارش فروش به تفکیک استان\",\"config\":{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\"}]}}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('گزارش:', d.get('title'), '| وضعیت:', d.get('status'), '| نسخه:', d.get('version'))"

echo "═══ ۱۴) خروجی اکسل و CSV (بخش ۲۳ — معیار ۳۳.۱۲) ═══"
curl -s -X POST "$BASE/datasets/$DSID/export" -H 'Content-Type: application/json' -d "{\"format\":\"xlsx\",\"dimensions\":[\"$F_PROV\",\"گروه_مبلغ\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}]}" -o /tmp/test_export.xlsx -w "اکسل: HTTP %{http_code} | %{size_download} بایت\n"
curl -s -X POST "$BASE/datasets/$DSID/export" -H 'Content-Type: application/json' -d "{\"format\":\"csv\",\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}]}" | head -4

echo "═══ ۱۵) رویدادهای حسابرسی (ردیابی - بخش ۴ و ۳۳.۱۳) ═══"
curl -s "$BASE/audit?projectId=$PID" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(' •', e['action'], '|', (e['detail'] or '')[:70]) for e in d[:14]]"

echo ""
echo "✓✓ تست انتها به انتها کامل شد — datasetId=$DSID"
