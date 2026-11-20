# zalo-gon.ps1 GIA: chi ghi dau vet de biet exe da goi chen lai (khong dung Zalo that).
Add-Content (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'ps1-da-goi.txt') (Get-Date -Format 'HH:mm:ss')
exit 0
