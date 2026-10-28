# بازنشانی گذرواژه سامانه — نسخه ویندوز (PowerShell 5.1)
# اجرا: از پوشه پروژه دستور زیر را اجرا کنید:
#   .\scripts\reset-password.ps1                      ← بازنشانی گذرواژه مدیر نخست به Admin@1404
#   .\scripts\reset-password.ps1 -List                ← فقط فهرست کاربران
#   .\scripts\reset-password.ps1 -Username admin -Password "MyNewPass123"
#   .\scripts\reset-password.ps1 -Create -Username admin -Name "نام شما" -Password "MyNewPass123"
#
# پس از بازنشانی، برنامه را لازم نیست ری‌استارت کنید؛ فقط دوباره وارد شوید.

param(
  [switch]$List,
  [switch]$Create,
  [string]$Username = "",
  [string]$Name = "",
  [string]$Password = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# رفتن به پوشه پروژه
Push-Location $root
try {
  if (-not (Test-Path (Join-Path $root "node_modules\@prisma\client"))) {
    Write-Host "پیش‌نیازها نصب نیستند؛ npm install اجرا می‌شود..." -ForegroundColor Yellow
    npm install
  }

  $nodeArgs = @("scripts/reset-password.cjs")
  if ($List) { $nodeArgs += "--list"; node @nodeArgs; return }
  if ($Create) {
    $nodeArgs += "--create"
    if ($Username) { $nodeArgs += $Username }
    if ($Name) { $nodeArgs += $Name }
    if ($Password) { $nodeArgs += $Password }
    node @nodeArgs; return
  }
  if ($Username) { $nodeArgs += $Username }
  if ($Password) { $nodeArgs += $Password }
  node @nodeArgs
}
finally {
  Pop-Location
}
