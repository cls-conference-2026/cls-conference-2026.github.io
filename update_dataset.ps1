<#
.SYNOPSIS
    Dataset Synchronization Script for CLS Conference 2026
.DESCRIPTION
    Converts timetable.csv into sessions-data.js so changes to sessions, rooms, 
    or speakers instantly sync across all environments (Local & GitHub Pages).
#>

$csvPath = Join-Path $PSScriptRoot "timetable.csv"
$jsPath  = Join-Path $PSScriptRoot "sessions-data.js"

if (-not (Test-Path $csvPath)) {
    Write-Error "Could not find timetable.csv in $PSScriptRoot"
    exit 1
}

Write-Host "Reading updated timetable.csv..." -ForegroundColor Cyan
$csvRecords = Import-Csv -Path $csvPath
$jsonText = $csvRecords | ConvertTo-Json -Depth 5 -Compress
$jsContent = "const PRELOADED_SESSIONS = " + $jsonText + ";"

[System.IO.File]::WriteAllText($jsPath, $jsContent, [System.Text.Encoding]::UTF8)

Write-Host "==========================================================" -ForegroundColor DarkMagenta
Write-Host "  Successfully updated sessions-data.js ($($csvRecords.Count) sessions)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor DarkMagenta
Write-Host "Next step: Run 'git add .' and 'git push' to deploy updates to GitHub Pages." -ForegroundColor Yellow
