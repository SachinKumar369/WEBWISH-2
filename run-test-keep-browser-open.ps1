#!/usr/bin/env pwsh

# WebWish Test Runner with Browser Control
# Usage: .\run-test-keep-browser-open.ps1 -TestFile "tests/login.spec.ts" -TestName "TC_LOGIN_001"

param(
    [string]$TestFile = "tests/login.spec.ts",
    [string]$TestName = "",
    [string]$Project = "chromium",
    [switch]$NoKeepOpen,
    [int]$PauseDuration = 5000
)

Write-Host "
╔════════════════════════════════════════════════════════════════╗
║       WebWish Playwright Test Runner - Browser Control       ║
╚════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Set environment variables
if (-not $NoKeepOpen) {
    $env:KEEP_BROWSER_OPEN = 'true'
    Write-Host "✅ KEEP_BROWSER_OPEN is enabled" -ForegroundColor Green
    Write-Host "   Browser will stay open after test completion" -ForegroundColor Gray
} else {
    Remove-Item env:KEEP_BROWSER_OPEN -ErrorAction SilentlyContinue
    $env:PAUSE_ON_FINISH = $PauseDuration
    Write-Host "⏱️  Browser will close after $($PauseDuration)ms" -ForegroundColor Yellow
}

# Build command
$command = "npx playwright test `"$TestFile`" --project=$Project --headed"

if ($TestName) {
    $command += " -g `"$TestName`""
}

$command += " --workers=1"

Write-Host ""
Write-Host "Test Configuration:" -ForegroundColor Cyan
Write-Host "  📄 Test File: $TestFile"
Write-Host "  🎯 Test Name: $(if ($TestName) { $TestName } else { 'All tests in file' })"
Write-Host "  🌐 Browser: $Project"
Write-Host "  🖥️  Mode: Headed (visible)"
Write-Host ""
Write-Host "Running command:" -ForegroundColor Cyan
Write-Host "  $command" -ForegroundColor Gray
Write-Host ""

# Run test
Invoke-Expression $command

