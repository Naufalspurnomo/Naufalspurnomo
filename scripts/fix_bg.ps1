Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('c:\Naufal\Naufalspurnomo\assets\chibi-origami.png')
$bmp = New-Object System.Drawing.Bitmap($img)
$img.Dispose()

# Make the specific background color (#07111f) transparent
$bgColor = [System.Drawing.Color]::FromArgb(7, 17, 31)
$bmp.MakeTransparent($bgColor)

# Resize to 48x48
$bmpSmall = New-Object System.Drawing.Bitmap(48, 48)
$graph = [System.Drawing.Graphics]::FromImage($bmpSmall)
$graph.DrawImage($bmp, 0, 0, 48, 48)
$bmpSmall.Save('c:\Naufal\Naufalspurnomo\assets\chibi-origami-small.png', [System.Drawing.Imaging.ImageFormat]::Png)

$bmp.Dispose()
$graph.Dispose()
$bmpSmall.Dispose()
