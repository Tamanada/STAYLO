$src  = 'C:\Users\David\Desktop\STAYLO-repo\public'
$dest = 'C:\Users\David\Desktop\staylo-ship-core'

if (Test-Path $dest) {
  Write-Output "Removing existing $dest ..."
  Remove-Item $dest -Recurse -Force
}
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Write-Output "Created: $dest"

$files = @('ship.html', 'SHIP_LOGO.png', 'SHIP_LOGO.webp', 'ShipBanner.png', 'ShipBanner.webp')
foreach ($f in $files) {
  $s = Join-Path $src $f
  if (Test-Path $s) {
    Copy-Item -Path $s -Destination $dest
    Write-Output "  copied: $f"
  } else {
    Write-Output "  MISSING: $f"
  }
}

# Create README + LICENSE + .gitignore
$readme = @'
# staylo-ship-core

Shared core of **SHIP by STAYLO** — the all-in-one hotelier OS.

This repo is designed to be included as a **git submodule** in two
downstream projects:

- **STAYLO** — the cooperative booking platform · https://staylo.app
  Mounted at `public/ship-core/`, served at `staylo.app/ship-core/ship.html`

- **SHIP by STAYLO** (standalone) — SaaS product for independent hoteliers
  Mounted at `public/ship-core/`, served at `app.ship.app/ship.html`

## Contents

| File | Purpose |
|---|---|
| `ship.html` | The full SHIP app (single-file vanilla JS, ~17.8k lines) |
| `SHIP_LOGO.png` / `.webp` | SHIP brand mark |
| `ShipBanner.png` / `.webp` | Hero banner |

## Development

Any bug fix or feature added here flows automatically to BOTH downstream
projects the next time they run:

```bash
git submodule update --remote public/ship-core
```

## License

Proprietary. Operated by BAROKAT HALAL FOOD CO., LTD. (Thailand)
doing business as "SHIP by STAYLO". All rights reserved.
'@

$readme | Set-Content -Path (Join-Path $dest 'README.md') -Encoding utf8
Write-Output "  created: README.md"

$gitignore = @'
# OS
.DS_Store
Thumbs.db

# Editors
.vscode/
.idea/
*.swp

# Logs
*.log
'@

$gitignore | Set-Content -Path (Join-Path $dest '.gitignore') -Encoding utf8
Write-Output "  created: .gitignore"

Write-Output ""
Write-Output ("Final contents of {0}:" -f $dest)
Get-ChildItem $dest | ForEach-Object {
  $size = if ($_.Length -gt 1024) { "$([math]::Round($_.Length/1KB, 1)) KB" } else { "$($_.Length) B" }
  Write-Output ("  {0,-30} {1,10}" -f $_.Name, $size)
}
