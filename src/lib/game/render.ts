// Отрисовка игры «ЭнергоГерой» на Canvas 2D.
// Вся графика рисуется кодом: спрайты, фоны, свет, HUD.

import { EnergoGame, TILE, VIEW_W, VIEW_H } from './engine'
import { LEVELS } from './levels'
import type { ThemeName } from './levels'

interface Theme {
  skyTop: string
  skyBot: string
  wall: string
  wallTop: string
  wallDark: string
  accent: string
}

const THEMES: Record<ThemeName, Theme> = {
  bedroom: {
    skyTop: '#231a33',
    skyBot: '#473059',
    wall: '#43325a',
    wallTop: '#5d4577',
    wallDark: '#322447',
    accent: '#8f6bb0',
  },
  kitchen: {
    skyTop: '#fdf0c2',
    skyBot: '#f6d896',
    wall: '#c9713d',
    wallTop: '#e8934f',
    wallDark: '#a5562a',
    accent: '#b8622f',
  },
  basement: {
    skyTop: '#141b16',
    skyBot: '#28352b',
    wall: '#3a463d',
    wallTop: '#526254',
    wallDark: '#2b362e',
    accent: '#6d8a6f',
  },
  living: {
    skyTop: '#22304f',
    skyBot: '#4a5f80',
    wall: '#6b4a35',
    wallTop: '#8a6248',
    wallDark: '#523728',
    accent: '#a5754f',
  },
  attic: {
    skyTop: '#33222a',
    skyBot: '#6b4a4a',
    wall: '#7a4a3a',
    wallTop: '#9a6450',
    wallDark: '#5c3628',
    accent: '#b5825f',
  },
  office: {
    skyTop: '#1a2230',
    skyBot: '#2e3a4e',
    wall: '#46536b',
    wallTop: '#5d6d8a',
    wallDark: '#333e52',
    accent: '#7688a8',
  },
}

export function render(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  const theme = THEMES[LEVELS[g.levelIndex].theme]
  ctx.clearRect(0, 0, VIEW_W, VIEW_H)
  ctx.save()

  // Тряска камеры
  if (g.shake > 0.3) {
    ctx.translate(
      (Math.random() - 0.5) * g.shake,
      (Math.random() - 0.5) * g.shake,
    )
  }

  drawBackground(ctx, g, theme)

  ctx.save()
  ctx.translate(-Math.round(g.camX), -Math.round(g.camY))

  drawTiles(ctx, g, theme)
  drawHazards(ctx, g)
  drawSwitches(ctx, g)
  drawExit(ctx, g)
  drawLampCones(ctx, g)
  drawBulbs(ctx, g)
  drawPlats(ctx, g)
  drawVampires(ctx, g)
  drawPhantoms(ctx, g)
  drawPlayer(ctx, g)
  drawParticles(ctx, g)
  drawLampGlows(ctx, g)

  ctx.restore()
  ctx.restore()

  drawHUD(ctx, g)
}

// ---------- Фон и параллакс ----------

function drawBackground(
  ctx: CanvasRenderingContext2D,
  g: EnergoGame,
  th: Theme,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H)
  grad.addColorStop(0, th.skyTop)
  grad.addColorStop(1, th.skyBot)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  // Одна и та же «комната» рисуется одним из трёх художников фона,
  // палитру задаёт тема уровня.
  const name = LEVELS[g.levelIndex].theme
  const painter =
    name === 'bedroom' || name === 'attic'
      ? drawBedroomBg
      : name === 'kitchen' || name === 'living'
        ? drawKitchenBg
        : drawBasementBg
  painter(ctx, g)
}

function wrapX(i: number, camX: number, k: number, span: number): number {
  const m = (i * 137.13 - camX * k) % span
  return (m < 0 ? m + span : m) - 60
}

function drawBedroomBg(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  // Звёзды
  ctx.fillStyle = 'rgba(255,240,210,0.8)'
  for (let i = 0; i < 46; i++) {
    const x = wrapX(i * 89, g.camX, 0.22, VIEW_W + 120)
    const y = (i * 53) % 260
    const s = 1 + ((i * 7) % 3) * 0.5
    const tw = 0.5 + 0.5 * Math.sin(g.frame * 0.04 + i * 1.7)
    ctx.globalAlpha = 0.35 + tw * 0.5
    ctx.fillRect(x, y, s, s)
  }
  ctx.globalAlpha = 1

  // Луна
  const mx = VIEW_W * 0.8 - g.camX * 0.08
  const mg = ctx.createRadialGradient(mx, 92, 8, mx, 92, 70)
  mg.addColorStop(0, 'rgba(255,236,180,0.5)')
  mg.addColorStop(1, 'rgba(255,236,180,0)')
  ctx.fillStyle = mg
  ctx.fillRect(mx - 70, 22, 140, 140)
  ctx.fillStyle = '#f7e6ae'
  ctx.beginPath()
  ctx.arc(mx, 92, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(214,190,130,0.7)'
  ctx.beginPath()
  ctx.arc(mx - 8, 86, 5, 0, Math.PI * 2)
  ctx.arc(mx + 9, 99, 4, 0, Math.PI * 2)
  ctx.fill()

  // Полосы обоев
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 26
  for (let i = 0; i < 14; i++) {
    const x = wrapX(i * 150, g.camX, 0.45, VIEW_W + 300)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, VIEW_H)
    ctx.stroke()
  }
}

function drawKitchenBg(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  // Солнце
  const mx = VIEW_W * 0.82 - g.camX * 0.06
  const sg = ctx.createRadialGradient(mx, 80, 10, mx, 80, 90)
  sg.addColorStop(0, 'rgba(255,214,110,0.65)')
  sg.addColorStop(1, 'rgba(255,214,110,0)')
  ctx.fillStyle = sg
  ctx.fillRect(mx - 90, -10, 180, 180)
  ctx.fillStyle = '#ffd66b'
  ctx.beginPath()
  ctx.arc(mx, 80, 30, 0, Math.PI * 2)
  ctx.fill()

  // Окна
  for (let i = 0; i < 4; i++) {
    const x = wrapX(i * 420 + 120, g.camX, 0.35, VIEW_W + 800)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    rr(ctx, x, 60, 150, 170, 10)
    ctx.fill()
    ctx.fillStyle = 'rgba(180,220,170,0.65)'
    rr(ctx, x + 8, 68, 134, 154, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(120,90,50,0.5)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(x + 75, 68)
    ctx.lineTo(x + 75, 222)
    ctx.moveTo(x + 8, 145)
    ctx.lineTo(x + 142, 145)
    ctx.stroke()
  }

  // Фартук из плитки внизу
  ctx.strokeStyle = 'rgba(150,95,45,0.16)'
  ctx.lineWidth = 2
  for (let i = 0; i < 26; i++) {
    const x = wrapX(i * 60, g.camX, 0.6, VIEW_W + 200)
    for (let r = 0; r < 4; r++) {
      ctx.strokeRect(x, 330 + r * 44, 56, 40)
    }
  }
}

function drawBasementBg(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  // Трубы
  for (const py of [110, 250]) {
    ctx.fillStyle = 'rgba(90,110,95,0.5)'
    ctx.fillRect(0, py, VIEW_W, 16)
    ctx.fillStyle = 'rgba(60,75,64,0.6)'
    ctx.fillRect(0, py + 12, VIEW_W, 4)
    for (let i = 0; i < 8; i++) {
      const x = wrapX(i * 260, g.camX, 0.4, VIEW_W + 500)
      ctx.fillStyle = 'rgba(110,130,115,0.6)'
      ctx.fillRect(x, py - 4, 18, 24)
    }
  }
  // Зелёное свечение
  for (let i = 0; i < 5; i++) {
    const x = wrapX(i * 380 + 90, g.camX, 0.3, VIEW_W + 600)
    const gl = ctx.createRadialGradient(x, 400, 5, x, 400, 90)
    gl.addColorStop(0, 'rgba(140,230,140,0.10)')
    gl.addColorStop(1, 'rgba(140,230,140,0)')
    ctx.fillStyle = gl
    ctx.fillRect(x - 90, 310, 180, 180)
  }
}

// ---------- Тайлы ----------

function hash2(c: number, r: number): number {
  return ((c * 73856093) ^ (r * 19349663)) % 1000 / 1000
}

function drawTiles(
  ctx: CanvasRenderingContext2D,
  g: EnergoGame,
  th: Theme,
) {
  const c0 = Math.max(0, Math.floor(g.camX / TILE) - 1)
  const c1 = Math.min(g.cols - 1, Math.ceil((g.camX + VIEW_W) / TILE) + 1)
  const r0 = Math.max(0, Math.floor(g.camY / TILE) - 1)
  const r1 = Math.min(g.rows - 1, Math.ceil((g.camY + VIEW_H) / TILE) + 1)

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (g.grid[r * g.cols + c] !== 1) continue
      const x = c * TILE
      const y = r * TILE
      ctx.fillStyle = th.wall
      ctx.fillRect(x, y, TILE, TILE)

      // Тёмный низ
      if (r + 1 >= g.rows || g.grid[(r + 1) * g.cols + c] !== 1) {
        ctx.fillStyle = th.wallDark
        ctx.fillRect(x, y + TILE - 6, TILE, 6)
      }
      // Светлый верх
      if (r === 0 || g.grid[(r - 1) * g.cols + c] !== 1) {
        ctx.fillStyle = th.wallTop
        ctx.fillRect(x, y, TILE, 7)
        ctx.fillStyle = th.accent
        ctx.fillRect(x, y + 7, TILE, 2)
      }
      // Пятнышки/шов
      const h = hash2(c, r)
      ctx.fillStyle = th.wallDark
      ctx.globalAlpha = 0.35
      if (h < 0.3) {
        ctx.fillRect(x + 6 + h * 60, y + 12 + h * 40, 8, 4)
      } else if (h < 0.55) {
        ctx.fillRect(x + 24, y + 8 + h * 30, 4, 10)
      } else if (h < 0.75) {
        ctx.fillRect(x + 4, y + 22, 12, 3)
      }
      ctx.globalAlpha = 1
      // Тонкая рамка
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1)
    }
  }
}

// ---------- Объекты ----------

function drawBulbs(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const b of g.bulbs) {
    if (b.taken) continue
    const y = b.y + Math.sin(g.frame * 0.05 + b.phase) * 4
    const gl = ctx.createRadialGradient(b.x, y, 2, b.x, y, 22)
    gl.addColorStop(0, 'rgba(255,232,130,0.55)')
    gl.addColorStop(1, 'rgba(255,232,130,0)')
    ctx.fillStyle = gl
    ctx.fillRect(b.x - 22, y - 22, 44, 44)

    ctx.fillStyle = '#fff6c9'
    ctx.strokeStyle = '#d9a441'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(b.x, y - 2, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#c8cdd2'
    rr(ctx, b.x - 4, y + 5, 8, 5, 1.5)
    ctx.fill()
    // Нить накала
    ctx.strokeStyle = '#e8b23d'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(b.x - 3, y + 1)
    ctx.quadraticCurveTo(b.x, y - 5, b.x + 3, y + 1)
    ctx.stroke()
    // Блик-звёздочка
    const a = 0.5 + 0.5 * Math.sin(g.frame * 0.1 + b.phase * 2)
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + a * 0.5})`
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(b.x + 6, y - 10)
    ctx.lineTo(b.x + 6, y - 16)
    ctx.moveTo(b.x + 3, y - 13)
    ctx.lineTo(b.x + 9, y - 13)
    ctx.stroke()
  }
}

function drawLampCones(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const l of g.lamps) {
    drawLamp(ctx, g, l.x, l.y, l.on)
  }
}

function drawLampGlows(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const l of g.lamps) {
    if (!l.on) continue
    const flicker = 1 + Math.sin(g.frame * 0.21 + l.x) * 0.06
    const gl = ctx.createRadialGradient(l.x, l.y + 8, 3, l.x, l.y + 8, 34)
    gl.addColorStop(0, `rgba(255,224,130,${0.4 * flicker})`)
    gl.addColorStop(1, 'rgba(255,224,130,0)')
    ctx.fillStyle = gl
    ctx.fillRect(l.x - 34, l.y - 26, 68, 68)
  }
}

function drawLamp(
  ctx: CanvasRenderingContext2D,
  g: EnergoGame,
  x: number,
  y: number,
  on: boolean,
) {
  // Провод
  ctx.strokeStyle = 'rgba(30,28,26,0.85)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, y - 14)
  ctx.stroke()

  if (on) {
    const len = 420
    const flick = 0.16 + Math.sin(g.frame * 0.18 + x * 0.7) * 0.02
    const grad = ctx.createLinearGradient(0, y, 0, y + len)
    grad.addColorStop(0, `rgba(255,216,110,${flick + 0.1})`)
    grad.addColorStop(1, 'rgba(255,216,110,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(x - 14, y + 6)
    ctx.lineTo(x + 14, y + 6)
    ctx.lineTo(x + 16 + len * 0.34, y + len)
    ctx.lineTo(x - 16 - len * 0.34, y + len)
    ctx.closePath()
    ctx.fill()
  }

  // Плафон
  ctx.fillStyle = on ? '#4a4150' : '#4c4c52'
  ctx.beginPath()
  ctx.moveTo(x - 10, y - 14)
  ctx.lineTo(x + 10, y - 14)
  ctx.lineTo(x + 17, y + 2)
  ctx.lineTo(x - 17, y + 2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Лампочка
  ctx.fillStyle = on ? '#ffdf8a' : '#83838a'
  ctx.beginPath()
  ctx.arc(x, y + 7, 6, 0, Math.PI * 2)
  ctx.fill()
  if (on) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(x - 1.5, y + 5.5, 2.6, Math.PI * 0.9, Math.PI * 1.6)
    ctx.stroke()
  }
}

function drawSwitches(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const s of g.switches) {
    const x = s.x
    const y = s.y
    // Корпус
    ctx.fillStyle = '#3c3c44'
    rr(ctx, x - 14, y - 36, 28, 36, 4)
    ctx.fill()
    ctx.strokeStyle = '#23232a'
    ctx.lineWidth = 2
    ctx.stroke()
    // Индикатор
    ctx.fillStyle = s.flipped ? '#63d471' : '#ff5a4e'
    ctx.beginPath()
    ctx.arc(x, y - 29, 3, 0, Math.PI * 2)
    ctx.fill()
    // Рычаг
    ctx.strokeStyle = '#c8cdd2'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y - 16)
    ctx.lineTo(x, s.flipped ? y - 7 : y - 25)
    ctx.stroke()
    ctx.fillStyle = s.flipped ? '#63d471' : '#ff5a4e'
    ctx.beginPath()
    ctx.arc(x, s.flipped ? y - 7 : y - 25, 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineCap = 'butt'

    if (!s.flipped) {
      // Подсказка — прыгающая стрелка
      const bob = Math.sin(g.frame * 0.12) * 3.5
      ctx.fillStyle = '#ffe873'
      ctx.beginPath()
      ctx.moveTo(x - 9, y - 50 + bob)
      ctx.lineTo(x + 9, y - 50 + bob)
      ctx.lineTo(x, y - 40 + bob)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
}

function drawExit(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  const x = g.exit.x
  const y = g.exit.y
  // Шкаф щитка
  ctx.fillStyle = '#2e4632'
  rr(ctx, x, y - 56, 36, 56, 5)
  ctx.fill()
  ctx.strokeStyle = '#1a2b1e'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.fillStyle = '#3c5a42'
  rr(ctx, x + 5, y - 50, 26, 44, 3)
  ctx.fill()
  // Молния
  ctx.fillStyle = '#ffe14d'
  ctx.beginPath()
  ctx.moveTo(x + 21, y - 47)
  ctx.lineTo(x + 12, y - 32)
  ctx.lineTo(x + 18, y - 32)
  ctx.lineTo(x + 14, y - 19)
  ctx.lineTo(x + 25, y - 36)
  ctx.lineTo(x + 18, y - 36)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,90,0,0.6)'
  ctx.lineWidth = 1
  ctx.stroke()
  // Лампочка-индикатор
  const blink = Math.sin(g.frame * 0.09) > 0
  ctx.fillStyle = blink ? '#8df08a' : '#3f6b3f'
  ctx.beginPath()
  ctx.arc(x + 18, y - 9, 3.2, 0, Math.PI * 2)
  ctx.fill()
  // Стрелка
  const bob = Math.sin(g.frame * 0.1) * 4
  ctx.fillStyle = '#8df08a'
  ctx.beginPath()
  ctx.moveTo(x + 8, y - 72 + bob)
  ctx.lineTo(x + 28, y - 72 + bob)
  ctx.lineTo(x + 18, y - 61 + bob)
  ctx.closePath()
  ctx.fill()
}

function drawHazards(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const h of g.hazards) {
    const x = h.x
    const y = h.y
    ctx.fillStyle = '#3a3a3f'
    rr(ctx, x - 14, y - 30, 28, 30, 4)
    ctx.fill()
    ctx.strokeStyle = '#202024'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#17171a'
    rr(ctx, x - 6, y - 22, 4, 12, 2)
    ctx.fill()
    rr(ctx, x + 3, y - 22, 4, 12, 2)
    ctx.fill()
    // Искры
    if ((g.frame + Math.floor(x)) % 110 < 9) {
      const gl = ctx.createRadialGradient(x, y - 20, 2, x, y - 20, 26)
      gl.addColorStop(0, 'rgba(255,230,120,0.7)')
      gl.addColorStop(1, 'rgba(255,230,120,0)')
      ctx.fillStyle = gl
      ctx.fillRect(x - 26, y - 46, 52, 52)
      ctx.strokeStyle = '#ffe14d'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x - 6, y - 24)
      ctx.lineTo(x + 2, y - 34)
      ctx.lineTo(x - 3, y - 36)
      ctx.lineTo(x + 6, y - 46)
      ctx.stroke()
    }
  }
}

function drawPlats(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const pl of g.plats) {
    const grad = ctx.createLinearGradient(0, pl.y, 0, pl.y + pl.h)
    grad.addColorStop(0, '#9aa89e')
    grad.addColorStop(1, '#5f6d64')
    ctx.fillStyle = grad
    rr(ctx, pl.x, pl.y, pl.w, pl.h, 4)
    ctx.fill()
    ctx.strokeStyle = '#3d4a42'
    ctx.lineWidth = 2
    ctx.stroke()
    // Стрелки движения
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    const wob = Math.sin(g.frame * 0.08) * 2
    ctx.beginPath()
    ctx.moveTo(pl.x + 12 + wob, pl.y + 4)
    ctx.lineTo(pl.x + 20 + wob, pl.y + 8)
    ctx.lineTo(pl.x + 12 + wob, pl.y + 12)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(pl.x + pl.w - 12 - wob, pl.y + 4)
    ctx.lineTo(pl.x + pl.w - 20 - wob, pl.y + 8)
    ctx.lineTo(pl.x + pl.w - 12 - wob, pl.y + 12)
    ctx.closePath()
    ctx.fill()
  }
}

// ---------- Персонажи ----------

function drawPlayer(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  const p = g.player
  if (p.invuln > 0 && Math.floor(g.frame / 4) % 2 === 0) {
    ctx.globalAlpha = 0.35
  }
  const cx = p.x + p.w / 2
  const feetY = p.y + p.h
  const sy = p.squash
  const sx = 2 - p.squash

  ctx.save()
  ctx.translate(cx, feetY)
  ctx.scale(sx, sy)

  // Плащ: рисуется за спиной, развевается против направления взгляда
  const wave = Math.sin(g.frame * 0.25) * 3
  const f = p.facing
  ctx.fillStyle = '#3fae5f'
  ctx.beginPath()
  ctx.moveTo(-2 * f, -30)
  ctx.quadraticCurveTo((-16 - wave) * f, -22, (-12 - wave) * f, -4)
  ctx.lineTo(-4 * f, -8)
  ctx.closePath()
  ctx.fill()

  // Свечение
  const gl = ctx.createRadialGradient(0, -24, 4, 0, -24, 30)
  gl.addColorStop(0, 'rgba(255,232,140,0.4)')
  gl.addColorStop(1, 'rgba(255,232,140,0)')
  ctx.fillStyle = gl
  ctx.fillRect(-30, -54, 60, 60)

  // Ножки
  const run = p.onGround ? Math.sin(p.anim) * 5 : 2
  const lift = p.onGround ? Math.abs(Math.cos(p.anim)) * 2 : 0
  ctx.strokeStyle = '#7a5a18'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4, -8)
  ctx.lineTo(-4 - run, -1 - lift)
  ctx.moveTo(4, -8)
  ctx.lineTo(4 + run, -1 - (p.onGround ? 0 : 2))
  ctx.stroke()
  ctx.lineCap = 'butt'

  // Цоколь
  ctx.fillStyle = '#b9bec4'
  rr(ctx, -7, -14, 14, 8, 2)
  ctx.fill()
  ctx.strokeStyle = '#8b9198'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-7, -11)
  ctx.lineTo(7, -11)
  ctx.moveTo(-7, -8.5)
  ctx.lineTo(7, -8.5)
  ctx.stroke()

  // Колба
  const bg = ctx.createRadialGradient(-4, -30, 3, 0, -25, 16)
  bg.addColorStop(0, '#fffbd8')
  bg.addColorStop(0.55, '#ffe37a')
  bg.addColorStop(1, '#f5b93c')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(0, -25, 13.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(140,95,15,0.55)'
  ctx.lineWidth = 1.6
  ctx.stroke()

  // Лицо
  const fx = p.facing * 2.5
  if (p.blink > 0) {
    ctx.strokeStyle = '#4a3208'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(fx - 6.5, -28)
    ctx.lineTo(fx - 2.5, -28)
    ctx.moveTo(fx + 2.5, -28)
    ctx.lineTo(fx + 6.5, -28)
    ctx.stroke()
  } else {
    const py = clampF(p.vy * 0.22, -2, 2)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(fx - 4.5, -28, 3.1, 0, Math.PI * 2)
    ctx.arc(fx + 4.5, -28, 3.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#33230a'
    ctx.beginPath()
    ctx.arc(fx - 4.5 + p.facing * 1.1, -28 + py, 1.7, 0, Math.PI * 2)
    ctx.arc(fx + 4.5 + p.facing * 1.1, -28 + py, 1.7, 0, Math.PI * 2)
    ctx.fill()
  }
  // Улыбка
  ctx.strokeStyle = '#4a3208'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(fx, -22, 4.2, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  // Щёчки
  ctx.fillStyle = 'rgba(255,120,110,0.45)'
  ctx.beginPath()
  ctx.arc(fx - 7.5, -22.5, 2.2, 0, Math.PI * 2)
  ctx.arc(fx + 7.5, -22.5, 2.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
  ctx.globalAlpha = 1
}

function drawVampires(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const v of g.vampires) {
    if (v.dead) continue
    const cx = v.x + v.w / 2
    const bob = Math.sin(v.anim * 2.2) * 2
    const cy = v.y + 18 + bob
    const dir = Math.sign(v.vx) || 1

    // Плащ
    const flap = Math.sin(v.anim * 3) * 4
    ctx.fillStyle = '#7a1f2b'
    ctx.beginPath()
    ctx.moveTo(cx, cy - 12)
    ctx.quadraticCurveTo(cx - 20, cy - 2 + flap, cx - 16, cy + 16)
    ctx.lineTo(cx, cy + 10)
    ctx.lineTo(cx + 16, cy + 16)
    ctx.quadraticCurveTo(cx + 20, cy - 2 - flap, cx, cy - 12)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#4d1219'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Тело
    const bg = ctx.createRadialGradient(cx - 4, cy - 6, 3, cx, cy, 18)
    bg.addColorStop(0, '#55406b')
    bg.addColorStop(1, '#33244a')
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.ellipse(cx, cy + 2, 13, 16, 0, 0, Math.PI * 2)
    ctx.fill()
    // Ушки-крылышки
    ctx.fillStyle = '#33244a'
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy - 8)
    ctx.lineTo(cx - 20, cy - 16 - flap)
    ctx.lineTo(cx - 8, cy - 14)
    ctx.closePath()
    ctx.moveTo(cx + 12, cy - 8)
    ctx.lineTo(cx + 20, cy - 16 + flap)
    ctx.lineTo(cx + 8, cy - 14)
    ctx.closePath()
    ctx.fill()

    // Глаза
    const ex = dir * 2
    ctx.fillStyle = '#ff4d40'
    ctx.beginPath()
    ctx.arc(cx - 4.5 + ex, cy - 6, 2.6, 0, Math.PI * 2)
    ctx.arc(cx + 4.5 + ex, cy - 6, 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2a0d0d'
    ctx.beginPath()
    ctx.arc(cx - 4.5 + ex + dir, cy - 6, 1.1, 0, Math.PI * 2)
    ctx.arc(cx + 4.5 + ex + dir, cy - 6, 1.1, 0, Math.PI * 2)
    ctx.fill()
    // Брови
    ctx.strokeStyle = '#1d0f22'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(cx - 8 + ex, cy - 11)
    ctx.lineTo(cx - 2 + ex, cy - 8.6)
    ctx.moveTo(cx + 8 + ex, cy - 11)
    ctx.lineTo(cx + 2 + ex, cy - 8.6)
    ctx.stroke()

    // Рот с клыками
    ctx.fillStyle = '#1d0f22'
    ctx.beginPath()
    ctx.ellipse(cx + ex, cy + 3, 4.5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(cx - 3.4 + ex, cy + 1.6)
    ctx.lineTo(cx - 1.6 + ex, cy + 1.6)
    ctx.lineTo(cx - 2.5 + ex, cy + 4.4)
    ctx.closePath()
    ctx.moveTo(cx + 1.6 + ex, cy + 1.6)
    ctx.lineTo(cx + 3.4 + ex, cy + 1.6)
    ctx.lineTo(cx + 2.5 + ex, cy + 4.4)
    ctx.closePath()
    ctx.fill()
  }
}

function drawPhantoms(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const f of g.phantoms) {
    if (f.dead) continue
    const t = g.frame * 0.06
    // Шлейф
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#d8f3dd'
    ctx.beginPath()
    ctx.arc(f.x - Math.cos(f.phase) * 10, f.y + 4, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.82 + Math.sin(t * 2) * 0.08

    // Тело призрака
    ctx.fillStyle = '#e2f6e6'
    ctx.beginPath()
    ctx.arc(f.x, f.y - 2, 14, Math.PI, 0)
    const wob = Math.sin(t) * 2
    ctx.quadraticCurveTo(f.x + 14, f.y + 8, f.x + 11, f.y + 14 + wob)
    ctx.quadraticCurveTo(f.x + 7, f.y + 9, f.x + 3.5, f.y + 15 - wob)
    ctx.quadraticCurveTo(f.x, f.y + 10, f.x - 3.5, f.y + 15 + wob)
    ctx.quadraticCurveTo(f.x - 7, f.y + 9, f.x - 11, f.y + 14 - wob)
    ctx.quadraticCurveTo(f.x - 14, f.y + 8, f.x - 14, f.y - 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(110,160,120,0.7)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Глаза
    ctx.fillStyle = '#274032'
    ctx.beginPath()
    ctx.ellipse(f.x - 5, f.y - 4, 2.6, 4, 0, 0, Math.PI * 2)
    ctx.ellipse(f.x + 5, f.y - 4, 2.6, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    // Рот-oh
    ctx.beginPath()
    ctx.ellipse(f.x, f.y + 4, 2.6, 3.6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

// ---------- Частицы ----------

function drawParticles(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const q of g.particles) {
    const a = q.life / q.maxLife
    ctx.globalAlpha = Math.max(0, Math.min(1, a))
    if (q.kind === 'star') {
      ctx.save()
      ctx.translate(q.x, q.y)
      ctx.rotate(q.life * 0.2)
      ctx.fillStyle = q.color
      const s = q.size * 1.6
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? s : s * 0.42
        const ang = (i / 8) * Math.PI * 2
        const px = Math.cos(ang) * r
        const py = Math.sin(ang) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else if (q.kind === 'spark') {
      ctx.strokeStyle = q.color
      ctx.lineWidth = q.size * 0.6
      ctx.beginPath()
      ctx.moveTo(q.x, q.y)
      ctx.lineTo(q.x - q.vx * 2.4, q.y - q.vy * 2.4)
      ctx.stroke()
    } else {
      ctx.fillStyle = q.color
      ctx.beginPath()
      ctx.arc(q.x, q.y, q.size * (q.kind === 'poof' ? 1 + (1 - a) * 1.6 : 1), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

// ---------- HUD ----------

function fnt(size: number, weight = 700): string {
  return `${weight} ${size}px Nunito, "Segoe UI", system-ui, sans-serif`
}

function drawHUD(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  // Энергия
  const bx = 46
  const by = 16
  const bw = 220
  const bh = 20
  const pct = Math.max(0, Math.min(1, g.energy / 100))
  const low = pct < 0.25

  ctx.fillStyle = 'rgba(8,14,8,0.55)'
  rr(ctx, bx - 6, by - 4, bw + 26, bh + 8, 10)
  ctx.fill()

  // Молния
  ctx.fillStyle = '#ffe14d'
  ctx.beginPath()
  ctx.moveTo(bx + 6, by - 1)
  ctx.lineTo(bx - 2, by + 10)
  ctx.lineTo(bx + 4, by + 10)
  ctx.lineTo(bx + 1, by + 18)
  ctx.lineTo(bx + 10, by + 7)
  ctx.lineTo(bx + 4, by + 7)
  ctx.closePath()
  ctx.fill()

  rr(ctx, bx + 14, by, bw, bh, 8)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fill()
  if (pct > 0.01) {
    const hue = 4 + pct * 106 // 4=красный … 110=зелёный
    const grad = ctx.createLinearGradient(0, by, 0, by + bh)
    grad.addColorStop(0, `hsl(${hue} 80% 58%)`)
    grad.addColorStop(1, `hsl(${hue} 75% 42%)`)
    ctx.fillStyle = grad
    rr(ctx, bx + 14, by, Math.max(6, bw * pct), bh, 8)
    ctx.fill()
  }
  if (low) {
    ctx.strokeStyle = `rgba(255,70,60,${0.55 + 0.4 * Math.sin(g.frame * 0.25)})`
    ctx.lineWidth = 2.5
    rr(ctx, bx + 14, by, bw, bh, 8)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = fnt(11, 800)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText('ЭНЕРГИЯ', bx + 22, by + bh / 2 + 0.5)

  // Счёт и лампочки (справа)
  ctx.textAlign = 'right'
  ctx.font = fnt(20, 800)
  ctx.fillStyle = '#fff'
  ctx.fillText(String(g.score), VIEW_W - 48, 26)
  // Звезда
  ctx.fillStyle = '#ffd94d'
  drawStar(ctx, VIEW_W - 34, 24, 9, 5)
  // Лампочки
  ctx.font = fnt(15, 800)
  ctx.fillStyle = '#ffe37a'
  ctx.fillText(`${g.bulbsGot}/${g.bulbsTotal}`, VIEW_W - 48, 48)
  ctx.fillStyle = '#fff6c9'
  ctx.beginPath()
  ctx.arc(VIEW_W - 96, 44, 5.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c8cdd2'
  rr(ctx, VIEW_W - 99, 48.5, 6, 3.5, 1)
  ctx.fill()

  // Название уровня
  const def = LEVELS[g.levelIndex]
  ctx.font = fnt(13, 800)
  const label = `${def.subtitle} · ${def.name.toUpperCase()}`
  const tw = ctx.measureText(label).width
  ctx.fillStyle = 'rgba(8,14,8,0.45)'
  rr(ctx, VIEW_W / 2 - tw / 2 - 12, 14, tw + 24, 24, 12)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.textAlign = 'center'
  ctx.fillText(label, VIEW_W / 2, 27)

  // Красная виньетка при низкой энергии
  if (pct < 0.3 && g.phase === 'playing') {
    const a = (1 - pct / 0.3) * (0.28 + 0.1 * Math.sin(g.frame * 0.2))
    const vg = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.32,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.75,
    )
    vg.addColorStop(0, 'rgba(200,30,20,0)')
    vg.addColorStop(1, `rgba(200,30,20,${Math.max(0, a)})`)
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const ang = -Math.PI / 2 + (i / 10) * Math.PI * 2
    const px = cx + Math.cos(ang) * r
    const py = cy + Math.sin(ang) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function clampF(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

// ---------- Утилиты ----------

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}
