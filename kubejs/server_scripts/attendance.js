// ============================================================================
//  하이의 놀이터 - 접속 보상
//
//  하루 플레이타임이 1시간을 넘으면 출석 보상을 받을 수 있습니다.
//    · 1시간을 채우면 채팅으로 알림
//    · 받지 않으면 30분마다 다시 알림
//    · /출석 으로 수령 -> "출석 코인" 1개
//    · 출석 코인 5개를 망고 상점에 가져가면 자동 쓰다듬기 기계와 교환
//
//  하루 기준은 실제 날짜(서버 시각)입니다. 자정에 초기화됩니다.
//
//  ⚠️ Rhino 제약: 반복 호출되는 함수 안에서 const/let/var 선언 금지.
//     모든 변수는 맨 위에 한 번만 선언하고 함수 안에서는 대입만 합니다.
// ============================================================================

// ─── 설정 ───────────────────────────────────────────────────────────────────
const REWARD_AFTER_SEC = 3600;     // 1시간
const REMIND_EVERY_SEC = 1800;     // 30분마다 재알림
const COIN_COUNT = 1;              // 한 번 받을 때 주는 코인 개수

// 출석 코인. 아래 NBT 는 망고 상점의 교환 조건과 글자 하나까지 같아야 합니다.
const COIN_ITEM = "minecraft:gold_nugget";
const COIN_NBT =
  "{hiCoin:1b,display:{Name:'{\"text\":\"출석 코인\",\"italic\":false,\"color\":\"gold\",\"bold\":true}'," +
  "Lore:['{\"text\":\"하루 1시간 접속 보상\",\"italic\":false,\"color\":\"gray\"}'," +
  "'{\"text\":\"5개를 모아 망고에게 가져가세요\",\"italic\":false,\"color\":\"dark_gray\"}']}}";
// ────────────────────────────────────────────────────────────────────────────

// ─── 상태 ───
var atLastSecond = -1;
var atFailures = 0;
var atDisabled = false;

// ─── 함수용 변수 (전부 여기서 한 번만 선언) ───
var apOut;                                       // prefixed
var tdNow;                                       // today
var tkPlayers, tkI, tkP, tkDay, tkSec, tkDone, tkLast;  // tick
var cmPlayer, cmSec, cmDone, cmItem;             // claim
var stPlayer, stSec, stLeft, stMin;              // status

function apPrefixed(body) {
  apOut = Text.of("[하이의 놀이터] ").color(0xffd479);
  return apOut.append(body);
}

// 오늘 날짜를 20260908 같은 정수로
function today() {
  tdNow = new Date();
  return tdNow.getFullYear() * 10000 + (tdNow.getMonth() + 1) * 100 + tdNow.getDate();
}

// ─── 1초마다 플레이타임 적립 ────────────────────────────────────────────────
ServerEvents.tick(function (event) {
  if (atDisabled) return;
  try {
    tkSec = new Date().getSeconds();
    if (tkSec === atLastSecond) return;
    atLastSecond = tkSec;

    tkPlayers = event.server.players;
    if (tkPlayers.length === 0) return;
    tkDay = today();

    for (tkI = 0; tkI < tkPlayers.length; tkI++) {
      tkP = tkPlayers[tkI];

      // 날짜가 바뀌었으면 초기화
      if (tkP.persistentData.getInt("hiPlayDay") !== tkDay) {
        tkP.persistentData.putInt("hiPlayDay", tkDay);
        tkP.persistentData.putInt("hiPlaySec", 0);
        tkP.persistentData.putInt("hiClaimed", 0);
        tkP.persistentData.putInt("hiRemind", 0);
      }

      tkSec = tkP.persistentData.getInt("hiPlaySec") + 1;
      tkP.persistentData.putInt("hiPlaySec", tkSec);

      tkDone = tkP.persistentData.getInt("hiClaimed");
      if (tkDone === 1) continue;
      if (tkSec < REWARD_AFTER_SEC) continue;

      // 1시간을 막 채운 순간
      if (tkSec === REWARD_AFTER_SEC) {
        tkP.persistentData.putInt("hiRemind", tkSec);
        tkP.tell(
          apPrefixed(Text.of("오늘 1시간을 채웠습니다! 출석 보상을 받으세요").color(0x8be0a8))
        );
        tkP.tell(Text.of("      /출석 을 입력하면 출석 코인을 받습니다").gray());
        tkP.server.runCommandSilent(
          "execute at " + tkP.username +
            " run playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 1 1.2"
        );
        continue;
      }

      // 30분마다 재알림
      tkLast = tkP.persistentData.getInt("hiRemind");
      if (tkSec - tkLast >= REMIND_EVERY_SEC) {
        tkP.persistentData.putInt("hiRemind", tkSec);
        tkP.tell(apPrefixed(Text.of("아직 출석 보상을 안 받으셨어요! /출석").yellow()));
        tkP.server.runCommandSilent(
          "execute at " + tkP.username +
            " run playsound minecraft:block.note_block.bell master @s ~ ~ ~ 0.7 1.6"
        );
      }
    }
    atFailures = 0;
  } catch (err) {
    atFailures++;
    console.error("[하이의 놀이터] 접속 보상 오류(" + atFailures + "회): " + err);
    if (atFailures >= 10) {
      atDisabled = true;
      console.error("[하이의 놀이터] 오류가 반복돼 접속 보상을 중단합니다.");
    }
  }
});

// ─── /출석 ──────────────────────────────────────────────────────────────────
function anyoneAt(src) {
  return true;
}

function claimReward(player) {
  cmPlayer = player;

  if (cmPlayer.persistentData.getInt("hiPlayDay") !== today()) {
    cmPlayer.persistentData.putInt("hiPlayDay", today());
    cmPlayer.persistentData.putInt("hiPlaySec", 0);
    cmPlayer.persistentData.putInt("hiClaimed", 0);
    cmPlayer.persistentData.putInt("hiRemind", 0);
  }

  cmDone = cmPlayer.persistentData.getInt("hiClaimed");
  if (cmDone === 1) {
    cmPlayer.tell(apPrefixed(Text.of("오늘 보상은 이미 받으셨습니다.").gray()));
    return 0;
  }

  cmSec = cmPlayer.persistentData.getInt("hiPlaySec");
  if (cmSec < REWARD_AFTER_SEC) {
    stLeft = REWARD_AFTER_SEC - cmSec;
    stMin = Math.ceil(stLeft / 60);
    cmPlayer.tell(
      apPrefixed(Text.of("아직 " + stMin + "분 더 플레이해야 합니다.").gray())
    );
    return 0;
  }

  cmPlayer.persistentData.putInt("hiClaimed", 1);
  cmItem = Item.of(COIN_ITEM, COIN_NBT);
  cmItem.count = COIN_COUNT;
  cmPlayer.give(cmItem);

  cmPlayer.tell(
    apPrefixed(Text.of("출석 코인").gold().bold()).append(Text.of(" 을 받았습니다!").white())
  );
  cmPlayer.tell(Text.of("      5개를 모아 망고에게 가져가면 자동 쓰다듬기 기계와 바꿔줍니다").gray());
  cmPlayer.server.runCommandSilent(
    "execute at " + cmPlayer.username +
      " run particle minecraft:totem_of_undying ~ ~1 ~ 0.4 0.6 0.4 0.4 80 force"
  );
  cmPlayer.server.runCommandSilent(
    "execute at " + cmPlayer.username +
      " run playsound minecraft:entity.player.levelup master @a ~ ~ ~ 1 1.2"
  );
  return 1;
}

function showStatus(player) {
  stPlayer = player;
  if (stPlayer.persistentData.getInt("hiPlayDay") !== today()) {
    stPlayer.tell(apPrefixed(Text.of("오늘 플레이타임 0분 / 60분").gray()));
    return 1;
  }
  stSec = stPlayer.persistentData.getInt("hiPlaySec");
  stMin = Math.floor(stSec / 60);
  stPlayer.tell(
    apPrefixed(Text.of("오늘 플레이타임 " + stMin + "분 / 60분").white())
  );
  if (stPlayer.persistentData.getInt("hiClaimed") === 1) {
    stPlayer.tell(Text.of("      오늘 보상 수령 완료").green());
  } else if (stSec >= REWARD_AFTER_SEC) {
    stPlayer.tell(Text.of("      /출석 으로 보상을 받으세요!").color(0x8be0a8));
  } else {
    stLeft = Math.ceil((REWARD_AFTER_SEC - stSec) / 60);
    stPlayer.tell(Text.of("      " + stLeft + "분 남았습니다").gray());
  }
  return 1;
}

ServerEvents.commandRegistry(function (event) {
  event.register(
    event.commands
      .literal("출석")
      .requires(anyoneAt)
      .executes(function (ctx) {
        return ctx.source.player ? claimReward(ctx.source.player) : 0;
      })
  );
  event.register(
    event.commands
      .literal("플레이타임")
      .requires(anyoneAt)
      .executes(function (ctx) {
        return ctx.source.player ? showStatus(ctx.source.player) : 0;
      })
  );
  // 관리자: 출석 코인 지급
  event.register(
    event.commands
      .literal("출석코인지급")
      .requires(function (src) {
        try { return src.hasPermission(2); } catch (e) { return false; }
      })
      .then(
        event.commands
          .argument("대상", event.arguments.PLAYER.create(event))
          .then(
            event.commands
              .argument("개수", event.arguments.INTEGER.create(event))
              .executes(function (ctx) {
                cmPlayer = event.arguments.PLAYER.getResult(ctx, "대상");
                if (!cmPlayer) return 0;
                cmItem = Item.of(COIN_ITEM, COIN_NBT);
                cmItem.count = event.arguments.INTEGER.getResult(ctx, "개수");
                cmPlayer.give(cmItem);
                cmPlayer.tell(apPrefixed(Text.of("출석 코인을 지급받았습니다!").gold()));
                return 1;
              })
          )
      )
  );
});

console.info("[하이의 놀이터] 접속 보상 스크립트 로드됨 (1시간 / 30분 재알림)");
