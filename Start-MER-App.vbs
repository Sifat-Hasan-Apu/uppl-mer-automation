Option Explicit

Dim shell, fileSystem, projectFolder, powershellScript, command
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")

projectFolder = fileSystem.GetParentFolderName(WScript.ScriptFullName)
powershellScript = fileSystem.BuildPath(projectFolder, "Start-MER-App.ps1")
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & powershellScript & """"

shell.CurrentDirectory = projectFolder
shell.Run command, 0, False
