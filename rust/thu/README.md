# Thu zalo-gon.exe voi Zalo gia (19 canh)

Khong dung Zalo that: may chu CDP gia (cong 9444) + "Zalo.exe" gia (ban chep ping.exe) + "ZaloCall" gia
(cua so that, nam ngoai man hinh, khong gianh focus) + Python tho gia + zalo-gon.ps1 gia.
Exe thu chay song song ban that: ZALO_GON_PORT doi ca ten mutex; ZALO_GON_EXE / ZALO_GON_CALL_EXE doi ten tien trinh.

```powershell
powershell -File rust\build.ps1
$t = "$env:TEMP\zalo-gon-thu"; New-Item -ItemType Directory -Force $t | Out-Null
Copy-Item rust\thu\gia\bridge.py, rust\thu\gia\zalo-gon.ps1 $t
Copy-Item C:\Users\Public\cargo-target\zalo-gon\release\zalo-gon.exe $t
Copy-Item C:\Windows\System32\PING.EXE "$t\ZaloGia.exe"
powershell -NoProfile -Command "Add-Type -TypeDefinition (Get-Content rust\thu\gia\CallGia.cs -Raw) -ReferencedAssemblies System.Windows.Forms,System.Drawing -OutputAssembly $t\CallGia.exe -OutputType WindowsApplication"
python rust\thu\thu_zalo_gia.py $t      # ~2,5 phut; cuoi cung in "==== 19/19 PASS"
```

Canh: noi + binding, nut robot bat/tat, ROT KET NOI -> noi lai, Python treo / chet giua lenh (khong gui lai),
mat mod -> chen lai, mat cong 1 lan chua lam gi / 2 lan moi mo lai, Zalo tat han -> khong tu mo,
mo Zalo kieu thuong -> mo lai kem cong, dang goi -> de yen, goi xong -> chen lai.
