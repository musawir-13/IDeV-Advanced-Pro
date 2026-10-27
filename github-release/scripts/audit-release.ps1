# Release Audit & Privacy Safeguard Script — IDeV Advanced Pro
$ErrorActionPreference = "Continue"

Write-Host "=================================================="
Write-Host "  IDeV Advanced Pro -- Automated Release Safeguards"
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
    "github-release\output\IDeV-Advanced-Pro-Setup-3.8.9.exe.sha256"
)

foreach ($f in $requiredFiles) {
    Check-Result "File exists: $f" (Test-Path $f)
}

# 2. Strict Developer Storage Isolation Safeguards
Check-Result "Storage/models absent from public staging" (-not (Test-Path "github-release\Storage\models"))
Check-Result "Storage/cloud models absent from public staging" (-not (Test-Path "github-release\Storage\cloud models"))

# Check Git tracked index (must be 0 files in private model storage)
$trackedModels = (git ls-files "Storage/models" "Storage/cloud models")
Check-Result "Git tracking excludes private Storage/models and cloud models" ($null -eq $trackedModels -or $trackedModels.Length -eq 0) "Found: $($trackedModels.Length) tracked files"

# Check .gitignore rules
$gi = Get-Content .gitignore -Raw
Check-Result ".gitignore blocks Storage/models/" ($gi -match "Storage/models/")
Check-Result ".gitignore blocks Storage/cloud models/" ($gi -match "Storage/cloud models/")
Check-Result ".gitignore blocks release executables" ($gi -match "\*\.exe")
Check-Result ".gitignore blocks private chats" ($gi -match "Storage/chats/")

# Check package.json exclusion rules
$pkg = Get-Content package.json -Raw
Check-Result "package.json excludes !Storage/models/**" ($pkg -match "!Storage/models/\*\*")
Check-Result "package.json excludes !Storage/cloud models/**" ($pkg -match "!Storage/cloud models/\*\*")
Check-Result "package.json does not bundle private descriptors" (-not ($pkg -match '"Storage/models/descriptors'))

# Check for hardcoded developer paths
$mainJs = Get-Content main.js -Raw
$serverJs = Get-Content server.js -Raw
Check-Result "main.js has no hardcoded developer user paths" (-not ($mainJs -match "C:\\\\Users\\\\"))
Check-Result "server.js has no hardcoded developer user paths" (-not ($serverJs -match "C:\\\\Users\\\\"))

# 3. Installer validation
$installerPath = "release\IDeV-Advanced-Pro-Setup-3.8.9.exe"
$installerExists = Test-Path $installerPath
Check-Result "Installer executable exists" $installerExists

if ($installerExists) {
    $size = (Get-Item $installerPath).Length
    Check-Result "Installer size exceeds 50 MB" ($size -gt 52428800) "Size: $size bytes"
}

Write-Host "=================================================="
Write-Host "Audit Results: $passCount passed, $failCount failed"
if ($failCount -eq 0) {
    Write-Host "ALL RELEASE CHECKS AND PRIVACY SAFEGUARDS PASSED!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "CRITICAL SAFEGUARD FAILED -- REVIEW LOGS" -ForegroundColor Red
    exit 1
}
