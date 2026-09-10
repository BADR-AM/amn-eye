Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\src\assets\central_security_logo.png"
$buildDir = Join-Path $PSScriptRoot "..\build"
if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}
$icoPath = Join-Path $buildDir "icon.ico"

$srcImg = [System.Drawing.Image]::FromFile($sourcePath)

$sizes = @(256, 128, 64, 48, 32, 16)
$pngStreams = @()

foreach ($size in $sizes) {
    $canvas = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    # Maintain aspect ratio
    $ratio = [Math]::Min($size / $srcImg.Width, $size / $srcImg.Height)
    $destW = [int]($srcImg.Width * $ratio)
    $destH = [int]($srcImg.Height * $ratio)
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $destRect = New-Object System.Drawing.Rectangle $destX, $destY, $destW, $destH
    $graphics.DrawImage($srcImg, $destRect)
    $graphics.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $canvas.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngStreams += ,@($size, $ms.ToArray())
    $canvas.Dispose()
}

$srcImg.Dispose()

# Now write ICO format
$fileStream = [System.IO.File]::Create($icoPath)
$writer = New-Object System.IO.BinaryWriter $fileStream

# ICO Header
$writer.Write([UInt16]0)            # Reserved
$writer.Write([UInt16]1)            # Type = 1 (ICO)
$writer.Write([UInt16]$sizes.Count) # Count

$offset = 6 + (16 * $sizes.Count)

foreach ($entry in $pngStreams) {
    $size = $entry[0]
    $data = $entry[1]
    
    $wByte = if ($size -ge 256) { [byte]0 } else { [byte]$size }
    $hByte = if ($size -ge 256) { [byte]0 } else { [byte]$size }

    $writer.Write([byte]$wByte)          # Width
    $writer.Write([byte]$hByte)          # Height
    $writer.Write([byte]0)              # Color count
    $writer.Write([byte]0)              # Reserved
    $writer.Write([UInt16]1)            # Color planes
    $writer.Write([UInt16]32)           # Bits per pixel
    $writer.Write([UInt32]$data.Length) # Image data size
    $writer.Write([UInt32]$offset)      # Image data offset

    $offset += $data.Length
}

foreach ($entry in $pngStreams) {
    $data = $entry[1]
    $writer.Write($data)
}

$writer.Flush()
$writer.Dispose()
$fileStream.Dispose()

Write-Host "SUCCESS: Created $icoPath with sizes $($sizes -join ', ')"
