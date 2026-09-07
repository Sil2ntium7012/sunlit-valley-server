// ============================================================================
//  하이의 놀이터 - /spawn, /스폰 명령어
//
//  월드 스폰(오버월드 스폰 지점)으로 돌아갑니다.
//
//  도착 좌표와 바라보는 방향은 아래 SPAWN 에 고정돼 있습니다.
//  광장을 옮기면 그 값만 바꿔주세요.
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
var scName, scNow, scLeft, scCmd, scPlayer;

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

  spawnCooldown[scName] = scNow;
  scCmd =
    "execute in " + SPAWN_DIMENSION + " run tp @s " +
    SPAWN.x + " " + SPAWN.y + " " + SPAWN.z + " " + SPAWN.yaw + " " + SPAWN.pitch;
  player.runCommandSilent(scCmd);
  player.tell(Text.of("마을 광장으로 돌아왔습니다.").color(0x8be0a8));
  return 1;
}

ServerEvents.commandRegistry(function (event) {
  // /spawn 과 /스폰 둘 다 같은 동작
  event.register(
    event.commands.literal("spawn").executes(function (ctx) {
      scPlayer = ctx.source.player;
      return scPlayer ? goSpawn(scPlayer) : 0;
    })
  );
  event.register(
    event.commands.literal("스폰").executes(function (ctx) {
      scPlayer = ctx.source.player;
      return scPlayer ? goSpawn(scPlayer) : 0;
    })
  );
});

console.info("[하이의 놀이터] /spawn, /스폰 명령어 등록됨");
