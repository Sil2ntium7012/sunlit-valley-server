// ============================================================================
//  하이의 놀이터 - /spawn, /스폰 명령어
//
//  월드 스폰(마을 광장)으로 돌아갑니다. OP가 아니어도 누구나 쓸 수 있습니다.
//
//  ⚠️ 왜 예전엔 OP만 됐나
//  예전 버전은 플레이어 권한으로 /tp 를 실행했습니다. 바닐라 /tp 는 권한 레벨 2
//  (= OP) 가 필요해서, 일반 플레이어가 쓰면 조용히 실패했습니다.
//  이제는 서버 콘솔 권한으로 텔레포트하고, 그것도 안 되면 직접 좌표를 옮깁니다.
//
//  ⚠️ 이 파일도 Rhino 제약 때문에 함수 안에서 변수를 선언하지 않습니다.
//     (자세한 설명은 serverAutomation.js 맨 위 주석 참고)
// ============================================================================

// ─── 설정 ───────────────────────────────────────────────────────────────────
// 도착 위치. yaw 는 바라보는 방향(90 = 서쪽), pitch 는 고개 각도(0 = 수평).
const SPAWN = { x: 928.5, y: 75, z: 650.5, yaw: 90, pitch: 0 };

const SPAWN_COOLDOWN_SEC = 3;  // 연타 방지
const SPAWN_DIMENSION = "minecraft:overworld";
// ────────────────────────────────────────────────────────────────────────────

var spawnCooldown = {};   // 닉네임 -> 마지막 사용 시각(ms)
var scName, scNow, scLeft, scCmd, scPlayer, scServer, scDone;

// 누구나 쓸 수 있게 하는 권한 조건
function anyone(src) {
  return true;
}

function goSpawn(player) {
  scName = player.username;
  scNow = Date.now();

  if (spawnCooldown[scName]) {
    scLeft = Math.ceil((SPAWN_COOLDOWN_SEC * 1000 - (scNow - spawnCooldown[scName])) / 1000);
    if (scLeft > 0) {
      player.tell(Text.of("잠시 후 다시 시도해 주세요 (" + scLeft + "초)").red());
      return 0;
    }
  }

  scDone = false;

  // 1순위: 서버 콘솔 권한으로 실행 (플레이어 권한과 무관)
  try {
    scServer = player.server;
    if (scServer) {
      scCmd =
        "execute in " + SPAWN_DIMENSION + " run tp " + scName + " " +
        SPAWN.x + " " + SPAWN.y + " " + SPAWN.z + " " + SPAWN.yaw + " " + SPAWN.pitch;
      scServer.runCommandSilent(scCmd);
      scDone = true;
    }
  } catch (err) {
    scDone = false;
  }

  // 2순위: 명령어가 막히면 좌표로 직접 이동
  if (!scDone) {
    try {
      player.setPosition(SPAWN.x, SPAWN.y, SPAWN.z);
      scDone = true;
    } catch (err2) {
      player.tell(Text.of("스폰 이동에 실패했습니다. 관리자에게 알려주세요.").red());
      return 0;
    }
  }

  spawnCooldown[scName] = scNow;
  player.tell(Text.of("마을 광장으로 돌아왔습니다.").color(0x8be0a8));
  return 1;
}

ServerEvents.commandRegistry(function (event) {
  // /spawn 과 /스폰 둘 다 같은 동작, 권한 제한 없음
  event.register(
    event.commands.literal("spawn").requires(anyone).executes(function (ctx) {
      scPlayer = ctx.source.player;
      return scPlayer ? goSpawn(scPlayer) : 0;
    })
  );
  event.register(
    event.commands.literal("스폰").requires(anyone).executes(function (ctx) {
      scPlayer = ctx.source.player;
      return scPlayer ? goSpawn(scPlayer) : 0;
    })
  );
});

console.info("[하이의 놀이터] /spawn, /스폰 명령어 등록됨 (권한 제한 없음)");
