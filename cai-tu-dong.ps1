# cai-tu-dong: bat / tat che do "mo Zalo kieu gi cung co Zalo gon".
#   cai-tu-dong.ps1          -> dat loi tat canh chung vao Startup roi chay luon
#   cai-tu-dong.ps1 -Go      -> go loi tat, dung canh
# Khong sua file nao cua Zalo, khong dong vao khoa Run cua Zalo trong registry.
param([switch]$Go)
$ErrorActionPreference = 'Stop'
$dir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$start = [Environment]::GetFolderPath('Startup')
$lnk   = Join-Path $start 'Zalo gon - canh.lnk'

if ($Go) {
  if (Test-Path $lnk) { Remove-Item $lnk -Force }
  # PowerShell 5.1: Get-Process KHONG co thuoc tinh CommandLine -> phai hoi qua CIM
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*zalo-canh.ps1*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  "Da go: Zalo mo kieu thuong se khong con tu chen Zalo gon."
  exit 0
}

$sh = New-Object -ComObject WScript.Shell
$s  = $sh.CreateShortcut($lnk)
$s.TargetPath       = Join-Path $dir 'zalo-canh.vbs'
$s.WorkingDirectory = $dir
$s.Description      = 'Canh Zalo: mo kieu gi cung chen Zalo gon + ao giao dien'
$s.Save()

# Chay ngay, khong cho dang nhap lai
Start-Process (Join-Path $dir 'zalo-canh.vbs')
"Da dat loi tat canh vao Startup: $lnk"
"Tu gio mo Zalo bang bieu tuong goc / thanh tac vu / khoi dong cung may deu tu co Zalo gon + ao giao dien."
