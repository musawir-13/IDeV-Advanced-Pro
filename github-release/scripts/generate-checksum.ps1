# Release Checksum Generator — IDeV Advanced Pro
param (
    [string]$InstallerPath = "..\release\IDeV-Advanced-Pro-Setup-3.8.9.exe",
    [string]$OutputPath = "..\github-release\output\IDeV-Advanced-Pro-Setup-3.8.9.exe.sha256"
)

if (-not (Test-Path $InstallerPath)) {
    Write-Error "Installer not found at $InstallerPath"
    exit 1
}

$hash = (Get-FileHash -Path $InstallerPath -Algorithm SHA256).Hash.ToLower()
$filename = Split-Path -Leaf $InstallerPath
$content = "$hash  $filename"
Set-Content -Path $OutputPath -Value $content -Encoding ascii
Write-Host "Generated checksum for $filename`: $hash"
