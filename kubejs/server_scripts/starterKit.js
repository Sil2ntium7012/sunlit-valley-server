// ─────────────────────────────────────────────────────────────────────────────
//  하이의 놀이터 - 첫 접속 시작 물품
//
//  플레이어당 딱 한 번만 지급합니다. 지급 여부는 persistentData 에 기록하므로
//  재접속·사망·차원이동으로 다시 받는 일은 없습니다.
//
//  기존 유저도 다음 접속 때 한 번 받습니다(아직 기록이 없으니까요).
//  그게 싫으면 아래 GIVE_TO_EXISTING 를 false 로 두고, 이미 플레이 중인
//  사람들에게는 수동으로 주세요.
// ─────────────────────────────────────────────────────────────────────────────

const STARTER_FLAG = "hiStarterKit"; // persistentData 키
const STARTER_DELAY_TICKS = 40; // 접속 직후엔 인벤토리가 아직 준비 전일 수 있어 2초 뒤 지급

// 지급 목록. [아이템 ID, 개수] 이며 개수를 빼면 1개입니다.
// 인벤토리가 꽉 차 있으면 발밑에 떨어집니다.
const STARTER_ITEMS = [
  ["minecraft:iron_pickaxe"],
  ["minecraft:iron_axe"],
  ["minecraft:iron_shovel"],
  ["minecraft:iron_hoe"],
  ["dew_drop_watering_cans:iron_watering_can"],
  ["sophisticatedbackpacks:backpack"],
  ["minecraft:cooked_beef", 32],
];

PlayerEvents.loggedIn(function (event) {
  let skPlayer = event.player;
  if (!skPlayer) return;

  // 이 코드베이스에서 검증된 방식(gacha.js 의 칭호 저장과 동일)으로 문자열 플래그를 씁니다.
  let skData = skPlayer.persistentData;
  if (("" + skData.getString(STARTER_FLAG)) === "1") return; // 이미 받음

  // 아이템을 주기 전에 먼저 기록합니다.
  // 아래에서 문제가 생기더라도 접속할 때마다 다시 주는 일은 없어야 하니까요.
  skData.putString(STARTER_FLAG, "1");

  event.server.scheduleInTicks(STARTER_DELAY_TICKS, function () {
    try {
      // 예약 사이에 나갔을 수 있으니 다시 확인
      let p = event.server.getPlayer(skPlayer.username);
      if (!p) return;

      let given = 0;
      STARTER_ITEMS.forEach(function (entry) {
        let id = entry[0];
        let count = entry.length > 1 ? entry[1] : 1;
        try {
          p.give(Item.of(id, count));
          given++;
        } catch (e) {
          console.warn("[하이의 놀이터] 시작 물품 지급 실패 (" + id + "): " + e);
        }
      });

      p.tell(
        Text.of("")
          .append(Text.of("[하이의 놀이터] ").gold().bold())
          .append(Text.of("환영합니다! 시작 물품을 드렸어요.").white())
      );
      p.tell(
        Text.of("  철 곡괭이 · 도끼 · 삽 · 괭이, 철 물뿌리개, 배낭, 스테이크 32개").gray()
      );

      if (given < STARTER_ITEMS.length) {
        p.tell(
          Text.of("  일부 물품을 드리지 못했어요. 관리자에게 알려주세요.").red()
        );
      }
    } catch (err) {
      console.warn("[하이의 놀이터] 시작 물품 지급 중 오류: " + err);
    }
  });
});

console.info(
  "[하이의 놀이터] 시작 물품 스크립트 로드됨 (" + STARTER_ITEMS.length + "종)"
);
