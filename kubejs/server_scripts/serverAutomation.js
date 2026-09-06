// ============================================================================
//  하이의 놀이터 - 자동 재부팅 + 정기 청소
//
//  1) 매일 00:00 / 12:00 자동 재부팅
//     stop 을 걸면 start.ps1 의 while 루프가 5초 뒤 서버를 다시 켭니다.
//     (variables.txt 의 RESTART=true 가 켜져 있어야 합니다 - 지금 켜져 있음)
//
//  2) 매 10분(정각 기준 :00 :10 :20 ...) 바닥에 떨어진 아이템 청소
//     상자·인벤토리 안의 아이템은 건드리지 않습니다.
//
//  3) 다음 청소/재부팅까지 남은 시간을 탭 목록 하단에 표시
//
//  시간 기준은 서버가 돌아가는 PC의 시계입니다.
// ============================================================================

// ─── 설정 (여기만 고치면 됩니다) ─────────────────────────────────────────────
const RESTART_HOURS = [0, 12];   // 재부팅 시각 (24시간제)
const CLEAN_EVERY_MIN = 10;      // 청소 주기(분). 정각 기준으로 맞춰집니다
const STOP_DELAY_SEC = 3;        // 재부팅 예고 후 실제 stop 까지 여유

// 경고를 띄울 "남은 초". 원하는 값을 넣고 빼면 됩니다
const RESTART_WARN_AT = [600, 300, 60, 30, 10, 5, 4, 3, 2, 1];
const CLEAN_WARN_AT = [60, 30, 10, 5, 4, 3, 2, 1];

const CLEAN_COMMAND = "kill @e[type=minecraft:item]";
const PREFIX = "§6[하이의 놀이터]§r ";
// ────────────────────────────────────────────────────────────────────────────

let lastSecond = -1;      // 같은 초에 두 번 돌지 않게
let stopCountdown = -1;   // 재부팅 예고 후 카운트다운 (-1 = 대기 없음)
let tabListOff = false;   // 탭 목록 패킷이 안 먹는 환경이면 꺼둠
let failures = 0;         // 연속 오류가 쌓이면 스크립트를 스스로 멈춤
let disabled = false;

let $TabListPacket = null;
try {
  $TabListPacket = Java.loadClass(
    "net.minecraft.network.protocol.game.ClientboundTabListPacket"
  );
} catch (err) {
  tabListOff = true;
  console.warn("[하이의 놀이터] 탭 목록 패킷 클래스를 못 찾아 표시를 끕니다: " + err);
}

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

// 남은 초 -> "1시간 23분" / "5분 30초" / "12초"
function humanTime(sec) {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? h + "시간 " + m + "분" : h + "시간";
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? m + "분 " + s + "초" : m + "분";
  }
  return sec + "초";
}

// 탭 목록용 고정폭 표기
function clockTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? h + ":" + pad2(m) + ":" + pad2(s) : pad2(m) + ":" + pad2(s);
}

// 다음 재부팅까지 남은 초 (정확히 그 시각이면 0)
function secondsToRestart(now) {
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let best = 86400;
  for (let i = 0; i < RESTART_HOURS.length; i++) {
    let diff = RESTART_HOURS[i] * 3600 - nowSec;
    if (diff < 0) diff += 86400;
    if (diff < best) best = diff;
  }
  return best;
}

// 다음 청소까지 남은 초 (정확히 그 시각이면 주기값 = 방금 경계를 지났다는 뜻)
function secondsToClean(now) {
  const period = CLEAN_EVERY_MIN * 60;
  const nowSec = now.getMinutes() * 60 + now.getSeconds();
  return period - (nowSec % period);
}

function tell(server, component) {
  try {
    server.tell(component);
  } catch (err) {
    /* 무시 */
  }
}

function actionBar(players, component) {
  for (let i = 0; i < players.length; i++) {
    try {
      players[i].setStatusMessage(component);
    } catch (err) {
      /* 액션바 못 쓰면 조용히 넘어감 */
    }
  }
}

function updateTabList(players, cleanIn, restartIn) {
  if (tabListOff || $TabListPacket === null) return;

  const header = Text.of("")
    .append(Text.of("하이의 놀이터").gold().bold())
    .append(Text.of("\n"))
    .append(Text.of("접속 " + players.length + "명").gray());

  const footer = Text.of("")
    .append(Text.of("\n"))
    .append(Text.of("청소까지 ").gray())
    .append(Text.of(clockTime(cleanIn)).aqua())
    .append(Text.of("   ·   ").darkGray())
    .append(Text.of("재부팅까지 ").gray())
    .append(Text.of(clockTime(restartIn)).yellow());

  try {
    const packet = new $TabListPacket(header, footer);
    for (let i = 0; i < players.length; i++) {
      players[i].connection.send(packet);
    }
  } catch (err) {
    tabListOff = true;
    console.warn(
      "[하이의 놀이터] 탭 목록 표시를 끕니다(채팅 알림은 그대로 동작): " + err
    );
  }
}

ServerEvents.tick((event) => {
  if (disabled) return;

  try {
    const server = event.server;
    const now = new Date();
    const sec = now.getSeconds();
    if (sec === lastSecond) return; // 1초에 한 번만
    lastSecond = sec;

    const players = server.players;
    const online = players.length;
    const cleanIn = secondsToClean(now);
    const restartIn = secondsToRestart(now);

    // ── 재부팅 카운트다운이 걸려 있으면 그것부터 ──
    if (stopCountdown >= 0) {
      if (stopCountdown === 0) {
        stopCountdown = -1;
        server.runCommandSilent("stop");
      } else {
        stopCountdown--;
      }
      return;
    }

    if (online > 0) updateTabList(players, cleanIn, restartIn);

    // ── 청소 ──
    if (cleanIn === CLEAN_EVERY_MIN * 60) {
      server.runCommandSilent(CLEAN_COMMAND);
      if (online > 0) {
        tell(
          server,
          Text.of(PREFIX).append(Text.of("바닥에 떨어진 아이템을 정리했습니다.").green())
        );
      }
    } else if (online > 0 && CLEAN_WARN_AT.indexOf(cleanIn) !== -1) {
      if (cleanIn <= 5) {
        actionBar(players, Text.of("청소까지 " + cleanIn + "초").red().bold());
      }
      tell(
        server,
        Text.of(PREFIX).append(
          Text.of(
            humanTime(cleanIn) + " 후 바닥 아이템을 청소합니다. 주울 건 미리 챙기세요!"
          ).yellow()
        )
      );
    }

    // ── 재부팅 ──
    if (restartIn === 0) {
      tell(
        server,
        Text.of(PREFIX).append(
          Text.of("서버를 재시작합니다. 잠시 후 다시 들어와 주세요!").red().bold()
        )
      );
      server.runCommandSilent("save-all");
      stopCountdown = STOP_DELAY_SEC;
    } else if (online > 0 && RESTART_WARN_AT.indexOf(restartIn) !== -1) {
      if (restartIn <= 5) {
        actionBar(players, Text.of("재부팅까지 " + restartIn + "초").red().bold());
      }
      tell(
        server,
        Text.of(PREFIX).append(
          Text.of(humanTime(restartIn) + " 후 서버가 재시작됩니다.").gold()
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
  "[하이의 놀이터] 자동 재부팅(" +
    RESTART_HOURS.join("시, ") +
    "시) + " +
    CLEAN_EVERY_MIN +
    "분 청소 스크립트 로드됨"
);
