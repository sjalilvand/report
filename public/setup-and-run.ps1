# =============================================================
#  سکوی هوشمند آماده‌سازی داده، مدل‌سازی و گزارش‌سازی
#  اسکریپت نصب و اجرای خودکار روی ویندوز (PowerShell 5.1+)
# -------------------------------------------------------------
#  نحوه اجرا (فقط همین یک فایل کافی است):
#    1) این فایل را در یک پوشه خالی ذخیره کنید
#    2) PowerShell را باز کنید و اجرا کنید:
#       powershell -ExecutionPolicy Bypass -File .\setup-and-run.ps1
#    3) گزینه‌های اختیاری:
#       -InstallDir "D:\apps\report"   مسیر نصب (پیش‌فرض: پوشه جاری\report)
#       -RepoUrl    "https://github.com/sjalilvand/report.git"
#       -Port       3000                پورت اجرا
#       -Production                     اجرای حالت تولید به‌جای توسعه
#       -SkipClone                      اگر مخزن را قبلاً دانلود کرده‌اید
#       -NoBrowser                      باز نکردن خودکار مرورگر
# -------------------------------------------------------------
#  پس از نصب، برای اجراهای بعدی دو میان‌بر در پوشه نصب ساخته می‌شود:
#    start-report.ps1  (اجرای سریع)   |   stop-report.ps1  (توقف)
# =============================================================

param(
  [string]$InstallDir = "",
  [string]$RepoUrl = "https://github.com/sjalilvand/report.git",
  [int]$Port = 3000,
  [switch]$SkipClone,
  [switch]$Production,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
try { chcp 65001 | Out-Null; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Write-Step($msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    [!] $msg" -ForegroundColor Yellow }
function Die($msg)         { Write-Host "`n    [X] $msg" -ForegroundColor Red; Read-Host "برای بستن Enter بزنید"; exit 1 }

Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "  سکوی هوشمند گزارش‌ساز — نصب و اجرا روی ویندوز" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

# ---------- 1) مسیر نصب ----------
if (-not $InstallDir) { $InstallDir = Join-Path (Get-Location) "report" }
Write-Step "مسیر نصب: $InstallDir"

# ---------- 2) بررسی Git ----------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Warn2 "Git نصب نیست."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Step "نصب Git با winget..."
    winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  } else {
    Write-Host "    Git را از https://git-scm.com/download/win نصب کنید و دوباره اجرا کنید." -ForegroundColor Red
    Read-Host "پس از نصب Enter بزنید تا ادامه دهیم یا Ctrl+C برای خروج"
  }
}
if (Get-Command git -ErrorAction SilentlyContinue) { Write-Ok "Git آماده است" }

# ---------- 3) بررسی Node.js (نیاز Next 16: نسخه ۲۰ به بالا) ----------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Warn2 "Node.js نصب نیست."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Step "نصب Node.js LTS با winget (چند دقیقه طول می‌کشد)..."
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  } else {
    Write-Host "    Node.js را از https://nodejs.org نصب کنید و دوباره اجرا کنید." -ForegroundColor Red
    Read-Host "پس از نصب Enter بزنید"
  }
}
$nodeVersion = (& node -v) 2>$null
if (-not $nodeVersion) { Die "Node.js یافت نشد؛ PowerShell را بسته و دوباره باز کنید." }
$major = 0; $minor = 0
if ($nodeVersion -match 'v(\d+)\.(\d+)') { $major = [int]$Matches[1]; $minor = [int]$Matches[2] }
if ($major -lt 20) { Die "Node.js $nodeVersion قدیمی است؛ این برنامه به Node 20 به بالا نیاز دارد (nodejs.org)." }
Write-Ok "Node.js $nodeVersion"

# ---------- 4) دریافت مخزن (Clone یا Update) ----------
if ($SkipClone) {
  Write-Ok "بر اساس -SkipClone از مخزن موجود استفاده می‌شود"
  if (-not (Test-Path $InstallDir)) { Die "مسیر $InstallDir وجود ندارد." }
} elseif (Test-Path (Join-Path $InstallDir ".git")) {
  Write-Step "مخزن موجود است؛ دریافت آخرین تغییرات..."
  Push-Location $InstallDir
  git pull --ff-only 2>$null
  Pop-Location
  Write-Ok "به‌روزرسانی انجام شد"
} else {
  Write-Step "دریافت پروژه از GitHub..."
  git clone $RepoUrl $InstallDir
  if ($LASTEXITCODE -ne 0) { Die "خطا در دریافت مخزن؛ آدرس یا اتصال شبکه را بررسی کنید." }
  Write-Ok "پروژه دریافت شد"
}
Set-Location $InstallDir

# ---------- 5) فایل .env ----------
Write-Step "آماده‌سازی فایل .env و پوشه دیتابیس"
$dbDir = Join-Path $InstallDir "db"
if (-not (Test-Path $dbDir)) { New-Item -ItemType Directory -Path $dbDir | Out-Null }
$envFile = Join-Path $InstallDir ".env"
if (Test-Path $envFile) {
  Write-Ok ".env موجود حفظ شد (دیتابیس قبلی دست‌نخورده می‌ماند)"
} else {
  $dbPathUnix = ($dbDir -replace '\\','/')
  # نوشتن UTF-8 بدون BOM — برای سازگاری کامل Prisma (خط خواندن .env)
  [System.IO.File]::WriteAllText($envFile, "DATABASE_URL=file:$dbPathUnix/custom.db", (New-Object System.Text.UTF8Encoding($false)))
  Write-Ok ".env نوشته شد: DATABASE_URL=file:$dbPathUnix/custom.db"
}

# ---------- 6) نصب وابستگی‌ها ----------
Write-Step "نصب وابستگی‌ها (چند دقیقه طول می‌کشد)..."
if (Get-Command bun -ErrorAction SilentlyContinue) {
  Write-Host "    با Bun..."
  bun install
  if ($LASTEXITCODE -ne 0) { Die "نصب وابستگی‌ها با Bun ناموفق بود." }
} else {
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Die "نصب وابستگی‌ها با npm ناموفق بود؛ اتصال اینترنت را بررسی کنید." }
}
Write-Ok "وابستگی‌ها نصب شد"

# ---------- 7) دیتابیس Prisma ----------
Write-Step "همگام‌سازی دیتابیس (Prisma)..."
npx prisma generate
if ($LASTEXITCODE -ne 0) { Die "prisma generate ناموفق بود." }
npx prisma db push
if ($LASTEXITCODE -ne 0) { Die "ایجاد دیتابیس ناموفق بود." }
Write-Ok "دیتابیس آماده شد (db/custom.db)"

# ---------- 8) ساخت میان‌برهای اجرای بعدی ----------
Write-Step "ساخت میان‌برهای start-report.ps1 و stop-report.ps1 ..."
$startScript = @"
# اجرای سریع سکوی گزارش‌ساز (پس از نصب اولیه)
param(
  [int]`$Port = $Port,
  [switch]`$Production,
  [switch]`$NoBrowser
)
`$ErrorActionPreference = "Stop"
try { chcp 65001 | Out-Null; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
Set-Location (Split-Path -Parent `$MyInvocation.MyCommand.Path)
if (-not (Test-Path ".env")) { Write-Host "[X] فایل .env یافت نشد؛ ابتدا setup-and-run.ps1 را اجرا کنید." -ForegroundColor Red; exit 1 }
Write-Host "==> همگام‌سازی دیتابیس..." -ForegroundColor Cyan
npx prisma db push
if (`$LASTEXITCODE -ne 0) { Write-Host "[X] خطا در دیتابیس." -ForegroundColor Red; exit 1 }
`$busy = Get-NetTCPConnection -LocalPort `$Port -State Listen -ErrorAction SilentlyContinue
if (`$busy) { Write-Host "[!] پورت `$Port اشغال است؛ با -Port 3001 اجرا کنید یا سرور قبلی را با stop-report.ps1 ببندید." -ForegroundColor Yellow; exit 1 }
Write-Host ""
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "  برنامه در حال اجراست:  http://localhost:`$Port" -ForegroundColor Green
Write-Host "  نخستین کاربری که ثبت‌نام کند، مدیر سامانه است." -ForegroundColor Yellow
Write-Host "  توقف: Ctrl+C   |   بستن از پنجره دیگر: .\stop-report.ps1" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Magenta
if (-not `$NoBrowser) { Start-Process "http://localhost:`$Port" }
if (`$Production) {
  npx next build
  if (`$LASTEXITCODE -ne 0) { Write-Host "[X] خطا در build." -ForegroundColor Red; exit 1 }
  npx next start -p `$Port
} else {
  npx next dev -p `$Port
}
"@
$stopScript = @"
# توقف سرور سکوی گزارش‌ساز روی پورت مشخص
param([int]`$Port = $Port)
`$conns = Get-NetTCPConnection -LocalPort `$Port -State Listen -ErrorAction SilentlyContinue
if (-not `$conns) {
  # روش جایگزین با netstat
  `$line = (netstat -ano | Select-String ":`$Port\s.*LISTENING") | Select-Object -First 1
  if (`$line -match '\s(\d+)$') {
    try { Stop-Process -Id `$Matches[1] -Force; Write-Host "[OK] فرایند `$(`$Matches[1]) متوقف شد." -ForegroundColor Green; exit 0 } catch {}
  }
  Write-Host "[!] هیچ سروری روی پورت `$Port در حال اجرا نیست." -ForegroundColor Yellow; exit 0
}
`$conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
  try { Stop-Process -Id `$_ -Force; Write-Host "[OK] فرایند `$_ متوقف شد." -ForegroundColor Green } catch {}
}
"@
Set-Content -Path (Join-Path $InstallDir "start-report.ps1") -Value $startScript -Encoding UTF8
Set-Content -Path (Join-Path $InstallDir "stop-report.ps1")  -Value $stopScript  -Encoding UTF8
Write-Ok "میان‌برها ساخته شدند"

# ---------- 9) بررسی اشغال بودن پورت ----------
$portBusy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portBusy) {
  Die "پورت $Port اشغال است؛ با پورت دیگر اجرا کنید:  -Port 3001"
}

# ---------- 10) اجرای برنامه ----------
Write-Host ""
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "  برنامه در حال اجراست:  http://localhost:$Port" -ForegroundColor Green
Write-Host "  نخستین کاربری که ثبت‌نام کند، مدیر سامانه است." -ForegroundColor Yellow
Write-Host "  نمونه فایل آزمایشی: پوشه public/samples در پروژه" -ForegroundColor Gray
Write-Host "  توقف: Ctrl+C   |   اجراهای بعدی: .\start-report.ps1" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Magenta

Start-Sleep -Seconds 2
if (-not $NoBrowser) { Start-Process "http://localhost:$Port" }

if ($Production) {
  Write-Step "ساخت نسخه تولید (build)..."
  npx next build
  if ($LASTEXITCODE -ne 0) { Die "خطا در build نسخه تولید." }
  npx next start -p $Port
} else {
  Write-Step "اجرای سرور توسعه..."
  npx next dev -p $Port
}
