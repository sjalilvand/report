#!/usr/bin/env bash
# آزمون API ویژگی‌های فاز پانزدهم: تجمیع چند فایل هم‌فرم + قالب‌های هوشمند
# اجرا: BASE=http://localhost:3015 bash scripts/e2e_phase15.sh

set -u
BASE="${BASE:-http://localhost:3015}"
JAR=$(mktemp)
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✔ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✘ $1"; }
check(){ if [ "$1" = "$2" ]; then ok "$3"; else bad "$3 (انتظار $2، دریافت $1)"; fi; }

echo "── ورود مدیر ──"
CODE=$(curl -s -o "$JAR.out" -w "%{http_code}" -c "$JAR" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@1404","name":"مدیر آزمون"}' "$BASE/api/auth/login")
check "$CODE" 200 "ورود مدیر"
U=$(curl -s -b "$JAR" "$BASE/api/auth/me")
echo "$U" | rg -q '"username":"admin"' && ok "نشست فعال است" || bad "نشست فعال نیست"

echo "── ساخت پروژه ──"
PRJ=$(curl -s -b "$JAR" -H 'Content-Type: application/json' -d '{"name":"آزمون فاز ۱۵","description":"آزمون تجمیع و قالب هوشمند"}' "$BASE/api/projects")
PID=$(echo "$PRJ" | rg -o '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$PID" ] && ok "پروژه ساخته شد ($PID)" || bad "ساخت پروژه"

echo "── بارگذاری ۴ فایل نمونه ──"
UP="public/samples/نمونه-فیش-حقوقی-مهر.xlsx public/samples/نمونه-فیش-حقوقی-آبان.xlsx public/samples/نمونه-صورت-مالی.xlsx public/samples/نمونه-سود-محصولات.xlsx"
i=0
for F in $UP; do
  i=$((i+1))
  CODE=$(curl -s -o /tmp/up$i.json -w "%{http_code}" -b "$JAR" -F "file=@$F" -F "projectId=$PID" "$BASE/api/files/upload")
  check "$CODE" 201 "بارگذاری $(basename "$F")"
done
FID1=$(python3 -c "import json;print(json.load(open('/tmp/up1.json'))['fileId'])")
FID2=$(python3 -c "import json;print(json.load(open('/tmp/up2.json'))['fileId'])")
FID3=$(python3 -c "import json;print(json.load(open('/tmp/up3.json'))['fileId'])")
FID4=$(python3 -c "import json;print(json.load(open('/tmp/up4.json'))['fileId'])")

echo "── تجمیع دو فیش حقوقی ──"
CODE=$(curl -s -o /tmp/dry.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PID\",\"dryRun\":true,\"items\":[{\"fileId\":\"$FID1\",\"sheetName\":\"فیش حقوقی\"},{\"fileId\":\"$FID2\",\"sheetName\":\"فیش حقوقی\"}]}" "$BASE/api/files/merge")
check "$CODE" 200 "بررسی ساختار (dryRun)"
python3 -c "import json;d=json.load(open('/tmp/dry.json'));exit(0 if d['allMatch'] and d['totalRows']==24 else 1)" \
  && ok "هم‌فرم بودن تأیید شد (۲۴ رکورد)" || bad "هم‌فرم بودن: $(python3 -c "import json;d=json.load(open('/tmp/dry.json'));print(d['allMatch'],d.get('totalRows'))")"

CODE=$(curl -s -o /tmp/mrg.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PID\",\"dryRun\":false,\"name\":\"تجمیع فیش حقوقی مهر و آبان\",\"items\":[{\"fileId\":\"$FID1\",\"sheetName\":\"فیش حقوقی\"},{\"fileId\":\"$FID2\",\"sheetName\":\"فیش حقوقی\"}]}" "$BASE/api/files/merge")
check "$CODE" 201 "اجرای تجمیع"
DS1=$(python3 -c "import json;print(json.load(open('/tmp/mrg.json'))['datasetId'])")
python3 -c "import json;d=json.load(open('/tmp/mrg.json'));exit(0 if d['rowCount']==24 and d['fieldCount']==13 else 1)" \
  && ok "۲۴ رکورد و ۱۳ ستون (۱۲ + فایل مبدأ)" || bad "اعداد تجمیع: $(python3 -c "import json;d=json.load(open('/tmp/mrg.json'));print(d)")"

echo "── مجموعه‌داده‌های عادی از فایل‌های دیگر ──"
for N in 3 4; do
  CODE=$(curl -s -o /tmp/ds$N.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
    -d "{\"fileId\":\"$(python3 -c "import json;print(json.load(open('/tmp/up$N.json'))['fileId'])")\",\"sheetName\":\"$([ $N = 3 ] && echo 'صورت سود و زیان' || echo 'سود محصولات')\",\"name\":\"آزمون $N\"}" "$BASE/api/datasets")
  check "$CODE" 201 "ایجاد مجموعه‌داده $N"
done
DS3=$(python3 -c "import json;print(json.load(open('/tmp/ds3.json'))['datasetId'])")
DS4=$(python3 -c "import json;print(json.load(open('/tmp/ds4.json'))['datasetId'])")

echo "── قالب هوشمند: فیش حقوقی (تجمیع) ──"
CODE=$(curl -s -o /tmp/sm1.json -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS1/smart")
check "$CODE" 200 "GET smart (تجمیع فیش)"
T=$(python3 -c "import json;print(json.load(open('/tmp/sm1.json')).get('template'))")
check "$T" payslip "تشخیص قالب فیش حقوقی"
python3 -c "
import json;d=json.load(open('/tmp/sm1.json'))['analysis']
assert d['kpis'] and d['report'], 'kpi/report'
assert any(k['id']=='ps-net' for k in d['kpis']), 'ps-net'
print('ok')" && ok "تحلیل فیش: KPI و گزارش ساخته شد" || bad "تحلیل فیش"

echo "── قالب هوشمند: صورت مالی ──"
CODE=$(curl -s -o /tmp/sm3.json -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS3/smart")
T=$(python3 -c "import json;print(json.load(open('/tmp/sm3.json')).get('template'))")
check "$T" financial "تشخیص قالب صورت مالی (حالت طولی)"
python3 -c "
import json;d=json.load(open('/tmp/sm3.json'))['analysis']
kp={k['id']:k['value'] for k in d['kpis']}
assert abs(kp.get('fin-sales',0)-15650000000000)<1, 'sales کل سه سال'
assert abs(kp.get('fin-net',0)-2020450000000)<1, 'net کل سه سال'
assert d['tables'], 'table'
print('ok')" && ok "اقلام و حاشیه‌های صورت مالی درست است" || bad "تحلیل صورت مالی"

echo "── قالب هوشمند: سود محصولات ──"
CODE=$(curl -s -o /tmp/sm4.json -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS4/smart")
T=$(python3 -c "import json;print(json.load(open('/tmp/sm4.json')).get('template'))")
check "$T" profit "تشخیص قالب سود"
python3 -c "
import json;d=json.load(open('/tmp/sm4.json'))['analysis']
kp={k['id']:k['value'] for k in d['kpis']}
assert kp.get('pr-profit',0)>0 and kp.get('pr-margin',0)>0
assert d['charts'] and d['tables']
print('ok')" && ok "سود، حاشیه و نمودارها ساخته شد" || bad "تحلیل سود"

echo "── داشبورد خودکار روی داده تجمیع‌شده ──"
CODE=$(curl -s -o /tmp/ad.json -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS1/autodash")
check "$CODE" 200 "GET autodash (تجمیع)"
python3 -c "
import json;d=json.load(open('/tmp/ad.json'))['raw']
assert d['rowCount']==24
assert len(d['breakdowns'])>=1
print('ok')" && ok "داشبورد خودکار روی ۲۴ رکورد تجمیعی" || bad "داشبورد تجمیع"

echo "── مخفی‌سازی تحلیل تخصصی (چیدمان) ──"
CODE=$(curl -s -o /tmp/ly.json -w "%{http_code}" -b "$JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"layout":{"hiddenTemplates":["payslip"]}}' "$BASE/api/datasets/$DS1/autodash")
check "$CODE" 200 "ذخیره hiddenTemplates"
curl -s -b "$JAR" "$BASE/api/datasets/$DS1/autodash" | python3 -c "
import json,sys;d=json.load(sys.stdin)
assert d['layout'] and d['layout'].get('hiddenTemplates')==['payslip']
print('ok')" && ok "چیدمان قالب مخفی ذخیره شد" || bad "ذخیره چیدمان"

echo
echo "══ نتیجه: $PASS موفق، $FAIL ناموفق ══"
[ "$FAIL" = 0 ]
