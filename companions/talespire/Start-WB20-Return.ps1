param(
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,
    [string]$SymbioteDirectory = (Join-Path $env:USERPROFILE 'AppData\LocalLow\BouncyRock Entertainment\TaleSpire\Symbiotes\WayBeyond20'),
    [switch]$InstallStartup
)
$ErrorActionPreference='Stop'
$nodeExecutable=(Get-Command node -ErrorAction Stop).Source
$helperPath=Join-Path $PSScriptRoot 'local-bridge.cjs'
if (!(Test-Path -LiteralPath (Join-Path $SymbioteDirectory 'manifest.json'))) { throw 'Install the WayBeyond20 Symbiote first.' }
if ($InstallStartup) {
    $startupPath=Join-Path ([Environment]::GetFolderPath('Startup')) 'WB20 TaleSpire Return.vbs'
    $startCommand='"'+$nodeExecutable+'" "'+$helperPath+'" '+$ExtensionId+' "'+$SymbioteDirectory+'"'
    $vbs='CreateObject("WScript.Shell").Run "'+$startCommand.Replace('"','""')+'", 0, False'
    [IO.File]::WriteAllText($startupPath,$vbs,[Text.Encoding]::Unicode)
    Write-Output 'Installed the current user startup entry for this existing local helper.'
}
if (Get-NetTCPConnection -State Listen -LocalPort 48874 -ErrorAction SilentlyContinue) {
    Write-Output 'Port 48874 already has a listener; did not start another helper.'
    return
}
$process=Start-Process -FilePath $nodeExecutable -ArgumentList @('"'+$helperPath+'"',$ExtensionId,'"'+$SymbioteDirectory+'"') -WindowStyle Hidden -PassThru
Write-Output "WB20 local return helper started (process $($process.Id)). Close it with Stop-Process -Id $($process.Id) when finished. It listens only on this computer."
