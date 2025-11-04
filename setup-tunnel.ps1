# Setup Cloudflare Tunnel for HTTPS
# Script to create tunnel and expose local server

Write-Host "🌐 Setting up Cloudflare Tunnel..." -ForegroundColor Cyan

$cloudflaredPath = "C:\Windows\Temp\cloudflared.exe"
$tunnelName = "leaf-disease-detector"
$localUrl = "http://localhost:8765"

# Check if cloudflared exists
if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "❌ cloudflared not found at $cloudflaredPath" -ForegroundColor Red
    exit 1
}

# Create tunnel
Write-Host "📍 Creating tunnel: $tunnelName" -ForegroundColor Yellow
& $cloudflaredPath tunnel create $tunnelName

# Get tunnel ID
Write-Host "🔍 Getting tunnel ID..." -ForegroundColor Yellow
$tunnelId = & $cloudflaredPath tunnel list | Select-String $tunnelName | ForEach-Object { $_.ToString().Split()[0] }

Write-Host "✅ Tunnel ID: $tunnelId" -ForegroundColor Green

# Create config file
$configDir = "$env:USERPROFILE\.cloudflared"
$configFile = "$configDir\config.yml"

if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$config = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - hostname: leaf-disease-detector.pages.dev
    service: $localUrl
  - service: http_status:404
"@

Set-Content -Path $configFile -Value $config -Force
Write-Host "📝 Config created at: $configFile" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Tunnel setup complete!" -ForegroundColor Green
Write-Host "📍 Your HTTPS URL will be: https://leaf-disease-detector.pages.dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start tunnel, run:" -ForegroundColor Yellow
Write-Host "  $cloudflaredPath tunnel run $tunnelName" -ForegroundColor White
Write-Host ""
