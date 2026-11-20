# zalo-canh: canh chung Zalo. Mo Zalo kieu gi (bieu tuong goc, thanh tac vu, tu khoi dong cung may)
# thi vai giay sau cung duoc chen "Zalo gon" + ao giao dien -> khong con canh mo nham ban khong co mod.
#   zalo-canh.ps1            -> canh mai (dung cho loi tat trong Startup, chay an bang zalo-canh.vbs)
#   zalo-canh.ps1 -MotLan    -> kiem 1 lan roi thoat
# Cach lam: Zalo dang chay ma thieu cong go loi / thieu mod thi goi zalo-gon.ps1.
# zalo-gon.ps1 se tu mo lai Zalo kem cong neu can - nen HOAN KHI DANG GOI (ZaloCall.exe).
param([switch]$MotLan, [int]$Giay = 8)
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$gon = Join-Path $dir 'zalo-gon.ps1'

function Ghi($msg) {
  try { Add-Content (Join-Path $dir 'zalo-canh.log') "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" -Encoding UTF8 } catch { }
}

# Moi luc 1 ban canh (mo nhieu loi tat cung luc khong sinh ra nhieu vong lap)
$mutex = New-Object System.Threading.Mutex($false, 'Global\OtlZaloCanh')
if (-not $mutex.WaitOne(0)) { exit 0 }

function Bat-CauNoi {
  $pyw = @(
    (Get-ChildItem "$env:LOCALAPPDATA\Programs\Python\Python3*\pythonw.exe" -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName),
    (Get-Command pythonw.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
  ) | Where-Object { $_ } | Select-Object -First 1
  if ($pyw) { Start-Process $pyw -ArgumentList "`"$(Join-Path $dir 'bridge.py')`"" -WorkingDirectory $dir -WindowStyle Hidden }
  else { Ghi 'CANH BAO: khong thay pythonw.exe - khong bat duoc cau noi' }
}

$hong = 0   # dem lan hong lien tiep -> nghi lau hon, khong quay Zalo lien tuc
$vong = 0   # dem vong de kiem cau noi thua hon (Get-CimInstance ton ~0,1 s)
do {
  try {
    $zalo = Get-Process Zalo -ErrorAction SilentlyContinue
    # Zalo ban 11/2026 LUON chay san ZaloCall.exe (khong cua so) -> chi coi la DANG GOI
    # khi ZaloCall co cua so chinh that; neu khong, nguoi canh se khong bao gio chen duoc mod.
    $goi  = @(Get-Process ZaloCall -ErrorAction SilentlyContinue |
              Where-Object { $_.MainWindowHandle -ne 0 })
    if ($goi.Count -eq 0) { $goi = $null }
    if ($zalo -and -not $goi) {
      # Da chen chua? -Eval tu mo lai Zalo kem cong neu Zalo dang chay kieu thuong.
      $co = & $gon -Eval '!!window.__otlGonG' 2>$null | Select-Object -Last 1
      if ("$co" -ne 'True') {
        & $gon | Out-Null
        $da = & $gon -Eval '!!window.__otlGonG' 2>$null | Select-Object -Last 1
        if ("$da" -eq 'True') { Ghi 'Da chen lai Zalo gon (Zalo duoc mo khong qua loi tat)'; $hong = 0 }
        else { $hong++; Ghi "Chen khong duoc (lan $hong)" }
      } else {
        $hong = 0
        # Mod con nhung cau noi bridge.py chet (20/11/2026) -> nut AI im lang. Kiem moi ~40 s.
        $vong++
        if ($vong % 5 -eq 1) {
          $br = @(Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" -ErrorAction SilentlyContinue |
                  Where-Object { $_.CommandLine -match 'zalo-gon\\bridge\.py' })
          if ($br.Count -eq 0) { Bat-CauNoi; Ghi 'Cau noi bridge.py khong chay - da bat lai' }
        }
      }
    }
  } catch {
    $hong++
    $e = $_.Exception; while ($e.InnerException) { $e = $e.InnerException }
    Ghi "LOI: $($e.Message)"
  }
  if ($MotLan) { break }
  # Hong lien tiep thi gian cach tang dan, toi da 5 phut
  Start-Sleep -Seconds ([Math]::Min($Giay * [Math]::Max(1, $hong), 300))
} while ($true)

$mutex.ReleaseMutex()
