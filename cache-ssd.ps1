# cache-ssd: dua thu muc thumbnail cua Zalo (Cache / richThumb / fileThumb) tu HDD E: ve SSD C:.
# ZaloData\media la junction -> E:\ZaloMedia\media (18/10, HDD). Doi chat Zalo doc thumbnail trong cac thu muc nay
# -> de tren HDD bi khung (dia tu tat, tim kim cham). Moi thu muc: chep sang SSD, doi ten ban HDD, dat junction cho cu.
#   -Phase copy  : chep truoc (Zalo VAN CHAY duoc)
#   -Phase swap  : (Zalo PHAI TAT) chep phan moi + dat junction; ban HDD doi ten *.__hdd_cu
#   -Phase clean : so khop so file roi xoa *.__hdd_cu
#   -Phase auto  : copy + swap cho thu muc chua chuyen (zalo-gon.ps1 goi truoc khi mo Zalo)
# -Hdd: thu muc media that tren HDD (ZaloData\media tro vao do bang junction).
# Bo trong thi lay "duong_dan.zalo_media_hdd" trong cau-hinh.json; khong co nua thi khong lam gi.
param([ValidateSet('copy', 'swap', 'clean', 'auto')][string]$Phase = 'auto', [string]$Hdd = '')
$ErrorActionPreference = 'Stop'
if (-not $Hdd) {
  try { $Hdd = (Get-Content (Join-Path $PSScriptRoot 'cau-hinh.json') -Raw -Encoding UTF8 |
                ConvertFrom-Json).duong_dan.zalo_media_hdd } catch { $Hdd = '' }
}
$hdd = $Hdd
$ssd = "$env:LOCALAPPDATA\ZaloSSD"
$log = Join-Path $PSScriptRoot 'cache-ssd.log'
function Log($m) { $l = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m"; Add-Content $log $l -Encoding UTF8; $l }

if (-not $hdd) { Log 'Chua khai duong_dan.zalo_media_hdd - bo qua'; exit 0 }
if (-not (Test-Path $hdd)) { Log "Khong thay $hdd - bo qua"; exit 0 }

function IsJunction($p) { $i = Get-Item $p -Force -ErrorAction SilentlyContinue; return $i -and ($i.Attributes -band [IO.FileAttributes]::ReparsePoint) }

function Targets([string]$suffix = '') {
  foreach ($u in Get-ChildItem $hdd -Directory | Where-Object { $_.Name -match '^\d+$' }) {
    $dl = Join-Path $u.FullName 'ZaloDownloads'
    if (-not (Test-Path $dl)) { continue }
    foreach ($n in 'Cache', 'richThumb', 'fileThumb') { if (Test-Path "$dl\$n$suffix") { "$dl\$n$suffix" } }
    Get-ChildItem "$dl\resource" -Directory -ErrorAction SilentlyContinue | ForEach-Object { if (Test-Path "$($_.FullName)\Cache$suffix") { "$($_.FullName)\Cache$suffix" } }
  }
}
function SsdPath($p) { Join-Path $ssd $p.Substring($hdd.Length).TrimStart('\') }
function Copy-To($src, $dst) {
  robocopy $src $dst /E /COPY:DAT /DCOPY:T /XO /R:1 /W:1 /MT:8 /NP /NFL /NDL /NJH /NJS | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy loi $LASTEXITCODE : $src" }
}
function ZaloRunning { [bool](Get-Process Zalo -ErrorAction SilentlyContinue) }

$todo = @(Targets | Where-Object { -not (IsJunction $_) })
if ($Phase -eq 'auto' -and -not $todo.Count) { exit 0 }      # khong co chat moi -> mo Zalo ngay

if ($Phase -in 'copy', 'auto') {
  $i = 0
  foreach ($p in $todo) { $i++; Copy-To $p (SsdPath $p); if ($i % 100 -eq 0) { Log "copy $i/$($todo.Count)" } }
  Log "copy xong $($todo.Count) thu muc"
}
if ($Phase -in 'swap', 'auto') {
  if (ZaloRunning) { Log 'swap: Zalo dang chay - bo qua (tat Zalo truoc)'; if ($Phase -eq 'swap') { exit 2 } else { exit 0 } }
  $ok = 0
  foreach ($p in $todo) {
    $dst = SsdPath $p
    try {
      Copy-To $p $dst
      $old = "$p.__hdd_cu"
      if (Test-Path $old) { throw "da co $old" }
      Rename-Item $p (Split-Path $old -Leaf)
      New-Item -ItemType Junction -Path $p -Target $dst | Out-Null
      $ok++
    } catch {
      Log "swap LOI $p : $($_.Exception.Message)"
      if (-not (Test-Path $p) -and (Test-Path "$p.__hdd_cu")) { Rename-Item "$p.__hdd_cu" (Split-Path $p -Leaf) }   # tra lai nhu cu
    }
  }
  Log "swap xong $ok/$($todo.Count) thu muc -> $ssd"
}
if ($Phase -in 'clean', 'auto') {
  $olds = @(Targets '.__hdd_cu' | ForEach-Object { Get-Item $_ -Force })
  $del = 0
  foreach ($o in $olds) {
    $live = $o.FullName -replace '\.__hdd_cu$', ''
    $nOld = @(Get-ChildItem $o.FullName -File -Recurse -Force -ErrorAction SilentlyContinue).Count
    $miss = @(Get-ChildItem $o.FullName -File -Recurse -Force -ErrorAction SilentlyContinue |
      Where-Object { -not (Test-Path ($live + $_.FullName.Substring($o.FullName.Length))) }).Count
    if ((IsJunction $live) -and $miss -eq 0) { Remove-Item $o.FullName -Recurse -Force; $del++ }
    else { Log "clean GIU $($o.FullName): $nOld file, thieu ben SSD $miss" }
  }
  Log "clean: xoa $del/$($olds.Count) ban HDD cu"
}
exit 0   # robocopy de lai $LASTEXITCODE 1 (= co chep file) -> khong coi la loi
