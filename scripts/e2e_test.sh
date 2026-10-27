#!/bin/bash
# تست انتها به انتهای سامانه — سناریوهای پذیرش بخش ۳۳ سند
# فاز دوم: احراز هویت (۲۹)، روابط بصری جداول (۱۶)، گردش کار تأیید (۲۶.۱)، ظرفیت (۳۰.۱)
set -e
BASE="http://localhost:3000/api"
JAR="/tmp/e2e_cookies.txt"
CURL="curl -s -b $JAR -c $JAR"

echo "═══ ۰) ورود / راه‌اندازی اولیه مدیر سامانه (بخش ۲۹) ═══"
LOGIN=$($CURL -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123","name":"مدیر سامانه"}')
echo "$LOGIN" | python3 -c "import json,sys; d=json.load(sys.stdin); print('کاربر:', d['user']['name'], '| نقش:', d['user']['roleLabel'])" 2>/dev/null || { echo "$LOGIN"; exit 1; }

echo ""
echo "═══ ۱) ایجاد پروژه ═══"
PROJECT=$($CURL -X POST "$BASE/projects" -H 'Content-Type: application/json' -d '{"name":"آزمون گزارش فروش","description":"پروژه آزمون انتها به انتها","owner":"مدیر داده","domain":"فروش"}')
PID=$(echo "$PROJECT" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
echo "projectId=$PID"

echo ""
echo "═══ ۲) بارگذاری فایل اکسل نامنظم (سناریو ۳۳.۱) ═══"
UPLOAD=$($CURL -X POST "$BASE/files/upload" -F "file=@/home/z/my-project/upload/نمونه-گزارش-فروش.xlsx" -F "projectId=$PID")
FID=$(echo "$UPLOAD" | python3 -c "import json,sys; print(json.load(sys.stdin)['fileId'])")
echo "$UPLOAD" | python3 -c "
import json,sys
d=json.load(sys.stdin)
det=d['detection']
s=det['sheets'][0]
print('شیت:', s['name'], '| سطرها:', s['rows'], '| سرستون پیشنهادی (صفرمبنا):', s['headerCandidate'], '| دامنه داده:', s['dataStartRow'], 'تا', s['dataEndRow'])
print('هشدارها:', s['warnings'])"
echo "fileId=$FID"

echo ""
echo "═══ ۳) پیش‌نمایش و تشخیص نوع ستون‌ها (بخش ۸) ═══"
SHEET_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('فروش'))")
PREVIEW=$($CURL "$BASE/files/$FID/preview?sheet=$SHEET_ENC&mode=full")
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

echo ""
echo "═══ ۴) ایجاد مجموعه‌داده ═══"
DS=$($CURL -X POST "$BASE/datasets" -H 'Content-Type: application/json' -d "{\"fileId\":\"$FID\",\"sheetName\":\"فروش\",\"name\":\"فروش شعب - تابستان ۱۴۰۲\",\"headerRow\":3,\"firstDataRow\":4,\"lastDataRow\":12,\"mergedPolicy\":\"fill-down\",\"skipTotalRows\":true}")
echo "$DS" | python3 -c "import json,sys; d=json.load(sys.stdin); print('رکورد:', d.get('rowCount'), '| ستون:', d.get('fieldCount'), '| هشدار:', d.get('warnings'))"
DSID=$(echo "$DS" | python3 -c "import json,sys; print(json.load(sys.stdin)['datasetId'])")

echo ""
echo "═══ ۵) پروفایل کیفیت داده (بخش ۹) ═══"
$CURL "$BASE/datasets/$DSID/profile" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('رکورد:', d['rowCount'], '| سطر تکراری کامل:', d['duplicateRows'])
for f in d['fields']:
    top=f['topValues'][0] if f['topValues'] else {}
    print(f\"  - {f['fieldId'][:28]}: خالی={f['nullCount']} متمایز={f['distinctCount']} کیفیت={f['quality']} کمینه={f.get('min','-')} بیشینه={f.get('max','-')} پرتکرار={top.get('value','-')}({top.get('count','-')})\")"

echo ""
echo "═══ ۶) تبدیل متنی: یکسان‌سازی ی/ک و حذف فاصله (بخش ۱۰.۱) ═══"
$CURL -X POST "$BASE/datasets/$DSID/transform" -H 'Content-Type: application/json' -d "{\"op\":\"unifyPersian\",\"config\":{\"column\":\"$F_PROV\"}}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('مرحله ثبت شد:', d['step']['op'], d['step']['before'], '←', d['step']['after'], '| نسخه داده:', d['version'])"

echo ""
echo "═══ ۷) تبدیل: نگاشت استان‌ها به مقدار مرجع — مثال سند ۱۰.۱ ═══"
$CURL -X POST "$BASE/datasets/$DSID/transform" -H 'Content-Type: application/json' -d "{\"op\":\"mapValues\",\"config\":{\"column\":\"$F_PROV\",\"mapping\":\"استان تهران => تهران\nتهران  => تهران\nاستان اصفهان => اصفهان\nاصفهان => اصفهان\nاستان خراسان رضوی => خراسان رضوی\nفارس => فارس\"}}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('هشدار:', d.get('warnings'))"

echo ""
echo "═══ ۸) پرس‌وجوی تجمیعی: جمع مبلغ به تفکیک استان (بخش ۱۱ و ۱۳) ═══"
Q=$($CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"},{\"fieldId\":\"$F_CNT\",\"agg\":\"sum\",\"alias\":\"جمع تعداد\"}],\"descriptive\":true}")
echo "$Q" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d['rows']:
    print(' ', r.get('f1_استان', list(r.values())[0]), '| مبلغ:', r.get('جمع مبلغ'), '| تعداد:', r.get('جمع تعداد'))
print('جمع کل:', d['totals'])
print('هشدارها:', d['warnings'])
print('── گزارش توصیفی تولیدشده (بخش ۲۰) ──')
print(d.get('descriptive',''))"

echo ""
echo "═══ ۹) آزمون یکتایی کلید (سناریو ۳۳.۷) ═══"
FBRANCH_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$F_BRANCH")
$CURL "$BASE/datasets/$DSID/uniqueness?fields=$FBRANCH_ENC" | python3 -c "import json,sys; d=json.load(sys.stdin); print('یکتا:', d['unique'], '| کل:', d['total'], '| متمایز:', d['distinct'], '| پیام:', d['message'])"

echo ""
echo "═══ ۱۰) فیلد محاسباتی با زبان امن: نسبت_ایمن (بخش ۱۲.۲) ═══"
$CURL -X POST "$BASE/datasets/$DSID/formula" -H 'Content-Type: application/json' -d "{\"formula\":\"نسبت_ایمن($F_AMT ؛ $F_CNT)\",\"newName\":\"میانگین_تراکنش\",\"newLabel\":\"میانگین مبلغ هر تراکنش\"}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('فیلد جدید:', d.get('field',{}).get('label','خطا: '+str(d.get('error'))), '| پیش‌نمایش:', d.get('preview'))"

echo ""
echo "═══ ۱۱) بازه‌سازی مبلغ (بخش ۱۳.۳ — معیار مرزها) ═══"
$CURL -X POST "$BASE/datasets/$DSID/bands" -H 'Content-Type: application/json' -d "{\"sourceFieldId\":\"$F_AMT\",\"bands\":[{\"label\":\"کم\",\"from\":0,\"to\":200},{\"label\":\"متوسط\",\"from\":200,\"to\":300},{\"label\":\"زیاد\",\"from\":300}],\"newName\":\"گروه_مبلغ\",\"newLabel\":\"گروه مبلغ\"}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('فیلد بازه‌ای:', d.get('field',{}).get('label','خطا: '+str(d.get('error'))), '| پوشش:', d.get('coverage'))"

echo ""
echo "═══ ۱۲) پرس‌وجو با بازه‌ها + تاریخ (فصل شمسی - معیار ۳۳.۵) ═══"
$CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"گروه_مبلغ\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}]}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d['rows']: print(' ', r)"

echo ""
echo "═══ ۱۳) ذخیره گزارش (بخش ۱۹) ═══"
REP=$($CURL -X POST "$BASE/reports" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DSID\",\"title\":\"گزارش فروش به تفکیک استان\",\"config\":{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\"}]}}")
echo "$REP" | python3 -c "import json,sys; d=json.load(sys.stdin); print('گزارش:', d.get('title'), '| وضعیت:', d.get('status'), '| نسخه:', d.get('version'))"
RID=$(echo "$REP" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

echo ""
echo "═══ ۱۴) خروجی اکسل و CSV (بخش ۲۳ — معیار ۳۳.۱۲) ═══"
$CURL -X POST "$BASE/datasets/$DSID/export" -H 'Content-Type: application/json' -d "{\"format\":\"xlsx\",\"dimensions\":[\"$F_PROV\",\"گروه_مبلغ\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}]}" -o /tmp/test_export.xlsx -w "اکسل: HTTP %{http_code} | %{size_download} بایت\n"
$CURL -X POST "$BASE/datasets/$DSID/export" -H 'Content-Type: application/json' -d "{\"format\":\"csv\",\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}]}" | head -4

echo ""
echo "═══ ۱۵) رویدادهای حسابرسی (ردیابی - بخش ۴ و ۳۳.۱۳) ═══"
$CURL "$BASE/audit?projectId=$PID" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(' •', e['action'], '|', (e['detail'] or '')[:70]) for e in d[:14]]"

echo ""
echo "═══ ۱۶) گردش کار تأیید گزارش — بخش ۲۶.۱ و ۳۶ ═══"
echo "── ۱۶.۱) ارسال برای تأیید ──"
$CURL -X POST "$BASE/reports/$RID/status" -H 'Content-Type: application/json' -d '{"action":"submit","comment":"ارسال برای بررسی مدیر داده"}' | python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('report',d); print('وضعیت:', r.get('status'), '| پیام:', d.get('error',''))"

echo "── ۱۶.۲) تلاش برای انتشار بدون تأیید (باید رد شود) ──"
$CURL -X POST "$BASE/reports/$RID/status" -H 'Content-Type: application/json' -d '{"action":"publish"}' | python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('report',d); print('وضعیت:', r.get('status','-'), '| پیام:', d.get('message', d.get('error','')))"

echo "── ۱۶.۳) تأیید ──"
$CURL -X POST "$BASE/reports/$RID/status" -H 'Content-Type: application/json' -d '{"action":"approve","comment":"صحت محاسبات بررسی شد"}' | python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('report',d); print('وضعیت:', r.get('status'), '| پیام:', d.get('error',''))"

echo "── ۱۶.۴) انتشار ──"
$CURL -X POST "$BASE/reports/$RID/status" -H 'Content-Type: application/json' -d '{"action":"publish","comment":"انتشار سازمانی"}' | python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('report',d); print('وضعیت:', r.get('status'), '| پیام:', d.get('error',''))"

echo "── ۱۶.۵) تاریخچه رویدادهای تأیید ──"
$CURL "$BASE/reports/$RID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('وضعیت نهایی:', d.get('status'), '| نسخه:', d.get('version'))
for a in d.get('approvals', []): print(' •', a['action'], '→', a['toStatus'], '|', (a.get('comment') or '')[:40], '|', a.get('actor'))"

echo ""
echo "═══ ۱۷) کنترل دسترسی مبتنی بر نقش — بخش ۲۹ ═══"
echo "── ۱۷.۱) ایجاد کاربر مشاهده‌کننده ──"
$CURL -X POST "$BASE/users" -H 'Content-Type: application/json' -d '{"username":"karbar1","name":"کاربر مشاهده‌کننده","password":"ramz1234","role":"viewer"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print(d if 'error' in d else f\"کاربر: {d['name']} | نقش: {d['role']}\")"

echo "── ۱۷.۲) ورود کاربر و تلاش برای عملیات مجاز به مدیر (باید خطای ۴۰۳ بگیرد) ──"
curl -s -c /tmp/viewer_cookies.txt -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"karbar1","password":"ramz1234"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('ورود:', d['user']['name'], '| نقش:', d['user']['roleLabel'])"
curl -s -b /tmp/viewer_cookies.txt -X POST "$BASE/projects" -H 'Content-Type: application/json' -d '{"name":"پروژه غیرمجاز"}' -w " [HTTP %{http_code}]" | head -c 250
echo ""
echo "── ۱۷.۳) قاعده دسترسی سطح سطر برای کاربر (بخش ۲۹: دسترسی سطح سطر) ──"
UID1=$($CURL "$BASE/users" | python3 -c "import json,sys; d=json.load(sys.stdin); print([u['id'] for u in d if u['username']=='karbar1'][0])")
$CURL -X PATCH "$BASE/users/$UID1" -H 'Content-Type: application/json' -d "{\"rowRules\":[{\"datasetId\":\"$DSID\",\"fieldId\":\"$F_PROV\",\"op\":\"eq\",\"value\":\"تهران\"}]}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('قواعد سطری ثبت شد:', d.get('rowRules', d))"

echo "── ۱۷.۴) مشاهده داده توسط کاربر محدودشده (فقط تهران باید ببیند) ──"
curl -s -b /tmp/viewer_cookies.txt "$BASE/datasets/$DSID/records?limit=100" | python3 -c "
import json,sys
d=json.load(sys.stdin)
recs=d.get('records', d.get('rows', []))
provs=set(str(r.get('$F_PROV','')) for r in recs)
print('رکوردهای قابل مشاهده:', len(recs), '| استان‌ها:', provs)"

echo ""
echo "═══ ۱۸) ظرفیت و پیکربندی سامانه — بخش ۳۰.۱ و ۳۶ ═══"
$CURL "$BASE/settings" | python3 -c "
import json,sys
d=json.load(sys.stdin)['settings']
for k in ('maxFileSizeMB','maxRowsPerDataset','maxFilesPerProject','maxConcurrentUsers','multiOrg','currencyBase'): print(f'  {k} = {d[k]}')"
echo "── تغییر سقف حجم فایل به ۱۰ مگابایت ──"
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"maxFileSizeMB":10}' | python3 -c "import json,sys; print('  maxFileSizeMB =', json.load(sys.stdin)['settings']['maxFileSizeMB'])"
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"maxFileSizeMB":25}' > /dev/null

echo ""
echo "═══ ۱۹) محیط بصری اتصال جداول — بخش ۱۶ و ۱۶.۴ ═══"
echo "── ۱۹.۱) ساخت مجموعه‌داده دوم از شیت «اهداف» ──"
DS2=$($CURL -X POST "$BASE/datasets" -H 'Content-Type: application/json' -d "{\"fileId\":\"$FID\",\"sheetName\":\"اهداف\",\"name\":\"اهداف فصل شعبه‌ها\",\"headerRow\":0,\"firstDataRow\":1,\"lastDataRow\":-1,\"mergedPolicy\":\"fill-down\",\"skipTotalRows\":true}")
echo "$DS2" | python3 -c "import json,sys; d=json.load(sys.stdin); print('رکورد:', d.get('rowCount'), '| ستون:', d.get('fieldCount'))"
DSID2=$(echo "$DS2" | python3 -c "import json,sys; print(json.load(sys.stdin)['datasetId'])")
read T_BRANCH T_GOAL <<< $($CURL "$BASE/datasets/$DSID2" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ids=[f['id'] for f in d['fields']]
print(ids[0], ids[2])")

echo "── ۱۹.۲) کنترل‌های الزامی پیش از اتصال (بخش ۱۶.۳) ──"
$CURL -X POST "$BASE/relations/check" -H 'Content-Type: application/json' -d "{\"fromDatasetId\":\"$DSID\",\"toDatasetId\":\"$DSID2\",\"joinType\":\"left\",\"columnPairs\":[{\"fromFieldId\":\"$F_BRANCH\",\"toFieldId\":\"$T_BRANCH\"}]}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
c=d['check']
print('وضعیت:', c['status'], '| سازگاری نوع:', c['typeCompatible'], '| تطبیق:', c['matchPercent'], '%')
print('کارتی:', c['cardinalityDetected'], '| سطر قبل (چپ/راست):', c['rowsBefore']['left'], '/', c['rowsBefore']['right'], '→ سطر بعد:', c['rowsAfter'], '| انفجار سطر:', c['rowExplosion'])
print('هشدارها:', c['warnings'])"

echo "── ۱۹.۳) ایجاد رابطه فروش ← اهداف ──"
REL=$($CURL -X POST "$BASE/relations" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"fromDatasetId\":\"$DSID\",\"toDatasetId\":\"$DSID2\",\"joinType\":\"left\",\"columnPairs\":[{\"fromFieldId\":\"$F_BRANCH\",\"toFieldId\":\"$T_BRANCH\"}],\"name\":\"فروش به اهداف\"}")
RELID=$(echo "$REL" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['relation']['id'])")
echo "$REL" | python3 -c "
import json,sys
d=json.load(sys.stdin)
r=d['relation']; c=d['check']
print('رابطه:', r['name'], '| کارتی:', r['cardinality'], '| مسائل گراف:', d.get('graphIssues'))"

echo "── ۱۹.۴) پرس‌وجوی چندجدولی: جمع مبلغ فروش و هدف بدون چندبرابرشدن (بخش ۱۶.۴) ──"
$CURL -X POST "$BASE/relations/query" -H 'Content-Type: application/json' -d "{\"rootDatasetId\":\"$DSID\",\"relationIds\":[\"$RELID\"],\"spec\":{\"dimensions\":[\"$T_BRANCH\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ فروش\"},{\"fieldId\":\"$T_GOAL\",\"agg\":\"sum\",\"alias\":\"هدف\"}]}}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d.get('rows', []): print(' ', r.get('$T_BRANCH'), '| فروش:', r.get('جمع مبلغ فروش'), '| هدف:', r.get('هدف'))
print('جمع کل:', d.get('totals'))
print('هشدارها:', d.get('warnings'))"

echo "── ۱۹.۵) سناریوی چندبه‌چند: اتصال معکوس با کلید تکراری ──"
$CURL -X POST "$BASE/relations" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"fromDatasetId\":\"$DSID2\",\"toDatasetId\":\"$DSID\",\"joinType\":\"left\",\"columnPairs\":[{\"fromFieldId\":\"$T_BRANCH\",\"toFieldId\":\"$F_BRANCH\"}],\"name\":\"اهداف به فروش (آزمون انفجار)\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
c=d.get('check',{})
r=d.get('relation')
print('وضعیت:', c.get('status'), '| کارتی تشخیص‌شده:', (r or {}).get('cardinality', '-'), '| انفجار سطر:', c.get('rowExplosion'))
print('هشدارها:', [w[:80] for w in c.get('warnings', [])])"

echo ""
echo "═══ ۲۰) فرهنگ داده و شاخص‌ها — بخش ۱۸ ═══"
echo "── ۲۰.۱) ثبت شاخص «تعداد» بدون تعریف مدیریتی (باید رد شود — مثال سند) ──"
$CURL -X POST "$BASE/measures" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"CNT_PERSONS\",\"label\":\"تعداد افراد\",\"aggregation\":\"count\"}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error', 'خطا: ثبت شد!'))"

echo "── ۲۰.۲) ثبت شاخص صحیح با تعریف مدیریتی ──"
M=$($CURL -X POST "$BASE/measures" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"SALES_SUM\",\"label\":\"جمع مبلغ فروش\",\"description\":\"جمع ستون مبلغ تراکنش‌ها به مبنای ریال؛ مرجوعی‌ها منفی لحاظ می‌شوند\",\"datasetId\":\"$DSID\",\"sourceFieldId\":\"$F_AMT\",\"aggregation\":\"sum\",\"unit\":\"ریال\",\"scope\":\"گزارش‌های فروش\",\"limitations\":\"شامل مالیات نیست\"}")
MID=$(echo "$M" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',''))")
echo "$M" | python3 -c "import json,sys; d=json.load(sys.stdin); print('شاخص:', d.get('label'), '| وضعیت:', d.get('status'), '| مالک:', d.get('owner'))"

echo "── ۲۰.۳) تلاش برای استفاده پیش از تأیید (فهرست تأییدشده خالی است) ──"
$CURL "$BASE/measures?projectId=$PID&status=approved" | python3 -c "import json,sys; d=json.load(sys.stdin); print('شاخص‌های تأییدشده:', len(d))"

echo "── ۲۰.۴) تأیید شاخص توسط مدیر ──"
$CURL -X PATCH "$BASE/measures/$MID" -H 'Content-Type: application/json' -d '{"action":"approve"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('وضعیت:', d.get('status'), '| تأییدکننده:', d.get('approvedBy'))"

echo "── ۲۰.۵) ویرایش شاخص تأییدشده → بازگشت به پیش‌نویس و افزایش نسخه ──"
$CURL -X PATCH "$BASE/measures/$MID" -H 'Content-Type: application/json' -d '{"unit":"میلیون ریال"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('وضعیت:', d.get('status'), '| نسخه:', d.get('version'))"
$CURL -X PATCH "$BASE/measures/$MID" -H 'Content-Type: application/json' -d '{"action":"approve"}' > /dev/null

echo "── ۲۰.۶) شاخص تأییدشده آماده استفاده در گزارش‌ساز ──"
$CURL "$BASE/measures?projectId=$PID&status=approved" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for m in d: print(f\"  • {m['label']} ({m['name']}) | تجمیع: {m['aggregation']} | جدول: {'دارد' if m['datasetId'] else '—'}\")"

echo ""
echo "✓✓ تست انتها به انتها کامل شد — datasetId=$DSID | reportId=$RID"
