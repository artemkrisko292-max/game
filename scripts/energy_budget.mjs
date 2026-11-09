// Анализ энергетического баланса уровней «ЭнергоГероя».
// Считает: ширину уровня, минимальное время пересечения, число лампочек
// и итоговый запас энергии (бюджет) при константах из engine.ts.
// Здоровый диапазон: бюджет/мин.время ≥ 3.5 на средних уровнях, ≥ 2.5 на финальных.
// Запуск: bun scripts/energy_budget.mjs

import { LEVELS } from '../src/lib/game/levels.ts'

const TILE = 40
const MOVE_MAX = 4.2 // px/кадр
const FPS = 60
const SPEED = (MOVE_MAX * FPS) / TILE // тайлов в секунду

// === Константы из engine.ts (синхронизировать вручную при правках) ===
const ENERGY_MAX = 100
const DRAIN_BASE = 2.8
const DRAIN_LAMP = 7.5
const RAMP = 0.04
const HEAL_BULB = 12

function countDef(map, ch) {
  return map.reduce((n, row) => n + (row.match(new RegExp(ch, 'g')) ?? []).length, 0)
}

console.log('ур | ширина | мин.время | ламп | лампочек | бюджет энергии | запас')
console.log('-'.repeat(72))
let worst = Infinity
for (let i = 0; i < LEVELS.length; i++) {
  const def = LEVELS[i]
  const cols = Math.max(...def.map.map((r) => r.length))
  const bulbs = countDef(def.map, 'B')
  const lamps = countDef(def.map, 'L') + countDef(def.map, 'M')
  const minTime = cols / SPEED // секунд чистого бега слева направо
  const mul = 1 + i * RAMP
  // Итоговый бюджет: старт + все лампочки на "пустом" баке (верхняя оценка),
  // расход — чистый базовый, без конусов света.
  const budget = (ENERGY_MAX + bulbs * HEAL_BULB) / (DRAIN_BASE * mul)
  const ratio = budget / minTime
  if (ratio < worst) worst = ratio
  console.log(
    `${String(i + 1).padStart(2)} | ${String(cols).padStart(6)} | ${minTime.toFixed(1).padStart(6)}с | ${String(lamps).padStart(4)} | ${String(bulbs).padStart(8)} | ${budget.toFixed(0).padStart(9)}с | x${ratio.toFixed(1)}`,
  )
}
console.log('-'.repeat(72))
console.log(`Скорость бега: ${SPEED.toFixed(1)} тайлов/с`)
console.log(
  `base=${DRAIN_BASE}/с · лампа=${DRAIN_LAMP}/с · рампа=+${RAMP * 100}%/ур · лампочка=+${HEAL_BULB}`,
)
console.log(`Худший запас по игре: x${worst.toFixed(1)} (норма ≥ 2.5)`)
if (worst < 2.5) {
  console.error('✗ Есть уровни, непроходимые по энергии — ослабь расход')
  process.exit(1)
}
