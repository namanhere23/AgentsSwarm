/**
 * generate-cli.js
 * Prebuild script — reads env vars and generates CLI scripts into public/cli/
 * Run automatically before `vite build` via package.json "prebuild" hook.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// --- Read .env manually (Vite env not available in Node scripts) ---
function loadEnv() {
  const envPath = resolve(rootDir, '.env');
  const env = {};
  try {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key) env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    console.warn('[generate-cli] Warning: .env not found, using defaults');
  }
  return env;
}

const env = loadEnv();


const appUrl =
  env.VITE_APP_URL ||                              // 1. Local .env  →  VITE_APP_URL
  (process.env.VERCEL_PROJECT_PRODUCTION_URL        // 2. Vercel auto →  production URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ||
  (process.env.VERCEL_URL                           // 3. Vercel auto →  deployment URL
    ? `https://${process.env.VERCEL_URL}`
    : null);

if (!appUrl) {
  console.error('[generate-cli] ❌ ERROR: No app URL found!');
  console.error('  Set one of these env vars:');
  console.error('  - VITE_APP_URL  (in frontend/.env)');
  console.error('  - VERCEL_PROJECT_PRODUCTION_URL  (auto-set by Vercel)');
  console.error('  - VERCEL_URL  (auto-set by Vercel)');
  process.exit(1);
}

console.log(`[generate-cli] Using App URL: ${appUrl}`);

// --- Output directory ---
const outDir = resolve(rootDir, 'public', 'cli');
mkdirSync(outDir, { recursive: true });

// -----------------------------------------------------------------------
// 1. Generate install.ps1
// -----------------------------------------------------------------------
const installScript = `<#
.SYNOPSIS
Installs the Nexsus CLI globally on Windows.

.DESCRIPTION
This script creates a .nexsus/bin directory in the User's profile,
downloads the nexsus.ps1 wrapper, and safely appends the directory
to the User's Environment PATH registry.
#>

$ErrorActionPreference = "Stop"

$nexsusDir = Join-Path $env:USERPROFILE ".nexsus\\bin"
$serverUrl = "${appUrl}/api"
[Environment]::SetEnvironmentVariable('NEXSUS_API_URL', $serverUrl, 'User')
Write-Host "Automatically linked CLI to Server: $serverUrl" -ForegroundColor Green

$wrapperUrl = "${appUrl}/api/cli/nexsus.ps1"
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
`;

writeFileSync(resolve(outDir, 'install.ps1'), installScript, 'utf-8');
console.log('[generate-cli] ✅ Generated public/cli/install.ps1');

// -----------------------------------------------------------------------
// 2. Copy nexsus.ps1 from backend source (single source of truth)
// -----------------------------------------------------------------------
const nexsusSrc = resolve(rootDir, '..', 'backend', 'public', 'cli', 'nexsus.ps1');
try {
  const nexsusContent = readFileSync(nexsusSrc, 'utf-8');
  writeFileSync(resolve(outDir, 'nexsus.ps1'), nexsusContent, 'utf-8');
  console.log('[generate-cli] ✅ Copied backend/public/cli/nexsus.ps1 → public/cli/nexsus.ps1');
} catch {
  console.warn('[generate-cli] ⚠️  Could not copy nexsus.ps1 from backend — skipping');
}

// -----------------------------------------------------------------------
// 3. Generate vercel.json dynamically to hide the Backend IP
// -----------------------------------------------------------------------
const backendIp = env.BACKEND_IP || process.env.BACKEND_IP;
if (!backendIp) {
  console.warn('[generate-cli] ⚠️  Warning: BACKEND_IP not set in environment. Proxy may fail.');
}
const backendDest = backendIp ? `http://${backendIp}:8000/$1` : "http://localhost:8000/$1";

const vercelJsonContent = `{
  "rewrites": [
    {
      "source": "/api/cli/:file",
      "destination": "/cli/:file"
    },
    {
      "source": "/api/(.*)",
      "destination": "${backendDest}"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
`;

writeFileSync(resolve(rootDir, 'vercel.json'), vercelJsonContent, 'utf-8');
console.log('[generate-cli] ✅ Generated frontend/vercel.json with hidden proxy configuration');
