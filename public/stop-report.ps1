# =============================================================
#  سکوی هوشمند گزارش‌ساز — توقف سرور
# -------------------------------------------------------------
#  کاربرد: بستن سرور در حال اجرا روی پورت مشخص (پیش‌فرض 3015)
#     powershell -ExecutionPolicy Bypass -File .\stop-report.ps1
#     powershell -ExecutionPolicy Bypass -File .\stop-report.ps1 -Port 3001
# =============================================================

param([int]$Port = 3015)

try { chcp 65001 | Out-Null; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $conns) {
  # روش جایگزین برای سیستم‌هایی که Get-NetTCPConnection ندارند
  $lines = (netstat -ano | Select-String ":$Port\s.*LISTENING")
  if ($lines) {
    foreach ($line in $lines) {
      if ($line -match '\s(\d+)$') {
        try {
          Stop-Process -Id $Matches[1] -Force
          Write-Host "[OK] فرایند $($Matches[1]) روی پورت $Port متوقف شد." -ForegroundColor Green
        } catch {
          Write-Host "[!] توقف فرایند $($Matches[1]) ناموفق بود." -ForegroundColor Yellow
        }
      }
    }
    exit 0
  }
  Write-Host "[!] هیچ سروری روی پورت $Port در حال اجرا نیست." -ForegroundColor Yellow
  exit 0
}

$pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) {
  try {
    Stop-Process -Id $p -Force
    Write-Host "[OK] فرایند $p روی پورت $Port متوقف شد." -ForegroundColor Green
  } catch {
    Write-Host "[!] توقف فرایند $p ناموفق بود." -ForegroundColor Yellow
  }
}
