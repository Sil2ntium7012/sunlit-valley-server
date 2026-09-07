// ============================================================================
//  하이의 놀이터 - 자동 리붓 + 정기 청소
//
//  1) 매일 00:00 / 12:00 자동 리붓
//     stop 을 걸면 start.ps1 의 while 루프가 5초 뒤 서버를 다시 켭니다.
//     (variables.txt 의 RESTART=true 가 켜져 있어야 합니다)
//
//  2) 매 20분(정각 기준 :00 :20 :40) 바닥에 떨어진 아이템 청소
//     상자·인벤토리 안의 아이템은 건드리지 않습니다.
//
//  3) 다음 청소/리붓까지 남은 시간을 탭 목록에 표시
//
//  ⚠️ 코드 스타일 주의 (건드리실 때 꼭 읽어주세요)
//  KubeJS 의 Rhino 엔진은 "반복 호출되는 함수 안에서의 변수 선언"을 거부합니다.
//  const / let / var 어느 쪽이든 두 번째 호출부터 이 오류가 납니다:
//      InternalError: TypeError: redeclaration of var xxx
//  그래서 이 파일은 모든 변수를 맨 위에 한 번만 선언하고 함수 안에서는 대입만 합니다.
//  함수 안에 새 변수를 만들지 마세요.
// ============================================================================

// ─── 설정 ───────────────────────────────────────────────────────────────────
const RESTART_HOURS = [0, 12];   // 리붓 시각 (24시간제)
const CLEAN_EVERY_MIN = 20;      // 청소 주기(분). 정각 기준
const STOP_DELAY_SEC = 3;        // 리붓 예고 후 실제 stop 까지 여유

// 경고를 띄울 "남은 초"
const RESTART_WARN_AT = [600, 300, 60, 30, 10, 5, 4, 3, 2, 1];
const CLEAN_WARN_AT = [60, 10, 5, 4, 3, 2, 1];

const CLEAN_COMMAND = "kill @e[type=minecraft:item]";

// 그라데이션 색 (0xRRGGBB)
const C_CLEAN_A = 0xffe9a3;    // 연노랑
const C_CLEAN_B = 0xff9d4d;    // 살구
const C_URGENT_A = 0xff8a5c;   // 주황
const C_URGENT_B = 0xff4d6a;   // 붉은 분홍
const C_DONE_A = 0xa8e6a1;     // 연두
const C_DONE_B = 0x4ec9a0;     // 청록
const C_REBOOT_A = 0xa9d8ff;   // 하늘
const C_REBOOT_B = 0xb69bff;   // 연보라
const C_PREFIX_A = 0xffd479;   // 프리픽스 금색
const C_PREFIX_B = 0xff9f43;
// ────────────────────────────────────────────────────────────────────────────

// ─── 상태 ───
var lastSecond = -1;
var stopCountdown = -1;
var tabListOff = false;
var gradientOff = false;
var failures = 0;
var disabled = false;
var $TabListPacket = null;

// ─── 함수들이 쓰는 변수 (전부 여기 한 번만 선언) ───
var gOut, gI, gLen, gT, gR, gG, gB;               // gradientText
var pOut;                                          // prefixed
var hH, hM, hS;                                    // humanTime
var cH, cM, cS;                                    // clockTime
var rNowSec, rBest, rDiff, rI;                     // secondsToRestart
var sPeriod, sNowSec;                              // secondsToClean
var uHeader, uFooter, uPacket, uI;                 // updateTabList
var aI;                                            // actionBar
var tSrv, tNow, tSec, tPlayers, tOnline;           // tick
var tCleanIn, tRestartIn, tKilled;

try {
  $TabListPacket = Java.loadClass(
    "net.minecraft.network.protocol.game.ClientboundTabListPacket"
  );
} catch (err) {
  tabListOff = true;
  console.warn("[하이의 놀이터] 탭 목록 패킷 클래스를 못 찾아 표시를 끕니다: " + err);
}

// 글자마다 색을 조금씩 옮겨가며 칠합니다. 색 지정이 안 되는 환경이면
// 한 번만 경고를 남기고 그 뒤로는 단색으로 대체합니다.
function gradientText(str, from, to) {
  if (gradientOff) return Text.of(str).gold();
  try {
    gOut = Text.of("");
    gLen = str.length;
    for (gI = 0; gI < gLen; gI++) {
      gT = gLen <= 1 ? 0 : gI / (gLen - 1);
      gR = Math.round(((from >> 16) & 255) + ((((to >> 16) & 255) - ((from >> 16) & 255)) * gT));
      gG = Math.round(((from >> 8) & 255) + ((((to >> 8) & 255) - ((from >> 8) & 255)) * gT));
      gB = Math.round((from & 255) + (((to & 255) - (from & 255)) * gT));
      gOut = gOut.append(Text.of(str.charAt(gI)).color((gR << 16) | (gG << 8) | gB));
    }
    return gOut;
  } catch (err) {
    gradientOff = true;
    console.warn("[하이의 놀이터] 색 지정을 쓸 수 없어 단색으로 대체합니다: " + err);
    return Text.of(str).gold();
  }
}

// 프리픽스 + 본문
function prefixed(body) {
  pOut = gradientText("[하이의 놀이터] ", C_PREFIX_A, C_PREFIX_B);
  return pOut.append(body);
}

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

// 남은 초 -> "1분" / "10초"
function humanTime(sec) {
  if (sec >= 3600) {
    hH = Math.floor(sec / 3600);
    hM = Math.floor((sec % 3600) / 60);
    return hM > 0 ? hH + "시간 " + hM + "분" : hH + "시간";
  }
  if (sec >= 60) {
    hM = Math.floor(sec / 60);
    hS = sec % 60;
    return hS > 0 ? hM + "분 " + hS + "초" : hM + "분";
  }
  return sec + "초";
}

// 탭 목록용 고정폭 표기
function clockTime(sec) {
  cH = Math.floor(sec / 3600);
  cM = Math.floor((sec % 3600) / 60);
  cS = sec % 60;
  return cH > 0 ? cH + ":" + pad2(cM) + ":" + pad2(cS) : pad2(cM) + ":" + pad2(cS);
}

function secondsToRestart(now) {
  rNowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  rBest = 86400;
  for (rI = 0; rI < RESTART_HOURS.length; rI++) {
    rDiff = RESTART_HOURS[rI] * 3600 - rNowSec;
    if (rDiff < 0) rDiff += 86400;
    if (rDiff < rBest) rBest = rDiff;
  }
  return rBest;
}

function secondsToClean(now) {
  sPeriod = CLEAN_EVERY_MIN * 60;
  sNowSec = now.getMinutes() * 60 + now.getSeconds();
  return sPeriod - (sNowSec % sPeriod);
}

function tell(srv, component) {
  try {
    srv.tell(component);
  } catch (err) {
    /* 무시 */
  }
}

function actionBar(players, component) {
  for (aI = 0; aI < players.length; aI++) {
    try {
      players[aI].setStatusMessage(component);
    } catch (err) {
      /* 액션바 못 쓰면 조용히 넘어감 */
    }
  }
}

// 위아래로 빈 줄을 한 칸씩 두고, 청소/리붓을 가운데에 붙여서 배치합니다.
function updateTabList(players, cleanIn, restartIn) {
  if (tabListOff || $TabListPacket === null) return;

  uHeader = Text.of("\n")
    .append(gradientText("하이의 놀이터", C_PREFIX_A, C_PREFIX_B).bold())
    .append(Text.of("\n"))
    .append(Text.of("접속 " + players.length + "명").gray());

  uFooter = Text.of("\n")
    .append(Text.of("      "))
    .append(Text.of("청소 ").gray())
    .append(Text.of(clockTime(cleanIn)).aqua())
    .append(Text.of("  |  ").darkGray())
    .append(Text.of("리붓 ").gray())
    .append(Text.of(clockTime(restartIn)).yellow())
    .append(Text.of("      "))
    .append(Text.of("\n"));

  try {
    uPacket = new $TabListPacket(uHeader, uFooter);
    for (uI = 0; uI < players.length; uI++) {
      players[uI].connection.send(uPacket);
    }
  } catch (err) {
    tabListOff = true;
    console.warn(
      "[하이의 놀이터] 탭 목록 표시를 끕니다(채팅 알림은 그대로 동작): " + err
    );
  }
}

ServerEvents.tick(function (event) {
  if (disabled) return;

  try {
    tSrv = event.server;
    tNow = new Date();
    tSec = tNow.getSeconds();
    if (tSec === lastSecond) return; // 1초에 한 번만
    lastSecond = tSec;

    tPlayers = tSrv.players;
    tOnline = tPlayers.length;
    tCleanIn = secondsToClean(tNow);
    tRestartIn = secondsToRestart(tNow);

    // ── 리붓 카운트다운이 걸려 있으면 그것부터 ──
    if (stopCountdown >= 0) {
      if (stopCountdown === 0) {
        stopCountdown = -1;
        tSrv.runCommandSilent("stop");
      } else {
        stopCountdown--;
      }
      return;
    }

    if (tOnline > 0) updateTabList(tPlayers, tCleanIn, tRestartIn);

    // ── 청소 ──
    if (tCleanIn === CLEAN_EVERY_MIN * 60) {
      // /kill 은 처리한 엔티티 수를 돌려줍니다 = 사라진 아이템 묶음 수
      tKilled = 0;
      try {
        tKilled = tSrv.runCommandSilent(CLEAN_COMMAND);
      } catch (err) {
        tKilled = 0;
      }
      if (tOnline > 0) {
        tell(
          tSrv,
          prefixed(
            gradientText("아이템 " + tKilled + "묶음을 정리했습니다.", C_DONE_A, C_DONE_B)
          )
        );
      }
    } else if (tOnline > 0 && CLEAN_WARN_AT.indexOf(tCleanIn) !== -1) {
      if (tCleanIn <= 5) {
        actionBar(
          tPlayers,
          gradientText("청소까지 " + tCleanIn + "초", C_URGENT_A, C_URGENT_B).bold()
        );
        tell(
          tSrv,
          prefixed(gradientText("청소까지 " + tCleanIn + "초", C_URGENT_A, C_URGENT_B))
        );
      } else {
        tell(
          tSrv,
          prefixed(
            gradientText(humanTime(tCleanIn) + " 후 바닥 아이템을 청소합니다.", C_CLEAN_A, C_CLEAN_B)
          )
        );
      }
    }

    // ── 리붓 ──
    if (tRestartIn === 0) {
      tell(
        tSrv,
        prefixed(
          gradientText("서버를 리붓합니다. 잠시 후 다시 들어와 주세요!", C_URGENT_A, C_URGENT_B).bold()
        )
      );
      tSrv.runCommandSilent("save-all");
      stopCountdown = STOP_DELAY_SEC;
    } else if (tOnline > 0 && RESTART_WARN_AT.indexOf(tRestartIn) !== -1) {
      if (tRestartIn <= 5) {
        actionBar(
          tPlayers,
          gradientText("리붓까지 " + tRestartIn + "초", C_URGENT_A, C_URGENT_B).bold()
        );
      }
      tell(
        tSrv,
        prefixed(
          gradientText(humanTime(tRestartIn) + " 후 서버가 리붓됩니다.", C_REBOOT_A, C_REBOOT_B)
        )
      );
    }

    failures = 0;
  } catch (err) {
    failures++;
    console.error("[하이의 놀이터] 자동화 스크립트 오류(" + failures + "회): " + err);
    if (failures >= 10) {
      disabled = true;
      console.error(
        "[하이의 놀이터] 오류가 반복돼 자동화를 중단합니다. 서버는 정상 동작합니다."
      );
    }
  }
});

console.info(
  "[하이의 놀이터] 자동 리붓(" +
    RESTART_HOURS.join("시, ") +
    "시) + " +
    CLEAN_EVERY_MIN +
    "분 청소 스크립트 로드됨"
);
