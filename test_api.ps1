# Test API prediction endpoint
$imagePath = Get-ChildItem "D:\huy\leaf-disease-detector-1\data\organized\Pepper\Bell_Bacterial_Spot" -File | Select-Object -First 1 | ForEach-Object FullName
Write-Host "🖼️  Testing API with image: $imagePath" -ForegroundColor Green
Write-Host "📤 Uploading to http://localhost:8765/api/predict..." -ForegroundColor Yellow

try {
    $response = curl -X POST -F "image=@`"$imagePath`"" http://localhost:8765/api/predict -s
    Write-Host "✅ Response received!" -ForegroundColor Green
    Write-Host $response | ConvertFrom-Json | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
