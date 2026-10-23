Add-Type -AssemblyName System.Drawing

$source = Join-Path $PSScriptRoot "assets\icon.png"
$androidRes = Join-Path $PSScriptRoot "android\app\src\main\res"

if (-not (Test-Path $source)) {
    Write-Error "Source icon not found at: $source"
    exit 1
}

$androidSizes = @{
    "mipmap-mdpi"    = @{ launcher = 48;  foreground = 108 }
    "mipmap-hdpi"    = @{ launcher = 72;  foreground = 162 }
    "mipmap-xhdpi"   = @{ launcher = 96;  foreground = 216 }
    "mipmap-xxhdpi"  = @{ launcher = 144; foreground = 324 }
    "mipmap-xxxhdpi" = @{ launcher = 192; foreground = 432 }
}

function Resize-Image {
    param([string]$InputPath, [string]$OutputPath, [int]$Size)
    $srcImg = [System.Drawing.Image]::FromFile($InputPath)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $Size, $Size)
    $dir = Split-Path $OutputPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $srcImg.Dispose()
    Write-Host "OK $OutputPath ($Size x $Size)"
}

Write-Host "Generating Android icons..."

foreach ($folder in $androidSizes.Keys) {
    $sizes = $androidSizes[$folder]
    $path = Join-Path $androidRes $folder
    Resize-Image -InputPath $source -OutputPath (Join-Path $path "ic_launcher.png") -Size $sizes.launcher
    Resize-Image -InputPath $source -OutputPath (Join-Path $path "ic_launcher_round.png") -Size $sizes.launcher
    Resize-Image -InputPath $source -OutputPath (Join-Path $path "ic_launcher_foreground.png") -Size $sizes.foreground
}

Write-Host "Done. Now rebuild: cd android && .\gradlew.bat assembleDebug"
