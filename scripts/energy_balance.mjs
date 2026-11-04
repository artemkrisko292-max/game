// Баланс энергии: расход в секунду и запас хода по уровням.
import { LEVELS } from '../src/lib/game/levels.ts'

const DRAIN_BASE = 4
const RAMP = 0.03
const HEAL = 10
const MAX = 100

for (let i = 0; i < LEVELS.length; i++) {
  const nB = LEVELS[i].map
    .join('')
    .split('')
    .filter((c) => c === 'B').length
  const cols = Math.max(...LEVELS[i].map.map((r) => r.length))
  const mul = 1 + i * RAMP
  const drain = DRAIN_BASE * mul
  const budget = (MAX + nB * HEAL) / drain
  const idle = MAX / drain
  const name = LEVELS[i].name.padEnd(16)
  console.log(
    `${String(i + 1).padStart(2)} ${name} ламп:${String(nB).padStart(2)}  расход: ${drain.toFixed(1)}/с  запас: ${budget.toFixed(0)}с  без сбора: ${idle.toFixed(0)}с  длина: ${cols}к`,
  )
}
