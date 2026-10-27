# Installer Verification Script — IDeV Advanced Pro
param (
    [string]$InstallerPath = "release\IDeV-Advanced-Pro-Setup-1.0.0.exe",
    [string]$ExpectedHash = "a2bea77be3cf620bfc0eccad048d9f2b03d0b0c809548e28175d8c3326bd5f58"
)

if (-not (Test-Path $InstallerPath)) {
    if (Test-Path "..\release\IDeV-Advanced-Pro-Setup-1.0.0.exe") {
        $InstallerPath = "..\release\IDeV-Advanced-Pro-Setup-1.0.0.exe"
    } elseif (Test-Path "github-release\output\IDeV-Advanced-Pro-Setup-1.0.0.exe") {
        $InstallerPath = "github-release\output\IDeV-Advanced-Pro-Setup-1.0.0.exe"
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
