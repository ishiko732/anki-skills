# anki-connect.ps1 — Thin PowerShell wrapper for AnkiConnect API
# Usage: anki-connect.ps1 <action> [params_json]
# Example: anki-connect.ps1 deckNames
# Example: anki-connect.ps1 addNote '{"note":{"deckName":"Default","modelName":"Basic","fields":{"Front":"Q","Back":"A"}}}'

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Action,

    [Parameter(Position = 1)]
    [string]$Params
)

$AnkiConnectUrl = if ($env:ANKI_CONNECT_URL) { $env:ANKI_CONNECT_URL } else { "http://127.0.0.1:8765" }

if ($Params) {
    $body = '{"action":"' + $Action + '","version":6,"params":' + $Params + '}'
} else {
    $body = '{"action":"' + $Action + '","version":6}'
}

try {
    $response = Invoke-RestMethod -Uri $AnkiConnectUrl -Method Post -ContentType "application/json" -Body $body -TimeoutSec 10
    $response | ConvertTo-Json -Depth 10 -Compress
} catch {
    Write-Error "Error: Cannot connect to AnkiConnect at $AnkiConnectUrl"
    Write-Error "Make sure Anki is running and AnkiConnect plugin (2055492159) is installed."
    exit 1
}
