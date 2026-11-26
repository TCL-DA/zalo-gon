# Nguoi canh (zalo-gon.exe ban web, ung-dung.json) goi file nay khi trang Zalo Web mat mod / nap lai.
# CHI nhoi mod vao cua so dang mo - KHONG tu mo cua so Zalo Web (nguoi dung dong thi de yen).
& (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'zalo-web.ps1') -ChiMod
exit $LASTEXITCODE
