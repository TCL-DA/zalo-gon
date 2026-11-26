# Build thanh-tcl.exe (Rust + wry/WebView2) roi cai vao thu muc web cua ban that.
#   powershell -File build.ps1            -> build + cai + bat lai
#   powershell -File build.ps1 -ChiBuild  -> chi build
# Toolchain GNU: dung MinGW-w64 F:\Tools\mingw64 (gcc WinLibs hong voi dau cach trong "Legion 7 Pro").
# Ban GNU link WebView2Loader.dll dong -> PHAI de canh exe.
param([switch]$ChiBuild, [string]$Dich = "$env:USERPROFILE\Tools\zalo-gon\web")
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$mingw = 'F:\Tools\mingw64\bin'
$env:PATH = "$env:USERPROFILE\.cargo\bin;$mingw;" + (($env:PATH -split ';' | Where-Object { $_ -notmatch 'WinLibs|WinGet\\Links' }) -join ';')
$env:CARGO_TARGET_DIR = 'C:\Users\Public\cargo-target\thanh-tcl'
Push-Location $here
try { cargo build --release; if ($LASTEXITCODE) { throw "cargo build loi $LASTEXITCODE" } } finally { Pop-Location }
$exe = Join-Path $env:CARGO_TARGET_DIR 'release\thanh-tcl.exe'
$dll = Get-ChildItem (Join-Path $env:CARGO_TARGET_DIR 'release\build') -Recurse -Filter WebView2Loader.dll |
    Where-Object { $_.Directory.Name -eq 'x64' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $dll) { throw 'Khong thay WebView2Loader.dll (x64)' }
"Build xong: $exe ($([math]::Round((Get-Item $exe).Length/1KB)) KB)"
if ($ChiBuild) { return }

Get-Process thanh-tcl -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 600
Copy-Item $exe (Join-Path $Dich 'thanh-tcl.exe') -Force
Copy-Item $dll.FullName (Join-Path $Dich 'WebView2Loader.dll') -Force
"Da cai vao $Dich"
