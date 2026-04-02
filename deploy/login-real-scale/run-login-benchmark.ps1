param(
    [Parameter(Mandatory = $true)][string]$BaseUrl,
    [Parameter(Mandatory = $true)][string]$Email,
    [Parameter(Mandatory = $true)][string]$Password,
    [int]$BusinessId = 0,
    [string]$Users = '20,40,60,80,100',
    [string]$RunTime = '2m',
    [double]$SpawnRate = 5,
    [string]$OutputDir = 'load-tests\results\phase-auth-runtime-gunicorn-4x1-real2-full',
    [string]$DatabaseUrl = '',
    [string]$DockerDbContainer = '',
    [string]$DockerDbUser = 'postgres',
    [string]$DockerDbName = 'cuaderno',
    [string]$DockerContainers = ''
)

$cmd = @(
    '.venv\Scripts\python.exe',
    'load-tests\capacity_runner.py',
    '--base-url', $BaseUrl,
    '--email', $Email,
    '--password', $Password,
    '--business-id', $BusinessId,
    '--users', $Users,
    '--scenarios', 'LOGIN',
    '--run-time', $RunTime,
    '--spawn-rate', $SpawnRate,
    '--output-dir', $OutputDir
)

if ($DatabaseUrl) {
    $cmd += @('--database-url', $DatabaseUrl)
}
if ($DockerDbContainer) {
    $cmd += @('--docker-db-container', $DockerDbContainer, '--docker-db-user', $DockerDbUser, '--docker-db-name', $DockerDbName)
}
if ($DockerContainers) {
    $cmd += @('--docker-containers', $DockerContainers)
}

& $cmd[0] $cmd[1..($cmd.Length - 1)]
exit $LASTEXITCODE
