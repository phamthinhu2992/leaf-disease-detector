#!/usr/bin/env powershell
<#
.SYNOPSIS
Test EfficientNetB0 H5 Model Prediction
.DESCRIPTION
Quick test của API /api/predict-h5
#>

$ErrorActionPreference = "Continue"

Write-Host @"
╔════════════════════════════════════════════════╗
║  🧪 EfficientNetB0 H5 Model Test              ║
╚════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Server config
$SERVER = "http://192.168.1.3:8765"
$MODELS_ENDPOINT = "$SERVER/api/models"
$PREDICT_H5_ENDPOINT = "$SERVER/api/predict-h5"

# Test 1: Check available models
Write-Host "`n📋 Test 1: List Available Models" -ForegroundColor Yellow
Write-Host "GET $MODELS_ENDPOINT" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $MODELS_ENDPOINT -TimeoutSec 5 -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Response: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📊 Models available: $($data.models.Count)"
    
    foreach ($model in $data.models) {
        Write-Host "`n   Model: $($model.name)"
        Write-Host "   - Type: $($model.type)"
        Write-Host "   - Endpoint: $($model.endpoint)"
        Write-Host "   - Status: $($model.status)"
    }
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Find test image
Write-Host "`n`n📸 Test 2: Looking for test image..." -ForegroundColor Yellow

$testImages = @(
    "test_image.jpg",
    "sample.jpg",
    "leaf.jpg",
    "tests/test_image.jpg"
)

$imageFound = $null

foreach ($img in $testImages) {
    if (Test-Path $img) {
        $imageFound = $img
        Write-Host "✅ Found: $img" -ForegroundColor Green
        break
    }
}

if ($null -eq $imageFound) {
    Write-Host "⚠️  No test image found in current directory" -ForegroundColor Yellow
    Write-Host "   To test prediction:"
    Write-Host "   1. Place an image file (JPG/PNG) in current directory"
    Write-Host "   2. Run: .\test_h5.ps1" -ForegroundColor Gray
}
else {
    # Test 3: Predict with image
    Write-Host "`n📊 Test 3: Predict Disease" -ForegroundColor Yellow
    Write-Host "POST $PREDICT_H5_ENDPOINT" -ForegroundColor Gray
    Write-Host "Image: $imageFound`n" -ForegroundColor Gray
    
    try {
        $fileStream = [System.IO.File]::OpenRead($imageFound)
        $boundary = [System.Guid]::NewGuid().ToString()
        
        # Create multipart form
        $LF = "`r`n"
        $body = @()
        $body += "--$boundary"
        $body += "Content-Disposition: form-data; name=`"image`"; filename=`"$imageFound`""
        $body += "Content-Type: application/octet-stream"
        $body += ""
        
        $fileBytes = [System.IO.File]::ReadAllBytes($imageFound)
        
        Write-Host "⏳ Sending request..." -ForegroundColor Yellow
        
        $response = Invoke-WebRequest -Uri $PREDICT_H5_ENDPOINT `
            -Method Post `
            -ContentType "multipart/form-data; boundary=$boundary" `
            -InFile $imageFound `
            -TimeoutSec 60 `
            -UseBasicParsing
        
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.success) {
            Write-Host "`n✅ Prediction successful!" -ForegroundColor Green
            
            $data = $result.data
            Write-Host "`n📊 RESULTS:" -ForegroundColor Yellow
            Write-Host "   Disease: $($data.disease)" -ForegroundColor Cyan
            Write-Host "   Confidence: $($data.confidence_percent)" -ForegroundColor Cyan
            Write-Host "   Valid: $($data.is_valid)" -ForegroundColor Cyan
            Write-Host "   Severity: $($data.severity)" -ForegroundColor Cyan
            
            Write-Host "`n🎯 Top Predictions:" -ForegroundColor Yellow
            foreach ($pred in $data.topk_predictions) {
                Write-Host "   $($pred.rank). $($pred.disease): $($pred.confidence_percent)"
            }
            
            Write-Host "`n⏱️  Processing time: $($data.processing_time_ms)ms" -ForegroundColor Gray
        }
        else {
            Write-Host "❌ Error: $($result.error)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n`n" + ("=" * 50) -ForegroundColor Gray
Write-Host "✅ Testing complete!" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - H5_INTEGRATION_COMPLETE.md - Full integration guide"
Write-Host "   - model/predict_h5.py - Python prediction script"
Write-Host "   - test_h5.py - Python test script"
Write-Host ""

Write-Host "🌐 Server Access:" -ForegroundColor Yellow
Write-Host "   - http://192.168.1.3:8765 - Main app"
Write-Host "   - http://192.168.1.3:8765/test-upload - Test interface"
Write-Host "   - http://192.168.1.3:8765/api/models - Available models"
Write-Host ""
