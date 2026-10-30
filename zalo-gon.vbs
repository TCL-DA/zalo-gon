' Mo "Zalo gon" an hoan toan (khong nhay cua so PowerShell) - lối tắt Zalo tren Desktop / Start tro vao day.
Set fso = CreateObject("Scripting.FileSystemObject")
ps1 = fso.GetParentFolderName(WScript.ScriptFullName) & "\zalo-gon.ps1"
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """", 0, False
