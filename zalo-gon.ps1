# Zalo gon: mo Zalo kem cong go loi (chi 127.0.0.1), chen cac tinh nang trong modules\*.js (kem cau-hinh.json)
# va bat cau noi bridge.py. Khong sua file nao cua Zalo. Dung:
#   zalo-gon.ps1                 -> mo Zalo (neu chua mo) + chen tinh nang + bat cau noi
#   zalo-gon.ps1 -Eval "<js>"    -> chay 1 bieu thuc JS trong cua so chinh Zalo, in ket qua (de do giao dien)
param([string]$Eval)
$ErrorActionPreference = 'Stop'
$port = 9333
$dir  = Split-Path -Parent $MyInvocation.MyCommand.Path
# Loi tat chay an (zalo-gon.vbs) nen moi thong bao bi vut -> ghi them vao zalo-gon.log
# (26/10: chen hong luc mo may ma khong de lai dau vet)
function Write-Log($msg) {
  $msg
  try { Add-Content (Join-Path $dir 'zalo-gon.log') "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" -Encoding UTF8 } catch { }
}
trap {
  $e = $_.Exception; while ($e.InnerException) { $e = $e.InnerException }
  Write-Log "LOI: $($e.GetType().Name): $($e.Message) | $($_.InvocationInfo.PositionMessage -replace '\s+', ' ')"
  exit 1
}
# Mo thang ban moi nhat trong thu muc Zalo-<phien ban> (trinh khoi chay o goc co the khong chuyen tham so)
$zaloExe = Get-ChildItem "$env:LOCALAPPDATA\Programs\Zalo\Zalo-*\Zalo.exe" |
  Sort-Object { [version]($_.Directory.Name -replace '^Zalo-','') } -Descending | Select-Object -First 1 -ExpandProperty FullName
# Mo tu VS Code/terminal Electron thi bien nay lam Zalo chay nhu Node roi thoat ngay
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

function Get-Targets {
  # PowerShell 5.1 tra mang JSON thanh 1 doi tuong -> ForEach de tach tung trang
  try { Invoke-RestMethod "http://127.0.0.1:$port/json" -TimeoutSec 2 | ForEach-Object { $_ } } catch { $null }
}

function Invoke-Cdp($wsUrl, [object[]]$messages) {
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $cts = New-Object System.Threading.CancellationTokenSource 15000
  $ws.ConnectAsync([Uri]$wsUrl, $cts.Token).Wait()
  $results = @{}
  $id = 0
  foreach ($m in $messages) {
    $id++
    $m.id = $id
    $bytes = [Text.Encoding]::UTF8.GetBytes(($m | ConvertTo-Json -Depth 10 -Compress))
    $ws.SendAsync((New-Object 'ArraySegment[byte]' -ArgumentList (,$bytes)), [Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()
    # Doc toi khi gap tra loi dung id (bo qua su kien)
    while ($true) {
      $buf = New-Object byte[] 1048576
      $sb = New-Object Text.StringBuilder
      do {
        $r = $ws.ReceiveAsync((New-Object 'ArraySegment[byte]' -ArgumentList (,$buf)), $cts.Token).Result
        [void]$sb.Append([Text.Encoding]::UTF8.GetString($buf, 0, $r.Count))
      } while (-not $r.EndOfMessage)
      $obj = $sb.ToString() | ConvertFrom-Json
      if ($obj.id -eq $id) { $results[$id] = $obj; break }
    }
  }
  # Chromium hay cat ket noi khong theo thu tuc dong -> bo qua loi luc dong
  try { $ws.CloseAsync([Net.WebSockets.WebSocketCloseStatus]::NormalClosure, '', $cts.Token).Wait() } catch {}
  $results
}

function Get-MainPage {
  $t = Get-Targets
  if (-not $t) { return $null }
  # Cua so chinh = pc-dist/index.html (luc moi mo tieu de con trong nen khong chon theo tieu de;
  # znotification.html / shared-worker.html la trang phu)
  $t | Where-Object { $_.type -eq 'page' -and $_.url -match 'pc-dist/index\.html' } | Select-Object -First 1
}

# ---- Mo Zalo kem cong neu can
$page = Get-MainPage
if (-not $page) {
  if (Get-Process Zalo -ErrorAction SilentlyContinue) {
    Get-Process Zalo | Stop-Process -Force   # dang mo kieu thuong -> mo lai kem cong
    Start-Sleep -Seconds 2
  }
  # Thumbnail chat moi -> SSD truoc khi mo (Zalo dang tat moi doi duoc thu muc); loi thi van mo Zalo
  try { & (Join-Path $dir 'cache-ssd.ps1') -Phase auto | Out-Null } catch { }
  # 19/10: bi cua so khac che, Chromium cho Zalo "ngu" (bo ban ve) -> bam qua lai phai ve lai tu dau, khung.
  # Giu Zalo luon ve san de chuyen cua so tuc thi (120 Hz).
  $smooth = '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'
  Start-Process $zaloExe -WorkingDirectory (Split-Path $zaloExe) -ArgumentList (@("--remote-debugging-port=$port", '--remote-debugging-address=127.0.0.1') + $smooth)
  for ($i = 0; $i -lt 60 -and -not $page; $i++) { Start-Sleep -Milliseconds 500; $page = Get-MainPage }
  if (-not $page) { throw "Khong ket noi duoc cong $port cua Zalo" }
}
# Cho giao dien dung xong (co #conversationListId) - toi da ~40 s
for ($i = 0; $i -lt 40; $i++) {
  $ready = (Invoke-Cdp $page.webSocketDebuggerUrl @(@{ method = 'Runtime.evaluate'; params = @{ expression = '!!document.getElementById("conversationListId")'; returnByValue = $true } }))[1].result.result.value
  if ($ready) { break }
  Start-Sleep -Seconds 1
}

if ($Eval) {
  $r = Invoke-Cdp $page.webSocketDebuggerUrl @(@{ method = 'Runtime.evaluate'; params = @{ expression = $Eval; returnByValue = $true } })
  $r[1].result.result.value
  exit 0
}

# ---- Ghep cau hinh + cac tinh nang thanh 1 doan ma; moi file boc try/catch de 1 file loi khong keo ca bo
# (Page.addScriptToEvaluateOnNewDocument bi treo tren Zalo 26.10 -> chen thang bang Runtime.evaluate)
$cfg = Get-Content (Join-Path $dir 'cau-hinh.json') -Raw -Encoding UTF8
$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine("window.__otlGonErr = []; window.__otlGonCfg = $cfg;")
foreach ($f in Get-ChildItem (Join-Path $dir 'modules') -Filter '*.js' | Sort-Object Name) {
  $code = Get-Content $f.FullName -Raw -Encoding UTF8
  [void]$sb.AppendLine("try {`n$code`n} catch (e) { console.error('[zalo-gon] $($f.Name)', e); window.__otlGonErr.push('$($f.Name): ' + e.message); }")
}
[void]$sb.AppendLine("JSON.stringify({ ok: !!window.__otlGonG, loi: window.__otlGonErr })")
# Luc moi mo may Zalo con nap ~1.500 cuoc -> lenh chen co the qua 15 s hoac roi vao luc trang chua xong.
# Thu toi da 4 lan, cach 10 s; hong het moi bao loi.
$kq = $null; $loiChen = ''
for ($lan = 1; $lan -le 4 -and -not $kq.ok; $lan++) {
  try {
    $page = Get-MainPage
    $r = Invoke-Cdp $page.webSocketDebuggerUrl @(@{ method = 'Runtime.evaluate'; params = @{ expression = $sb.ToString(); returnByValue = $true } })
    $kq = $r[1].result.result.value | ConvertFrom-Json
    $loiChen = $r[1].result.exceptionDetails.text
  } catch {
    $e = $_.Exception; while ($e.InnerException) { $e = $e.InnerException }
    $loiChen = $e.Message
  }
  if (-not $kq.ok) { Write-Log "Chen lan $lan hong: $loiChen"; Start-Sleep -Seconds 10 }
}
if (-not $kq.ok) { Write-Log "LOI: chen khong duoc sau 4 lan: $loiChen"; exit 1 }
if ($kq.loi.Count) { Write-Log "Chen xong nhung co tinh nang loi: $($kq.loi -join ' | ')" } else { Write-Log "Da chen Zalo gon (F1 trong Zalo xem phim tat)" }

# ---- Cau noi bridge.py (sua tieng Anh, Trello, luu file). Moi luc 1 ban (mutex), tu thoat khi Zalo dong.
# Tim pythonw: ban cai cho nguoi dung, roi Program Files, roi PATH
$pyw = @(
  (Get-ChildItem "$env:LOCALAPPDATA\Programs\Python\Python3*\pythonw.exe" -ErrorAction SilentlyContinue |
     Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName),
  (Get-ChildItem "$env:ProgramFiles\Python3*\pythonw.exe" -ErrorAction SilentlyContinue |
     Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName),
  (Get-Command pythonw.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
) | Where-Object { $_ } | Select-Object -First 1
if ($pyw) {
  Start-Process $pyw -ArgumentList "`"$(Join-Path $dir 'bridge.py')`"" -WorkingDirectory $dir -WindowStyle Hidden
} else { Write-Log "CANH BAO: khong thay pythonw.exe - cau noi (bridge.py) khong chay" }
