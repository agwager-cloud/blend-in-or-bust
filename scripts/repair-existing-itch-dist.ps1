param(
    [string]$Version = "0.19.19"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "itch-zip-utils.ps1")
$distPath = Join-Path $projectRoot "client\dist"
$indexPath = Join-Path $distPath "index.html"

if (-not (Test-Path $indexPath)) {
    throw "client\dist\index.html was not found. Run npm run build once, then run this repair script again."
}

function Read-Utf8([string]$Path) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    return [System.IO.File]::ReadAllText($Path, $utf8)
}

function Write-Utf8([string]$Path, [string]$Contents) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Contents, $utf8)
}

Write-Host "Repairing the existing client\dist build for itch.io..." -ForegroundColor Cyan

# itch.io runs the game from a nested iframe URL. Root-relative references such
# as /assets/file.js incorrectly point at the root of html-classic.itch.zone.
$index = Read-Utf8 $indexPath
$index = $index.Replace('src="/assets/', 'src="./assets/')
$index = $index.Replace('href="/assets/', 'href="./assets/')
$index = $index.Replace('src="assets/', 'src="./assets/')
$index = $index.Replace('href="assets/', 'href="./assets/')

if ($index -notmatch 'id="boot-critical-styles"') {
    $criticalStyles = @'
<style id="boot-critical-styles">
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#080727}
  html:not(.app-ready) #app,html:not(.app-ready) #sound-toggle{visibility:hidden}
  #boot-loading{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;color:#fff;background:radial-gradient(circle at 50% 35%,#28239a 0,#100b4a 42%,#06051f 100%);font-family:Inter,ui-rounded,"Trebuchet MS",system-ui,sans-serif;text-align:center}
  #boot-loading .boot-card{width:min(440px,calc(100vw - 40px));padding:24px;border:2px solid rgba(112,239,255,.7);border-radius:22px;background:rgba(10,8,55,.88)}
  #boot-loading strong{display:block;margin-bottom:8px;color:#baff36;font-size:clamp(24px,6vw,42px)}
  #boot-loading span{display:block;font-size:16px;line-height:1.4}
  #boot-loading .boot-spinner{width:42px;height:42px;margin:20px auto 0;border:5px solid rgba(255,255,255,.2);border-top-color:#67f2ff;border-radius:50%;animation:boot-spin .8s linear infinite}
  html.app-ready #boot-loading{display:none}@keyframes boot-spin{to{transform:rotate(360deg)}}
</style>
'@
    $index = $index.Replace('</head>', "$criticalStyles`r`n</head>")
}

if ($index -notmatch 'id="boot-loading"') {
    $loadingMarkup = @'
<div id="boot-loading" role="status" aria-live="polite"><div class="boot-card"><strong>BLEND IN OR BUST</strong><span id="boot-loading-message">Loading the museum...</span><div class="boot-spinner" aria-hidden="true"></div></div></div>
'@
    $index = $index.Replace('<body>', "<body>`r`n$loadingMarkup")
}

if ($index -notmatch 'id="boot-loader-script"') {
    $loaderScript = @'
<script id="boot-loader-script">
(function(){
  function ready(){
    var css=getComputedStyle(document.documentElement).getPropertyValue('--blend-styles-loaded').trim()==='1';
    if(css&&window.__blendMainLoaded){document.documentElement.classList.add('app-ready');var boot=document.getElementById('boot-loading');if(boot)boot.remove();return true}
    return false;
  }
  var timer=setInterval(function(){if(ready())clearInterval(timer)},100);
  setTimeout(function(){if(ready())return;var message=document.getElementById('boot-loading-message');if(message)message.textContent='The game is still loading. If this remains here, refresh the itch.io page.'},10000);
})();
</script>
'@
    $index = $index.Replace('</body>', "$loaderScript`r`n</body>")
}

Write-Utf8 $indexPath $index

$jsFiles = Get-ChildItem $distPath -Recurse -File -Filter *.js
foreach ($file in $jsFiles) {
    $contents = Read-Utf8 $file.FullName
    $contents = $contents.Replace('"/assets/', '"./assets/')
    $contents = $contents.Replace("'/assets/", "'./assets/")
    $contents = $contents.Replace('`/assets/', '`./assets/')
    if ($contents -notmatch '__blendMainLoaded') {
        $contents += ";window.__blendMainLoaded=true;"
    }
    Write-Utf8 $file.FullName $contents
}

$cssFiles = Get-ChildItem $distPath -Recurse -File -Filter *.css
foreach ($file in $cssFiles) {
    $contents = Read-Utf8 $file.FullName
    if ($contents -notmatch '--blend-styles-loaded') {
        $contents = ":root{--blend-styles-loaded:1}" + $contents
    }
    $contents = $contents.Replace('url("/assets/', 'url("./')
    $contents = $contents.Replace("url('/assets/", "url('./")
    $contents = $contents.Replace('url(/assets/', 'url(./')
    Write-Utf8 $file.FullName $contents
}

# Validate every generated script and stylesheet named by index.html.
$index = Read-Utf8 $indexPath
if ($index -match '(?:src|href)="/') {
    throw "Repair failed: index.html still contains a root-relative script or stylesheet URL."
}
$references = [regex]::Matches($index, '(?:src|href)="([^"#?]+)"')
foreach ($match in $references) {
    $reference = $match.Groups[1].Value
    if ($reference -match '^(?:https?:|data:|blob:)') { continue }
    $relative = $reference -replace '^\./', ''
    $local = $relative -replace '/', [IO.Path]::DirectorySeparatorChar
    if (-not (Test-Path (Join-Path $distPath $local))) {
        throw "Repair failed: index.html references missing file $reference"
    }
}

$browserFiles = Get-ChildItem $distPath -Recurse -File |
    Where-Object { $_.Extension -in @('.html','.js','.css') }
$healthReference = $browserFiles | Select-String -SimpleMatch '/health' -ErrorAction SilentlyContinue
if ($healthReference) {
    throw "School-network safeguard failed: /health remains in the browser build."
}
$absoluteAssetReference = $browserFiles | Select-String -Pattern '["'']\/assets\/|url\(["'']?\/assets\/' -ErrorAction SilentlyContinue
if ($absoluteAssetReference) {
    throw "Repair failed: a root-relative /assets/ URL remains in the browser build."
}

$releasePath = Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Force -Path $releasePath | Out-Null
$zipPath = Join-Path $releasePath "Blend-in-or-Bust-v$Version-itch.zip"

New-ItchArchive -SourceDirectory $distPath -DestinationZip $zipPath
Test-ItchArchive -ZipPath $zipPath

Write-Host "Created upload-ready itch.io ZIP:" -ForegroundColor Green
Write-Host $zipPath -ForegroundColor Green
Write-Host "Verified: exact index assets exist, forward-slash ZIP paths, loading UI, ASCII-safe labels, and no /health request." -ForegroundColor Green
