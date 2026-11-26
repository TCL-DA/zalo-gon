# Zalo Web gon: mo cua so Chrome rieng chi chay Zalo Web (chat.zalo.me) kem cong go loi 9334 (chi 127.0.0.1),
# ho so rieng (khong dung chung Chrome chinh), roi nhoi cac module web/modules/*.js (icon Zalo + ten "Thanh TCL",
# nen carbon, cac tinh nang). Khong dung Zalo PC, khong sua file nao cua Zalo.
#   zalo-web.ps1            -> mo (neu chua) + nhoi mod
#   zalo-web.ps1 -ChiMod    -> chi nhoi mod vao cua so dang mo
#   zalo-web.ps1 -Eval "js" -> chay 1 bieu thuc JS (do giao dien)
param([switch]$ChiMod, [string]$Eval)
$ErrorActionPreference = 'Stop'
$port = 9334
$dir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$prof = Join-Path $env:LOCALAPPDATA 'ZaloWebGon\profile'
New-Item -ItemType Directory -Force $prof | Out-Null
function Log($m){ try{ Add-Content (Join-Path $dir 'zalo-web.log') "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" -Encoding UTF8 }catch{} ; $m }

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Log 'LOI: khong thay chrome.exe'; exit 1 }

function Targets { try { Invoke-RestMethod "http://127.0.0.1:$port/json" -TimeoutSec 2 | ForEach-Object { $_ } } catch { $null } }
function ZaloPage { Targets | Where-Object { $_.type -eq 'page' -and $_.url -match 'zalo' } | Select-Object -First 1 }

# ---- Mo cua so neu chua co cong / chua co trang Zalo
if (-not $ChiMod -and -not (ZaloPage)) {
  $short = (New-Object -ComObject Scripting.FileSystemObject).GetFolder($prof).ShortPath
  $a = @("--app=https://chat.zalo.me/","--user-data-dir=$short",
         "--remote-debugging-port=$port","--remote-debugging-address=127.0.0.1",
         '--no-first-run','--no-default-browser-check','--window-size=1280,860')
  Start-Process $chrome -ArgumentList $a
  for ($i=0; $i -lt 40 -and -not (ZaloPage); $i++) { Start-Sleep -Milliseconds 500 }
  if (-not (ZaloPage)) { Log 'LOI: khong mo duoc cua so Zalo Web kem cong'; exit 1 }
  Log 'Da mo cua so Zalo Web'
}

$pg = ZaloPage
if (-not $pg) { Log 'Chua co trang Zalo Web (cong chua len)'; exit 1 }

# ---- Nhoi mod bang Python (PowerShell 5.1 khong nap duoc System.Net.WebSockets) ----
$py = @(
  (Get-Command pythonw.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source),
  (Get-Command python.exe  -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source),
  (Get-ChildItem "$env:LOCALAPPDATA\Programs\Python\Python3*\python.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName)
) | Where-Object { $_ } | Select-Object -First 1
if (-not $py) { Log 'LOI: khong thay python de nhoi mod'; exit 1 }
$cdp = Join-Path $dir 'cdp.py'

if ($Eval) { & $py $cdp eval $Eval; exit 0 }

$kq = & $py $cdp mod 2>&1
Log "Da nhoi mod: $kq"
$kq
