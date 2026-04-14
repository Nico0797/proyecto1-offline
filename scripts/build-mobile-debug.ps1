$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendRoot = Join-Path $ProjectRoot 'frontend-react'
$AndroidRoot = Join-Path $ProjectRoot 'android'

Write-Host '[1/5] npm run build' -ForegroundColor Cyan
Push-Location $FrontendRoot
try {
  npm.cmd run build
  Write-Host '[2/5] npm run lint' -ForegroundColor Cyan
  npm.cmd run lint
}
finally {
  Pop-Location
}

Write-Host '[3/5] npx cap sync android' -ForegroundColor Cyan
Push-Location $ProjectRoot
try {
  npx.cmd cap sync android
}
finally {
  Pop-Location
}

Write-Host '[4/5] gradlew clean' -ForegroundColor Cyan
Push-Location $AndroidRoot
try {
  .\gradlew.bat clean
  Write-Host '[5/5] gradlew assembleDebug' -ForegroundColor Cyan
  .\gradlew.bat assembleDebug
}
finally {
  Pop-Location
}

$apkPath = Join-Path $AndroidRoot 'app\build\outputs\apk\debug\app-debug.apk'
if (Test-Path $apkPath) {
  Get-Item $apkPath | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
} else {
  Write-Error "APK no encontrado en $apkPath"
}
