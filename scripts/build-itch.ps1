param(
    [string]$RenderUrl = "https://blend-in-or-bust-server.onrender.com",
    [string]$Version = "0.19.14"
)

$ErrorActionPreference = "Stop"

if ($RenderUrl -notmatch '^https://[^/]+$') {
    throw "RenderUrl must look like https://your-service.onrender.com with no path or trailing slash."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
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

    foreach ($entry in $archive.Entries) {
        if ($entry.FullName -notmatch '\.(html|js|css)$') { continue }
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        try {
            $contents = $reader.ReadToEnd()
            if ($contents.Contains("/health")) {
                throw "School-network safeguard failed: /health was found inside ZIP entry $($entry.FullName)"
            }
        }
        finally {
            $reader.Dispose()
            $stream.Dispose()
        }
    }
}
finally {
    $archive.Dispose()
}

Write-Host "Created: $zipPath" -ForegroundColor Green
Write-Host "Server:  $webSocketUrl" -ForegroundColor Green
Write-Host "Verified: itch.io browser ZIP contains no /health request." -ForegroundColor Green
