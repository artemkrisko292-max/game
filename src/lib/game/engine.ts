// Игровой движок «ЭнергоГерой»: физика, сущности, правила, фазы.
// Рендер вынесен в render.ts.

import { LEVELS } from './levels'
import { Sfx } from './audio'
import { render } from './render'
import type {
  BulbE,
  ExitE,
  GameCallbacks,
  HazardE,
  LampE,
  MovPlat,
  Particle,
  Phantom,
  Player,
  Phase,
  RunSummary,
  Snapshot,
  SwitchE,
  Vampire,
} from './types'

export const TILE = 40
export const VIEW_W = 960
export const VIEW_H = 540

const GRAV = 0.55
const MOVE_ACC = 0.55
const MOVE_MAX = 4.2
const AIR_ACC = 0.38
const GROUND_FRICTION = 0.8
const AIR_FRICTION = 0.96
const JUMP_V = -13.5
const JUMP_CUT = -5
const COYOTE = 7
const BUFFER = 8
const STEP = 1 / 60
const EPS = 0.01

const ENERGY_MAX = 100
const DRAIN_BASE = 1.0 // расход энергии в секунду
const DRAIN_LAMP = 2.4 // в секунду внутри конуса света
const LAMP_CONE_LEN = 420
const DMG_VAMPIRE = 18
const DMG_PHANTOM = 12
const DMG_SOCKET = 15
const DMG_FALL = 12
const HEAL_BULB = 8

interface InputState {
  left: boolean
  right: boolean
  jump: boolean
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

export class EnergoGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private cb: GameCallbacks
  private raf = 0
  private acc = 0
  private lastT = 0
  private destroyed = false

  private kb: InputState = { left: false, right: false, jump: false }
  private touch: InputState = { left: false, right: false, jump: false }
  private prevJump = false
  private startRunBulbs = 0
  private startRunSwitches = 0

  sfx = new Sfx()

  phase: Phase = 'menu'
  levelIndex = 0
  frame = 0
  shake = 0

  // Мир
  cols = 0
  rows = 0
  worldW = 0
  worldH = 0
  grid: Uint8Array = new Uint8Array(0)
  player: Player = {
    x: 80,
    y: 80,
    w: 26,
    h: 34,
    vx: 0,
    vy: 0,
    onGround: false,
    coyote: 0,
    buffer: 0,
    facing: 1,
    invuln: 0,
    anim: 0,
    blink: 120,
    squash: 1,
    safeX: 80,
    safeY: 80,
  }
  bulbs: BulbE[] = []
  lamps: LampE[] = []
  switches: SwitchE[] = []
  hazards: HazardE[] = []
  vampires: Vampire[] = []
  phantoms: Phantom[] = []
  plats: MovPlat[] = []
  exit: ExitE = { x: 0, y: 0 }
  particles: Particle[] = []
  camX = 0
  camY = 0

  // Состояние забега
  energy = ENERGY_MAX
  score = 0
  private levelStartScore = 0
  bulbsGot = 0
  bulbsTotal = 0
  switchesGot = 0
  switchesTotal = 0
  runBulbs = 0
  runSwitches = 0
  runBulbsTotal = 0
  runSwitchesTotal = 0
  result: Snapshot['result'] = null
  summary: RunSummary | null = null

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.ctx = ctx
    this.cb = cb
    this.loadLevel(0)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    this.lastT = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }

  // ---------- Публичный API (вызывается из React) ----------

  startRun() {
    this.sfx.ensure()
    this.score = 0
    this.runBulbs = 0
    this.runSwitches = 0
    this.summary = null
    this.result = null
    this.loadLevel(0)
    this.setPhase('intro')
  }

  beginLevel() {
    this.sfx.ensure()
    this.setPhase('playing')
  }

  retryLevel() {
    this.score = this.levelStartScore
    this.runBulbs = this.startRunBulbs
    this.runSwitches = this.startRunSwitches
    this.loadLevel(this.levelIndex)
    this.setPhase('playing')
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.finishRun()
    } else {
      this.loadLevel(this.levelIndex + 1)
      this.setPhase('intro')
    }
  }

  toMenu() {
    this.loadLevel(0)
    this.setPhase('menu')
  }

  togglePause() {
    if (this.phase === 'playing') this.setPhase('paused')
    else if (this.phase === 'paused') this.setPhase('playing')
  }

  setTouch(k: keyof InputState, v: boolean) {
    this.touch[k] = v
    if (k === 'jump' && v) this.sfx.ensure()
  }

  getSnapshot(): Snapshot {
    const def = LEVELS[this.levelIndex]
    return {
      phase: this.phase,
      levelIndex: this.levelIndex,
      levelName: def.name,
      levelSubtitle: def.subtitle,
      hint: def.hint,
      score: this.score,
      energy: this.energy,
      result: this.result,
      summary: this.summary,
    }
  }

  // ---------- Фазы ----------

  private setPhase(p: Phase) {
    this.phase = p
    this.cb.onPhase(this.getSnapshot())
  }

  private finishRun() {
    const total = this.runBulbsTotal + this.runSwitchesTotal
    const collectPct = total > 0 ? (this.runBulbs + this.runSwitches) / total : 1
    const stars = collectPct >= 0.9 ? 3 : collectPct >= 0.55 ? 2 : 1
    let best = 0
    try {
      best = Number(localStorage.getItem('energohero-best') ?? '0') || 0
      if (this.score > best) {
        best = this.score
        localStorage.setItem('energohero-best', String(best))
      }
    } catch {
      /* localStorage недоступен */
    }
    this.summary = {
      score: this.score,
      best,
      bulbs: this.runBulbs,
      bulbsTotal: this.runBulbsTotal,
      switches: this.runSwitches,
      switchesTotal: this.runSwitchesTotal,
      stars,
    }
    this.setPhase('victory')
  }

  // ---------- Загрузка уровня ----------

  private loadLevel(index: number) {
    const def = LEVELS[index]
    this.levelIndex = index
    this.levelStartScore = this.score
    this.startRunBulbs = this.runBulbs
    this.startRunSwitches = this.runSwitches

    const raw = def.map
    this.rows = raw.length
    this.cols = raw.reduce((m, r) => Math.max(m, r.length), 0)
    this.grid = new Uint8Array(this.cols * this.rows)
    this.bulbs = []
    this.lamps = []
    this.switches = []
    this.hazards = []
    this.vampires = []
    this.phantoms = []
    this.plats = []
    this.particles = []
    this.exit = { x: 0, y: 0 }

    let px = 80
    let py = 80

    for (let r = 0; r < this.rows; r++) {
      const row = raw[r]
      for (let c = 0; c < this.cols; c++) {
        const ch = c < row.length ? row[c] : '.'
        const x = c * TILE
        const y = r * TILE
        switch (ch) {
          case '#':
            this.grid[r * this.cols + c] = 1
            break
          case 'P':
            px = x + TILE / 2 - 13
            py = y + TILE - 34
            break
          case 'B':
            this.bulbs.push({
              x: x + TILE / 2,
              y: y + TILE / 2,
              taken: false,
              phase: (c + r) * 0.7,
            })
            break
          case 'L':
            this.lamps.push({ x: x + TILE / 2, y: y + 22, group: 0, on: true })
            break
          case 'M':
            this.lamps.push({ x: x + TILE / 2, y: y + 22, group: 1, on: true })
            break
          case 'S':
            this.switches.push({
              x: x + TILE / 2,
              y: y + TILE,
              group: 0,
              flipped: false,
            })
            break
          case 'T':
            this.switches.push({
              x: x + TILE / 2,
              y: y + TILE,
              group: 1,
              flipped: false,
            })
            break
          case 'V':
            this.vampires.push({
              x: x + 5,
              y: y + TILE - 38,
              w: 30,
              h: 38,
              vx: 1.15,
              vy: 0,
              minX: x + TILE / 2 - 220,
              maxX: x + TILE / 2 + 220,
              dead: false,
              anim: (c % 7) * 0.3,
              onGround: false,
            })
            break
          case 'F':
            this.phantoms.push({
              cx: x + TILE / 2,
              cy: y + TILE / 2,
              x: x + TILE / 2,
              y: y + TILE / 2,
              amp: 150,
              speed: 0.019 + (c % 5) * 0.0015,
              phase: (c % 11) * 0.55,
              dead: false,
            })
            break
          case 'X':
            this.hazards.push({ x: x + TILE / 2, y: y + TILE })
            break
          case 'W':
            this.plats.push({
              x: x - 20,
              y: y + 8,
              w: 120,
              h: 16,
              cx: x - 20,
              amp: 85,
              speed: 0.021,
              phase: 0,
              dx: 0,
            })
            break
          case 'E':
            this.exit = { x: x + 2, y: y + TILE }
            break
        }
      }
    }

    this.worldW = this.cols * TILE
    this.worldH = this.rows * TILE
    this.bulbsTotal = this.bulbs.length
    this.switchesTotal = this.switches.length
    this.runBulbsTotal = LEVELS.reduce(
      (s, l) => s + countChar(l.map, 'B'),
      0,
    )
    this.runSwitchesTotal = LEVELS.reduce(
      (s, l) => s + countChar(l.map, 'S') + countChar(l.map, 'T'),
      0,
    )

    this.player = {
      x: px,
      y: py,
      w: 26,
      h: 34,
      vx: 0,
      vy: 0,
      onGround: false,
      coyote: 0,
      buffer: 0,
      facing: 1,
      invuln: 0,
      anim: 0,
      blink: 120,
      squash: 1,
      safeX: px,
      safeY: py,
    }
    this.energy = ENERGY_MAX
    this.camX = 0
    this.camY = 0
    this.shake = 0
    this.frame = 0
    this.prevJump = false
  }

  // ---------- Ввод ----------

  private readonly GAME_KEYS = new Set([
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Space',
    'KeyA',
    'KeyD',
    'KeyW',
    'KeyZ',
  ])

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.GAME_KEYS.has(e.code)) e.preventDefault()
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.kb.left = true
        break
      case 'ArrowRight':
      case 'KeyD':
        this.kb.right = true
        break
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyZ':
        this.kb.jump = true
        this.sfx.ensure()
        break
      case 'Escape':
      case 'KeyP':
        if (this.phase === 'playing' || this.phase === 'paused')
          this.togglePause()
        break
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.kb.left = false
        break
      case 'ArrowRight':
      case 'KeyD':
        this.kb.right = false
        break
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyZ':
        this.kb.jump = false
        break
    }
  }

  private onBlur = () => {
    this.kb.left = this.kb.right = this.kb.jump = false
    this.touch.left = this.touch.right = this.touch.jump = false
    if (this.phase === 'playing') this.setPhase('paused')
  }

  private get input() {
    return {
      left: this.kb.left || this.touch.left,
      right: this.kb.right || this.touch.right,
      jump: this.kb.jump || this.touch.jump,
    }
  }

  // ---------- Главный цикл ----------

  private loop = (t: number) => {
    if (this.destroyed) return
    this.raf = requestAnimationFrame(this.loop)
    let dt = (t - this.lastT) / 1000
    this.lastT = t
    if (dt > 0.1) dt = 0.1
    if (this.phase === 'playing') {
      this.acc += dt
      let steps = 0
      while (this.acc >= STEP && steps < 4) {
        this.step()
        this.acc -= STEP
        steps++
      }
      if (steps === 4) this.acc = 0
    }
    render(this.ctx, this)
  }

  // ---------- Шаг симуляции ----------

  private step() {
    const p = this.player
    const inp = this.input
    this.frame++
    if (this.shake > 0) this.shake *= 0.85

    // Прыжок: буфер + койот-время
    const jumpPressed = inp.jump && !this.prevJump
    this.prevJump = inp.jump
    if (jumpPressed) p.buffer = BUFFER
    if (p.buffer > 0) p.buffer--
    if (p.coyote > 0) p.coyote--

    // Горизонталь
    const acc = p.onGround ? MOVE_ACC : AIR_ACC
    if (inp.left && !inp.right) {
      p.vx -= acc
      p.facing = -1
    } else if (inp.right && !inp.left) {
      p.vx += acc
      p.facing = 1
    } else {
      p.vx *= p.onGround ? GROUND_FRICTION : AIR_FRICTION
      if (Math.abs(p.vx) < 0.05) p.vx = 0
    }
    p.vx = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, p.vx))

    // Прыжок
    if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = JUMP_V
      p.onGround = false
      p.coyote = 0
      p.buffer = 0
      p.squash = 1.18
      this.sfx.jump()
      this.spawnParticles(p.x + p.w / 2, p.y + p.h, 4, 'dust')
    }
    if (!inp.jump && p.vy < JUMP_CUT) p.vy = JUMP_CUT

    // Гравитация
    p.vy = Math.min(p.vy + GRAV, 14)

    // Движущиеся платформы
    for (const pl of this.plats) {
      pl.phase += pl.speed
      const nx = pl.cx + Math.sin(pl.phase) * pl.amp
      pl.dx = nx - pl.x
      pl.x = nx
    }

    // Движение и коллизии
    this.moveX(p, p.vx)
    p.x = Math.max(2, Math.min(this.worldW - p.w - 2, p.x))

    const wasOnGround = p.onGround
    const prevFeet = p.y + p.h
    this.moveY(p, p.vy, prevFeet)

    if (p.onGround) {
      if (!wasOnGround) {
        p.squash = 0.78
        this.spawnParticles(p.x + p.w / 2, p.y + p.h, 5, 'dust')
        this.sfx.land()
      }
      p.coyote = COYOTE
      const underL = this.solidAt(p.x + 4, p.y + p.h + 3)
      const underR = this.solidAt(p.x + p.w - 4, p.y + p.h + 3)
      if (underL && underR) {
        p.safeX = p.x
        p.safeY = p.y
      }
    }
    p.squash += (1 - p.squash) * 0.18
    p.anim += Math.abs(p.vx) * 0.09
    if (p.invuln > 0) p.invuln--
    if (p.blink > 0) p.blink--
    else if (Math.random() < 0.012) p.blink = 8

    // Провал за нижнюю границу мира (люки)
    if (p.y > this.worldH + 60) {
      this.damage(DMG_FALL, 0)
      p.x = p.safeX
      p.y = p.safeY
      p.vx = 0
      p.vy = 0
    }

    this.updateVampires()
    this.updatePhantoms()
    this.updatePickups()
    this.updateSwitches()
    this.updateHazards()
    this.updateExit()
    this.updateEnergy()
    this.updateParticles()
    this.updateCamera()
  }

  // ---------- Коллизии с тайлами ----------

  solidAt(px: number, py: number): boolean {
    const c = Math.floor(px / TILE)
    const r = Math.floor(py / TILE)
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false
    return this.grid[r * this.cols + c] === 1
  }

  private rectHitsSolid(x: number, y: number, w: number, h: number): boolean {
    const c0 = Math.floor(x / TILE)
    const c1 = Math.floor((x + w - EPS) / TILE)
    const r0 = Math.floor(y / TILE)
    const r1 = Math.floor((y + h - EPS) / TILE)
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) continue
        if (this.grid[r * this.cols + c] === 1) return true
      }
    }
    return false
  }

  private moveX(e: Box & { vx: number }, dx: number): boolean {
    e.x += dx
    if (!this.rectHitsSolid(e.x, e.y, e.w, e.h)) return false
    if (dx > 0) {
      e.x = Math.floor((e.x + e.w) / TILE) * TILE - e.w - EPS
    } else if (dx < 0) {
      e.x = Math.floor(e.x / TILE) * TILE + TILE + EPS
    }
    e.vx = 0
    return true
  }

  private moveY(
    e: Box & { vy: number; onGround: boolean },
    dy: number,
    prevFeet: number,
  ): void {
    e.y += dy
    if (dy >= 0) {
      if (this.rectHitsSolid(e.x, e.y, e.w, e.h)) {
        e.y = Math.floor((e.y + e.h) / TILE) * TILE - e.h - EPS
        e.vy = 0
        e.onGround = true
      }
      for (const pl of this.plats) {
        const feet = e.y + e.h
        if (
          e.vy >= 0 &&
          feet >= pl.y &&
          prevFeet <= pl.y + 6 &&
          e.x + e.w > pl.x &&
          e.x < pl.x + pl.w
        ) {
          e.y = pl.y - e.h
          e.vy = 0
          e.onGround = true
          e.x += pl.dx
        }
      }
    } else {
      if (this.rectHitsSolid(e.x, e.y, e.w, e.h)) {
        e.y = Math.floor(e.y / TILE) * TILE + TILE + EPS
        e.vy = 0
      }
    }
  }

  // ---------- Сущности ----------

  private updateVampires() {
    const p = this.player
    for (const v of this.vampires) {
      if (v.dead) continue
      v.anim += 0.08
      v.vy = Math.min(v.vy + GRAV, 12)
      const oldVx = v.vx
      this.moveX(v, v.vx)
      if (v.vx === 0 && oldVx !== 0) v.vx = -oldVx // упёрся в стену
      if (v.x <= v.minX) v.vx = Math.abs(v.vx)
      if (v.x >= v.maxX) v.vx = -Math.abs(v.vx)

      const prevFeet = v.y + v.h
      const wasGround = v.onGround
      v.onGround = false
      this.moveY(v, v.vy, prevFeet)
      if (v.onGround && !wasGround) v.vy = 0
      // разворот у обрыва
      if (v.onGround) {
        const aheadX = v.vx > 0 ? v.x + v.w + 5 : v.x - 5
        if (!this.solidAt(aheadX, v.y + v.h + 8)) v.vx = -v.vx
      }

      if (p.invuln <= 0 && rectsOverlap(p, v)) {
        if (p.vy > 2 && p.y + p.h - v.y < 22) {
          v.dead = true
          p.vy = -9.5
          this.score += 100
          this.shake = 6
          this.spawnParticles(v.x + v.w / 2, v.y + v.h / 2, 14, 'poof')
          this.sfx.stomp()
        } else {
          this.damage(DMG_VAMPIRE, p.x < v.x + v.w / 2 ? -1 : 1)
        }
      }
    }
  }

  private updatePhantoms() {
    const p = this.player
    for (const f of this.phantoms) {
      if (f.dead) continue
      f.phase += f.speed
      f.x = f.cx + Math.sin(f.phase) * f.amp
      f.y = f.cy + Math.sin(f.phase * 2.3) * 26
      if (p.invuln <= 0 && circleRect(f.x, f.y, 16, p)) {
        this.damage(DMG_PHANTOM, p.x < f.x ? -1 : 1)
        f.phase += Math.PI
      }
    }
  }

  private updatePickups() {
    const p = this.player
    for (const b of this.bulbs) {
      if (b.taken) continue
      const bobY = b.y + Math.sin(this.frame * 0.05 + b.phase) * 4
      if (circleRect(b.x, bobY, 15, p)) {
        b.taken = true
        this.bulbsGot++
        this.runBulbs++
        this.score += 50
        this.energy = Math.min(ENERGY_MAX, this.energy + HEAL_BULB)
        this.spawnParticles(b.x, bobY, 8, 'star')
        this.sfx.collect()
      }
    }
  }

  private updateSwitches() {
    for (const s of this.switches) {
      if (s.flipped) continue
      const box = { x: s.x - 15, y: s.y - 38, w: 30, h: 38 }
      if (rectsOverlap(this.player, box)) {
        s.flipped = true
        let turned = 0
        for (const l of this.lamps) {
          if (l.group === s.group && l.on) {
            l.on = false
            turned++
          }
        }
        if (turned > 0) {
          this.score += 150
          this.switchesGot++
          this.runSwitches++
          for (const l of this.lamps) {
            if (l.group === s.group)
              this.spawnParticles(l.x, l.y + 10, 7, 'spark')
          }
          this.spawnParticles(s.x, s.y - 20, 8, 'star')
          this.sfx.flip()
        }
      }
    }
  }

  private lampDrain(): number {
    let drain = 0
    const p = this.player
    const pcx = p.x + p.w / 2
    const pcy = p.y + p.h / 2
    for (const l of this.lamps) {
      if (!l.on) continue
      const dx = Math.abs(pcx - l.x)
      const dy = pcy - l.y
      if (dy > 0 && dy < LAMP_CONE_LEN) {
        const halfW = 16 + dy * 0.34
        if (dx < halfW) {
          drain += DRAIN_LAMP * (1 - (dy / LAMP_CONE_LEN) * 0.45)
        }
      }
    }
    return Math.min(drain, DRAIN_LAMP * 2)
  }

  private updateHazards() {
    const p = this.player
    if (p.invuln > 0) return
    for (const h of this.hazards) {
      if (circleRect(h.x, h.y - 14, 15, p)) {
        this.damage(DMG_SOCKET, p.x < h.x ? -1 : 1)
        this.spawnParticles(h.x, h.y - 16, 12, 'spark')
        break
      }
    }
  }

  private updateExit() {
    const p = this.player
    const box = { x: this.exit.x, y: this.exit.y - 56, w: 36, h: 56 }
    if (rectsOverlap(p, box)) {
      const bonus = Math.round(this.energy) * 5
      this.score += bonus
      this.result = {
        levelName: LEVELS[this.levelIndex].name,
        energy: Math.round(this.energy),
        bonus,
        bulbs: this.bulbsGot,
        bulbsTotal: this.bulbsTotal,
        switches: this.switchesGot,
        switchesTotal: this.switchesTotal,
        score: this.score,
      }
      this.shake = 4
      this.spawnParticles(p.x + p.w / 2, p.y, 16, 'star')
      this.sfx.win()
      if (this.levelIndex + 1 >= LEVELS.length) {
        this.finishRun()
      } else {
        this.setPhase('complete')
      }
    }
  }

  private updateEnergy() {
    this.energy -= (DRAIN_BASE + this.lampDrain()) * STEP
    if (this.energy <= 0) {
      this.energy = 0
      this.sfx.lose()
      this.setPhase('gameover')
    }
  }

  private damage(amount: number, knockDir: number) {
    const p = this.player
    if (p.invuln > 0) return
    this.energy = Math.max(0, this.energy - amount)
    p.invuln = 75
    p.vx = knockDir * 5
    p.vy = Math.min(p.vy, -6)
    this.shake = 8
    this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 10, 'spark')
    this.sfx.hurt()
    if (this.energy <= 0) {
      this.energy = 0
      this.sfx.lose()
      this.setPhase('gameover')
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i]
      q.life--
      q.x += q.vx
      q.y += q.vy
      q.vy += q.grav
      q.vx *= 0.98
      if (q.life <= 0) this.particles.splice(i, 1)
    }
  }

  spawnParticles(x: number, y: number, n: number, kind: Particle['kind']) {
    const colors: Record<Particle['kind'], string[]> = {
      spark: ['#ffd94d', '#ffb63d', '#fff3b0'],
      poof: ['#c9b6d8', '#9c7fae', '#e6d9f0'],
      star: ['#ffe873', '#a4f04a', '#7ee081'],
      dust: ['#c9b08a', '#a8916e'],
    }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 1 + Math.random() * 2.6
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.2,
        life: 22 + Math.random() * 18,
        maxLife: 40,
        size: 2 + Math.random() * 3,
        color: colors[kind][Math.floor(Math.random() * colors[kind].length)],
        kind,
        grav: kind === 'poof' ? 0 : kind === 'dust' ? 0.08 : 0.14,
      })
    }
    if (this.particles.length > 300) this.particles.splice(0, 100)
  }

  private updateCamera() {
    const p = this.player
    const targetX = clamp(
      p.x + p.w / 2 + p.facing * 60 - VIEW_W / 2,
      0,
      Math.max(0, this.worldW - VIEW_W),
    )
    const targetY = clamp(
      p.y + p.h / 2 - VIEW_H / 2,
      0,
      Math.max(0, this.worldH - VIEW_H),
    )
    this.camX += (targetX - this.camX) * 0.1
    this.camY += (targetY - this.camY) * 0.12
  }
}

// ---------- Утилиты ----------

function rectsOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  )
}

function circleRect(
  cx: number,
  cy: number,
  r: number,
  rect: Box,
): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w))
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy <= r * r
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function countChar(map: string[], ch: string): number {
  let n = 0
  for (const row of map) for (const c of row) if (c === ch) n++
  return n
}
