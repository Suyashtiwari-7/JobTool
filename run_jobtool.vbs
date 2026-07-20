Set WshShell = CreateObject("WScript.Shell")
' Run batch file silently in background
WshShell.Run chr(34) & WshShell.CurrentDirectory & "\run_jobtool.bat" & Chr(34), 0
Set WshShell = Nothing
