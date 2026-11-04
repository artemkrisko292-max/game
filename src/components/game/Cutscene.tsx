'use client'

// Катсцена-хроника: кадры-комиксы на бумаге, текст печатной машинкой,
// навигация кликом/Enter/Space, Esc — пропустить главу.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { ChevronRight, FastForward, Film } from 'lucide-react'
import { CutsceneArt } from '@/components/game/CutsceneArt'
import type { StoryScene } from '@/lib/game/story'

const TYPE_MS = 14 // мс на символ

type TapResult = 'revealed' | 'done'

/**
 * Строка печатной машинки. Пересоздаётся на каждый кадр (key={pi}),
 * поэтому сброс состояния не нужен. tap() раскрывает текст целиком
 * или сообщает, что кадр прочитан.
 */
function Typed({
  text,
  tapRef,
}: {
  text: string
  tapRef: MutableRefObject<(() => TapResult) | null>
}) {
  const [n, setN] = useState(0)
  const nRef = useRef(0)

  useEffect(() => {
    tapRef.current = () => {
      if (nRef.current < text.length) {
        nRef.current = text.length
        setN(text.length)
        return 'revealed'
      }
      return 'done'
    }
    if (text.length === 0) return
    const t = window.setInterval(() => {
      if (nRef.current >= text.length) {
        window.clearInterval(t)
        return
      }
      nRef.current += 1
      setN(nRef.current)
    }, TYPE_MS)
    return () => {
      window.clearInterval(t)
      if (tapRef.current) tapRef.current = null
    }
  }, [text, tapRef])

  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span className="ah-caret text-[#c8402e]">▌</span>}
    </>
  )
}

export function Cutscene({
  scene,
  onFinish,
}: {
  scene: StoryScene
  onFinish: () => void
}) {
  const [pi, setPi] = useState(0)
  const panel = scene.panels[pi]
  const tapRef = useRef<(() => TapResult) | null>(null)
  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  }, [onFinish])

  const last = pi === scene.panels.length - 1

  const advance = useCallback(() => {
    const res = tapRef.current?.()
    if (res === 'revealed') return // первый клик — дочитываем кадр
    if (!last) setPi((v) => v + 1)
    else finishRef.current()
  }, [last])

  // Клавиатура: Enter/Space/→ — дальше, Esc — пропустить
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault()
        finishRef.current()
      } else if (
        e.code === 'Enter' ||
        e.code === 'NumpadEnter' ||
        e.code === 'Space' ||
        e.code === 'ArrowRight'
      ) {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance])

  const rot = pi % 2 === 0 ? '-0.35deg' : '0.4deg'

  return (
    <div className="absolute inset-0 z-40 flex overflow-y-auto bg-[#05070a]/88 p-3 backdrop-blur-[3px] sm:p-5">
      <div className="m-auto w-full max-w-2xl">
        {/* Бланк хроники */}
        <div className="ah-doc ah-pop relative text-center">
          <div className={`h-2.5 w-full ${scene.tone === 'tape-red' ? 'ah-tape-red' : 'ah-tape'}`} />
          <div className="px-4 py-3 sm:px-8 sm:py-3.5">
            <div className="mb-2 flex items-baseline justify-between gap-2 border-b-2 border-[#221e17]/60 pb-1.5">
              <span className="text-left text-[12px] font-black uppercase tracking-[0.22em] text-[#221e17] sm:text-[13px]">
                Хроника смены
              </span>
              <span className="shrink-0 font-mono text-[10px] tracking-[0.18em] text-[#8a8171]">
                № {scene.docNo} · {scene.span}
              </span>
            </div>

            {/* Заголовок главы */}
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#8a8171]">
              {scene.chapter}
            </p>
            <h2 className="mt-0.5 text-xl font-black tracking-wide text-[#221e17] sm:text-2xl">
              «{scene.title}»
            </h2>

            {/* Кадр */}
            <button
              onClick={advance}
              aria-label="Следующий кадр"
              className="group relative mt-3 block w-full cursor-pointer select-none border-2 border-[#221e17] bg-[#14110d] shadow-[4px_4px_0_rgba(34,30,23,0.35)] transition-transform duration-150 active:translate-y-[2px]"
              style={{ transform: `rotate(${rot})` }}
            >
              {/* «скотч» на углах кадра */}
              <span className="absolute -left-2 -top-2 z-10 h-4 w-9 -rotate-45 border border-[#221e17]/25 bg-[#efe7cd]/90 shadow-sm" />
              <span className="absolute -bottom-2 -right-2 z-10 h-4 w-9 -rotate-45 border border-[#221e17]/25 bg-[#efe7cd]/90 shadow-sm" />
              <CutsceneArt art={panel.art} className="ah-pop mx-auto block h-auto max-h-[30vh] w-full" key={panel.art} />
              <span className="absolute bottom-1.5 left-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#f4eeda]/70">
                кадр {pi + 1}/{scene.panels.length}
              </span>
            </button>

            {/* Текст кадра: реплика и/или подпись хроники */}
            <div className="mx-auto mt-2.5 min-h-[72px] max-w-lg text-left sm:min-h-[64px]">
              {panel.speaker ? (
                <>
                  <p className="mb-1">
                    <span className="inline-block -rotate-1 border-2 border-[#221e17] bg-[#221e17] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f4eeda]">
                      {panel.speaker}
                    </span>
                  </p>
                  <p className="text-[13.5px] leading-relaxed text-[#4b443a] sm:text-[14.5px]">
                    <Typed key={pi} text={panel.text ?? ''} tapRef={tapRef} />
                  </p>
                  {panel.caption && (
                    <p className="mt-1.5 border-l-2 border-[#ffd23f] pl-2 font-mono text-[10.5px] uppercase leading-snug tracking-[0.08em] text-[#8a8171]">
                      ※ {panel.caption}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[13.5px] leading-relaxed text-[#4b443a] sm:text-[14.5px]">
                  <Typed key={pi} text={panel.caption ?? ''} tapRef={tapRef} />
                </p>
              )}
            </div>

            {/* Навигация */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {!last ? (
                <button
                  onClick={advance}
                  className="inline-flex h-10 select-none items-center gap-1.5 rounded-[3px] border-2 border-[#221e17] bg-[#ffd23f] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#221e17] shadow-[0_4px_0_#221e17] transition-all hover:bg-[#ffdc61] active:translate-y-[3px] active:shadow-[0_1px_0_#221e17]"
                >
                  ДАЛЬШЕ <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={advance}
                  className="ah-pop inline-flex h-11 select-none items-center gap-2 rounded-[3px] border-2 border-[#221e17] bg-[#ffd23f] px-7 text-[15px] font-black uppercase tracking-[0.12em] text-[#221e17] shadow-[0_4px_0_#221e17] transition-all hover:bg-[#ffdc61] active:translate-y-[3px] active:shadow-[0_1px_0_#221e17]"
                >
                  {scene.finishLabel} <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => finishRef.current()}
                className="inline-flex h-10 select-none items-center gap-1.5 rounded-[3px] border-2 border-[#221e17]/55 bg-transparent px-3.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#6b6455] transition-colors hover:border-[#221e17] hover:text-[#221e17]"
              >
                <FastForward className="h-3.5 w-3.5" /> ПРОПУСТИТЬ
              </button>
            </div>

            {/* Точки-кадры + подсказка */}
            <div className="mt-2.5 flex items-center justify-center gap-3">
              <div className="flex gap-1">
                {scene.panels.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 transition-all ${
                      i === pi
                        ? 'w-5 bg-[#c8402e]'
                        : i < pi
                          ? 'w-2 bg-[#2e7d43]'
                          : 'w-2 border border-[#221e17]/40 bg-transparent'
                    }`}
                  />
                ))}
              </div>
              <span className="hidden items-center gap-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#8a8171] sm:inline-flex">
                <Film className="h-3 w-3" /> Enter / клик — дальше · Esc — пропустить
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
