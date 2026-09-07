// ============================================================================
//  하이의 놀이터 - 뽑기 상자 / 칭호 / 발광
//
//  [칭호 뽑기 상자]  supplementaries:present_black  (NBT hiGacha="title")
//     우클릭 또는 버리기 -> 10% 칭호 획득 / 90% 꽝
//     뽑은 칭호는 계정에 쌓이고 /칭호 로 골라서 착용
//
//  [발광 뽑기 상자]  supplementaries:present_yellow (NBT hiGacha="glow")
//     우클릭 또는 버리기 -> 0.1% 무지개 / 2% 일반색 / 97.9% 꽝
//     당첨되면 "발광 염료" 아이템이 나오고, 그걸 우클릭하면 발광이 켜짐
//
//  구현: 플레이어마다 개인 스코어보드 팀(hi_<닉>)을 만들어서
//        prefix = 칭호, color = 발광 테두리 색 을 동시에 건다.
//        무지개는 팀 color 를 계속 돌린다.
//
//  ⚠️ Rhino 제약: 반복 호출되는 함수 안에서 const/let/var 선언 금지.
//     모든 변수는 이 파일 맨 위에 한 번만 선언하고, 함수 안에서는 대입만 한다.
// ============================================================================

// ─── 확률 설정 ──────────────────────────────────────────────────────────────
const TITLE_WIN_CHANCE = 0.10;    // 칭호 당첨 10%
const GLOW_RAINBOW_CHANCE = 0.001; // 무지개 0.1%
const GLOW_WIN_CHANCE = 0.021;     // 무지개 포함 누적 2.1% (= 일반색 2%)

const RAINBOW_TICK = 4;            // 무지개 색 바뀌는 주기(틱)
const GLOW_DURATION = 1000000;     // 발광 지속(초). 로그인마다 갱신
// ────────────────────────────────────────────────────────────────────────────

// ─── 칭호 목록 ───  t: 표시 글자, c: 색, w: 가중치(클수록 잘 나옴)
const TITLES = [
  // 흔함
  { t: "새싹", c: "gray", w: 100 },
  { t: "초보자", c: "gray", w: 100 },
  { t: "심심한", c: "gray", w: 100 },
  { t: "배고픈", c: "gray", w: 100 },
  { t: "졸린", c: "gray", w: 100 },
  { t: "잠꾸러기", c: "gray", w: 100 },
  { t: "조용한", c: "gray", w: 100 },
  { t: "시끄러운", c: "gray", w: 100 },
  { t: "대충하는", c: "gray", w: 100 },
  { t: "지각대장", c: "gray", w: 100 },
  { t: "멍청한", c: "gray", w: 100 },
  { t: "바보", c: "gray", w: 100 },
  { t: "거지", c: "gray", w: 100 },
  { t: "끔찍", c: "gray", w: 100 },
  { t: "잠수함", c: "gray", w: 100 },
  // 보통
  { t: "농부", c: "green", w: 60 },
  { t: "낚시꾼", c: "green", w: 60 },
  { t: "광부", c: "green", w: 60 },
  { t: "나무꾼", c: "green", w: 60 },
  { t: "대장장이", c: "green", w: 60 },
  { t: "요리사", c: "green", w: 60 },
  { t: "양치기", c: "green", w: 60 },
  { t: "상인", c: "green", w: 60 },
  { t: "여행자", c: "green", w: 60 },
  { t: "수집가", c: "green", w: 60 },
  { t: "도박쟁이", c: "green", w: 60 },
  { t: "감자캐는노인", c: "green", w: 60 },
  { t: "깜찍", c: "white", w: 60 },
  { t: "발랄한", c: "white", w: 60 },
  { t: "상큼한", c: "white", w: 60 },
  { t: "기분좋은", c: "white", w: 60 },
  { t: "귀여운", c: "white", w: 60 },
  { t: "열정적인", c: "white", w: 60 },
  { t: "츤데레", c: "white", w: 60 },
  { t: "킹받는", c: "white", w: 60 },
  // 희귀
  { t: "천재", c: "aqua", w: 30 },
  { t: "부자", c: "aqua", w: 30 },
  { t: "돈많은백수", c: "aqua", w: 30 },
  { t: "멋진", c: "aqua", w: 30 },
  { t: "완벽", c: "aqua", w: 30 },
  { t: "모험가", c: "aqua", w: 30 },
  { t: "은둔자", c: "aqua", w: 30 },
  { t: "벼락부자", c: "aqua", w: 30 },
  { t: "떡상", c: "aqua", w: 30 },
  { t: "떡락", c: "aqua", w: 30 },
  { t: "갓생", c: "aqua", w: 30 },
  { t: "행운의", c: "aqua", w: 30 },
  { t: "불운의", c: "aqua", w: 30 },
  { t: "사랑해", c: "light_purple", w: 30 },
  { t: "좋아해", c: "light_purple", w: 30 },
  { t: "짝사랑", c: "light_purple", w: 30 },
  { t: "너만을위한", c: "light_purple", w: 30 },
  // 영웅
  { t: "낚시의 왕", c: "light_purple", w: 10 },
  { t: "농사의 왕", c: "light_purple", w: 10 },
  { t: "마스터", c: "light_purple", w: 10 },
  { t: "광질의신", c: "light_purple", w: 10 },
  { t: "백만장자", c: "light_purple", w: 10 },
  { t: "도시전설", c: "light_purple", w: 10 },
  { t: "별빛", c: "light_purple", w: 10 },
  { t: "달빛", c: "light_purple", w: 10 },
  { t: "첫눈", c: "light_purple", w: 10 },
  { t: "불꽃", c: "light_purple", w: 10 },
  // 전설
  { t: "전설", c: "gold", w: 3 },
  { t: "하이의 놀이터", c: "gold", w: 3 }
];

// ─── 발광 색 목록 ───  n: 한글 이름, c: 팀 색(=테두리 색), d: 아이콘용 염료
const GLOWS = [
  { n: "빨강", c: "red", d: "minecraft:red_dye" },
  { n: "진홍", c: "dark_red", d: "minecraft:red_dye" },
  { n: "주황", c: "gold", d: "minecraft:orange_dye" },
  { n: "노랑", c: "yellow", d: "minecraft:yellow_dye" },
  { n: "연두", c: "green", d: "minecraft:lime_dye" },
  { n: "초록", c: "dark_green", d: "minecraft:green_dye" },
  { n: "청록", c: "dark_aqua", d: "minecraft:cyan_dye" },
  { n: "하늘", c: "aqua", d: "minecraft:light_blue_dye" },
  { n: "파랑", c: "blue", d: "minecraft:blue_dye" },
  { n: "남색", c: "dark_blue", d: "minecraft:blue_dye" },
  { n: "보라", c: "dark_purple", d: "minecraft:purple_dye" },
  { n: "분홍", c: "light_purple", d: "minecraft:pink_dye" },
  { n: "하양", c: "white", d: "minecraft:white_dye" },
  { n: "회색", c: "gray", d: "minecraft:light_gray_dye" },
  { n: "진회색", c: "dark_gray", d: "minecraft:gray_dye" },
  { n: "검정", c: "black", d: "minecraft:black_dye" }
];

// 무지개가 돌아가는 순서
const RAINBOW_COLORS = ["red", "gold", "yellow", "green", "aqua", "blue", "light_purple"];

// ─── 함수들이 쓰는 변수 (전부 여기서 한 번만 선언) ───
var rainbowStep = 0;
var lastRainbowTick = 0;

var pOut;                                  // prefixed
var wTotal, wI, wRoll;                     // pickTitle
var fCmd;                                  // fx
var tFound, tI;                            // findTitle
var gFound, gI;                            // findGlow
var oList, oI, oArr;                       // ownedTitles
var aTeam, aSrv, aTitle, aGlow, aTitleId;  // applyPlayer
var rBox, rPlayer, rSrv, rRoll, rPick, rN, rOwned, rDup;  // rollTitle
var eRoll, ePick, ePlayer, eSrv;           // rollGlow
var dNbt, dColor, dPlayer, dSrv, dGlow;    // useGlowDye
var cPlayer, cIdx, cOwned, cI, cT, cMsg;   // 칭호 명령어
var kPlayers, kI, kP, kColor;              // 무지개 틱
var sCount, sI;                            // 상자 개봉 반복

// ─── 유틸 ───────────────────────────────────────────────────────────────────
function prefixed(body) {
  pOut = Text.of("[하이의 놀이터] ").color(0xffd479);
  return pOut.append(body);
}

// 플레이어 위치에서 명령어 실행 (파티클/소리용)
function fx(player, cmd) {
  try {
    fCmd = "execute at " + player.username + " run " + cmd;
    player.server.runCommandSilent(fCmd);
  } catch (err) {
    /* 무시 */
  }
}

function findTitle(name) {
  tFound = null;
  for (tI = 0; tI < TITLES.length; tI++) {
    if (TITLES[tI].t === name) tFound = TITLES[tI];
  }
  return tFound;
}

function findGlow(color) {
  gFound = null;
  for (gI = 0; gI < GLOWS.length; gI++) {
    if (GLOWS[gI].c === color) gFound = GLOWS[gI];
  }
  return gFound;
}

// 가중치 뽑기
function pickTitle() {
  wTotal = 0;
  for (wI = 0; wI < TITLES.length; wI++) wTotal += TITLES[wI].w;
  wRoll = Math.random() * wTotal;
  for (wI = 0; wI < TITLES.length; wI++) {
    wRoll -= TITLES[wI].w;
    if (wRoll <= 0) return TITLES[wI];
  }
  return TITLES[0];
}

// 보유 칭호 배열
function ownedTitles(player) {
  oList = player.persistentData.getString("hiTitles");
  if (!oList || oList.length === 0) return [];
  oArr = oList.split("|");
  return oArr;
}

// ─── 팀에 칭호/발광 반영 ────────────────────────────────────────────────────
function applyPlayer(player) {
  try {
    aSrv = player.server;
    aTeam = "hi_" + player.username;

    try { aSrv.runCommandSilent("team add " + aTeam); } catch (e1) { /* 이미 있음 */ }
    aSrv.runCommandSilent("team join " + aTeam + " " + player.username);

    // 칭호 -> prefix
    aTitleId = player.persistentData.getString("hiTitle");
    aTitle = aTitleId ? findTitle(aTitleId) : null;
    if (aTitle) {
      aSrv.runCommandSilent(
        "team modify " + aTeam + ' prefix {"text":"[' + aTitle.t + '] ","color":"' + aTitle.c + '","bold":true}'
      );
    } else {
      aSrv.runCommandSilent("team modify " + aTeam + ' prefix {"text":""}');
    }

    // 발광 -> color + glowing 효과
    aGlow = player.persistentData.getString("hiGlow");
    if (!aGlow || aGlow.length === 0) {
      aSrv.runCommandSilent("team modify " + aTeam + " color white");
      aSrv.runCommandSilent("effect clear " + player.username + " minecraft:glowing");
    } else {
      if (aGlow !== "rainbow") {
        aSrv.runCommandSilent("team modify " + aTeam + " color " + aGlow);
      }
      aSrv.runCommandSilent(
        "effect give " + player.username + " minecraft:glowing " + GLOW_DURATION + " 0 true"
      );
    }
  } catch (err) {
    console.warn("[하이의 놀이터] 칭호/발광 적용 실패: " + err);
  }
}

// ─── 칭호 상자 1개 개봉 ─────────────────────────────────────────────────────
function rollTitle(player) {
  rPlayer = player;
  rSrv = player.server;
  rRoll = Math.random();

  if (rRoll >= TITLE_WIN_CHANCE) {
    // ── 꽝 ──
    fx(rPlayer, "particle minecraft:smoke ~ ~1 ~ 0.4 0.5 0.4 0.02 60 force");
    fx(rPlayer, "particle minecraft:large_smoke ~ ~1 ~ 0.3 0.4 0.3 0.01 25 force");
    fx(rPlayer, "playsound minecraft:entity.villager.no master @a ~ ~ ~ 1 0.7");
    fx(rPlayer, "playsound minecraft:block.note_block.bass master @a ~ ~ ~ 1 0.5");
    rPlayer.tell(prefixed(Text.of("꽝! 아무것도 나오지 않았습니다...").darkGray()));
    return;
  }

  rPick = pickTitle();
  rOwned = ownedTitles(rPlayer);
  rDup = false;
  for (rN = 0; rN < rOwned.length; rN++) {
    if (rOwned[rN] === rPick.t) rDup = true;
  }

  // ── 당첨 연출 ──
  fx(rPlayer, "particle minecraft:totem_of_undying ~ ~1 ~ 0.5 0.8 0.5 0.5 150 force");
  fx(rPlayer, "particle minecraft:end_rod ~ ~1 ~ 0.3 0.8 0.3 0.05 60 force");
  fx(rPlayer, "playsound minecraft:ui.toast.challenge_complete master @a ~ ~ ~ 1 1");
  fx(rPlayer, "playsound minecraft:entity.player.levelup master @a ~ ~ ~ 1 1.2");

  if (rDup) {
    rPlayer.tell(
      prefixed(Text.of("칭호 ").white())
        .append(Text.of("[" + rPick.t + "]").color(0xffd479).bold())
        .append(Text.of(" ... 이미 가지고 있는 칭호입니다!").gray())
    );
    return;
  }

  rOwned.push(rPick.t);
  rPlayer.persistentData.putString("hiTitles", rOwned.join("|"));

  rPlayer.tell(
    prefixed(Text.of("칭호 ").white())
      .append(Text.of("[" + rPick.t + "]").color(0xffd479).bold())
      .append(Text.of(" 획득!").white())
  );
  rPlayer.tell(Text.of("      /칭호 로 착용할 수 있습니다").gray());

  // 전설급이면 서버 전체 공지
  if (rPick.w <= 3) {
    rSrv.tell(
      prefixed(Text.of(rPlayer.username).white())
        .append(Text.of("님이 전설 칭호 ").gray())
        .append(Text.of("[" + rPick.t + "]").gold().bold())
        .append(Text.of(" 를 뽑았습니다!").gray())
    );
    rSrv.runCommandSilent("playsound minecraft:entity.ender_dragon.growl master @a ~ ~ ~ 0.4 1.6");
  }
}

// ─── 발광 상자 1개 개봉 ─────────────────────────────────────────────────────
function rollGlow(player) {
  ePlayer = player;
  eSrv = player.server;
  eRoll = Math.random();

  if (eRoll >= GLOW_WIN_CHANCE) {
    // ── 꽝 ──
    fx(ePlayer, "particle minecraft:smoke ~ ~1 ~ 0.4 0.5 0.4 0.02 60 force");
    fx(ePlayer, "particle minecraft:large_smoke ~ ~1 ~ 0.3 0.4 0.3 0.01 25 force");
    fx(ePlayer, "playsound minecraft:entity.villager.no master @a ~ ~ ~ 1 0.7");
    fx(ePlayer, "playsound minecraft:block.note_block.bass master @a ~ ~ ~ 1 0.5");
    ePlayer.tell(prefixed(Text.of("꽝! 아무것도 나오지 않았습니다...").darkGray()));
    return;
  }

  if (eRoll < GLOW_RAINBOW_CHANCE) {
    // ── 무지개 ──
    fx(ePlayer, "particle minecraft:totem_of_undying ~ ~1 ~ 0.6 1 0.6 0.6 300 force");
    fx(ePlayer, "particle minecraft:end_rod ~ ~1 ~ 0.4 1.2 0.4 0.08 120 force");
    fx(ePlayer, "particle minecraft:firework ~ ~1.5 ~ 0.5 0.8 0.5 0.3 120 force");
    fx(ePlayer, "playsound minecraft:ui.toast.challenge_complete master @a ~ ~ ~ 1 1");
    fx(ePlayer, "playsound minecraft:entity.ender_dragon.growl master @a ~ ~ ~ 0.6 1.8");

    ePlayer.give(
      Item.of(
        "minecraft:magenta_dye",
        '{hiGlow:"rainbow",HideFlags:1,Enchantments:[{}],display:{Name:\'{"text":"발광 염료 (무지개)","italic":false,"color":"light_purple","bold":true}\',Lore:[\'{"text":"우클릭하면 무지개 발광이 켜집니다","italic":false,"color":"gray"}\',\'{"text":"0.1% 확률","italic":false,"color":"dark_gray"}\']}}'
      )
    );
    ePlayer.tell(
      prefixed(Text.of("무지개 발광 염료").color(0xff66ff).bold()).append(Text.of(" 획득!!").white())
    );
    eSrv.tell(
      prefixed(Text.of(ePlayer.username).white())
        .append(Text.of("님이 ").gray())
        .append(Text.of("무지개 발광").color(0xff66ff).bold())
        .append(Text.of(" 을 뽑았습니다! (0.1%)").gray())
    );
    eSrv.runCommandSilent("playsound minecraft:ui.toast.challenge_complete master @a ~ ~ ~ 1 1");
    return;
  }

  // ── 일반 색 ──
  ePick = GLOWS[Math.floor(Math.random() * GLOWS.length)];

  fx(ePlayer, "particle minecraft:totem_of_undying ~ ~1 ~ 0.5 0.8 0.5 0.5 150 force");
  fx(ePlayer, "particle minecraft:end_rod ~ ~1 ~ 0.3 0.8 0.3 0.05 60 force");
  fx(ePlayer, "playsound minecraft:ui.toast.challenge_complete master @a ~ ~ ~ 1 1.2");
  fx(ePlayer, "playsound minecraft:entity.experience_orb.pickup master @a ~ ~ ~ 1 1.4");

  ePlayer.give(
    Item.of(
      ePick.d,
      '{hiGlow:"' + ePick.c + '",display:{Name:\'{"text":"발광 염료 (' + ePick.n +
        ')","italic":false,"color":"' + ePick.c + '"}\',Lore:[\'{"text":"우클릭하면 발광이 켜집니다","italic":false,"color":"gray"}\']}}'
    )
  );
  ePlayer.tell(
    prefixed(Text.of("발광 염료 (" + ePick.n + ")").color(0x8be0a8)).append(Text.of(" 획득!").white())
  );
}

// ─── 발광 염료 사용 ─────────────────────────────────────────────────────────
function useGlowDye(player, nbt) {
  dPlayer = player;
  dSrv = player.server;
  dColor = nbt.getString("hiGlow");
  if (!dColor || dColor.length === 0) return;

  dPlayer.persistentData.putString("hiGlow", dColor);
  applyPlayer(dPlayer);

  if (dColor === "rainbow") {
    dPlayer.tell(prefixed(Text.of("무지개 발광이 켜졌습니다!").color(0xff66ff).bold()));
  } else {
    dGlow = findGlow(dColor);
    dPlayer.tell(
      prefixed(Text.of("발광이 켜졌습니다 (" + (dGlow ? dGlow.n : dColor) + ")").color(0x8be0a8))
    );
  }
  dPlayer.tell(Text.of("      /발광 으로 끌 수 있습니다").gray());

  fx(dPlayer, "particle minecraft:end_rod ~ ~1 ~ 0.4 0.8 0.4 0.05 80 force");
  fx(dPlayer, "playsound minecraft:block.beacon.activate master @a ~ ~ ~ 0.7 1.6");
}

// ─── 상자 이벤트 ────────────────────────────────────────────────────────────
ItemEvents.rightClicked("supplementaries:present_black", function (event) {
  if (!event.item.nbt || !event.item.nbt.contains("hiGacha")) return;
  if (event.item.nbt.getString("hiGacha") !== "title") return;
  event.item.count = event.item.count - 1;
  rollTitle(event.player);
});

ItemEvents.rightClicked("supplementaries:present_yellow", function (event) {
  if (!event.item.nbt || !event.item.nbt.contains("hiGacha")) return;
  if (event.item.nbt.getString("hiGacha") !== "glow") return;
  event.item.count = event.item.count - 1;
  rollGlow(event.player);
});

// 버리면 그 뭉치를 통째로 개봉
ItemEvents.dropped("supplementaries:present_black", function (event) {
  if (!event.item.nbt || !event.item.nbt.contains("hiGacha")) return;
  if (event.item.nbt.getString("hiGacha") !== "title") return;
  sCount = event.item.count;
  event.itemEntity.discard();
  for (sI = 0; sI < sCount; sI++) rollTitle(event.player);
});

ItemEvents.dropped("supplementaries:present_yellow", function (event) {
  if (!event.item.nbt || !event.item.nbt.contains("hiGacha")) return;
  if (event.item.nbt.getString("hiGacha") !== "glow") return;
  sCount = event.item.count;
  event.itemEntity.discard();
  for (sI = 0; sI < sCount; sI++) rollGlow(event.player);
});

// ─── 발광 염료 우클릭 ───────────────────────────────────────────────────────
for (var regI = 0; regI < GLOWS.length; regI++) {
  ItemEvents.rightClicked(GLOWS[regI].d, function (event) {
    if (!event.item.nbt || !event.item.nbt.contains("hiGlow")) return;
    event.item.count = event.item.count - 1;
    useGlowDye(event.player, event.item.nbt);
  });
}
ItemEvents.rightClicked("minecraft:magenta_dye", function (event) {
  if (!event.item.nbt || !event.item.nbt.contains("hiGlow")) return;
  event.item.count = event.item.count - 1;
  useGlowDye(event.player, event.item.nbt);
});

// ─── 로그인 / 리스폰 시 다시 적용 ───────────────────────────────────────────
PlayerEvents.loggedIn(function (event) {
  applyPlayer(event.player);
});
PlayerEvents.respawned(function (event) {
  applyPlayer(event.player);
});

// ─── 무지개 색 돌리기 ───────────────────────────────────────────────────────
ServerEvents.tick(function (event) {
  try {
    if (event.server.tickCount - lastRainbowTick < RAINBOW_TICK) return;
    lastRainbowTick = event.server.tickCount;

    kPlayers = event.server.players;
    if (kPlayers.length === 0) return;

    rainbowStep = (rainbowStep + 1) % RAINBOW_COLORS.length;
    kColor = RAINBOW_COLORS[rainbowStep];

    for (kI = 0; kI < kPlayers.length; kI++) {
      kP = kPlayers[kI];
      if (kP.persistentData.getString("hiGlow") === "rainbow") {
        event.server.runCommandSilent("team modify hi_" + kP.username + " color " + kColor);
      }
    }
  } catch (err) {
    /* 무시 */
  }
});

// ─── 명령어 ─────────────────────────────────────────────────────────────────
function anyone(src) {
  return true;
}

function showTitles(player) {
  cPlayer = player;
  cOwned = ownedTitles(cPlayer);
  if (cOwned.length === 0) {
    cPlayer.tell(prefixed(Text.of("가지고 있는 칭호가 없습니다.").gray()));
    cPlayer.tell(Text.of("      칭호 뽑기 상자를 열어보세요!").darkGray());
    return 1;
  }
  cPlayer.tell(prefixed(Text.of("보유 칭호 " + cOwned.length + "개").white()));
  for (cI = 0; cI < cOwned.length; cI++) {
    cT = findTitle(cOwned[cI]);
    cMsg = Text.of("  " + (cI + 1) + ". ").darkGray();
    if (cT) cMsg = cMsg.append(Text.of("[" + cT.t + "]").color(cT.c === "gray" ? 0xaaaaaa : 0xffd479));
    else cMsg = cMsg.append(Text.of("[" + cOwned[cI] + "]").gray());
    if (cPlayer.persistentData.getString("hiTitle") === cOwned[cI]) {
      cMsg = cMsg.append(Text.of("  <- 착용 중").green());
    }
    cPlayer.tell(cMsg);
  }
  cPlayer.tell(Text.of("      /칭호 <번호> 로 착용, /칭호 0 으로 해제").gray());
  return 1;
}

function equipTitle(player, idx) {
  cPlayer = player;
  cOwned = ownedTitles(cPlayer);

  if (idx === 0) {
    cPlayer.persistentData.putString("hiTitle", "");
    applyPlayer(cPlayer);
    cPlayer.tell(prefixed(Text.of("칭호를 해제했습니다.").gray()));
    return 1;
  }
  if (idx < 1 || idx > cOwned.length) {
    cPlayer.tell(prefixed(Text.of("그런 번호의 칭호가 없습니다.").red()));
    return 0;
  }

  cPlayer.persistentData.putString("hiTitle", cOwned[idx - 1]);
  applyPlayer(cPlayer);
  cT = findTitle(cOwned[idx - 1]);
  cPlayer.tell(
    prefixed(Text.of("칭호 ").white())
      .append(Text.of("[" + cOwned[idx - 1] + "]").color(0xffd479).bold())
      .append(Text.of(" 를 착용했습니다.").white())
  );
  fx(cPlayer, "playsound minecraft:block.amethyst_block.chime master @a ~ ~ ~ 1 1.4");
  return 1;
}

function clearGlow(player) {
  cPlayer = player;
  if (cPlayer.persistentData.getString("hiGlow") === "") {
    cPlayer.tell(prefixed(Text.of("켜져 있는 발광이 없습니다.").gray()));
    return 1;
  }
  cPlayer.persistentData.putString("hiGlow", "");
  applyPlayer(cPlayer);
  cPlayer.tell(prefixed(Text.of("발광을 껐습니다.").gray()));
  return 1;
}

ServerEvents.commandRegistry(function (event) {
  event.register(
    event.commands
      .literal("칭호")
      .requires(anyone)
      .executes(function (ctx) {
        return ctx.source.player ? showTitles(ctx.source.player) : 0;
      })
      .then(
        event.commands
          .argument("번호", event.arguments.INTEGER.create(event))
          .executes(function (ctx) {
            return ctx.source.player
              ? equipTitle(ctx.source.player, event.arguments.INTEGER.getResult(ctx, "번호"))
              : 0;
          })
      )
  );

  event.register(
    event.commands
      .literal("title2")
      .requires(anyone)
      .executes(function (ctx) {
        return ctx.source.player ? showTitles(ctx.source.player) : 0;
      })
  );

  event.register(
    event.commands
      .literal("발광")
      .requires(anyone)
      .executes(function (ctx) {
        return ctx.source.player ? clearGlow(ctx.source.player) : 0;
      })
  );
});

console.info(
  "[하이의 놀이터] 뽑기/칭호/발광 스크립트 로드됨 (칭호 " +
    TITLES.length +
    "종, 발광 " +
    GLOWS.length +
    "색 + 무지개)"
);
