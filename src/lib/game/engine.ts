// Игровой движок «ЭнергоГерой»: физика, сущности, правила, фазы.
// Рендер вынесен в render.ts.

import { LEVELS } from './levels'
import { Sfx } from './audio'
import { render } from './render'
import type {
  BulbE,
  CrumbE,
  DeathCause,
  DroneE,
  ExitE,
  FuseE,
  GameCallbacks,
  HazardE,
  LampE,
  MovPlat,
  Particle,
  Phantom,
  Player,
  Phase,
  RunnerE,
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
const DMG_SPIKES = 14
const DMG_RUNNER = 22
const DMG_DRONE = 15
const DMG_FALL = 12
const HEAL_BULB = 8
const SCORE_RUNNER = 150
const SCORE_DRONE = 120
const SCORE_FUSE = 250
const CRUMBLE_DELAY = 30 // кадров от вставания до обвала (~0.5 с)
const CRUMBLE_RESPAWN = 250 // кадров до восстановления плиты

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
  runners: RunnerE[] = []
  drones: DroneE[] = []
  crumbs: CrumbE[] = []
  fuses: FuseE[] = []
  plats: MovPlat[] = []
  exit: ExitE = { x: 0, y: 0, locked: false }
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
  fusesGot = 0
  fusesTotal = 0
  runBulbs = 0
  runSwitches = 0
  runBulbsTotal = 0
  runSwitchesTotal = 0
  result: Snapshot['result'] = null
  summary: RunSummary | null = null
  /** Кадров с начала попытки (для хронометража). */
  levelFrames = 0
  /** Номер текущей попытки уровня. */
  attempts = 1
  /** Откуда пришло последнее повреждение — для акта об аварии. */
  deathCause: DeathCause | null = null

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
    this.selectLevel(0)
  }

  /** Запуск конкретного уровня (из карты уровней): с чистого забега. */
  selectLevel(index: number) {
    this.sfx.ensure()
    this.score = 0
    this.runBulbs = 0
    this.runSwitches = 0
    this.summary = null
    this.result = null
    this.loadLevel(index)
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
    this.attempts++ // loadLevel сбрасывает счётчик — восстанавливаем
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
      badge: def.badge ?? null,
      score: this.score,
      energy: this.energy,
      result: this.result,
      summary: this.summary,
      attempt: this.attempts,
      deathCause: this.deathCause,
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

  loadLevel(index: number) {
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
    this.runners = []
    this.drones = []
    this.crumbs = []
    this.fuses = []
    this.plats = []
    this.particles = []
    this.exit = { x: 0, y: 0, locked: false }

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
          case 'V': {
            // Скорость вампиров растёт с номером уровня
            const vSpeed = Math.min(1.9, 1.15 + this.levelIndex * 0.035)
            this.vampires.push({
              x: x + 5,
              y: y + TILE - 38,
              w: 30,
              h: 38,
              vx: vSpeed,
              vy: 0,
              minX: x + TILE / 2 - 220,
              maxX: x + TILE / 2 + 220,
              dead: false,
              anim: (c % 7) * 0.3,
              onGround: false,
            })
            break
          }
          case 'G':
            this.runners.push({
              x: x + 5,
              y: y + TILE - 38,
              w: 30,
              h: 38,
              vx: Math.min(3.4, 2.45 + this.levelIndex * 0.03),
              vy: 0,
              minX: x + TILE / 2 - 280,
              maxX: x + TILE / 2 + 280,
              dead: false,
              anim: (c % 7) * 0.3,
              onGround: false,
            })
            break
          case 'Z':
            this.drones.push({
              x: x + 4,
              y: y + 6,
              w: 32,
              h: 26,
              vx: 1.7 + (c % 3) * 0.25,
              vy: 1.15,
              dead: false,
              anim: (c % 5) * 0.4,
              onGround: false,
            })
            break
          case 'F': {
            const fSpeed =
              0.019 + (c % 5) * 0.0015 + Math.min(0.009, this.levelIndex * 0.0005)
            this.phantoms.push({
              cx: x + TILE / 2,
              cy: y + TILE / 2,
              x: x + TILE / 2,
              y: y + TILE / 2,
              amp: 150,
              speed: fSpeed,
              phase: (c % 11) * 0.55,
              dead: false,
            })
            break
          }
          case 'X':
            this.hazards.push({ x: x + TILE / 2, y: y + TILE, kind: 'socket' })
            break
          case '^':
            this.hazards.push({ x: x + TILE / 2, y: y + TILE, kind: 'spikes' })
            break
          case 'C':
            this.crumbs.push({
              x,
              y,
              w: TILE,
              h: 14,
              state: 0,
              timer: 0,
            })
            break
          case 'K':
            this.fuses.push({
              x: x + TILE / 2,
              y: y + TILE / 2,
              taken: false,
              phase: (c + r) * 0.6,
            })
            break
          case 'W':
            this.plats.push({
              x: x - 20,
              y: y + 8,
              w: 120,
              h: 16,
              cx: x - 20,
              by: y + 8,
              amp: 85,
              speed: 0.021,
              phase: (c % 3) * 0.9,
              dx: 0,
              dy: 0,
              axis: 'x',
            })
            break
          case 'U':
            this.plats.push({
              x: x - 20,
              y: y + 8,
              w: 120,
              h: 16,
              cx: x - 20,
              by: y + 8,
              amp: 72,
              speed: 0.026,
              phase: (c % 4) * 1.15,
              dx: 0,
              dy: 0,
              axis: 'y',
            })
            break
          case 'E':
            this.exit = { x: x + 2, y: y + TILE, locked: false }
            break
        }
      }
    }

    this.worldW = this.cols * TILE
    this.worldH = this.rows * TILE
    this.bulbsGot = 0
    this.switchesGot = 0
    this.fusesGot = 0
    this.bulbsTotal = this.bulbs.length
    this.switchesTotal = this.switches.length
    this.fusesTotal = this.fuses.length
    // Если на уровне есть предохранители — выход заперт, пока не собраны
    this.exit.locked = this.fusesTotal > 0
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
    this.levelFrames = 0
    this.attempts = 1
    this.deathCause = null
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
    const c = this.keyId(e)
    if (this.GAME_KEYS.has(c)) e.preventDefault()
    switch (c) {
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
    switch (this.keyId(e)) {
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

  // Нормализация: некоторые окружения присылают события без e.code —
  // тогда откатываемся к e.key ('ArrowLeft', 'a', ' ', 'Enter').
  private keyId(e: KeyboardEvent): string {
    if (e.code) return e.code
    const k = e.key
    if (k === ' ') return 'Space'
    return k.length === 1 ? `Key${k.toUpperCase()}` : k
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
    this.levelFrames++
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

    // Движущиеся платформы (горизонтальные и вертикальные)
    for (const pl of this.plats) {
      pl.phase += pl.speed
      if (pl.axis === 'x') {
        const nx = pl.cx + Math.sin(pl.phase) * pl.amp
        pl.dx = nx - pl.x
        pl.dy = 0
        pl.x = nx
      } else {
        const ny = pl.by + Math.sin(pl.phase) * pl.amp
        pl.dy = ny - pl.y
        pl.dx = 0
        pl.y = ny
      }
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
      this.damage(DMG_FALL, 0, 'fall')
      p.x = p.safeX
      p.y = p.safeY
      p.vx = 0
      p.vy = 0
    }

    this.updateWalkers(this.vampires, DMG_VAMPIRE, 100, 'vampire')
    this.updateWalkers(this.runners, DMG_RUNNER, SCORE_RUNNER, 'runner')
    this.updateDrones()
    this.updatePhantoms()
    this.updateCrumbs()
    this.updateFuses()
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
      // Осыпающиеся плиты: та же «односторонняя» коллизия сверху
      for (const c of this.crumbs) {
        if (c.state === 2) continue
        const feet = e.y + e.h
        if (
          feet >= c.y &&
          prevFeet <= c.y + 6 &&
          e.x + e.w > c.x + 2 &&
          e.x < c.x + c.w - 2
        ) {
          e.y = c.y - e.h
          e.vy = 0
          e.onGround = true
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

  /** Наземные ходячие враги (вампиры и гонцы). */
  private updateWalkers(
    list: Vampire[],
    dmg: number,
    stompScore: number,
    cause: DeathCause,
  ) {
    const p = this.player
    for (const v of list) {
      if (v.dead) continue
      v.anim += Math.abs(v.vx) * 0.06
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
          this.score += stompScore
          this.shake = 6
          this.spawnParticles(v.x + v.w / 2, v.y + v.h / 2, 14, 'poof')
          this.sfx.stomp()
        } else {
          this.damage(dmg, p.x < v.x + v.w / 2 ? -1 : 1, cause)
        }
      }
    }
  }

  /** Дроны-пылесосы: летают по диагонали, отскакивая от стен. */
  private updateDrones() {
    const p = this.player
    for (const d of this.drones) {
      if (d.dead) continue
      d.anim += 0.12
      const oldVx = d.vx
      this.moveX(d, d.vx)
      if (d.vx === 0 && oldVx !== 0) d.vx = -oldVx

      const oldVy = d.vy
      this.moveY(d, d.vy, d.y + d.h)
      if (d.vy === 0 && oldVy !== 0) d.vy = -oldVy // пол или потолок

      // Границы мира: не даём дрону улететь в пустоту
      if (d.x <= 0) {
        d.x = 0
        d.vx = Math.abs(d.vx)
      } else if (d.x + d.w >= this.worldW) {
        d.x = this.worldW - d.w
        d.vx = -Math.abs(d.vx)
      }
      if (d.y <= 0) {
        d.y = 0
        d.vy = Math.abs(d.vy)
      } else if (d.y + d.h >= this.worldH) {
        d.y = this.worldH - d.h
        d.vy = -Math.abs(d.vy)
      }

      if (p.invuln <= 0 && rectsOverlap(p, d)) {
        if (p.vy > 2 && p.y + p.h - d.y < 20) {
          d.dead = true
          p.vy = -9.5
          this.score += SCORE_DRONE
          this.shake = 6
          this.spawnParticles(d.x + d.w / 2, d.y + d.h / 2, 12, 'poof')
          this.sfx.stomp()
        } else {
          this.damage(DMG_DRONE, p.x < d.x + d.w / 2 ? -1 : 1, 'drone')
        }
      }
    }
  }

  /** Осыпающиеся плиты: разрушаются под игроком и восстанавливаются. */
  private updateCrumbs() {
    const p = this.player
    for (const c of this.crumbs) {
      if (c.state === 2) {
        c.timer--
        if (c.timer <= 0) {
          c.state = 0
          c.timer = 0
        }
        continue
      }
      const standing =
        p.vy >= 0 &&
        p.x + p.w > c.x + 3 &&
        p.x < c.x + c.w - 3 &&
        Math.abs(p.y + p.h - c.y) < 4
      if (c.state === 0 && standing) {
        c.state = 1
        c.timer = CRUMBLE_DELAY
      } else if (c.state === 1) {
        c.timer--
        if (c.timer <= 0) {
          c.state = 2
          c.timer = CRUMBLE_RESPAWN
          this.spawnParticles(c.x + c.w / 2, c.y + 6, 11, 'dust')
          this.sfx.crumble()
        }
      }
    }
  }

  /** Предохранители: снимают замок с выхода. */
  private updateFuses() {
    const p = this.player
    for (const fu of this.fuses) {
      if (fu.taken) continue
      const bobY = fu.y + Math.sin(this.frame * 0.05 + fu.phase) * 4
      if (circleRect(fu.x, bobY, 16, p)) {
        fu.taken = true
        this.fusesGot++
        this.score += SCORE_FUSE
        this.exit.locked = this.fusesGot < this.fusesTotal
        this.shake = 3
        this.spawnParticles(fu.x, bobY, 14, 'spark')
        this.sfx.unlock()
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
        this.damage(DMG_PHANTOM, p.x < f.x ? -1 : 1, 'phantom')
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
      if (h.kind === 'spikes') {
        const box = { x: h.x - 16, y: h.y - 20, w: 32, h: 20 }
        if (rectsOverlap(p, box)) {
          this.damage(DMG_SPIKES, p.x < h.x ? -1 : 1, 'spikes')
          this.spawnParticles(h.x, h.y - 10, 8, 'spark')
          break
        }
      } else if (circleRect(h.x, h.y - 14, 15, p)) {
        this.damage(DMG_SOCKET, p.x < h.x ? -1 : 1, 'socket')
        this.spawnParticles(h.x, h.y - 16, 12, 'spark')
        break
      }
    }
  }

  private updateExit() {
    const p = this.player
    const box = { x: this.exit.x, y: this.exit.y - 56, w: 36, h: 56 }
    if (!rectsOverlap(p, box)) return
    // Заперт: нужен предохранитель
    if (this.exit.locked) {
      if (this.frame % 55 === 0) {
        this.sfx.deny()
        this.spawnParticles(this.exit.x + 18, this.exit.y - 40, 4, 'spark')
      }
      return
    }
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
      fuses: this.fusesGot,
      fusesTotal: this.fusesTotal,
      score: this.score,
      time: Math.round(this.levelFrames / 60),
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

  private updateEnergy() {
    // Сложность растёт с номером уровня: энергия тает всё быстрее
    const mul = 1 + this.levelIndex * 0.05
    this.energy -=
      (DRAIN_BASE * mul + this.lampDrain() * (0.8 + mul * 0.2)) * STEP
    if (this.energy <= 0) {
      this.energy = 0
      this.deathCause = 'drain'
      this.sfx.lose()
      this.setPhase('gameover')
    }
  }

  private damage(amount: number, knockDir: number, cause: DeathCause) {
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
      this.deathCause = cause
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
