param(
    [string]$RenderUrl = "https://blend-in-or-bust-server.onrender.com",
    [string]$Version = "0.19.11"
)

$ErrorActionPreference = "Stop"

if ($RenderUrl -notmatch '^https://[^/]+$') {
    throw "RenderUrl must look like https://your-service.onrender.com with no path or trailing slash."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$webSocketUrl = $RenderUrl -replace '^https://', 'wss://'
$env:VITE_SERVER_URL = $webSocketUrl

Write-Host "Building itch.io client for $webSocketUrl" -ForegroundColor Cyan
npm run build -w client
if ($LASTEXITCODE -ne 0) {
    throw "The client build failed."
}

$distPath = Join-Path $projectRoot "client\dist"
$indexPath = Join-Path $distPath "index.html"
if (-not (Test-Path $indexPath)) {
    throw "client\dist\index.html was not created."
}

$releasePath = Join-Path $projectRoot "release"
New-Item -ItemType Directory -Force -Path $releasePath | Out-Null
$zipPath = Join-Path $releasePath "Blend-in-or-Bust-v$Version-itch.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $distPath "*") -DestinationPath $zipPath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $hasRootIndex = $archive.Entries | Where-Object { $_.FullName -eq "index.html" }
    if (-not $hasRootIndex) {
        throw "ZIP validation failed: index.html is not at the ZIP root."
    }
}
finally {
    $archive.Dispose()
}

Write-Host "Created: $zipPath" -ForegroundColor Green
Write-Host "Server:  $webSocketUrl" -ForegroundColor Green
