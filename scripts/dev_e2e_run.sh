#!/bin/bash
# اجرای یکپارچه: راه‌اندازی سرور آزمون با distDir ایزوله → اجرای کامل e2e → توقف سرور
# نکته: distDir ایزوله (.next-test) برای جلوگیری از تداخل قفل .next/dev با سرور پلتفرم
set -u
cd /home/z/my-project

export NEXT_DIST_DIR=.next-test
PORT=3000
LOG=/tmp/devserver.log

# پاکسازی نمونه قبلی احتمالی
pkill -f "next dev -p $PORT" 2>/dev/null && sleep 2

echo "▶ راه‌اندازی سرور آزمون روی پورت $PORT (distDir=$NEXT_DIST_DIR)…"
setsid nohup npx next dev -p $PORT > $LOG 2>&1 < /dev/null &
SERVER_PID=$!

READY=0
for i in $(seq 1 60); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/health" --max-time 5 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then READY=1; echo "✓ سرور آماده شد (${i}x2s)"; break; fi
done
if [ "$READY" != "1" ]; then
  echo "✗ سرور آماده نشد — آخر ۳۰ خط لاگ:"; tail -30 $LOG; exit 1
fi

echo ""
echo "▶ اجرای آزمون e2e (۳۶ فاز)…"
E2E_BASE="http://localhost:$PORT/api" bash scripts/e2e_test.sh
E2E_CODE=$?

echo ""
if [ $E2E_CODE -eq 0 ]; then
  echo "✓✓✓ نتیجه نهایی: موفق"
else
  echo "✗ نتیجه نهایی: شکست (کد $E2E_CODE) — آخر ۴۰ خط لاگ سرور:"
  tail -40 $LOG | grep -vE "prisma:query" | tail -20
fi

# توقف سرور آزمون
pkill -f "next dev -p $PORT" 2>/dev/null
pkill -f "next-server.*" 2>/dev/null
sleep 1
exit $E2E_CODE
