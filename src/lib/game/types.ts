// Общие типы игры «ЭнергоГерой».

export type Phase =
  | 'menu'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'complete'
  | 'gameover'
  | 'victory'

export interface Player {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  onGround: boolean
  coyote: number
  buffer: number
  facing: 1 | -1
  invuln: number
  anim: number
  blink: number
  squash: number
  safeX: number
  safeY: number
}

export interface BulbE {
  x: number
  y: number
  taken: boolean
  phase: number
}

export interface LampE {
  x: number // центр по x (px мира)
  y: number // центр плафона (px мира)
  group: number // 0 = A, 1 = B
  on: boolean
}

export interface SwitchE {
  x: number
  y: number
  group: number
  flipped: boolean
}

export interface HazardE {
  x: number
  y: number
  kind: 'socket' | 'spikes'
}

export interface ExitE {
  x: number
  y: number
  locked: boolean
}

export interface Vampire {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  minX: number
  maxX: number
  dead: boolean
  anim: number
  onGround: boolean
}

export interface Phantom {
  cx: number
  cy: number
  x: number
  y: number
  amp: number
  speed: number
  phase: number
  dead: boolean
}

export interface MovPlat {
  x: number
  y: number
  w: number
  h: number
  cx: number // база по x (ось X) или фикс. x (ось Y)
  by: number // база по y (ось Y) или фикс. y (ось X)
  amp: number
  speed: number
  phase: number
  dx: number // дельта за кадр (для переноски игрока)
  dy: number
  axis: 'x' | 'y'
}

/** Осыпающаяся плита. state: 0 целая, 1 трясётся, 2 разрушена. */
export interface CrumbE {
  x: number
  y: number
  w: number
  h: number
  state: 0 | 1 | 2
  timer: number
}

/** Предохранитель — открывает запертый выход. */
export interface FuseE {
  x: number
  y: number
  taken: boolean
  phase: number
}

/** Дрон-пылесос: летает и отскакивает от стен по диагонали. */
export interface DroneE {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  dead: boolean
  anim: number
  onGround: boolean
}

/** Гонец — быстрый наземный враг (та же физика, что у вампира). */
export type RunnerE = Vampire

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  kind: 'spark' | 'poof' | 'star' | 'dust'
  grav: number
}

export interface LevelResult {
  levelName: string
  energy: number
  bonus: number
  bulbs: number
  bulbsTotal: number
  switches: number
  switchesTotal: number
  fuses: number
  fusesTotal: number
  score: number
  /** Хронометраж уровня, секунды. */
  time: number
}

/** Откуда пришло финальное повреждение — для «акта об аварии». */
export type DeathCause =
  | 'vampire'
  | 'runner'
  | 'drone'
  | 'phantom'
  | 'socket'
  | 'spikes'
  | 'fall'
  | 'drain'

export interface RunSummary {
  score: number
  best: number
  bulbs: number
  bulbsTotal: number
  switches: number
  switchesTotal: number
  stars: number
}

export interface Snapshot {
  phase: Phase
  levelIndex: number
  levelName: string
  levelSubtitle: string
  hint: string
  badge?: string | null
  score: number
  energy: number
  result: LevelResult | null
  summary: RunSummary | null
  /** Номер текущей попытки уровня (1, 2, 3…). */
  attempt: number
  /** Причина обесточивания (заполняется на gameover). */
  deathCause: DeathCause | null
}

export interface GameCallbacks {
  onPhase: (snap: Snapshot) => void
}
