param(
  [string]$OutDir = "frontend/public/art"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Brush([string]$hex) {
  return New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function PenOf([string]$hex, [int]$width = 3) {
  return New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($hex), $width)
}

function New-Canvas([string]$bg1, [string]$bg2, [string]$accent) {
  $size = 512
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Rectangle]::new(0, 0, $size, $size),
    [System.Drawing.ColorTranslator]::FromHtml($bg1),
    [System.Drawing.ColorTranslator]::FromHtml($bg2),
    35
  )
  $g.FillRectangle($gradient, 0, 0, $size, $size)
  for ($i = 0; $i -lt 46; $i++) {
    $x = Get-Random -Minimum 0 -Maximum 512
    $y = Get-Random -Minimum 0 -Maximum 512
    $s = Get-Random -Minimum 3 -Maximum 11
    $g.FillRectangle((Brush $accent), $x, $y, $s, $s)
  }
  return @{ Bitmap = $bitmap; Graphics = $g }
}

function Save-Art($canvas, [string]$fileName) {
  $path = Join-Path $OutDir $fileName
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Draw-Frog {
  $c = New-Canvas "#06120d" "#073d26" "#7a35ff"
  $g = $c.Graphics
  $g.FillPie((Brush "#251052"), 54, 38, 404, 440, 188, 164)
  $g.FillEllipse((Brush "#45d85a"), 112, 142, 292, 230)
  $g.FillEllipse((Brush "#78ff77"), 124, 124, 110, 110)
  $g.FillEllipse((Brush "#78ff77"), 278, 124, 110, 110)
  $g.FillEllipse((Brush "#05100b"), 154, 154, 58, 58)
  $g.FillEllipse((Brush "#05100b"), 300, 154, 58, 58)
  $g.FillRectangle((Brush "#0a130e"), 182, 306, 148, 16)
  $g.DrawLine((PenOf "#d9b36c" 8), 92, 392, 250, 270)
  $g.FillEllipse((Brush "#21f26b"), 66, 378, 56, 56)
  $g.FillRectangle((Brush "#7a35ff"), 152, 362, 210, 34)
  Save-Art $c "frog-vault-v2.png"
}

function Draw-Dog {
  $c = New-Canvas "#201304" "#533108" "#21f26b"
  $g = $c.Graphics
  $g.FillPolygon((Brush "#b87422"), @(
    [System.Drawing.Point]::new(104, 180),
    [System.Drawing.Point]::new(162, 86),
    [System.Drawing.Point]::new(214, 184)
  ))
  $g.FillPolygon((Brush "#b87422"), @(
    [System.Drawing.Point]::new(298, 184),
    [System.Drawing.Point]::new(350, 86),
    [System.Drawing.Point]::new(408, 180)
  ))
  $g.FillEllipse((Brush "#d69b35"), 106, 128, 300, 286)
  $g.FillEllipse((Brush "#ffe2a2"), 178, 244, 156, 130)
  $g.FillEllipse((Brush "#05100b"), 168, 198, 52, 52)
  $g.FillEllipse((Brush "#05100b"), 292, 198, 52, 52)
  $g.FillPolygon((Brush "#f4c542"), @(
    [System.Drawing.Point]::new(142, 132),
    [System.Drawing.Point]::new(196, 58),
    [System.Drawing.Point]::new(256, 132),
    [System.Drawing.Point]::new(316, 58),
    [System.Drawing.Point]::new(370, 132),
    [System.Drawing.Point]::new(354, 170),
    [System.Drawing.Point]::new(158, 170)
  ))
  $g.FillRectangle((Brush "#4f1fc7"), 174, 150, 164, 18)
  $g.FillRectangle((Brush "#f4c542"), 146, 388, 220, 38)
  Save-Art $c "doge-kingdom-v2.png"
}

function Draw-Cat {
  $c = New-Canvas "#13001f" "#310544" "#28d7ff"
  $g = $c.Graphics
  $g.FillPolygon((Brush "#191126"), @(
    [System.Drawing.Point]::new(108, 180),
    [System.Drawing.Point]::new(156, 72),
    [System.Drawing.Point]::new(218, 184)
  ))
  $g.FillPolygon((Brush "#191126"), @(
    [System.Drawing.Point]::new(294, 184),
    [System.Drawing.Point]::new(356, 72),
    [System.Drawing.Point]::new(404, 180)
  ))
  $g.FillEllipse((Brush "#21172e"), 110, 126, 292, 284)
  $g.DrawRectangle((PenOf "#28d7ff" 8), 138, 190, 236, 60)
  $g.FillRectangle((Brush "#7a35ff"), 154, 206, 204, 24)
  $g.DrawLine((PenOf "#28d7ff" 3), 92, 304, 178, 292)
  $g.DrawLine((PenOf "#28d7ff" 3), 420, 304, 334, 292)
  $g.FillEllipse((Brush "#9a36ff"), 188, 280, 136, 80)
  $g.FillRectangle((Brush "#0b0e18"), 156, 384, 200, 42)
  Save-Art $c "cat-syndicate-v2.png"
}

function Draw-Alien {
  $c = New-Canvas "#071409" "#183d0f" "#f4c542"
  $g = $c.Graphics
  $g.FillEllipse((Brush "#5cd34f"), 112, 106, 288, 260)
  $g.FillEllipse((Brush "#b8ff91"), 136, 168, 96, 76)
  $g.FillEllipse((Brush "#b8ff91"), 280, 168, 96, 76)
  $g.FillEllipse((Brush "#05100b"), 164, 186, 48, 48)
  $g.FillEllipse((Brush "#05100b"), 304, 186, 48, 48)
  $g.FillRectangle((Brush "#f4c542"), 134, 116, 246, 36)
  $g.FillPolygon((Brush "#7a35ff"), @(
    [System.Drawing.Point]::new(122, 374),
    [System.Drawing.Point]::new(256, 304),
    [System.Drawing.Point]::new(390, 374),
    [System.Drawing.Point]::new(356, 438),
    [System.Drawing.Point]::new(156, 438)
  ))
  $g.DrawLine((PenOf "#f4c542" 7), 390, 388, 438, 150)
  $g.FillRectangle((Brush "#21f26b"), 424, 144, 26, 120)
  Save-Art $c "pepe-empire-v2.png"
}

function Draw-Samurai {
  $c = New-Canvas "#1b0b05" "#3a1309" "#7a35ff"
  $g = $c.Graphics
  $g.FillEllipse((Brush "#d47a2d"), 120, 130, 274, 264)
  $g.FillPolygon((Brush "#111827"), @(
    [System.Drawing.Point]::new(96, 166),
    [System.Drawing.Point]::new(256, 78),
    [System.Drawing.Point]::new(416, 166),
    [System.Drawing.Point]::new(374, 206),
    [System.Drawing.Point]::new(138, 206)
  ))
  $g.FillEllipse((Brush "#fff0c9"), 166, 214, 54, 54)
  $g.FillEllipse((Brush "#fff0c9"), 292, 214, 54, 54)
  $g.FillEllipse((Brush "#05100b"), 184, 230, 28, 28)
  $g.FillEllipse((Brush "#05100b"), 310, 230, 28, 28)
  $g.DrawLine((PenOf "#d9dce8" 8), 386, 124, 110, 430)
  $g.DrawLine((PenOf "#7a35ff" 4), 398, 134, 122, 440)
  $g.FillRectangle((Brush "#202638"), 146, 378, 220, 44)
  $g.FillRectangle((Brush "#21f26b"), 170, 392, 172, 12)
  Save-Art $c "shiba-samurai-v2.png"
}

Draw-Frog
Draw-Dog
Draw-Cat
Draw-Alien
Draw-Samurai
Copy-Item (Join-Path $OutDir "frog-vault-v2.png") (Join-Path $OutDir "hero-frog-v2.png") -Force
