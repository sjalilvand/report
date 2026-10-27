# =============================================================
#  سکوی هوشمند گزارش‌ساز — اجرای سریع (پس از نصب اولیه)
# -------------------------------------------------------------
#  کاربرد: وقتی پروژه را با setup-and-run.ps1 نصب کرده‌اید،
#  برای اجراهای بعدی کافی است همین فایل را در پوشه پروژه اجرا کنید:
#     .\run-report.ps1
#  powershell -ExecutionPolicy Bypass -File .\run-report.ps1
#  (در PowerShell اجرای اسکریپت پوشه جاری باید با «.\» شروع شود)
#  گزینه‌ها:
#     -Port 3016          پورت دلخواه (پیش‌فرض: ۳۰۱۵)
#     -Production         اجرای حالت تولید (build + start)
#     -NoBrowser          باز نکردن خودکار مرورگر
# =============================================================

param(
  [int]$Port = 3015,
  [switch]$Production,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
try { chcp 65001 | Out-Null; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# محل پروژه: پوشه‌ای که این اسکریپت داخل آن است
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

if (-not (Test-Path ".env")) {
  Write-Host "[X] فایل .env یافت نشد؛ ابتدا setup-and-run.ps1 را اجرا کنید." -ForegroundColor Red
  Read-Host "برای بستن Enter بزنید"; exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[X] Node.js نصب نیست؛ از nodejs.org نسخه ۲۰ به بالا را نصب کنید." -ForegroundColor Red
  Read-Host "برای بستن Enter بزنید"; exit 1
}

Write-Host "==> همگام‌سازی دیتابیس (Prisma)..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) {
  Write-Host "[X] خطا در دیتابیس." -ForegroundColor Red
  Read-Host "برای بستن Enter بزنید"; exit 1
}

$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
  Write-Host "[!] پورت $Port اشغال است؛ با پورت دیگر اجرا کنید:  -Port 3001" -ForegroundColor Yellow
  Read-Host "برای بستن Enter بزنید"; exit 1
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "  برنامه در حال اجراست:  http://localhost:$Port" -ForegroundColor Green
Write-Host "  نخستین کاربری که ثبت‌نام کند، مدیر سامانه است." -ForegroundColor Yellow
Write-Host "  توقف: Ctrl+C   |   بستن از پنجره دیگر: .\stop-report.ps1" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Magenta

if (-not $NoBrowser) { Start-Process "http://localhost:$Port" }

if ($Production) {
  Write-Host "==> ساخت نسخه تولید (build)..." -ForegroundColor Cyan
  npx next build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] خطا در build." -ForegroundColor Red
    Read-Host "برای بستن Enter بزنید"; exit 1
  }
  npx next start -p $Port
} else {
  npx next dev -p $Port
}
