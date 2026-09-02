$projectRoot = Split-Path -Parent $PSScriptRoot
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $bundledNode) { $nodePath = $bundledNode }
elseif ($nodeCommand) { $nodePath = $nodeCommand.Source }
else { throw 'Node.js runtime not found.' }

& $nodePath (Join-Path $projectRoot 'src\generate.mjs') `
  --main 'C:\Users\Lony\Music\UPPL Energy MAIN METER readings for the month of August-2026.xlsx' `
  --backup 'C:\Users\Lony\Music\UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx' `
  --template 'C:\Users\Lony\Music\UPPL Monthly Energy Reading August-2026.xlsx' `
  --month '2026-08'

exit $LASTEXITCODE
