#!/usr/bin/env bash
# آزمون API ویژگی‌های فاز شانزدهم: گزارش هوشمند مستقل + ذخیره/انتشار داشبورد هوشمند + لینک عمومی
# اجرا: BASE=http://localhost:3000 bash scripts/e2e_phase16.sh

set -u
BASE="${BASE:-http://localhost:3000}"
JAR=$(mktemp)
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✔ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✘ $1"; }
check(){ if [ "$1" = "$2" ]; then ok "$3"; else bad "$3 (انتظار $2، دریافت $1)"; fi; }

echo "── ورود مدیر ──"
CODE=$(curl -s -o "$JAR.out" -w "%{http_code}" -c "$JAR" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@1404","name":"مدیر آزمون"}' "$BASE/api/auth/login")
check "$CODE" 200 "ورود مدیر"

echo "── ساخت پروژه ──"
PRJ=$(curl -s -b "$JAR" -H 'Content-Type: application/json' -d '{"name":"آزمون فاز ۱۶","description":"گزارش هوشمند، ذخیره و انتشار"}' "$BASE/api/projects")
PID=$(echo "$PRJ" | rg -o '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$PID" ] && ok "پروژه ساخته شد ($PID)" || bad "ساخت پروژه"

echo "── بارگذاری و ساخت مجموعه‌داده فروش ──"
CODE=$(curl -s -o /tmp/p16up.json -w "%{http_code}" -b "$JAR" -F "file=@public/samples/۱-تراکنش‌های-فروش-مهر-و-آبان.xlsx" -F "projectId=$PID" "$BASE/api/files/upload")
check "$CODE" 201 "بارگذاری فایل فروش"
FID=$(python3 -c "import json;print(json.load(open('/tmp/p16up.json'))['fileId'])")
SHEET=$(python3 -c "import json;d=json.load(open('/tmp/p16up.json'));print(d['detection']['sheets'][0]['name'])")
CODE=$(curl -s -o /tmp/p16ds.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"fileId\":\"$FID\",\"sheetName\":\"$SHEET\",\"name\":\"فروش مهر و آبان (فاز ۱۶)\"}" "$BASE/api/datasets")
check "$CODE" 201 "ایجاد مجموعه‌داده"
DS=$(python3 -c "import json;print(json.load(open('/tmp/p16ds.json'))['datasetId'])")
[ -n "$DS" ] && ok "مجموعه‌داده ($DS)" || bad "شناسه مجموعه‌داده"

echo "── داشبورد هوشمند ──"
CODE=$(curl -s -o /tmp/p16ad.json -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS/autodash")
check "$CODE" 200 "GET autodash"
python3 -c "import json;d=json.load(open('/tmp/p16ad.json'));exit(0 if len(d['dashboard']['kpis'])>0 and d['dataVersion']>=1 and d['columnCount']>0 else 1)" \
  && ok "کارت شاخص + نسخه داده + تعداد ستون" || bad "ساختار داشبورد"

echo "── گزارش هوشمند مستقل (HTML) ──"
CODE=$(curl -s -o /tmp/p16rep.html -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS/smart-report")
check "$CODE" 200 "GET smart-report"
rg -q 'dir="rtl" lang="fa"' /tmp/p16rep.html && ok "HTML راست‌به‌چپ فارسی" || bad "ساختار HTML"
rg -q 'کارت‌های شاخص کلیدی' /tmp/p16rep.html && ok "بخش کارت شاخص" || bad "بخش کارت شاخص"
rg -q 'گزارش هوشمند' /tmp/p16rep.html && ok "عنوان گزارش هوشمند" || bad "عنوان گزارش"
CODE=$(curl -s -o /tmp/p16rep2.html -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS/smart-report?download=1")
curl -s -b "$JAR" -D /tmp/p16hdr.txt -o /dev/null "$BASE/api/datasets/$DS/smart-report?download=1"
rg -qi 'content-disposition: attachment' /tmp/p16hdr.txt && ok "هدر دانلود (attachment)" || bad "هدر دانلود"

echo "── ذخیره داشبورد به‌عنوان گزارش (انتشار فوری) ──"
CODE=$(curl -s -o /tmp/p16save.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PID\",\"title\":\"گزارش هوشمند فروش\",\"publish\":true}" "$BASE/api/datasets/$DS/autodash/save")
check "$CODE" 200 "ذخیره + انتشار فوری"
RID=$(python3 -c "import json;print(json.load(open('/tmp/p16save.json'))['report']['id'])")
python3 -c "import json;d=json.load(open('/tmp/p16save.json'));exit(0 if d['status']=='published' and d['created'] else 1)" \
  && ok "وضعیت منتشرشده + گزارش جدید" || bad "وضعیت: $(python3 -c "import json;print(json.load(open('/tmp/p16save.json')).get('status'))")"

echo "── ذخیره دوباره → نسخه ۲ ──"
CODE=$(curl -s -o /tmp/p16save2.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PID\",\"title\":\"گزارش هوشمند فروش\",\"publish\":true}" "$BASE/api/datasets/$DS/autodash/save")
python3 -c "import json;d=json.load(open('/tmp/p16save2.json'));exit(0 if d['report']['version']==2 and not d['created'] else 1)" \
  && ok "نسخه‌بندی: نسخه ۲ ثبت شد (همان گزارش)" || bad "نسخه‌بندی: $(python3 -c "import json;print(json.load(open('/tmp/p16save2.json'))['report']['version'])")"

echo "── لینک عمومی ──"
CODE=$(curl -s -o /tmp/p16share.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' -d '{"enabled":true}' "$BASE/api/reports/$RID/share")
check "$CODE" 200 "صدور لینک عمومی"
SHARE=$(python3 -c "import json;print(json.load(open('/tmp/p16share.json'))['sharePath'])")
[ -n "$SHARE" ] && ok "مسیر اشتراک: $SHARE" || bad "توکن اشتراک"
# دسترسی بدون کوکی (بدون ورود) — صفحه عمومی باید کار کند
CODE=$(curl -s -o /tmp/p16pub.html -w "%{http_code}" "$BASE$SHARE")
check "$CODE" 200 "مشاهده عمومی بدون ورود"
rg -q 'گزارش هوشمند فروش' /tmp/p16pub.html && ok "محتوای گزارش در صفحه عمومی" || bad "محتوای صفحه عمومی"
rg -q 'لینک عمومی' /tmp/p16pub.html && ok "پانوشت اشتراک عمومی" || bad "پانوشت اشتراک"
# توکن نامعتبر
CODE=$(curl -s -o /tmp/p16bad.html -w "%{http_code}" "$BASE/share/invalid000000000000000000000000")
rg -q 'گزارش در دسترس نیست' /tmp/p16bad.html && ok "توکن نامعتبر → پیام عدم دسترسی" || bad "توکن نامعتبر"

echo "── گزارش طراح‌گزارش: انتشار گردش کاری + لینک عمومی ──"
# فیلدها برای پیکربندی گزارش (از جزئیات مجموعه‌داده)
curl -s -b "$JAR" -o /tmp/p16flds.json "$BASE/api/datasets/$DS"
DIM=$(python3 -c "
import json
d=json.load(open('/tmp/p16flds.json'))
fs=d['fields']
dim=[f for f in fs if f['type'] in ('text','category','geo','boolean')]
ms=[f for f in fs if f['type'] in ('amount','integer','decimal')]
print(dim[0]['id'] if dim else '', ms[0]['id'] if ms else '', ms[0]['label'] if ms else '')")
D1=$(echo "$DIM" | cut -d' ' -f1); M1=$(echo "$DIM" | cut -d' ' -f2); M1L=$(echo "$DIM" | cut -d' ' -f3)
CODE=$(curl -s -o /tmp/p16br.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PID\",\"datasetId\":\"$DS\",\"title\":\"گزارش فروش به تفکیک\",\"config\":{\"dimensions\":[\"$D1\"],\"measures\":[{\"fieldId\":\"$M1\",\"agg\":\"sum\"}],\"chartType\":\"bar\"}}" "$BASE/api/reports")
check "$CODE" 201 "ذخیره گزارش طراح‌گزارش"
RID2=$(python3 -c "import json;print(json.load(open('/tmp/p16br.json'))['id'])")
# لینک عمومی روی پیش‌نویس باید رد شود
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' -d '{"enabled":true}' "$BASE/api/reports/$RID2/share")
check "$CODE" 400 "لینک عمومی روی پیش‌نویس رد می‌شود"
# گردش کار کامل
for A in submit approve publish; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' -d "{\"action\":\"$A\"}" "$BASE/api/reports/$RID2/status")
  check "$CODE" 200 "گردش کار: $A"
done
CODE=$(curl -s -o /tmp/p16share2.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' -d '{"enabled":true}' "$BASE/api/reports/$RID2/share")
check "$CODE" 200 "صدور لینک برای گزارش منتشرشده"
SHARE2=$(python3 -c "import json;print(json.load(open('/tmp/p16share2.json'))['sharePath'])")
CODE=$(curl -s -o /tmp/p16pub2.html -w "%{http_code}" "$BASE$SHARE2")
rg -q 'گزارش فروش به تفکیک' /tmp/p16pub2.html && ok "صفحه عمومی گزارش طراح‌گزارش (جدول)" || bad "صفحه عمومی طراح‌گزارش"
# لغو اشتراک
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' -d '{"enabled":false}' "$BASE/api/reports/$RID2/share")
check "$CODE" 200 "لغو لینک عمومی"
CODE=$(curl -s "$BASE$SHARE2" | rg -q 'گزارش در دسترس نیست' && echo 1 || echo 0)
[ "$CODE" = "1" ] && ok "پس از لغو، لینک غیرفعال شد" || bad "لغو اشتراک اثر نکرد"

echo "── شروع سریع گزارش‌ساز (query پیش‌فرض‌های شروع سریع) ──"
CODE=$(curl -s -o /tmp/p16q.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"dimensions\":[\"$D1\"],\"measures\":[{\"fieldId\":\"$M1\",\"agg\":\"sum\",\"alias\":\"جمع $M1L\"}],\"filters\":[]}" "$BASE/api/datasets/$DS/query")
check "$CODE" 200 "اجرای پرس‌وجوی پیش‌فرض شروع سریع"
python3 -c "import json;d=json.load(open('/tmp/p16q.json'));exit(0 if len(d['rows'])>0 else 1)" && ok "ردیف‌های تجمیع بازگشت" || bad "خروجی پرس‌وجو"

echo "── پاک‌سازی ──"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X DELETE "$BASE/api/projects/$PID")
check "$CODE" 200 "حذف پروژه آزمون"

echo ""
echo "══════════════════════════════"
echo "نتیجه: $PASS موفق، $FAIL ناموفق"
[ "$FAIL" = "0" ] && echo "همه آزمون‌های فاز ۱۶ سبز هستند ✔" || exit 1
