[Setup]
; Basic Installer Info
AppName=Install Helper
AppVersion=1.0
DefaultDirName={pf}\Install Helper
DefaultGroupName=Install Helper
UninstallDisplayIcon={app}\node.exe
Compression=lzma2
SolidCompression=yes
OutputDir=Output
OutputBaseFilename=Install_Helper_Setup
; Request Administrator privileges (Required to install a Windows Service)
PrivilegesRequired=admin

[Files]
; IMPORTANT: You must compile this from the "client" folder!
Source: "src\client.js"; DestDir: "{app}\src"; Flags: ignoreversion
Source: "install-service.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall-service.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\winvnc.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
; Run the node-windows install script quietly after files are copied
; We pass {srcexe} so the script can extract the unique deployment key from the filename
Filename: "node.exe"; Parameters: """{app}\install-service.js"" ""{srcexe}"""; Flags: runhidden runascurrentuser

[UninstallRun]
; Run the node-windows uninstall script quietly before files are deleted
Filename: "node.exe"; Parameters: """{app}\uninstall-service.js"""; Flags: runhidden runascurrentuser
