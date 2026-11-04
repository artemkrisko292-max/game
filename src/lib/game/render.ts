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
    skyTop: '#241c12',
    skyBot: '#4c3a24',
    wall: '#5d4630',
    wallTop: '#7d5f40',
    wallDark: '#42311e',
    accent: '#b08d57',
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

  // Мебель — ЗА геометрией уровня, приглушённая: читается задним планом
  drawDecor(ctx, g)
  // Воздушная дымка: весь тыл сцены (фон + интерьер) тонет в цвете комнаты,
  // а геометрия, герой и объекты поверх остаются яркими — иерархия читается сразу
  drawDepthWash(ctx, g, theme)
  drawTiles(ctx, g, theme)
  drawHazards(ctx, g)
  drawSwitches(ctx, g)
  drawExit(ctx, g)
  drawLampCones(ctx, g)
  drawBulbs(ctx, g)
  drawFuses(ctx, g)
  drawPlats(ctx, g)
  drawCrumbs(ctx, g)
  drawVampires(ctx, g)
  drawRunners(ctx, g)
  drawPhantoms(ctx, g)
  drawDrones(ctx, g)
  drawPlayer(ctx, g)
  drawParticles(ctx, g)
  drawLampGlows(ctx, g)

  ctx.restore()
  ctx.restore()

  // Пылинки в воздухе — комната живая
  drawAmbient(ctx, g)
  drawHUD(ctx, g)
}

/**
 * Дымка глубины: заливка видимой области полупрозрачным цветом комнаты.
 * Идёт ПОСЛЕ фона и интерьера, но ДО геометрии — тыл сцены становится
 * тусклее и «дальше», а игровые объекты выделяются контрастом.
 */
function drawDepthWash(
  ctx: CanvasRenderingContext2D,
  g: EnergoGame,
  th: Theme,
) {
  ctx.fillStyle = th.skyTop
  ctx.globalAlpha = 0.2
  ctx.fillRect(g.camX - 4, g.camY - 4, VIEW_W + 8, VIEW_H + 8)
  ctx.fillStyle = 'rgba(8,6,14,0.1)'
  ctx.fillRect(g.camX - 4, g.camY - 4, VIEW_W + 8, VIEW_H + 8)
  ctx.globalAlpha = 1
}

/** Медленно дрейфующие пылинки (экранное пространство). */
function drawAmbient(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (let i = 0; i < 24; i++) {
    const sp = 0.1 + (i % 5) * 0.045
    const span = VIEW_W + 60
    const x =
      ((((i * 163 + g.frame * sp - g.camX * 0.25) % span) + span) % span) - 30
    const vspan = VIEW_H + 40
    const y =
      ((((i * 97 - g.frame * (0.14 + (i % 3) * 0.05)) % vspan) + vspan) %
        vspan) -
      20 +
      Math.sin(g.frame * 0.01 + i * 1.9) * 12
    const a = 0.035 + 0.045 * (0.5 + 0.5 * Math.sin(g.frame * 0.025 + i * 2.4))
    ctx.fillStyle = `rgba(255,240,200,${a.toFixed(3)})`
    ctx.fillRect(x, y, 1.7, 1.7)
  }
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

  // Каждой теме — свой художник фона: комната читается сразу.
  const name = LEVELS[g.levelIndex].theme
  switch (name) {
    case 'bedroom':
      drawBedroomBg(ctx, g)
      break
    case 'kitchen':
      drawKitchenBg(ctx, g)
      break
    case 'basement':
      drawBasementBg(ctx, g)
      break
    case 'living':
      drawLivingBg(ctx, g)
      break
    case 'attic':
      drawAtticBg(ctx, g)
      break
    case 'office':
      drawOfficeBg(ctx, g)
      break
  }
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

  // Полосы обоев + орнамент-горошек
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 26
  for (let i = 0; i < 14; i++) {
    const x = wrapX(i * 150, g.camX, 0.45, VIEW_W + 300)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, VIEW_H)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  for (let i = 0; i < 40; i++) {
    const x = wrapX(i * 64 + 30, g.camX, 0.45, VIEW_W + 300)
    const y = 40 + ((i * 47) % 340)
    ctx.beginPath()
    ctx.arc(x, y, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Гирлянда с огоньками через комнату — мерцает
  const gy = 96
  ctx.strokeStyle = 'rgba(20,16,28,0.8)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-40, gy - 22)
  ctx.quadraticCurveTo(VIEW_W * 0.5, gy + 26, VIEW_W + 40, gy - 22)
  ctx.stroke()
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12
    const bx = -40 + (VIEW_W + 80) * t
    const by =
      gy - 22 + Math.sin(Math.PI * t) * 48 + Math.sin(g.frame * 0.03 + i) * 1.5
    const on = Math.sin(g.frame * 0.09 + i * 2.1) > -0.25
    const col = i % 3 === 0 ? '255,190,120' : i % 3 === 1 ? '150,220,255' : '255,235,170'
    ctx.fillStyle = `rgba(${col},${on ? 0.85 : 0.2})`
    ctx.beginPath()
    ctx.arc(bx, by + 3, 2.6, 0, Math.PI * 2)
    ctx.fill()
    if (on) {
      const gg = ctx.createRadialGradient(bx, by + 3, 0, bx, by + 3, 12)
      gg.addColorStop(0, `rgba(${col},0.28)`)
      gg.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = gg
      ctx.fillRect(bx - 12, by - 9, 24, 24)
    }
  }

  // Картины на «дальней стене»
  for (let i = 0; i < 3; i++) {
    const x = wrapX(i * 430 + 190, g.camX, 0.45, VIEW_W + 900)
    ctx.fillStyle = 'rgba(24,18,36,0.85)'
    rr(ctx, x, 150, 64, 48, 3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(190,160,110,0.5)'
    ctx.lineWidth = 3
    ctx.stroke()
    // «пейзаж» внутри рамки
    ctx.fillStyle = 'rgba(120,90,160,0.4)'
    ctx.fillRect(x + 5, 155, 54, 20)
    ctx.fillStyle = 'rgba(60,44,86,0.6)'
    ctx.beginPath()
    ctx.moveTo(x + 5, 190)
    ctx.lineTo(x + 24, 168)
    ctx.lineTo(x + 40, 186)
    ctx.lineTo(x + 52, 172)
    ctx.lineTo(x + 59, 190)
    ctx.closePath()
    ctx.fill()
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

  // Окна с занавесками и подоконниками
  for (let i = 0; i < 4; i++) {
    const x = wrapX(i * 420 + 120, g.camX, 0.35, VIEW_W + 800)
    // занавески
    ctx.fillStyle = 'rgba(200,120,70,0.35)'
    rr(ctx, x - 10, 52, 24, 188, 6)
    ctx.fill()
    rr(ctx, x + 136, 52, 24, 188, 6)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    rr(ctx, x, 60, 150, 170, 10)
    ctx.fill()
    ctx.fillStyle = 'rgba(180,220,170,0.65)'
    rr(ctx, x + 8, 68, 134, 154, 6)
    ctx.fill()
    // вид за стеклом: облако
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    const cl = ((g.frame * 0.08 + i * 60) % 220) - 40
    ctx.beginPath()
    ctx.arc(x + 40 + cl * 0.4, 110, 11, 0, Math.PI * 2)
    ctx.arc(x + 54 + cl * 0.4, 104, 14, 0, Math.PI * 2)
    ctx.arc(x + 68 + cl * 0.4, 112, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(120,90,50,0.5)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(x + 75, 68)
    ctx.lineTo(x + 75, 222)
    ctx.moveTo(x + 8, 145)
    ctx.lineTo(x + 142, 145)
    ctx.stroke()
    // подоконник + растение
    ctx.fillStyle = 'rgba(150,95,45,0.55)'
    rr(ctx, x - 6, 228, 162, 9, 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(160,70,50,0.85)'
    rr(ctx, x + 104, 210, 18, 18, 3)
    ctx.fill()
    ctx.fillStyle = 'rgba(90,150,80,0.75)'
    ctx.beginPath()
    ctx.ellipse(x + 113, 202, 12, 9, 0, 0, Math.PI * 2)
    ctx.ellipse(x + 105, 207, 8, 6, -0.5, 0, Math.PI * 2)
    ctx.ellipse(x + 121, 207, 8, 6, 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Полка с банками
  for (let i = 0; i < 3; i++) {
    const x = wrapX(i * 470 + 60, g.camX, 0.45, VIEW_W + 900)
    ctx.fillStyle = 'rgba(140,90,40,0.6)'
    ctx.fillRect(x, 130, 120, 6)
    for (let j = 0; j < 4; j++) {
      const bx = x + 8 + j * 28
      ctx.fillStyle = 'rgba(220,200,150,0.5)'
      rr(ctx, bx, 106, 20, 24, 3)
      ctx.fill()
      ctx.fillStyle = ['rgba(190,120,60,0.7)', 'rgba(150,160,70,0.7)', 'rgba(190,60,50,0.7)', 'rgba(120,150,190,0.7)'][j]
      rr(ctx, bx + 2, 114, 16, 14, 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(90,60,30,0.8)'
      rr(ctx, bx + 5, 102, 10, 5, 1.5)
      ctx.fill()
    }
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
  // Трубы с вентилями
  for (const py of [110, 250]) {
    ctx.fillStyle = 'rgba(90,110,95,0.5)'
    ctx.fillRect(0, py, VIEW_W, 16)
    ctx.fillStyle = 'rgba(60,75,64,0.6)'
    ctx.fillRect(0, py + 12, VIEW_W, 4)
    for (let i = 0; i < 8; i++) {
      const x = wrapX(i * 260, g.camX, 0.4, VIEW_W + 500)
      ctx.fillStyle = 'rgba(110,130,115,0.6)'
      ctx.fillRect(x, py - 4, 18, 24)
      // вентиль — медленно крутится
      const vx = x + 130
      if (vx < VIEW_W + 60) {
        ctx.save()
        ctx.translate(vx, py + 8)
        ctx.rotate(g.frame * 0.006 + i)
        ctx.strokeStyle = 'rgba(150,90,60,0.75)'
        ctx.lineWidth = 3.4
        ctx.beginPath()
        ctx.arc(0, 0, 8, 0, Math.PI * 2)
        ctx.moveTo(-8, 0)
        ctx.lineTo(8, 0)
        ctx.moveTo(0, -8)
        ctx.lineTo(0, 8)
        ctx.stroke()
        ctx.restore()
      }
    }
  }
  // Лампы в клетках-защитах на потолке
  for (let i = 0; i < 4; i++) {
    const x = wrapX(i * 340 + 170, g.camX, 0.5, VIEW_W + 700)
    ctx.strokeStyle = 'rgba(24,30,26,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 26)
    ctx.stroke()
    const on = Math.sin(g.frame * 0.05 + i * 2.4) > -0.6
    ctx.fillStyle = on ? 'rgba(220,255,200,0.9)' : 'rgba(90,110,95,0.5)'
    ctx.beginPath()
    ctx.arc(x, 32, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      ctx.arc(x, 32, 9 + k * 3.4, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.moveTo(x - 12 - k * 3.4, 34)
    }
    ctx.strokeStyle = 'rgba(24,30,26,0.75)'
    ctx.lineWidth = 1.4
    ctx.stroke()
    if (on) {
      const gg = ctx.createRadialGradient(x, 34, 2, x, 34, 60)
      gg.addColorStop(0, 'rgba(200,255,190,0.16)')
      gg.addColorStop(1, 'rgba(200,255,190,0)')
      ctx.fillStyle = gg
      ctx.fillRect(x - 60, 0, 120, 110)
    }
  }
  // Предупреждающий щит
  const wx = wrapX(430, g.camX, 0.4, VIEW_W + 500)
  ctx.fillStyle = 'rgba(200,168,40,0.8)'
  rr(ctx, wx, 320, 74, 34, 3)
  ctx.fill()
  ctx.strokeStyle = 'rgba(30,26,16,0.8)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(30,26,16,0.85)'
  ctx.font = fnt(11, 800)
  ctx.textAlign = 'center'
  ctx.fillText('220 В', wx + 37, 342)
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

function drawLivingBg(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  // Обои: полосы + жемчужный узор
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 34
  for (let i = 0; i < 12; i++) {
    const x = wrapX(i * 170, g.camX, 0.45, VIEW_W + 340)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, VIEW_H)
    ctx.stroke()
  }
  // Окно с шторами и ночным небом
  for (let i = 0; i < 2; i++) {
    const x = wrapX(i * 560 + 140, g.camX, 0.35, VIEW_W + 1100)
    ctx.fillStyle = 'rgba(20,26,46,0.95)'
    rr(ctx, x, 54, 170, 190, 6)
    ctx.fill()
    // звёзды за стеклом
    ctx.fillStyle = 'rgba(255,240,210,0.8)'
    for (let s = 0; s < 8; s++) {
      ctx.fillRect(x + 14 + ((s * 37) % 144), 66 + ((s * 53) % 150), 1.6, 1.6)
    }
    // луна за стеклом
    ctx.fillStyle = '#f7e6ae'
    ctx.beginPath()
    ctx.arc(x + 128, 96, 13, 0, Math.PI * 2)
    ctx.fill()
    // рама и переплёт
    ctx.strokeStyle = 'rgba(90,62,40,0.9)'
    ctx.lineWidth = 7
    rr(ctx, x, 54, 170, 190, 6)
    ctx.stroke()
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(x + 85, 54)
    ctx.lineTo(x + 85, 244)
    ctx.moveTo(x, 149)
    ctx.lineTo(x + 170, 149)
    ctx.stroke()
    // шторы
    ctx.fillStyle = 'rgba(120,84,58,0.75)'
    rr(ctx, x - 16, 46, 30, 208, 8)
    ctx.fill()
    rr(ctx, x + 156, 46, 30, 208, 8)
    ctx.fill()
    ctx.fillStyle = 'rgba(90,62,40,0.9)'
    ctx.fillRect(x - 20, 44, 210, 7)
  }
  // Настенные часы — секундная стрелка идёт
  for (let i = 0; i < 3; i++) {
    const x = wrapX(i * 470 + 320, g.camX, 0.45, VIEW_W + 900)
    ctx.fillStyle = 'rgba(60,44,34,0.9)'
    ctx.beginPath()
    ctx.arc(x, 110, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(200,170,120,0.6)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = 'rgba(230,215,180,0.75)'
    ctx.lineWidth = 2
    const ah = (g.frame * 0.001 + i) * Math.PI / 2
    const am = (g.frame * 0.012 + i * 2) * Math.PI / 30
    ctx.beginPath()
    ctx.moveTo(x, 110)
    ctx.lineTo(x + Math.sin(ah) * 9, 110 - Math.cos(ah) * 9)
    ctx.moveTo(x, 110)
    ctx.lineTo(x + Math.sin(am) * 14, 110 - Math.cos(am) * 14)
    ctx.stroke()
  }
  // Картины
  for (let i = 0; i < 3; i++) {
    const x = wrapX(i * 390 + 60, g.camX, 0.45, VIEW_W + 800)
    ctx.fillStyle = 'rgba(46,34,26,0.9)'
    rr(ctx, x, 220, 58, 44, 3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(190,160,110,0.55)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = 'rgba(150,120,90,0.35)'
    ctx.beginPath()
    ctx.arc(x + 29, 242, 14, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawAtticBg(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  // Стропила — ровные диагональные балки под одинаковым углом
  ctx.strokeStyle = 'rgba(46,28,20,0.55)'
  ctx.lineWidth = 13
  for (let i = -2; i < 9; i++) {
    const x = wrapX(i * 200, g.camX, 0.4, VIEW_W + 400)
    ctx.beginPath()
    ctx.moveTo(x, -20)
    ctx.lineTo(x + 130, VIEW_H + 20)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(20,12,8,0.5)'
  ctx.lineWidth = 2
  for (let i = -2; i < 9; i++) {
    const x = wrapX(i * 200, g.camX, 0.4, VIEW_W + 400)
    ctx.beginPath()
    ctx.moveTo(x + 6, -20)
    ctx.lineTo(x + 136, VIEW_H + 20)
    ctx.stroke()
  }
  // Мансардное окно с луной
  for (let i = 0; i < 2; i++) {
    const x = wrapX(i * 620 + 210, g.camX, 0.35, VIEW_W + 1200)
    ctx.fillStyle = 'rgba(24,16,26,0.95)'
    ctx.beginPath()
    ctx.arc(x, 90, 40, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(247,230,174,0.9)'
    ctx.beginPath()
    ctx.arc(x + 10, 82, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(120,86,60,0.9)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(x, 90, 40, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(x - 40, 90)
    ctx.lineTo(x + 40, 90)
    ctx.moveTo(x, 50)
    ctx.lineTo(x, 130)
    ctx.stroke()
    // луч
    const lg = ctx.createLinearGradient(x, 100, x - 60, 320)
    lg.addColorStop(0, 'rgba(230,220,255,0.10)')
    lg.addColorStop(1, 'rgba(230,220,255,0)')
    ctx.fillStyle = lg
    ctx.beginPath()
    ctx.moveTo(x - 14, 104)
    ctx.lineTo(x + 6, 104)
    ctx.lineTo(x - 66, 330)
    ctx.lineTo(x - 132, 330)
    ctx.closePath()
    ctx.fill()
  }
  // Цепи с крюками
  for (let i = 0; i < 5; i++) {
    const x = wrapX(i * 300 + 90, g.camX, 0.5, VIEW_W + 600)
    ctx.strokeStyle = 'rgba(30,22,18,0.75)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 54)
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, 62, 8, -0.4, Math.PI + 0.4)
    ctx.stroke()
  }
  // Паутина по углам экрана
  ctx.strokeStyle = 'rgba(220,215,200,0.10)'
  ctx.lineWidth = 1.2
  for (let k = 0; k < 4; k++) {
    const r = 18 + k * 17
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI / 2)
    ctx.stroke()
  }
  for (let k = 0; k < 4; k++) {
    const r = 14 + k * 14
    ctx.beginPath()
    ctx.arc(VIEW_W, 0, r, Math.PI / 2, Math.PI)
    ctx.stroke()
  }
}

function drawOfficeBg(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  // Домашний кабинет: деревянные панели, окно со шторами, книжные полки
  // и семейные фото на стенах — никакой «офисной» атрибутики.
  //
  // Вертикальный молдинг деревянной обшивки
  ctx.strokeStyle = 'rgba(255,224,170,0.05)'
  ctx.lineWidth = 9
  for (let i = 0; i < 13; i++) {
    const x = wrapX(i * 150, g.camX, 0.45, VIEW_W + 300)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, VIEW_H)
    ctx.stroke()
  }
  // Горизонтальные бордюры панелей
  ctx.strokeStyle = 'rgba(120,90,55,0.22)'
  ctx.lineWidth = 3
  for (const by of [262, 474]) {
    ctx.beginPath()
    ctx.moveTo(0, by)
    ctx.lineTo(VIEW_W, by)
    ctx.stroke()
  }

  // Окно с тяжёлыми шторами: за стеклом глубокий вечер и сад
  for (let i = 0; i < 2; i++) {
    const x = wrapX(i * 620 + 150, g.camX, 0.35, VIEW_W + 1200)
    ctx.fillStyle = 'rgba(22,28,48,0.95)'
    rr(ctx, x, 56, 168, 186, 6)
    ctx.fill()
    // звёзды
    ctx.fillStyle = 'rgba(255,240,210,0.7)'
    for (let s = 0; s < 7; s++) {
      ctx.fillRect(x + 14 + ((s * 41) % 140), 68 + ((s * 59) % 140), 1.6, 1.6)
    }
    // луна
    ctx.fillStyle = '#f7e6ae'
    ctx.beginPath()
    ctx.arc(x + 126, 98, 13, 0, Math.PI * 2)
    ctx.fill()
    // силуэт сада за окном
    ctx.fillStyle = 'rgba(14,20,16,0.9)'
    ctx.beginPath()
    ctx.moveTo(x, 236)
    ctx.lineTo(x, 202)
    ctx.quadraticCurveTo(x + 40, 182, x + 74, 199)
    ctx.quadraticCurveTo(x + 116, 179, x + 168, 207)
    ctx.lineTo(x + 168, 236)
    ctx.closePath()
    ctx.fill()
    // деревянная рама и переплёт
    ctx.strokeStyle = 'rgba(74,54,34,0.95)'
    ctx.lineWidth = 7
    rr(ctx, x, 56, 168, 186, 6)
    ctx.stroke()
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(x + 84, 56)
    ctx.lineTo(x + 84, 242)
    ctx.moveTo(x, 149)
    ctx.lineTo(x + 168, 149)
    ctx.stroke()
    // шторы с подхватами
    ctx.fillStyle = 'rgba(96,58,44,0.8)'
    rr(ctx, x - 18, 48, 32, 202, 9)
    ctx.fill()
    rr(ctx, x + 154, 48, 32, 202, 9)
    ctx.fill()
    ctx.fillStyle = 'rgba(150,110,70,0.45)'
    rr(ctx, x - 14, 118, 24, 14, 5)
    ctx.fill()
    rr(ctx, x + 158, 118, 24, 14, 5)
    ctx.fill()
    // карниз с набалдашниками
    ctx.fillStyle = 'rgba(60,42,26,0.95)'
    ctx.fillRect(x - 24, 44, 216, 7)
    ctx.beginPath()
    ctx.arc(x - 24, 47, 5, 0, Math.PI * 2)
    ctx.arc(x + 192, 47, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Книжные полки: приглушённые корешки в два ряда
  const bookCols = [
    'rgba(122,74,58,0.8)',
    'rgba(86,102,74,0.8)',
    'rgba(148,120,70,0.75)',
    'rgba(70,86,106,0.8)',
    'rgba(104,74,96,0.75)',
  ]
  for (let i = 0; i < 3; i++) {
    const x = wrapX(i * 450 + 70, g.camX, 0.45, VIEW_W + 900)
    for (let row = 0; row < 2; row++) {
      const sy = 168 + row * 62
      let bx = x + 4
      let bi = i * 5 + row * 3
      while (bx < x + 118) {
        const bw = 6 + ((bi * 29) % 7)
        const bh = 30 + ((bi * 17) % 10)
        ctx.fillStyle = bookCols[(bi + row) % bookCols.length]
        ctx.fillRect(bx, sy + 42 - bh, bw, bh)
        bx += bw + 2
        bi++
      }
      // полка и боковины
      ctx.fillStyle = 'rgba(52,38,24,0.9)'
      ctx.fillRect(x, sy + 42, 128, 7)
      ctx.fillStyle = 'rgba(74,54,34,0.95)'
      ctx.fillRect(x - 5, sy - 2, 6, 52)
      ctx.fillRect(x + 127, sy - 2, 6, 52)
    }
  }

  // Семейные фото в рамках
  for (let i = 0; i < 3; i++) {
    const x = wrapX(i * 500 + 320, g.camX, 0.45, VIEW_W + 900)
    const y = 92 + (i % 2) * 26
    ctx.fillStyle = 'rgba(40,28,18,0.95)'
    rr(ctx, x, y, 52, 62, 3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(176,141,87,0.6)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = 'rgba(158,132,96,0.4)'
    rr(ctx, x + 6, y + 6, 40, 50, 2)
    ctx.fill()
    // силуэт на портрете
    ctx.fillStyle = 'rgba(70,52,36,0.85)'
    ctx.beginPath()
    ctx.arc(x + 26, y + 26, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 26, y + 52, 14, 11, 0, Math.PI, 0)
    ctx.fill()
  }

  // Тёплые пятна света от торшеров — комната обжитая
  for (let i = 0; i < 4; i++) {
    const x = wrapX(i * 430 + 240, g.camX, 0.3, VIEW_W + 800)
    const gl = ctx.createRadialGradient(x, 330, 8, x, 330, 110)
    gl.addColorStop(0, 'rgba(255,196,110,0.12)')
    gl.addColorStop(1, 'rgba(255,196,110,0)')
    ctx.fillStyle = gl
    ctx.fillRect(x - 110, 220, 220, 220)
  }
}

// ---------- Тайлы ----------

function hash2(c: number, r: number): number {
  const h = Math.imul(c | 0, 73856093) ^ Math.imul(r | 0, 19349663)
  return ((h >>> 0) % 1000) / 1000
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

// ---------- Интерьер: мебель на этажах ----------

interface Piece {
  /** Ширина в тайлах. */
  w: number
  /** Высота в тайлах (для проверки свободного места). */
  h: number
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, f: number) => void
}

const WOOD = '#5a4530'
const WOOD_D = '#3d2e1f'
const WOOD_L = '#6f573d'
const METAL = '#6a7076'
const METAL_D = '#454b51'

/** Тень под мебелью + глухая подложка цвета стены (не спорит с игрой). */
function furnBase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y, w * 0.52, 5, 0, 0, Math.PI * 2)
  ctx.fill()
}

const FURNITURE: Record<ThemeName, Piece[]> = {
  bedroom: [
    {
      w: 3,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 118, 60)
        // Кровать: изголовье, матрас, одеяло, подушка
        ctx.fillStyle = WOOD_D
        rr(ctx, x + 2, y - 52, 12, 52, 3)
        ctx.fill()
        rr(ctx, x + 108, y - 34, 8, 34, 2)
        ctx.fill()
        ctx.fillStyle = WOOD
        rr(ctx, x + 8, y - 26, 104, 16, 4)
        ctx.fill()
        ctx.fillStyle = '#7a6890'
        rr(ctx, x + 12, y - 34, 98, 12, 5)
        ctx.fill()
        ctx.fillStyle = '#8f7cab'
        rr(ctx, x + 34, y - 40, 76, 16, 6)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        rr(ctx, x + 16, y - 40, 22, 11, 4)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 1.4
        rr(ctx, x + 12, y - 34, 98, 12, 5)
        ctx.stroke()
        // ножки
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 10, y - 10, 6, 10)
        ctx.fillRect(x + 102, y - 10, 6, 10)
      },
    },
    {
      w: 2,
      h: 3,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 76, 100)
        // Шкаф с двумя дверцами
        ctx.fillStyle = WOOD
        rr(ctx, x + 2, y - 96, 72, 96, 3)
        ctx.fill()
        ctx.fillStyle = WOOD_L
        rr(ctx, x + 6, y - 92, 30, 88, 2)
        ctx.fill()
        rr(ctx, x + 40, y - 92, 30, 88, 2)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 2
        rr(ctx, x + 2, y - 96, 72, 96, 3)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x + 38, y - 92)
        ctx.lineTo(x + 38, y - 4)
        ctx.stroke()
        // ручки
        ctx.fillStyle = '#c8b98a'
        ctx.beginPath()
        ctx.arc(x + 33, y - 50, 2.4, 0, Math.PI * 2)
        ctx.arc(x + 43, y - 50, 2.4, 0, Math.PI * 2)
        ctx.fill()
        // книга сверху
        ctx.fillStyle = '#8a4a3a'
        rr(ctx, x + 20, y - 104, 26, 8, 1.5)
        ctx.fill()
        ctx.fillStyle = '#4a6a5a'
        rr(ctx, x + 48, y - 103, 20, 7, 1.5)
        ctx.fill()
      },
    },
    {
      w: 1,
      h: 2,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 36, 44)
        // Тумбочка с будильником
        ctx.fillStyle = WOOD
        rr(ctx, x + 3, y - 34, 30, 34, 3)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 1.6
        ctx.stroke()
        ctx.fillStyle = WOOD_D
        rr(ctx, x + 8, y - 26, 20, 7, 1.5)
        ctx.fill()
        // будильник — стрелки идут
        ctx.fillStyle = '#c8402e'
        ctx.beginPath()
        ctx.arc(x + 18, y - 44, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#f4eeda'
        ctx.lineWidth = 1.6
        const am = (f * 0.05) % (Math.PI * 2)
        ctx.beginPath()
        ctx.moveTo(x + 18, y - 44)
        ctx.lineTo(x + 18 + Math.sin(am) * 5, y - 44 - Math.cos(am) * 5)
        ctx.stroke()
        ctx.fillStyle = '#7a2721'
        rr(ctx, x + 13, y - 55, 3, 4, 1)
        ctx.fill()
        rr(ctx, x + 20, y - 55, 3, 4, 1)
        ctx.fill()
      },
    },
    {
      w: 4,
      h: 1,
      draw: (ctx, x, y) => {
        // Ковёр — лежит на полу
        ctx.fillStyle = 'rgba(120,84,150,0.4)'
        rr(ctx, x + 4, y - 7, 152, 7, 3)
        ctx.fill()
        ctx.strokeStyle = 'rgba(230,200,255,0.3)'
        ctx.lineWidth = 1.4
        rr(ctx, x + 10, y - 6, 140, 5, 2)
        ctx.stroke()
      },
    },
    {
      w: 1,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 34, 50)
        // Комнатное растение
        ctx.fillStyle = '#a05240'
        ctx.beginPath()
        ctx.moveTo(x + 8, y)
        ctx.lineTo(x + 28, y)
        ctx.lineTo(x + 25, y - 22)
        ctx.lineTo(x + 11, y - 22)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 1.4
        ctx.stroke()
        ctx.fillStyle = '#4a7a4a'
        ctx.beginPath()
        ctx.ellipse(x + 18, y - 38, 15, 18, 0, 0, Math.PI * 2)
        ctx.ellipse(x + 8, y - 30, 8, 11, -0.6, 0, Math.PI * 2)
        ctx.ellipse(x + 28, y - 30, 8, 11, 0.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(20,40,20,0.5)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(x + 18, y - 24)
        ctx.lineTo(x + 18, y - 50)
        ctx.stroke()
      },
    },
    {
      w: 2,
      h: 1,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 60, 30)
        // Коробка с игрушками + мячик
        ctx.fillStyle = '#7a6a4a'
        rr(ctx, x + 4, y - 30, 46, 30, 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1.6
        ctx.stroke()
        ctx.fillStyle = 'rgba(90,70,40,0.9)'
        ctx.fillRect(x + 4, y - 22, 46, 5)
        ctx.fillStyle = '#c8402e'
        ctx.beginPath()
        ctx.arc(x + 64, y - 8, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(x + 64, y - 8, 8, 0.3, 2.2)
        ctx.stroke()
      },
    },
  ],
  kitchen: [
    {
      w: 2,
      h: 3,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 62, 104)
        // Холодильник
        ctx.fillStyle = '#b8bec4'
        rr(ctx, x + 3, y - 100, 56, 100, 5)
        ctx.fill()
        ctx.strokeStyle = METAL_D
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.strokeStyle = 'rgba(70,80,88,0.7)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(x + 3, y - 68)
        ctx.lineTo(x + 59, y - 68)
        ctx.stroke()
        ctx.fillStyle = METAL
        rr(ctx, x + 47, y - 92, 4, 18, 2)
        ctx.fill()
        rr(ctx, x + 47, y - 60, 4, 18, 2)
        ctx.fill()
        // магнитики
        ctx.fillStyle = '#c8402e'
        ctx.beginPath()
        ctx.arc(x + 18, y - 84, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffd23f'
        ctx.beginPath()
        ctx.arc(x + 30, y - 80, 3, 0, Math.PI * 2)
        ctx.fill()
        // записка
        ctx.fillStyle = 'rgba(250,245,228,0.9)'
        ctx.save()
        ctx.translate(x + 26, y - 46)
        ctx.rotate(-0.12)
        rr(ctx, -8, -10, 16, 20, 1)
        ctx.fill()
        ctx.strokeStyle = 'rgba(34,30,23,0.5)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(-5, -4)
        ctx.lineTo(5, -4)
        ctx.moveTo(-5, 0)
        ctx.lineTo(5, 0)
        ctx.moveTo(-5, 4)
        ctx.lineTo(2, 4)
        ctx.stroke()
        ctx.restore()
        void f
      },
    },
    {
      w: 2,
      h: 2,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 70, 62)
        // Плита с кастрюлей и паром
        ctx.fillStyle = METAL
        rr(ctx, x + 3, y - 56, 64, 56, 4)
        ctx.fill()
        ctx.strokeStyle = METAL_D
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = METAL_D
        for (const k of [0, 1, 2, 3]) {
          ctx.beginPath()
          ctx.arc(x + 12 + k * 14, y - 48, 4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#3a4046'
        rr(ctx, x + 8, y - 60, 54, 7, 2)
        ctx.fill()
        // кастрюля
        ctx.fillStyle = '#c05a3a'
        rr(ctx, x + 20, y - 78, 30, 18, 3)
        ctx.fill()
        ctx.fillStyle = METAL
        rr(ctx, x + 16, y - 81, 38, 5, 2)
        ctx.fill()
        // пар
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 2
        for (let s = 0; s < 2; s++) {
          const ph = f * 0.045 + s * Math.PI
          ctx.beginPath()
          ctx.moveTo(x + 30 + Math.sin(ph) * 3, y - 84)
          ctx.quadraticCurveTo(
            x + 34 + Math.sin(ph + 1) * 6,
            y - 94,
            x + 30 + Math.sin(ph + 2) * 4,
            y - 104 - Math.sin(ph) * 4,
          )
          ctx.stroke()
        }
        // духовка
        ctx.fillStyle = '#2e3338'
        rr(ctx, x + 10, y - 38, 50, 26, 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,200,120,0.4)'
        ctx.lineWidth = 1.6
        ctx.stroke()
      },
    },
    {
      w: 3,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 112, 56)
        // Кухонный гарнитур: столешница, мойка, шкафчики
        ctx.fillStyle = WOOD
        rr(ctx, x + 2, y - 44, 108, 44, 3)
        ctx.fill()
        ctx.fillStyle = '#d8d3c8'
        rr(ctx, x, y - 50, 112, 9, 3)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1.6
        ctx.stroke()
        // мойка
        ctx.fillStyle = METAL
        rr(ctx, x + 40, y - 50, 34, 7, 2)
        ctx.fill()
        ctx.fillStyle = METAL_D
        rr(ctx, x + 44, y - 49, 26, 4, 1.5)
        ctx.fill()
        // смеситель
        ctx.strokeStyle = METAL
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x + 57, y - 50)
        ctx.lineTo(x + 57, y - 62)
        ctx.quadraticCurveTo(x + 57, y - 66, x + 63, y - 66)
        ctx.stroke()
        // дверцы
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(x + 36, y - 41)
        ctx.lineTo(x + 36, y - 4)
        ctx.moveTo(x + 74, y - 41)
        ctx.lineTo(x + 74, y - 4)
        ctx.stroke()
        // чайник на столешнице
        ctx.fillStyle = '#4a7a8a'
        rr(ctx, x + 12, y - 64, 20, 14, 3)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(x + 32, y - 58)
        ctx.lineTo(x + 39, y - 55)
        ctx.lineTo(x + 32, y - 53)
        ctx.fill()
      },
    },
    {
      w: 3,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 100, 52)
        // Обеденный стол со стулом
        ctx.fillStyle = WOOD
        rr(ctx, x + 6, y - 40, 88, 8, 3)
        ctx.fill()
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 12, y - 32, 7, 32)
        ctx.fillRect(x + 80, y - 32, 7, 32)
        // ваза с цветком
        ctx.fillStyle = '#7a9aB0'
        rr(ctx, x + 42, y - 54, 12, 14, 3)
        ctx.fill()
        ctx.strokeStyle = '#4a7a4a'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(x + 48, y - 54)
        ctx.lineTo(x + 48, y - 66)
        ctx.stroke()
        ctx.fillStyle = '#c8402e'
        ctx.beginPath()
        ctx.arc(x + 48, y - 69, 4, 0, Math.PI * 2)
        ctx.fill()
        // стул
        ctx.fillStyle = WOOD
        rr(ctx, x + 100, y - 34, 6, 34, 2)
        ctx.fill()
        rr(ctx, x + 84, y - 22, 24, 6, 2)
        ctx.fill()
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 86, y - 16, 5, 16)
        ctx.fillRect(x + 102, y - 16, 5, 16)
      },
    },
    {
      w: 1,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 34, 46)
        // Мусорное ведро
        ctx.fillStyle = METAL
        ctx.beginPath()
        ctx.moveTo(x + 6, y)
        ctx.lineTo(x + 28, y)
        ctx.lineTo(x + 25, y - 34)
        ctx.lineTo(x + 9, y - 34)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = METAL_D
        ctx.lineWidth = 1.8
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x + 17, y - 36, 9, Math.PI, 0)
        ctx.stroke()
      },
    },
  ],
  basement: [
    {
      w: 2,
      h: 3,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 70, 100)
        // Котёл с манометром и трубами
        ctx.fillStyle = '#4a5a50'
        rr(ctx, x + 6, y - 96, 58, 96, 8)
        ctx.fill()
        ctx.strokeStyle = '#2c362e'
        ctx.lineWidth = 2.4
        ctx.stroke()
        ctx.strokeStyle = 'rgba(20,26,22,0.6)'
        ctx.lineWidth = 1.4
        for (let k = 0; k < 4; k++) {
          ctx.beginPath()
          ctx.moveTo(x + 10, y - 18 - k * 20)
          ctx.lineTo(x + 60, y - 18 - k * 20)
          ctx.stroke()
        }
        // манометр — стрелка дрожит
        ctx.fillStyle = '#d8d3c2'
        ctx.beginPath()
        ctx.arc(x + 35, y - 72, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#2c362e'
        ctx.lineWidth = 1.6
        ctx.stroke()
        const na = -0.6 + Math.sin(f * 0.09) * 0.35
        ctx.beginPath()
        ctx.moveTo(x + 35, y - 72)
        ctx.lineTo(x + 35 + Math.sin(na) * 7, y - 72 - Math.cos(na) * 7)
        ctx.stroke()
        // труба вверх
        ctx.fillStyle = METAL_D
        ctx.fillRect(x + 30, y - 112, 10, 16)
        // огонёк-индикатор
        ctx.fillStyle = `rgba(255,120,70,${0.5 + Math.sin(f * 0.2) * 0.3})`
        ctx.beginPath()
        ctx.arc(x + 35, y - 30, 3.4, 0, Math.PI * 2)
        ctx.fill()
      },
    },
    {
      w: 3,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 108, 50)
        // Верстак с инструментами
        ctx.fillStyle = WOOD
        rr(ctx, x + 2, y - 36, 104, 10, 2)
        ctx.fill()
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 8, y - 26, 8, 26)
        ctx.fillRect(x + 92, y - 26, 8, 26)
        ctx.fillStyle = WOOD_L
        rr(ctx, x + 14, y - 30, 80, 8, 2)
        ctx.fill()
        // ящик инструментов
        ctx.fillStyle = '#8a5a2e'
        rr(ctx, x + 20, y - 44, 30, 14, 2)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 1.4
        ctx.stroke()
        // ключ
        ctx.strokeStyle = METAL
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(x + 68, y - 40, 5, 0, Math.PI * 1.4)
        ctx.moveTo(x + 71, y - 37)
        ctx.lineTo(x + 80, y - 30)
        ctx.stroke()
        // банки с гвоздями
        ctx.fillStyle = 'rgba(200,200,190,0.7)'
        rr(ctx, x + 88, y - 46, 10, 12, 1)
        ctx.fill()
      },
    },
    {
      w: 3,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 106, 70)
        // Стеллаж с банками солений
        ctx.fillStyle = WOOD
        rr(ctx, x + 2, y - 70, 102, 6, 2)
        ctx.fill()
        rr(ctx, x + 2, y - 36, 102, 6, 2)
        ctx.fill()
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 2, y - 70, 6, 70)
        ctx.fillRect(x + 98, y - 70, 6, 70)
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = 'rgba(215,205,175,0.75)'
          rr(ctx, x + 12 + k * 19, y - 92, 14, 22, 2)
          ctx.fill()
          ctx.fillStyle = ['rgba(140,160,60,0.8)', 'rgba(190,110,50,0.8)', 'rgba(170,150,60,0.8)'][k % 3]
          rr(ctx, x + 14 + k * 19, y - 82, 10, 11, 1.5)
          ctx.fill()
        }
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = 'rgba(215,205,175,0.75)'
          rr(ctx, x + 16 + k * 22, y - 58, 15, 22, 2)
          ctx.fill()
          ctx.fillStyle = ['rgba(150,80,50,0.8)', 'rgba(110,140,60,0.8)'][k % 2]
          rr(ctx, x + 18 + k * 22, y - 48, 11, 11, 1.5)
          ctx.fill()
        }
      },
    },
    {
      w: 1,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 40, 60)
        // Ящики: один на другом
        ctx.fillStyle = '#6a5232'
        rr(ctx, x + 2, y - 34, 36, 34, 2)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 1.8
        ctx.stroke()
        ctx.fillStyle = '#7a5f3a'
        rr(ctx, x + 6, y - 62, 28, 28, 2)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x + 6, y - 62)
        ctx.lineTo(x + 34, y - 34)
        ctx.moveTo(x + 34, y - 62)
        ctx.lineTo(x + 6, y - 34)
        ctx.stroke()
      },
    },
    {
      w: 1,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 42, 52)
        // Бочка
        ctx.fillStyle = '#5f4630'
        ctx.beginPath()
        ctx.ellipse(x + 21, y - 26, 19, 26, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.strokeStyle = METAL_D
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x + 3, y - 34)
        ctx.lineTo(x + 39, y - 34)
        ctx.moveTo(x + 3, y - 18)
        ctx.lineTo(x + 39, y - 18)
        ctx.stroke()
        ctx.fillStyle = WOOD_D
        ctx.beginPath()
        ctx.ellipse(x + 21, y - 52, 19, 5, 0, 0, Math.PI * 2)
        ctx.fill()
      },
    },
  ],
  living: [
    {
      w: 3,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 118, 64)
        // Диван с подушками
        ctx.fillStyle = '#7a5a48'
        rr(ctx, x + 4, y - 30, 110, 30, 8)
        ctx.fill()
        ctx.fillStyle = '#8a6a54'
        rr(ctx, x + 4, y - 56, 110, 30, 8)
        ctx.fill()
        rr(ctx, x, y - 50, 16, 50, 6)
        ctx.fill()
        rr(ctx, x + 102, y - 50, 16, 50, 6)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'
        ctx.lineWidth = 1.8
        rr(ctx, x + 4, y - 56, 110, 56, 8)
        ctx.stroke()
        // подушки
        ctx.fillStyle = '#c8a04a'
        rr(ctx, x + 24, y - 50, 24, 20, 5)
        ctx.fill()
        ctx.fillStyle = '#5a7a9a'
        rr(ctx, x + 70, y - 50, 24, 20, 5)
        ctx.fill()
        // ножки
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 10, y - 4, 6, 4)
        ctx.fillRect(x + 102, y - 4, 6, 4)
      },
    },
    {
      w: 2,
      h: 2,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 78, 66)
        // Телевизор на тумбе — экран мерцает
        ctx.fillStyle = WOOD
        rr(ctx, x + 6, y - 26, 66, 26, 3)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 1.8
        ctx.stroke()
        ctx.fillStyle = '#2a2a30'
        rr(ctx, x + 12, y - 66, 54, 40, 4)
        ctx.fill()
        const fl = 0.55 + Math.sin(f * 0.31) * 0.2 + Math.sin(f * 0.83) * 0.08
        ctx.fillStyle = `rgba(140,190,235,${fl * 0.5})`
        rr(ctx, x + 16, y - 62, 46, 32, 2)
        ctx.fill()
        // «сцена» на экране
        ctx.fillStyle = `rgba(255,255,255,${fl * 0.25})`
        rr(ctx, x + 20 + Math.sin(f * 0.05) * 8, y - 56, 12, 18, 2)
        ctx.fill()
        ctx.fillStyle = '#1d1d22'
        ctx.fillRect(x + 32, y - 26, 14, 4)
      },
    },
    {
      w: 2,
      h: 3,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 74, 100)
        // Книжный шкаф
        ctx.fillStyle = WOOD
        rr(ctx, x + 2, y - 100, 70, 100, 3)
        ctx.fill()
        ctx.fillStyle = '#2e2419'
        rr(ctx, x + 6, y - 94, 62, 88, 2)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 2
        rr(ctx, x + 2, y - 100, 70, 100, 3)
        ctx.stroke()
        // книги — корешки
        const cols = ['#8a4a3a', '#4a6a5a', '#c8a04a', '#5a7a9a', '#7a5a8a']
        for (let shelf = 0; shelf < 3; shelf++) {
          const sy = y - 88 - shelf * 30
          ctx.fillStyle = WOOD
          ctx.fillRect(x + 6, sy + 24, 62, 4)
          let bx = x + 9
          let bi = shelf * 3
          while (bx < x + 60) {
            const bw = 5 + ((bi * 37) % 6)
            ctx.fillStyle = cols[(bi + shelf) % cols.length]
            ctx.fillRect(bx, sy, bw, 24)
            bx += bw + 1.5
            bi++
          }
        }
      },
    },
    {
      w: 1,
      h: 3,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 36, 92)
        // Торшер — тёплое пятно света
        ctx.strokeStyle = METAL_D
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x + 18, y)
        ctx.lineTo(x + 18, y - 70)
        ctx.stroke()
        ctx.fillStyle = METAL_D
        ctx.beginPath()
        ctx.ellipse(x + 18, y, 14, 4, 0, 0, Math.PI * 2)
        ctx.fill()
        const gl = 0.75 + Math.sin(f * 0.11) * 0.12
        ctx.fillStyle = `rgba(255,214,130,${0.75 * gl})`
        ctx.beginPath()
        ctx.moveTo(x + 4, y - 92)
        ctx.lineTo(x + 32, y - 92)
        ctx.lineTo(x + 26, y - 68)
        ctx.lineTo(x + 10, y - 68)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1.6
        ctx.stroke()
        const lg = ctx.createRadialGradient(x + 18, y - 66, 4, x + 18, y - 66, 52)
        lg.addColorStop(0, `rgba(255,220,140,${0.16 * gl})`)
        lg.addColorStop(1, 'rgba(255,220,140,0)')
        ctx.fillStyle = lg
        ctx.fillRect(x - 34, y - 112, 104, 112)
      },
    },
    {
      w: 2,
      h: 1,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 66, 36)
        // Журнальный столик с кружкой
        ctx.fillStyle = WOOD
        rr(ctx, x + 4, y - 22, 58, 7, 3)
        ctx.fill()
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 8, y - 15, 6, 15)
        ctx.fillRect(x + 52, y - 15, 6, 15)
        // журнал
        ctx.fillStyle = '#5a7a9a'
        rr(ctx, x + 12, y - 26, 16, 5, 1)
        ctx.fill()
        // кружка
        ctx.fillStyle = '#c8402e'
        rr(ctx, x + 40, y - 32, 10, 10, 2)
        ctx.fill()
        ctx.strokeStyle = '#c8402e'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(x + 52, y - 27, 3.4, -0.6, 1.6)
        ctx.stroke()
      },
    },
    {
      w: 2,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 64, 60)
        // Кресло
        ctx.fillStyle = '#5a7a6a'
        rr(ctx, x + 8, y - 34, 48, 34, 9)
        ctx.fill()
        rr(ctx, x + 4, y - 58, 56, 34, 10)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'
        ctx.lineWidth = 1.8
        rr(ctx, x + 4, y - 58, 56, 58, 10)
        ctx.stroke()
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 10, y - 4, 6, 4)
        ctx.fillRect(x + 48, y - 4, 6, 4)
      },
    },
  ],
  attic: [
    {
      w: 2,
      h: 1,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 70, 44)
        // Сундук с ремнями
        ctx.fillStyle = WOOD
        rr(ctx, x + 2, y - 40, 66, 40, 4)
        ctx.fill()
        ctx.fillStyle = WOOD_L
        rr(ctx, x + 2, y - 40, 66, 14, 4)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 2
        rr(ctx, x + 2, y - 40, 66, 40, 4)
        ctx.stroke()
        ctx.strokeStyle = METAL_D
        ctx.lineWidth = 3.4
        ctx.beginPath()
        ctx.moveTo(x + 16, y - 40)
        ctx.lineTo(x + 16, y)
        ctx.moveTo(x + 52, y - 40)
        ctx.lineTo(x + 52, y)
        ctx.stroke()
        // замочек
        ctx.fillStyle = '#c8a04a'
        rr(ctx, x + 30, y - 16, 10, 9, 2)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 1.4
        ctx.stroke()
      },
    },
    {
      w: 1,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 40, 56)
        // Коробки с надписями
        ctx.fillStyle = '#8a7048'
        rr(ctx, x + 2, y - 30, 36, 30, 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(60,44,26,0.8)'
        ctx.lineWidth = 1.8
        ctx.stroke()
        ctx.fillStyle = '#7a6238'
        rr(ctx, x + 7, y - 56, 28, 26, 2)
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = 'rgba(60,44,26,0.55)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(x + 10, y - 44)
        ctx.lineTo(x + 32, y - 44)
        ctx.moveTo(x + 6, y - 18)
        ctx.lineTo(x + 30, y - 18)
        ctx.stroke()
      },
    },
    {
      w: 2,
      h: 2,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 62, 66)
        // Кресло-качалка — качается
        const rock = Math.sin(f * 0.03) * 0.1
        ctx.save()
        ctx.translate(x + 31, y)
        ctx.rotate(rock)
        ctx.strokeStyle = WOOD
        ctx.lineWidth = 4.5
        ctx.lineCap = 'round'
        // полоз
        ctx.beginPath()
        ctx.moveTo(-26, -4)
        ctx.quadraticCurveTo(0, 6, 26, -4)
        ctx.stroke()
        // ножки
        ctx.beginPath()
        ctx.moveTo(-16, -6)
        ctx.lineTo(-10, -40)
        ctx.moveTo(16, -6)
        ctx.lineTo(10, -40)
        ctx.moveTo(-8, -22)
        ctx.lineTo(8, -22)
        ctx.stroke()
        // сиденье и спинка
        ctx.fillStyle = WOOD
        rr(ctx, -14, -44, 28, 8, 3)
        ctx.fill()
        for (let k = 0; k < 4; k++) {
          ctx.beginPath()
          ctx.moveTo(-10 + k * 6, -44)
          ctx.lineTo(-13 + k * 7, -70)
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.moveTo(-13, -68)
        ctx.quadraticCurveTo(0, -62, 13, -68)
        ctx.stroke()
        ctx.restore()
        ctx.lineCap = 'butt'
      },
    },
    {
      w: 2,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 74, 50)
        // Старое зеркало, накрытое простынёй
        ctx.fillStyle = 'rgba(235,228,208,0.85)'
        ctx.beginPath()
        ctx.moveTo(x + 6, y)
        ctx.quadraticCurveTo(x + 2, y - 40, x + 20, y - 52)
        ctx.quadraticCurveTo(x + 44, y - 62, x + 60, y - 44)
        ctx.quadraticCurveTo(x + 72, y - 26, x + 66, y)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(120,105,80,0.7)'
        ctx.lineWidth = 2
        ctx.stroke()
        // складки
        ctx.strokeStyle = 'rgba(120,105,80,0.4)'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(x + 26, y - 56)
        ctx.quadraticCurveTo(x + 30, y - 30, x + 26, y - 2)
        ctx.moveTo(x + 44, y - 56)
        ctx.quadraticCurveTo(x + 48, y - 28, x + 44, y - 2)
        ctx.stroke()
      },
    },
    {
      w: 2,
      h: 1,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 62, 30)
        // Чемодан
        ctx.fillStyle = '#7a5a3a'
        rr(ctx, x + 3, y - 26, 56, 26, 5)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.strokeStyle = 'rgba(50,36,20,0.8)'
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.moveTo(x + 18, y - 26)
        ctx.lineTo(x + 18, y)
        ctx.moveTo(x + 44, y - 26)
        ctx.lineTo(x + 44, y)
        ctx.stroke()
        // ручка
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(x + 31, y - 26, 6, Math.PI, 0)
        ctx.stroke()
        // наклейка
        ctx.fillStyle = 'rgba(240,232,212,0.85)'
        rr(ctx, x + 24, y - 20, 14, 10, 1.5)
        ctx.fill()
      },
    },
  ],
  office: [
    {
      w: 3,
      h: 2,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 112, 62)
        // Письменный стол: тумба с ящиками, ноутбук, лампа, книги
        ctx.fillStyle = WOOD
        rr(ctx, x + 70, y - 42, 40, 42, 3)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 1.8
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x + 74, y - 28)
        ctx.lineTo(x + 106, y - 28)
        ctx.moveTo(x + 74, y - 14)
        ctx.lineTo(x + 106, y - 14)
        ctx.stroke()
        ctx.fillStyle = '#b08d57'
        ctx.fillRect(x + 86, y - 24, 8, 2)
        ctx.fillRect(x + 86, y - 10, 8, 2)
        // левая ножка и столешница
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 6, y - 40, 6, 40)
        ctx.fillStyle = WOOD_L
        rr(ctx, x, y - 50, 114, 9, 3)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1.4
        ctx.stroke()
        // ноутбук — экран мягко светится
        ctx.fillStyle = '#31363c'
        rr(ctx, x + 28, y - 74, 30, 22, 2)
        ctx.fill()
        const scr = 0.28 + Math.sin(f * 0.06) * 0.08
        ctx.fillStyle = `rgba(150,190,220,${scr})`
        rr(ctx, x + 31, y - 71, 24, 16, 1.5)
        ctx.fill()
        ctx.fillStyle = '#262b30'
        rr(ctx, x + 26, y - 52, 34, 3.5, 1.5)
        ctx.fill()
        // стопка книг
        ctx.fillStyle = '#7a4a3a'
        rr(ctx, x + 7, y - 56, 18, 6, 1.5)
        ctx.fill()
        ctx.fillStyle = '#4a6a5a'
        rr(ctx, x + 9, y - 62, 15, 6, 1.5)
        ctx.fill()
        // листы бумаги
        ctx.fillStyle = 'rgba(240,232,214,0.85)'
        rr(ctx, x + 62, y - 54, 16, 5, 1)
        ctx.fill()
        // настольная лампа с тёплым светом
        ctx.strokeStyle = '#8a6f3d'
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.moveTo(x + 92, y - 50)
        ctx.lineTo(x + 88, y - 68)
        ctx.stroke()
        ctx.fillStyle = '#8a6f3d'
        ctx.beginPath()
        ctx.ellipse(x + 92, y - 50, 6, 2, 0, 0, Math.PI * 2)
        ctx.fill()
        const gl = 0.8 + Math.sin(f * 0.13) * 0.12
        ctx.fillStyle = `rgba(255,208,120,${0.72 * gl})`
        ctx.beginPath()
        ctx.moveTo(x + 78, y - 68)
        ctx.lineTo(x + 98, y - 68)
        ctx.lineTo(x + 94, y - 80)
        ctx.lineTo(x + 82, y - 80)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1.2
        ctx.stroke()
        const lg = ctx.createRadialGradient(x + 88, y - 66, 3, x + 88, y - 66, 46)
        lg.addColorStop(0, `rgba(255,208,120,${0.18 * gl})`)
        lg.addColorStop(1, 'rgba(255,208,120,0)')
        ctx.fillStyle = lg
        ctx.fillRect(x + 42, y - 112, 92, 112)
      },
    },
    {
      w: 2,
      h: 2,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 64, 60)
        // Кожаное кресло: спинка, подлокотники, плед, заклёпки
        ctx.fillStyle = '#6a4530'
        rr(ctx, x + 10, y - 58, 44, 46, 12)
        ctx.fill()
        ctx.fillStyle = '#7d5539'
        rr(ctx, x + 16, y - 52, 32, 22, 8)
        ctx.fill()
        ctx.fillStyle = '#5d3c28'
        rr(ctx, x + 4, y - 40, 12, 26, 5)
        ctx.fill()
        rr(ctx, x + 48, y - 40, 12, 26, 5)
        ctx.fill()
        ctx.fillStyle = '#744c33'
        rr(ctx, x + 12, y - 20, 40, 14, 5)
        ctx.fill()
        ctx.fillStyle = '#b08d57'
        for (const [rx, ry] of [
          [6, -36],
          [6, -26],
          [56, -36],
          [56, -26],
        ]) {
          ctx.beginPath()
          ctx.arc(x + rx, y + ry, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = WOOD_D
        ctx.fillRect(x + 10, y - 6, 6, 6)
        ctx.fillRect(x + 48, y - 6, 6, 6)
        // плед, перекинутый через подлокотник
        ctx.fillStyle = 'rgba(150,110,70,0.7)'
        rr(ctx, x + 44, y - 42, 18, 8, 3)
        ctx.fill()
      },
    },
    {
      w: 2,
      h: 3,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 74, 100)
        // Домашний книжный шкаф: три ряда книг + горизонтальная стопка
        ctx.fillStyle = WOOD
        rr(ctx, x + 2, y - 100, 70, 100, 3)
        ctx.fill()
        ctx.fillStyle = '#2f2418'
        rr(ctx, x + 6, y - 94, 62, 88, 2)
        ctx.fill()
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 2
        rr(ctx, x + 2, y - 100, 70, 100, 3)
        ctx.stroke()
        const cols = ['#7a4a3a', '#56665a', '#94805a', '#4a5a6a', '#6a4a60']
        for (let shelf = 0; shelf < 3; shelf++) {
          const sy = y - 86 - shelf * 28
          ctx.fillStyle = WOOD
          ctx.fillRect(x + 6, sy + 22, 62, 4)
          let bx = x + 9
          let bi = shelf * 4 + 1
          if (shelf === 1) {
            // горизонтальная стопка + бронзовая статуэтка
            ctx.fillStyle = '#4a5a6a'
            ctx.fillRect(x + 10, sy + 12, 24, 6)
            ctx.fillStyle = '#7a4a3a'
            ctx.fillRect(x + 12, sy + 6, 20, 6)
            ctx.fillStyle = '#8a6f3d'
            ctx.beginPath()
            ctx.arc(x + 52, sy + 12, 4, Math.PI, 0)
            ctx.fill()
            ctx.fillRect(x + 50, sy + 12, 4, 8)
            bx = x + 40
            bi = shelf * 4 + 5
          }
          while (bx < x + 58) {
            const bw = 5 + ((bi * 31) % 6)
            const bh = 18 + ((bi * 13) % 5)
            ctx.fillStyle = cols[(bi + shelf) % cols.length]
            ctx.fillRect(bx, sy + 22 - bh, bw, bh)
            bx += bw + 1.5
            bi++
          }
        }
      },
    },
    {
      w: 3,
      h: 2,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 112, 58)
        // Камин: каменный портал, живой огонь, полка со свечой и часами
        ctx.fillStyle = '#4f3a2a'
        rr(ctx, x + 4, y - 52, 104, 52, 4)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 2
        ctx.stroke()
        // кирпичная кладка намёком
        ctx.strokeStyle = 'rgba(30,20,12,0.4)'
        ctx.lineWidth = 1.4
        for (let k = 0; k < 3; k++) {
          const by = y - 40 + k * 14
          ctx.beginPath()
          ctx.moveTo(x + 8, by)
          ctx.lineTo(x + 32, by)
          ctx.moveTo(x + 80, by)
          ctx.lineTo(x + 104, by)
          ctx.stroke()
        }
        // тёмная топка
        ctx.fillStyle = '#1c120c'
        rr(ctx, x + 32, y - 34, 48, 34, 3)
        ctx.fill()
        // дрова
        ctx.strokeStyle = '#4a3320'
        ctx.lineWidth = 4.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x + 42, y - 9)
        ctx.lineTo(x + 68, y - 12)
        ctx.moveTo(x + 46, y - 15)
        ctx.lineTo(x + 66, y - 6)
        ctx.stroke()
        ctx.lineCap = 'butt'
        // огонь — живые язычки
        for (let k = 0; k < 3; k++) {
          const fx = x + 46 + k * 10
          const hgt = 13 + Math.sin(f * 0.21 + k * 2.1) * 4
          const sway = Math.sin(f * 0.13 + k) * 2.4
          const fg = ctx.createLinearGradient(0, y - 6, 0, y - 6 - hgt)
          fg.addColorStop(
            0,
            k === 1 ? 'rgba(255,214,110,0.95)' : 'rgba(255,150,60,0.9)',
          )
          fg.addColorStop(1, 'rgba(230,80,30,0)')
          ctx.fillStyle = fg
          ctx.beginPath()
          ctx.moveTo(fx - 4.5, y - 6)
          ctx.quadraticCurveTo(fx - 5 + sway, y - 6 - hgt * 0.6, fx + sway, y - 6 - hgt)
          ctx.quadraticCurveTo(fx + 5 + sway, y - 6 - hgt * 0.6, fx + 4.5, y - 6)
          ctx.closePath()
          ctx.fill()
        }
        // тепло из топки
        const hg = ctx.createRadialGradient(x + 56, y - 16, 4, x + 56, y - 16, 60)
        hg.addColorStop(0, `rgba(255,170,80,${0.16 + Math.sin(f * 0.17) * 0.04})`)
        hg.addColorStop(1, 'rgba(255,170,80,0)')
        ctx.fillStyle = hg
        ctx.fillRect(x - 4, y - 76, 120, 76)
        // каминная полка
        ctx.fillStyle = WOOD_L
        rr(ctx, x, y - 58, 112, 8, 3)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1.4
        ctx.stroke()
        // свеча с живым огоньком
        ctx.fillStyle = 'rgba(238,226,196,0.85)'
        rr(ctx, x + 14, y - 68, 6, 10, 1.5)
        ctx.fill()
        const fl2 = 0.6 + Math.sin(f * 0.3) * 0.3
        ctx.fillStyle = `rgba(255,200,110,${0.8 * fl2})`
        ctx.beginPath()
        ctx.ellipse(x + 17, y - 71, 2, 3.4, 0, 0, Math.PI * 2)
        ctx.fill()
        // настольные часы
        ctx.fillStyle = WOOD_D
        rr(ctx, x + 80, y - 72, 18, 14, 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(238,226,196,0.7)'
        ctx.beginPath()
        ctx.arc(x + 89, y - 65, 4.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(60,44,28,0.9)'
        ctx.lineWidth = 1.2
        const ha = f * 0.02
        ctx.beginPath()
        ctx.moveTo(x + 89, y - 65)
        ctx.lineTo(x + 89 + Math.sin(ha) * 3, y - 65 - Math.cos(ha) * 3)
        ctx.stroke()
      },
    },
    {
      w: 1,
      h: 2,
      draw: (ctx, x, y, f) => {
        furnBase(ctx, x, y, 36, 46)
        // Глобус на латунной ножке — материки медленно плывут
        const cx = x + 18
        const cy = y - 56
        ctx.fillStyle = '#4f6d7d'
        ctx.beginPath()
        ctx.arc(cx, cy, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, 14, 0, Math.PI * 2)
        ctx.clip()
        ctx.fillStyle = 'rgba(110,124,74,0.9)'
        const off = (f * 0.12) % 56
        for (let k = -1; k < 2; k++) {
          const lx = cx - 28 + k * 56 + off
          ctx.beginPath()
          ctx.ellipse(lx, cy - 4, 8, 5, 0.3, 0, Math.PI * 2)
          ctx.ellipse(lx + 10, cy + 6, 6, 4, -0.2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        // блик на стекле
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(cx - 4, cy - 4, 9, Math.PI * 1.05, Math.PI * 1.45)
        ctx.stroke()
        // наклонная ось и латунная дуга
        ctx.strokeStyle = '#8a6f3d'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, 17, -Math.PI * 0.75, Math.PI * 0.35)
        ctx.moveTo(cx + 6, cy - 18)
        ctx.lineTo(cx - 6, cy + 18)
        ctx.stroke()
        // подставка
        ctx.fillStyle = '#8a6f3d'
        ctx.fillRect(cx - 2, cy + 14, 4, 26)
        ctx.fillStyle = WOOD_D
        rr(ctx, cx - 10, cy + 40, 20, 5, 2)
        ctx.fill()
      },
    },
    {
      w: 1,
      h: 3,
      draw: (ctx, x, y) => {
        furnBase(ctx, x, y, 32, 80)
        // Гитара на подставке у стены
        const cx = x + 17
        ctx.fillStyle = '#4a3520'
        ctx.fillRect(cx - 3, y - 78, 6, 42)
        ctx.fillStyle = '#3a2a18'
        rr(ctx, cx - 4, y - 90, 8, 14, 2)
        ctx.fill()
        ctx.fillStyle = '#c8b98a'
        for (let k = 0; k < 3; k++) {
          ctx.beginPath()
          ctx.arc(cx - 6, y - 87 + k * 4.5, 1.4, 0, Math.PI * 2)
          ctx.arc(cx + 6, y - 87 + k * 4.5, 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
        // корпус-«восьмёрка»
        ctx.fillStyle = '#7d5230'
        ctx.beginPath()
        ctx.ellipse(cx, y - 18, 14, 12, 0, 0, Math.PI * 2)
        ctx.ellipse(cx, y - 38, 12, 11, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#4a3018'
        ctx.lineWidth = 1.6
        ctx.stroke()
        // розетка
        ctx.fillStyle = '#3a2412'
        ctx.beginPath()
        ctx.arc(cx, y - 30, 4.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(200,185,138,0.6)'
        ctx.lineWidth = 1
        ctx.stroke()
        // струны
        ctx.strokeStyle = 'rgba(220,214,190,0.55)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(cx - 2, y - 88)
        ctx.lineTo(cx - 2, y - 12)
        ctx.moveTo(cx + 2, y - 88)
        ctx.lineTo(cx + 2, y - 12)
        ctx.stroke()
        // подставка
        ctx.strokeStyle = WOOD_D
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(cx - 9, y)
        ctx.lineTo(cx + 9, y - 4)
        ctx.stroke()
      },
    },
  ],
}

// ---------- Буфер интерьера ----------
// Мебель рисуется в отдельный холст и попадает на сцену обесцвеченной,
// затемнённой и чуть размытой — интерьер уходит на второй план и не
// спорит с героем, рубильниками и лампочками.

let decorBuf: HTMLCanvasElement | null = null
let decorCtx: CanvasRenderingContext2D | null = null

function decorBuffer(): HTMLCanvasElement {
  if (!decorBuf) {
    decorBuf = document.createElement('canvas')
    decorBuf.width = VIEW_W
    decorBuf.height = VIEW_H
    decorCtx = decorBuf.getContext('2d')
  }
  return decorBuf
}

/**
 * Расставляет мебель уровня: детерминированно по номеру уровня,
 * только на широких этажах и подальше от интерактивных объектов.
 */
function drawDecor(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  const def = LEVELS[g.levelIndex]
  const set = FURNITURE[def.theme]
  const buf = decorBuffer()
  const dctx = decorCtx
  if (!dctx) return
  // Готовим буфер: чистим и ставим ту же камеру, что у основной сцены
  dctx.setTransform(1, 0, 0, 1, 0, 0)
  dctx.clearRect(0, 0, VIEW_W, VIEW_H)
  dctx.translate(-Math.round(g.camX), -Math.round(g.camY))

  const c0 = Math.max(0, Math.floor(g.camX / TILE) - 2)
  const c1 = Math.min(g.cols - 4, Math.ceil((g.camX + VIEW_W) / TILE) + 2)
  const r1 = g.rows - 1

  // Запретные зоны: щиток, рубильники, предохранители, старт
  const noGo: { x: number; r: number }[] = []
  noGo.push({ x: g.exit.x + 18, r: Math.floor((g.exit.y - 4) / TILE) })
  for (const s of g.switches) noGo.push({ x: s.x, r: Math.floor(s.y / TILE) - 1 })
  for (const fu of g.fuses) noGo.push({ x: fu.x, r: Math.floor(fu.y / TILE) })
  const px = def.map.findIndex((row) => row.includes('P'))
  const pc = def.map[px]?.indexOf('P') ?? -1
  if (px >= 0 && pc >= 0) noGo.push({ x: pc * TILE + 20, r: px })

  for (let r = 0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      // Поверхность: твёрдый тайл с воздухом сверху
      if (g.grid[r * g.cols + c] !== 1) continue
      if (r > 0 && g.grid[(r - 1) * g.cols + c] === 1) continue
      // Слот каждые 5 колонок, со сдвигом на уровень и ряд
      if ((c + r * 2 + g.levelIndex * 3) % 5 !== 0) continue
      const pick = hash2(c * 7 + g.levelIndex, r * 13)
      if (pick > 0.76) continue // часть слотов пустует — воздух нужен
      const piece = set[Math.floor(hash2(c, r * 3 + 1) * set.length)]

      const wt = Math.ceil(piece.w)
      // Пол продолжается под всей мебелью; вверх достаточно двух рядов
      // воздуха — высокая мебель прячется ЗА платформами (глубина комнаты)
      let ok = true
      for (let k = 0; k < wt; k++) {
        if (c + k >= g.cols || g.grid[r * g.cols + c + k] !== 1) ok = false
        for (let hr = 1; hr <= 2; hr++) {
          if (r - hr >= 0 && g.grid[(r - hr) * g.cols + c + k] === 1) ok = false
        }
      }
      if (!ok) continue

      const x = c * TILE
      const cxm = x + piece.w * TILE * 0.5
      for (const n of noGo) {
        if (Math.abs(n.x - cxm) < 90 && Math.abs(n.r - r) <= 2) ok = false
      }
      if (!ok) continue

      dctx.save()
      dctx.globalAlpha = 0.94
      piece.draw(dctx, x, r * TILE, g.frame)
      dctx.restore()
    }
  }

  // Композит на сцену: интерьер приглушён, чуть размыт и мягче по контрасту
  ctx.save()
  ctx.filter = 'saturate(0.5) brightness(0.72) contrast(0.95) blur(1px)'
  ctx.drawImage(buf, Math.round(g.camX), Math.round(g.camY))
  ctx.restore()
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
  ctx.fillStyle = g.exit.locked ? '#4a3530' : '#2e4632'
  rr(ctx, x, y - 56, 36, 56, 5)
  ctx.fill()
  ctx.strokeStyle = '#1a2b1e'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.fillStyle = g.exit.locked ? '#5c443c' : '#3c5a42'
  rr(ctx, x + 5, y - 50, 26, 44, 3)
  ctx.fill()
  // Молния
  ctx.fillStyle = g.exit.locked ? '#8a8a8a' : '#ffe14d'
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
  ctx.fillStyle = g.exit.locked
    ? blink
      ? '#ff6a5a'
      : '#6b3a35'
    : blink
      ? '#8df08a'
      : '#3f6b3f'
  ctx.beginPath()
  ctx.arc(x + 18, y - 9, 3.2, 0, Math.PI * 2)
  ctx.fill()

  const bob = Math.sin(g.frame * 0.1) * 4
  if (g.exit.locked) {
    // Замок вместо стрелки
    ctx.strokeStyle = '#ffb14d'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.arc(x + 18, y - 68 + bob, 4.5, Math.PI, 0)
    ctx.stroke()
    ctx.fillStyle = '#ffb14d'
    rr(ctx, x + 11.5, y - 68 + bob, 13, 10.5, 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.4
    ctx.stroke()

    // Пипсы прогресса: что осталось для открытия щитка
    const total = g.switches.length + g.fuses.length
    if (total > 0 && total <= 8) {
      const n = g.switches.length
      for (let i = 0; i < total; i++) {
        const px = x + 2 + i * 9
        const done =
          i < n ? g.switches[i].flipped : g.fuses[i - n].taken
        ctx.fillStyle = done
          ? i < n
            ? '#63d471'
            : '#ffcf6a'
          : 'rgba(255,255,255,0.22)'
        rr(ctx, px, y - 86, 6, 6, 1.5)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  } else {
    // Стрелка
    ctx.fillStyle = '#8df08a'
    ctx.beginPath()
    ctx.moveTo(x + 8, y - 72 + bob)
    ctx.lineTo(x + 28, y - 72 + bob)
    ctx.lineTo(x + 18, y - 61 + bob)
    ctx.closePath()
    ctx.fill()
  }
}

function drawHazards(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const h of g.hazards) {
    const x = h.x
    const y = h.y
    if (h.kind === 'spikes') {
      // Шипы из старой арматуры — торчат из пола
      const sg = ctx.createLinearGradient(0, y - 18, 0, y)
      sg.addColorStop(0, '#c3ccd4')
      sg.addColorStop(1, '#5d666e')
      ctx.fillStyle = sg
      ctx.beginPath()
      for (let i = 0; i < 4; i++) {
        const bx = x - 18 + i * 12
        ctx.moveTo(bx, y)
        ctx.lineTo(bx + 5.5, y - 17 - (i % 2) * 4)
        ctx.lineTo(bx + 11, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#33393f'
      ctx.lineWidth = 1.4
      ctx.stroke()
      // Предупреждающие искорки
      if ((g.frame + Math.floor(x)) % 140 < 7) {
        const gl = ctx.createRadialGradient(x, y - 12, 2, x, y - 12, 22)
        gl.addColorStop(0, 'rgba(255,120,90,0.55)')
        gl.addColorStop(1, 'rgba(255,120,90,0)')
        ctx.fillStyle = gl
        ctx.fillRect(x - 22, y - 34, 44, 44)
      }
      continue
    }
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
    // Стрелки движения: у вертикальных платформ — вверх/вниз
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    const wob = Math.sin(g.frame * 0.08) * 2
    if (pl.axis === 'y') {
      const midX = pl.x + pl.w / 2
      ctx.beginPath()
      ctx.moveTo(midX - 5, pl.y + 12 - wob)
      ctx.lineTo(midX, pl.y + 4 - wob)
      ctx.lineTo(midX + 5, pl.y + 12 - wob)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(midX - 5, pl.y + 4 + wob)
      ctx.lineTo(midX, pl.y + 12 + wob)
      ctx.lineTo(midX + 5, pl.y + 4 + wob)
      ctx.closePath()
      ctx.fill()
    } else {
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
}

/** Осыпающиеся плиты: трясутся и рассыпаются под игроком. */
function drawCrumbs(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const c of g.crumbs) {
    if (c.state === 2) {
      // Призрачный контур на месте разрушенной плиты
      const blinkIn = c.timer < 70 && Math.floor(g.frame / 8) % 2 === 0
      ctx.globalAlpha = blinkIn ? 0.4 : 0.16
      ctx.strokeStyle = '#d8cfae'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2)
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      continue
    }
    const shake = c.state === 1 ? Math.sin(g.frame * 1.35) * 2 : 0
    const grad = ctx.createLinearGradient(0, c.y, 0, c.y + c.h)
    grad.addColorStop(0, '#a89a78')
    grad.addColorStop(1, '#6e6450')
    ctx.fillStyle = grad
    rr(ctx, c.x + shake, c.y, c.w, c.h, 3)
    ctx.fill()
    ctx.strokeStyle = '#4a4335'
    ctx.lineWidth = 2
    ctx.stroke()
    // Трещины
    ctx.strokeStyle = 'rgba(40,34,22,0.55)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(c.x + 8 + shake, c.y + 3)
    ctx.lineTo(c.x + 14 + shake, c.y + 9)
    ctx.lineTo(c.x + 10 + shake, c.y + 13)
    ctx.moveTo(c.x + 26 + shake, c.y + 2)
    ctx.lineTo(c.x + 22 + shake, c.y + 8)
    ctx.lineTo(c.x + 28 + shake, c.y + 13)
    ctx.stroke()
  }
}

/** Предохранители — ключи от запертого щитка. */
function drawFuses(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const fu of g.fuses) {
    if (fu.taken) continue
    const bob = Math.sin(g.frame * 0.05 + fu.phase) * 4
    const x = fu.x
    const y = fu.y + bob
    // Свечение
    const gl = ctx.createRadialGradient(x, y, 3, x, y, 20)
    gl.addColorStop(0, 'rgba(255,190,80,0.5)')
    gl.addColorStop(1, 'rgba(255,190,80,0)')
    ctx.fillStyle = gl
    ctx.fillRect(x - 20, y - 20, 40, 40)
    // Керамический корпус
    ctx.fillStyle = '#f0e8d4'
    rr(ctx, x - 6, y - 9, 12, 18, 4)
    ctx.fill()
    ctx.strokeStyle = '#a89778'
    ctx.lineWidth = 1.4
    ctx.stroke()
    // Металлические колпачки
    ctx.fillStyle = '#c8cdd2'
    rr(ctx, x - 5.5, y - 12, 11, 5, 1.5)
    ctx.fill()
    rr(ctx, x - 5.5, y + 7, 11, 5, 1.5)
    ctx.fill()
    // Тёплая нить внутри
    const hot = 0.5 + Math.sin(g.frame * 0.15 + fu.phase) * 0.3
    ctx.strokeStyle = `rgba(255,${Math.round(150 + hot * 80)},60,${0.7 + hot * 0.3})`
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(x, y - 7)
    ctx.lineTo(x - 2.5, y - 3)
    ctx.lineTo(x + 2.5, y + 1)
    ctx.lineTo(x, y + 6)
    ctx.stroke()
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

  ctx.save()
  ctx.translate(cx, feetY)
  ctx.scale(2 - p.squash, p.squash)

  const f = p.facing
  const dir = -f // сторона, в которую течёт плащ (за спину)
  const speed = Math.min(1, Math.abs(p.vx) / 4.2)
  const air = !p.onGround

  // ================= ПЛАЩ =================
  // Течёт за спину, форма зависит от скорости, вертикали и порывов —
  // при смене направления мгновенно оказывается по нужную сторону.
  {
    const wave = Math.sin(g.frame * 0.32) * (1.6 + speed * 2.6)
    const flap = Math.sin(g.frame * 0.57 + 1) * 2.2
    const lift = p.vy < -2 ? -7 : p.vy > 3 ? Math.min(9, p.vy * 0.85) : 0
    const reach = 9 + speed * 11
    ctx.save()
    ctx.translate(0, -31)
    const cg = ctx.createLinearGradient(0, -2, dir * reach * 1.7, 22)
    cg.addColorStop(0, '#e14b41')
    cg.addColorStop(0.55, '#b52f34')
    cg.addColorStop(1, '#87202c')
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.moveTo(dir * 2.5, -3)
    ctx.quadraticCurveTo(
      dir * reach * 0.85,
      1 + flap * 0.5,
      dir * (reach + wave),
      9 + lift * 0.55 + flap,
    )
    ctx.quadraticCurveTo(
      dir * reach * 0.6,
      13 + lift * 0.8 + flap * 0.6,
      dir * (reach * 0.45 + wave * 0.45),
      15.5 + lift,
    )
    ctx.quadraticCurveTo(dir * 6, 19 + flap * 0.3, dir * 2, 23)
    ctx.closePath()
    ctx.fill()
    // складка-тень
    ctx.fillStyle = 'rgba(66,8,18,0.38)'
    ctx.beginPath()
    ctx.moveTo(dir * 2, 1)
    ctx.quadraticCurveTo(
      dir * reach * 0.5,
      6 + flap * 0.4,
      dir * (reach * 0.42 + wave * 0.4),
      14 + lift,
    )
    ctx.quadraticCurveTo(dir * 4, 17, dir * 1.5, 21)
    ctx.closePath()
    ctx.fill()
    // золотая застёжка у шеи
    ctx.fillStyle = '#ffd34d'
    ctx.beginPath()
    ctx.arc(dir * 1.6, -2.2, 1.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Свечение
  const gl = ctx.createRadialGradient(0, -24, 4, 0, -24, 30)
  gl.addColorStop(0, 'rgba(255,232,140,0.4)')
  gl.addColorStop(1, 'rgba(255,232,140,0)')
  ctx.fillStyle = gl
  ctx.fillRect(-30, -54, 60, 60)

  // Скоростные линии позади
  if (speed > 0.55) {
    ctx.strokeStyle = 'rgba(255,240,190,0.45)'
    ctx.lineWidth = 1.6
    for (let i = 0; i < 3; i++) {
      const yy = -14 - i * 7
      const len = 5 + speed * 8 + Math.sin(g.frame * 0.7 + i * 2.1) * 2
      ctx.beginPath()
      ctx.moveTo(dir * (13 + i * 2.5), yy)
      ctx.lineTo(dir * (13 + i * 2.5 + len), yy)
      ctx.stroke()
    }
  }

  // ================= НОЖКИ В БОТИНКАХ =================
  const step = air ? 0 : Math.sin(p.anim)
  const legSwing = air ? (p.vy < 0 ? 2.4 : 1.2) : step * 5.5
  ctx.strokeStyle = '#6b4a12'
  ctx.lineWidth = 4.2
  ctx.lineCap = 'round'
  // задняя нога
  ctx.beginPath()
  ctx.moveTo(-3.5, -10)
  ctx.lineTo(-3.5 - legSwing, -1.5 - (air ? 2.5 : Math.max(0, -step) * 2))
  ctx.stroke()
  // передняя нога
  ctx.beginPath()
  ctx.moveTo(3.5, -10)
  ctx.lineTo(3.5 + legSwing, -1.5 - (air ? 1 : Math.max(0, step) * 2))
  ctx.stroke()
  ctx.lineCap = 'butt'
  // ботинки (носок смотрит по направлению взгляда)
  ctx.fillStyle = '#5d420f'
  const bootX1 = -3.5 - legSwing
  const bootY1 = -1.5 - (air ? 2.5 : Math.max(0, -step) * 2)
  const bootX2 = 3.5 + legSwing
  const bootY2 = -1.5 - (air ? 1 : Math.max(0, step) * 2)
  rr(ctx, bootX1 - 3.2 + (f < 0 ? -2.2 : 0), bootY1 - 3.2, 8.4, 4.2, 2)
  ctx.fill()
  rr(ctx, bootX2 - 3.2 + (f < 0 ? -2.2 : 0), bootY2 - 3.2, 8.4, 4.2, 2)
  ctx.fill()

  // ================= ЦОКОЛЬ-БРОНЯ =================
  ctx.fillStyle = '#b9bec4'
  rr(ctx, -7.5, -15, 15, 10.5, 2.5)
  ctx.fill()
  ctx.strokeStyle = '#8b9198'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-7.5, -12)
  ctx.lineTo(7.5, -12)
  ctx.moveTo(-7.5, -9.4)
  ctx.lineTo(7.5, -9.4)
  ctx.stroke()
  ctx.strokeStyle = '#7d838a'
  ctx.lineWidth = 1.2
  rr(ctx, -7.5, -15, 15, 10.5, 2.5)
  ctx.stroke()
  // Эмблема-молния на «груди»
  ctx.fillStyle = '#f7b32b'
  ctx.beginPath()
  ctx.moveTo(1.6, -14.4)
  ctx.lineTo(-2.2, -9.8)
  ctx.lineTo(-0.2, -9.8)
  ctx.lineTo(-1.6, -5.4)
  ctx.lineTo(2.4, -10.6)
  ctx.lineTo(0.4, -10.6)
  ctx.closePath()
  ctx.fill()

  // ================= КОЛБА =================
  // Верхний «наплыв» — как у настоящей лампы
  ctx.fillStyle = '#d8a13f'
  rr(ctx, -2.6, -42.5, 5.2, 5.5, 2.2)
  ctx.fill()
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
  // Блик на стекле
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(-1, -26.5, 9.5, Math.PI * 1.06, Math.PI * 1.4)
  ctx.stroke()
  ctx.lineCap = 'butt'

  // ================= ЛИЦО =================
  const fx = f * 2.5
  const lookY = clampF(p.vy * 0.22, -2, 2)
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
    // белки
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(fx - 4.5, -28 + lookY * 0.4, 3.4, 3.7, 0, 0, Math.PI * 2)
    ctx.ellipse(fx + 4.5, -28 + lookY * 0.4, 3.4, 3.7, 0, 0, Math.PI * 2)
    ctx.fill()
    // зрачки (смотрят по направлению и вверх/вниз)
    ctx.fillStyle = '#33230a'
    ctx.beginPath()
    ctx.arc(fx - 4.5 + f * 1.4, -28 + lookY, 1.8, 0, Math.PI * 2)
    ctx.arc(fx + 4.5 + f * 1.4, -28 + lookY, 1.8, 0, Math.PI * 2)
    ctx.fill()
    // блики
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.arc(fx - 5.2 + f * 1.4, -29.2 + lookY, 0.7, 0, Math.PI * 2)
    ctx.arc(fx + 3.8 + f * 1.4, -29.2 + lookY, 0.7, 0, Math.PI * 2)
    ctx.fill()
  }
  // Решительные брови при разгоне
  if (speed > 0.35 || air) {
    ctx.strokeStyle = '#4a3208'
    ctx.lineWidth = 1.7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(fx - 7.4, -33.4)
    ctx.lineTo(fx - 2.2, -32)
    ctx.moveTo(fx + 7.4, -33.4)
    ctx.lineTo(fx + 2.2, -32)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }
  // Рот: улыбка, «о» при быстром падении, решимая линия при разгоне
  ctx.strokeStyle = '#4a3208'
  ctx.lineWidth = 1.6
  if (p.vy > 8.5) {
    ctx.fillStyle = '#4a3208'
    ctx.beginPath()
    ctx.ellipse(fx, -21.5, 2.6, 3.2, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (speed > 0.6) {
    ctx.beginPath()
    ctx.moveTo(fx - 3.6, -21.5)
    ctx.lineTo(fx + 3.6, -21.9)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(fx, -22.5, 4.2, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  }
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

/** Гонец — стремительный обогреватель-спринтер. */
function drawRunners(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const v of g.runners) {
    if (v.dead) continue
    const cx = v.x + v.w / 2
    const cy = v.y + 18
    const dir = Math.sign(v.vx) || 1
    const stride = Math.sin(v.anim * 2.6)
    // Скоростные шлейфы
    ctx.strokeStyle = 'rgba(255,140,70,0.4)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      const yy = cy - 8 + i * 7
      ctx.beginPath()
      ctx.moveTo(cx - dir * (14 + i * 3), yy)
      ctx.lineTo(cx - dir * (26 + i * 5), yy + 1)
      ctx.stroke()
    }
    ctx.lineCap = 'butt'
    // Ноги-ножницы
    ctx.strokeStyle = '#6e2a10'
    ctx.lineWidth = 3.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 2, cy + 10)
    ctx.lineTo(cx - 2 + stride * 7, cy + 19 - Math.abs(stride) * 2)
    ctx.moveTo(cx + 2, cy + 10)
    ctx.lineTo(cx + 2 - stride * 7, cy + 19 - Math.abs(stride) * 2)
    ctx.stroke()
    ctx.lineCap = 'butt'
    // Наклонённое вперёд тело-пламя
    const bg = ctx.createLinearGradient(cx, cy - 16, cx, cy + 14)
    bg.addColorStop(0, '#ff9040')
    bg.addColorStop(1, '#a33217')
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.moveTo(cx + dir * 15, cy - 2)
    ctx.quadraticCurveTo(cx + dir * 6, cy - 18, cx - dir * 9, cy - 13)
    ctx.quadraticCurveTo(cx - dir * 15, cy + 2, cx - dir * 8, cy + 12)
    ctx.quadraticCurveTo(cx + dir * 4, cy + 16, cx + dir * 15, cy - 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#7e2711'
    ctx.lineWidth = 1.6
    ctx.stroke()
    // Дым-хвостик сзади
    ctx.fillStyle = 'rgba(120,90,80,0.5)'
    ctx.beginPath()
    ctx.arc(cx - dir * 16, cy + 6 + Math.sin(g.frame * 0.3) * 2, 4, 0, Math.PI * 2)
    ctx.arc(cx - dir * 21, cy + 9, 2.6, 0, Math.PI * 2)
    ctx.fill()
    // Злые глаза-щёлки
    ctx.fillStyle = '#ffe14d'
    ctx.beginPath()
    ctx.ellipse(cx + dir * 5, cy - 5, 3.2, 2, dir * 0.3, 0, Math.PI * 2)
    ctx.ellipse(cx + dir * 11, cy - 4, 2.4, 1.6, dir * 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#42100a'
    ctx.beginPath()
    ctx.arc(cx + dir * 5.8, cy - 5, 1.2, 0, Math.PI * 2)
    ctx.arc(cx + dir * 11.6, cy - 4, 1, 0, Math.PI * 2)
    ctx.fill()
    // Решётка-рот
    ctx.strokeStyle = '#42100a'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(cx + dir * (3 + i * 4), cy + 3)
      ctx.lineTo(cx + dir * (3 + i * 4), cy + 7)
    }
    ctx.stroke()
  }
}

/** Дрон-пылесос — летающая банка с пропеллером и всасывающей пастью. */
function drawDrones(ctx: CanvasRenderingContext2D, g: EnergoGame) {
  for (const d of g.drones) {
    if (d.dead) continue
    const cx = d.x + d.w / 2
    const cy = d.y + d.h / 2
    const bob = Math.sin(d.anim * 2.2) * 1.6
    const dir = Math.sign(d.vx) || 1
    // Корпус-банка
    const bg = ctx.createLinearGradient(0, cy - 14, 0, cy + 12)
    bg.addColorStop(0, '#8fa0aa')
    bg.addColorStop(1, '#4e5a62')
    ctx.fillStyle = bg
    rr(ctx, cx - 14, cy - 11 + bob, 28, 22, 9)
    ctx.fill()
    ctx.strokeStyle = '#333c42'
    ctx.lineWidth = 1.8
    ctx.stroke()
    // Пропеллер сверху
    const spin = Math.sin(d.anim * 6) * 12
    ctx.strokeStyle = 'rgba(200,215,225,0.85)'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(cx - spin, cy - 15 + bob)
    ctx.lineTo(cx + spin, cy - 15 + bob)
    ctx.stroke()
    ctx.strokeStyle = '#333c42'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(cx, cy - 15 + bob)
    ctx.lineTo(cx, cy - 11 + bob)
    ctx.stroke()
    // Красный глаз-сканер
    const eyeGlow = 0.6 + Math.sin(g.frame * 0.2) * 0.3
    ctx.fillStyle = `rgba(255,80,60,${eyeGlow})`
    ctx.beginPath()
    ctx.arc(cx + dir * 6, cy - 4 + bob, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2a2f33'
    ctx.lineWidth = 1.2
    ctx.stroke()
    // Всасывающая пасть (снизу-спереди)
    ctx.fillStyle = '#1c2226'
    ctx.beginPath()
    ctx.ellipse(cx + dir * 6, cy + 8 + bob, 7, 5.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#0e1214'
    ctx.lineWidth = 1.6
    ctx.stroke()
    ctx.strokeStyle = 'rgba(150,190,210,0.5)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(cx + dir * 6, cy + 8 + bob, 4.2, 0.1 * Math.PI, 0.9 * Math.PI)
    ctx.stroke()
    // Индикатор зарядки
    ctx.fillStyle = '#ffd34d'
    rr(ctx, cx - 9, cy + 1 + bob, 5, 3, 1)
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

  // Рубильники и предохранители (каждый ряд — если есть на уровне)
  let fy = 70
  const pulse = g.exit.locked ? 0.6 + Math.sin(g.frame * 0.18) * 0.4 : 1
  const lockedCol = `rgba(255,177,77,${pulse})`
  if (g.switchesTotal > 0) {
    ctx.font = fnt(15, 800)
    ctx.fillStyle = g.exit.locked ? lockedCol : '#ffe37a'
    ctx.fillText(`${g.switchesGot}/${g.switchesTotal}`, VIEW_W - 48, fy)
    // мини-рубильник: корпус + рычаг
    ctx.fillStyle = '#3c3c44'
    rr(ctx, VIEW_W - 102, fy - 8, 12, 16, 2)
    ctx.fill()
    ctx.strokeStyle = '#23232a'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.strokeStyle = g.switchesGot >= g.switchesTotal ? '#63d471' : '#ff5a4e'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(VIEW_W - 96, fy - 1)
    ctx.lineTo(VIEW_W - 96, g.switchesGot >= g.switchesTotal ? fy + 4 : fy - 6)
    ctx.stroke()
    ctx.lineCap = 'butt'
    fy += 22
  }
  if (g.fusesTotal > 0) {
    ctx.font = fnt(15, 800)
    ctx.fillStyle = g.exit.locked ? lockedCol : '#ffe37a'
    ctx.fillText(`${g.fusesGot}/${g.fusesTotal}`, VIEW_W - 48, fy)
    ctx.fillStyle = '#f0e8d4'
    rr(ctx, VIEW_W - 101, fy - 7, 8, 12, 2.5)
    ctx.fill()
    ctx.strokeStyle = '#a89778'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#c8cdd2'
    rr(ctx, VIEW_W - 100.5, fy - 9.5, 7, 3, 1)
    ctx.fill()
    rr(ctx, VIEW_W - 100.5, fy + 2.5, 7, 3, 1)
    ctx.fill()
    fy += 22
  }
  if (g.exit.locked && (g.switchesTotal > 0 || g.fusesTotal > 0)) {
    ctx.font = fnt(9, 800)
    ctx.fillStyle = `rgba(255,177,77,${0.55 + pulse * 0.4})`
    ctx.textAlign = 'right'
    ctx.fillText('ЩИТОК ЗАПЕРТ', VIEW_W - 48, fy - 8)
  }

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
