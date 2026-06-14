<#
.SYNOPSIS
The Nexsus Global CLI Wrapper.

.DESCRIPTION
Proxies local terminal commands to the remote deployed Nexsus Swarm Backend.
#>

param(
    [Parameter(Position=0)]
    [string]$Command,
    
    [Parameter(Position=1)]
    [string]$Objective
)

function Show-WelcomeLogo {
    Clear-Host
    $h = $Host.UI.RawUI.WindowSize.Height
    $w = $Host.UI.RawUI.WindowSize.Width
    
    $logo = @(
        "   _   __",
        "  / | / /___  _  ___________  _______",
        " /  |/ / __ \| |/_/ ___/ / / / / ___/",
        "/ /|  /  ___/>  <(__  ) /_/ / (__  )",
        "/_/ |_/\___/_/|_/____/\__,_/ /____/",
        "",
        "Welcome to the Nexsus AI Command Center",
        "",
        "type 'exit' to quit"
    )
    $colors = @("DarkCyan", "Cyan", "Cyan", "Blue", "DarkBlue", "Black", "White", "Black", "DarkGray")
    
    $promptHeight = 3
    $logoStartY = [math]::Floor(($h - $logo.Count - $promptHeight) / 2)
    if ($logoStartY -lt 0) { $logoStartY = 0 }
    
    for ($i = 0; $i -lt $logoStartY; $i++) { Write-Host "" }
    
    for ($i = 0; $i -lt $logo.Count; $i++) {
        $line = $logo[$i]
        $pad = [math]::Max(0, [math]::Floor(($w - $line.Length) / 2))
        Write-Host (" " * $pad + $line) -ForegroundColor $colors[$i]
    }
    
    $currentY = $logoStartY + $logo.Count
    $linesToBottom = $h - $currentY - $promptHeight - 2
    if ($linesToBottom -gt 0) {
        for ($i = 0; $i -lt $linesToBottom; $i++) { Write-Host "" }
    }
}

function Run-Swarm {
    param([string]$Obj)

    Clear-Host
    Write-Host ""
    Write-Host "       _   __" -ForegroundColor DarkCyan
    Write-Host "      / | / /___  _  ___________  _______" -ForegroundColor Cyan
    Write-Host "     /  |/ / __ \| |/_/ ___/ / / / / ___/" -ForegroundColor Cyan
    Write-Host "    / /|  /  ___/>  <(__  ) /_/ / (__  ) " -ForegroundColor Blue
    Write-Host "   /_/ |_/\___/_/|_/____/\__,_/ /____/   " -ForegroundColor DarkBlue
    Write-Host ""
    Write-Host "  ===========================================================" -ForegroundColor DarkGray
    Write-Host "  Objective: " -ForegroundColor DarkGray -NoNewline
    Write-Host $Obj -ForegroundColor White
    Write-Host "  ===========================================================" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [+] Initializing Swarm Protocol..." -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type"  = "application/json"
    }
    
    $augmentedObjective = $Obj + "`n`n(CRITICAL INSTRUCTION: If you output code blocks for files, you MUST put the exact target filename as a comment on the VERY FIRST line of each code block, e.g., `<!-- index.html -->`, `/* styles.css */`, or `# app.py`.)"
    
    $body = @{
        objective = $augmentedObjective
        crew_id   = "research-crew"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/swarms" -Method Post -Headers $headers -Body $body
        $runId = $response.swarm_run_id
        
        Write-Host "  [+] Swarm Run ID: $runId" -ForegroundColor DarkGray
        Write-Host "  [+] Agent network connected. Executing plan..." -ForegroundColor DarkGray
        Write-Host ""
        
        $spinners = @("-", "\", "|", "/")
        $i = 0
        
        while ($true) {
            $statusRes = Invoke-RestMethod -Uri "$API_URL/swarms/$runId" -Headers $headers
            
            $status = $statusRes.status
            $tasks = $statusRes.tasks_completed
            
            $spinChar = $spinners[$i % $spinners.Length]
            Write-Host -NoNewline "`r  $spinChar  Status: $status | Tasks Completed: $tasks    " -ForegroundColor Cyan
            
            if ($status -eq "completed" -or $status -eq "failed") {
                Write-Host "`r  [OK] Status: $status | Tasks Completed: $tasks    `n" -ForegroundColor Green
                Write-Host "  Final Output:" -ForegroundColor White
                Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
                
                # Print output line by line with indentation
                $statusRes.output_summary -split '\r?\n' | ForEach-Object {
                    Write-Host "  $_" -ForegroundColor Gray
                }
                Write-Host "  ----------------------------------------`n" -ForegroundColor DarkGray
                
                # Extract code blocks
                $regex = '(?s)```(\w*)\r?\n(.*?)```'
                $match = [regex]::Match($statusRes.output_summary, $regex)
                $count = 1
                $usedNames = @{}
                while ($match.Success) {
                    $lang = $match.Groups[1].Value.Trim()
                    if (-not $lang) { $lang = "txt" }
                    $code = $match.Groups[2].Value.Trim()
                    
                    $filename = "generated_$count.$lang"
                    $firstLine = ($code -split '\r?\n')[0]
                    if ($firstLine -match '([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)') {
                        $filename = $matches[1]
                    } else {
                        if ($lang -eq "html") { $filename = "index.html" }
                        elseif ($lang -eq "css") { $filename = "styles.css" }
                        elseif ($lang -eq "js") { $filename = "script.js" }
                        elseif ($lang -eq "py") { $filename = "main.py" }
                    }
                    
                    if ($usedNames.ContainsKey($filename)) {
                        $filename = "generated_$count.$lang"
                    }
                    $usedNames[$filename] = $true
                    
                    $code | Set-Content -Path $filename -Encoding UTF8
                    Write-Host "  -> Saved artifact: .\$filename" -ForegroundColor Blue
                    
                    $count++
                    $match = $match.NextMatch()
                }
                break
            }
            Start-Sleep -Milliseconds 500
            $i++
        }
    } catch {
        Write-Host "`n  [!] Connection Error: $_" -ForegroundColor Red
    }
}

$API_URL = [Environment]::GetEnvironmentVariable('NEXSUS_API_URL', 'User')
if (-not $API_URL) { $API_URL = $env:NEXSUS_API_URL }

if (-not $API_URL) {
    Write-Host "Error: NEXSUS_API_URL environment variable is not set." -ForegroundColor Red
    exit 1
}

$apiKey = $env:NEXSUS_API_KEY
if (-not $apiKey) {
    Write-Host "Error: NEXSUS_API_KEY environment variable is not set." -ForegroundColor Red
    exit 1
}

if (-not $Command) {
    # Interactive Mode (REPL)
    while ($true) {
        Show-WelcomeLogo
        
        $w = $Host.UI.RawUI.WindowSize.Width
        $padLength = [math]::Max(0, [math]::Floor(($w - 48) / 2))
        $pad = " " * $padLength
        
        # Draw a custom prompt line
        Write-Host "$pad+----------------------------------------------+" -ForegroundColor DarkGray
        Write-Host -NoNewline "$pad| " -ForegroundColor DarkGray
        Write-Host -NoNewline "nexsus > " -ForegroundColor Cyan
        
        $inputStr = Read-Host
        
        if ($inputStr -eq "exit" -or $inputStr -eq "quit") {
            Write-Host "`n$pad Goodbye.`n" -ForegroundColor DarkGray
            break
        }
        if ($inputStr.Trim() -ne "") {
            Run-Swarm -Obj $inputStr
            Write-Host "`n$pad Press Enter to continue..." -ForegroundColor DarkGray
            Read-Host | Out-Null
        }
    }
    exit 0
}
elseif ($Command -eq "run") {
    if (-not $Objective) {
        Write-Host "  [!] Error: Provide an objective string." -ForegroundColor Red
        exit 1
    }
    Show-WelcomeLogo
    Run-Swarm -Obj $Objective
}
elseif ($Command -eq "--help" -or $Command -eq "-h" -or $Command -eq "?") {
    Show-WelcomeLogo
    Write-Host "  Usage:" -ForegroundColor White
    Write-Host "    nexsus run `"Your objective here`"" -ForegroundColor Gray
    Write-Host "    nexsus (no args for interactive mode)" -ForegroundColor Gray
    Write-Host ""
}
else {
    Show-WelcomeLogo
    Write-Host "  [!] Unknown command: $Command." -ForegroundColor Red
    Write-Host ""
}
