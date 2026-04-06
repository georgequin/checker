[Setup]
; Basic Installer Info
AppName=RMM Agent
AppVersion=1.0
DefaultDirName={pf}\RMM Agent
DefaultGroupName=RMM Agent
UninstallDisplayIcon={app}\node.exe
Compression=lzma2
SolidCompression=yes
OutputDir=Output
OutputBaseFilename=RMM_Agent_Setup
; Request Administrator privileges (Required to install a Windows Service)
PrivilegesRequired=admin

[Files]
; IMPORTANT: You must compile this from the "client" folder!
Source: "src\client.js"; DestDir: "{app}\src"; Flags: ignoreversion
Source: "install-service.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall-service.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "winvnc.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
; Run the node-windows install script quietly after files are copied
Filename: "node.exe"; Parameters: """{app}\install-service.js"""; Flags: runhidden runascurrentuser

[UninstallRun]
; Run the node-windows uninstall script quietly before files are deleted
Filename: "node.exe"; Parameters: """{app}\uninstall-service.js"""; Flags: runhidden runascurrentuser
