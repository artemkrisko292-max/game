// Проверка геометрии уровней «ЭнергоГероя»:
// симулирует физику игрока 1-в-1 с engine.ts и BFS-ом по поверхностям
// проверяет, что все лампочки, рубильники, предохранители и выход достижимы.
// Запуск: bun tools/verify_levels.mjs

import { LEVELS } from '../src/lib/game/levels.ts'

const TILE = 40
const EPS = 0.01
const GRAV = 0.55
const MOVE_ACC = 0.55
const MOVE_MAX = 4.2
const AIR_ACC = 0.38
const GROUND_FRICTION = 0.8
const AIR_FRICTION = 0.96
const JUMP_V = -13.5
const JUMP_CUT = -5
const PW = 26
const PH = 34

function buildWorld(def) {
  const raw = def.map
  const rows = raw.length
  const cols = Math.max(...raw.map((r) => r.length))
  const grid = new Uint8Array(cols * rows)
  const ents = {
    bulbs: [],
    switches: [],
    exits: [],
    spawns: [],
    plats: [],
    fuses: [],
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = c < raw[r].length ? raw[r][c] : '.'
      const x = c * TILE
      const y = r * TILE
      if (ch === '#') grid[r * cols + c] = 1
      else if (ch === 'P') ents.spawns.push({ x: x + TILE / 2 - 13, y: y + TILE - 34 })
      else if (ch === 'B') ents.bulbs.push({ x: x + TILE / 2, y: y + TILE / 2, i: ents.bulbs.length })
      else if (ch === 'S' || ch === 'T') ents.switches.push({ x: x + TILE / 2, y: y + TILE, i: ents.switches.length, ch })
      else if (ch === 'K') ents.fuses.push({ x: x + TILE / 2, y: y + TILE / 2, i: ents.fuses.length })
      else if (ch === 'E') ents.exits.push({ x: x + 2, y: y + TILE })
      else if (ch === 'W')
        ents.plats.push({ x: x - 20, y: y + 8, w: 120, h: 16, cx: x - 20, by: y + 8, amp: 85, vertical: false, pi: ents.plats.length })
      else if (ch === 'U')
        ents.plats.push({ x: x - 20, y: y + 8, w: 120, h: 16, cx: x - 20, by: y + 8, amp: 72, vertical: true, pi: ents.plats.length })
      else if (ch === 'C')
        // осыпающаяся плита: считаем статичной (проверяем достижимость, пока цела)
        ents.plats.push({ x, y, w: 40, h: 14, cx: x, by: y, amp: 0, vertical: false, pi: ents.plats.length })
    }
  }
  return { grid, cols, rows, ...ents, worldW: cols * TILE, worldH: rows * TILE }
}

function rectSolid(w, x, y, ww, hh) {
  const c0 = Math.floor(x / TILE)
  const c1 = Math.floor((x + ww - EPS) / TILE)
  const r0 = Math.floor(y / TILE)
  const r1 = Math.floor((y + hh - EPS) / TILE)
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (c < 0 || c >= w.cols || r < 0 || r >= w.rows) continue
      if (w.grid[r * w.cols + c] === 1) return true
    }
  return false
}

function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw))
  const ny = Math.max(ry, Math.min(cy, ry + rh))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy <= r * r
}

// Поверхности: верхние грани сплошных горизонтальных серий + платформы (фазы)
function surfaces(w) {
  const out = []
  for (let r = 0; r < w.rows; r++) {
    let c = 0
    while (c < w.cols) {
      if (w.grid[r * w.cols + c] === 1 && (r === 0 || w.grid[(r - 1) * w.cols + c] !== 1)) {
        const start = c
        while (c < w.cols && w.grid[r * w.cols + c] === 1 && (r === 0 || w.grid[(r - 1) * w.cols + c] !== 1)) c++
        out.push({ kind: 'tile', x0: start * TILE, x1: c * TILE, y: r * TILE })
      } else c++
    }
  }
  // платформы: 8 фаз как статические поверхности
  // горизонтальные двигаются по x, вертикальные — по y
  for (const p of w.plats) {
    for (let k = 0; k < 8; k++) {
      const phase = (k / 8) * Math.PI * 2
      if (p.vertical) {
        const y = p.by + Math.sin(phase) * p.amp
        out.push({ kind: 'plat', pi: p.pi, x0: p.x, x1: p.x + p.w, y })
      } else {
        const x = p.cx + Math.sin(phase) * p.amp
        out.push({ kind: 'plat', pi: p.pi, x0: x, x1: x + p.w, y: p.y })
      }
    }
  }
  return out
}

// Один прыжок/шаг. Возвращает приземлившуюся поверхность и собранные сущности.
function flight(w, sx, syFeet, vx0, dir, holdJump, maxFrames = 240) {
  let x = sx
  let y = syFeet - PH
  let vx = vx0
  let vy = 0
  let onGround = true
  const touched = new Set()
  const standTouch = (px, py) => {
    for (const b of w.bulbs)
      if (circleRect(b.x, b.y, 17, px, py, PW, PH)) touched.add('B' + b.i)
    for (const s of w.switches)
      if (px < s.x + 15 && px + PW > s.x - 15 && py < s.y && py + PH > s.y - 38)
        touched.add('S' + s.i)
    for (const fu of w.fuses)
      if (circleRect(fu.x, fu.y, 16, px, py, PW, PH)) touched.add('K' + fu.i)
    for (const e of w.exits)
      if (px < e.x + 36 && px + PW > e.x && py < e.y && py + PH > e.y - 56)
        touched.add('E' + e.i)
  }
  standTouch(x, y)
  for (let f = 0; f < maxFrames; f++) {
    // как в step(): прыжок применяется на земле
    if (holdJump && onGround) {
      vy = JUMP_V
      onGround = false
    }
    if (!holdJump && vy < JUMP_CUT) vy = JUMP_CUT
    vy = Math.min(vy + GRAV, 14)
    // горизонталь
    if (dir !== 0) vx += onGround ? MOVE_ACC * dir : AIR_ACC * dir
    else vx *= onGround ? GROUND_FRICTION : AIR_FRICTION
    vx = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, vx))
    // moveX
    x += vx
    if (rectSolid(w, x, y, PW, PH)) {
      if (vx > 0) x = Math.floor((x + PW) / TILE) * TILE - PW - EPS
      else if (vx < 0) x = Math.floor(x / TILE) * TILE + TILE + EPS
      vx = 0
    }
    x = Math.max(2, Math.min(w.worldW - PW - 2, x))
    // moveY
    const prevFeet = y + PH
    y += vy
    let landed = null
    if (vy >= 0) {
      if (rectSolid(w, x, y, PW, PH)) {
        y = Math.floor((y + PH) / TILE) * TILE - PH - EPS
        vy = 0
        onGround = true
      }
      for (const p of w.plats) {
        const feet = y + PH
        if (feet >= p.y && prevFeet <= p.y + 6 && x + PW > p.x && x < p.x + p.w) {
          y = p.y - PH
          vy = 0
          onGround = true
        }
      }
      if (onGround) landed = { x, y: y + PH }
    } else if (rectSolid(w, x, y, PW, PH)) {
      y = Math.floor(y / TILE) * TILE + TILE + EPS
      vy = 0
    }
    standTouch(x, y)
    if (landed) return { landed, touched }
    if (y > w.worldH + 60) return { fell: true, touched }
  }
  return { timeout: true, touched }
}

function keyOf(surf) {
  return surf.kind === 'tile'
    ? `t${surf.y}:${surf.x0}-${surf.x1}`
    : `p${surf.pi}@${Math.round(surf.x0)}:${Math.round(surf.y)}`
}

function verify(idx) {
  const def = LEVELS[idx]
  const w = buildWorld(def)
  const surf = surfaces(w)
  const spawn = w.spawns[0]
  const start =
    surf.find((s) => spawn.x >= s.x0 - 1 && spawn.x + PW <= s.x1 + 1 && Math.abs(spawn.y + PH - s.y) < 1) ??
    surf[0]
  const visited = new Set()
  const reachableEntities = new Set()
  const queue = [start]
  visited.add(keyOf(start))
  while (queue.length) {
    const s = queue.shift()
    const x0s = []
    for (let x = s.x0; x + PW <= s.x1 + 0.5; x += 4) x0s.push(Math.min(x, s.x1 - PW))
    if (!x0s.includes(s.x1 - PW)) x0s.push(s.x1 - PW)
    for (const x0 of x0s) {
      const variants = [
        { vx0: MOVE_MAX, dir: 1, jump: true },
        { vx0: -MOVE_MAX, dir: -1, jump: true },
        { vx0: 0, dir: 1, jump: true },
        { vx0: 0, dir: -1, jump: true },
        { vx0: 0, dir: 0, jump: true },
        { vx0: MOVE_MAX, dir: 1, jump: false }, // сход с края
        { vx0: -MOVE_MAX, dir: -1, jump: false },
      ]
      for (const v of variants) {
        const res = flight(w, x0, s.y, v.vx0, v.dir, v.jump)
        res.touched.forEach((t) => reachableEntities.add(t))
        if (res.landed) {
          const { x: lx, y: ly } = res.landed
          for (const t of surf) {
            if (
              !visited.has(keyOf(t)) &&
              lx >= t.x0 - 1 &&
              lx + PW <= t.x1 + 1 &&
              Math.abs(ly - t.y) < 1.5
            ) {
              visited.add(keyOf(t))
              queue.push(t)
            }
          }
        }
      }
    }
  }
  const issues = []
  // Структурные проверки
  const lampA = def.map.filter((row) => row.includes('L')).length
  const lampB = def.map.reduce((n, row) => n + (row.match(/M/g) ?? []).length, 0)
  const sw = (def.map.join('').match(/S/g) ?? []).length
  const tw = (def.map.join('').match(/T/g) ?? []).length
  const pCount = (def.map.join('').match(/P/g) ?? []).length
  const eCount = (def.map.join('').match(/E/g) ?? []).length
  if (pCount !== 1) issues.push(`  ✗ Точек появления P: ${pCount} (нужно 1)`)
  if (eCount !== 1) issues.push(`  ✗ Выходов E: ${eCount} (нужно 1)`)
  if (sw > 1 || tw > 1) issues.push(`  ✗ Рубильников S=${sw}, T=${tw} (допускается по одному)`)
  if (lampA > 0 !== sw > 0) issues.push('  ✗ Лампы A без рубильника S (или наоборот)')
  if (lampB > 0 !== tw > 0) issues.push('  ✗ Лампы B без рубильника T (или наоборот)')
  const items = [
    ...w.bulbs.map((b) => ({ id: 'B' + b.i, label: `Лампочка B (${Math.round(b.x)},${Math.round(b.y)})` })),
    ...w.switches.map((s) => ({ id: 'S' + s.i, label: `Рубильник ${s.ch} (${Math.round(s.x)},${Math.round(s.y)})` })),
    ...w.fuses.map((fu) => ({ id: 'K' + fu.i, label: `Предохранитель K (${Math.round(fu.x)},${Math.round(fu.y)})` })),
    ...w.exits.map((e) => ({ id: 'E' + e.i, label: `Выход E (${Math.round(e.x)},${Math.round(e.y)})` })),
  ]
  for (const it of items)
    if (!reachableEntities.has(it.id)) issues.push('  ✗ НЕДОСТИЖИМО: ' + it.label)
  // Энергетическая проходимость: бюджет (старт + лампочки) должен запасать
  // минимум 2.5 длины уровня. Константы синхронизированы с engine.ts.
  const ENERGY_MAX = 100
  const DRAIN_BASE = 2.8
  const RAMP = 0.04
  const HEAL_BULB = 12
  const cols = Math.max(...def.map.map((r) => r.length))
  const bulbs = def.map.reduce((n, row) => n + (row.match(/B/g) ?? []).length, 0)
  const minTime = cols * TILE / (MOVE_MAX * 60)
  const budget = (ENERGY_MAX + bulbs * HEAL_BULB) / (DRAIN_BASE * (1 + idx * RAMP))
  const ratio = budget / minTime
  if (ratio < 2.5)
    issues.push(
      `  ✗ МАЛО ЭНЕРГИИ: бюджет ${budget.toFixed(0)}с против мин. ${minTime.toFixed(0)}с бега (x${ratio.toFixed(1)}, нужно ≥ 2.5)`,
    )
  console.log(`\n=== Уровень ${idx + 1}: ${def.name} ===`)
  console.log(`Поверхностей: ${surf.length}, достижимо: ${visited.size}, запас энергии: x${ratio.toFixed(1)}`)
  console.log(issues.length ? issues.join('\n') : '  ✓ все объекты достижимы')
  return issues.length === 0
}

let ok = true
LEVELS.forEach((_, i) => {
  if (!verify(i)) ok = false
})
if (!ok) process.exit(1)
