// Простые звуковые эффекты на Web Audio API (без внешних файлов).
// Все тоны идут через общий мастер-гейн: переключение «звук выкл»
// глушит даже уже запланированные ноты — мгновенно и без хвостов.

export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private mutedFlag = false

  get muted() {
    return this.mutedFlag
  }

  set muted(v: boolean) {
    this.mutedFlag = v
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setValueAtTime(
        Math.max(0.0001, this.master.gain.value),
        now,
      )
      this.master.gain.linearRampToValueAtTime(v ? 0.0001 : 1, now + 0.04)
    }
  }

  ensure() {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.mutedFlag ? 0.0001 : 1
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
  }

  private tone(
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    vol = 0.12,
    delay = 0,
  ) {
    if (this.mutedFlag || !this.ctx || !this.master) return
    // Контекст ещё не разбужен жестом: не копим «залп» устаревших нот.
    if (this.ctx.state !== 'running') {
      void this.ctx.resume()
      return
    }
    const ctx = this.ctx
    const t0 = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(20, f0), t0)
    if (f1 !== f0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur)
    }
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  jump() {
    this.tone(300, 560, 0.14, 'square', 0.07)
  }
  collect() {
    this.tone(720, 720, 0.07, 'sine', 0.12)
    this.tone(1080, 1080, 0.1, 'sine', 0.1, 0.07)
  }
  flip() {
    this.tone(190, 90, 0.12, 'square', 0.14)
    this.tone(1250, 900, 0.06, 'square', 0.05, 0.03)
  }
  hurt() {
    this.tone(220, 70, 0.28, 'sawtooth', 0.15)
  }
  stomp() {
    this.tone(170, 60, 0.16, 'square', 0.13)
  }
  land() {
    this.tone(150, 100, 0.07, 'triangle', 0.06)
  }
  win() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => this.tone(f, f, 0.18, 'triangle', 0.13, i * 0.11))
  }
  /** Дверь заперта: короткий низкий «отказ». */
  deny() {
    this.tone(140, 110, 0.12, 'square', 0.09)
    this.tone(110, 90, 0.14, 'square', 0.08, 0.1)
  }
  /** Предохранитель вставлен: восходящий аккорд. */
  unlock() {
    const notes = [440, 554, 659, 880]
    notes.forEach((f, i) => this.tone(f, f, 0.12, 'square', 0.08, i * 0.07))
  }
  /** Плита осыпалась: шумовой обвал. */
  crumble() {
    this.tone(180, 45, 0.3, 'sawtooth', 0.11)
    this.tone(90, 40, 0.22, 'square', 0.07, 0.05)
  }
  /** Хлопок салюта: короткий мягкий «поп». */
  pop() {
    this.tone(520, 160, 0.09, 'triangle', 0.05)
  }
  lose() {
    const notes = [320, 230, 150, 95]
    notes.forEach((f, i) =>
      this.tone(f, f * 0.85, 0.22, 'sawtooth', 0.12, i * 0.15),
    )
  }
}
