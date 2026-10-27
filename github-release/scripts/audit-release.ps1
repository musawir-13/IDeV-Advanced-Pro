# Release Audit Script — IDeV Advanced Pro v1.0.0
$ErrorActionPreference = "Continue"

Write-Host "=================================================="
Write-Host "  IDeV Advanced Pro v1.0.0 -- Release Audit Script"
Write-Host "=================================================="

$passCount = 0
$failCount = 0

function Check-Result($title, $condition, $details = "") {
    if ($condition) {
        Write-Host "  [PASS] $title" -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host "  [FAIL] $title ($details)" -ForegroundColor Red
        $script:failCount++
    }
}

# 1. Required release files check
$requiredFiles = @(
    "github-release\README.md",
    "github-release\INSTALLATION.md",
    "github-release\PRIVACY.md",
    "github-release\SECURITY.md",
    "github-release\CHANGELOG.md",
    "github-release\THIRD_PARTY_NOTICES.md",
    "github-release\release-notes.md",
    "github-release\release-manifest.json",
    "github-release\output\IDeV-Advanced-Pro-Setup-1.0.0.exe.sha256"
)

foreach ($f in $requiredFiles) {
    Check-Result "File exists: $f" (Test-Path $f)
}

# 2. Installer validation
$installerPath = "release\IDeV-Advanced-Pro-Setup-1.0.0.exe"
$installerExists = Test-Path $installerPath
Check-Result "Installer executable exists" $installerExists

if ($installerExists) {
    $size = (Get-Item $installerPath).Length
    Check-Result "Installer size exceeds 50 MB" ($size -gt 52428800) "Size: $size bytes"
    
    $hash = (Get-FileHash -Path $installerPath -Algorithm SHA256).Hash.ToLower()
    $expected = "e4367b7d78d3e9ad5eaf964f2f08b87505147cab0b25a5e8e94884088f7f10fc"
    Check-Result "SHA256 checksum matches release manifest" ($hash -eq $expected) "Hash: $hash"
}

# 3. Model catalog validation
$localCatalogPath = "Storage\models\catalog.json"
$cloudCatalogPath = "Storage\cloud models\catalog.json"

Check-Result "Local catalog exists" (Test-Path $localCatalogPath)
Check-Result "Cloud catalog exists" (Test-Path $cloudCatalogPath)

if ((Test-Path $localCatalogPath) -and (Test-Path $cloudCatalogPath)) {
    $localModels = (Get-Content $localCatalogPath -Raw | ConvertFrom-Json)
    $cloudModels = (Get-Content $cloudCatalogPath -Raw | ConvertFrom-Json)
    Check-Result "Local models count exceeds 1000" ($localModels.Length -gt 1000) "Found: $($localModels.Length)"
    Check-Result "Cloud models count exceeds 20" ($cloudModels.Length -gt 20) "Found: $($cloudModels.Length)"
}

# 4. Gitignore safety
$gi = Get-Content .gitignore -Raw
Check-Result ".gitignore blocks release executables" ($gi -match "\*\.exe")
Check-Result ".gitignore blocks private chats" ($gi -match "Storage/chats/")
Check-Result ".gitignore blocks model blobs" ($gi -match "Storage/models/blobs/")

Write-Host "=================================================="
Write-Host "Audit Results: $passCount passed, $failCount failed"
if ($failCount -eq 0) {
    Write-Host "ALL RELEASE CHECKS PASSED SUCCESSFULLY!" -ForegroundColor Green
} else {
    Write-Host "SOME CHECKS FAILED -- REVIEW LOGS" -ForegroundColor Yellow
}
