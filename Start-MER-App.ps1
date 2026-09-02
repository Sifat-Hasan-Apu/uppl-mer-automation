Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$projectRoot = $PSScriptRoot
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $bundledNode) { $nodePath = $bundledNode }
elseif ($nodeCommand) { $nodePath = $nodeCommand.Source }
else { [System.Windows.Forms.MessageBox]::Show('Node.js runtime not found.'); exit 1 }

$form = New-Object System.Windows.Forms.Form
$form.Text = 'UPPL MER Automation and Audit System'
$form.Size = New-Object System.Drawing.Size(920, 620)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [System.Drawing.Color]::FromArgb(244, 247, 250)
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'UPPL MER Automation and Audit System'
$title.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 18)
$title.Location = New-Object System.Drawing.Point(30, 22)
$title.AutoSize = $true
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = 'Strict meter validation, automatic MER generation, cross-check and print-ready PDF'
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(75, 85, 99)
$subtitle.Location = New-Object System.Drawing.Point(33, 60)
$subtitle.AutoSize = $true
$form.Controls.Add($subtitle)

function Add-FileRow([string]$labelText, [int]$top, [string]$defaultValue) {
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $labelText
    $label.Location = New-Object System.Drawing.Point(34, $top)
    $label.Size = New-Object System.Drawing.Size(150, 25)
    $form.Controls.Add($label)
    $textBox = New-Object System.Windows.Forms.TextBox
    $textBox.Location = New-Object System.Drawing.Point(185, ($top - 3))
    $textBox.Size = New-Object System.Drawing.Size(610, 28)
    $textBox.Text = $defaultValue
    $form.Controls.Add($textBox)
    $button = New-Object System.Windows.Forms.Button
    $button.Text = 'Browse'
    $button.Location = New-Object System.Drawing.Point(805, ($top - 4))
    $button.Size = New-Object System.Drawing.Size(80, 30)
    $button.Add_Click({
        $dialog = New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Filter = 'Excel Workbook (*.xlsx)|*.xlsx'
        if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $textBox.Text = $dialog.FileName }
    }.GetNewClosure())
    $form.Controls.Add($button)
    return $textBox
}

$mainBox = Add-FileRow 'Main meter file' 110 'C:\Users\Lony\Music\UPPL Energy MAIN METER readings for the month of August-2026.xlsx'
$backupBox = Add-FileRow 'Back-up meter file' 155 'C:\Users\Lony\Music\UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx'
$templateBox = Add-FileRow 'Approved MER template' 200 'C:\Users\Lony\Music\UPPL Monthly Energy Reading August-2026.xlsx'

$monthLabel = New-Object System.Windows.Forms.Label
$monthLabel.Text = 'Billing month'
$monthLabel.Location = New-Object System.Drawing.Point(34, 248)
$monthLabel.Size = New-Object System.Drawing.Size(150, 25)
$form.Controls.Add($monthLabel)
$monthBox = New-Object System.Windows.Forms.TextBox
$monthBox.Location = New-Object System.Drawing.Point(185, 245)
$monthBox.Size = New-Object System.Drawing.Size(160, 28)
$monthBox.Text = '2026-08'
$form.Controls.Add($monthBox)

$generateButton = New-Object System.Windows.Forms.Button
$generateButton.Text = 'VALIDATE AND GENERATE MER'
$generateButton.Location = New-Object System.Drawing.Point(560, 240)
$generateButton.Size = New-Object System.Drawing.Size(325, 42)
$generateButton.BackColor = [System.Drawing.Color]::FromArgb(15, 118, 110)
$generateButton.ForeColor = [System.Drawing.Color]::White
$generateButton.FlatStyle = 'Flat'
$form.Controls.Add($generateButton)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(34, 305)
$logBox.Size = New-Object System.Drawing.Size(851, 220)
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = 'Vertical'
$logBox.Font = New-Object System.Drawing.Font('Consolas', 9)
$logBox.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($logBox)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Ready. Output is blocked unless every validation passes.'
$status.Location = New-Object System.Drawing.Point(34, 540)
$status.Size = New-Object System.Drawing.Size(700, 25)
$form.Controls.Add($status)

$generateButton.Add_Click({
    $generateButton.Enabled = $false
    $status.Text = 'Running strict validation...'
    $status.ForeColor = [System.Drawing.Color]::FromArgb(31, 41, 55)
    $form.Refresh()
    try {
        foreach ($file in @($mainBox.Text, $backupBox.Text, $templateBox.Text)) {
            if (-not (Test-Path -LiteralPath $file)) { throw "File not found: $file" }
        }
        if ($monthBox.Text -notmatch '^\d{4}-(0[1-9]|1[0-2])$') { throw 'Billing month must be YYYY-MM.' }
        $scriptPath = Join-Path $projectRoot 'src\generate.mjs'
        $result = & $nodePath $scriptPath --main $mainBox.Text --backup $backupBox.Text --template $templateBox.Text --month $monthBox.Text 2>&1 | Out-String
        $logBox.Text = $result
        if ($LASTEXITCODE -ne 0) { throw 'Validation or generation failed. See the detailed log.' }
        $status.Text = 'VERIFIED - Excel, PDF and audit report generated successfully.'
        $status.ForeColor = [System.Drawing.Color]::FromArgb(5, 150, 105)
        [System.Windows.Forms.MessageBox]::Show('MER generation completed and verified.', 'UPPL MER', 'OK', 'Information') | Out-Null
        Start-Process (Join-Path $projectRoot 'output')
    }
    catch {
        $logBox.AppendText("`r`nERROR: $($_.Exception.Message)")
        $status.Text = 'NOT VERIFIED - Output blocked.'
        $status.ForeColor = [System.Drawing.Color]::FromArgb(220, 38, 38)
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'MER generation blocked', 'OK', 'Error') | Out-Null
    }
    finally { $generateButton.Enabled = $true }
})

[void]$form.ShowDialog()
