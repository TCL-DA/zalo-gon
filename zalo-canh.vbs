' Chay "nguoi canh" Zalo an hoan toan (khong nhay cua so PowerShell).
' Loi tat trong Startup tro vao day -> mo Zalo kieu gi cung duoc chen Zalo gon + ao giao dien.
'
' 05/11/2026: KHONG goi thang powershell nua. Windows Terminal dang la terminal mac dinh,
' no BO QUA -WindowStyle Hidden -> van ve ra mot cua so den tren thanh tac vu.
' Phai qua chay-an.exe (tao tien trinh voi co CREATE_NO_WINDOW) thi moi an that.
Set fso = CreateObject("Scripting.FileSystemObject")
' 20/11/2026: zalo-gon.exe (Rust) thay zalo-canh.ps1 + bridge.py - 1 tien trinh vai MB, khong cua so.
exe = fso.GetParentFolderName(WScript.ScriptFullName) & "\zalo-gon.exe"
If fso.FileExists(exe) Then
  CreateObject("WScript.Shell").Run """" & exe & """", 0, False
  WScript.Quit
End If
ps1 = fso.GetParentFolderName(WScript.ScriptFullName) & "\zalo-canh.ps1"
an  = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)) & "\chay-an.exe"

lenh = """" & an & """ ""C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe"" " & _
       "-NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """"

If fso.FileExists(an) Then
  CreateObject("WScript.Shell").Run lenh, 0, False
Else
  ' Du phong: thieu chay-an.exe thi chay kieu cu (co the nhay cua so).
  CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """", 0, False
End If
