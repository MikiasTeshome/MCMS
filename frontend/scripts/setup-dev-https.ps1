# Generates trusted HTTPS certs for local + LAN dev (requires mkcert).
# Run from repo root: npm run setup:https --prefix frontend

$ErrorActionPreference = 'Stop'
$frontendRoot = Split-Path -Parent $PSScriptRoot
$certsDir = Join-Path $frontendRoot '.certs'

if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
  Write-Host ''
  Write-Host 'mkcert is not installed. Install it with:'
  Write-Host '  winget install -e --id FiloSottile.mkcert'
  Write-Host ''
  exit 1
}

Write-Host 'Installing local Certificate Authority (Windows may prompt for admin)...'
mkcert -install

$lanIp = (
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' -and
    $_.PrefixOrigin -ne 'WellKnown'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress
)

if (-not $lanIp) {
  $lanIp = '192.168.1.9'
  Write-Host "Could not detect LAN IP; using default $lanIp (edit script if needed)."
} else {
  Write-Host "Detected LAN IP: $lanIp"
}

New-Item -ItemType Directory -Force -Path $certsDir | Out-Null

mkcert `
  -key-file (Join-Path $certsDir 'key.pem') `
  -cert-file (Join-Path $certsDir 'cert.pem') `
  localhost 127.0.0.1 ::1 $lanIp

$caRoot = mkcert -CAROOT
$rootCa = Join-Path $caRoot 'rootCA.pem'

Write-Host ''
Write-Host 'Certificates written to frontend/.certs/'
Write-Host ''
Write-Host '--- PC: restart dev server ---'
Write-Host '  npm run dev'
Write-Host ''
Write-Host '--- Phone: install the trust certificate (one-time) ---'
Write-Host "  1. Copy this file to your phone: $rootCa"
Write-Host "  2. Android Chrome: Settings > Security > Install a certificate > CA certificate"
Write-Host '     (or open the file from Files and follow prompts)'
Write-Host '  3. iPhone: AirDrop/email rootCA.pem > install profile > Settings > General > VPN & Device Management > Trust'
Write-Host ''
Write-Host "Then open: https://${lanIp}:5173"
Write-Host ''
