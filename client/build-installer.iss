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
Source: "src\winvnc.exe"; DestDir: "{app}\src"; Flags: ignoreversion
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
; Run the node-windows install script visibly after files are copied for debugging
; We use cmd.exe /k to leave the window open so we can see any errors that crashed the installer
Filename: "cmd.exe"; Parameters: "/k node ""{app}\install-service.js"" ""{srcexe}"""

[UninstallRun]
; Run the node-windows uninstall script quietly before files are deleted
Filename: "node.exe"; Parameters: """{app}\uninstall-service.js"""; Flags: runhidden runascurrentuser
