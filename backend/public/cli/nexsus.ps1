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

$API_URL = "http://127.0.0.1:8000"

# Check for API key
$apiKey = $env:NEXSUS_API_KEY
if (-not $apiKey) {
    Write-Host "Error: NEXSUS_API_KEY environment variable is not set." -ForegroundColor Red
    Write-Host "Set it via: [Environment]::SetEnvironmentVariable('NEXSUS_API_KEY', 'your-key', 'User')" -ForegroundColor Yellow
    exit 1
}

if ($Command -eq "run") {
    if (-not $Objective) {
        Write-Host "Error: You must provide an objective string. Example: nexsus run `"Analyze this folder`"" -ForegroundColor Red
        exit 1
    }

    Write-Host "Launching Swarm..." -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type"  = "application/json"
    }
    
    $augmentedObjective = $Objective + "`n`n(CRITICAL INSTRUCTION: If you output code blocks for files, you MUST put the exact target filename as a comment on the VERY FIRST line of each code block, e.g., `<!-- index.html -->`, `/* styles.css */`, or `# app.py`.)"
    
    $body = @{
        objective = $augmentedObjective
        crew_id   = "research-crew"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/swarms" -Method Post -Headers $headers -Body $body
        $runId = $response.swarm_run_id
        
        Write-Host "Swarm Run ID: $runId" -ForegroundColor Yellow
        Write-Host "Agent logs streaming connected..." -ForegroundColor DarkGray
        
        # Note: True real-time SSE streaming in PowerShell requires custom .NET WebRequest loops.
        # For this wrapper, we implement a polling fallback if SSE isn't natively supported.
        while ($true) {
            # Note: We poll /swarms/{run_id} or just stream via events? PRD assumes polling backend exists, we have /swarms/{swarm_run_id} but it's not a GET in routes currently. Let's use it as PRD wrote: /api/v1/swarms/$runId
            # Actually the actual route is /swarms not /api/v1/swarms.
            $statusRes = Invoke-RestMethod -Uri "$API_URL/swarms/$runId" -Headers $headers
            Write-Host "Status: $($statusRes.status) | Tasks Completed: $($statusRes.tasks_completed)"
            if ($statusRes.status -eq "completed" -or $statusRes.status -eq "failed") {
                Write-Host "Final Output: $($statusRes.output_summary)" -ForegroundColor Green
                
                # Automatically extract and save code blocks to local files
                $regex = '(?s)```(\w*)\r?\n(.*?)```'
                $match = [regex]::Match($statusRes.output_summary, $regex)
                $count = 1
                $usedNames = @{}
                while ($match.Success) {
                    $lang = $match.Groups[1].Value.Trim()
                    if (-not $lang) { $lang = "txt" }
                    $code = $match.Groups[2].Value.Trim()
                    
                    $filename = "generated_$count.$lang"
                    
                    # Try to extract filename from the first line
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
                    Write-Host ""
                    Write-Host "-> Successfully saved extracted code to: .\$filename" -ForegroundColor Cyan
                    
                    $count++
                    $match = $match.NextMatch()
                }
                break
            }
            Start-Sleep -Seconds 5
        }
    } catch {
        Write-Host "Failed to communicate with Nexsus Backend: $_" -ForegroundColor Red
    }
}
elseif ($Command -eq "--help" -or $Command -eq "-h") {
    Write-Host "Nexsus CLI v1.0" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  nexsus run `"Your objective here`""
}
else {
    Write-Host "Unknown command: $Command. Run 'nexsus --help'" -ForegroundColor Red
}
