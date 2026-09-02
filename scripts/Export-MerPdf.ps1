param(
    [Parameter(Mandatory = $true)][string]$InputXlsx,
    [Parameter(Mandatory = $true)][string]$OutputPdf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$resolvedInput = (Resolve-Path -LiteralPath $InputXlsx).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPdf)
$outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutput)
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
if (Test-Path -LiteralPath $resolvedOutput) {
    Remove-Item -LiteralPath $resolvedOutput -Force
}
$startedAt = Get-Date
$existingExcelIds = @(Get-Process EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })

$excel = $null
$workbook = $null
$worksheet = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    for ($attempt = 1; $attempt -le 5 -and -not $workbook; $attempt++) {
        try { $workbook = $excel.Workbooks.Open($resolvedInput, 0, $true) }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds (400 * $attempt)
        }
    }
    if (-not $workbook) { throw 'Excel did not open the generated workbook.' }
    $worksheet = $workbook.Worksheets.Item(1)
    $worksheet.PageSetup.PrintArea = '$A$2:$O$36'
    $worksheet.PageSetup.Orientation = 2
    $worksheet.PageSetup.Zoom = $false
    $worksheet.PageSetup.FitToPagesWide = 1
    $worksheet.PageSetup.FitToPagesTall = 1
    $worksheet.PageSetup.CenterHorizontally = $true
    $worksheet.PageSetup.LeftMargin = $excel.InchesToPoints(0.25)
    $worksheet.PageSetup.RightMargin = $excel.InchesToPoints(0.25)
    $worksheet.PageSetup.TopMargin = $excel.InchesToPoints(0.30)
    $worksheet.PageSetup.BottomMargin = $excel.InchesToPoints(0.30)
    $exported = $false
    for ($attempt = 1; $attempt -le 5 -and -not $exported; $attempt++) {
        try {
            $worksheet.ExportAsFixedFormat(0, $resolvedOutput, 0, $true, $false)
            $exported = $true
        }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds (500 * $attempt)
        }
    }
    if (-not (Test-Path -LiteralPath $resolvedOutput)) {
        throw "Excel did not create the PDF output."
    }
    $pdfInfo = Get-Item -LiteralPath $resolvedOutput
    if ($pdfInfo.Length -lt 10000 -or $pdfInfo.LastWriteTime -lt $startedAt.AddSeconds(-2)) {
        throw "Excel created an invalid or stale PDF output."
    }
    Write-Output "PDF exported: $resolvedOutput"
}
catch {
    Write-Error "MER PDF export failed: $($_.Exception.Message)"
    exit 1
}
finally {
    if ($workbook) { try { $workbook.Close($false) } catch {} }
    if ($excel) { try { $excel.Quit() } catch {} }
    if ($worksheet) { try { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($worksheet) } catch {} }
    if ($workbook) { try { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($workbook) } catch {} }
    if ($excel) { try { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel) } catch {} }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
    Start-Sleep -Milliseconds 500
    $newExcelProcesses = @(Get-Process EXCEL -ErrorAction SilentlyContinue | Where-Object { $existingExcelIds -notcontains $_.Id -and $_.MainWindowTitle -eq '' })
    foreach ($process in $newExcelProcesses) {
        try { Stop-Process -Id $process.Id -Force -ErrorAction Stop } catch {}
    }
}
