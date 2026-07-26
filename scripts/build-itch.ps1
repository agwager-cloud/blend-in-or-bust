param(
    [string]$RenderUrl = "https://blend-in-or-bust-server.onrender.com",
    [string]$Version = "0.19.19"
)

$ErrorActionPreference = "Stop"

if ($RenderUrl -notmatch '^https://[^/]+$') {
    throw "RenderUrl must look like https://your-service.onrender.com with no path or trailing slash."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "itch-zip-utils.ps1")
Set-Location $projectRoot

# School-network rule: the browser build connects through the normal
# Colyseus route and must never perform a separate /health preflight.
$clientSourcePath = Join-Path $projectRoot "client\src"
$sourceHealthReference = Get-ChildItem $clientSourcePath -Recurse -File |
    Select-String -SimpleMatch "/health" -ErrorAction SilentlyContinue
if ($sourceHealthReference) {
    $locations = ($sourceHealthReference | ForEach-Object { "$($_.Path):$($_.LineNumber)" }) -join ", "
    throw "School-network safeguard failed: /health was found in browser source at $locations"
}

$webSocketUrl = $RenderUrl -replace '^https://', 'wss://'
$env:VITE_SERVER_URL = $webSocketUrl

Write-Host "Building itch.io client for $webSocketUrl" -ForegroundColor Cyan
Write-Host "No browser /health preflight will be included." -ForegroundColor DarkCyan
npm run build -w client
if ($LASTEXITCODE -ne 0) {
    throw "The client build failed."
}

$distPath = Join-Path $projectRoot "client\dist"
$indexPath = Join-Path $distPath "index.html"
if (-not (Test-Path $indexPath)) {
    throw "client\dist\index.html was not created."
}

$browserBuildFiles = Get-ChildItem $distPath -Recurse -File |
    Where-Object { $_.Extension -in @(".html", ".js", ".css") }
$builtHealthReference = $browserBuildFiles |
    Select-String -SimpleMatch "/health" -ErrorAction SilentlyContinue
if ($builtHealthReference) {
    $locations = ($builtHealthReference | ForEach-Object { "$($_.Path):$($_.LineNumber)" }) -join ", "
    throw "School-network safeguard failed: /health was found in the browser build at $locations"
}

# Verify that itch.io can resolve every generated script and stylesheet from
# the nested HTML iframe path. Absolute root URLs cause 404 errors on itch.io.
$indexContents = Get-Content $indexPath -Raw
if ($indexContents -match '(?:src|href)="/') {
    throw "itch.io path validation failed: index.html contains a root-relative script or stylesheet URL."
}
$assetReferences = [regex]::Matches($indexContents, '(?:src|href)="([^"#?]+)"')
foreach ($match in $assetReferences) {
    $reference = $match.Groups[1].Value
    if ($reference -match '^(?:https?:|data:|blob:)') { continue }
    $relativeReference = $reference -replace '^\./', ''
    $localReference = $relativeReference -replace '/', [IO.Path]::DirectorySeparatorChar
    $targetPath = Join-Path $distPath $localReference
    if (-not (Test-Path $targetPath)) {
        throw "itch.io path validation failed: index.html references missing file $reference"
    }
}

$absolutePublicReferences = $browserBuildFiles |
    Select-String -Pattern '["'']\/assets\/|url\(["'']?\/assets\/' -ErrorAction SilentlyContinue
if ($absolutePublicReferences) {
    $locations = ($absolutePublicReferences | ForEach-Object { "$($_.Path):$($_.LineNumber)" }) -join ", "
    throw "itch.io path validation failed: an absolute /assets/ browser URL remains at $locations"
}

$releasePath = Join-Path $projectRoot "release"
New-Item -ItemType Directory -Force -Path $releasePath | Out-Null
$zipPath = Join-Path $releasePath "Blend-in-or-Bust-v$Version-itch.zip"

# Create standards-compliant ZIP entries using forward slashes. This prevents
# itch.io 404s where index.html asks for assets/file.js but the Windows archive
# stored the same file as assets\file.js.
New-ItchArchive -SourceDirectory $distPath -DestinationZip $zipPath
Test-ItchArchive -ZipPath $zipPath

Write-Host "Created: $zipPath" -ForegroundColor Green
Write-Host "Server:  $webSocketUrl" -ForegroundColor Green
Write-Host "Verified: exact index assets exist, forward-slash ZIP paths, ASCII-safe UI text, loading screens, and no /health request." -ForegroundColor Green
