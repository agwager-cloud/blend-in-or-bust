Set-StrictMode -Version Latest

function New-ItchArchive {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$SourceDirectory,
        [Parameter(Mandatory = $true)][string]$DestinationZip
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $sourceRoot = (Resolve-Path $SourceDirectory).Path.TrimEnd([char[]]@('\', '/'))
    $destinationDirectory = Split-Path -Parent $DestinationZip
    if ($destinationDirectory) {
        New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
    }
    if (Test-Path $DestinationZip) {
        Remove-Item $DestinationZip -Force
    }

    $files = @(Get-ChildItem $sourceRoot -Recurse -File | Sort-Object FullName)
    if ($files.Count -eq 0) {
        throw "ZIP creation failed: $SourceDirectory contains no files."
    }

    $stream = [System.IO.File]::Open(
        $DestinationZip,
        [System.IO.FileMode]::CreateNew,
        [System.IO.FileAccess]::ReadWrite,
        [System.IO.FileShare]::None
    )
    $archive = New-Object -TypeName System.IO.Compression.ZipArchive -ArgumentList @(
        $stream,
        [System.IO.Compression.ZipArchiveMode]::Create,
        $false
    )

    try {
        foreach ($file in $files) {
            $relativePath = $file.FullName.Substring($sourceRoot.Length) -replace '^[\\/]+', ''
            # ZIP files and itch.io require POSIX-style entry separators.
            # Compress-Archive on Windows can preserve backslashes, which leaves
            # index.html requesting assets/foo.js while the archive contains
            # assets\foo.js and produces the exact 404 seen on itch.io.
            $entryName = $relativePath.Replace('\', '/')
            if ([string]::IsNullOrWhiteSpace($entryName)) {
                continue
            }
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                $file.FullName,
                $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    }
    finally {
        $archive.Dispose()
        $stream.Dispose()
    }
}

function Test-ItchArchive {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$ZipPath
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $entryNames = New-Object -TypeName 'System.Collections.Generic.HashSet[string]' -ArgumentList @([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName.Contains('\')) {
                throw "ZIP validation failed: archive entry '$($entry.FullName)' contains a Windows backslash. itch.io requires forward-slash paths."
            }
            [void]$entryNames.Add($entry.FullName)
        }

        if (-not $entryNames.Contains('index.html')) {
            throw 'ZIP validation failed: index.html is not at the ZIP root.'
        }

        $assetFiles = @($archive.Entries | Where-Object {
            $_.FullName -match '^assets/.+' -and -not $_.FullName.EndsWith('/')
        })
        if ($assetFiles.Count -eq 0) {
            throw 'ZIP validation failed: no files exist under assets/.'
        }

        $indexEntry = $archive.Entries | Where-Object { $_.FullName -eq 'index.html' } | Select-Object -First 1
        $stream = $indexEntry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        try {
            $indexContents = $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
            $stream.Dispose()
        }

        if ($indexContents -match '(?:src|href)="/') {
            throw 'ZIP validation failed: index.html contains a root-relative script or stylesheet URL.'
        }

        $references = [regex]::Matches($indexContents, '(?:src|href)="([^"#?]+)"')
        foreach ($match in $references) {
            $reference = $match.Groups[1].Value
            if ($reference -match '^(?:https?:|data:|blob:)') {
                continue
            }
            $entryName = ($reference -replace '^\./', '').Replace('\', '/')
            if (-not $entryNames.Contains($entryName)) {
                throw "ZIP validation failed: index.html requests '$reference', but the exact archive entry '$entryName' is missing."
            }
        }

        foreach ($entry in $archive.Entries) {
            if ($entry.FullName -notmatch '\.(html|js|css)$') {
                continue
            }
            $entryStream = $entry.Open()
            $entryReader = New-Object System.IO.StreamReader($entryStream)
            try {
                $contents = $entryReader.ReadToEnd()
                if ($contents.Contains('/health')) {
                    throw "School-network safeguard failed: /health was found inside ZIP entry $($entry.FullName)."
                }
                if ($contents -match '["'']\/assets\/|url\(["'']?\/assets\/' ) {
                    throw "ZIP validation failed: a root-relative /assets/ URL remains inside $($entry.FullName)."
                }
            }
            finally {
                $entryReader.Dispose()
                $entryStream.Dispose()
            }
        }
    }
    finally {
        $archive.Dispose()
    }
}
