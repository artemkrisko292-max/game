'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronRight,
  DoorOpen,
  Ghost,
  Home,
  Lightbulb,
  Pause,
  Play,
  Plug,
  RotateCcw,
  Star,
  ToggleLeft,
  TriangleAlert,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { EnergoGame, VIEW_H, VIEW_W } from '@/lib/game/engine'
import type { Phase, Snapshot } from '@/lib/game/types'

const HOW_TO = [
  {
    icon: Lightbulb,
    title: 'Собирай лампочки',
    text: 'LED-лампочки дают +8 энергии и 50 очков',
  },
  {
    icon: ToggleLeft,
    title: 'Выключай свет',
    text: 'Дотяни до рубильника — лампы погаснут, +150 очков',
  },
  {
    icon: TriangleAlert,
    title: 'Шипы и обвалы',
    text: 'Ржавая арматура жалит, старые плиты осыпаются под ногами',
  },
  {
    icon: Plug,
    title: 'Ищи предохранители',
    text: 'Светящийся ключ открывает запертый щиток на выходе',
  },
  {
    icon: Ghost,
    title: 'Враги повсюду',
    text: 'Вампиры, Гонцы, Дроны и Фантомы пьют энергию. Прыгай на голову!',
  },
  {
    icon: DoorOpen,
    title: 'Беги к щитку',
    text: 'Шкала энергии тает всё быстрее с каждым уровнем!',
  },
]

export default function EnergoHeroGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<EnergoGame | null>(null)
  const [phase, setPhase] = useState<Phase>('menu')
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [muted, setMuted] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const [best, setBest] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = VIEW_W * dpr
    canvas.height = VIEW_H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const game = new EnergoGame(canvas, {
      onPhase: (s) => {
        setPhase(s.phase)
        setSnap(s)
        if (s.phase === 'victory') {
          try {
            setBest(Number(localStorage.getItem('energohero-best') ?? '0') || 0)
          } catch {
            /* ignore */
          }
        }
      },
    })
    gameRef.current = game
    // Отладочный хук (используется автотестами: __energo.loadLevel(n))
    ;(window as unknown as { __energo?: EnergoGame }).__energo = game

    // Отложенная инициализация некритичного UI-состояния (не блокирует эффект)
    const raf = requestAnimationFrame(() => {
      setIsTouch(
        window.matchMedia('(pointer: coarse)').matches ||
          'ontouchstart' in window ||
          window.innerWidth < 768,
      )
      try {
        setBest(Number(localStorage.getItem('energohero-best') ?? '0') || 0)
      } catch {
        /* ignore */
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      game.destroy()
      gameRef.current = null
    }
  }, [])

  const act = useCallback((action: 'start' | 'begin' | 'retry' | 'next' | 'menu' | 'pause') => {
    const g = gameRef.current
    if (!g) return
    switch (action) {
      case 'start':
        g.startRun()
        break
      case 'begin':
        g.beginLevel()
        break
      case 'retry':
        g.retryLevel()
        break
      case 'next':
        g.nextLevel()
        break
      case 'menu':
        g.toMenu()
        break
      case 'pause':
        g.togglePause()
        break
    }
  }, [])

  // Enter — основное действие на оверлеях
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'NumpadEnter' && e.key !== 'Enter')
        return
      if (phase === 'menu') act('start')
      else if (phase === 'intro') act('begin')
      else if (phase === 'complete') act('next')
      else if (phase === 'gameover') act('retry')
      else if (phase === 'victory') act('start')
      else if (phase === 'paused') act('pause')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, act])

  const hold = useCallback(
    (k: 'left' | 'right' | 'jump') => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault()
        gameRef.current?.setTouch(k, true)
      },
      onPointerUp: () => gameRef.current?.setTouch(k, false),
      onPointerLeave: () => gameRef.current?.setTouch(k, false),
      onPointerCancel: () => gameRef.current?.setTouch(k, false),
    }),
    [],
  )

  const toggleMute = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    g.sfx.muted = !g.sfx.muted
    setMuted(g.sfx.muted)
  }, [])

  return (
    <div className="min-h-screen w-full bg-[#0b120c] bg-[radial-gradient(ellipse_at_top,#142417_0%,#0b120c_60%)] text-emerald-50 flex flex-col items-center justify-center gap-3 p-2 sm:p-4">
      <header className="flex items-center gap-2 select-none sm:hidden">
        <Zap className="h-5 w-5 text-amber-300" />
        <h1 className="text-lg font-black tracking-widest text-emerald-300">
          ЭНЕРГОГЕРОЙ
        </h1>
      </header>

      <main className="w-full max-w-[1080px]">
        <div className="relative aspect-[16/9] max-md:aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 border-emerald-950 bg-[#0b120c] shadow-[0_0_60px_rgba(52,168,83,0.15)] sm:border-4">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full object-contain"
            aria-label="Игровое поле ЭнергоГероя"
          />

          {/* Кнопки звука и паузы */}
          <div className="absolute right-2 top-2 z-20 flex gap-1.5">
            <button
              onClick={toggleMute}
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition hover:bg-black/65"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            {(phase === 'playing' || phase === 'paused') && (
              <button
                onClick={() => act('pause')}
                aria-label="Пауза"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition hover:bg-black/65"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ---------- Оверлеи ---------- */}
          {phase === 'menu' && (
            <Overlay>
              <Panel>
                <div className="flex items-center justify-center gap-3">
                  <Lightbulb className="ah-float h-8 w-8 text-amber-300 sm:h-10 sm:w-10" />
                  <h1 className="text-3xl font-black tracking-wider text-emerald-300 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] sm:text-5xl">
                    ЭНЕРГОГЕРОЙ
                  </h1>
                  <Zap className="ah-float h-8 w-8 text-amber-300 sm:h-10 sm:w-10" />
                </div>
                <p className="mx-auto mt-3 max-w-xl text-sm text-emerald-100/80 sm:text-base">
                  Ты — <b>Вжик</b>, храбрая лампочка в плаще. В доме
                  разбушевались ЭнергоВампиры, Гонцы и Дроны-пылесосы, а лишний
                  свет жрёт энергию. 20 уровней — и каждый злее предыдущего!
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-left sm:gap-3 lg:grid-cols-3">
                  {HOW_TO.map((h, i) => (
                    <div
                      key={h.title}
                      className="ah-pop relative rounded-lg border-2 border-emerald-900/80 bg-black/40 p-2.5 sm:p-3"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <h.icon className="mb-1.5 h-5 w-5 text-emerald-400" />
                      <div className="text-[13px] font-black uppercase tracking-wide leading-tight text-emerald-100">
                        {h.title}
                      </div>
                      <div className="mt-1 text-[11px] leading-snug text-emerald-200/60">
                        {h.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-col items-center gap-3">
                  <ArcadeButton onClick={() => act('start')} size="lg">
                    <Play className="h-5 w-5" /> ИГРАТЬ
                  </ArcadeButton>
                  {!isTouch && (
                    <p className="text-xs text-emerald-200/50">
                      ← → или A D — движение · Space / ↑ — прыжок · P — пауза ·
                      прыгай врагам на голову
                    </p>
                  )}
                  {best > 0 && (
                    <p className="flex items-center gap-1 text-xs font-bold text-amber-300/90">
                      <Star className="h-3.5 w-3.5 fill-amber-300" /> Рекорд:{' '}
                      {best}
                    </p>
                  )}
                </div>
              </Panel>
            </Overlay>
          )}

          {phase === 'intro' && snap && (
            <Overlay>
              <Panel>
                {snap.badge && (
                  <div className="mb-3 flex justify-center">
                    <span className="ah-stamp inline-block -rotate-2 rounded-md border-[3px] border-amber-400 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-amber-300">
                      {snap.badge}
                    </span>
                  </div>
                )}
                <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-500">
                  {snap.levelSubtitle}
                </p>
                <h2 className="mt-1 text-4xl font-black text-white sm:text-5xl">
                  {snap.levelName}
                </h2>
                <div className="mx-auto mt-4 max-w-xl rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4 text-left">
                  <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-100/90 sm:text-[15px]">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <span>{snap.hint}</span>
                  </p>
                </div>
                <div className="mt-5">
                  <ArcadeButton onClick={() => act('begin')} size="lg">
                    В БОЙ! <ChevronRight className="h-5 w-5" />
                  </ArcadeButton>
                </div>
              </Panel>
            </Overlay>
          )}

          {phase === 'paused' && (
            <Overlay>
              <Panel>
                <h2 className="text-3xl font-black tracking-[0.3em] text-white">
                  ПАУЗА
                </h2>
                <p className="mt-2 text-sm text-emerald-200/70">
                  Свет подождёт. Но недолго
                  <span className="ah-blink ml-1 inline-block h-4 w-2 translate-y-0.5 bg-emerald-300" />
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <ArcadeButton onClick={() => act('pause')}>
                    <Play className="h-4 w-4" /> Продолжить
                  </ArcadeButton>
                  <ArcadeButton tone="ghost" onClick={() => act('menu')}>
                    <Home className="h-4 w-4" /> В меню
                  </ArcadeButton>
                </div>
              </Panel>
            </Overlay>
          )}

          {phase === 'complete' && snap?.result && (
            <Overlay>
              <Panel>
                <div className="flex justify-center">
                  <span className="ah-stamp inline-block -rotate-2 rounded-md border-[3px] border-emerald-400 px-4 py-1 text-base font-black uppercase tracking-[0.25em] text-emerald-300 sm:text-lg">
                    Уровень зачищен
                  </span>
                </div>
                <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                  {snap.result.levelName} спасена!
                </h2>

                {/* Прогресс забега: 20 точек */}
                <LevelDots current={snap.levelIndex} />

                <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2 sm:gap-3">
                  <Tally
                    icon={Zap}
                    label="Энергия"
                    value={`${snap.result.energy}%`}
                    pct={snap.result.energy / 100}
                    delay={120}
                  />
                  <Tally
                    icon={Star}
                    label="Бонус"
                    value={`+${snap.result.bonus}`}
                    delay={180}
                  />
                  <Tally
                    icon={Lightbulb}
                    label="Лампочки"
                    value={`${snap.result.bulbs}/${snap.result.bulbsTotal}`}
                    pct={
                      snap.result.bulbsTotal > 0
                        ? snap.result.bulbs / snap.result.bulbsTotal
                        : 1
                    }
                    delay={240}
                  />
                  <Tally
                    icon={ToggleLeft}
                    label="Рубильники"
                    value={`${snap.result.switches}/${snap.result.switchesTotal}`}
                    pct={
                      snap.result.switchesTotal > 0
                        ? snap.result.switches / snap.result.switchesTotal
                        : 1
                    }
                    delay={300}
                  />
                  {snap.result.fusesTotal > 0 && (
                    <div className="col-span-2">
                      <Tally
                        icon={Plug}
                        label="Предохранители"
                        value={`${snap.result.fuses}/${snap.result.fusesTotal}`}
                        pct={
                          snap.result.fusesTotal > 0
                            ? snap.result.fuses / snap.result.fusesTotal
                            : 1
                        }
                        delay={340}
                      />
                    </div>
                  )}
                </div>
                <p className="mt-4 text-2xl font-black text-amber-300">
                  <ScoreCount value={snap.result.score} />{' '}
                  <span className="text-sm tracking-widest text-amber-200/60">
                    ОЧКОВ
                  </span>
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <ArcadeButton onClick={() => act('next')} size="lg">
                    ДАЛЬШЕ <ChevronRight className="h-5 w-5" />
                  </ArcadeButton>
                  <ArcadeButton tone="ghost" onClick={() => act('menu')}>
                    <Home className="h-4 w-4" /> В меню
                  </ArcadeButton>
                </div>
              </Panel>
            </Overlay>
          )}

          {phase === 'gameover' && (
            <Overlay>
              <Panel tone="danger">
                <div className="ah-stripes h-3 w-full rounded-sm bg-[repeating-linear-gradient(45deg,#fb7185_0_14px,#1c0a0e_14px_28px)]" />
                <Ghost className="mx-auto mt-4 h-14 w-14 text-rose-300" />
                <h2 className="mt-3 text-3xl font-black tracking-wide text-white sm:text-4xl">
                  ЭНЕРГИЯ НА НУЛЕ
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-rose-100/75">
                  Вампиры и Гонцы высосали всё электричество. Собирай лампочки,
                  выключай свет и не наступай на шипы!
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <ArcadeButton onClick={() => act('retry')}>
                    <RotateCcw className="h-4 w-4" /> Ещё раз
                  </ArcadeButton>
                  <ArcadeButton tone="ghost" onClick={() => act('menu')}>
                    <Home className="h-4 w-4" /> В меню
                  </ArcadeButton>
                </div>
              </Panel>
            </Overlay>
          )}

          {phase === 'victory' && snap?.summary && (
            <Overlay>
              <Panel tone="gold">
                <div className="flex justify-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <Star
                      key={i}
                      className={`ah-pop h-10 w-10 sm:h-12 sm:w-12 ${
                        i < snap.summary!.stars
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.7)]'
                          : 'text-emerald-900'
                      }`}
                      style={{ animationDelay: `${200 + i * 220}ms` }}
                    />
                  ))}
                </div>
                <h2 className="mt-3 text-4xl font-black tracking-wide text-amber-300 sm:text-5xl">
                  ДОМ СПАСЁН!
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-amber-100/80">
                  Все лампы выключены, вампиры разгромлены, предохранители на
                  месте. Настоящий ЭнергоГерой экономит свет и в жизни!
                </p>
                <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 sm:gap-3">
                  <Tally
                    icon={Star}
                    label="Очки"
                    value={String(snap.summary.score)}
                    delay={150}
                  />
                  <Tally
                    icon={Zap}
                    label="Рекорд"
                    value={String(snap.summary.best)}
                    delay={210}
                  />
                  <Tally
                    icon={Lightbulb}
                    label="Лампочки"
                    value={`${snap.summary.bulbs}/${snap.summary.bulbsTotal}`}
                    pct={
                      snap.summary.bulbsTotal > 0
                        ? snap.summary.bulbs / snap.summary.bulbsTotal
                        : 1
                    }
                    delay={270}
                  />
                  <Tally
                    icon={ToggleLeft}
                    label="Рубильники"
                    value={`${snap.summary.switches}/${snap.summary.switchesTotal}`}
                    pct={
                      snap.summary.switchesTotal > 0
                        ? snap.summary.switches / snap.summary.switchesTotal
                        : 1
                    }
                    delay={330}
                  />
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <ArcadeButton onClick={() => act('start')}>
                    <RotateCcw className="h-4 w-4" /> Играть снова
                  </ArcadeButton>
                  <ArcadeButton tone="ghost" onClick={() => act('menu')}>
                    <Home className="h-4 w-4" /> В меню
                  </ArcadeButton>
                </div>
              </Panel>
            </Overlay>
          )}

          {/* Экран «запертого щитка» отрисован прямо на канвасе */}
        </div>

        {/* ---------- Сенсорное управление ---------- */}
        {isTouch && (
          <div className="mt-3 flex w-full select-none items-center justify-between gap-4 px-2">
            <div className="flex gap-3">
              <TouchBtn label="←" {...hold('left')} />
              <TouchBtn label="→" {...hold('right')} />
            </div>
            <TouchBtn label="ПРЫЖОК" wide {...hold('jump')} />
          </div>
        )}
      </main>

      <footer className="mt-auto pb-2 text-center text-[11px] text-emerald-200/40 select-none">
        ЭнергоГерой · 2D-платформер про энергосбережение · берегите энергию IRL
      </footer>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex overflow-y-auto bg-[#050a06]/70 p-3 backdrop-blur-[3px]">
      <div className="m-auto w-full max-w-2xl py-2 text-center">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Кастомные элементы интерфейса (в стиле «энергетического терминала») */
/* ------------------------------------------------------------------ */

const PANEL_TONES = {
  green:
    'border-emerald-700/90 bg-[#07130a]/95 shadow-[0_18px_50px_rgba(0,0,0,0.6)]',
  danger:
    'border-rose-800/90 bg-[#160a0c]/95 shadow-[0_18px_50px_rgba(0,0,0,0.6)]',
  gold: 'border-amber-500/80 bg-[#171004]/95 shadow-[0_18px_50px_rgba(0,0,0,0.6)]',
} as const

function Panel({
  children,
  tone = 'green',
}: {
  children: React.ReactNode
  tone?: keyof typeof PANEL_TONES
}) {
  return (
    <div
      className={`ah-pop relative rounded-2xl border-[3px] p-1.5 ${PANEL_TONES[tone]}`}
    >
      {/* Заклёпки по углам */}
      <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-400/70" />
      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-400/70" />
      <span className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-amber-400/70" />
      <span className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-amber-400/70" />
      <div className="rounded-xl border-2 border-dashed border-white/10 px-4 py-5 sm:px-7 sm:py-6">
        {children}
      </div>
    </div>
  )
}

const BTN_TONES = {
  primary:
    'border-emerald-950 bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950 shadow-[0_5px_0_#022c22] hover:brightness-110 active:shadow-[0_1px_0_#022c22]',
  ghost:
    'border-emerald-800 bg-emerald-950/70 text-emerald-200 shadow-[0_5px_0_rgba(0,0,0,0.55)] hover:bg-emerald-900/80 active:shadow-[0_1px_0_rgba(0,0,0,0.55)]',
} as const

function ArcadeButton({
  children,
  onClick,
  tone = 'primary',
  size = 'md',
}: {
  children: React.ReactNode
  onClick: () => void
  tone?: keyof typeof BTN_TONES
  size?: 'md' | 'lg'
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-lg border-2 font-black uppercase tracking-wider transition-all duration-75 active:translate-y-[4px] ${
        BTN_TONES[tone]
      } ${size === 'lg' ? 'h-12 px-9 text-lg' : 'h-11 px-6 text-sm'}`}
    >
      {/* Блик, пробегающий при наведении */}
      <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -translate-x-[160%] skew-x-[-18deg] bg-white/25 transition-transform duration-500 group-hover:translate-x-[420%]" />
      {children}
    </button>
  )
}

function Tally({
  icon: Icon,
  label,
  value,
  pct,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  pct?: number
  delay?: number
}) {
  return (
    <div
      className="ah-pop flex items-center gap-2.5 rounded-lg border-2 border-emerald-900/80 bg-black/40 px-3 py-2 text-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className="h-5 w-5 shrink-0 text-emerald-400" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/60">
          {label}
        </div>
        <div className="truncate text-base font-black text-white">{value}</div>
        {pct !== undefined && (
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-emerald-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-300 transition-[width] duration-700"
              style={{ width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function LevelDots({ current }: { current: number }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          title={`Уровень ${i + 1}`}
          className={`h-2.5 rounded-full transition-all ${
            i === current
              ? 'ah-pop w-6 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
              : i < current
                ? 'w-2.5 bg-emerald-500'
                : 'w-2.5 bg-emerald-950 ring-1 ring-emerald-900'
          }`}
        />
      ))}
    </div>
  )
}

/** Плавный счётчик очков. */
function ScoreCount({ value }: { value: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const dur = 700
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur)
      setV(Math.round(value * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{v}</>
}

function TouchBtn({
  label,
  wide,
  ...handlers
}: {
  label: string
  wide?: boolean
} & React.ComponentProps<'button'>) {
  return (
    <button
      {...handlers}
      className={`touch-none select-none rounded-2xl border-2 border-emerald-800/80 bg-emerald-900/50 font-black text-emerald-100 shadow-inner active:bg-emerald-600/60 ${
        wide ? 'h-16 px-10 text-lg' : 'h-16 w-20 text-2xl'
      }`}
    >
      {label}
    </button>
  )
}
