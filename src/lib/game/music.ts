// Фоновая музыка «ЭнергоГероя» — солнечный чиптюн-поп.
// Всё синтезируется на Web Audio API без внешних файлов:
// бодрый бас, лёгкие барабаны, звенящая мелодия с эхом.
//
// Жизненный цикл построен так, чтобы кнопки «музыка вкл/выкл»
// срабатывали мгновенно и в любой ситуации:
//  - stop() гасит мастер-громкость за ~0.1 с (хвосты не звучат);
//  - start() будит suspended-контекст (политика автоплея);
//  - wake() можно дёргать на каждый жест пользователя — это дёшево.

const BPM = 122
const BEAT = 60 / BPM
const BAR = BEAT * 4

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

/**
 * Прогрессия: C — G7 — Am7 — Fmaj7, дважды, с каденцией в конце.
 * Тепло, по-домашнему и без тоски — как раз для лампочки-спасателя.
 */
const CHORDS: number[][] = [
  [48, 52, 55, 59], // Cmaj7
  [43, 47, 50, 54], // G7
  [45, 48, 52, 55], // Am7
  [41, 45, 48, 53], // Fmaj7
  [48, 52, 55, 59], // Cmaj7
  [43, 47, 50, 54], // G7
  [45, 48, 52, 55], // Am7
  [43, 47, 50, 55], // G (каденция → C в начале лупа)
]

/** Корень такта для баса (на две октавы ниже центра). */
const BASS_ROOT: number[] = [36, 31, 33, 29, 36, 31, 33, 31]

/** Басовая «пружинка» на восьмых: тоника-октава-квинта-октава. */
const BASS_PATTERN: number[] = [0, 12, 7, 12, 0, 12, 7, 12]

/** Мелодия A — [доля, нота (midi), длительность в долях]. */
const MELODY_A: [number, number, number][][] = [
  [[0, 76, 0.5], [0.5, 79, 0.5], [1, 76, 0.5], [1.5, 79, 0.5], [2, 81, 1], [3, 79, 1]],
  [[0, 74, 0.5], [0.5, 71, 0.5], [1, 74, 1], [2, 79, 1.5], [3.5, 83, 0.5]],
  [[0, 81, 0.5], [0.5, 79, 0.5], [1, 76, 1], [2, 72, 1], [3, 74, 1]],
  [[0, 76, 1.5], [1.5, 72, 0.5], [2, 69, 1], [3, 72, 1]],
  [[0, 79, 0.5], [0.5, 76, 0.5], [1, 79, 0.5], [1.5, 84, 0.5], [2, 83, 1], [3, 79, 1]],
  [[0, 81, 0.5], [0.5, 79, 0.5], [1, 74, 1], [2, 79, 1.5], [3.5, 83, 0.5]],
  [[0, 84, 0.5], [0.5, 83, 0.5], [1, 81, 1], [2, 76, 1], [3, 79, 1]],
  [[0, 81, 1], [1, 74, 1], [2, 72, 1], [3, 71, 1]],
]

/** Мелодия B — ответ, тише и проще, чередуется с A. */
const MELODY_B: [number, number, number][][] = [
  [[0, 76, 1], [1, 79, 1], [2, 84, 2]],
  [[0, 83, 1], [1, 79, 1], [2, 74, 2]],
  [[0, 81, 0.5], [0.5, 79, 0.5], [1, 81, 1], [2, 76, 2]],
  [[0, 74, 1], [1, 72, 1], [2, 69, 2]],
  [[0, 76, 0.5], [0.5, 79, 0.5], [1, 81, 0.5], [1.5, 84, 0.5], [2, 79, 2]],
  [[0, 83, 1.5], [1.5, 79, 0.5], [2, 74, 1.5], [3.5, 71, 0.5]],
  [[0, 81, 1], [1, 76, 1], [2, 72, 1], [3, 74, 1]],
  [[0, 72, 2], [2, 71, 1], [3, 74, 1]],
]

export class Music {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private duckGain: GainNode | null = null
  private delay: DelayNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private nextBarTime = 0
  private barIndex = 0
  private running = false
  private wakeBound = (() => this.wake()) as EventListener

  /** Пользовательский тумблер. */
  enabled = true

  constructor() {
    if (typeof window !== 'undefined') {
      // Самолечение: любой жест возвращает контекст из suspended.
      window.addEventListener('pointerdown', this.wakeBound)
      window.addEventListener('keydown', this.wakeBound)
    }
  }

  /** Создаёт/будит AudioContext. Безопасно вызывать сколько угодно часто. */
  wake() {
    if (typeof window === 'undefined') return false
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return false
      this.ctx = new AC()
      this.buildGraph()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return true
  }

  private buildGraph() {
    const ctx = this.ctx!
    this.master = ctx.createGain()
    this.master.gain.value = 0.85

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 5200
    lp.Q.value = 0.3

    // Лёгкая компрессия, чтобы бас и мелодия склеились
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 12
    comp.ratio.value = 3
    comp.attack.value = 0.004
    comp.release.value = 0.2

    this.duckGain = ctx.createGain()
    this.duckGain.gain.value = 1

    // Эхо для мелодии (пунктирная восьмая)
    this.delay = ctx.createDelay(1)
    this.delay.delayTime.value = BEAT * 0.75
    const fb = ctx.createGain()
    fb.gain.value = 0.24
    const wet = ctx.createGain()
    wet.gain.value = 0.15
    this.delay.connect(fb)
    fb.connect(this.delay)
    this.delay.connect(wet)
    wet.connect(lp)

    this.master.connect(lp)
    lp.connect(comp)
    comp.connect(this.duckGain)
    this.duckGain.connect(ctx.destination)

    // Буфер шума для барабанов
    const len = Math.floor(ctx.sampleRate * 0.4)
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }

  start() {
    if (!this.enabled) return
    // ensure-до проверки running: если контекст завис suspended,
    // любой вызов start() его разбудит.
    if (!this.wake() || !this.ctx) return
    if (this.running) return
    this.running = true

    const now = this.ctx.currentTime
    // вернуть громкость после прошлого stop()
    this.master!.gain.cancelScheduledValues(now)
    this.master!.gain.setValueAtTime(0.0001, now)
    this.master!.gain.linearRampToValueAtTime(0.85, now + 0.12)

    this.nextBarTime = now + 0.06
    this.timer = setInterval(() => this.pump(), 120)
    this.pump()
  }

  /** Мгновенная пауза: планировщик стоит, хвосты гаснут за ~0.1 с. */
  stop() {
    this.running = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setValueAtTime(this.master.gain.value, now)
      this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)
    }
  }

  /** Приглушение в паузах и оверлеях: 1 — громко, 0.3 — фон. */
  setDuck(k: number) {
    if (this.duckGain && this.ctx) {
      this.duckGain.gain.setTargetAtTime(k, this.ctx.currentTime, 0.15)
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v
    if (v) this.start()
    else this.stop()
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.wakeBound)
      window.removeEventListener('keydown', this.wakeBound)
    }
    this.stop()
  }

  /** Планировщик: держит пару тактов впереди, переживает троттлинг таймеров. */
  private pump() {
    if (!this.ctx || !this.running) return
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
      return
    }
    // Контекст долго спал — не навёрстываем пропуск, а стартуем заново
    if (this.nextBarTime < this.ctx.currentTime - 0.25) {
      this.nextBarTime = this.ctx.currentTime + 0.06
    }
    while (this.nextBarTime < this.ctx.currentTime + BAR * 2 + 0.1) {
      this.scheduleBar(this.nextBarTime, this.barIndex)
      this.nextBarTime += BAR
      this.barIndex++
    }
  }

  private scheduleBar(t0: number, index: number) {
    const step = index % CHORDS.length
    const cycle = Math.floor(index / CHORDS.length) % 2
    const chord = CHORDS[step]

    this.bassLine(t0, BASS_ROOT[step])
    this.kick(t0)
    this.kick(t0 + BEAT * 2)
    this.snare(t0 + BEAT)
    this.snare(t0 + BEAT * 3)
    for (let i = 0; i < 4; i++) this.hat(t0 + BEAT * (i + 0.5), false)
    // форшаг перед следующим тактом в конце фразы
    if (step % 4 === 3) this.hat(t0 + BEAT * 3.75, true)

    // офф-битовые «сканки» — позитива добавляют именно они
    this.stab(t0 + BEAT * 1.5, chord)
    this.stab(t0 + BEAT * 3.5, chord)

    const melody = cycle === 0 ? MELODY_A : MELODY_B
    for (const [beat, note, dur] of melody[step]) {
      this.lead(t0 + beat * BEAT, midiHz(note), dur * BEAT)
    }

    // во второй половине лупа — тихое арпеджио-мерцание
    if (step >= 4) {
      const tones = [chord[0] + 24, chord[1] + 24, chord[2] + 24, chord[3] + 24]
      for (let i = 0; i < 8; i++) {
        this.sparkle(t0 + i * BEAT * 0.5, midiHz(tones[i % 4]))
      }
    }
  }

  /** Бас-пружина на восьмых. */
  private bassLine(t0: number, root: number) {
    const ctx = this.ctx!
    for (let i = 0; i < BASS_PATTERN.length; i++) {
      const t = t0 + i * BEAT * 0.5
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = midiHz(root + BASS_PATTERN[i])
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 720
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.075, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      osc.connect(lp)
      lp.connect(g)
      g.connect(this.master!)
      osc.start(t)
      osc.stop(t + 0.24)
    }
  }

  /** Короткий мажорный «сканк» на слабой доле. */
  private stab(t0: number, chord: number[]) {
    const ctx = this.ctx!
    for (const m of [chord[1], chord[2], chord[3]]) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = midiHz(m + 12)
      osc.detune.value = (Math.random() - 0.5) * 5
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(0.02, t0 + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
      osc.connect(g)
      g.connect(this.master!)
      osc.start(t0)
      osc.stop(t0 + 0.2)
    }
  }

  /** Звенящая ведущая партия с подстроенным дублем и эхом. */
  private lead(t0: number, hz: number, dur: number) {
    const ctx = this.ctx!
    for (const det of [-4, 4]) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = hz
      osc.detune.value = det
      const g = ctx.createGain()
      const vol = det === -4 ? 0.034 : 0.02
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(vol, t0 + 0.01)
      g.gain.exponentialRampToValueAtTime(vol * 0.55, t0 + Math.min(0.22, dur))
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.08)
      osc.connect(g)
      g.connect(this.master!)
      if (this.delay) g.connect(this.delay)
      osc.start(t0)
      osc.stop(t0 + dur + 0.15)
    }
  }

  /** Совсем тихое мерцание шестнадцатыми во второй фразе. */
  private sparkle(t0: number, hz: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = hz
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(0.013, t0 + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
    osc.connect(g)
    g.connect(this.master!)
    if (this.delay) g.connect(this.delay)
    osc.start(t0)
    osc.stop(t0 + 0.16)
  }

  private kick(t0: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, t0)
    osc.frequency.exponentialRampToValueAtTime(44, t0 + 0.1)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.3, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13)
    osc.connect(g)
    g.connect(this.master!)
    osc.start(t0)
    osc.stop(t0 + 0.16)
  }

  private snare(t0: number) {
    if (!this.noiseBuf) return
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1900
    bp.Q.value = 0.8
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.08, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.master!)
    src.start(t0, Math.random() * 0.2, 0.12)
  }

  private hat(t0: number, open: boolean) {
    if (!this.noiseBuf) return
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7500
    const g = ctx.createGain()
    const dur = open ? 0.09 : 0.035
    g.gain.setValueAtTime(open ? 0.05 : 0.04, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(hp)
    hp.connect(g)
    g.connect(this.master!)
    src.start(t0, Math.random() * 0.2, dur + 0.03)
  }
}
