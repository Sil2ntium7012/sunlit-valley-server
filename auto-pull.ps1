# ============================================================
#  하이의 놀이터 - 설정 자동 동기화
#
#  서버 폴더(C:\hisunlit-server)에서 실행해두면 30초마다 git pull 을
#  돌려서 항상 최신 설정을 받아둡니다. 게임에서는 /reload 만 치면 됩니다.
#
#  실행:  powershell -ExecutionPolicy Bypass -File auto-pull.ps1
#
#  RCON 을 켜두면 새 변경을 받았을 때 /reload 까지 자동으로 보냅니다.
#    server.properties 에  enable-rcon=true / rcon.port=25575 / rcon.password=<비번>
#    그리고 mcrcon.exe 를 서버 폴더에 두고 아래 값을 채우세요.
# ============================================================

$RconExe      = Join-Path $PSScriptRoot "mcrcon.exe"
$RconPort     = 25575
$RconPassword = ""          # 비워두면 자동 /reload 안 함
$IntervalSec  = 30

Set-Location $PSScriptRoot
Write-Host "[auto-pull] 감시 시작: $PSScriptRoot"
if ($RconPassword -and (Test-Path $RconExe)) {
    Write-Host "[auto-pull] RCON 사용: 변경 감지 시 /reload 자동 실행"
} else {
    Write-Host "[auto-pull] RCON 미사용: 변경을 받으면 게임에서 /reload 를 쳐주세요"
}

while ($true) {
    try {
        $before = (git rev-parse HEAD).Trim()
        git pull --ff-only 2>&1 | Out-Null
        $after = (git rev-parse HEAD).Trim()

        if ($before -ne $after) {
            $now = Get-Date -Format "HH:mm:ss"
            Write-Host "[auto-pull] $now  새 변경 받음  $($before.Substring(0,7)) -> $($after.Substring(0,7))"

            if ($RconPassword -and (Test-Path $RconExe)) {
                & $RconExe -H 127.0.0.1 -P $RconPort -p $RconPassword "reload" "kubejs reload server_scripts" | Out-Null
                Write-Host "[auto-pull] $now  /reload 전송 완료"
            } else {
                [console]::beep(880, 200)
            }
        }
    } catch {
        Write-Host "[auto-pull] 오류: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds $IntervalSec
}
