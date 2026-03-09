# Script to download portable JDK 17 and build the Android app
# This avoids the "Unsupported class file major version" error with Java 25

$ErrorActionPreference = "Stop"

$jdkVersion = "17"
$jdkDir = Join-Path $PSScriptRoot "android\jdk-17"
$zipPath = Join-Path $PSScriptRoot "jdk-17.zip"
$gradlewPath = Join-Path $PSScriptRoot "android\gradlew"

Write-Host "Checking for local JDK 17..." -ForegroundColor Cyan

if (-not (Test-Path $jdkDir)) {
    Write-Host "JDK 17 not found locally. Downloading..." -ForegroundColor Yellow
    # URL for Eclipse Adoptium JDK 17 (Windows x64)
    $url = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk"
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
        Write-Host "Download complete. Extracting..." -ForegroundColor Green
        
        Expand-Archive -Path $zipPath -DestinationPath (Join-Path $PSScriptRoot "android\temp_jdk") -Force
        
        # Move the inner folder to jdk-17
        $extractedFolder = Get-ChildItem (Join-Path $PSScriptRoot "android\temp_jdk") | Select-Object -First 1
        Move-Item -Path $extractedFolder.FullName -Destination $jdkDir
        
        # Cleanup
        Remove-Item $zipPath -Force
        Remove-Item (Join-Path $PSScriptRoot "android\temp_jdk") -Recurse -Force
        
        Write-Host "JDK 17 installed locally at $jdkDir" -ForegroundColor Green
    } catch {
        Write-Error "Failed to download or extract JDK. Please install JDK 17 manually."
        exit 1
    }
} else {
    Write-Host "Local JDK 17 found." -ForegroundColor Green
}

# Set JAVA_HOME for this session
$env:JAVA_HOME = $jdkDir
$env:Path = "$jdkDir\bin;$env:Path"

Write-Host "JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Cyan
java -version

# Check if local.properties exists, if not create it with default SDK path (common issue)
$localPropsPath = Join-Path $PSScriptRoot "android\local.properties"
if (-not (Test-Path $localPropsPath)) {
    Write-Host "Creating local.properties..." -ForegroundColor Yellow
    # Try to guess Android SDK path
    $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $sdkPath) {
        # Escape backslashes for properties file
        $sdkPathEscaped = $sdkPath -replace "\\", "\\"
        "sdk.dir=$sdkPathEscaped" | Out-File $localPropsPath -Encoding ascii
        Write-Host "Set sdk.dir to $sdkPath" -ForegroundColor Green
    } else {
        Write-Warning "Could not find Android SDK. The build might fail if sdk.dir is missing."
    }
}

# Run the build
Write-Host "Starting Android Build..." -ForegroundColor Cyan
Set-Location "android"
try {
    ./gradlew assembleDebug
    Write-Host "Build Successful! APK is located at: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Green
} catch {
    Write-Error "Build failed. Please check the logs."
}
