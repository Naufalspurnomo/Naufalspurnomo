Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('c:\Naufal\Naufalspurnomo\assets\chibi-origami.png')
$bmp = New-Object System.Drawing.Bitmap(48, 48)
$graph = [System.Drawing.Graphics]::FromImage($bmp)
$graph.DrawImage($img, 0, 0, 48, 48)
$bmp.Save('c:\Naufal\Naufalspurnomo\assets\chibi-origami-small.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$graph.Dispose()
$bmp.Dispose()
