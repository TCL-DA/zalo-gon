# Build zalo-gon.exe roi chep ra thu muc zalo-gon. Chay: powershell -File rust\build.ps1
# Bay (20/11/2026): thu muc user co dau cach (C:\Users\Ten Co Cach) ->
#  - gcc WinLibs (WinGet) dua default-manifest.o khong boc ngoac -> ld hong. Bo WinLibs khoi PATH,
#    de rustc dung gcc self-contained cua toolchain gnu.
#  - dlltool cung hong vi dau cach -> KHONG dung crate can raw-dylib (chrono ban moi, windows-link).
#  - target de o C:\Users\Public (khong dau cach).
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:CARGO_TARGET_DIR = 'C:\Users\Public\cargo-target\zalo-gon'
$env:Path = "$env:USERPROFILE\.cargo\bin;" + (($env:Path -split ';' | Where-Object { $_ -notmatch 'WinLibs|WinGet\\Links|mingw' }) -join ';')
Push-Location $here
try { cargo build --release; if ($LASTEXITCODE) { throw "cargo build loi $LASTEXITCODE" } } finally { Pop-Location }
$exe = Join-Path $env:CARGO_TARGET_DIR 'release\zalo-gon.exe'
$dich = Join-Path (Split-Path $here) 'zalo-gon.exe'
# Dang chay thi tat truoc khi chep (nguoi canh se khong tu bat lai - phai bat tay hoac qua zalo-canh.vbs)
Get-Process zalo-gon -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
Copy-Item $exe $dich -Force
"Da chep $dich ($([math]::Round((Get-Item $dich).Length/1KB)) KB)"
