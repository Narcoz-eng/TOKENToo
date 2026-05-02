param(
  [string]$OutDir = "frontend/public/art"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function New-Brush([string]$hex) {
  return New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function Draw-Avatar {
  param(
    [string]$FileName,
    [string]$Base,
    [string]$Accent,
    [string]$Secondary,
    [string]$Shape
  )

  $size = 512
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.Rectangle]::new(0, 0, $size, $size),
    [System.Drawing.ColorTranslator]::FromHtml("#050812"),
    [System.Drawing.ColorTranslator]::FromHtml($Secondary),
    45
  )
  $graphics.FillRectangle($bg, 0, 0, $size, $size)

  for ($i = 0; $i -lt 64; $i++) {
    $x = (Get-Random -Minimum 0 -Maximum 512)
    $y = (Get-Random -Minimum 0 -Maximum 512)
    $s = (Get-Random -Minimum 4 -Maximum 14)
    $graphics.FillRectangle((New-Brush $Accent), $x, $y, $s, $s)
  }

  $graphics.FillEllipse((New-Brush "#14102a"), 70, 75, 370, 380)
  $graphics.FillEllipse((New-Brush $Base), 122, 126, 270, 250)
  $graphics.FillEllipse((New-Brush "#05070f"), 155, 180, 76, 76)
  $graphics.FillEllipse((New-Brush "#05070f"), 285, 180, 76, 76)
  $graphics.FillEllipse((New-Brush "#e8fff0"), 176, 194, 30, 30)
  $graphics.FillEllipse((New-Brush "#e8fff0"), 306, 194, 30, 30)
  $graphics.FillRectangle((New-Brush "#0a0f17"), 190, 315, 130, 14)
  $graphics.FillRectangle((New-Brush $Accent), 148, 354, 222, 34)

  if ($Shape -eq "crown") {
    $points = [System.Drawing.Point[]]@(
      [System.Drawing.Point]::new(154, 128),
      [System.Drawing.Point]::new(210, 58),
      [System.Drawing.Point]::new(256, 130),
      [System.Drawing.Point]::new(306, 58),
      [System.Drawing.Point]::new(362, 128),
      [System.Drawing.Point]::new(348, 170),
      [System.Drawing.Point]::new(168, 170)
    )
    $graphics.FillPolygon((New-Brush "#f4c542"), $points)
    $graphics.FillRectangle((New-Brush "#7a4dff"), 180, 144, 152, 18)
  }

  if ($Shape -eq "hood") {
    $graphics.FillPie((New-Brush "#281158"), 66, 46, 380, 420, 190, 160)
    $graphics.FillEllipse((New-Brush $Base), 128, 136, 258, 244)
  }

  if ($Shape -eq "visor") {
    $graphics.FillRectangle((New-Brush "#29f2ff"), 142, 184, 238, 54)
    $graphics.FillRectangle((New-Brush "#6e2cff"), 162, 204, 198, 14)
  }

  $graphics.Dispose()
  $bitmap.Save((Join-Path $OutDir $FileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

Draw-Avatar "frog-vault.png" "#40d957" "#7a35ff" "#053d25" "hood"
Draw-Avatar "doge-kingdom.png" "#d9a83f" "#21f26b" "#3e2407" "crown"
Draw-Avatar "cat-syndicate.png" "#9a36ff" "#20f2c8" "#210031" "visor"
Draw-Avatar "pepe-empire.png" "#51c94b" "#f4c542" "#18370f" "crown"
Draw-Avatar "shiba-samurai.png" "#df8740" "#7a35ff" "#3a1206" "hood"

Copy-Item (Join-Path $OutDir "frog-vault.png") (Join-Path $OutDir "hero-frog.png") -Force

