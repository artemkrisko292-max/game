// Лёгкая фоновая музыка «ЭнергоГероя».
// Процедурный луп на Web Audio API: тёплые аккорды, синтовый бас,
// деликатная пентатоническая мелодия и едва слышные «пэды».
// Никаких внешних файлов — всё синтезируется на лету и почти не грузит CPU.

const BPM = 92
const BEAT = 60 / BPM
const BAR = BEAT * 4

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

/** Аккордовая сетка: 8 тактов, тёплая и незамысловатая. */
const CHORDS: number[][] = [
  [48, 52, 55, 59], // Cmaj7
  [45, 52, 55, 60], // Am7
  [41, 48, 52, 57], // Fmaj7
  [43, 50, 55, 59], // G6
  [48, 52, 55, 59], // Cmaj7
  [45, 52, 55, 60], // Am7
  [41, 48, 52, 57], // Fmaj7
  [43, 55, 59, 62], // G (перевод в каденцию)
]

/** Бас: тоника такта. */
const BASS: number[] = [36, 33, 29, 31, 36, 33, 29, 31]

/** Мелодия A — [доля, нота (midi), длительность в долях]. */
const MELODY_A: [number, number, number][][] = [
  [[0, 76, 1], [1, 79, 0.5], [1.5, 81, 0.5], [2, 79, 2]],
  [[0, 76, 1], [1, 74, 1], [2, 72, 2]],
  [[0, 69, 1], [1, 72, 1], [2, 76, 1], [3, 74, 1]],
  [[0, 72, 3]],
  [[0, 81, 1], [1, 79, 1], [2, 76, 2]],
  [[0, 74, 1], [1, 76, 1], [2, 79, 2]],
  [[0, 74, 1], [1, 76, 0.5], [1.5, 79, 0.5], [2, 81, 1], [3, 79, 1]],
  [[0, 76, 2], [2, 74, 1], [3, 72, 1]],
]

/** Мелодия B — реже и спокойнее, чередуется с A. */
const MELODY_B: [number, number, number][][] = [
  [[0, 67, 2], [2, 72, 2]],
  [[0, 76, 3]],
  [[0, 74, 1], [1, 72, 1], [2, 69, 2]],
  [[0, 67, 3.5]],
  [[0, 72, 1], [1, 76, 1], [2, 79, 1], [3, 76, 1]],
  [[0, 81, 2], [2, 79, 2]],
  [[0, 76, 1], [1, 74, 1], [2, 72, 1], [3, 74, 1]],
  [[0, 72, 4]],
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

  /** Пользовательский тумблер. */
  enabled = true

  private ensure() {
    if (typeof window === 'undefined') return false
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return false
      this.ctx = new AC()

      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9

      const lp = this.ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 2400
      lp.Q.value = 0.4

      this.duckGain = this.ctx.createGain()
      this.duckGain.gain.value = 1

      // Мягкое эхо для мелодии
      this.delay = this.ctx.createDelay(1)
      this.delay.delayTime.value = BEAT * 0.75
      const fb = this.ctx.createGain()
      fb.gain.value = 0.22
      const wet = this.ctx.createGain()
      wet.gain.value = 0.16
      this.delay.connect(fb)
      fb.connect(this.delay)
      this.delay.connect(wet)
      wet.connect(lp)

      this.master.connect(lp)
      lp.connect(this.duckGain)
      this.duckGain.connect(this.ctx.destination)

      // Буфер шума для «хэтов»
      const len = Math.floor(this.ctx.sampleRate * 0.4)
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = this.noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return true
  }

  start() {
    if (!this.enabled || this.running) return
    if (!this.ensure() || !this.ctx) return
    this.running = true
    this.nextBarTime = this.ctx.currentTime + 0.08
    this.barIndex = 0
    this.timer = setInterval(() => this.pump(), 90)
    this.pump()
  }

  stop() {
    this.running = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
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

  /** Планировщик: держит 2 такта впереди. */
  private pump() {
    if (!this.ctx || !this.running) return
    // Если контекст долго был suspended — не навёрстываем пропуск, а стартуем заново
    if (this.nextBarTime < this.ctx.currentTime - 0.25) {
      this.nextBarTime = this.ctx.currentTime + 0.08
    }
    while (this.nextBarTime < this.ctx.currentTime + 0.6) {
      this.scheduleBar(this.nextBarTime, this.barIndex)
      this.nextBarTime += BAR
      this.barIndex++
    }
  }

  private scheduleBar(t0: number, index: number) {
    const step = index % CHORDS.length
    const cycle = Math.floor(index / CHORDS.length) % 2
    this.pad(t0, CHORDS[step])
    this.bass(t0, BASS[step])
    const melody = cycle === 0 ? MELODY_A : MELODY_B
    for (const [beat, note, dur] of melody[step]) {
      this.pluck(t0 + beat * BEAT, midiHz(note), dur * BEAT)
    }
    // Хэты — только лёгкие, на слабые доли
    this.hat(t0 + BEAT * 1.5)
    this.hat(t0 + BEAT * 3.5)
  }

  /** Тёплый аккорд-подложка. */
  private pad(t0: number, notes: number[]) {
    const ctx = this.ctx!
    for (const m of notes) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = midiHz(m)
      osc.detune.value = (Math.random() - 0.5) * 6
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(0.016, t0 + 0.7)
      g.gain.setValueAtTime(0.016, t0 + BAR - 0.5)
      g.gain.linearRampToValueAtTime(0.0001, t0 + BAR + 0.4)
      osc.connect(g)
      g.connect(this.master!)
      osc.start(t0)
      osc.stop(t0 + BAR + 0.5)
    }
  }

  /** Синтовый бас: тоника на 1-ю долю, квинта на 3-ю. */
  private bass(t0: number, root: number) {
    const ctx = this.ctx!
    const note = (t: number, m: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = midiHz(m)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(vol, t + 0.03)
      g.gain.setValueAtTime(vol, t + dur - 0.12)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(g)
      g.connect(this.master!)
      osc.start(t)
      osc.stop(t + dur + 0.05)
    }
    note(t0, root, BEAT * 2.2, 0.075)
    note(t0 + BEAT * 2.5, root + 7, BEAT * 1.3, 0.055)
  }

  /** Мягкий «щипок» мелодии с лёгким подстроенным дублем. */
  private pluck(t0: number, hz: number, dur: number) {
    const ctx = this.ctx!
    for (const det of [0, 5]) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = hz
      osc.detune.value = det
      const g = ctx.createGain()
      const vol = det === 0 ? 0.042 : 0.02
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(vol, t0 + 0.012)
      g.gain.exponentialRampToValueAtTime(vol * 0.5, t0 + Math.min(0.25, dur))
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.12)
      osc.connect(g)
      g.connect(this.master!)
      if (this.delay) g.connect(this.delay)
      osc.start(t0)
      osc.stop(t0 + dur + 0.2)
    }
  }

  /** Едва слышный «хэт». */
  private hat(t0: number) {
    if (!this.noiseBuf) return
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7000
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.012, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05)
    src.connect(hp)
    hp.connect(g)
    g.connect(this.master!)
    src.start(t0, Math.random() * 0.2, 0.06)
  }
}
