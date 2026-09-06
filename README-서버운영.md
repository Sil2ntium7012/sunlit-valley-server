# Sunlit Valley 서버 운영 메모

Society: Sunlit Valley (Minecraft 1.20.1 / Forge 47.4.0 / 모드 366개)

---

## 역할 분담

| 위치 | 역할 |
|---|---|
| 종혁 PC (원본) | 설정 수정 → commit → push |
| 친구 PC (구동) | pull 받아서 서버 실행 |

**설정 수정은 원본 쪽에서만 합니다.** 친구 쪽에서 파일을 고치면 다음 pull 때 날아갑니다.

---

## 처음 세팅 (친구 PC)

같은 서버팩을 설치한 폴더 안에서:

```bash
git init
git remote add origin <저장소 주소>
git fetch origin
git reset --hard origin/main
```

그 다음 `eula.txt`를 만들어 `eula=true` 한 줄을 넣고 `start.bat` 실행.
(eula.txt는 깃에 안 올라가므로 각자 만들어야 합니다.)

---

## 설정 바꾸는 흐름

**원본 쪽**
```bash
git add .
git commit -m "무엇을 바꿨는지"
git push
```

**구동 쪽** — 서버 끄고
```bash
git fetch origin
git reset --hard origin/main
```
→ 서버 켜기

---

## ⚠️ 자주 걸리는 함정

**1. `world/serverconfig/` 문제**

Forge 1.20.1은 모드별 서버 설정을 `world/serverconfig/` 안에 둡니다.
월드 폴더는 깃 대상이 아니라서 여기 바꾼 건 **동기화되지 않습니다.**

바꾸려면:
1. 원본 쪽에서 `defaultconfigs/`에 파일을 넣고 push
2. 구동 쪽에서 pull 후 그 파일을 `world/serverconfig/`로 **직접 복사**
3. 서버 재시작

`defaultconfigs/`는 **새 월드를 만들 때만** 자동 적용됩니다.

**2. 월드는 절대 깃에 올리지 않기**

`.gitignore`에 이미 막아뒀습니다. 억지로 올리면 양쪽 월드가 충돌해서 깨집니다.
월드 백업은 FTB Backups 2 같은 모드로 따로 하세요.

**3. 모드 폴더도 깃 대상이 아님**

양쪽 다 **같은 버전의 서버팩**을 설치해야 합니다. 버전이 다르면 접속 자체가 안 됩니다.

---

## 현재 설정값

| 항목 | 값 | 이유 |
|---|---|---|
| 서버 메모리 | 10G 고정 | 366모드 팩 기준. 8G까지는 낮춰도 됨, 6G 밑은 위험 |
| GC | Aikar's flags (G1GC) | 모드 서버 렉스파이크 감소 |
| view-distance | 8 | 10 → 8. 공장 많으면 6까지 내려도 됨 |
| simulation-distance | 6 | 실제 연산 범위. 여기가 TPS에 제일 크게 영향 |
| max-tick-time | -1 | 워치독 강제종료 방지 (모드 서버 필수) |
| entity-broadcast | 75% | 공장 아이템 엔티티 네트워크 부하 감소 |
| sync-chunk-writes | false | NVMe면 안전, 청크 저장 렉 감소 |
| max-players | 15 | 실사용 8~12명 예상 |
| 자동 재시작 | 켬 | 크래시 시 자동 복구 |

---

## 렉 생기면

1. **Spark** 모드 설치 → `/spark profiler start` 후 1~2분 → `/spark profiler stop`
   어느 모드·어느 좌표가 범인인지 바로 나옵니다.
2. 넣으면 좋은 성능 모드: **Canary, ModernFix, FerriteCore, ServerCore**
   (모드는 깃에 안 올라가니 양쪽 PC 둘 다 넣어야 합니다)
3. 그래도 안 되면 `simulation-distance`를 5로.
