# 生成测试图片：1000x1000 彩色圆点 PNG
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(1000, 1000)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$colors = @(
  [System.Drawing.Color]::Crimson,
  [System.Drawing.Color]::RoyalBlue,
  [System.Drawing.Color]::ForestGreen,
  [System.Drawing.Color]::Gold,
  [System.Drawing.Color]::Purple,
  [System.Drawing.Color]::Orange
)
$rand = New-Object System.Random(42)
for ($i = 0; $i -lt 400; $i++) {
  $c = $colors[$rand.Next($colors.Count)]
  $b = New-Object System.Drawing.SolidBrush($c)
  $g.FillEllipse($b, $rand.Next(950), $rand.Next(950), 120, 120)
  $b.Dispose()
}
$g.Dispose()
$outPath = Join-Path $env:TEMP 'perler-test-image.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "SAVED: $outPath"
