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
; Bundle the standalone executables created by "npm run build:all"
Source: "dist\rmm-client.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\install-service.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\uninstall-service.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\winvnc.exe"; DestDir: "{app}"; Flags: ignoreversion

[Run]
; Run the compiled install utility quietly after files are copied
; Parameters are passed to handle the dynamic deployment key discovery
Filename: "{app}\install-service.exe"; Parameters: """{srcexe}"""; Flags: runhidden runascurrentuser

[UninstallRun]
; Run the compiled uninstall utility quietly before files are deleted
Filename: "{app}\uninstall-service.exe"; Flags: runhidden runascurrentuser

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  // Before extracting files, abruptly stop locking services so we don't get Code 5: Access Denied
  if CurStep = ssInstall then
  begin
    Exec('cmd.exe', '/c net stop uvnc_service & taskkill /F /IM winvnc.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
