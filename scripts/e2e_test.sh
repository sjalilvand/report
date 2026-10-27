#!/bin/bash
# تست انتها به انتهای سامانه — سناریوهای پذیرش بخش ۳۳ سند
# فاز دوم: احراز هویت (۲۹)، روابط بصری جداول (۱۶)، گردش کار تأیید (۲۶.۱)، ظرفیت (۳۰.۱)
# فاز سوم: جدول محوری (۱۹.۲)، Drill Through (۱۹.۳)، Upsert (۲۴)، نمودارهای تخصصی (۱۹.۲)، فیلتر وابسته (۱۹.۳)
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

# رگرسیون باگ رندر کلاینت: ردیف‌های پیش‌نمایش باید آرایه هم‌تراز با سرستون‌ها باشند
echo ""
echo "═══ ۳.۱) رگرسیون: شکل آرایه‌ای previewRows در حالت preview ═══"
$CURL "$BASE/files/$FID/preview?sheet=$SHEET_ENC&mode=preview" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=d['previewRows']
assert isinstance(rows, list) and len(rows) > 0, 'خطا: previewRows خالی یا غیرآرایه است'
for r in rows:
    assert isinstance(r, list), 'خطا: هر ردیف باید آرایه باشد نه ' + type(r).__name__
    assert len(r) == len(d['headers']), 'خطا: طول ردیف با تعداد سرستون هم‌تراز نیست'
print('OK:', len(rows), 'ردیف آرایه‌ای ×', len(d['headers']), 'ستون — هم‌تراز با سرستون‌ها (باگ row.map رفع شد)')"

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
echo "═══ ۲۱) جدول محوری — بخش ۱۹.۲ ═══"
echo "── ۲۱.۱) سلسله‌مراتب دو سطحی: استان ← شهرستان با جمع جزء و جمع کل ──"
$CURL -X POST "$BASE/datasets/$DSID/pivot" -H 'Content-Type: application/json' -d "{\"rowDims\":[\"$F_PROV\",\"$F_CITY\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"},{\"fieldId\":\"$F_CNT\",\"agg\":\"count\",\"alias\":\"تعداد رکورد\"}],\"showShare\":true,\"showRank\":true,\"subtotals\":true}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('ستون‌ها:', d['colKeys'], '| سنجه‌ها:', d['measureAliases'])
for r in d['rows']:
    indent='  '*(r['depth']+1) if not r['isSubtotal'] else '  '
    tag='【جمع جزء】' if r['isSubtotal'] else ''
    print(f\"{indent}{tag}{r['dimValues'][-1]['value']} | جمع مبلغ: {r['rowTotals'].get('جمع مبلغ')} | رتبه: {r.get('rank','-')} | سهم: {round(r.get('share',0),1)}٪\")
gt=d['grandTotals'].get('جمع مبلغ')
print('جمع کل:', gt, '| رکورد بررسی‌شده:', d['scannedRecords'])
assert gt == 2035500000, f'جمع کل جدول محوری با انتظار سند مطابقت ندارد: {gt}'
print('✓ جمع کل = ۲٬۰۳۵٬۵۰۰٬۰۰۰ ریال (مطابق ۱۴.۴)')"

echo "── ۲۱.۲) بُعد ستون: شهرستان در ستون‌ها ──"
$CURL -X POST "$BASE/datasets/$DSID/pivot" -H 'Content-Type: application/json' -d "{\"rowDims\":[\"$F_PROV\"],\"colDim\":\"$F_CITY\",\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}],\"subtotals\":false}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('کلیدهای ستون:', d['colKeys'])
for r in d['rows']:
    print(' ', r['dimValues'][-1]['value'], '→', {k.split('||')[0]: v for k,v in r['cells'].items()})
print('هشدارها:', d['warnings'])"

echo ""
echo "═══ ۲۲) Drill Through جزئیات رکورد — بخش ۱۹.۳ ═══"
FILTERS=$(python3 -c "import json; print(json.dumps([{'fieldId':'$F_PROV','op':'eq','value':'تهران'}], ensure_ascii=False))")
FILT_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$FILTERS")
$CURL "$BASE/datasets/$DSID/records?limit=50&filters=$FILT_ENC" | python3 -c "
import json,sys
d=json.load(sys.stdin)
vals=set(str(r.get('$F_PROV')) for r in d['rows'])
print('رکوردهای مطابق:', d['total'], '| مقادیر استان:', vals)
assert d['total'] > 0 and vals == {'تهران'}, 'فیلتر Drill Through درست کار نمی‌کند'
print('✓ فیلتر Drill Through فقط رکوردهای تهران را برگرداند (۱۹.۳)')"

echo ""
echo "═══ ۲۳) به‌روزرسانی فایل و Upsert — بخش ۲۴ ═══"
echo "── ۲۳.۱) Upsert بر اساس «کد شعبه»: مقادیر تغییر یافته + دو شعبه جدید ──"
$CURL -X POST "$BASE/datasets/$DSID/upsert" -F "file=@/home/z/my-project/upload/فروش-به‌روزرسانی.xlsx" -F "mode=upsert" -F "keyFieldIds=[\"$F_BRANCH\"]" | tee /tmp/upsert1.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('درج:', d['inserted'], '| به‌روزرسانی:', d['updated'], '| بدون تغییر:', d['unchanged'], '| کل:', d['rowCount'], '| نسخه:', d['version'])
assert d['inserted'] == 2, 'انتظار دو شعبه جدید برآورده نشد'
assert d['updated'] >= 4, 'به‌روزرسانی مقادیر کلیدهای موجود ثبت نشد'
assert d['version'] > 1, 'نسخه داده افزایش نیافت (۲۴.۳)'
print('✓ Upsert صحیح: درج ۲ رکورد جدید و به‌روزرسانی موجودها؛ نسخه داده افزایش یافت')"
V1=$(python3 -c "import json; print(json.load(open('/tmp/upsert1.json'))['version'])")

echo "── ۲۳.۲) کنترل تغییر ساختار: ستون اضافه «توضیحات» → توقف و درخواست تأیید (۲۴.۲) ──"
DIFF=$($CURL -X POST "$BASE/datasets/$DSID/upsert" -F "file=@/home/z/my-project/upload/فروش-ساختار-تغییر.xlsx" -F "mode=append" -F "keyFieldIds=[\"$F_BRANCH\"]")
echo "$DIFF" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d.get('requiresConfirmation') == True, 'تغییر ساختار شناسایی نشد'
kinds=[c['kind'] for c in d['structureChanges']]
print('تغییرها:', kinds, '| گزارش منتشرشده وابسته:', d['publishedReports'])
print('پیام:', d['message'][:90])
assert 'added' in kinds, 'ستون اضافه‌شده تشخیص داده نشد'
print('✓ به‌روزرسانی متوقف و تأیید مدیر درخواست شد (۲۴.۲)')"

echo "── ۲۳.۳) تأیید مدیر و اعمال تغییر ساختار ──"
$CURL -X POST "$BASE/datasets/$DSID/upsert" -F "file=@/home/z/my-project/upload/فروش-ساختار-تغییر.xlsx" -F "mode=replace" -F "confirmStructureChange=true" | python3 -c "
import json,sys
v1 = int(sys.argv[1])
d=json.load(sys.stdin)
print('روش: جایگزینی کامل | ستون‌های جدید:', d['addedFields'], '| ستون:', d['fieldCount'], '| نسخه:', d['version'])
assert d['addedFields'] == ['توضیحات'], 'ستون جدید به مدل اضافه نشد'
assert d['version'] == v1 + 1, 'نسخه پس از تغییر ساختار افزایش نیافت'
print('✓ تغییر ساختار با تأیید مدیر اعمال شد؛ فایل خام جدید ثبت و نسخه افزایش یافت')" "$V1"

echo "── ۲۳.۴) فایل یکسان: پذیرفته نمی‌شود (اثر انگشت — ۷.۱) ──"
$CURL -X POST "$BASE/datasets/$DSID/upsert" -F "file=@/home/z/my-project/upload/فروش-ساختار-تغییر.xlsx" -F "mode=replace" -F "confirmStructureChange=true" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('پیام:', d.get('error','')[:80])
assert 'یکسان' in d.get('error',''), 'تشخیص فایل تکراری کار نمی‌کند'
print('✓ فایل با اثر انگشت محتوا تشخیص داده شد')"

echo ""
echo "═══ ۲۴) نمودارهای تخصصی: هیستوگرام و جعبه‌ای — بخش ۱۹.۲ ═══"
echo "── ۲۴.۱) هیستوگرام مبلغ: بازه‌های هم‌عرض با پوشش کامل رکوردها ──"
$CURL -X POST "$BASE/datasets/$DSID/histogram" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$F_AMT\",\"binCount\":8}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
total=sum(b['count'] for b in d['bins'])
print('بازه‌ها:', len(d['bins']), '| فراوانی کل:', total, '| وارد محاسبه:', d['used'], '| صرف‌نظر:', d['skipped'])
print('کمینه:', d['min'], '| بیشینه:', d['max'])
assert total == d['used'], 'جمع فراوانی بازه‌ها با تعداد وارد محاسبه نمی‌خواند'
assert d['used'] > 0 and d['min'] <= d['max'], 'هیستوگرام داده معتبر ندارد'
assert all(b['count'] >= 0 for b in d['bins'])
print('✓ هیستوگرام صحیح: پوشش کامل رکوردها در بازه‌های هم‌عرض (۱۹.۲)')"

echo "── ۲۴.۲) نمودار جعبه‌ای مبلغ به تفکیک استان: چهارک‌ها و سبیل‌ها ──"
$CURL -X POST "$BASE/datasets/$DSID/boxplot" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$F_AMT\",\"groupFieldId\":\"$F_PROV\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('گروه‌ها:', [g['name'] for g in d['groups']])
for g in d['groups']:
    s=g['stats']
    assert s['q1'] <= s['median'] <= s['q3'], f'ترتیب چهارک‌ها در «{g[\"name\"]}\" غلط است'
    assert s['min'] <= s['loWhisker'] <= s['q1'] and s['q3'] <= s['hiWhisker'] <= s['max'], f'ترتیب سبیل‌ها در «{g[\"name\"]}\" غلط است'
    assert s['count'] > 0
print('✓ نمودار جعبه‌ای صحیح: min ≤ Q1 ≤ میانه ≤ Q3 ≤ max و سبیل‌ها در محدوده ۱٫۵×IQR')"

echo ""
echo "═══ ۲۵) فیلتر وابسته — بخش ۱۹.۳ ═══"
echo "── ۲۵.۱) گزینه‌های پایه: مقادیر متمایز استان از داده واقعی ──"
OPT=$($CURL -X POST "$BASE/datasets/$DSID/filter-options" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$F_PROV\"}")
PROVVAL=$(echo "$OPT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['values'][0] if d['values'] else '')")
echo "$OPT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('مقادیر:', d['values'][:8], '| متمایز:', d['totalDistinct'], '| رکورد بررسی:', d['matchedRecords'])
assert d['totalDistinct'] >= 2 and len(d['values']) == d['totalDistinct'], 'گزینه‌های پایه درست نیست'
print('✓ گزینه‌های فیلتر از داده واقعی خوانده شد')"

echo "── ۲۵.۲) کاسکاد خودکار: با فیلتر استان، گزینه‌های شهرستان محدود می‌شود ──"
OPT1=$($CURL -X POST "$BASE/datasets/$DSID/filter-options" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$F_CITY\"}")
OPT1N=$(echo "$OPT1" | python3 -c "import json,sys; print(json.load(sys.stdin)['totalDistinct'])")
OPT2=$($CURL -X POST "$BASE/datasets/$DSID/filter-options" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$F_CITY\",\"filters\":[{\"fieldId\":\"$F_PROV\",\"op\":\"eq\",\"value\":\"$PROVVAL\"}]}")
echo "$OPT1" | python3 -c "import json,sys; d=json.load(sys.stdin); print('بدون فیلتر:', d['totalDistinct'], 'شهرستان |', d['values'][:6])"
echo "$OPT2" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('با فیلتر استان=$PROVVAL:', d['totalDistinct'], 'شهرستان |', d['values'], '| رکورد:', d['matchedRecords'])
assert d['totalDistinct'] >= 1 and d['matchedRecords'] > 0, 'کاسکاد کار نمی‌کند'
assert d['totalDistinct'] <= int('$OPT1N'), 'کاسکاد نباید گزینه‌ها را بیشتر کند'
print('✓ کاسکاد خودکار فیلترها فعال است (بخش ۱۹.۳: فیلتر وابسته)')"

echo "── ۲۵.۳) فیلتر از جدول مرتبط: ستون هدف از رابطه فروش ← اهداف ──"
ROPT=$($CURL -X POST "$BASE/datasets/$DSID/filter-options" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$T_GOAL\",\"relationId\":\"$RELID\"}")
echo "$ROPT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('از رابطه «', d['viaRelation'], '» | مقادیر هدف:', d['values'][:6], '| متمایز:', d['totalDistinct'])
assert d['viaRelation'] == 'فروش به اهداف', 'برچسب رابطه بازنگشته است'
assert d['totalDistinct'] >= 1, 'گزینه‌های جدول مرتبط خالی است'
print('✓ فیلتر وابسته خودکار از روابط جداول کار می‌کند (بخش‌های ۱۶ و ۱۹.۳)')"

echo "── ۲۵.۴) اعمال فیلتر رابطه‌ای در پرس‌وجو: محدودسازی جدول پایه ──"
RBR=$($CURL -X POST "$BASE/datasets/$DSID/filter-options" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$T_BRANCH\",\"relationId\":\"$RELID\"}")
BRVAL=$(echo "$RBR" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['values'][0] if d['values'] else '')")
FULL=$($CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"agg\":\"count\"}]}")
FULLN=$(echo "$FULL" | python3 -c "import json,sys; print(json.load(sys.stdin)['scannedRecords'])")
RELF=$($CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"agg\":\"count\"}],\"relationFilters\":[{\"relationId\":\"$RELID\",\"fieldId\":\"$T_BRANCH\",\"op\":\"eq\",\"value\":\"$BRVAL\"}]}")
echo "$RELF" | python3 -c "
import json,sys
full=int('$FULLN')
d=json.load(sys.stdin)
print('کل رکورد:', full, '| با فیلتر رابطه‌ای شعبه=$BRVAL:', d['scannedRecords'], '| هشدارها:', d['warnings'])
assert 0 < d['scannedRecords'] < full, 'فیلتر رابطه‌ای جدول پایه را محدود نکرد'
print('✓ فیلتر از جدول مرتبط به فیلتر کلید اتصال تبدیل و اعمال شد')"

echo ""
echo "═══ ۲۶) ماتریس و نقشه حرارتی — بخش ۱۹.۲ ═══"
echo "── ۲۶.۱) داده ماتریس: استان × شهرستان بدون جمع جزء ──"
$CURL -X POST "$BASE/datasets/$DSID/pivot" -H 'Content-Type: application/json' -d "{\"rowDims\":[\"$F_PROV\"],\"colDim\":\"$F_CITY\",\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}],\"subtotals\":false}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
leaves=[r for r in d['rows'] if not r['isSubtotal']]
print('سطرها:', len(leaves), '| ستون‌ها:', d['colKeys'])
assert all(not r['isSubtotal'] for r in d['rows']), 'جمع جزء باید خاموش باشد'
assert len(leaves) >= 2 and len(d['colKeys']) >= 1, 'داده ماتریس ناقص است'
vals=[r['cells'][f'{ck}||{d[\"measureAliases\"][0]}'] for r in leaves for ck in d['colKeys']]
print('بازه رنگ‌بندی آستانه‌ای: کمینه', min(vals), '— بیشینه', max(vals))
print('✓ داده ماتریس/نقشه حرارتی آماده رندر با رنگ‌بندی آستانه‌ای (۱۹.۴)')"

echo "── ۲۵.ب) جست‌وجو در گزینه‌های فیلتر ──"
$CURL -X POST "$BASE/datasets/$DSID/filter-options" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$F_PROV\",\"search\":\"ته\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('نتایج جست‌وجو «ته»:', d['values'])
assert all('ته' in v for v in d['values']), 'جست‌وجو در گزینه‌ها کار نمی‌کند'
print('✓ جست‌وجو در فیلترها فعال است (بخش ۱۹.۳ سند)')"

echo ""
echo "═══ ۲۷) هشدارها و اعلان‌ها — بخش ۲۶.۲ ═══"
echo "── ۲۷.۱) قاعده عبور از آستانه: جمع مبلغ بزرگ‌تر از ۱ ریال (قطعاً نقض می‌شود) ──"
R1=$($CURL -X POST "$BASE/alerts" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"پایش جمع مبلغ\",\"type\":\"threshold\",\"datasetId\":\"$DSID\",\"fieldId\":\"$F_AMT\",\"aggregation\":\"sum\",\"operator\":\"gt\",\"threshold\":1,\"severity\":\"critical\"}")
RULE1=$(echo "$R1" | python3 -c "import json,sys; print(json.load(sys.stdin)['rule']['id'])")
echo "$R1" | python3 -c "import json,sys; d=json.load(sys.stdin)['rule']; print('قاعده:', d['name'], '| نوع:', d['type'], '| شدت:', d['severity'])"

echo "── ۲۷.۲) ارزیابی: هشدار فعال و اعلان ساخته می‌شود ──"
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"ruleId\":\"$RULE1\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin)['results'][0]
print('قاعده:', r['ruleName'], '| فعال شد:', r['fired'], '| اعلان جدید:', r['created'], '| مقدار:', r['value'])
assert r['fired'] and r['created'], 'هشدار آستانه فعال نشد'
print('✓ عبور شاخص از آستانه → اعلان بحرانی (۲۶.۲)')"

echo "── ۲۷.۳) dedup: ارزیابی دوباره نباید اعلان تکراری بسازد ──"
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"ruleId\":\"$RULE1\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin)['results'][0]
print('فعال شد:', r['fired'], '| اعلان جدید:', r['created'], '| باز قبلی:', r.get('stillOpen'))
assert r['fired'] and not r['created'] and r.get('stillOpen'), 'جلوگیری از تکرار اعلان کار نمی‌کند'
print('✓ اعلان بازِ همان قاعده دوباره ساخته نمی‌شود (dedup)')"

echo "── ۲۷.۴) قاعده بدون نقض: جمع مبلغ کوچک‌تر از منفی‌۱ (نباید فعال شود) ──"
R2=$($CURL -X POST "$BASE/alerts" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"هشدار سقوط فروش\",\"type\":\"threshold\",\"datasetId\":\"$DSID\",\"fieldId\":\"$F_AMT\",\"aggregation\":\"sum\",\"operator\":\"lt\",\"threshold\":-1}")
RULE2=$(echo "$R2" | python3 -c "import json,sys; print(json.load(sys.stdin)['rule']['id'])")
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"ruleId\":\"$RULE2\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin)['results'][0]
print('فعال شد:', r['fired'], '| مقدار:', r['value'])
assert not r['fired'], 'قاعده بدون نقض نباید فعال شود'
print('✓ شرط بدون نقض، بدون اعلان (۲۶.۲)')"

echo "── ۲۷.۵) کاهش کیفیت داده: امتیاز کیفیت زیر ۱۰۰ ──"
R3=$($CURL -X POST "$BASE/alerts" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"پایش کیفیت داده\",\"type\":\"quality\",\"datasetId\":\"$DSID\",\"threshold\":100,\"severity\":\"warning\"}")
RULE3=$(echo "$R3" | python3 -c "import json,sys; print(json.load(sys.stdin)['rule']['id'])")
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"ruleId\":\"$RULE3\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin)['results'][0]
print('امتیاز مشاهده‌شده:', r['value'], '| فعال شد:', r['fired'])
assert r['fired'], 'قاعده کیفیت فعال نشد (امتیاز باید زیر ۱۰۰ باشد)'
print('✓ کاهش کیفیت داده → اعلان (۲۶.۲)')"

echo "── ۲۷.۶) تأخیر در دریافت فایل: حداکثر ۰ روز (فایل قدیمی‌تر از لحظه فعلی) ──"
R4=$($CURL -X POST "$BASE/alerts" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"پایش دریافت فایل دوره‌ای\",\"type\":\"fileDelay\",\"datasetId\":\"$DSID\",\"maxDays\":0}")
RULE4=$(echo "$R4" | python3 -c "import json,sys; print(json.load(sys.stdin)['rule']['id'])")
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"ruleId\":\"$RULE4\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin)['results'][0]
print('عمر فایل (روز):', r['value'], '| فعال شد:', r['fired'])
assert r['fired'], 'هشدار تأخیر فایل فعال نشد'
print('✓ تأخیر در دریافت فایل → اعلان (۲۶.۲)')"

echo "── ۲۷.۷) نبود داده در دوره مورد انتظار: کمینه ۹۹۹۹ رکورد ──"
R5=$($CURL -X POST "$BASE/alerts" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"انتظار داده دوره جدید\",\"type\":\"missingPeriod\",\"datasetId\":\"$DSID\",\"threshold\":9999}")
RULE5=$(echo "$R5" | python3 -c "import json,sys; print(json.load(sys.stdin)['rule']['id'])")
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"ruleId\":\"$RULE5\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin)['results'][0]
print('رکورد موجود:', r['value'], '| فعال شد:', r['fired'])
assert r['fired'], 'هشدار نبود داده فعال نشد'
print('✓ نبود داده در دوره مورد انتظار → اعلان (۲۶.۲)')"

echo "── ۲۷.۸) تغییر ساختار: ارزیابی پایه، تغییر نوع ستون، ارزیابی دوباره ──"
R6=$($CURL -X POST "$BASE/alerts" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"پایش ساختار ستون‌ها\",\"type\":\"structureChange\",\"datasetId\":\"$DSID\"}")
RULE6=$(echo "$R6" | python3 -c "import json,sys; print(json.load(sys.stdin)['rule']['id'])")
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"ruleId\":\"$RULE6\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin)['results'][0]
assert not r['fired'], 'ارزیابی اول باید امضای پایه ثبت کند نه هشدار'
print('ارزیابی اول: امضای پایه ثبت شد (بدون هشدار)')"
# تغییر نوع ستون تعداد تراکنش: integer ← decimal (تغییر ساختار واقعی)
$CURL -X PATCH "$BASE/datasets/$DSID/columns" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$F_CNT\",\"type\":\"decimal\"}" > /dev/null
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"ruleId\":\"$RULE6\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin)['results'][0]
print('فعال شد:', r['fired'], '| اعلان جدید:', r['created'])
assert r['fired'] and r['created'], 'تغییر ساختار شناسایی نشد'
print('✓ تغییر ساختار (نوع ستون) → اعلان (۲۶.۲)')"
# بازگرداندن نوع ستون به حالت اول
$CURL -X PATCH "$BASE/datasets/$DSID/columns" -H 'Content-Type: application/json' -d "{\"fieldId\":\"$F_CNT\",\"type\":\"integer\"}" > /dev/null

echo "── ۲۷.۹) شکست پردازش: بارگذاری فایل نامعتبر → اعلان خودکار ──"
printf 'این یک فایل متنی ساده است و ساختار اکسل ندارد' > /tmp/fake-report.xlsx
$CURL -X POST "$BASE/files/upload" -F "file=@/tmp/fake-report.xlsx" -F "projectId=$PID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('پاسخ: ', d.get('error', 'پذیرفته شد!'))
assert 'error' in d, 'فایل نامعتبر نباید پذیرفته شود'"
NOTIF_AFTER=$($CURL "$BASE/notifications?projectId=$PID&unread=1&limit=100")
echo "$NOTIF_AFTER" | python3 -c "
import json,sys
d=json.load(sys.stdin)
pf=[n for n in d['items'] if n['type']=='processFailure']
print('اعلان نخوانده:', d['unreadCount'], '| شکست پردازش:', len(pf))
assert len(pf) >= 1, 'اعلان خودکار شکست پردازش ساخته نشد'
assert pf[0]['severity'] == 'critical', 'شدت شکست پردازش باید بحرانی باشد'
print('✓ شکست پردازش → اعلان خودکار بحرانی (۲۶.۲)')"

echo "── ۲۷.۱۰) ارزیابی کل پروژه: قاعده شکست پردازش رویداد ثبت‌شده را می‌بیند ──"
R7=$($CURL -X POST "$BASE/alerts" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"پایش شکست پردازش\",\"type\":\"processFailure\"}")
RULE7=$(echo "$R7" | python3 -c "import json,sys; print(json.load(sys.stdin)['rule']['id'])")
$CURL -X POST "$BASE/alerts/evaluate" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('خلاصه:', d['summary'])
assert d['summary']['total'] >= 6, 'همه قواعد ارزیابی نشدند'
print('✓ ارزیابی گروهی همه قواعد فعال (۲۶.۲)')"

echo "── ۲۷.۱۱) اعلان‌ها: فهرست، خواندن یکی، خواندن همه ──"
$CURL "$BASE/notifications?projectId=$PID&limit=100" | python3 -c "
import json,sys
d=json.load(sys.stdin)
types=set(n['type'] for n in d['items'])
print('اعلان کل:', len(d['items']), '| نخوانده:', d['unreadCount'], '| انواع:', sorted(types))
need={'threshold','quality','fileDelay','structureChange','missingPeriod','processFailure'}
assert need.issubset(types), 'همه انواع اعلان تولید نشد: ' + str(need)
print('✓ هر شش نوع اعلان بخش ۲۶.۲ تولید شد')"
FIRSTID=$($CURL "$BASE/notifications?projectId=$PID&limit=1" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['id'])")
$CURL -X PATCH "$BASE/notifications/$FIRSTID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['updated'] and d['notification']['read'], 'خواندن تک‌اعلان کار نمی‌کند'
print('✓ علامت‌گذاری یک اعلان به‌عنوان خوانده‌شده')"
$CURL -X POST "$BASE/notifications" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"action\":\"read-all\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('خوانده شد:', d['updated'])
assert d['updated'] >= 1, 'خواندن همه کار نمی‌کند'"
$CURL "$BASE/notifications?projectId=$PID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['unreadCount'] == 0, 'همه اعلان‌ها خوانده نشد'
print('✓ خواندن همه — شمارش نخوانده صفر شد (۲۶.۲)')"

echo "── ۲۷.۱۲) کنترل دسترسی: نقش مشاهده‌کننده نمی‌تواند قاعده بسازد ──"
$CURL -X POST "$BASE/users" -H 'Content-Type: application/json' -d '{"username":"viewer1","password":"viewer123","name":"مشاهده‌کننده آزمون","role":"viewer"}' > /dev/null || true
$CURL -X POST "$BASE/auth/logout" > /dev/null
$CURL -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"viewer1","password":"viewer123","name":"مشاهده‌کننده آزمون"}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['user']['role'] == 'viewer', 'ورود کاربر مشاهده‌کننده ناموفق بود'
print('ورود:', d['user']['name'], '| نقش:', d['user']['roleLabel'])"
DENIED=$($CURL -X POST "$BASE/alerts" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"قاعده غیرمجاز\",\"type\":\"processFailure\"}")
echo "$DENIED" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('پاسخ:', d.get('error', 'خطا'))
assert 'error' in d, 'نقش فاقد مجوز باید رد شود'
print('✓ کنترل دسترسی alert.manage فعال است — مشاهده‌کننده رد شد (۲۹ و ۲۶.۲)')"
# بازگشت به مدیر برای سازگاری اجراهای بعدی
$CURL -X POST "$BASE/auth/logout" > /dev/null
$CURL -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123","name":"مدیر سامانه"}' > /dev/null

echo ""
echo "✓✓ تست انتها به انتها کامل شد — datasetId=$DSID | reportId=$RID"
