# Zalo Web gon: mo app thanh-tcl.exe (Zalo Web trong WebView2, cong go loi 9334 chi 127.0.0.1) roi nhoi mod:
# cau-hinh.json + tinh nang ban PC (../modules, tru ao PC) + web/modules (ten "Thanh TCL", ao carbon).
# Khong dung Zalo PC, khong sua file nao cua Zalo.
#   zalo-web.ps1            -> mo (neu chua) + nhoi mod
#   zalo-web.ps1 -ChiMod    -> chi nhoi mod vao cua so dang mo
#   zalo-web.ps1 -Eval "js" -> chay 1 bieu thuc JS (do giao dien)
param([switch]$ChiMod, [string]$Eval)
$ErrorActionPreference = 'Stop'
$port = 9334
$dir  = Split-Path -Parent $MyInvocation.MyCommand.Path
function Log($m){ try{ Add-Content (Join-Path $dir 'zalo-web.log') "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" -Encoding UTF8 }catch{} ; $m }

function Targets { try { Invoke-RestMethod "http://127.0.0.1:$port/json" -TimeoutSec 2 | ForEach-Object { $_ } } catch { $null } }
function ZaloPage { Targets | Where-Object { $_.type -eq 'page' -and $_.url -match 'chat\.zalo\.me' } | Select-Object -First 1 }

# ---- Tu 26/11/2026 Zalo Web chay trong app thanh-tcl.exe (WebView2: X = an xuong khay), khong con cua so Chrome.
# Mo lan 2 khi app dang chay = app tu hien cua so.
if (-not $ChiMod) {
  $app = Join-Path $dir 'thanh-tcl.exe'
  if (-not (Test-Path $app)) { Log 'LOI: thieu thanh-tcl.exe'; exit 1 }
  Start-Process $app -WorkingDirectory $dir
  for ($i=0; $i -lt 40 -and -not (ZaloPage); $i++) { Start-Sleep -Milliseconds 500 }
  if (-not (ZaloPage)) { Log 'LOI: app Thanh TCL chua mo cong go loi'; exit 1 }
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
