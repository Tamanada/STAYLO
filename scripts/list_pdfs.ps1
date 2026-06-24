Remove-Item 'C:\Users\David\Desktop\test-pdf.pdf' -ErrorAction SilentlyContinue
$folder = 'C:\Users\David\Desktop\INVESTORS docs OFFICIAL JUNE 2026\PDF'
Get-ChildItem $folder | ForEach-Object {
  $size = [math]::Round($_.Length / 1MB, 1)
  Write-Output ("  {0,-32} {1,5} MB" -f $_.Name, $size)
}
$total = (Get-ChildItem $folder | Measure-Object Length -Sum).Sum
Write-Output ("`nTotal: {0:N1} MB across {1} PDFs" -f ($total/1MB), (Get-ChildItem $folder).Count)
