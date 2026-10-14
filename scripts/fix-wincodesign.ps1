# Universal winCodeSign Symlink Fix for Electron Builder on Windows
# Solves: "ERROR: Cannot create symbolic link : A required privilege is not held by the client" (Exit Code 2)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# 1. Locate 7za.exe dynamically
$candidate7z = @(
    (Join-Path $projectRoot "node_modules\7zip-bin\win\x64\7za.exe"),
    (Join-Path $projectRoot "node_modules\app-builder-bin\win\x64\7za.exe"),
    "7z.exe",
    "7za.exe"
)

$7z = $null
foreach ($c in $candidate7z) {
    if (Test-Path $c) {
        $7z = $c
        break
    }
    $cmd = Get-Command $c -ErrorAction SilentlyContinue
    if ($cmd) {
        $7z = $cmd.Source
        break
    }
}

if (-not $7z) {
    Write-Warning "[winCodeSign Fix] 7za.exe not found in node_modules. Please run 'npm install' first."
    exit 1
}

# 2. Locate electron-builder cache dir dynamically
$cacheDir = Join-Path $env:LOCALAPPDATA "electron-builder\Cache\winCodeSign"
if (-not (Test-Path $cacheDir)) {
    Write-Host "[winCodeSign Fix] winCodeSign cache directory does not exist yet ($cacheDir)."
    Write-Host "[winCodeSign Fix] electron-builder will download it automatically when packaging."
    exit 0
}

$archives = Get-ChildItem "$cacheDir\*.7z" -ErrorAction SilentlyContinue
if (-not $archives) {
    Write-Host "[winCodeSign Fix] No .7z archive found in $cacheDir"
    exit 0
}

$archive = $archives | Select-Object -First 1
$versionName = [System.IO.Path]::GetFileNameWithoutExtension($archive.Name)
$dest = Join-Path $cacheDir $versionName

Write-Host "[winCodeSign Fix] Extracting $($archive.FullName) into $dest (excluding darwin symlinks)..."
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

# Extract excluding darwin symlinks which fail on Windows without Developer Mode / Admin
& $7z x -y "-o$dest" $archive.FullName "-xr!darwin"
$code = $LASTEXITCODE

if ($code -eq 0) {
    Write-Host "[winCodeSign Fix] winCodeSign extracted successfully without symlink errors!" -ForegroundColor Green
} else {
    Write-Warning "[winCodeSign Fix] Extraction exited with code: $code"
}
