# Installer Verification Script — IDeV Advanced Pro
param (
    [string]$InstallerPath = "release\IDeV-Advanced-Pro-Setup-3.8.9.exe",
    [string]$ExpectedHash = "d5375feaa52d3e91c6a1dc7d3c720e6585e70b533055a0c06ed70d7f5d7d5b19"
)

if (-not (Test-Path $InstallerPath)) {
    if (Test-Path "..\release\IDeV-Advanced-Pro-Setup-3.8.9.exe") {
        $InstallerPath = "..\release\IDeV-Advanced-Pro-Setup-3.8.9.exe"
    } elseif (Test-Path "github-release\output\IDeV-Advanced-Pro-Setup-3.8.9.exe") {
        $InstallerPath = "github-release\output\IDeV-Advanced-Pro-Setup-3.8.9.exe"
    }
}

Write-Host "Verifying installer artifact: $InstallerPath"
if (-not (Test-Path $InstallerPath)) {
    Write-Host "[FAIL] Installer file not found!" -ForegroundColor Red
    exit 1
}

$fileItem = Get-Item $InstallerPath
Write-Host "File size: $([math]::Round($fileItem.Length / 1MB, 2)) MB ($($fileItem.Length) bytes)"

$actualHash = (Get-FileHash -Path $InstallerPath -Algorithm SHA256).Hash.ToLower()
Write-Host "Computed SHA256: $actualHash"
Write-Host "Expected SHA256: $ExpectedHash"

if ($actualHash -eq $ExpectedHash) {
    Write-Host "[PASS] SHA256 checksum matched successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] SHA256 checksum mismatch!" -ForegroundColor Red
    exit 1
}
