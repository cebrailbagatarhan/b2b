[CmdletBinding()]
param(
  [double]$MinimumFreeGb = 4.0,
  [double]$AbortBelowFreeGb = 2.5,
  [int]$MaxProcessTreeMb = 1300,
  [int]$NodeHeapMb = 512,
  [int]$Port = 3100,
  [int]$StartupTimeoutSeconds = 60,
  [ValidateSet('all', 'core', 'commerce')]
  [string]$CheckSet = 'all'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nextBin = Join-Path $workspace 'node_modules\next\dist\bin\next'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$logDirectory = Join-Path $workspace '.next\smoke-test'
$stdoutLog = Join-Path $logDirectory "$CheckSet-stdout.log"
$stderrLog = Join-Path $logDirectory "$CheckSet-stderr.log"
$script:PeakProcessTreeMb = 0.0
$script:LowestFreeGb = [double]::MaxValue

function Get-FreeRamGb {
  $os = Get-CimInstance Win32_OperatingSystem
  return [math]::Round($os.FreePhysicalMemory / 1MB, 2)
}

function Get-DescendantProcessIds([int]$RootProcessId) {
  $ids = New-Object 'System.Collections.Generic.List[int]'
  $ids.Add($RootProcessId)

  for ($index = 0; $index -lt $ids.Count; $index++) {
    $parentId = $ids[$index]
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentId"
    foreach ($child in $children) {
      if (!$ids.Contains([int]$child.ProcessId)) {
        $ids.Add([int]$child.ProcessId)
      }
    }
  }

  return $ids.ToArray()
}

function Get-ProcessTreeMemoryMb([int]$RootProcessId) {
  $ids = Get-DescendantProcessIds $RootProcessId
  $bytes = (Get-Process -Id $ids -ErrorAction SilentlyContinue |
      Measure-Object -Property WorkingSet64 -Sum).Sum

  if ($null -eq $bytes) { return 0.0 }
  return [math]::Round($bytes / 1MB, 2)
}

function Assert-MemoryBudget([int]$RootProcessId) {
  $freeGb = Get-FreeRamGb
  $treeMb = Get-ProcessTreeMemoryMb $RootProcessId
  $script:PeakProcessTreeMb = [math]::Max($script:PeakProcessTreeMb, $treeMb)
  $script:LowestFreeGb = [math]::Min($script:LowestFreeGb, $freeGb)

  if ($freeGb -lt $AbortBelowFreeGb) {
    throw "Smoke test durduruldu: boş RAM $freeGb GB seviyesine düştü."
  }
  if ($treeMb -gt $MaxProcessTreeMb) {
    throw "Smoke test durduruldu: proje süreç ağacı $treeMb MB sınırını aştı."
  }
}

function Test-LocalPort([int]$TargetPort) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect('127.0.0.1', $TargetPort, $null, $null)
    if (!$async.AsyncWaitHandle.WaitOne(250)) { return $false }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Stop-VerifiedProcessTree([int]$RootProcessId) {
  $ids = @(Get-DescendantProcessIds $RootProcessId)
  [array]::Reverse($ids)

  foreach ($processId in $ids) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

if ($CheckSet -eq 'all') {
  & $PSCommandPath `
    -MinimumFreeGb $MinimumFreeGb `
    -AbortBelowFreeGb $AbortBelowFreeGb `
    -MaxProcessTreeMb $MaxProcessTreeMb `
    -NodeHeapMb $NodeHeapMb `
    -Port $Port `
    -StartupTimeoutSeconds $StartupTimeoutSeconds `
    -CheckSet 'core'

  & $PSCommandPath `
    -MinimumFreeGb $MinimumFreeGb `
    -AbortBelowFreeGb $AbortBelowFreeGb `
    -MaxProcessTreeMb $MaxProcessTreeMb `
    -NodeHeapMb $NodeHeapMb `
    -Port $Port `
    -StartupTimeoutSeconds $StartupTimeoutSeconds `
    -CheckSet 'commerce'

  return
}

if (!(Test-Path -LiteralPath $nextBin)) {
  throw 'Next.js yerel bağımlılığı bulunamadı. Önce npm ci çalıştırın.'
}

$initialFreeGb = Get-FreeRamGb
if ($initialFreeGb -lt $MinimumFreeGb) {
  throw "Smoke test başlatılmadı: en az $MinimumFreeGb GB boş RAM gerekli, mevcut $initialFreeGb GB."
}

if (Test-LocalPort $Port) {
  throw "$Port portu kullanımda; mevcut sürece dokunulmadı."
}

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$oldNodeOptions = $env:NODE_OPTIONS
$env:NODE_OPTIONS = "--max-old-space-size=$NodeHeapMb"
$serverProcess = $null
$httpClient = $null
$httpHandler = $null

try {
  $serverProcess = Start-Process `
    -FilePath $nodePath `
    -ArgumentList @($nextBin, 'dev', '--webpack', '-H', '127.0.0.1', '-p', "$Port") `
    -WorkingDirectory $workspace `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

  $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
  while (!(Test-LocalPort $Port)) {
    if ($serverProcess.HasExited) {
      throw "Next.js başlamadan kapandı (exit $($serverProcess.ExitCode))."
    }
    Assert-MemoryBudget $serverProcess.Id
    if ((Get-Date) -gt $deadline) {
      throw 'Next.js belirtilen sürede dinlemeye başlamadı.'
    }
    Start-Sleep -Milliseconds 750
  }

  $httpHandler = [System.Net.Http.HttpClientHandler]::new()
  $httpHandler.AllowAutoRedirect = $false
  $httpClient = [System.Net.Http.HttpClient]::new($httpHandler)
  $httpClient.Timeout = [TimeSpan]::FromSeconds(30)
  $checks = if ($CheckSet -eq 'core') {
    @(
      @{ Route = '/api/health'; Expected = @(200) }
      @{ Route = '/giris'; Expected = @(200) }
      @{ Route = '/kayit'; Expected = @(200) }
      @{ Route = '/'; Expected = @(200) }
      @{ Route = '/urun/smoke-does-not-exist'; Expected = @(404) }
    )
  } else {
    @(
      @{ Route = '/api/health'; Expected = @(200) }
      @{ Route = '/kategoriler'; Expected = @(200) }
      @{ Route = '/sepet'; Expected = @(200) }
      @{ Route = '/sepet/odeme'; Expected = @(200) }
      @{ Route = '/admin/musteriler'; Expected = @(303, 307, 308); RedirectTo = '/giris' }
    )
  }

  foreach ($check in $checks) {
    $route = $check.Route
    $url = "http://127.0.0.1:$Port$route"
    $requestTask = $httpClient.GetAsync($url)

    while (!$requestTask.IsCompleted) {
      if ($serverProcess.HasExited) {
        throw "Next.js $route isteği sırasında kapandı."
      }
      Assert-MemoryBudget $serverProcess.Id
      Start-Sleep -Milliseconds 750
    }

    $response = $requestTask.GetAwaiter().GetResult()
    $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    Assert-MemoryBudget $serverProcess.Id

    $statusCode = [int]$response.StatusCode
    if ($check.Expected -notcontains $statusCode) {
      $preview = $body.Substring(0, [math]::Min(300, $body.Length))
      throw "$route beklenmeyen HTTP $statusCode döndürdü: $preview"
    }

    if ($check.RedirectTo) {
      $location = $response.Headers.Location
      if ($null -eq $location -or !$location.OriginalString.EndsWith($check.RedirectTo)) {
        throw "$route beklenen $($check.RedirectTo) yönlendirmesini döndürmedi."
      }
    }

    Write-Output "PASS $route HTTP $statusCode"
    $response.Dispose()
  }

  Write-Output "RAM başlangıç: $initialFreeGb GB boş"
  Write-Output "RAM testte görülen en düşük: $([math]::Round($script:LowestFreeGb, 2)) GB boş"
  Write-Output "Proje süreç ağacı tepe değeri: $([math]::Round($script:PeakProcessTreeMb, 2)) MB"
} catch {
  if (Test-Path -LiteralPath $stderrLog) {
    [Console]::Error.WriteLine(
      (Get-Content -LiteralPath $stderrLog -Tail 30) -join [Environment]::NewLine
    )
  }
  throw
} finally {
  if ($null -ne $httpClient) { $httpClient.Dispose() }
  if ($null -ne $serverProcess) {
    Stop-VerifiedProcessTree $serverProcess.Id
    Start-Sleep -Milliseconds 500
  }

  if ($null -eq $oldNodeOptions) {
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  } else {
    $env:NODE_OPTIONS = $oldNodeOptions
  }

  Write-Output "RAM süreçler kapatıldıktan sonra: $(Get-FreeRamGb) GB boş"
}
