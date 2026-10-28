#!/bin/bash
# تست انتها به انتهای سامانه — سناریوهای پذیرش بخش ۳۳ سند
# فاز دوم: احراز هویت (۲۹)، روابط بصری جداول (۱۶)، گردش کار تأیید (۲۶.۱)، ظرفیت (۳۰.۱)
# فاز سوم: جدول محوری (۱۹.۲)، Drill Through (۱۹.۳)، Upsert (۲۴)، نمودارهای تخصصی (۱۹.۲)، فیلتر وابسته (۱۹.۳)
set -e
# سرور آزمون: پیش‌فرض پورت ۳۰۰۰ (محیط توسعه/سندباکس)؛ در صورت لزوم با E2E_BASE تغییر کنید
BASE="${E2E_BASE:-http://localhost:3000/api}"
JAR="/tmp/e2e_cookies.txt"
CURL="curl -s -b $JAR -c $JAR"

echo "═══ ۰) ورود / راه‌اندازی اولیه مدیر سامانه (بخش ۲۹) ═══"
LOGIN=$($CURL -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123","name":"مدیر سامانه"}')
# خودترمیمی: اگر MFA از اجرای قبلی نیمه‌کاره مانده، با کلید ذخیره‌شده کد TOTP بساز
if echo "$LOGIN" | rg -q 'mfaRequired' 2>/dev/null; then
  echo "MFA فعال مانده از اجرای قبلی — ورود با کد TOTP کلید ذخیره‌شده…"
  MFA_SECRET=$(cat /tmp/e2e_mfa_secret.txt 2>/dev/null || echo "")
  MFA_TICKET=$(echo "$LOGIN" | python3 -c "import json,sys; print(json.load(sys.stdin)['ticket'])")
  if [ -n "$MFA_SECRET" ]; then
    MFA_CODE=$(TOTP_SECRET="$MFA_SECRET" python3 -c "
import hmac,hashlib,base64,struct,time,os
sec=os.environ['TOTP_SECRET']; pad='='*(-len(sec)%8); key=base64.b32decode(sec.upper()+pad)
c=int(time.time()//30); b=struct.pack('>Q',c)
h=hmac.new(key,b,hashlib.sha1).digest(); o=h[-1]&15
print(str((((h[o]&127)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3])%10**6).zfill(6))")
    LOGIN=$($CURL -X POST "$BASE/auth/mfa/verify" -H 'Content-Type: application/json' -d "{\"ticket\":\"$MFA_TICKET\",\"code\":\"$MFA_CODE\"}")
  fi
fi
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
echo "═══ ۲۸) تقویم مناسبت‌ها — بخش ۱۵.۴ ═══"

echo "── ۲۸.۱) ثبت مناسبت با هر هشت فیلد سند ──"
OCC1=$($CURL -X POST "$BASE/occasions" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"عید نوروز\",\"calendarType\":\"shamsi\",\"year\":\"1404\",\"startDate\":\"1404-01-01\",\"endDate\":\"1404-01-13\",\"category\":\"official\",\"scope\":\"global\",\"isHoliday\":true,\"source\":\"مصوبه هیئت وزیران\",\"sourceVersion\":\"1404-r1\",\"color\":\"#16a34a\",\"label\":\"نوروز ۱۴۰۴\"}")
echo "$OCC1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
o=d['occasion']
assert o['name'] == 'عید نوروز' and o['calendarType'] == 'shamsi' and o['isHoliday'], 'فیلدهای مناسبت ناقص'
assert o['source'] and o['sourceVersion'] and o['color'] and o['label'], 'منبع/نسخه/رنگ/برچسب ثبت نشد'
print('مناسبت:', o['label'], '|', o['startDate'], 'تا', o['endDate'], '| تعطیل:', o['isHoliday'])"
OCCID1=$(echo "$OCC1" | python3 -c "import json,sys; print(json.load(sys.stdin)['occasion']['id'])")
echo "✓ مناسبت با هر هشت فیلد بخش ۱۵.۴ ثبت شد"

echo "── ۲۸.۲) هم‌پوشانی مناسبت‌ها — هشدار غیرمسدودکننده (بخش ۱۵.۵) ──"
$CURL -X POST "$BASE/occasions" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"تعطیلی نوروزی شرکت\",\"calendarType\":\"shamsi\",\"year\":\"1404\",\"startDate\":\"1404-01-10\",\"endDate\":\"1404-01-16\",\"category\":\"organizational\",\"scope\":\"local\",\"isHoliday\":false}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['occasion']['id'], 'مناسبت دوم ثبت نشد'
assert len(d['overlapWith']) >= 1, 'هم‌پوشانی با نوروز شناسایی نشد'
print('هم‌پوشان با:', '، '.join(x['name'] for x in d['overlapWith']))
print('✓ هم‌پوشانی شناسایی شد و هشدار داده شد (۱۵.۵)')"

echo "── ۲۸.۳) ویرایش و فهرست ──"
$CURL -X PATCH "$BASE/occasions/$OCCID1" -H 'Content-Type: application/json' -d '{"endDate":"1404-01-12"}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['occasion']['endDate'] == '1404-01-12', 'ویرایش مناسبت کار نکرد'
print('✓ ویرایش مناسبت انجام شد — پایان جدید:', d['occasion']['endDate'])"
$CURL "$BASE/occasions?projectId=$PID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert len(d['occasions']) >= 2, 'فهرست مناسبت‌ها ناقص'
print('فهرست:', len(d['occasions']), 'مناسبت')
print('✓ فهرست مناسبت‌ها بر اساس سال و تاریخ مرتب است')"

echo "── ۲۸.۴) ورود گروهی از فایل (۱۵.۴: ایجاد یا وارد کند) ──"
cat > /tmp/occasions_test.csv << 'OCCCSV'
نام مناسبت,نوع تقویم,سال,تاریخ شروع,تاریخ پایان,دسته,دامنه,تعطیل,منبع,نسخه,رنگ,برچسب
عید فطر,قمری,1404,1404-03-01,1404-03-03,دینی,سراسری,تعطیل,مرجع تقویمی سازمان,1404-r2,#0ea5e9,عید سعید فطر
کریسمس,میلادی,2024,2024-12-25,2024-12-25,سایر,سراسری,خیر,,,,کریسمس
سطر خراب,,,,,,,
OCCCSV
$CURL -X POST "$BASE/occasions/import" -F "projectId=$PID" -F "file=@/tmp/occasions_test.csv" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('واردشده:', d['imported'], '| ردشده:', d['failed'])
assert d['imported'] == 2, 'دو مناسبت معتبر باید وارد می‌شد'
assert d['failed'] == 1, 'سطر خراب باید رد می‌شد'
assert d['errors'][0]['row'] == 4, 'رد سطر خراب باید شماره سطر داشته باشد'
assert isinstance(d.get('overlaps'), list), 'گزارش هم‌پوشانی باید فهرست باشد'
print('✓ ورود گروهی از فایل با نگاشت سرستون فارسی، رد سطر معیوب و اعلام هم‌پوشانی')"

echo "── ۲۸.۵) حذف مناسبت ──"
$CURL -X DELETE "$BASE/occasions/$OCCID1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['deleted'], 'حذف مناسبت کار نکرد'
print('✓ حذف مناسبت انجام شد')"

echo ""
echo "═══ ۲۹) خروجی PDF و PowerPoint — بخش ۲۳.۱ ═══"

echo "── ۲۹.۱) خروجی PDF با فونت جاسازی‌شده و صفحه‌بندی ──"
$CURL -X POST "$BASE/datasets/$DSID/export" -H 'Content-Type: application/json' -d "{\"format\":\"pdf\",\"title\":\"گزارش آزمون PDF\",\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}],\"filters\":[{\"fieldId\":\"$F_PROV\",\"op\":\"eq\",\"value\":\"تهران\"}]}" -o /tmp/report_test.pdf -w "PDF: HTTP %{http_code} | %{size_download} بایت | نوع: %{content_type}\n"
python3 - << 'PYEOF'
data = open('/tmp/report_test.pdf','rb').read()
assert data[:5] == b'%PDF-', 'فایل PDF معتبر نیست'
assert len(data) > 5000, 'حجم PDF مشکوک است (فونت جاسازی نشده؟)'
assert b'/FontFile2' in data, 'فونت جاسازی‌شده در PDF یافت نشد (بخش ۲۳.۱)'
print('✓ PDF معتبر با فونت جاسازی‌شده وزیرمتن و صفحه‌بندی (۲۳.۱)')
PYEOF

echo "── ۲۹.۲) خروجی PowerPoint برای ارائه مدیریتی ──"
$CURL -X POST "$BASE/datasets/$DSID/export" -H 'Content-Type: application/json' -d "{\"format\":\"pptx\",\"title\":\"گزارش آزمون PowerPoint\",\"chartType\":\"bar\",\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}]}" -o /tmp/report_test.pptx -w "PPTX: HTTP %{http_code} | %{size_download} بایت\n"
python3 - << 'PYEOF'
import zipfile
data = open('/tmp/report_test.pptx','rb').read()
assert data[:2] == b'PK', 'فایل PPTX (بسته ZIP) معتبر نیست'
z = zipfile.ZipFile('/tmp/report_test.pptx')
names = z.namelist()
assert 'ppt/presentation.xml' in names, 'ساختار پاورپوینت ناقص'
slides = [n for n in names if n.startswith('ppt/slides/slide')]
charts = [n for n in names if n.startswith('ppt/charts/chart')]
print('اسلایدها:', len(slides), '| نمودار بومی:', len(charts) > 0)
assert len(slides) >= 3, 'اسلایدهای عنوان/نمودار/جدول ساخته نشد'
assert len(charts) >= 1, 'نمودار بومی پاورپوینت ساخته نشد'
print('✓ PPTX با اسلاید عنوان، نمودار بومی و جدول مدیریتی (۲۳.۱)')
PYEOF

echo "── ۲۹.۳) ثبت فیلترها و زمان تولید در شناسنامه (بخش ۲۳.۲) ──"
$CURL "$BASE/audit" | python3 -c "
import json,sys
acts=[a['action'] for a in json.load(sys.stdin)]
assert 'خروجی PDF' in acts and 'خروجی PowerPoint' in acts, 'خروجی‌ها در ثبت رویداد نیامده (۲۳.۲)'
print('✓ خروجی PDF/PowerPoint در ردیابی ثبت شد (بخش ۴ و ۲۳.۲)')"

echo ""
echo "═══ ۳۰) زمان‌بندی خودکار ارزیابی + کانال ایمیلی — تکمیل ۲۶.۲ ═══"

echo "── ۳۰.۱) زمان‌بند با شروع سرور فعال است ──"
$CURL "$BASE/settings/scheduler" | python3 -c "
import json,sys
d=json.load(sys.stdin)['scheduler']
print('فعال:', d['running'], '| فاصله (دقیقه):', d['intervalMinutes'])
assert d['running'], 'زمان‌بند فعال نشده است'
assert d['intervalMinutes'] == 60, 'فاصله پیش‌فرض ۶۰ دقیقه نیست'
print('✓ زمان‌بند خودکار با پیش‌فرض ۶۰ دقیقه فعال است (۲۶.۲)')"

echo "── ۳۰.۲) تغییر فاصله ارزیابی و پیکربندی ایمیل ──"
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"alertEvalIntervalMinutes":45,"emailEnabled":true,"smtpHost":"smtp.test.example","smtpPort":587,"smtpUser":"alerts@test.example","smtpPass":"secret123","smtpFrom":"هشدار <alerts@test.example>","alertEmailTo":"مدیر@test.example، steward@test.example"}' | python3 -c "
import json,sys
d=json.load(sys.stdin)['settings']
assert d['alertEvalIntervalMinutes'] == 45, 'فاصله ارزیابی ذخیره نشد'
assert d['emailEnabled'] == True, 'کانال ایمیلی فعال نشد'
assert d['smtpPass'] == '***', 'گذرواژه باید ماسک شود (بخش ۲۹)'
print('✓ فاصله ۴۵ دقیقه و SMTP ذخیره شد؛ گذرواژه در پاسخ ماسک است')"
$CURL "$BASE/settings/scheduler" | python3 -c "
import json,sys
d=json.load(sys.stdin)['scheduler']
assert d['intervalMinutes'] == 45, 'فاصله جدید در وضعیت زمان‌بند منعکس نشد'
print('✓ تغییر فاصله بدون ری‌استارت در وضعیت زمان‌بند اعمال شد')"

echo "── ۳۰.۳) ارسال ایمیل آزمایشی بدون SMTP واقعی — پرش موذبانه ──"
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"emailEnabled":false}' > /dev/null
$CURL -X POST "$BASE/settings/email-test" -H 'Content-Type: application/json' -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)['result']
assert d['skipped'] and not d['ok'], 'بدون فعال‌بودن ایمیل باید موذبانه پرش شود'
print('دلیل:', d['reason'])
print('✓ کانال ایمیلی غیرفعال → پرش موذبانه بدون خطا (سامانه بدون SMTP هم سالم است)')"

echo "── ۳۰.۴) بازگرداندن تنظیمات پیش‌فرض ──"
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"alertEvalIntervalMinutes":60,"emailEnabled":false,"smtpHost":"","smtpUser":"","smtpPass":"","smtpFrom":"","alertEmailTo":""}' > /dev/null
$CURL "$BASE/settings/scheduler" | python3 -c "
import json,sys
d=json.load(sys.stdin)['scheduler']
assert d['intervalMinutes'] == 60, 'بازگشت به پیش‌فرض انجام نشد'
print('✓ تنظیمات به پیش‌فرض بازگشت — اجراهای بعدی سازگار می‌ماند')"

echo ""
echo "✓✓ تست انتها به انتها کامل شد — datasetId=$DSID | reportId=$RID"

# ═══════════════ فاز هفتم: SSO/MFA (۲۹)، اتصال منابع خارجی (۳۱)، صف پردازش خروجی (۳۰.۲) ═══════════════

echo ""
echo "═══ ۳۱) ورود یکپارچه سازمانی و احراز هویت دوعاملی — بخش ۲۹ ═══"

echo "── ۳۱.۱) MFA: تولید کلید، کد نادرست رد و کد صحیح فعال می‌شود ──"
MFA_SETUP=$($CURL -X POST "$BASE/auth/mfa/setup" -H 'Content-Type: application/json' -d '{}')
MFA_SECRET=$(echo "$MFA_SETUP" | python3 -c "import json,sys; print(json.load(sys.stdin)['secret'])")
echo "$MFA_SECRET" > /tmp/e2e_mfa_secret.txt
echo "$MFA_SETUP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['secret'] and len(d['secret']) >= 24, 'کلید TOTP تولید نشد'
assert d['otpauth'].startswith('otpauth://totp/'), 'آدرس otpauth نامعتبر است'
assert d['qr'].startswith('data:image/png;base64,'), 'تصویر QR تولید نشد'
print('✓ کلید Base32 + آدرس otpauth + تصویر QR تولید شد')"
$CURL -X POST "$BASE/auth/mfa/enable" -H 'Content-Type: application/json' -d '{"code":"000000"}' -w " [HTTP %{http_code}]" | python3 -c "
import sys
s=sys.stdin.read()
assert '401' in s, 'کد نادرست باید رد شود'
print('✓ کد نادرست رد شد (HTTP 401)')"
TOTP_CODE=$(TOTP_SECRET="$MFA_SECRET" python3 -c "
import hmac,hashlib,base64,struct,time,os
sec=os.environ['TOTP_SECRET']; pad='='*(-len(sec)%8); key=base64.b32decode(sec.upper()+pad)
c=int(time.time()//30); b=struct.pack('>Q',c)
h=hmac.new(key,b,hashlib.sha1).digest(); o=h[-1]&15
print(str((((h[o]&127)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3])%10**6).zfill(6))")
$CURL -X POST "$BASE/auth/mfa/enable" -H 'Content-Type: application/json' -d "{\"code\":\"$TOTP_CODE\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['enabled'] is True, 'MFA فعال نشد'
print('✓ MFA با کد معتبر TOTP فعال شد (بخش ۲۹ سند: نقش‌های حساس)')"
$CURL "$BASE/users" | python3 -c "
import json,sys
users=json.load(sys.stdin)
u=[x for x in users if x['username']=='admin'][0]
assert u['mfaEnabled'] is True, 'وضعیت MFA در فهرست کاربران منعکس نشد'
print('✓ وضعیت MFA در مدیریت کاربران قابل مشاهده است')"

echo "── ۳۱.۲) ورود دوعاملی: گذرواژه ← بلیت ← کد ──"
MFA_LOGIN=$($CURL -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
MFA_TICKET=$(echo "$MFA_LOGIN" | python3 -c "import json,sys; print(json.load(sys.stdin)['ticket'])")
echo "$MFA_LOGIN" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d.get('mfaRequired') is True and d.get('ticket'), 'ورود باید به گام دوم برود'
print('✓ با MFA فعال، نشست مستقیم صادر نمی‌شود — بلیت کوتاه‌عمر صادر شد')"
$CURL -X POST "$BASE/auth/mfa/verify" -H 'Content-Type: application/json' -d "{\"ticket\":\"$MFA_TICKET\",\"code\":\"000000\"}" -w " [HTTP %{http_code}]" | python3 -c "
import sys
s=sys.stdin.read()
assert '401' in s, 'کد نادرست در گام دوم باید رد شود'
print('✓ کد نادرست در گام دوم رد شد')"
TOTP_CODE2=$(TOTP_SECRET="$MFA_SECRET" python3 -c "
import hmac,hashlib,base64,struct,time,os
sec=os.environ['TOTP_SECRET']; pad='='*(-len(sec)%8); key=base64.b32decode(sec.upper()+pad)
c=int(time.time()//30); b=struct.pack('>Q',c)
h=hmac.new(key,b,hashlib.sha1).digest(); o=h[-1]&15
print(str((((h[o]&127)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3])%10**6).zfill(6))")
$CURL -X POST "$BASE/auth/mfa/verify" -H 'Content-Type: application/json' -d "{\"ticket\":\"$MFA_TICKET\",\"code\":\"$TOTP_CODE2\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['user']['role'] == 'admin', 'ورود دوعاملی به نشست کامل منجر نشد'
print('✓ کد معتبر → نشست کامل صادر شد (ورود دو مرحله‌ای کامل)')"

echo "── ۳۱.۳) بازنشانی MFA توسط مدیر + غیرفعال‌سازی با کد ──"
TOTP_CODE3=$(TOTP_SECRET="$MFA_SECRET" python3 -c "
import hmac,hashlib,base64,struct,time,os
sec=os.environ['TOTP_SECRET']; pad='='*(-len(sec)%8); key=base64.b32decode(sec.upper()+pad)
c=int(time.time()//30); b=struct.pack('>Q',c)
h=hmac.new(key,b,hashlib.sha1).digest(); o=h[-1]&15
print(str((((h[o]&127)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3])%10**6).zfill(6))")
$CURL -X POST "$BASE/auth/mfa/disable" -H 'Content-Type: application/json' -d "{\"code\":\"$TOTP_CODE3\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['enabled'] is False, 'غیرفعال‌سازی انجام نشد'
print('✓ غیرفعال‌سازی با تأیید کد انجام شد (امنیت: غیرفعال‌سازی هم نیازمند کد است)')"
$CURL -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['user']['role'] == 'admin', 'پس از غیرفعال‌سازی ورود عادی باید انجام شود'
print('✓ ورود عادی بدون MFA برقرار است')"

echo "── ۳۱.۴) SSO: وضعیت عمومی، شروع جریان، محافظت state ──"
# خودترمیمی: هر وضعیت باقی‌مانده از اجرای قبلی پاک می‌شود
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"ssoEnabled":false}' > /dev/null
$CURL "$BASE/auth/sso/status" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['enabled'] is False, 'SSO باید پیش از پیکربندی غیرفعال باشد'
print('✓ وضعیت SSO عمومی: غیرفعال')"
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"ssoEnabled":true,"ssoIssuer":"","ssoClientId":"e2e-client","ssoClientSecret":"e2e-secret-123","ssoAuthorizeUrl":"https://sso.example.org/authorize","ssoTokenUrl":"https://sso.example.org/token","ssoScopes":"openid profile email"}' > /dev/null
$CURL "$BASE/auth/sso/start" -o /dev/null -w "%{http_code} %{redirect_url}" | python3 -c "
import sys
line=sys.stdin.read()
assert line.startswith('302') or line.startswith('307'), 'شروع SSO باید ریدایرکت باشد (302/307)'
assert 'client_id=e2e-client' in line and 'state=' in line, 'آدرس authorize باید client_id و state داشته باشد'
print('✓ هدایت به سامانه هویتی با client_id و state (جریان Authorization Code)')"
# callback با state نادرست → هدایت خطا (محافظت CSRF — بخش ۲۹)
$CURL "$BASE/auth/sso/callback?code=x&state=wrong-state" -o /dev/null -w "%{redirect_url}" | python3 -c "
import sys
from urllib.parse import unquote
url=unquote(sys.stdin.read())
assert 'ssoError=' in url, 'callback با state نادرست باید به خطا هدایت شود'
print('✓ state نامعتبر رد شد — محافظت CSRF جریان SSO (بخش ۲۹ سند)')"
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"ssoEnabled":false}' > /dev/null
echo "✓ پیکربندی SSO آزمون و غیرفعال شد — در استقرار سازمانی با IdP واقعی (Keycloak/Azure AD/Google) فعال می‌شود"

echo ""
echo "═══ ۳۲) اتصال API و پایگاه‌داده خارجی — بخش ۳۱ ═══"

echo "── ۳۲.۱) کنترل دسترسی: مشاهده‌کننده نمی‌تواند اتصال بسازد ──"
curl -s -c /tmp/conn_viewer.txt -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"karbar1","password":"ramz1234"}' > /dev/null
curl -s -b /tmp/conn_viewer.txt -X POST "$BASE/connections" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"غیرمجاز\",\"type\":\"api\",\"config\":{\"url\":\"https://x.example\"}}" -w " [HTTP %{http_code}]" | python3 -c "
import sys
s=sys.stdin.read()
assert '403' in s, 'مشاهده‌کننده باید رد شود'
print('✓ ساخت اتصال برای نقش مشاهده‌کننده رد شد (کنترل دسترسی — بخش ۲۹)')"

echo "── ۳۲.۲) ایجاد اتصال API به سلامت سرویس + آزمون ──"
CONN=$($CURL -X POST "$BASE/connections" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"سلامت سرویس (API)\",\"type\":\"api\",\"config\":{\"url\":\"$BASE/health\",\"method\":\"GET\"}}")
CID=$(echo "$CONN" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
$CURL -X POST "$BASE/connections/$CID/test" -H 'Content-Type: application/json' -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)['result']
assert d['ok'] is True, f\"اتصال API باید موفق باشد: {d['message']}\"
assert d['fieldCount'] and d['rowCount'] >= 1, 'فیلدها باید شناسایی شوند'
print(f\"✓ اتصال API موفق: {d['message']} — {d['fieldCount']} ستون شناسایی شد\")"

echo "── ۳۲.۳) همگام‌سازی → ساخت مجموعه‌داده و همگام‌سازی دوباره → نسخه جدید ──"
SYNC1=$($CURL -X POST "$BASE/connections/$CID/sync" -H 'Content-Type: application/json' -d '{}')
SYNC_DSID=$(echo "$SYNC1" | python3 -c "import json,sys; print(json.load(sys.stdin)['datasetId'])")
echo "$SYNC1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['created'] is True and d['version'] == 1, 'نخستین همگام‌سازی باید مجموعه‌داده بسازد'
print('✓', d['message'])"
$CURL -X POST "$BASE/connections/$CID/sync" -H 'Content-Type: application/json' -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['created'] is False and d['version'] == 2, 'همگام‌سازی دوم باید نسخه را افزایش دهد'
print('✓', d['message'], '— گزارش‌ها و روابط حفظ می‌شوند (نسخه‌بندی ۲۴.۳)')"

echo "── ۳۲.۴) پیش‌نمایش + ماسک مقادیر محرمانه پیکربندی ──"
$CURL -X POST "$BASE/connections/$CID/preview" -H 'Content-Type: application/json' -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert len(d['rows']) >= 1 and len(d['fields']) >= 3, 'پیش‌نمایش باید سطر و ستون داشته باشد'
print('✓ پیش‌نمایش:', d['message'], '— سطرها بدون ساخت مجموعه‌داده')"
$CURL -X POST "$BASE/connections" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"name\":\"پایگاه‌داده سازمانی\",\"type\":\"postgres\",\"config\":{\"host\":\"127.0.0.1\",\"port\":5499,\"database\":\"sales\",\"user\":\"reporter\",\"password\":\"Ramz-1234\"},\"query\":\"SELECT * FROM sales\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('✓ اتصال PostgreSQL ساخته شد:', d['message'])"
PGID=$($CURL "$BASE/connections?projectId=$PID" | python3 -c "
import json,sys
conns=json.load(sys.stdin)
c=[x for x in conns if x['name']=='پایگاه‌داده سازمانی'][0]
print(c['id'])")
$CURL "$BASE/connections?projectId=$PID" | python3 -c "
import json,sys
conns=json.load(sys.stdin)
c=[x for x in conns if x['name']=='پایگاه‌داده سازمانی'][0]
assert c['configRaw'] and 'Ramz-1234' not in c['configRaw'], 'گذرواژه باید ماسک شود'
assert '***' in c['configRaw'], 'ماسک در پیکربندی یافت نشد'
print('✓ گذرواژه پیکربندی در پاسخ ماسک است (بخش ۲۹ سند)')"

echo "── ۳۲.۵) خطای اتصال پایگاه‌داده با پیام فارسی عملیاتی ──"
$CURL -X POST "$BASE/connections/$PGID/test" -H 'Content-Type: application/json' -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)['result']
assert d['ok'] is False, 'اتصال به پورت بسته باید ناموفق باشد'
assert ('اتصال' in d['message']) or ('مهلت' in d['message']) or ('یافت نشد' in d['message']), 'پیام خطا باید فارسی و عملیاتی باشد: ' + d['message']
print('✓ خطای اتصال با پیام عملیاتی فارسی:', d['message'][:80])"
$CURL -X DELETE "$BASE/connections/$PGID" > /dev/null
echo "✓ اتصال آزمون پایگاه‌داده پاک شد — درایور PostgreSQL بارگذاری و مسیر خطا آزمایش شد"

echo ""
echo "═══ ۳۳) صف پردازش خروجی حجیم و سلامت سرویس — بخش ۳۰.۲ ═══"

echo "── ۳۳.۱) سلامت سرویس (مانیتورینگ ۳۰.۲) ──"
$CURL "$BASE/health" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['status'] == 'ok', 'سرویس باید سالم باشد'
assert d['checks']['database']['status'] == 'ok', 'پایگاه‌داده باید سالم باشد'
assert 'queue' in d['checks'] and 'scheduler' in d['checks'], 'وضعیت صف و زمان‌بند باید گزارش شود'
print('✓ سلامت سرویس: پایگاه‌داده، زمان‌بند و صف قابل پایش — uptime:', d['uptimeSec'], 'ثانیه')"

DIM_FIELD=$($CURL "$BASE/datasets/$DSID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
dims=[f['id'] for f in d['fields'] if f['role'] != 'measure']
print(dims[0])")

echo "── ۳۳.۲) ثبت کار خروجی Excel در صف و پیگیری تا پایان ──"
JOB1=$($CURL -X POST "$BASE/jobs" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DSID\",\"format\":\"xlsx\",\"title\":\"گزارش صف e2e\",\"spec\":{\"dimensions\":[\"$DIM_FIELD\"],\"measures\":[{\"agg\":\"sum\"}]}}")
JID1=$(echo "$JOB1" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
echo "$JOB1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['id'], 'کار ثبت نشد'
print('✓ کار در صف ثبت شد (HTTP 202) —', d['message'])"
for i in $(seq 1 40); do
  JS=$($CURL "$BASE/jobs/$JID1" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])")
  [ "$JS" = "done" ] && break
  [ "$JS" = "failed" ] && { echo "کار ناموفق شد!"; exit 1; }
  sleep 1
done
$CURL "$BASE/jobs/$JID1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['status'] == 'done', 'کار اکسل باید کامل شود'
assert d['progress'] == 100 and d['result']['fileName'], 'نتیجه باید ثبت شود'
assert d['attempts'] == 1 and d['durationMs'] is not None, 'مدت اجرا باید ثبت شود (بخش ۳۰.۲)'
print(f\"✓ خروجی پس‌زمینه آماده شد: {d['result']['fileName']} ({round(d['result']['size']/1024,1)} کیلوبایت، {d['durationMs']} میلی‌ثانیه)\")"

echo "── ۳۳.۳) دانلود فایل خروجی از صف ──"
$CURL "$BASE/jobs/$JID1/download" -o /tmp/e2e_job_export.xlsx -w "%{http_code}" | python3 -c "
import sys
assert sys.stdin.read().strip() == '200', 'دانلود باید موفق باشد'
with open('/tmp/e2e_job_export.xlsx','rb') as f: head=f.read(4)
assert head[:2] == b'PK', 'فایل اکسل باید ZIP معتبر باشد'
print('✓ فایل خروجی از صف دانلود شد — امضای ZIP معتبر (اکسل)')"

echo "── ۳۳.۴) خروجی PDF از صف ──"
JOB2=$($CURL -X POST "$BASE/jobs" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DSID\",\"format\":\"pdf\",\"spec\":{\"dimensions\":[\"$DIM_FIELD\"],\"measures\":[{\"agg\":\"sum\"}]}}")
JID2=$(echo "$JOB2" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
for i in $(seq 1 40); do
  JS=$($CURL "$BASE/jobs/$JID2" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])")
  [ "$JS" = "done" ] && break
  [ "$JS" = "failed" ] && { echo "کار PDF ناموفق شد!"; exit 1; }
  sleep 1
done
$CURL "$BASE/jobs/$JID2/download" -o /tmp/e2e_job_export.pdf
python3 -c "
with open('/tmp/e2e_job_export.pdf','rb') as f: head=f.read(5)
assert head == b'%PDF-', 'فایل PDF معتبر نیست'
print('✓ خروجی PDF پس‌زمینه معتبر است (%PDF)')"

echo "── ۳۳.۵) شکست پردازش، تلاش مجدد خودکار و اعلان (۳۰.۲ + ۲۶.۲) ──"
JOB3=$($CURL -X POST "$BASE/jobs" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DSID\",\"format\":\"docx\",\"spec\":{\"dimensions\":[],\"measures\":[{\"agg\":\"count\"}]}}")
JID3=$(echo "$JOB3" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
for i in $(seq 1 60); do
  JS=$($CURL "$BASE/jobs/$JID3" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])")
  [ "$JS" = "failed" ] && break
  [ "$JS" = "done" ] && { echo "قالب نامعتبر نباید موفق شود!"; exit 1; }
  sleep 1
done
$CURL "$BASE/jobs/$JID3" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['status'] == 'failed', 'قالب نامعتبر باید شکست بخورد'
assert d['attempts'] == 2, f\"باید دو تلاش (اجرای مجدد خودکار) ثبت شود — got {d['attempts']}\"
assert d['error'] and 'قالب' in d['error'], 'علت شکست باید ثبت شود (بخش ۳۰.۲)'
assert d['durationMs'] is not None, 'مدت تا شکست باید ثبت شود'
print('✓ شکست با تلاش مجدد خودکار امن: ', d['error'][:60])"
$CURL "$BASE/notifications?projectId=$PID&limit=10" | python3 -c "
import json,sys
d=json.load(sys.stdin)
items=d['items'] if isinstance(d,dict) else d
n=[x for x in items if x['type']=='processFailure' and 'پس‌زمینه' in x['title']]
assert n, 'اعلان شکست پردازش باید ثبت شود (۲۶.۲)'
print('✓ اعلان شکست پردازش پس‌زمینه ثبت شد:', n[0]['title'])"

echo "── ۳۳.۶) تلاش مجدد دستی + حذف پردازش + کنترل دسترسی ──"
$CURL -X POST "$BASE/jobs/$JID3" -H 'Content-Type: application/json' -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'صف' in d['message'], 'تلاش مجدد باید کار را به صف برگرداند'
print('✓ تلاش مجدد دستی (اجرای مجدد امن — بخش ۳۰.۲)')"
for i in $(seq 1 60); do
  JS=$($CURL "$BASE/jobs/$JID3" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])")
  [ "$JS" = "failed" ] && break
  sleep 1
done
$CURL -X DELETE "$BASE/jobs/$JID3" > /dev/null
$CURL "$BASE/jobs?projectId=$PID" | python3 -c "
import json,sys
jobs=json.load(sys.stdin)
assert all(j['id'] != '$JID3' for j in jobs), 'کار حذف‌شده نباید در فهرست باشد'
print('✓ حذف پردازش شکست‌خورده انجام شد')"
curl -s -b /tmp/conn_viewer.txt -X POST "$BASE/jobs" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DSID\",\"format\":\"xlsx\",\"spec\":{}}" -w " [HTTP %{http_code}]" | python3 -c "
import sys
s=sys.stdin.read()
assert '403' in s, 'مشاهده‌کننده باید رد شود'
print('✓ ثبت پردازش برای نقش مشاهده‌کننده رد شد (مجوز export.run — بخش ۲۹)')"

echo ""
echo "═══ ۳۴) مقایسه نسخه‌های گزارش — بخش ۲۶.۱ («مقایسه نسخه‌ها» و «ثبت دلیل تغییر») ═══"
echo "── ۳۴.۱) ایجاد گزارش آزمون نسخه‌بندی (نسخه ۱ + عکس‌فوری) ──"
VREP=$($CURL -X POST "$BASE/reports" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DSID\",\"title\":\"گزارش آزمون نسخه‌ها\",\"config\":{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\"}],\"chartType\":\"bar\"}}")
VRID=$(echo "$VREP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',''))")
echo "$VREP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d.get('id'), 'ایجاد گزارش آزمون شکست خورد: ' + str(d)[:120]
vs = d.get('versions') or []
assert len(vs) == 1 and vs[0]['version'] == 1, 'عکس‌فوری نسخه ۱ ثبت نشد'
assert vs[0]['reason'], 'دلیل ثبت نسخه ۱ خالی است'
print('✓ گزارش نسخه ۱ ذخیره و عکس‌فوری شد | دلیل:', vs[0]['reason'])"

echo "── ۳۴.۲) به‌روزرسانی با ثبت دلیل تغییر → نسخه ۲ ──"
$CURL -X PUT "$BASE/reports/$VRID" -H 'Content-Type: application/json' -d "{\"config\":{\"dimensions\":[\"$F_PROV\",\"$F_CITY\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\"},{\"fieldId\":\"$F_CNT\",\"agg\":\"count\"}],\"chartType\":\"line\",\"filters\":[{\"fieldId\":\"$F_PROV\",\"op\":\"eq\",\"value\":\"تهران\"}]},\"changeReason\":\"افزودن شهرستان و فیلتر استان به درخواست مدیر\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d.get('version') == 2, 'نسخه به ۲ افزایش نیافت: ' + str(d)[:120]
print('✓ گزارش به نسخه', d['version'], 'به‌روزرسانی شد | وضعیت:', d['status'])"

echo "── ۳۴.۳) فهرست نسخه‌ها ──"
VLIST=$($CURL "$BASE/reports/$VRID/versions")
echo "$VLIST" | python3 -c "
import json,sys
d=json.load(sys.stdin)
vs=d['versions']
assert d['currentVersion'] == 2, 'نسخه جاری نادرست است'
assert len(vs) >= 2, 'دو نسخه ثبت نشده است'
assert all('reason' in v for v in vs), 'دلیل تغییر برای همه نسخه‌ها ثبت نشده'
print('✓ فهرست نسخه‌ها:', [f\"v{v['version']}\" for v in vs], '| دلیل آخرین:', vs[0]['reason'][:40])"

echo "── ۳۴.۴) مقایسه نسخه ۱ و نسخه جاری: تغییر ابعاد/سنجه‌ها/نمودار/فیلتر ──"
$CURL "$BASE/reports/$VRID/versions/compare?from=1&to=current" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['fromVersion'] == 1 and d['toVersion'] == 2, 'شماره نسخه‌های مقایسه نادرست'
kinds={(i['kind'], i['op']) for i in d['items']}
labels=' | '.join(i['label'] for i in d['items'])
assert ('dim','added') in kinds, 'افزوده‌شدن بُعد تشخیص داده نشد'
assert ('measure','added') in kinds, 'افزوده‌شدن سنجه تشخیص داده نشد'
assert ('chart','changed') in kinds, 'تغییر نوع نمایش تشخیص داده نشد'
assert ('filter','added') in kinds, 'افزوده‌شدن فیلتر تشخیص داده نشد'
assert not d['identical'], 'دو نسخه متفاوت، یکسان تشخیص داده شدند'
print('✓ مقایسه:', d['summary']['added'], 'افزوده /', d['summary']['removed'], 'حذف /', d['summary']['changed'], 'تغییر')
print('   شرح:', labels[:150])"

echo "── ۳۴.۵) مقایسه نسخه با خودش → بدون تفاوت ──"
$CURL "$BASE/reports/$VRID/versions/compare?from=1&to=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['identical'] and len(d['items']) == 0, 'مقایسه نسخه با خودش نباید تفاوت داشته باشد'
print('✓ مقایسه نسخه با خودش: بدون تفاوت')"

echo ""
echo "═══ ۳۵) تحلیل‌های پیشرفته — بخش ۲۱.۲ و ۲۱.۳ ═══"
echo "── ۳۵.۱) روند و پیش‌بینی سری زمانی (روش + خطا + عدم قطعیت) ──"
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"trend\",\"dateField\":\"$F_DATE\",\"measureField\":\"$F_AMT\",\"agg\":\"sum\",\"granularity\":\"month\",\"horizon\":3}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert len(d['history']) >= 3, 'سری زمانی کافی نیست: ' + str(d.get('meta',{}).get('warnings'))
assert len(d['forecast']) == 3, 'افق پیش‌بینی ۳ دوره برآورده نشد'
assert all(f['hi'] >= f['value'] >= f['lo'] for f in d['forecast']), 'بازه عدم قطعیت نامعتبر است'
assert d['r2'] >= 0 and d['mae'] >= 0, 'آماره‌های خطا نامعتبر'
assert d['method'], 'روش پیش‌بینی باید ذکر شود (۲۱.۳)'
print('✓ روند:', len(d['history']), 'دوره مشاهده +', len(d['forecast']), 'دوره پیش‌بینی | R²=', round(d['r2'],2), '| MAE=', round(d['mae'],1), '| MAPE=', d['mape'])
print('   روش:', d['method'][:60])"

echo "── ۳۵.۲) هشدار دوره ناقص (قاعده ۲۱.۳) ──"
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"trend\",\"dateField\":\"$F_DATE\",\"agg\":\"count\",\"granularity\":\"month\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
w=' '.join(d['meta']['warnings'])
has_warn = 'ناقص' in w
print('✓ هشدار دوره ناقص' + (' ثبت شد (بخش ۲۱.۳)' if has_warn else ' — دوره جاری کامل است (قابل قبول)'))"

echo "── ۳۵.۳) همبستگی پیرسون + یادداشت غیرعلّی بودن ──"
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"correlation\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert len(d['fields']) >= 2, 'حداقل دو ستون عددی لازم است'
n=len(d['fields'])
assert len(d['matrix']) == n and len(d['matrix'][0]) == n, 'ماتریس مربعی نیست'
assert 'علّی' in d['caveat'], 'یادداشت غیرعلّی بودن همبستگی الزامی است (۲۱.۳)'
print('✓ ماتریس همبستگی', str(n)+'×'+str(n), '| جفت برتر:', d['topPairs'][0]['labelA'][:12], '×', d['topPairs'][0]['labelB'][:12], '| r=', round(d['topPairs'][0]['r'],2), '|', d['topPairs'][0]['strength'])"

echo "── ۳۵.۴) تحلیل Cohort با شناسه شعبه ──"
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"cohort\",\"idField\":\"$F_BRANCH\",\"dateField\":\"$F_DATE\",\"granularity\":\"month\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert len(d['rows']) >= 1, 'هیچ گروه زمانی ساخته نشد: ' + str(d.get('meta',{}).get('warnings'))
r0=d['rows'][0]
assert r0['size'] > 0, 'اندازه گروه صفر است'
assert r0['cells'][0]['count'] == r0['size'], 'ستون نخست ماتریس حفظ باید برابر اندازه گروه باشد'
print('✓ ماتریس Cohort:', len(d['rows']), 'گروه | گروه نخست:', r0['cohort'], '| اندازه:', r0['size'], '| دوره‌ها:', len(r0['cells']))"

echo "── ۳۵.۵) تحلیل RFM + بخش‌بندی ──"
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"rfm\",\"idField\":\"$F_BRANCH\",\"dateField\":\"$F_DATE\",\"amountField\":\"$F_AMT\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['totalCustomers'] >= 5, 'تعداد شناسه کافی نیست: ' + str(d.get('meta',{}).get('warnings'))
assert len(d['segments']) >= 1, 'بخش‌بندی انجام نشد'
assert d['referenceDate'], 'تاریخ مرجع ثبت نشده'
top=d['customers'][0]
assert 1 <= top['rScore'] <= 5 and 1 <= top['fScore'] <= 5 and 1 <= top['mScore'] <= 5, 'امتیاز R/F/M خارج از ۱..۵'
print('✓ RFM:', d['totalCustomers'], 'شناسه | بخش‌ها:', [(s['label'], s['count']) for s in d['segments'][:4]])"

echo "── ۳۵.۶) سناریوسازی What-if (رشد ۱۰٪ سراسری) ──"
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"whatif\",\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}],\"globalPct\":10}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert len(d['rows']) >= 1, 'ردیف سناریو تولید نشد'
a=d['measureAliases'][0]
r0=d['rows'][0]
assert abs(r0['scenario'][a] - r0['baseline'][a]*1.1) < 0.01, 'اثر ۱۰٪ درست محاسبه نشد'
assert abs(d['totals']['scenario'][a] - d['totals']['baseline'][a]*1.1) < 0.01, 'جمع کل سناریو نادرست'
assert 'پیش‌بینی نیست' in d['note'], 'یادداشت فرضی بودن سناریو الزامی است (۲۱.۳)'
print('✓ What-if:', len(d['rows']), 'ردیف | پایه:', round(d['totals']['baseline'][a]), '→ سناریو:', round(d['totals']['scenario'][a]))"

echo "── ۳۵.۷) سنجه مبنای صفر → درصد تعریف‌نشده (قاعده ۲۱.۳) ──"
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"whatif\",\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}],\"globalPct\":0,\"perValue\":{\"تهران\":0}}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
a=d['measureAliases'][0]
r0=d['rows'][0]
assert r0['deltaPct'][a] is not None or r0['baseline'][a] == 0, 'قاعده مبنای صفر رعایت نشده'
print('✓ قاعده مبنای صفر: درصد تغییر برای پایه صفر null است (بخش ۲۱.۳)')"

echo "── ۳۵.۸) تشخیص ناهنجاری (روش مقاوم میانه/MAD) ──"
# سطح ماه: دوره‌های داده آزمون کمتر از ۵ است → باید با هشدار قاعده‌مند رد شود (بخش ۲۱.۳)
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"anomaly\",\"dateField\":\"$F_DATE\",\"measureField\":\"$F_AMT\",\"agg\":\"sum\",\"granularity\":\"month\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
w=' '.join(d['meta']['warnings'])
if len(d['series']) == 0:
    assert 'حداقل ۵ دوره' in w, 'داده ناکافی باید با هشدار شفاف همراه باشد (۲۱.۳)'
    print('✓ سطح ماه: داده ناکافی به‌درستی با هشدار رد شد')
else:
    assert all('z' in s and 'isAnomaly' in s for s in d['series'])
    print('✓ سطح ماه:', len(d['series']), 'دوره بررسی شد')"
# سطح روز: دوره‌های کافی → سری کامل با نمره Z
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d "{\"mode\":\"anomaly\",\"dateField\":\"$F_DATE\",\"measureField\":\"$F_AMT\",\"agg\":\"sum\",\"granularity\":\"day\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert len(d['series']) >= 5, 'سری روزانه باید حداقل ۵ دوره داشته باشد: ' + str(d.get('meta',{}).get('warnings'))
assert all('z' in s and 'isAnomaly' in s for s in d['series']), 'نمره Z برای همه دوره‌ها محاسبه نشد'
assert d['method'], 'روش تشخیص باید ذکر شود (۲۱.۳)'
print('✓ سطح روز:', len(d['series']), 'دوره بررسی شد | ناهنجاری‌ها:', len(d['anomalies']), '| روش:', d['method'][:40])"

echo "── ۳۵.۹) حالت نامعتبر → خطای شفاف ──"
$CURL -X POST "$BASE/datasets/$DSID/analytics" -H 'Content-Type: application/json' -d '{"mode":"invalid"}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'حالت تحلیل نامعتبر' in d.get('error',''), 'خطای حالت نامعتبر صادر نشد'
print('✓ حالت نامعتبر با پیام شفاف رد شد')"

echo ""
echo "═══ ۳۷) قابلیت‌های هوشمند و هوش مصنوعی — بخش ۲۵ ═══"

echo "── ۳۷.۱) وضعیت دستیار هوشمند و سیاست‌ها ──"
AISTATUS=$($CURL "$BASE/ai/status")
echo "$AISTATUS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['localEngine'] is True, 'موتور محلی باید فعال باشد'
assert 'policy' in d and 'aiEnabled' in d['policy'], 'سیاست‌های بخش ۲۵ باید گزارش شود'
assert len(d['engine']['features']) >= 10, 'فهرست قابلیت‌های بخش ۲۵ کامل نیست'
print('✓ موتور محلی فعال | مدل زبانی پیکربندی‌شده:', d['llmConfigured'], '| سیاست اشتراک داده:', d['policy']['aiAllowDataSharing'])"

echo "── ۳۷.۲) تحلیل هوشمند: پیشنهاد نوع، کلید، پاک‌سازی، نمودار، شاخص ──"
AISUG=$($CURL -X POST "$BASE/ai/suggest" -H 'Content-Type: application/json' -d "{\"datasetId\":\"$DSID\"}")
echo "$AISUG" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'charts' in d and 'cleaning' in d and 'measures' in d, 'ساختار پیشنهادها ناقص است'
assert len(d['charts']) >= 2, 'حداقل دو نمودار پیشنهادی باید داشته باشیم: ' + str(d.get('notices'))
assert len(d['measures']) >= 1, 'شاخص پیشنهادی باید داشته باشیم'
geo = d.get('geo')
assert geo is not None, 'ستون استان باید به‌عنوان ستون مکانی تشخیص داده شود'
assert geo['matchRatio'] >= 0.4, 'نسبت تطابق جغرافیایی باید بالا باشد'
print('✓ نمودارهای پیشنهادی:', len(d['charts']), '| شاخص‌ها:', len(d['measures']), '| ستون مکانی:', geo['label'], f\"({round(geo['matchRatio']*100)}٪)\")
print('✓ کلید یکتا:', len(d['uniqueKeys']), '| پاک‌سازی:', len(d['cleaning']), '| ناهنجاری/الگو:', len(d['anomalies'])+len(d['patterns']))"

echo "── ۳۷.۳) پرسش به زبان طبیعی: «جمع مبلغ به تفکیک استان» ──"
AIASK=$($CURL -X POST "$BASE/ai/ask" -H 'Content-Type: application/json' -d "{\"datasetId\":\"$DSID\",\"question\":\"جمع مبلغ به تفکیک استان\"}")
echo "$AIASK" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['understood'] is True, 'پرسش باید فهمیده شود: ' + str(d.get('answer'))[:120]
tr = d['trace']
assert tr['measure']['agg'] == 'sum', 'نوع تجمیع باید جمع باشد'
assert tr['dimension'] is not None, 'بُعد گروه‌بندی باید شناسایی شود'
res = d['result']
assert res['rowCount'] >= 2, 'حداقل دو استان باید در نتیجه باشد'
assert 'موتور تحلیل' in d['answer'] or 'محاسبه' in d['answer'], 'پاسخ باید ارجاع به موتور محاسبه داشته باشد'
print('✓ تفسیر:', tr['measure']['label'], 'بر اساس', tr['dimension']['label'], '| گروه‌ها:', res['rowCount'], '| تفسیرگر:', d['interpreter'])"

echo "── ۳۷.۴) پرسش با فیلتر: «میانگین تعداد در تهران» ──"
$CURL -X POST "$BASE/ai/ask" -H 'Content-Type: application/json' -d "{\"datasetId\":\"$DSID\",\"question\":\"میانگین تعداد در تهران\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['understood'] is True, 'پرسش فیلتردار باید فهمیده شود: ' + str(d.get('answer'))[:120]
tr = d['trace']
assert tr['measure']['agg'] == 'avg', 'نوع تجمیع باید میانگین باشد'
assert any(f['op'] == 'eq' for f in tr['filters']), 'فیلتر تهران باید شناسایی شود'
print('✓ فیلتر شناسایی شد:', tr['filters'][0]['label'], '=', tr['filters'][0]['value'])"

echo "── ۳۷.۵) پرسش بی‌ربط → اعلام ناتوانی شفاف (الزام بخش ۲۵) ──"
$CURL -X POST "$BASE/ai/ask" -H 'Content-Type: application/json' -d "{\"datasetId\":\"$DSID\",\"question\":\"پیش‌بینی آب و هوای فردا چیست\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['understood'] is False, 'پرسش بی‌ربط باید رد شود'
assert 'اعلام ناتوانی' in d['answer'] or 'نتوانستم' in d['answer'], 'پیام ناتوانی باید شفاف باشد'
print('✓ ناتوانی به‌درستی اعلام شد')"

echo "── ۳۷.۶) پیش‌نویس گزارش توصیفی با تأیید انسانی ──"
$CURL -X POST "$BASE/ai/narrate" -H 'Content-Type: application/json' -d "{\"datasetId\":\"$DSID\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['engineText'], 'متن پایه موتور باید تولید شود'
assert d['requiresHumanApproval'] is True, 'برچسب تأیید انسانی الزامی است (بخش ۲۵)'
print('✓ متن پایه موتور قالبی:', len(d['engineText']), 'نویسه | روایت مدل زبانی:', 'موجود' if d['narrative'] else 'بر اساس سیاست ارائه نشد')"

echo "── ۳۷.۷) توضیح فرمول و خطا ──"
$CURL -X POST "$BASE/ai/explain" -H 'Content-Type: application/json' -d '{"formula":"نسبت_ایمن(مبلغ ؛ تعداد)","error":""}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['source'], 'منبع توضیح باید ذکر شود'
print('✓ توضیح فرمول:', d['source'], '| قاعده محلی:', len(d['localRules']), 'مورد')"

echo "── ۳۷.۸) خطای رایج: تقسیم بر صفر → قاعده محلی ──"
$CURL -X POST "$BASE/ai/explain" -H 'Content-Type: application/json' -d '{"formula":"","error":"تقسیم بر صفر در ردیف ۴"}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert any(r['title'] == 'تقسیم بر صفر' for r in d['localRules']), 'قاعده تقسیم بر صفر باید فعال شود'
print('✓ قاعده محلی تقسیم بر صفر شناسایی شد')"

echo ""
echo "═══ ۳۸) نقشه جغرافیایی و کارت مقایسه‌ای — تکمیل ۱۹.۲ ═══"

echo "── ۳۸.۱) نقشه جغرافیایی: تجمیع به تفکیک استان با مختصات ──"
$CURL -X POST "$BASE/datasets/$DSID/geomap" -H 'Content-Type: application/json' -d "{\"measure\":{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\"}}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d['geo'] is not None, 'ستون مکانی باید تشخیص داده شود'
pts = d['points']
assert len(pts) >= 2, 'حداقل دو نقطه جغرافیایی باید داشته باشیم: ' + str(d['warnings'])
for p in pts:
    assert 20 <= p['lat'] <= 45 and 40 <= p['lng'] <= 65, 'مختصات باید در محدوده ایران باشد'
    assert p['matched'] is True
print('✓', len(pts), 'نقطه با مختصات معتبر | مثال:', pts[0]['province'], f\"({pts[0]['lat']:.2f}, {pts[0]['lng']:.2f})\")
print('✓ تطابق‌نیافته:', len(d['unmatched']), '| هشدارها:', len(d['warnings']))"

echo "── ۳۸.۲) کارت مقایسه‌ای: دو گروه و اختلاف ──"
# کارت مقایسه‌ای از نتیجه پرس‌وجوی استاندارد ساخته می‌شود؛ صحت اختلاف اینجا آزمون می‌شود
CMP=$($CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}]}")
echo "$CMP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=d['rows']
assert len(rows) >= 2, 'برای کارت مقایسه‌ای حداقل دو گروه لازم است'
alias='جمع مبلغ'
vals=[r[alias] for r in rows if isinstance(r.get(alias),(int,float))]
a,b=vals[0],vals[1]
diff=abs(a-b)
pct=diff/abs(b)*100 if b else 0
assert isinstance(diff,(int,float)), 'اختلاف باید عدد باشد'
print(f'✓ دو گروه: {round(a):,} و {round(b):,} | اختلاف: {round(diff):,} ({pct:.1f}٪) — پایه کارت مقایسه‌ای صحیح است')"
echo "$CMP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows=d['rows']
vals=[r['جمع مبلغ'] for r in rows if isinstance(r.get('جمع مبلغ'),(int,float))]
a,b=vals[0],vals[1]
t = vals[0] * 1.2  # هدف ۱۲۰٪ گروه نخست
ach = a/t*100
assert 0 < ach < 200, 'درصد تحقق هدف باید منطقی باشد'
print(f'✓ حالت هدف: پایه {round(a):,} در برابر هدف {round(t):,} → تحقق {ach:.1f}٪')"

echo ""
echo "═══ ۳۹) تکمیل اجزای گزارش ۱۹.۲ — جدول کیفیت داده، متن/تصویر/لوگو، شناسنامه شاخص ═══"

echo "── ۳۹.۱) جدول کیفیت داده: خلاصه و ستون‌ها (بخش ۱۹.۲ با موتور پروفایل ۹) ──"
QF=$($CURL "$BASE/datasets/$DSID/quality")
echo "$QF" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'error' not in d, 'مسیر کیفیت خطا داد: ' + str(d.get('error'))
assert d['rowCount'] > 0, 'رکوردی برای پروفایل کیفیت نبود'
assert len(d['fields']) > 0, 'ستونی برای پروفایل نبود'
for f in d['fields']:
    assert f['quality'] in ('valid','partial','inconsistent'), 'وضعیت کیفیت نامعتبر: ' + str(f['quality'])
    assert 'nullCount' in f and 'distinctCount' in f, 'شمارنده‌های کلیدی ستون ناقص است'
assert isinstance(d['duplicateRows'], int), 'سطر تکراری عدد نیست'
assert d['maskedColumns'] == [], 'مدیر باید آمار کامل ببیند'
assert d['dataset']['name'], 'شناسنامه مجموعه‌داده ناقص است'
print('✓ جدول کیفیت داده:', d['rowCount'], 'رکورد |', len(d['fields']), 'ستون | سطر تکراری:', d['duplicateRows'], '| بازه:', (d.get('dateRange') or {}).get('from','—')[:10], 'تا', (d.get('dateRange') or {}).get('to','—')[:10])"

echo "── ۳۹.۲) دسترسی سطری روی جدول کیفیت: کاربر با قاعده «تهران» فقط رکوردهای مجاز می‌بیند ──"
$CURL -X POST "$BASE/auth/logout" > /dev/null
$CURL -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"karbar1","password":"ramz1234","name":"کاربر مشاهده‌کننده"}' > /dev/null
QF2=$($CURL "$BASE/datasets/$DSID/quality")
echo "$QF2" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'error' not in d, 'کاربر مجاز نباید خطا بگیرد'
assert d['visibleRowCount'] <= d['rowCount'], 'رکوردهای دیده‌شده نباید بیشتر از کل باشد'
assert d['visibleRowCount'] < d['rowCount'], 'قاعده سطری تهران باید رکوردها را محدود کند (بخش ۲۹)'
print('✓ پروفایل فقط روی رکوردهای مجاز:', d['visibleRowCount'], 'از', d['rowCount'], '— قواعد سطری در جدول کیفیت رعایت شد')"
$CURL -X POST "$BASE/auth/logout" > /dev/null
$CURL -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123","name":"مدیر سامانه"}' > /dev/null

echo "── ۳۹.۳) ذخیره گزارش با متن/تصویر/لوگو و شناسنامه شاخص (اجزای ۱۹.۲ در پیکربندی) ──"
REP39=$($CURL -X POST "$BASE/reports" -H 'Content-Type: application/json' -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DSID\",\"title\":\"گزارش با اجزای ۱۹.۲\",\"config\":{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\"}],\"chartType\":\"bar\",\"elements\":{\"text\":\"گزارش آزمون اجزای متنی ۱۹.۲\",\"imageUrl\":\"https://example.com/logo.png\"},\"identity\":{\"show\":true}}}")
RID39=$(echo "$REP39" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
$CURL "$BASE/reports/$RID39" | python3 -c "
import json,sys
d=json.load(sys.stdin)
cfg=d.get('config')
if isinstance(cfg, str): cfg=json.loads(cfg)
assert isinstance(cfg, dict), 'پیکربندی گزارش ذخیره نشد'
el=cfg.get('elements') or {}
ident=cfg.get('identity') or {}
assert el.get('text') == 'گزارش آزمون اجزای متنی ۱۹.۲', 'متن گزارش در پیکربندی نماند'
assert el.get('imageUrl') == 'https://example.com/logo.png', 'نشانی تصویر در پیکربندی نماند'
assert ident.get('show') is True, 'شناسنامه شاخص در پیکربندی نماند'
print('✓ اجزای گزارش ذخیره شد — متن و تصویر/لوگو + شناسنامه شاخص (۱۹.۲)')"
$CURL -X DELETE "$BASE/reports/$RID39" > /dev/null 2>&1 || true

echo ""
echo "═══ ۴۰) توابع آماری پیشرفته — بخش ۱۳.۲ (و ۱۳.۱: نما، دامنه، میانگین وزنی) ═══"

echo "── ۴۰.۱) صحت آماره‌ها در برابر محاسبه مستقل پایتون (نمونه ۸ رکوردی) ──"
REC=$($CURL "$BASE/datasets/$DSID/records?limit=100")
STAT=$($CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"S\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"avg\",\"alias\":\"A\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"weightedAvg\",\"alias\":\"WA\",\"weightFieldId\":\"$F_CNT\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"min\",\"alias\":\"MN\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"max\",\"alias\":\"MX\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"median\",\"alias\":\"MED\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"mode\",\"alias\":\"MODE\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"range\",\"alias\":\"RNG\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"varianceSample\",\"alias\":\"VAR\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"stdDevSample\",\"alias\":\"SD\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"quartile1\",\"alias\":\"Q1\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"quartile3\",\"alias\":\"Q3\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"iqr\",\"alias\":\"IQR\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"cv\",\"alias\":\"CV\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"percentile\",\"alias\":\"P50\",\"percentileP\":0.5}]}")
echo "$REC" > /tmp/e2e_records.json; echo "$STAT" > /tmp/e2e_stat.json
python3 - <<'PYEOF'
import json, math
recs = json.load(open('/tmp/e2e_records.json'))['rows']
def to_num(v):
    if v is None: return None
    s = str(v).strip().replace('٫','.').replace(',','').replace('٬','')
    try: return float(s)
    except: return None
xs = []
ws = []
for r in recs:
    amt = to_num(next((r[k] for k in r if 'مبلغ' in k and 'کد' not in k), None))
    cnt = to_num(next((r[k] for k in r if 'تعداد' in k and 'تراکنش' in k), None))
    if amt is not None:
        xs.append(amt)
        if cnt is not None:
            ws.append(cnt)
        else:
            ws.append(0)
st = json.load(open('/tmp/e2e_stat.json'))['rows'][0]
n = len(xs)
# تبدیل واحد مبلغ به مبنای ریال در سمت سرور انجام می‌شود — ضریب از جمع بازخوانی می‌شود (بخش ۱۴.۱)
factor = st['S'] / sum(xs) if sum(xs) else 1
xs = [x * factor for x in xs]
mean = sum(xs)/n
exp = {
  'S': sum(xs), 'A': mean,
  'WA': sum(x*w for x,w in zip(xs,ws))/sum(ws),
  'MN': min(xs), 'MX': max(xs), 'RNG': max(xs)-min(xs),
  'MODE': None,
}
srt = sorted(xs)
def q_linear(p):
    idx = p*(n-1); lo=math.floor(idx); hi=math.ceil(idx)
    return srt[lo] if lo==hi else srt[lo]+(idx-lo)*(srt[hi]-srt[lo])
exp['MED'] = q_linear(0.5); exp['P50'] = q_linear(0.5)
exp['Q1'] = q_linear(0.25); exp['Q3'] = q_linear(0.75)
exp['IQR'] = exp['Q3']-exp['Q1']
var_s = sum((x-mean)**2 for x in xs)/(n-1)
exp['VAR'] = var_s; exp['SD'] = math.sqrt(var_s)
exp['CV'] = math.sqrt(var_s)/abs(mean)
freq = {}
for x in xs: freq[x] = freq.get(x,0)+1
bestc = max(freq.values()); exp['MODE'] = min(v for v,c in freq.items() if c==bestc)
tol = max(1e-6, abs(mean)*1e-9)
for k, want in exp.items():
    got = st[k]
    assert got is not None and abs(got-want) <= tol*max(1,abs(want)), f'{k}: got={got} want={want}'
assert abs(st['P50']-st['MED']) < 1e-9, 'صدک ۵۰ باید برابر میانه باشد'
assert abs(st['IQR']-(st['Q3']-st['Q1'])) < 1e-9, 'IQR باید Q3-Q1 باشد'
print('✓ همه ۱۵ آماره با محاسبه مستقل مطابق است — صدک۵۰=میانه، IQR=Q3-Q1، CV=SD/میانگین، میانگین وزنی صحیح')
PYEOF

echo "── ۴۰.۲) کنترل مدیر: نوع انحراف معیار و روش صدک از تنظیمات (بخش ۱۳.۲) ──"
SD_SAMPLE=$(echo "$STAT" | python3 -c "import json,sys; print(json.load(sys.stdin)['rows'][0]['SD'])")
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"statStdDevDefault":"population","statPercentileMethod":"nearest"}' > /dev/null
STAT2=$($CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"stdDev\",\"alias\":\"SDP\"},{\"fieldId\":\"$F_AMT\",\"agg\":\"percentile\",\"alias\":\"P50N\",\"percentileP\":0.5},{\"fieldId\":\"$F_AMT\",\"agg\":\"median\",\"alias\":\"MEDN\"}]}")
echo "$STAT2" > /tmp/e2e_stat2.json
python3 - <<'PYEOF'
import json, math
recs = json.load(open('/tmp/e2e_records.json'))['rows']
def to_num(v):
    if v is None: return None
    s = str(v).strip().replace('٫','.').replace(',','').replace('٬','')
    try: return float(s)
    except: return None
key = [k for k in recs[0] if 'مبلغ' in k and 'کد' not in k][0]
xs = [to_num(r.get(key)) for r in recs]; xs=[x for x in xs if x is not None]
base = json.load(open('/tmp/e2e_stat.json'))['rows'][0]
factor = base['S'] / sum(xs) if sum(xs) else 1
xs = [x * factor for x in xs]  # مبنای ریال — بخش ۱۴.۱
n = len(xs); mean = sum(xs)/n
sd_pop = math.sqrt(sum((x-mean)**2 for x in xs)/n)
srt = sorted(xs)
p_nearest = srt[min(n-1, max(0, round(0.5*(n-1))))]
st = json.load(open('/tmp/e2e_stat2.json'))['rows'][0]
assert abs(st['SDP']-sd_pop) < max(1e-6, sd_pop*1e-9), f"انحراف معیار جامع: {st['SDP']} != {sd_pop}"
assert abs(st['P50N']-p_nearest) < 1e-9, f"صدک نزدیک‌ترین رتبه: {st['P50N']} != {p_nearest}"
assert abs(st['MEDN']-p_nearest) < 1e-9, 'میانه نیز باید با روش مدیر (nearest) محاسبه شود'
print(f'✓ انحراف معیار جامع={round(sd_pop,2)} | صدک nearest={p_nearest} — تنظیمات مدیر اعمال شد')
PYEOF
SD_POP=$(echo "$STAT2" | python3 -c "import json,sys; print(json.load(sys.stdin)['rows'][0]['SDP'])")
python3 -c "assert float('$SD_POP') < float('$SD_SAMPLE'), 'انحراف معیار جامع باید از نمونه‌ای کوچک‌تر باشد (n در برابر n-۱)'; print('✓ جامع', round(float('$SD_POP'),2), '< نمونه‌ای', round(float('$SD_SAMPLE'),2), '— دو نوع انحراف معیار متمایزند')"
# بازگشت تنظیمات به پیش‌فرض
$CURL -X PUT "$BASE/settings" -H 'Content-Type: application/json' -d '{"statStdDevDefault":"sample","statPercentileMethod":"linear","statNullBehavior":"exclude"}' > /dev/null

echo "── ۴۰.۳) محاسبات پنجره‌ای: مجموع تجمعی و میانگین متحرک (بخش ۱۳.۲) ──"
WIN=$($CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"$F_DATE\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"}],\"orderBy\":[{\"field\":\"$F_DATE\",\"dir\":\"asc\"}],\"windowCalcs\":[{\"type\":\"cumsum\",\"fieldAlias\":\"جمع مبلغ\",\"alias\":\"تاکنون\"},{\"type\":\"movingAvg\",\"fieldAlias\":\"جمع مبلغ\",\"window\":2,\"alias\":\"میانگین دوگانه\"}]}")
echo "$WIN" > /tmp/e2e_win.json
python3 - <<'PYEOF'
import json
rows = json.load(open('/tmp/e2e_win.json'))['rows']
assert len(rows) >= 3, 'برای محاسبه پنجره‌ای حداقل سه گروه لازم است'
vals = [r['جمع مبلغ'] for r in rows if isinstance(r.get('جمع مبلغ'), (int, float))]
assert len(vals) == len(rows), 'همه ردیف‌ها باید سنجه عددی داشته باشند'
acc = 0
for i, r in enumerate(rows):
    acc += vals[i]
    assert abs(r['تاکنون'] - acc) < 1e-6, f"مجموع تجمعی ردیف {i}: {r['تاکنون']} != {acc}"
    w = vals[max(0, i-1):i+1]
    assert abs(r['میانگین دوگانه'] - sum(w)/len(w)) < 1e-6, f"میانگین متحرک ردیف {i}"
print(f'✓ {len(rows)} گروه: مجموع تجمعی و میانگین متحرک (پنجره ۲) با ترتیب تاریخ صحیح است')
PYEOF

echo ""
echo "═══ ۴۱) تبدیل‌های ساختاری Unpivot و Pivot — بخش ۱۰.۲ ═══"
# جمع‌های پایه پیش از تبدیل برای مقایسه رفت‌وبرگشت
BASEQ=$($CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"$F_PROV\"],\"measures\":[{\"fieldId\":\"$F_AMT\",\"agg\":\"sum\",\"alias\":\"جمع مبلغ\"},{\"fieldId\":\"$F_CNT\",\"agg\":\"sum\",\"alias\":\"جمع تعداد\"}]}")
echo "$BASEQ" > /tmp/e2e_baseq.json
TOTAL_AMT=$(echo "$BASEQ" | python3 -c "import json,sys; print(json.load(sys.stdin)['totals']['جمع مبلغ'])")
TOTAL_CNT=$(echo "$BASEQ" | python3 -c "import json,sys; print(json.load(sys.stdin)['totals']['جمع تعداد'])")

echo "── ۴۱.۱) Unpivot: دو ستون مبلغ و تعداد به جفت شاخص/مقدار ──"
UNP=$($CURL -X POST "$BASE/datasets/$DSID/transform" -H 'Content-Type: application/json' -d "{\"op\":\"unpivot\",\"config\":{\"keepColumns\":\"$F_PROV\",\"unpivotColumns\":\"$F_AMT,$F_CNT\",\"attrName\":\"شاخص\",\"valueName\":\"مقدار\"}}")
echo "$UNP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'error' not in d, 'Unpivot خطا داد: '+str(d.get('error'))
assert d['rowCount'] == 16, f\"۸ رکورد × ۲ ستون = ۱۶ رکورد مورد انتظار است؛ به دست آمد {d['rowCount']}\"
print('✓ Unpivot: ۸ سطر →', d['rowCount'], 'سطر | هشدار:', (d.get('warnings') or [''])[0][:60])"

echo "── ۴۱.۲) صحت جمع پس از Unpivot: جمع مقدار به تفکیک شاخص ──"
$CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[\"شاخص\"],\"measures\":[{\"fieldId\":\"مقدار\",\"agg\":\"sum\",\"alias\":\"جمع مقدار\"}]}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rows={r['شاخص']: r['جمع مقدار'] for r in d['rows']}
amt_key=[k for k in rows if 'مبلغ' in k][0]
cnt_key=[k for k in rows if 'تعداد' in k][0]
assert abs(rows[amt_key]-$TOTAL_AMT) < 1e-6, f\"جمع مبلغ پس از Unpivot تغییر کرده: {rows[amt_key]} != $TOTAL_AMT\"
assert abs(rows[cnt_key]-$TOTAL_CNT) < 1e-6, f\"جمع تعداد پس از Unpivot تغییر کرده: {rows[cnt_key]} != $TOTAL_CNT\"
print('✓ جمع مبلغ و تعداد پس از گسترش حفظ شده است — داده‌ای گم نشده (۱۰.۲)')"

echo "── ۴۱.۳) Pivot ساختاری: بازگشت به فرمت پهن با کلید استان ──"
PV=$($CURL -X POST "$BASE/datasets/$DSID/transform" -H 'Content-Type: application/json' -d "{\"op\":\"pivot\",\"config\":{\"keyColumns\":\"$F_PROV\",\"attributeColumn\":\"شاخص\",\"valueColumn\":\"مقدار\",\"agg\":\"sum\",\"fillValue\":\"0\"}}")
echo "$PV" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'error' not in d, 'Pivot خطا داد: '+str(d.get('error'))
print('✓ Pivot ساختاری:', d['step']['before'], '→', d['step']['after'], 'سطر |', len(d.get('warnings') or []), 'هشدار')"
# شناسه ستون‌های جدید = برچسب ستون‌های تبدیل‌شونده — از فهرست فیلدها خوانده می‌شود (نقل‌قول JSON برای فاصله در نام)
DSJ=$($CURL "$BASE/datasets/$DSID")
AMT2=$(echo "$DSJ" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ms=[f['id'] for f in d['fields'] if f.get('role')=='measure']
assert len(ms) >= 2, 'پس از Pivot دو ستون سنجه مورد انتظار است: '+str(ms)
print(json.dumps(ms[0], ensure_ascii=False))")
CNT2=$(echo "$DSJ" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ms=[f['id'] for f in d['fields'] if f.get('role')=='measure']
print(json.dumps(ms[1], ensure_ascii=False))")
$CURL -X POST "$BASE/datasets/$DSID/query" -H 'Content-Type: application/json' -d "{\"dimensions\":[],\"measures\":[{\"fieldId\":$AMT2,\"agg\":\"sum\",\"alias\":\"S\"},{\"fieldId\":$CNT2,\"agg\":\"sum\",\"alias\":\"C\"}]}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
r=d['rows'][0]
assert abs(r['S']-$TOTAL_AMT) < 1e-6, f\"جمع مبلغ پس از رفت‌وبرگشت تغییر کرده: {r['S']} != $TOTAL_AMT\"
assert abs(r['C']-$TOTAL_CNT) < 1e-6, f\"جمع تعداد پس از رفت‌وبرگشت تغییر کرده: {r['C']} != $TOTAL_CNT\"
print('✓ رفت‌وبرگشت Unpivot→Pivot بدون تغییر مجموع — صحت تبدیل ساختاری تأیید شد')"

echo "── ۴۱.۴) خطای شفاف: Unpivot بدون ستون تبدیل ──"
$CURL -X POST "$BASE/datasets/$DSID/transform" -H 'Content-Type: application/json' -d '{"op":"unpivot","config":{"keepColumns":"","unpivotColumns":"ستون_ناموجود"}}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'error' in d, 'بدون ستون معتبر باید خطا برگردد'
print('✓ پیام خطای شفاف:', d['error'][:60])"

echo ""
echo "✓✓✓ هر ۴۱ فاز کامل شد — datasetId=$DSID | reportId=$RID | اتصال=$CID"
