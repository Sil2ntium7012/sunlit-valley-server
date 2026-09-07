# ============================================================================
#  하이의 놀이터 - 물속 금 코인 소멸 연출 (간헐천)
#
#  호출 방법 (반복 명령 블록 1개면 끝):
#    execute as @e[type=item,nbt={Item:{id:"numismatics:crown"}},distance=..16] at @s if block ~ ~ ~ water run function hisunlit:coin_geyser
#
#  세기 조절은 각 줄의 숫자로:
#    particle <이름> <위치> <퍼짐X> <퍼짐Y> <퍼짐Z> <속도> <개수> force
# ============================================================================

# ── 1. 솟구치는 물기둥 (위로 갈수록 좁아지게 4단으로 쌓음) ──
particle minecraft:bubble_column_up ~ ~0.5 ~ 0.30 0.60 0.30 1.0 220 force
particle minecraft:bubble_column_up ~ ~2.0 ~ 0.22 0.80 0.22 1.0 180 force
particle minecraft:bubble_column_up ~ ~3.5 ~ 0.14 0.90 0.14 1.0 140 force
particle minecraft:bubble_column_up ~ ~5.0 ~ 0.08 0.90 0.08 1.0 90 force

# ── 2. 사방으로 튀는 물보라 ──
particle minecraft:splash ~ ~1.2 ~ 0.30 1.40 0.30 2.5 300 force
particle minecraft:splash ~ ~4.0 ~ 0.20 1.00 0.20 1.5 150 force

# ── 3. 수면에 퍼지는 링 ──
particle minecraft:splash ~ ~0.0 ~ 1.60 0.05 1.60 0.3 200 force
particle minecraft:cloud  ~ ~0.1 ~ 0.90 0.05 0.90 0.05 60 force

# ── 4. 흰 포말 기둥 ──
particle minecraft:cloud ~ ~2.5 ~ 0.25 1.80 0.25 0.02 70 force

# ── 5. 반짝이는 물방울 ──
particle minecraft:end_rod ~ ~2.5 ~ 0.20 2.00 0.20 0.04 60 force

# ── 6. 소리 3중 ──
playsound minecraft:entity.generic.splash              master @a ~ ~ ~ 1.4 0.7
playsound minecraft:entity.player.splash.high_speed    master @a ~ ~ ~ 1.2 1.4
playsound minecraft:block.bubble_column.upwards_inside master @a ~ ~ ~ 1.6 0.6

# ── 7. 코인 제거 ──
kill @s
