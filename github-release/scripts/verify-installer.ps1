# Installer Verification Script — IDeV Advanced Pro
param (
    [string]$InstallerPath = "release\IDeV-Advanced-Pro-Setup-3.8.9.exe",
    [string]$ExpectedHash = "a55e18d0d7f0e79f19a6b49d4d0f225e5ecdde8d3c2a864da34bd3c34278dc61"
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
