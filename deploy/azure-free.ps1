param(
  [string]$Location = 'mexicocentral',
  [string]$ResourceGroup = 'rg-efficient-parking-free-mx',
  [string]$Suffix = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
# Pass -Suffix 22394fa4 to reuse the existing app and plan instead of creating new ones.
$suffix = if ($Suffix) { $Suffix } else { [guid]::NewGuid().ToString('N').Substring(0, 8) }
$appName = "efficient-parking-$suffix"
$planName = "asp-parking-free-$suffix"
$script:AzCommand = (Get-Command az.cmd -ErrorAction SilentlyContinue).Source
if (-not $script:AzCommand) {
  $script:AzCommand = 'C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd'
}
$bootstrapSettingsConfigured = $false

function Invoke-Az {
  param([string[]]$Arguments)
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $script:AzCommand @Arguments 2>&1 | ForEach-Object { "$_" } | Write-Host
  $ErrorActionPreference = $previousPreference
  if ($LASTEXITCODE -ne 0) {    throw "Azure CLI failed while running 'az $($Arguments[0])'. Review the error above."
  }
}

if (-not (Test-Path $script:AzCommand)) {
  throw 'Azure CLI is required. Install it from https://aka.ms/installazurecliwindows and rerun this script.'
}

$subscriptionId = (& $script:AzCommand account show --query id --output tsv 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $subscriptionId) {
  Write-Host 'Inicia sesión en Azure en la ventana del navegador que se abrirá.'
  Invoke-Az @('login')
  $subscriptionId = (& $script:AzCommand account show --query id --output tsv)
  if ($LASTEXITCODE -ne 0 -or -not $subscriptionId) {
    throw 'No se encontró una suscripción Azure activa después del inicio de sesión.'
  }
}

Write-Host "Suscripción seleccionada: $subscriptionId"
$credentialBytes = New-Object byte[] 24
$randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $randomGenerator.GetBytes($credentialBytes)
  $adminId = [string]([long]([BitConverter]::ToUInt32($credentialBytes, 0) % 9000000000L) + 1000000000L)
  $adminPassword = [Convert]::ToBase64String($credentialBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}
finally {
  $randomGenerator.Dispose()
  [Array]::Clear($credentialBytes, 0, $credentialBytes.Length)
}

$randomBytes = New-Object byte[] 48
$randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $randomGenerator.GetBytes($randomBytes)
  $jwtSecret = [Convert]::ToBase64String($randomBytes)
}
finally {
  $randomGenerator.Dispose()
  [Array]::Clear($randomBytes, 0, $randomBytes.Length)
}

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) "efficient-parking-azure-$suffix"
$stage = Join-Path $tempRoot 'package'
$zipPath = Join-Path $tempRoot 'site.zip'

try {
  Invoke-Az @('provider', 'register', '--namespace', 'Microsoft.Web', '--wait', '--output', 'none')

  Push-Location $repoRoot
  try {
    $env:EXPO_PUBLIC_API_URL = '/eficient-parking-lot'
    & npx expo export --platform web
    if ($LASTEXITCODE -ne 0) {
      throw 'No se pudo generar la exportación web de Expo.'
    }
  }
  finally {
    Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
    Pop-Location
  }

  New-Item -ItemType Directory -Path (Join-Path $stage 'backend') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $stage 'dist') -Force | Out-Null
  Copy-Item (Join-Path $repoRoot 'backend\server.cjs') (Join-Path $stage 'backend\server.cjs')
  Copy-Item (Join-Path $repoRoot 'backend\database.cjs') (Join-Path $stage 'backend\database.cjs')
  Copy-Item (Join-Path $repoRoot 'backend\package.json') (Join-Path $stage 'package.json')
  Copy-Item (Join-Path $repoRoot 'backend\package-lock.json') (Join-Path $stage 'package-lock.json')
  Copy-Item (Join-Path $repoRoot 'dist\*') (Join-Path $stage 'dist') -Recurse
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  $zipStream = [IO.File]::Open($zipPath, [IO.FileMode]::Create)
  $archive = New-Object IO.Compression.ZipArchive($zipStream, [IO.Compression.ZipArchiveMode]::Create)
  try {
    $stageFull = (Resolve-Path $stage).Path.TrimEnd('\')
    Get-ChildItem $stageFull -Recurse -File | ForEach-Object {
      $entryName = $_.FullName.Substring($stageFull.Length + 1).Replace('\', '/')
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $entryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  }
  finally {
    $archive.Dispose()
    $zipStream.Dispose()
  }

  Invoke-Az @('group', 'create', '--name', $ResourceGroup, '--location', $Location, '--output', 'none')
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $existingApp = (& $script:AzCommand webapp show --name $appName --resource-group $ResourceGroup --query name --output tsv 2>$null)
  $ErrorActionPreference = $previousPreference
  if (-not $existingApp) {
    Invoke-Az @('appservice', 'plan', 'create', '--name', $planName, '--resource-group', $ResourceGroup, '--location', $Location, '--sku', 'F1', '--is-linux', '--output', 'none')
    Invoke-Az @('webapp', 'create', '--name', $appName, '--resource-group', $ResourceGroup, '--plan', $planName, '--runtime', 'NODE:22-lts', '--https-only', 'true', '--output', 'none')
  }

  $appSettings = @(
    "NODE_ENV=production",
    'PORT=8080',
    'HOST=0.0.0.0',
    'WEB_ROOT=/home/site/wwwroot/dist',
    'SQLITE_PATH=/home/data/parking.sqlite',
    'SQLITE_JOURNAL_MODE=DELETE',
    'DEMO_DATA=false',
    'WEBSITES_ENABLE_APP_SERVICE_STORAGE=true',
    'WEBSITE_NODE_DEFAULT_VERSION=~22',
    'SCM_DO_BUILD_DURING_DEPLOYMENT=true',
    "JWT_SECRET=$jwtSecret",
    "BOOTSTRAP_ADMIN_ID=$adminId",
    "BOOTSTRAP_ADMIN_PASSWORD=$adminPassword",
    'BOOTSTRAP_ADMIN_NAME=Administradora'
  )
  Invoke-Az (@('webapp', 'config', 'appsettings', 'set', '--name', $appName, '--resource-group', $ResourceGroup, '--settings') + $appSettings + @('--output', 'none'))
  $bootstrapSettingsConfigured = $true
  Invoke-Az @('webapp', 'config', 'set', '--name', $appName, '--resource-group', $ResourceGroup, '--startup-file', 'node backend/server.cjs', '--output', 'none')
  Invoke-Az @('webapp', 'deploy', '--name', $appName, '--resource-group', $ResourceGroup, '--src-path', $zipPath, '--type', 'zip', '--output', 'none')

  $baseUrl = "https://$appName.azurewebsites.net"
  $ready = $false
  for ($attempt = 0; $attempt -lt 36; $attempt += 1) {
    try {
      $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 10
      $loginPage = Invoke-WebRequest -Uri "$baseUrl/login" -UseBasicParsing -TimeoutSec 10
      if ($health.StatusCode -eq 200 -and $loginPage.StatusCode -eq 200) {
        $ready = $true
        break
      }
      Start-Sleep -Seconds 10
    }
    catch {
      Start-Sleep -Seconds 10
    }
  }

  if (-not $ready) {
    throw "Azure desplegó los recursos, pero la comprobación de /health o /login no respondió. URL: $baseUrl"
  }

  Invoke-Az @('webapp', 'config', 'appsettings', 'delete', '--name', $appName, '--resource-group', $ResourceGroup, '--setting-names', 'BOOTSTRAP_ADMIN_ID', 'BOOTSTRAP_ADMIN_PASSWORD', 'BOOTSTRAP_ADMIN_NAME', '--output', 'none')
  $bootstrapSettingsConfigured = $false
  $ready = $false
  for ($attempt = 0; $attempt -lt 36; $attempt += 1) {
    try {
      $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 10
      if ($health.StatusCode -eq 200) {
        $ready = $true
        break
      }
      Start-Sleep -Seconds 10
    }
    catch {
      Start-Sleep -Seconds 10
    }
  }
  if (-not $ready) {
    throw "La API no respondió tras retirar la clave de bootstrap. URL: $baseUrl"
  }

  $loginBody = @{ cedula = $adminId; password = $adminPassword } | ConvertTo-Json -Compress
  $loginCheck = Invoke-RestMethod -Uri "$baseUrl/eficient-parking-lot/login.php" -Method Post -ContentType 'application/json' -Body $loginBody -TimeoutSec 15
  if (-not $loginCheck.success -or $loginCheck.user.rol -ne 'admin') {
    throw 'La comprobación del usuario administrador en Azure no fue exitosa.'
  }

  Write-Host ''
  Write-Host 'Despliegue gratuito de Azure validado.'
  Write-Host "Web y API: $baseUrl"
  Write-Host "Panel: $baseUrl/dashboard"
  Write-Host "Grupo de recursos: $ResourceGroup"
  Write-Host "Usuario administrador: $adminId"
  Write-Host "Contraseña temporal: $adminPassword"
  Write-Host 'Guarda estas credenciales ahora: la contraseña no se conserva en los ajustes de Azure.'
}
finally {
  if ($bootstrapSettingsConfigured) {
    try {
      Invoke-Az @('webapp', 'config', 'appsettings', 'delete', '--name', $appName, '--resource-group', $ResourceGroup, '--setting-names', 'BOOTSTRAP_ADMIN_ID', 'BOOTSTRAP_ADMIN_PASSWORD', 'BOOTSTRAP_ADMIN_NAME', '--output', 'none')
    }
    catch {
      Write-Warning "No se pudo retirar la contraseña de bootstrap de los ajustes de Azure. Elimínala manualmente en App Service > Configuración."
    }
  }
  $adminPassword = $null
  $jwtSecret = $null
  if (Test-Path $tempRoot) {
    Remove-Item $tempRoot -Recurse -Force
  }
}
