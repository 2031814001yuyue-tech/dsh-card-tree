# Card Tree installer for DSH.
# ASCII only: Windows PowerShell 5.1 parses BOM-less .ps1 as ANSI.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\install.ps1 [-Profile desktop]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome = (Join-Path $env:USERPROFILE '.dsh')
)

$ErrorActionPreference = 'Stop'
$pluginDir = Split-Path -Parent $PSScriptRoot
$pkgPath = Join-Path $pluginDir 'package.json'
if (-not (Test-Path -LiteralPath $pkgPath)) { throw "package.json not found in $pluginDir" }

$plugin = Get-Content -LiteralPath $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
$name = [string]$plugin.name
if (-not $name) { throw "package.json has no name" }

$profileDir = Join-Path $DshHome (Join-Path 'profiles' $Profile)
$profilePkg = Join-Path $profileDir 'package.json'
if (-not (Test-Path -LiteralPath $profilePkg)) {
  throw "profile '$Profile' not found at $profileDir"
}

Write-Host "[1/3] profile: $profileDir"
Write-Host "[2/3] registering $name ..."

# 1) Link the package into the profile through the DSH CLI (it forwards to pnpm).
$dsh = Get-Command dsh -ErrorAction SilentlyContinue
if ($dsh) {
  $linkTarget = $pluginDir.Replace('\', '/')
  & $dsh.Source plugin --profile $Profile add $linkTarget
  if ($LASTEXITCODE -ne 0) {
    throw "dsh plugin add failed (exit $LASTEXITCODE). See INSTALL.md option C."
  }
} else {
  Write-Warning "dsh CLI not found on PATH; skipping 'plugin add'. Add the link dependency manually (INSTALL.md option C)."
}

# 2) Append the bundle to dsh.profile.bundles, keeping the rest of the file intact.
$raw = Get-Content -LiteralPath $profilePkg -Raw -Encoding UTF8
$nl = "`n"
if ($raw.Contains("`r`n")) { $nl = "`r`n" }

$bundlesPattern = [regex]::new('"bundles"\s*:\s*\[(?<body>[\s\S]*?)\]')
$match = $bundlesPattern.Match($raw)
if (-not $match.Success) {
  throw "could not find dsh.profile.bundles in $profilePkg"
}

$body = $match.Groups['body'].Value
$quoted = '"' + $name + '"'
if ($body.Contains($quoted)) {
  Write-Host "[3/3] $name already listed in dsh.profile.bundles"
} else {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  Copy-Item -LiteralPath $profilePkg -Destination ("$profilePkg.bak-install-$stamp")
  $trimmed = $body.TrimEnd()
  $needsComma = ($trimmed.Length -gt 0) -and (-not $trimmed.EndsWith(','))
  $addition = ''
  if ($needsComma) { $addition += ',' }
  $addition += $nl + '        ' + $quoted
  if ($body.EndsWith($nl)) {
    $newBody = $trimmed + $addition + $nl + '      '
  } else {
    $newBody = $trimmed + $addition
  }
  $start = $match.Groups['body'].Index
  $raw = $raw.Substring(0, $start) + $newBody + $raw.Substring($start + $body.Length)
  [System.IO.File]::WriteAllText($profilePkg, $raw, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "[3/3] added $name to dsh.profile.bundles (backup saved next to package.json)"
}

Write-Host ''
Write-Host 'Done. Restart DSH (or reload the plugin) to load it.'
Write-Host 'Check: open <DSH origin>/dsh-card-tree/health and the left sidebar'
Write-Host 'should show the "Card Tree" icon.'
