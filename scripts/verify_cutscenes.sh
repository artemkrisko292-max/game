#!/usr/bin/env bash
# Браузерная проверка сюжета «ЭнергоГероя»: все 5 катсцен + хроника.
# Требует запущенного dev-сервера на :3000 и agent-browser.
set -u
AB="agent-browser"
BASE="http://localhost:3000"
P=0; F=0

ok() { echo "PASS: $1"; P=$((P+1)); }
bad() { echo "FAIL: $1"; F=$((F+1)); }

# has 'ТЕКСТ' описание — есть ли текст на странице
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

# clk 'ПОДСТРОКА' — найти кнопку в снапшоте по подстроке и кликнуть по ref
clk() {
  local ref
  ref=$($AB snapshot -i 2>/dev/null | grep -m1 -F "$1" | grep -o 'ref=e[0-9]*' | head -1 | sed 's/^ref=/@/')
  if [ -z "$ref" ]; then bad "клик: кнопка не найдена: '$1'"; F=$((F+1)); return 1; fi
  $AB click "$ref" >/dev/null 2>&1 || { bad "клик не удался: '$1' ($ref)"; F=$((F+1)); return 1; }
}

# clk_nth 'ПОДСТРОКА' N — клик по N-й (с 1) кнопке, найденной по подстроке
clk_nth() {
  local ref
  ref=$($AB snapshot -i 2>/dev/null | grep -F "$1" | grep -o 'ref=e[0-9]*' | sed -n "${2}p" | sed 's/^ref=/@/')
  if [ -z "$ref" ]; then bad "клик: кнопка №$2 не найдена: '$1'"; F=$((F+1)); return 1; fi
  $AB click "$ref" >/dev/null 2>&1 || { bad "клик не удался: '$1' №$2 ($ref)"; F=$((F+1)); return 1; }
}

# set_unlocked N — выставить прогресс и перезагрузить страницу
set_unlocked() {
  $AB eval "localStorage.setItem('energohero-progress-v1', JSON.stringify({unlocked:$1,stars:Array(20).fill(0),best:Array(20).fill(0)})); 'ok'" >/dev/null 2>&1
  $AB reload >/dev/null 2>&1
  $AB wait --fn "window.__energo && window.__energo.getSnapshot && window.__energo.getSnapshot().phase==='menu'" >/dev/null 2>&1
  sleep 1
}

# expect_state 'I:PHASE' описание
state() { $AB eval "window.__energo.getSnapshot().levelIndex + ':' + window.__energo.getSnapshot().phase" 2>/dev/null | tr -d '"' | tail -1; }
expect_state() {
  local s; s=$(state)
  if [ "$s" = "$1" ]; then ok "$2 ($s)"; else bad "$2 — ожидалось '$1', получено '$s'"; fi
}

echo "=== Открытие страницы ==="
$AB open "$BASE" >/dev/null 2>&1
$AB eval "localStorage.clear(); 'ok'" >/dev/null 2>&1
$AB reload >/dev/null 2>&1
$AB wait --fn "window.__energo && window.__energo.getSnapshot && window.__energo.getSnapshot().phase==='menu'" >/dev/null 2>&1
sleep 1

echo "=== 1. ПРОЛОГ: НАЧАТЬ СМЕНУ ==="
clk 'НАЧАТЬ СМЕНУ'
sleep 1
has 'ПРОЛОГ' 'пролог открывается'
clk 'ПРОПУСТИТЬ'
sleep 1
expect_state '0:intro' 'после пролога — наряд 1, фаза intro'

echo "=== 2. ГЛАВА II: ПРОДОЛЖИТЬ на уровень 6 ==="
set_unlocked 6
clk 'ПРОДОЛЖИТЬ'
sleep 1
has 'ГЛАВА II' 'глава II показана при входе на наряд 6'
clk 'ПРОПУСТИТЬ'
sleep 1
expect_state '5:intro' 'после главы II — наряд 6'

echo "=== 3. ГЛАВА III: ПРОДОЛЖИТЬ на уровень 11 ==="
set_unlocked 11
clk 'ПРОДОЛЖИТЬ'
sleep 1
has 'ГЛАВА III' 'глава III показана при входе на наряд 11'
clk 'ПРОПУСТИТЬ'
sleep 1
expect_state '10:intro' 'после главы III — наряд 11'

echo "=== 4. ГЛАВА IV: карта уровней, наряд 16 ==="
set_unlocked 16
clk 'УРОВНИ'
sleep 1
clk '№16'
sleep 1
has 'ГЛАВА IV' 'глава IV показана при выборе наряда 16'
clk 'ПРОПУСТИТЬ'
sleep 1
expect_state '15:intro' 'после главы IV — наряд 16'

echo "=== 5. ЭПИЛОГ: победа ==="
$AB eval "window.__energo.selectLevel(19); window.__energo.nextLevel(); 'ok'" >/dev/null 2>&1
sleep 2
expect_state '19:victory' 'фаза victory'
has 'ЭПИЛОГ' 'эпилог показан поверх отчёта'
clk 'ПРОПУСТИТЬ'
sleep 1

echo "=== 6. ХРОНИКА: просмотр главы возвращает к списку ==="
$AB eval "window.__energo.toMenu(); 'ok'" >/dev/null 2>&1
sleep 1
clk 'ХРОНИКА СМЕНЫ'
sleep 1
has 'ЭГ-ХР' 'список хроники открыт'
clk_nth 'КАДР' 2
sleep 1
has 'КАДР 1/3' 'глава II открывается из хроники (катсцена открыта)'
# Пройти все 3 кадра кнопкой «ДАЛЬШЕ»: на последнем она же завершает сцену
clk 'ДАЛЬШЕ'; sleep 0.7
clk 'ДАЛЬШЕ'; sleep 0.7
clk 'ДАЛЬШЕ'; sleep 1
nothas 'КАДР 1/3' 'катсцена закрылась'
has 'ЭГ-ХР' 'после просмотра вернулись к списку хроники'
nothas 'ПРОДОЛЖИТЬ' 'и не выброшены в главное меню'

echo
echo "ИТОГО: PASS=$P FAIL=$F"
[ "$F" -eq 0 ]
