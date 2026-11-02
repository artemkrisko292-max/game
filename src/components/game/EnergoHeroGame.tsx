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
  RotateCcw,
  Star,
  ToggleLeft,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    text: 'Прыгни до рубильника — лампы погаснут, +150 очков',
  },
  {
    icon: Ghost,
    title: 'Беги от врагов',
    text: 'Вампиры и Фантомы высасывают энергию. Прыгай им на голову!',
  },
  {
    icon: DoorOpen,
    title: 'Добеги до щитка',
    text: 'Пока шкала энергии не опустела — она тает постоянно!',
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
              <div className="flex items-center justify-center gap-3">
                <Lightbulb className="h-9 w-9 text-amber-300 sm:h-12 sm:w-12" />
                <h1 className="text-4xl font-black tracking-wider text-emerald-300 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] sm:text-6xl">
                  ЭНЕРГОГЕРОЙ
                </h1>
                <Zap className="h-9 w-9 text-amber-300 sm:h-12 sm:w-12" />
              </div>
              <p className="mx-auto mt-3 max-w-xl text-sm text-emerald-100/80 sm:text-base">
                Ты — <b>Вжик</b>, храбрая светодиодная лампочка. В доме
                разбушевались ЭнергоВампиры и везде горит лишний свет. Верни
                дому зелёный баланс за 20 уровней!
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-left sm:mt-5 sm:gap-3 lg:grid-cols-4">
                {HOW_TO.map((h) => (
                  <div
                    key={h.title}
                    className="rounded-xl border border-emerald-900/70 bg-black/35 p-2.5 sm:p-3"
                  >
                    <h.icon className="mb-1.5 h-5 w-5 text-emerald-400" />
                    <div className="text-[13px] font-bold leading-tight text-emerald-100">
                      {h.title}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-emerald-200/60">
                      {h.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col items-center gap-2 sm:mt-5">
                <Button
                  onClick={() => act('start')}
                  size="lg"
                  className="h-12 rounded-full bg-emerald-500 px-10 text-lg font-black text-emerald-950 shadow-[0_0_30px_rgba(52,211,153,0.4)] hover:bg-emerald-400"
                >
                  <Play className="mr-2 h-5 w-5" /> ИГРАТЬ
                </Button>
                {!isTouch && (
                  <p className="text-xs text-emerald-200/50">
                    ← → или A D — движение · Space / ↑ — прыжок · P — пауза ·
                    прыгай врагам на голову
                  </p>
                )}
                {best > 0 && (
                  <p className="flex items-center gap-1 text-xs font-bold text-amber-300/90">
                    <Star className="h-3.5 w-3.5 fill-amber-300" /> Рекорд: {best}
                  </p>
                )}
              </div>
            </Overlay>
          )}

          {phase === 'intro' && snap && (
            <Overlay>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-400">
                {snap.levelSubtitle}
              </p>
              <h2 className="mt-1 text-4xl font-black text-white sm:text-5xl">
                {snap.levelName}
              </h2>
              <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="flex items-start gap-2 text-left text-sm leading-relaxed text-amber-100/90 sm:text-[15px]">
                  <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <span>{snap.hint}</span>
                </p>
              </div>
              <Button
                onClick={() => act('begin')}
                size="lg"
                className="mt-6 h-12 rounded-full bg-emerald-500 px-10 text-lg font-black text-emerald-950 hover:bg-emerald-400"
              >
                ВПЕРЁД! <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </Overlay>
          )}

          {phase === 'paused' && (
            <Overlay>
              <h2 className="text-4xl font-black text-white">ПАУЗА</h2>
              <p className="mt-2 text-sm text-emerald-200/70">
                Свет подождёт. Но недолго!
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => act('pause')}
                  className="h-11 rounded-full bg-emerald-500 px-8 font-black text-emerald-950 hover:bg-emerald-400"
                >
                  <Play className="mr-2 h-4 w-4" /> Продолжить
                </Button>
                <Button
                  onClick={() => act('menu')}
                  variant="outline"
                  className="h-11 rounded-full border-emerald-800 bg-transparent px-6 font-bold text-emerald-200 hover:bg-emerald-950 hover:text-emerald-100"
                >
                  <Home className="mr-2 h-4 w-4" /> В меню
                </Button>
              </div>
            </Overlay>
          )}

          {phase === 'complete' && snap?.result && (
            <Overlay>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-400">
                Уровень пройден
              </p>
              <h2 className="mt-1 text-4xl font-black text-white sm:text-5xl">
                {snap.result.levelName} спасена!
              </h2>
              <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 sm:gap-3">
                <Stat icon={Zap} label="Энергия" value={`${snap.result.energy}%`} />
                <Stat icon={Star} label="Бонус" value={`+${snap.result.bonus}`} />
                <Stat
                  icon={Lightbulb}
                  label="Лампочки"
                  value={`${snap.result.bulbs}/${snap.result.bulbsTotal}`}
                />
                <Stat
                  icon={ToggleLeft}
                  label="Рубильники"
                  value={`${snap.result.switches}/${snap.result.switchesTotal}`}
                />
              </div>
              <p className="mt-4 text-lg font-black text-amber-300">
                Очки: {snap.result.score}
              </p>
              <Button
                onClick={() => act('next')}
                size="lg"
                className="mt-5 h-12 rounded-full bg-emerald-500 px-10 text-lg font-black text-emerald-950 hover:bg-emerald-400"
              >
                ДАЛЬШЕ <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </Overlay>
          )}

          {phase === 'gameover' && (
            <Overlay>
              <Ghost className="mx-auto h-14 w-14 text-purple-300" />
              <h2 className="mt-3 text-4xl font-black text-white">
                Энергия кончилась!
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-emerald-100/75">
                Вампиры высосали всё электричество. Не сдавайся: собирай
                лампочки и выключай свет быстрее!
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => act('retry')}
                  className="h-11 rounded-full bg-emerald-500 px-8 font-black text-emerald-950 hover:bg-emerald-400"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Ещё раз
                </Button>
                <Button
                  onClick={() => act('menu')}
                  variant="outline"
                  className="h-11 rounded-full border-emerald-800 bg-transparent px-6 font-bold text-emerald-200 hover:bg-emerald-950 hover:text-emerald-100"
                >
                  <Home className="mr-2 h-4 w-4" /> В меню
                </Button>
              </div>
            </Overlay>
          )}

          {phase === 'victory' && snap?.summary && (
            <Overlay>
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    className={`h-10 w-10 sm:h-12 sm:w-12 ${
                      i < snap.summary!.stars
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                        : 'text-emerald-900'
                    }`}
                  />
                ))}
              </div>
              <h2 className="mt-3 text-4xl font-black text-emerald-300 sm:text-5xl">
                Дом спасён!
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-emerald-100/80">
                Все лампы выключены, вампиры разгромлены. Настоящий
                ЭнергоГерой экономит свет и в жизни!
              </p>
              <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 sm:gap-3">
                <Stat icon={Star} label="Очки" value={String(snap.summary.score)} />
                <Stat icon={Zap} label="Рекорд" value={String(snap.summary.best)} />
                <Stat
                  icon={Lightbulb}
                  label="Лампочки"
                  value={`${snap.summary.bulbs}/${snap.summary.bulbsTotal}`}
                />
                <Stat
                  icon={ToggleLeft}
                  label="Рубильники"
                  value={`${snap.summary.switches}/${snap.summary.switchesTotal}`}
                />
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => act('start')}
                  className="h-11 rounded-full bg-emerald-500 px-8 font-black text-emerald-950 hover:bg-emerald-400"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Играть снова
                </Button>
                <Button
                  onClick={() => act('menu')}
                  variant="outline"
                  className="h-11 rounded-full border-emerald-800 bg-transparent px-6 font-bold text-emerald-200 hover:bg-emerald-950 hover:text-emerald-100"
                >
                  <Home className="mr-2 h-4 w-4" /> В меню
                </Button>
              </div>
            </Overlay>
          )}
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
    <div className="absolute inset-0 z-10 flex overflow-y-auto bg-[#050a06]/72 p-4 backdrop-blur-[3px]">
      <div className="m-auto w-full max-w-2xl py-2 text-center">{children}</div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-900/70 bg-black/35 px-3 py-2.5 text-left">
      <Icon className="h-5 w-5 shrink-0 text-emerald-400" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-emerald-200/60">
          {label}
        </div>
        <div className="truncate text-base font-black text-white">{value}</div>
      </div>
    </div>
  )
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
      className={`touch-none select-none rounded-2xl border border-emerald-800/80 bg-emerald-900/50 font-black text-emerald-100 shadow-inner active:bg-emerald-600/60 ${
        wide ? 'h-16 px-10 text-lg' : 'h-16 w-20 text-2xl'
      }`}
    >
      {label}
    </button>
  )
}
