$browser = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $browser)) {
  $browser = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}
Write-Output "Using: $browser"

$source = "C:\Users\David\Desktop\INVESTORS docs OFFICIAL JUNE 2026"
$outDir = Join-Path $source "PDF"
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
Write-Output "Output: $outDir`n"

$htmlFiles = @(
  "pitch.html",
  "pitch-hotelier.html",
  "pitch-crypto.html",
  "investors\index.html",
  "investors\one-pager.html",
  "investors\executive-summary.html",
  "investors\whitepaper.html",
  "investors\term-sheet.html",
  "investors\cap-table.html",
  "investors\projection-36m.html",
  "investors\dossier-strategique.html",
  "investors\valuation-rationale.html"
)

$ok = 0
$fail = 0
foreach ($rel in $htmlFiles) {
  $src = Join-Path $source $rel
  if (-not (Test-Path $src)) { Write-Output "MISS $rel"; $fail++; continue }
  $name = [System.IO.Path]::GetFileNameWithoutExtension($rel)
  $pdf = Join-Path $outDir "$name.pdf"
  $url = "file:///" + ($src -replace '\\','/' )
  Write-Output ("  -> {0}.pdf" -f $name)

  # Direct invocation — no Invoke-Expression, no string juggling
  & $browser --headless --disable-gpu "--print-to-pdf=$pdf" --no-pdf-header-footer $url 2>&1 | Out-Null

  Start-Sleep -Milliseconds 500
  if (Test-Path $pdf) {
    $size = (Get-Item $pdf).Length
    Write-Output ("     OK ({0:N1} KB)" -f ($size/1024))
    $ok++
  } else {
    Write-Output "     FAIL"
    $fail++
  }
}

Write-Output ("`n[done] {0} OK, {1} failed" -f $ok, $fail)
Write-Output ("       PDFs in: {0}" -f $outDir)
