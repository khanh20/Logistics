$projects = @(
    "Services\Core\LG.Core.API\LG.Core.API.csproj",
    "Services\Authentication\LG.Authentication.API\LG.Authentication.API.csproj",
    "Services\Module1\LG.Module1.API\LG.Module1.API.csproj",
    "Services\Module2\LG.Module2.API\LG.Module2.API.csproj"
)
$procs = @()
foreach ($p in $projects) {
    $name = (Split-Path $p -Leaf)
    $logOut = "$name.out.log"
    $logErr = "$name.err.log"
    Write-Host "Starting $name..."
    $proc = Start-Process -FilePath "dotnet" -ArgumentList "run --no-build --project `"$p`"" -RedirectStandardOutput $logOut -RedirectStandardError $logErr -PassThru -WindowStyle Hidden
    $procs += @{ Proc = $proc; LogOut = $logOut; LogErr = $logErr; Name = $name }
}

Write-Host "Waiting 20 seconds for services to start..."
Start-Sleep -Seconds 20

foreach ($p in $procs) {
    $proc = $p.Proc
    if (-not $proc.HasExited) {
        Write-Host "$($p.Name) is still running. Stopping it..."
        Stop-Process -Id $proc.Id -Force
    } else {
        Write-Host "$($p.Name) exited with code $($proc.ExitCode)."
    }
}

Write-Host "`n--- LOGS ---"
foreach ($p in $procs) {
    Write-Host "`n=== $($p.Name) OUT ==="
    Get-Content $p.LogOut -Tail 30 -ErrorAction SilentlyContinue
    Write-Host "`n=== $($p.Name) ERR ==="
    Get-Content $p.LogErr -Tail 30 -ErrorAction SilentlyContinue
}
