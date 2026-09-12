// ─────────────────────────────────────────────────────────────────────────────
//  하이의 놀이터 - 스택 크기 조정 (16개 -> 64개)
//
//  ⚠ 스택 크기는 서버와 클라이언트가 반드시 같아야 합니다.
//    한쪽만 바뀌면 아이템이 유령처럼 보이거나 인벤토리가 꼬입니다.
//    이 파일은 startup_scripts 라 클라이언트에도 들어가야 하므로,
//    수정하면 반드시 클라팩을 다시 빌드해서 배포하세요.
//
//  ⚠ startup_scripts 는 /reload 로 적용되지 않습니다. 서버·클라 모두 재시작.
// ─────────────────────────────────────────────────────────────────────────────

// 여기 적힌 아이템을 64개까지 겹치게 만듭니다.
// 빼고 싶으면 줄을 지우고, 더하고 싶으면 아이템 ID 를 추가하세요.
const STACK_TO_64 = [
  // 요청 품목
  "minecraft:egg",
  "minecraft:snowball",
  "minecraft:bucket", // 빈 양동이만. 물/용암/우유 양동이는 원래 1개라 그대로입니다.

  // 표지판
  "minecraft:oak_sign",
  "minecraft:spruce_sign",
  "minecraft:birch_sign",
  "minecraft:jungle_sign",
  "minecraft:acacia_sign",
  "minecraft:dark_oak_sign",
  "minecraft:mangrove_sign",
  "minecraft:cherry_sign",
  "minecraft:bamboo_sign",
  "minecraft:crimson_sign",
  "minecraft:warped_sign",

  // 걸이 표지판
  "minecraft:oak_hanging_sign",
  "minecraft:spruce_hanging_sign",
  "minecraft:birch_hanging_sign",
  "minecraft:jungle_hanging_sign",
  "minecraft:acacia_hanging_sign",
  "minecraft:dark_oak_hanging_sign",
  "minecraft:mangrove_hanging_sign",
  "minecraft:cherry_hanging_sign",
  "minecraft:bamboo_hanging_sign",
  "minecraft:crimson_hanging_sign",
  "minecraft:warped_hanging_sign",

  // 그 밖의 바닐라 16개 제한 품목
  "minecraft:armor_stand",
  "minecraft:honey_bottle",
  "minecraft:ender_pearl", // 이동/전투 영향이 있지만 요청으로 포함

  //
  // ※ 깃발(banner)도 16개 제한이지만 색깔별로 16종이라 목록이 길어져서 뺐습니다.
  //   필요하면 말씀해 주세요.
];

ItemEvents.modification(function (event) {
  let changed = 0;
  STACK_TO_64.forEach(function (id) {
    try {
      event.modify(id, function (item) {
        item.maxStackSize = 64;
      });
      changed++;
    } catch (e) {
      // 해당 아이템이 없는 경우(모드 구성 변경 등)에도 서버는 계속 떠야 합니다.
      console.warn("[하이의 놀이터] 스택 조정 실패 (" + id + "): " + e);
    }
  });
  console.info(
    "[하이의 놀이터] 스택 64개로 조정: " + changed + "/" + STACK_TO_64.length + "종"
  );
});
