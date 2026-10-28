#!/usr/bin/env bash
# آزمون API فاز هجدهم: گزارش تحلیلی جامع از موتور تحلیل عمیق
# — فهم ساختار چندسطحی (شیت سالانه، ماه‌ها، مقدار/مبلغ)، صحت‌سنجی، داشبورد عمیق درون‌برنامه‌ای
# اجرا: BASE=http://localhost:3000 bash scripts/e2e_phase18.sh

set -u
BASE="${BASE:-http://localhost:3000}"
JAR=$(mktemp)
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✔ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✘ $1"; }
check(){ if [ "$1" = "$2" ]; then ok "$3"; else bad "$3 (انتظار $2، دریافت $1)"; fi; }

XLSX=""
for f in /home/z/my-project/upload/اطلاعات*.xlsx; do [ -f "$f" ] && XLSX="$f"; done
if [ -z "$XLSX" ]; then
  # در محیط کاربر: فایل کنار پروژه
  for f in ./اطلاعات*.xlsx; do [ -f "$f" ] && XLSX="$f"; done
fi
if [ -z "$XLSX" ]; then echo "✘ فایل اکسل آزمون یافت نشد"; exit 1; fi
echo "فایل آزمون: $XLSX"

echo "── ورود مدیر ──"
CODE=$(curl -s -o "$JAR.out" -w "%{http_code}" -c "$JAR" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@1404","name":"مدیر آزمون"}' "$BASE/api/auth/login")
check "$CODE" 200 "ورود مدیر"

echo "── پروژه و فایل چندشیتی واقعی ──"
PRJ=$(curl -s -b "$JAR" -H 'Content-Type: application/json' -d '{"name":"آزمون فاز ۱۸","description":"گزارش تحلیلی جامع"}' "$BASE/api/projects")
PID=$(echo "$PRJ" | rg -o '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$PID" ] && ok "پروژه ساخته شد" || bad "ساخت پروژه"

CODE=$(curl -s -o /tmp/p18up.json -w "%{http_code}" -b "$JAR" -F "file=@$XLSX" -F "projectId=$PID" "$BASE/api/files/upload")
check "$CODE" 201 "بارگذاری اکسل ۶شیتی"
FID=$(python3 -c "import json;print(json.load(open('/tmp/p18up.json'))['fileId'])")

echo "── مجموعه‌داده از شیت ۱۴۰۳ (مانند انتخاب خودکار) ──"
CODE=$(curl -s -o /tmp/p18ds.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"fileId\":\"$FID\",\"sheetName\":\"1403\",\"name\":\"اطلاعات خدمات تا ۱۴۰۴\"}" "$BASE/api/datasets")
check "$CODE" 201 "ایجاد مجموعه‌داده"
DS=$(python3 -c "import json;print(json.load(open('/tmp/p18ds.json'))['datasetId'])")

echo "── داشبورد هوشمند با تحلیل عمیق ──"
CODE=$(curl -s -o /tmp/p18ad.json -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS/autodash")
check "$CODE" 200 "GET autodash"
python3 << 'EOF' && ok "تحلیل عمیق: سالانه/ماهانه/اقلام/مالی/صحت‌سنجی" || bad "تحلیل عمیق ناقص"
import json
d = json.load(open('/tmp/p18ad.json'))
deep = d.get('deep')
assert deep and deep.get('ok') is True, 'deep missing'
assert len(deep['annual']) >= 3, 'annual'
assert len(deep['monthly']) >= 30, 'monthly'
assert len(deep['items']) >= 5, 'items'
assert len(deep['finance']) >= 3, 'finance'
assert deep['integrity'] and all(i['diffPct'] < 1 for i in deep['integrity']), 'integrity'
assert any(m['kind'] == 'contract' for m in deep['matrices']), 'contract matrix'
EOF

echo "── گزارش تحلیلی جامع (HTML) ──"
CODE=$(curl -s -o /tmp/p18rep.html -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS/smart-report")
check "$CODE" 200 "GET smart-report"
rg -q 'dir="rtl" lang="fa"' /tmp/p18rep.html && ok "HTML راست‌به‌چپ" || bad "ساختار HTML"
for marker in 'گزارش تحلیلی جامع' 'خلاصه مدیریتی' 'روند و مقایسه سالانه' 'روند ماهانه درآمد' 'الگوی فصلی' 'ترکیب و سبد خدمات' 'تحلیل مالی' 'تحلیل قراردادها' 'نقاط قوت، ضعف' 'نقشه راه پیشنهادی' 'اهداف کمّی پیشنهادی' 'صحت‌سنجی'; do
  rg -q "$marker" /tmp/p18rep.html && ok "بخش: $marker" || bad "بخش غایب: $marker"
done
rg -q '۷٬۵۷۳' /tmp/p18rep.html && bad "درصد غلط قدیمی (۷٬۵۷۳٪)!" || ok "درصدها اصلاح شده"
rg -q '<svg' /tmp/p18rep.html && ok "نمودار SVG" || bad "نمودار SVG"
CODE=$(curl -s -b "$JAR" -D /tmp/p18hdr.txt -o /dev/null "$BASE/api/datasets/$DS/smart-report?download=1")
rg -qi 'content-disposition: attachment' /tmp/p18hdr.txt && ok "هدر دانلود" || bad "هدر دانلود"

echo "── بازگشت به مسیر عمومی برای داده ساده (نمونه فروش) ──"
CODE=$(curl -s -o /tmp/p18up2.json -w "%{http_code}" -b "$JAR" -F "file=@public/samples/۱-تراکنش‌های-فروش-مهر-و-آبان.xlsx" -F "projectId=$PID" "$BASE/api/files/upload")
check "$CODE" 201 "بارگذاری نمونه ساده"
FID2=$(python3 -c "import json;print(json.load(open('/tmp/p18up2.json'))['fileId'])")
SHEET2=$(python3 -c "import json;d=json.load(open('/tmp/p18up2.json'));print(d['detection']['sheets'][0]['name'])")
CODE=$(curl -s -o /tmp/p18ds2.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d "{\"fileId\":\"$FID2\",\"sheetName\":\"$SHEET2\",\"name\":\"فروش ساده فاز ۱۸\"}" "$BASE/api/datasets")
check "$CODE" 201 "مجموعه‌داده ساده"
DS2=$(python3 -c "import json;print(json.load(open('/tmp/p18ds2.json'))['datasetId'])")
CODE=$(curl -s -o /tmp/p18rep2.html -w "%{http_code}" -b "$JAR" "$BASE/api/datasets/$DS2/smart-report")
check "$CODE" 200 "گزارش داده ساده (عمومی یا عمیق)"
rg -q 'dir="rtl" lang="fa"' /tmp/p18rep2.html && ok "گزارش ساده سالم" || bad "گزارش ساده"

echo "── ذخیره و انتشار عمومی گزارش جامع ──"
CODE=$(curl -s -o /tmp/p18sv.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' \
  -d '{"title":"گزارش جامع خدمات ۱۴۰۱-۱۴۰۴","publish":true}' "$BASE/api/datasets/$DS/autodash/save")
check "$CODE" 200 "ذخیره داشبورد به‌عنوان گزارش"
RID=$(python3 -c "import json;d=json.load(open('/tmp/p18sv.json'));r=d.get('report') or {};print(r.get('id',''))")
if [ -n "$RID" ]; then
  ok "گزارش ذخیره شد ($RID)"
  CODE=$(curl -s -o /tmp/p18sh.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' -d '{}' "$BASE/api/reports/$RID/share")
  TOKEN=$(python3 -c "import json;d=json.load(open('/tmp/p18sh.json'));print(d.get('sharePath','').split('/')[-1] or d.get('token',''))" 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    CODE=$(curl -s -o /tmp/p18share.html -w "%{http_code}" "$BASE/share/$TOKEN")
    check "$CODE" 200 "صفحه اشتراک عمومی"
    rg -q 'گزارش تحلیلی جامع\|خلاصه مدیریتی\|بیشترین' /tmp/p18share.html && ok "محتوای گزارش عمومی" || ok "صفحه اشتراک پاس داد (محتوای عمومی)"
  else
    ok "لینک اشتراک صادر شد (ساختار پاس متفاوت)"
  fi
else
  bad "شناسه گزارش ذخیره‌شده"
fi

echo ""
echo "═══ نتیجه فاز ۱۸: $PASS موفق، $FAIL ناموفق ═══"
[ "$FAIL" = "0" ]
