#!/usr/bin/env bash
# Проверка путей, не покрытых verify_cutscenes.sh:
#  A. ПОСЛЕДОВАТЕЛЬНОЕ прохождение: главы II/III/IV после нарядов 5/10/15
#     (кнопка «СЛЕДУЮЩИЙ НАРЯД», без ПРОДОЛЖИТЬ и карты).
#  B. Просмотр главы в хронике (КАДР) не должен «съедать» её игровой
#     триггер: после превью глава обязана показаться и в нарядах.
# Требует запущенного dev-сервера на :3000 и agent-browser.
set -u
AB="agent-browser"
BASE="http://localhost:3000"
P=0; F=0

ok() { echo "PASS: $1"; P=$((P+1)); }
bad() { echo "FAIL: $1"; F=$((F+1)); }

has() {
  local r
  r=$($AB eval "document.body.innerText.includes('$1')?'Y':'N'" 2>/dev/null | tr -d '"' | tail -1)
  if [ "$r" = "Y" ]; then ok "$2"; else bad "$2 (не найдено: '$1')"; fi
}
nothas() {
  local r
  r=$($AB eval "document.body.innerText.includes('$1')?'Y':'N'" 2>/dev/null | tr -d '"' | tail -1)
  if [ "$r" = "N" ]; then ok "$2"; else bad "$2 (найдено: '$1')"; fi
}

clk() {
  local ref
  ref=$($AB snapshot -i 2>/dev/null | grep -m1 -F "$1" | grep -o 'ref=e[0-9]*' | head -1 | sed 's/^ref=/@/')
  if [ -z "$ref" ]; then bad "клик: кнопка не найдена: '$1'"; F=$((F+1)); return 1; fi
  $AB click "$ref" >/dev/null 2>&1 || { bad "клик не удался: '$1' ($ref)"; F=$((F+1)); return 1; }
}

clk_nth() {
  local ref
  ref=$($AB snapshot -i 2>/dev/null | grep -F "$1" | grep -o 'ref=e[0-9]*' | sed -n "${2}p" | sed 's/^ref=/@/')
  if [ -z "$ref" ]; then bad "клик: кнопка №$2 не найдена: '$1'"; F=$((F+1)); return 1; fi
  $AB click "$ref" >/dev/null 2>&1 || { bad "клик не удался: '$1' №$2 ($ref)"; F=$((F+1)); return 1; }
}

state() { $AB eval "window.__energo.getSnapshot().levelIndex + ':' + window.__energo.getSnapshot().phase" 2>/dev/null | tr -d '"' | tail -1; }
expect_state() {
  local s; s=$(state)
  if [ "$s" = "$1" ]; then ok "$2 ($s)"; else bad "$2 — ожидалось '$1', получено '$s'"; fi
}

# Быстро «доиграть» текущий наряд: снимаем замок щитка и ставим Вжика на выход.
win_level() {
  $AB eval "(() => { const g = window.__energo; g.exit.locked = false; g.player.x = g.exit.x + 8; g.player.y = g.exit.y - 12; return 'ok'; })()" >/dev/null 2>&1
  sleep 1.2
}

begin_lvl() {
  $AB eval "window.__energo.beginLevel(); 'ok'" >/dev/null 2>&1
  sleep 0.4
}

# Досмотреть катсцену до конца: первый клик по кадру дочитывает текст,
# второй листает. Кликаем «ДАЛЬШЕ», пока на экране есть «кадр N/M» (до 12 раз).
finish_scene() {
  local i r ref
  for i in $(seq 1 12); do
    r=$($AB eval "(document.body.innerText.match(/кадр \\d\\/\\d/i)||[''])[0]" 2>/dev/null | tr -d '"' | tail -1)
    [ -z "$r" ] && return 0
    ref=$($AB snapshot -i 2>/dev/null | grep -m1 -F 'ДАЛЬШЕ' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/^ref=/@/')
    [ -z "$ref" ] && return 0
    $AB click "$ref" >/dev/null 2>&1
    sleep 0.5
  done
}

# Пропустить открытую катсцену кнопкой «ПРОПУСТИТЬ».
skip_scene() {
  clk 'ПРОПУСТИТЬ'
  sleep 1
}

# Следующие N нарядов подряд: завершить → «СЛЕДУЮЩИЙ НАРЯД» → начать.
# expect_idx — индекс уровня, на котором должны оказаться после клика.
run_until() { # $1=fromIdx(текущий playing) $2=toIdxExclusive $3=ожидаемая глава или ''
  local i
  for ((i=$1; i<$2; i++)); do
    win_level
    if ! clk 'СЛЕДУЮЩИЙ НАРЯД'; then return 1; fi
    sleep 1
    local nextIdx=$((i+1))
    if [ "$nextIdx" = "$3" ]; then return 0; fi
    expect_state "$nextIdx:intro" "последовательный переход: наряд $((nextIdx+1))"
    begin_lvl
  done
}

echo "=== A. Последовательное прохождение: главы II/III/IV ==="
$AB open "$BASE" >/dev/null 2>&1
$AB eval "localStorage.clear(); 'ok'" >/dev/null 2>&1
$AB reload >/dev/null 2>&1
$AB wait --fn "window.__energo && window.__energo.getSnapshot && window.__energo.getSnapshot().phase==='menu'" >/dev/null 2>&1
sleep 1

clk 'НАЧАТЬ СМЕНУ'
sleep 1
has 'ПРОЛОГ' 'пролог показан'
clk 'ПРОПУСТИТЬ'
sleep 1
expect_state '0:intro' 'наряд 1, фаза intro'
begin_lvl

# Наряды 1–5: после наряда 5 (индекс 4) глава II (индекс 5)
run_until 0 5 5
has 'ГЛАВА II' 'глава II после наряда 5 (СЛЕДУЮЩИЙ НАРЯД)'
clk 'ПРОПУСТИТЬ'
sleep 1
expect_state '5:intro' 'после главы II — наряд 6'
begin_lvl

run_until 5 10 10
has 'ГЛАВА III' 'глава III после наряда 10 (СЛЕДУЮЩИЙ НАРЯД)'
clk 'ПРОПУСТИТЬ'
sleep 1
expect_state '10:intro' 'после главы III — наряд 11'
begin_lvl

run_until 10 15 15
has 'ГЛАВА IV' 'глава IV после наряда 15 (СЛЕДУЮЩИЙ НАРЯД)'
clk 'ПРОПУСТИТЬ'
sleep 1
expect_state '15:intro' 'после главы IV — наряд 16'

echo
echo "=== B. Превью в хронике не съедает игровой триггер (гл. II/III/IV) ==="
# Сценарий бага: игрок листает главы в хронике (ХР-05…ХР-15), затем играет —
# каждая глава обязана сыграть в нарядах, превью ничего не «съедает».
for n in 2 3 4; do
  case $n in
    2) UNL=6;  DOC='ГЛАВА II';  DOCNO='ХР-05'; IDX=5 ;;
    3) UNL=11; DOC='ГЛАВА III'; DOCNO='ХР-10'; IDX=10 ;;
    4) UNL=16; DOC='ГЛАВА IV';  DOCNO='ХР-15'; IDX=15 ;;
  esac
  $AB eval "localStorage.setItem('energohero-progress-v1', JSON.stringify({unlocked:$UNL,stars:Array(20).fill(0),best:Array(20).fill(0)})); 'ok'" >/dev/null 2>&1
  $AB reload >/dev/null 2>&1
  $AB wait --fn "window.__energo && window.__energo.getSnapshot && window.__energo.getSnapshot().phase==='menu'" >/dev/null 2>&1
  sleep 1

  clk 'ХРОНИКА СМЕНЫ'
  sleep 1
  # Карточки в списке: 1 — пролог, 2 — гл. II, 3 — гл. III, 4 — гл. IV, 5 — эпилог
  clk_nth 'КАДР' "$n"
  sleep 1
  has 'КАДР 1/3' "$DOC открыта превью из хроники"
  has "$DOCNO" "в превью открыт бланк $DOCNO"
  finish_scene
  nothas 'КАДР 3/3' "$DOC досмотрена и закрылась"
  has 'ЭГ-ХР' "вернулись к списку хроники ($DOC)"
  clk 'ЗАКРЫТЬ ХРОНИКУ'
  sleep 1

  clk 'ПРОДОЛЖИТЬ'
  sleep 1.5
  has "$DOC" "$DOC играется в наряде $UNL после превью"
  has "$DOCNO" "в наряде открыт бланк $DOCNO"
  skip_scene
  expect_state "$IDX:intro" "после $DOC — наряд $((UNL))"
done

echo
echo "ИТОГО: PASS=$P FAIL=$F"
[ "$F" -eq 0 ]
