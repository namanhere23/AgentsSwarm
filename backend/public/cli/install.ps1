<#
.SYNOPSIS
Installs the Nexsus CLI globally on Windows.

.DESCRIPTION
This script creates a .nexsus/bin directory in the User's profile,
downloads the nexsus.ps1 wrapper, and safely appends the directory
to the User's Environment PATH registry.
#>

$ErrorActionPreference = "Stop"

$nexsusDir = Join-Path $env:USERPROFILE ".nexsus\bin"
$serverUrl = [Environment]::GetEnvironmentVariable('NEXSUS_API_URL', 'User')
if (-not $serverUrl) {
    Write-Host "Nexsus Server URL not found." -ForegroundColor Yellow
    $serverUrl = Read-Host "Please enter your Backend API URL"
    $serverUrl = $serverUrl.TrimEnd('/')
    [Environment]::SetEnvironmentVariable('NEXSUS_API_URL', $serverUrl, 'User')
    Write-Host "Saved NEXSUS_API_URL to User Environment.`n" -ForegroundColor Green
}

$wrapperUrl = "$serverUrl/cli/nexsus.ps1"
$wrapperPath = Join-Path $nexsusDir "nexsus.ps1"

Write-Host "Installing Nexsus CLI globally..." -ForegroundColor Cyan

# 1. Create directory if it doesn't exist
if (-not (Test-Path $nexsusDir)) {
    New-Item -ItemType Directory -Force -Path $nexsusDir | Out-Null
}

# 2. Download the CLI wrapper
Write-Host "Downloading CLI wrapper..." -ForegroundColor Gray
Invoke-WebRequest -Uri $wrapperUrl -OutFile $wrapperPath

# 3. Add to User PATH if not already present
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$pathParts = $userPath -split ';'

if ($pathParts -notcontains $nexsusDir) {
    Write-Host "Adding $nexsusDir to User PATH..." -ForegroundColor Gray
    $newPath = $userPath
    if (-not $newPath.EndsWith(";")) {
        $newPath += ";"
    }
    $newPath += $nexsusDir
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    
    Write-Host "Successfully added to PATH. You may need to restart your terminal." -ForegroundColor Yellow
} else {
    Write-Host "Directory already in PATH." -ForegroundColor Gray
}

Write-Host "Nexsus CLI installed successfully!" -ForegroundColor Green
Write-Host "Run 'nexsus --help' to get started." -ForegroundColor White
