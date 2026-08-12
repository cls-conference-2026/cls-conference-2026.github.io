<#
.SYNOPSIS
    Local Static Web Server for CLS Conference App
.DESCRIPTION
    Launches a lightweight PowerShell HTTP listener serving static files (HTML, CSS, JS, CSV)
    at http://localhost:8000 and LAN IP for mobile testing.
#>

$port = 8000
$root = $PSScriptRoot
$url = "http://localhost:$port/"

Write-Host "==========================================================" -ForegroundColor DarkMagenta
Write-Host "  CLS Conference 2026 Local Web Server" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor DarkMagenta
Write-Host "Root Directory: $root" -ForegroundColor Gray
Write-Host "Local URL:      http://localhost:$port/" -ForegroundColor Green
Write-Host "Mobile LAN URL: http://192.168.1.6:$port/" -ForegroundColor Yellow
Write-Host "Press Ctrl+C in this terminal to stop the server." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor DarkMagenta

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")
try {
    $listener.Prefixes.Add("http://192.168.1.6:$port/")
} catch {}

try {
    $listener.Start()
} catch {
    # If admin rights required for 192.168.1.6, fallback to localhost prefix
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".csv"  = "text/csv; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".svg"  = "image/svg+xml"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $relPath = $request.Url.LocalPath.TrimStart('/')
        if (-not $relPath) { $relPath = "index.html" }
        $filePath = Join-Path $root $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            
            $response.ContentType = $mime
            $response.AddHeader("Access-Control-Allow-Origin", "*")

            try {
                $stream = [System.IO.File]::Open($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
                $buffer = New-Object byte[] $stream.Length
                [void]$stream.Read($buffer, 0, $stream.Length)
                $stream.Close()

                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            } catch {
                Write-Warning "Could not read file ${filePath}: $_"
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found: $relPath")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}
