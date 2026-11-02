// Простые звуковые эффекты на Web Audio API (без внешних файлов).

export class Sfx {
  private ctx: AudioContext | null = null
  muted = false

  ensure() {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
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
    if (this.muted || !this.ctx) return
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
    gain.connect(ctx.destination)
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
  lose() {
    const notes = [320, 230, 150, 95]
    notes.forEach((f, i) =>
      this.tone(f, f * 0.85, 0.22, 'sawtooth', 0.12, i * 0.15),
    )
  }
}
