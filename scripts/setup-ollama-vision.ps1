$ErrorActionPreference = 'Stop'

Write-Host 'Parça Avcısı - Ollama Vision kurulumu' -ForegroundColor Cyan

$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw 'Ollama bulunamadı ve winget yok. Ollama''yı resmi Windows yükleyicisiyle kurup bu scripti tekrar çalıştır.'
  }
  Write-Host 'Ollama kuruluyor...' -ForegroundColor Yellow
  winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
}

$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
  throw 'Ollama kuruldu ancak terminal PATH içinde görünmüyor. Terminali kapatıp yeniden aç ve scripti tekrar çalıştır.'
}

Write-Host 'Qwen3-VL 8B indiriliyor...' -ForegroundColor Yellow
ollama pull qwen3-vl:8b

Write-Host ''
Write-Host 'Kurulum tamamlandı.' -ForegroundColor Green
ollama list
Write-Host ''
Write-Host 'Test:' -ForegroundColor Cyan
Write-Host 'node scripts/ollama-vision-test.mjs C:\path\parca1.jpg C:\path\parca2.jpg'
Write-Host ''
Write-Host 'Not: 8B model için tercihen en az 12 GB, rahat kullanım için 16+ GB VRAM/RAM payı hedefle.' -ForegroundColor DarkGray
