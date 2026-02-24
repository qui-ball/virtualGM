# Virtual GM – WSL2 network access for mobile devices
# Run as Administrator (launch.sh --wsl does this via Start-Process -Verb RunAs)
# so other devices on your network can reach the dev server (frontend 5173, backend 8000).

$FrontendPort = 5173
$BackendPort = 8000

# Get WSL2 IP (where backend container and frontend dev server run)
$wslOut = wsl hostname -I 2>$null
$WslIp = $null
if ($wslOut) {
    $WslIp = ($wslOut.Trim() -split '\s+')[0]
}
if (-not $WslIp) {
    Write-Error "Could not get WSL IP. Is WSL running? Try: wsl hostname -I"
    exit 1
}

Write-Host "WSL2 IP: $WslIp"
Write-Host "Setting up port forwarding ${FrontendPort}, ${BackendPort} -> $WslIp"
Write-Host ""

# Remove existing rules (idempotent)
netsh interface portproxy delete v4tov4 listenport=$FrontendPort listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=$BackendPort listenaddress=0.0.0.0 2>$null

# Add port forwarding
netsh interface portproxy add v4tov4 listenport=$FrontendPort listenaddress=0.0.0.0 connectport=$FrontendPort connectaddress=$WslIp
netsh interface portproxy add v4tov4 listenport=$BackendPort listenaddress=0.0.0.0 connectport=$BackendPort connectaddress=$WslIp

# Firewall rules (inbound TCP)
$ruleNameFrontend = "VirtualGM Dev $FrontendPort"
$ruleNameBackend = "VirtualGM Dev $BackendPort"
netsh advfirewall firewall delete rule name="$ruleNameFrontend" 2>$null
netsh advfirewall firewall delete rule name="$ruleNameBackend" 2>$null
netsh advfirewall firewall add rule name="$ruleNameFrontend" dir=in action=allow protocol=TCP localport=$FrontendPort
netsh advfirewall firewall add rule name="$ruleNameBackend" dir=in action=allow protocol=TCP localport=$BackendPort

$HostIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Ethernet' -and $_.IPAddress -notmatch '^169\.' } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "Done. Mobile devices can use:"
Write-Host "  Frontend: http://${HostIp}:${FrontendPort}" -ForegroundColor Green
Write-Host "  Backend:  http://${HostIp}:${BackendPort}" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Run again if WSL or Docker restarts (WSL IP may change)."
