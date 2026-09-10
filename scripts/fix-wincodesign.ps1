$7z = "D:\sherif\PROJECT\sys amn\node_modules\7zip-bin\win\x64\7za.exe"
$cacheDir = "C:\Users\amnba\AppData\Local\electron-builder\Cache\winCodeSign"
$archive = (Get-ChildItem "$cacheDir\*.7z" | Select-Object -First 1).FullName
$dest = "$cacheDir\winCodeSign-2.6.0"

Write-Host "Extracting $archive into $dest..."
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest | Out-Null
}

# Extract excluding darwin symlinks
& $7z x -y "-o$dest" $archive "-xr!darwin"
Write-Host "ExitCode: $LASTEXITCODE"

# Also check what files are in $dest
Get-ChildItem $dest | Select-Object Name
