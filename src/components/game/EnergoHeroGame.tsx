'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpenCheck,
  ChevronRight,
  DoorOpen,
  Ghost,
  Home,
  Lightbulb,
  Lock,
  Map,
  Music2,
  Pause,
  Play,
  Plug,
  RotateCcw,
  Scroll,
  Star,
  ToggleLeft,
  TriangleAlert,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Cutscene } from '@/components/game/Cutscene'
import { EnergoGame, VIEW_H, VIEW_W } from '@/lib/game/engine'
import { LEVELS } from '@/lib/game/levels'
import type { ThemeName } from '@/lib/game/levels'
import { Music } from '@/lib/game/music'
import {
  CHAPTER_AT,
  STORY,
  STORY_ORDER,
  loadSeenScenes,
  saveSeenScenes,
} from '@/lib/game/story'
import type { LevelResult, Phase, RunSummary, Snapshot } from '@/lib/game/types'

/* ------------------------------------------------------------------ */
/* Служебные данные и утилиты                                          */
/* ------------------------------------------------------------------ */

const PROGRESS_KEY = 'energohero-progress-v1'
const PREF_MUSIC = 'energohero-music'
const PREF_SFX = 'energohero-sfx'

interface Progress {
  unlocked: number // сколько уровней открыто (1…20)
  stars: number[]
  best: number[]
}

const EMPTY_PROGRESS: Progress = {
  unlocked: 1,
  stars: Array(LEVELS.length).fill(0),
  best: Array(LEVELS.length).fill(0),
}

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return EMPTY_PROGRESS
    const p = JSON.parse(raw) as Partial<Progress>
    const stars = Array(LEVELS.length).fill(0)
    const best = Array(LEVELS.length).fill(0)
    ;(p.stars ?? []).forEach((v, i) => (stars[i] = Number(v) || 0))
    ;(p.best ?? []).forEach((v, i) => (best[i] = Number(v) || 0))
    return {
      unlocked: Math.min(LEVELS.length, Math.max(1, Number(p.unlocked) || 1)),
      stars,
      best,
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

function starsFromResult(r: LevelResult): number {
  const got = r.bulbs + r.switches + r.fuses
  const tot = r.bulbsTotal + r.switchesTotal + r.fusesTotal
  const pct = tot > 0 ? got / tot : 1
  return pct >= 0.9 ? 3 : pct >= 0.55 ? 2 : 1
}

function saveLevelProgress(
  levelIndex: number,
  result: LevelResult | null,
  summary?: RunSummary | null,
) {
  try {
    const p = loadProgress()
    const stars = result ? starsFromResult(result) : (summary?.stars ?? 1)
    const score = result ? result.score : (summary?.score ?? 0)
    p.stars[levelIndex] = Math.max(p.stars[levelIndex] ?? 0, stars)
    p.best[levelIndex] = Math.max(p.best[levelIndex] ?? 0, score)
    p.unlocked = Math.min(
      LEVELS.length,
      Math.max(p.unlocked, levelIndex + 2),
    )
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
  } catch {
    /* localStorage недоступен */
  }
}

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const countCh = (map: string[], chars: string) =>
  map.join('').split('').filter((c) => chars.includes(c)).length

const DISTRICT: Record<ThemeName, string> = {
  bedroom: 'Жилой сектор',
  kitchen: 'Кухонный узел',
  basement: 'Подвальный ярус',
  living: 'Гостиная зона',
  attic: 'Чердачный пролёт',
  office: 'Домашний кабинет',
}

/** Причина аварии → строка акта и совет. */
const CAUSES: Record<string, { title: string; tip: string }> = {
  drain: {
    title: 'Сеть обесточена: заряд исчерпан',
    tip: 'Заряд тает очень быстро: не стой на месте, собирай LED-лампочки и гаси лишний свет рубильниками — под лампами расход чудовищный.',
  },
  vampire: {
    title: 'ЭнергоВампир высосал заряд',
    tip: 'Вампиры медлительные: запрыгивай им на голову — это мгновенно отключает их.',
  },
  runner: {
    title: 'Гонец сбил с ног на полном ходу',
    tip: 'Гонцы быстрые, но не поворачивают: встречай прыжком сверху или переживи их на платформе.',
  },
  drone: {
    title: 'Дрон-пылесос всосал энергию',
    tip: 'Дроны летают по диагонали и отскакивают от стен — засеки траекторию и топчи сверху.',
  },
  phantom: {
    title: 'Фантомная нагрузка ударила током',
    tip: 'Фантомы ходят по кругу сквозь стены — проследи цикл и проскочи за спиной.',
  },
  socket: {
    title: 'Короткое замыкание в розетке',
    tip: 'Искрящиеся розетки бьют при касании — обходи их верхом или по платформам.',
  },
  spikes: {
    title: 'Укол о ржавую арматуру',
    tip: 'Шипы ниже, чем кажутся: обычный прыжок перекрывает их с запасом. Не наступай — перелетай.',
  },
  fall: {
    title: 'Падение в люк',
    tip: 'У края люка жми прыжок заранее: короткое койот-время ещё спасает на самом краю.',
  },
}

const HOW_TO = [
  {
    icon: Lightbulb,
    title: 'Собирай LED-лампочки',
    text: 'Каждая даёт +10 энергии и 50 очков — без них заряд тает на глазах. Светодиодка тратит на 85% меньше лампы накаливания.',
  },
  {
    icon: ToggleLeft,
    title: 'Включи все рубильники',
    text: 'Каждый выключает группу ламп и прекращает слив энергии. Щиток на выходе откроется, только когда переведены ВСЕ рубильники и вставлены предохранители.',
  },
  {
    icon: TriangleAlert,
    title: 'Береги себя',
    text: 'Шипы, розетки и обвалы отнимают заряд. Враги бьют больнее — топчи их сверху.',
  },
  {
    icon: Plug,
    title: 'Ищи предохранители',
    text: 'Керамический ключ снимает замок со щитка на выходе. Без него — ни шагу дальше.',
  },
  {
    icon: Ghost,
    title: 'Знай врага в лицо',
    text: 'Вампир ходит, Гонец бежит, Дрон летает, Фантом парит сквозь стены. У каждого — свой цикл.',
  },
  {
    icon: DoorOpen,
    title: 'Успей к щитку',
    text: 'Энергия тает стремительно и с каждым уровнем всё быстрее. Стоять на месте — роскошь: беги, собирай и гаси свет.',
  },
]

/* ------------------------------------------------------------------ */
/* Фирменный знак: гексагон с молнией                                  */
/* ------------------------------------------------------------------ */

function Emblem({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 52" className={className} aria-hidden="true">
      <path
        d="M24 2 44 13v26L24 50 4 39V13Z"
        fill="#221e17"
        stroke="#ffd23f"
        strokeWidth="2.5"
      />
      <path
        d="M27.5 12 15 28.5h7L19.5 40 33 23h-7.5L27.5 12Z"
        fill="#ffd23f"
        stroke="#221e17"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* ГЛАВНЫЙ КОМПОНЕНТ                                                   */
/* ------------------------------------------------------------------ */

export default function EnergoHeroGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<EnergoGame | null>(null)
  const musicRef = useRef<Music | null>(null)
  const [phase, setPhase] = useState<Phase>('menu')
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [musicOn, setMusicOn] = useState(true)
  const [sfxOn, setSfxOn] = useState(true)
  // Зеркала состояния для обработчиков — клики всегда применяют
  // актуальное значение, даже если React-состояние ещё не подъехало.
  const musicOnRef = useRef(true)
  const sfxOnRef = useRef(true)
  const [isTouch, setIsTouch] = useState(false)
  const [best, setBest] = useState(0)
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
  const [menuView, setMenuView] = useState<
    'main' | 'levels' | 'howto' | 'story'
  >('main')
  // ---------- Сюжет: катсцены ----------
  const [cutscene, setCutscene] = useState<(typeof STORY)[string] | null>(null)
  const [seenScenes, setSeenScenes] = useState<Set<string>>(new Set())
  const seenRef = useRef<Set<string>>(new Set())
  // Главы, показанные в ТЕКУЩЕЙ смене: глушат повтор только до конца забега,
  // а не навсегда (иначе после первой смены сюжет молча пропадает).
  const runSeenRef = useRef<Set<string>>(new Set())
  const afterSceneRef = useRef<(() => void) | null>(null)

  /** Показать главу хроники; повторно в рамках смены — только по запросу (force). */
  const playScene = useCallback(
    (id: string, after: () => void, force = false) => {
      if (!STORY[id]) {
        after()
        return
      }
      if (!force && runSeenRef.current.has(id)) {
        after()
        return
      }
      runSeenRef.current.add(id)
      seenRef.current.add(id) // в хронике глава остаётся найденной навсегда
      saveSeenScenes(seenRef.current)
      setSeenScenes(new Set(seenRef.current))
      afterSceneRef.current = after
      setCutscene(STORY[id])
    },
    [],
  )

  const finishCutscene = useCallback(() => {
    const after = afterSceneRef.current
    afterSceneRef.current = null
    setCutscene(null)
    after?.()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = VIEW_W * dpr
    canvas.height = VIEW_H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const music = new Music()
    musicRef.current = music

    // Настройки звука читаем синхронно — иконки и реальное состояние
    // совпадают с первого кадра, без окна рассинхрона.
    let mOn = true
    let sOn = true
    try {
      mOn = localStorage.getItem(PREF_MUSIC) !== 'off'
      sOn = localStorage.getItem(PREF_SFX) !== 'off'
    } catch {
      /* ignore */
    }
    music.enabled = mOn
    // Рефы синхронно: логика toggles верна с первого же клика.
    // Состояние иконок подтянем в rAF-коллбэке (см. ниже).
    musicOnRef.current = mOn
    sfxOnRef.current = sOn

    const game = new EnergoGame(canvas, {
      onPhase: (s) => {
        setPhase(s.phase)
        setSnap(s)
        if (s.phase === 'menu' || s.phase === 'intro') {
          if (music.enabled) music.start()
          music.setDuck(0.55)
        } else if (s.phase === 'playing') {
          music.setDuck(1)
        } else if (s.phase === 'paused' || s.phase === 'complete') {
          music.setDuck(0.3)
        } else if (s.phase === 'gameover') {
          music.stop()
        } else if (s.phase === 'victory') {
          // Финал: тема возвращается победным маршем под салют
          if (music.enabled) music.start()
          music.setDuck(0.5)
        }
        if (s.phase === 'complete' && s.result) {
          saveLevelProgress(s.levelIndex, s.result)
          setProgress(loadProgress())
        }
        if (s.phase === 'victory' && s.summary) {
          saveLevelProgress(s.levelIndex, null, s.summary)
          setProgress(loadProgress())
          try {
            setBest(
              Number(localStorage.getItem('energohero-best') ?? '0') || 0,
            )
          } catch {
            /* ignore */
          }
          // Финал: эпилог хроники поверх отчёта — всегда, это конец игры
          playScene('epilogue', () => {}, true)
        }
      },
    })
    game.sfx.muted = !sOn
    gameRef.current = game
    // Отладочные хуки (используются автотестами)
    ;(window as unknown as { __energo?: EnergoGame }).__energo = game
    ;(window as unknown as { __energoMusic?: Music }).__energoMusic = music

    // Отложенная инициализация некритичного UI-состояния
    const raf = requestAnimationFrame(() => {
      setIsTouch(
        window.matchMedia('(pointer: coarse)').matches ||
          'ontouchstart' in window ||
          window.innerWidth < 768,
      )
      setProgress(loadProgress())
      setMusicOn(musicOnRef.current)
      setSfxOn(sfxOnRef.current)
      const seen = loadSeenScenes()
      seenRef.current = seen
      setSeenScenes(new Set(seen))
      try {
        setBest(Number(localStorage.getItem('energohero-best') ?? '0') || 0)
      } catch {
        /* ignore */
      }
    })

    // Музыка стартует после первого жеста пользователя (политика автоплея).
    // wake() продублирован внутри Music — там же самолечение suspended.
    const kick = () => {
      music.wake()
      if (music.enabled) music.start()
    }
    window.addEventListener('pointerdown', kick, { once: true })
    window.addEventListener('keydown', kick, { once: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
      music.destroy()
      game.destroy()
      gameRef.current = null
      musicRef.current = null
    }
  }, [playScene])

  const act = useCallback(
    (
      action:
        | 'start'
        | 'begin'
        | 'retry'
        | 'next'
        | 'menu'
        | 'pause'
        | { select: number },
    ) => {
      const g = gameRef.current
      if (!g) return
      if (typeof action === 'object') {
        g.selectLevel(action.select)
        return
      }
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
    },
    [],
  )

  /** «Следующий наряд» с проверкой: не начинается ли новая глава. */
  const nextWithStory = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    const nextIdx = (snap?.levelIndex ?? 0) + 1
    const chapter = nextIdx >= LEVELS.length ? 'epilogue' : CHAPTER_AT[nextIdx]
    if (chapter) playScene(chapter, () => act('next'))
    else act('next')
  }, [snap, act, playScene])

  /** Загрузка уровня с карты с проверкой: не открывает ли он главу. */
  const pickWithStory = useCallback(
    (i: number) => {
      const g = gameRef.current
      if (!g) return
      const chapter = CHAPTER_AT[i]
      if (chapter) playScene(chapter, () => act({ select: i }))
      else act({ select: i })
    },
    [act, playScene],
  )

  /** Новая смена: главы хроники показываются заново. */
  const startFresh = useCallback(() => {
    runSeenRef.current = new Set()
    playScene('prologue', () => act('start'), true)
  }, [playScene, act])

  // Enter — основное действие на оверлеях (когда не открыта катсцена)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'NumpadEnter' && e.key !== 'Enter')
        return
      if (cutscene) return // катсцена сама слушает Enter
      if (phase === 'menu') startFresh()
      else if (phase === 'intro') act('begin')
      else if (phase === 'complete') nextWithStory()
      else if (phase === 'gameover') act('retry')
      else if (phase === 'victory') startFresh()
      else if (phase === 'paused') act('pause')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, act, cutscene, startFresh, nextWithStory])

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

  /** Музыка: применяем значение сразу, побочные эффекты — вне setState. */
  const toggleMusic = useCallback(() => {
    const nv = !musicOnRef.current
    musicOnRef.current = nv
    setMusicOn(nv)
    musicRef.current?.setEnabled(nv)
    try {
      localStorage.setItem(PREF_MUSIC, nv ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }, [])

  /** Эффекты: глушим мгновенно, без хвостов. */
  const toggleSfx = useCallback(() => {
    const nv = !sfxOnRef.current
    sfxOnRef.current = nv
    setSfxOn(nv)
    if (gameRef.current) gameRef.current.sfx.muted = !nv
    try {
      localStorage.setItem(PREF_SFX, nv ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }, [])

  const playing = phase === 'playing' || phase === 'paused'

  return (
    <div className="ah-grid-bg flex min-h-screen w-full flex-col items-center justify-center gap-3 p-2 text-[#efe7d2] sm:p-4">
      <main className="w-full max-w-[1080px]">
        <div className="relative aspect-[16/9] max-md:aspect-[4/5] w-full overflow-hidden rounded-md border-2 border-[#2a2f28] bg-[#0b0d0c] shadow-[0_0_0_6px_rgba(255,255,255,0.03),0_24px_70px_rgba(0,0,0,0.6)]">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full object-contain [filter:saturate(1.07)_contrast(1.04)]"
            aria-label="Игровое поле ЭнергоГероя"
          />

          {/* Кинематографичные слои: виньетка, зерно, тёплый оттенок */}
          <div className="ah-cine-warm pointer-events-none absolute inset-0 z-[4]" />
          <div className="ah-cine-vig pointer-events-none absolute inset-0 z-[4]" />
          <div className="ah-cine-grain pointer-events-none absolute inset-0 z-[4]" />

          {/* Кнопки музыки, звука и паузы */}
          <div className="absolute right-2 top-2 z-20 flex gap-1.5">
            <CanvasIconBtn
              label={musicOn ? 'Выключить музыку' : 'Включить музыку'}
              on={musicOn}
              onClick={toggleMusic}
            >
              <Music2 className="h-4 w-4" />
              {!musicOn && (
                <span
                  aria-hidden
                  className="absolute h-[2px] w-6 -rotate-45 rounded bg-[#c8402e]"
                />
              )}
            </CanvasIconBtn>
            <CanvasIconBtn
              label={sfxOn ? 'Выключить звук' : 'Включить звук'}
              on={sfxOn}
              onClick={toggleSfx}
            >
              {sfxOn ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </CanvasIconBtn>
            {playing && (
              <CanvasIconBtn
                label="Пауза"
                on
                onClick={() => act('pause')}
              >
                <Pause className="h-4 w-4" />
              </CanvasIconBtn>
            )}
          </div>

          {/* ---------- Оверлеи ---------- */}
          {phase === 'menu' && (
            <Overlay>
              {menuView === 'main' && (
                <MenuMain
                  best={best}
                  unlocked={progress.unlocked}
                  onContinue={() => act({ select: progress.unlocked - 1 })}
                  onFresh={startFresh}
                  onLevels={() => setMenuView('levels')}
                  onHowto={() => setMenuView('howto')}
                  onStory={() => setMenuView('story')}
                />
              )}
              {menuView === 'levels' && (
                <MenuLevels
                  progress={progress}
                  onPick={(i) => {
                    setMenuView('main')
                    pickWithStory(i)
                  }}
                  onClose={() => setMenuView('main')}
                />
              )}
              {menuView === 'howto' && (
                <MenuHowto onClose={() => setMenuView('main')} />
              )}
              {menuView === 'story' && (
                <MenuStory
                  seen={seenScenes}
                  onPlay={(id) => {
                    setMenuView('main')
                    playScene(id, () => undefined, true)
                  }}
                  onClose={() => setMenuView('main')}
                />
              )}
            </Overlay>
          )}

          {phase === 'intro' && snap && (
            <Overlay>
              <IntroDoc snap={snap} onBegin={() => act('begin')} />
            </Overlay>
          )}

          {phase === 'paused' && (
            <Overlay>
              <PauseDoc
                musicOn={musicOn}
                sfxOn={sfxOn}
                onToggleMusic={toggleMusic}
                onToggleSfx={toggleSfx}
                onResume={() => act('pause')}
                onRetry={() => act('retry')}
                onMenu={() => act('menu')}
              />
            </Overlay>
          )}

          {phase === 'complete' && snap?.result && (
            <Overlay>
              <CompleteDoc
                snap={snap}
                onNext={nextWithStory}
                onRetry={() => act('retry')}
                onMenu={() => act('menu')}
              />
            </Overlay>
          )}

          {phase === 'gameover' && snap && (
            <Overlay>
              <GameOverDoc
                snap={snap}
                onRetry={() => act('retry')}
                onMenu={() => act('menu')}
              />
            </Overlay>
          )}

          {phase === 'victory' && snap?.summary && (
            <Overlay dim={0.42}>
              <VictoryDoc
                snap={snap}
                best={best}
                onRestart={startFresh}
                onLevels={() => {
                  setMenuView('levels')
                  act('menu')
                }}
                onMenu={() => act('menu')}
              />
            </Overlay>
          )}

          {/* ---------- Катсцена-хроника (поверх всего) ---------- */}
          {cutscene && <Cutscene scene={cutscene} onFinish={finishCutscene} />}
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

      <footer className="mt-auto flex select-none items-center gap-2 pb-2 text-[11px] tracking-wide text-[#efe7d2]/35">
        <Emblem className="h-4 w-auto" />
        <span className="font-mono uppercase">
          Форма ЭГ-7 · ЭнергоГерой — платформер об энергосбережении · выключайте
          свет и в жизни
        </span>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Экраны                                                              */
/* ------------------------------------------------------------------ */

function Overlay({
  children,
  dim = 0.78,
}: {
  children: React.ReactNode
  /** Плотность затемнения: на финале светлей — салют виден сквозь. */
  dim?: number
}) {
  const hex = Math.round(dim * 255)
    .toString(16)
    .padStart(2, '0')
  return (
    <div
      className="absolute inset-0 z-10 flex overflow-y-auto p-3 backdrop-blur-[2.5px]"
      style={{ backgroundColor: `#070a08${hex}` }}
    >
      <div className="m-auto w-full max-w-2xl py-2 text-center">{children}</div>
    </div>
  )
}

function MenuMain({
  best,
  unlocked,
  onContinue,
  onFresh,
  onLevels,
  onHowto,
  onStory,
}: {
  best: number
  unlocked: number
  onContinue: () => void
  onFresh: () => void
  onLevels: () => void
  onHowto: () => void
  onStory: () => void
}) {
  return (
    <Doc docNo="ЭГ-7" title="УПРАВЛЕНИЕ НАРЯДАМИ" tone="tape">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center justify-center gap-3">
          <Emblem className="ah-float h-12 w-auto sm:h-14" />
          <div className="text-left">
            <h1 className="text-3xl font-black leading-none tracking-[0.08em] text-[#221e17] sm:text-5xl">
              ЭНЕРГОГЕРОЙ
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.32em] text-[#6b6455] sm:text-[11px]">
              Ведомство сбережения энергии
            </p>
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-lg text-[13px] leading-relaxed text-[#4b443a] sm:text-sm">
          Ты — <b>Вжик</b>, светодиодная лампочка в плаще. По дому рыщут
          ЭнергоВампиры, Гонцы и Дроны, а счётчик крутится всё быстрее.
          Двадцать нарядов — и каждый злее предыдущего.
        </p>
      </div>

      <div className="mx-auto mt-5 flex w-full max-w-xs flex-col gap-2">
        {unlocked > 1 && (
          <InkButton onClick={onContinue} size="lg">
            ПРОДОЛЖИТЬ · УРОВЕНЬ {unlocked} <ChevronRight className="h-4 w-4" />
          </InkButton>
        )}
        <InkButton onClick={onFresh} tone={unlocked > 1 ? 'paper' : 'primary'} size={unlocked > 1 ? 'md' : 'lg'}>
          <Play className="h-4 w-4" />{' '}
          {unlocked > 1 ? 'ЗАНОВО, С ПЕРВОГО УРОВНЯ' : 'НАЧАТЬ СМЕНУ'}
        </InkButton>
        <div className="flex gap-2">
          <InkButton onClick={onLevels} tone="paper" className="flex-1">
            <Map className="h-4 w-4" /> УРОВНИ
          </InkButton>
          <InkButton onClick={onHowto} tone="paper" className="flex-1">
            <BookOpenCheck className="h-4 w-4" /> ПАМЯТКА
          </InkButton>
        </div>
        <InkButton onClick={onStory} tone="ink" className="w-full">
          <Scroll className="h-4 w-4" /> ХРОНИКА СМЕНЫ
        </InkButton>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6455]">
        {best > 0 && (
          <span className="flex items-center gap-1 text-[#8a6a12]">
            <Star className="h-3 w-3 fill-[#ffd23f] stroke-[#221e17]" />
            Рекорд: {best}
          </span>
        )}
        <span>←→ / AD — бег · Space — прыжок · P — перерыв</span>
      </div>
    </Doc>
  )
}

function MenuLevels({
  progress,
  onPick,
  onClose,
}: {
  progress: Progress
  onPick: (i: number) => void
  onClose: () => void
}) {
  return (
    <Doc docNo="ЭГ-12" title="ЖУРНАЛ НАРЯДОВ" tone="tape">
      <p className="mx-auto max-w-md text-xs leading-relaxed text-[#4b443a]">
        Каждый наряд — отдельная комната дома. Звезды ставят за сбор: 3 — почти
        всё собрано, 1 — дошёл до щитка. Открыт уровень{' '}
        <b className="text-[#221e17]">№ {progress.unlocked}</b> из{' '}
        {LEVELS.length}.
      </p>
      <div className="mx-auto mt-4 grid max-w-xl grid-cols-4 gap-1.5 sm:grid-cols-5">
        {LEVELS.map((lv, i) => {
          const locked = i + 1 > progress.unlocked
          const stars = progress.stars[i] ?? 0
          return (
            <button
              key={lv.name}
              disabled={locked}
              onClick={() => onPick(i)}
              title={locked ? 'Наряд ещё не выдан' : `${lv.name}`}
              className={`ah-pop relative flex h-[74px] flex-col items-center justify-center gap-0.5 rounded-[3px] border-2 px-1 transition-all ${
                locked
                  ? 'ah-hatch cursor-not-allowed border-[#c9c0a6] text-[#a09880]'
                  : 'border-[#221e17] bg-[#faf5e4] text-[#221e17] shadow-[3px_3px_0_rgba(34,30,23,0.35)] hover:-translate-y-0.5 hover:shadow-[4px_5px_0_rgba(34,30,23,0.4)] active:translate-y-0 active:shadow-[1px_1px_0_rgba(34,30,23,0.4)]'
              }`}
              style={{ animationDelay: `${i * 18}ms` }}
            >
              {locked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <>
                  <span className="font-mono text-[9px] tracking-widest text-[#8a8171]">
                    №{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-black leading-tight">
                    {lv.name}
                  </span>
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map((k) => (
                      <Star
                        key={k}
                        className={`h-2.5 w-2.5 ${
                          k < stars
                            ? 'fill-[#ffd23f] stroke-[#221e17]'
                            : 'fill-transparent stroke-[#b7ad93]'
                        }`}
                      />
                    ))}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4">
        <InkButton onClick={onClose} tone="ink">
          ЗАКРЫТЬ ЖУРНАЛ
        </InkButton>
      </div>
    </Doc>
  )
}

function MenuStory({
  seen,
  onPlay,
  onClose,
}: {
  seen: Set<string>
  onPlay: (id: string) => void
  onClose: () => void
}) {
  return (
    <Doc docNo="ЭГ-ХР" title="ХРОНИКА СМЕНЫ" tone="tape">
      <p className="mx-auto max-w-md text-xs leading-relaxed text-[#4b443a]">
        Как прошло расследование дома № 7 — по кадрам. Пролог открывается
        первой сменой, главы — по ходу нарядов.
      </p>
      <div className="mx-auto mt-4 flex max-w-md flex-col gap-1.5">
        {STORY_ORDER.map((id, i) => {
          const sc = STORY[id]
          const isSeen = seen.has(id)
          return (
            <div
              key={id}
              className="ah-pop flex items-center gap-2.5 border-2 border-[#221e17]/20 bg-[#faf5e4] p-2 text-left"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <span className="flex h-9 w-11 shrink-0 items-center justify-center border-2 border-[#221e17] bg-[#221e17] font-mono text-[9px] font-black tracking-widest text-[#ffd23f]">
                {sc.docNo}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-black uppercase tracking-wide text-[#221e17]">
                  {sc.chapter} · «{sc.title}»
                </span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-[#8a8171]">
                  {isSeen ? 'в архиве' : 'не просмотрено'} · {sc.span} · кадров: {sc.panels.length}
                </span>
              </span>
              {!isSeen && (
                <span className="ah-stamp shrink-0 border-2 border-[#c8402e] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#c8402e]">
                  Новое
                </span>
              )}
              <button
                onClick={() => onPlay(id)}
                className="inline-flex h-8 shrink-0 select-none items-center gap-1 rounded-[3px] border-2 border-[#221e17] bg-[#ffd23f] px-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#221e17] shadow-[0_3px_0_#221e17] transition-all hover:bg-[#ffdc61] active:translate-y-[2px] active:shadow-[0_1px_0_#221e17]"
              >
                <Play className="h-3 w-3" /> КАДР
              </button>
            </div>
          )
        })}
      </div>
      <div className="mt-4">
        <InkButton onClick={onClose} tone="ink">
          ЗАКРЫТЬ ХРОНИКУ
        </InkButton>
      </div>
    </Doc>
  )
}

function MenuHowto({ onClose }: { onClose: () => void }) {
  return (
    <Doc docNo="ЭГ-3" title="ПАМЯТКА · ОХРАНА СВЕТА" tone="tape">
      <div className="mx-auto grid max-w-xl gap-1.5 text-left sm:grid-cols-2">
        {HOW_TO.map((h, i) => (
          <div
            key={h.title}
            className="ah-pop flex items-start gap-2.5 border-2 border-[#221e17]/15 bg-[#faf5e4] p-2"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#221e17] bg-[#ffd23f]">
              <h.icon className="h-4 w-4 text-[#221e17]" />
            </span>
            <span>
              <span className="block text-[12px] font-black uppercase tracking-wide leading-tight text-[#221e17]">
                {h.title}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-[#6b6455]">
                {h.text}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <InkButton onClick={onClose} tone="ink">
          ПОНЯТНО, РАБОТАЮ
        </InkButton>
      </div>
    </Doc>
  )
}

function IntroDoc({ snap, onBegin }: { snap: Snapshot; onBegin: () => void }) {
  const def = LEVELS[snap.levelIndex]
  const nBulbs = countCh(def.map, 'B')
  const nSwitches = countCh(def.map, 'ST')
  const nFuses = countCh(def.map, 'K')
  const rows: [string, string][] = [
    ['LED-лампочки', `${nBulbs} шт.`],
    ['Рубильники', `${nSwitches} шт.`],
    ['Предохранители', nFuses > 0 ? `${nFuses} шт.` : '—'],
    ['Щиток на выходе', 'включить'],
  ]
  return (
    <Doc
      docNo={`ЭГ-${String(snap.levelIndex + 1).padStart(2, '0')}/${LEVELS.length}`}
      title="НАРЯД-ДОПУСК"
    >
      {snap.badge && (
        <div className="mb-3 flex justify-center">
          <span className="ah-stamp inline-flex -rotate-1 items-center gap-1.5 border-2 border-[#221e17] bg-[#ffd23f] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#221e17]">
            <TriangleAlert className="h-3.5 w-3.5" /> {snap.badge}
          </span>
        </div>
      )}

      <div className="mx-auto max-w-md text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8a8171]">
          {snap.levelSubtitle}
        </p>
        <h2 className="mt-0.5 text-3xl font-black tracking-wide text-[#221e17] sm:text-4xl">
          {snap.levelName}
        </h2>

        <div className="mt-4 border-2 border-[#221e17]/25 bg-[#faf5e4] p-3">
          <FieldRow label="Участок" value={DISTRICT[def.theme]} />
          <FieldRow label="Ответственный" value="Вжик · лампочка 1-го разряда" />
          <div className="mt-2 border-t-2 border-dotted border-[#221e17]/20 pt-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#8a8171]">
              Состав работ
            </p>
            <ul className="mt-1">
              {rows.map(([k, v]) => (
                <li key={k} className="flex items-baseline text-[13px] font-bold text-[#221e17]">
                  <span>{k}</span>
                  <span className="ah-leader" />
                  <span className="font-mono text-xs">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-3 border-l-4 border-[#ffd23f] bg-[#efe7cd] px-3 py-2 text-left">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#8a8171]">
            Примечание к наряду
          </p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#4b443a]">
            {snap.hint}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <InkButton onClick={onBegin} size="lg">
          ПОДПИСАТЬ · ВЫЙТИ НА СМЕНУ <ChevronRight className="h-4 w-4" />
        </InkButton>
      </div>
    </Doc>
  )
}

function CompleteDoc({
  snap,
  onNext,
  onRetry,
  onMenu,
}: {
  snap: Snapshot
  onNext: () => void
  onRetry: () => void
  onMenu: () => void
}) {
  const r = snap.result!
  const rank =
    r.bulbs / Math.max(1, r.bulbsTotal) >= 0.95 &&
    r.switches / Math.max(1, r.switchesTotal) >= 0.95 &&
    (r.fusesTotal === 0 || r.fuses / r.fusesTotal >= 0.95)
      ? 'S'
      : starsFromResult(r) === 3
        ? 'A'
        : starsFromResult(r) === 2
          ? 'B'
          : 'C'
  return (
    <Doc
      docNo={`ЭГ-${String(snap.levelIndex + 1).padStart(2, '0')}/АКТ`}
      title="АКТ ВЫПОЛНЕННЫХ РАБОТ"
      tone="tape"
    >
      <span className="ah-stamp ah-stamp-ok absolute right-4 top-14 rotate-6 px-3 py-1 text-sm font-black uppercase tracking-[0.3em] sm:right-7">
        Зачтено
      </span>
      <span className="absolute right-6 top-[74px] flex h-9 w-9 rotate-6 items-center justify-center rounded-full border-[3px] border-[#2e7d43] font-mono text-lg font-black text-[#2e7d43] mix-blend-multiply sm:right-9">
        {rank}
      </span>

      <h2 className="text-2xl font-black tracking-wide text-[#221e17] sm:text-3xl">
        «{r.levelName}» — свет восстановлен
      </h2>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.28em] text-[#8a8171]">
        {snap.levelSubtitle}
      </p>

      <div className="mx-auto mt-4 max-w-sm text-left">
        <LedgerRow k="LED-лампочки" v={`${r.bulbs}/${r.bulbsTotal}`} />
        <LedgerRow k="Рубильники" v={`${r.switches}/${r.switchesTotal}`} />
        {r.fusesTotal > 0 && (
          <LedgerRow k="Предохранители" v={`${r.fuses}/${r.fusesTotal}`} />
        )}
        <LedgerRow
          k="Энергия на счету"
          v={`${r.energy}% · бонус +${r.bonus}`}
        />
        <LedgerRow k="Хронометраж" v={fmtTime(r.time)} />
        <div className="mt-1 flex items-baseline border-t-2 border-[#221e17]/60 pt-1.5">
          <span className="text-sm font-black uppercase tracking-widest text-[#221e17]">
            Итого
          </span>
          <span className="ah-leader" />
          <span className="font-mono text-xl font-black text-[#221e17]">
            <ScoreCount value={r.score} />
          </span>
        </div>
      </div>

      <LevelDots current={snap.levelIndex} />

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <InkButton onClick={onNext} size="lg">
          СЛЕДУЮЩИЙ НАРЯД <ChevronRight className="h-4 w-4" />
        </InkButton>
        <InkButton onClick={onRetry} tone="paper">
          <RotateCcw className="h-4 w-4" /> ПЕРЕСДАТЬ
        </InkButton>
        <InkButton onClick={onMenu} tone="ink">
          <Home className="h-4 w-4" /> В УПРАВЛЕНИЕ
        </InkButton>
      </div>
    </Doc>
  )
}

function GameOverDoc({
  snap,
  onRetry,
  onMenu,
}: {
  snap: Snapshot
  onRetry: () => void
  onMenu: () => void
}) {
  const cause = CAUSES[snap.deathCause ?? 'drain'] ?? CAUSES.drain
  return (
    <Doc
      docNo={`ЭГ-${String(snap.levelIndex + 1).padStart(2, '0')}/АВ`}
      title="АКТ ОБ АВАРИИ"
      tone="tape-red"
    >
      <span className="ah-stamp ah-stamp-bad absolute right-4 top-14 -rotate-6 px-3 py-1 text-sm font-black uppercase tracking-[0.3em] sm:right-7">
        Отказ
      </span>
      <Ghost className="mx-auto mt-1 h-10 w-10 text-[#c8402e]" />
      <h2 className="mt-1 text-2xl font-black tracking-wide text-[#221e17] sm:text-3xl">
        {cause.title}
      </h2>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.28em] text-[#8a8171]">
        {snap.levelSubtitle} · попытка № {snap.attempt}
      </p>

      <div className="mx-auto mt-3 max-w-md border-l-4 border-[#c8402e] bg-[#f3e4d4] px-3 py-2 text-left">
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#8a8171]">
          Рекомендация комиссии
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#4b443a]">
          {cause.tip}
        </p>
      </div>

      <div className="mx-auto mt-3 max-w-sm text-left">
        <LedgerRow k="Наряд" v={`№ ${snap.levelIndex + 1} · ${snap.levelName}`} />
        <LedgerRow k="Очки к моменту аварии" v={String(snap.score)} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <InkButton onClick={onRetry} tone="danger" size="lg">
          <RotateCcw className="h-4 w-4" /> ПОВТОРИТЬ НАРЯД
        </InkButton>
        <InkButton onClick={onMenu} tone="ink">
          <Home className="h-4 w-4" /> В УПРАВЛЕНИЕ
        </InkButton>
      </div>
    </Doc>
  )
}

function VictoryDoc({
  snap,
  best,
  onRestart,
  onLevels,
  onMenu,
}: {
  snap: Snapshot
  best: number
  onRestart: () => void
  onLevels: () => void
  onMenu: () => void
}) {
  const s = snap.summary!
  const isRecord = s.score > 0 && s.score >= best
  return (
    <Doc docNo="ЭГ-20/ИТГ" title="ОТЧЁТ ПО ОБЪЕКТУ · ЗАКРЫТ" tone="tape">
      {/* Штамп «КОНЕЦ» — финальный оттиск хроники */}
      <div className="relative mb-1 flex justify-center">
        <div
          className="ah-stamp select-none px-5 py-1 text-center text-xl font-black uppercase tracking-[0.3em] sm:text-2xl"
          aria-hidden
        >
          ★ Конец ★
        </div>
      </div>
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            className={`ah-pop h-10 w-10 sm:h-12 sm:w-12 ${
              i < s.stars
                ? 'fill-[#ffd23f] stroke-[#221e17] drop-shadow-[0_3px_0_rgba(34,30,23,0.35)]'
                : 'fill-transparent stroke-[#b7ad93]'
            }`}
            style={{ animationDelay: `${200 + i * 220}ms` }}
          />
        ))}
      </div>
      <h2 className="mt-2 text-3xl font-black tracking-wide text-[#221e17] sm:text-4xl">
        ДОМ СПАСЁН
      </h2>
      <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-[#4b443a]">
        Все двадцать нарядов закрыты, щитки гудят от довольствия. Настоящий
        ЭнергоГерой бережёт свет и за пределами смены.
      </p>

      <div className="mx-auto mt-4 max-w-sm text-left">
        <LedgerRow k="Всего очков" v={String(s.score)} />
        <LedgerRow
          k="Личный рекорд"
          v={`${s.best}${isRecord ? ' · новый!' : ''}`}
        />
        <LedgerRow
          k="LED-лампочки за забег"
          v={`${s.bulbs}/${s.bulbsTotal}`}
        />
        <LedgerRow
          k="Рубильники за забег"
          v={`${s.switches}/${s.switchesTotal}`}
        />
      </div>

      {/* Титры: вся команда ночной смены */}
      <div className="mx-auto mt-4 max-w-md border-t-2 border-dashed border-[#221e17]/30 pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8a8171]">
          в смене участвовали
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#4b443a]">
          <b className="text-[#221e17]">Вжик</b> — холодная нить и лёгкий плащ ·{' '}
          <b className="text-[#221e17]">Барон Накал</b> — пятьдесят ватт по
          вечерам · <b className="text-[#221e17]">Диспетчер</b> — голос с крыши ·
          энергоВампирики — покаянный хор
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <InkButton onClick={onRestart} size="lg">
          <Play className="h-4 w-4" /> НОВАЯ СМЕНА
        </InkButton>
        <InkButton onClick={onLevels} tone="paper">
          <Map className="h-4 w-4" /> ЖУРНАЛ НАРЯДОВ
        </InkButton>
        <InkButton onClick={onMenu} tone="ink">
          <Home className="h-4 w-4" /> В УПРАВЛЕНИЕ
        </InkButton>
      </div>
    </Doc>
  )
}

function PauseDoc({
  musicOn,
  sfxOn,
  onToggleMusic,
  onToggleSfx,
  onResume,
  onRetry,
  onMenu,
}: {
  musicOn: boolean
  sfxOn: boolean
  onToggleMusic: () => void
  onToggleSfx: () => void
  onResume: () => void
  onRetry: () => void
  onMenu: () => void
}) {
  return (
    <Doc docNo="ЭГ-0" title="ПЕРЕРЫВ" tone="tape">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8a8171]">
        сеть под напряжением · свет подождёт
      </p>
      <div className="mx-auto mt-4 flex w-full max-w-xs flex-col gap-1.5">
        <FormSwitch
          label="Фоновая музыка"
          on={musicOn}
          onToggle={onToggleMusic}
        />
        <FormSwitch label="Звуковые эффекты" on={sfxOn} onToggle={onToggleSfx} />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <InkButton onClick={onResume} size="lg">
          <Play className="h-4 w-4" /> ПРОДОЛЖИТЬ
        </InkButton>
        <InkButton onClick={onRetry} tone="paper">
          <RotateCcw className="h-4 w-4" /> ЗАНОВО
        </InkButton>
        <InkButton onClick={onMenu} tone="ink">
          <Home className="h-4 w-4" /> В УПРАВЛЕНИЕ
        </InkButton>
      </div>
    </Doc>
  )
}

/* ------------------------------------------------------------------ */
/* Элементы бланка                                                     */
/* ------------------------------------------------------------------ */

function Doc({
  children,
  title,
  docNo,
  tone = 'plain',
}: {
  children: React.ReactNode
  title: string
  docNo: string
  tone?: 'plain' | 'tape' | 'tape-red'
}) {
  return (
    <div className="ah-doc ah-pop mx-auto w-full text-center">
      <div
        className={`h-2.5 w-full ${tone === 'tape-red' ? 'ah-tape-red' : tone === 'tape' ? 'ah-tape' : 'bg-[#221e17]'}`}
      />
      <div className="px-5 py-4 sm:px-9 sm:py-5">
        <div className="mb-2 flex items-baseline justify-between gap-2 border-b-2 border-[#221e17]/60 pb-1.5">
          <span className="text-[13px] font-black uppercase tracking-[0.22em] text-[#221e17] sm:text-sm">
            {title}
          </span>
          <span className="shrink-0 font-mono text-[10px] tracking-[0.18em] text-[#8a8171]">
            № {docNo}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline text-[13px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#8a8171]">
        {label}
      </span>
      <span className="ah-leader" />
      <span className="font-bold text-[#221e17]">{value}</span>
    </div>
  )
}

function LedgerRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline py-[3px] text-[13.5px] text-[#221e17]">
      <span className="font-bold">{k}</span>
      <span className="ah-leader" />
      <span className="font-mono text-[13px] font-bold">{v}</span>
    </div>
  )
}

function LevelDots({ current }: { current: number }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
      {LEVELS.map((_, i) => (
        <span
          key={i}
          title={`Наряд № ${i + 1}`}
          className={`h-2 transition-all ${
            i === current
              ? 'ah-blink w-5 bg-[#c8402e]'
              : i < current
                ? 'w-2 bg-[#2e7d43]'
                : 'w-2 border border-[#221e17]/40 bg-transparent'
          }`}
        />
      ))}
    </div>
  )
}

const BTN_TONES = {
  primary:
    'bg-[#ffd23f] text-[#221e17] shadow-[0_4px_0_#221e17] hover:bg-[#ffdc61] active:shadow-[0_1px_0_#221e17]',
  paper:
    'bg-[#faf5e4] text-[#221e17] shadow-[0_4px_0_#221e17] hover:bg-white active:shadow-[0_1px_0_#221e17]',
  ink: 'bg-[#221e17] text-[#f4eeda] shadow-[0_4px_0_#0c0a07] hover:bg-[#383228] active:shadow-[0_1px_0_#0c0a07]',
  danger:
    'bg-[#d3452f] text-[#f4eeda] shadow-[0_4px_0_#221e17] hover:bg-[#e05540] active:shadow-[0_1px_0_#221e17]',
} as const

function InkButton({
  children,
  onClick,
  tone = 'primary',
  size = 'md',
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  tone?: keyof typeof BTN_TONES
  size?: 'md' | 'lg'
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-[3px] border-2 border-[#221e17] font-black uppercase tracking-[0.12em] transition-all duration-75 active:translate-y-[3px] ${
        BTN_TONES[tone]
      } ${size === 'lg' ? 'h-11 px-7 text-[15px]' : 'h-10 px-4 text-xs'} ${className}`}
    >
      {children}
    </button>
  )
}

function FormSwitch({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="flex items-center justify-between border-2 border-[#221e17]/25 bg-[#faf5e4] px-3 py-2 text-left transition-colors hover:border-[#221e17]/50"
    >
      <span className="text-[12px] font-black uppercase tracking-[0.14em] text-[#221e17]">
        {label}
      </span>
      <span
        className={`relative ml-3 h-5 w-10 shrink-0 border-2 border-[#221e17] transition-colors ${
          on ? 'bg-[#ffd23f]' : 'ah-hatch bg-[#efe7cd]'
        }`}
      >
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 border-2 border-[#221e17] bg-[#faf5e4] transition-all ${
            on ? 'left-[calc(100%-1.1rem)]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

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

function CanvasIconBtn({
  children,
  label,
  on,
  onClick,
}: {
  children: React.ReactNode
  label: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={`relative flex h-9 w-9 items-center justify-center border bg-black/55 backdrop-blur-sm transition ${
        on
          ? 'border-[#ffd23f]/60 text-[#ffd23f] hover:bg-black/75'
          : 'border-[#efe7d2]/20 text-[#efe7d2]/45 hover:bg-black/75'
      }`}
    >
      {children}
    </button>
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
      className={`touch-none select-none rounded-[4px] border-2 border-[#efe7d2]/30 bg-black/55 font-black uppercase tracking-widest text-[#efe7d2] shadow-[0_4px_0_rgba(0,0,0,0.5)] active:translate-y-[2px] active:bg-[#ffd23f]/90 active:text-[#221e17] ${
        wide ? 'h-16 px-10 text-lg' : 'h-16 w-20 text-2xl'
      }`}
    >
      {label}
    </button>
  )
}
