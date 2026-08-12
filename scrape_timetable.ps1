<#
.SYNOPSIS
    CLS Conference 2026 Timetable Scraper (PowerShell)
.DESCRIPTION
    Scrapes the official Centre for Longitudinal Studies (CLS) conference schedule from:
    https://cls.ucl.ac.uk/events/cls-conference-2026/
    and outputs a structured timetable.csv for the conference web application.
#>

param (
    [string]$Url = "https://cls.ucl.ac.uk/events/cls-conference-2026/",
    [string]$OutputFile = "$PSScriptRoot\timetable.csv"
)

Write-Host "Fetching conference page from $Url..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    $html = $response.Content
} catch {
    Write-Warning "Could not fetch live URL ($Url). Checking for local cached content..."
    $localFile = "$PSScriptRoot\content.md"
    if (-not (Test-Path $localFile)) {
        $localFile = "C:\Users\ucbvrjh\.gemini\antigravity\brain\9400eb56-b944-4359-991f-5c17ad076fb8\.system_generated\steps\8\content.md"
    }
    if (Test-Path $localFile) {
        Write-Host "Loading local cached HTML from $localFile" -ForegroundColor Yellow
        $html = [System.IO.File]::ReadAllText($localFile)
    } else {
        throw "Failed to retrieve page content and no local fallback found."
    }
}

$records = [System.Collections.Generic.List[PSObject]]::new()
$idCounter = 1

function Clean-Text ($txt) {
    if (-not $txt) { return "" }
    $t = $txt -replace '<[^>]+>', ' '
    $t = [System.Net.WebUtility]::HtmlDecode($t)
    $t = $t -replace '\s+', ' '
    return $t.Trim()
}

$roomMap = @(
    "Hallam Room 1",
    "Hallam Room 2",
    "Hallam Room 3",
    "Hallam Room 4"
)

$itemPattern = '(?s)<article class="[^"]*simple-agenda-item[^"]*">.*?<div class="simple-agenda-item__time">(.*?)</div>.*?<div class="simple-agenda-item__title">(.*?)</div>.*?<div class="simple-agenda-item__description">(.*?)</div>\s*</div>\s*</article>'

$agendaItems = [regex]::Matches($html, $itemPattern)

Write-Host "Found $($agendaItems.Count) main agenda items in HTML." -ForegroundColor Green

$currentDay = "Day 1"
$currentDate = "2026-09-22"
$lastTime = ""

foreach ($item in $agendaItems) {
    $time = Clean-Text $item.Groups[1].Value
    $title = Clean-Text $item.Groups[2].Value
    $descRaw = $item.Groups[3].Value

    if ($lastTime -and [string]::Compare($lastTime, "16:00") -ge 0 -and [string]::Compare($time, "09:30") -le 0) {
        $currentDay = "Day 2"
        $currentDate = "2026-09-23"
    }
    $lastTime = $time

    $defaultRoom = "Main Hallam Auditorium"
    if ($descRaw -match 'Regent Suite') { $defaultRoom = "Cavendish Lounge" }
    elseif ($descRaw -match 'Council Chamber') { $defaultRoom = "Main Hallam Auditorium" }

    $sessionType = "General"
    if ($title -match "Keynote") { $sessionType = "Keynote" }
    elseif ($title -match "Parallel") { $sessionType = "Parallel Sessions" }
    elseif ($title -match "Registration") { $sessionType = "Registration" }
    elseif ($title -match "Break|Refreshments|Lunch") { $sessionType = "Break" }
    elseif ($title -match "Poster") { $sessionType = "Poster Session" }
    elseif ($title -match "Welcome|Close|Instructions") { $sessionType = "Plenary" }

    $accordionPattern = '(?s)<p class="nfh_accordion2_trigger"[^>]*>(.*?)</p>\s*<div class="nfh_accordion2_content"[^>]*>(.*?)</div>'
    $accordions = [regex]::Matches($descRaw, $accordionPattern)

    if ($accordions.Count -gt 0) {
        $accIdx = 0
        foreach ($acc in $accordions) {
            $trackTitle = Clean-Text $acc.Groups[1].Value
            $accContent = $acc.Groups[2].Value
            $trackRoom = $roomMap[$accIdx % $roomMap.Count]
            $accIdx++

            $abstractUrl = ""
            if ($accContent -match 'href="([^"]*abstracts[^"]*)"') {
                $abstractUrl = [System.Net.WebUtility]::HtmlDecode($Matches[1])
            }

            $liPattern = '(?s)<li>(.*?)</li>'
            $lis = [regex]::Matches($accContent, $liPattern)

            if ($lis.Count -gt 0) {
                foreach ($li in $lis) {
                    $liText = Clean-Text $li.Groups[1].Value
                    $presTitle = $liText
                    $speaker = ""
                    $affiliation = ""

                    if ($liText -match '^(.*?)\((.*?)\)$') {
                        $presTitle = $Matches[1].Trim()
                        $speakerAff = $Matches[2].Trim()
                        if ($speakerAff -match '^(.*?),\s*(.*)$') {
                            $speaker = $Matches[1].Trim()
                            $affiliation = $Matches[2].Trim()
                        } else {
                            $speaker = $speakerAff
                        }
                    } elseif ($liText -match '^(.*?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+\((.*?)\)$') {
                        $presTitle = $Matches[1].Trim()
                        $speaker = $Matches[2].Trim()
                        $affiliation = $Matches[3].Trim()
                    }

                    $records.Add([PSCustomObject]@{
                        id                 = "SES-{0:D3}" -f $idCounter++
                        day                = $currentDay
                        date               = $currentDate
                        time_start         = $time
                        time_end           = ""
                        session_block      = $title
                        track_session      = $trackTitle
                        room               = $trackRoom
                        session_type       = $sessionType
                        presentation_title = $presTitle
                        speaker            = $speaker
                        affiliation        = $affiliation
                        abstract_url       = $abstractUrl
                        notes_description  = "Track: $trackTitle"
                        status             = "Confirmed"
                    })
                }
            } else {
                $records.Add([PSCustomObject]@{
                    id                 = "SES-{0:D3}" -f $idCounter++
                    day                = $currentDay
                    date               = $currentDate
                    time_start         = $time
                    time_end           = ""
                    session_block      = $title
                    track_session      = $trackTitle
                    room               = $trackRoom
                    session_type       = $sessionType
                    presentation_title = $trackTitle
                    speaker            = ""
                    affiliation        = ""
                    abstract_url       = $abstractUrl
                    notes_description  = (Clean-Text $accContent)
                    status             = "Confirmed"
                })
            }
        }
    } else {
        $descClean = Clean-Text $descRaw
        $speaker = ""
        $affiliation = ""
        $abstractUrl = ""

        if ($descRaw -match 'href="([^"]*abstracts[^"]*)"') {
            $abstractUrl = [System.Net.WebUtility]::HtmlDecode($Matches[1])
        }

        if ($descClean -match '([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s+(.*)') {
            $speaker = $Matches[1]
            $affiliation = $Matches[2] -replace 'Council Chamber|Regent Suite|View abstract.*', ''
            $affiliation = $affiliation.Trim()
        }

        $records.Add([PSCustomObject]@{
            id                 = "SES-{0:D3}" -f $idCounter++
            day                = $currentDay
            date               = $currentDate
            time_start         = $time
            time_end           = ""
            session_block      = $title
            track_session      = $title
            room               = $defaultRoom
            session_type       = $sessionType
            presentation_title = $title
            speaker            = $speaker
            affiliation        = $affiliation
            abstract_url       = $abstractUrl
            notes_description  = $descClean
            status             = "Confirmed"
        })
    }
}

$records | Export-Csv -Path $OutputFile -NoTypeInformation -Encoding UTF8
Write-Host "Successfully exported $($records.Count) session records to $OutputFile" -ForegroundColor Green
