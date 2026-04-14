# Script to build the Android app using Android Studio's bundled JDK
# This avoids the "Unsupported class file major version" error with Java 25

$ErrorActionPreference = "Stop"

# Use the bundled JDK from Android Studio (Java 21)
$jdkDir = "C:\Program Files\Android\Android Studio\jbr"

Write-Host "Checking for Android Studio JDK..." -ForegroundColor Cyan

if (Test-Path $jdkDir) {
    Write-Host "Found bundled JDK at $jdkDir" -ForegroundColor Green
    # Set JAVA_HOME for this session
    $env:JAVA_HOME = $jdkDir
    $env:Path = "$jdkDir\bin;$env:Path"
    
    Write-Host "JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Cyan
    java -version
} else {
    Write-Error "Could not find Android Studio bundled JDK at $jdkDir"
    exit 1
}

# Build web assets first
Write-Host "Building frontend-react..." -ForegroundColor Cyan
Set-Location "frontend-react"
npm.cmd run build

# Copy web assets into Android
Write-Host "Copying Capacitor assets to Android..." -ForegroundColor Cyan
Set-Location ".."
npx.cmd cap copy android

# Run Android build
Write-Host "Starting Android Build..." -ForegroundColor Cyan
Set-Location "android"

try {
    ./gradlew.bat clean assembleDebug
    Write-Host "Build Successful! APK is located at: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Green
} catch {
    Write-Error "Build failed. Please check the logs above."
}
