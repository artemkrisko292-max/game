// Иллюстрации катсцен «ЭнергоГероя»: рисованные кадры-комиксы в палитре игры.
// Каждый кадр — SVG 320×180 вflat-стиле: тёплая бумага, чернильный контур,
// ламповое золото и ночь. Персонажи повторяют дизайн с игрового канваса.

import type { ArtId } from '@/lib/game/story'

const INK = '#221e17'
const GOLD = '#ffd23f'
const RED = '#c8402e'
const PAPER = '#f4eeda'

/* ================================================================== */
/* Персонажи                                                          */
/* ================================================================== */

type Mood = 'happy' | 'determined' | 'gasp' | 'angry' | 'calm'

/** Вжик — светодиодная лампочка в плаще. Центр колбы (0,0), радиус 16. */
function Vzhik({
  x,
  y,
  s = 1,
  flip = 1,
  mood = 'happy',
  cape = 1.3,
}: {
  x: number
  y: number
  s?: number
  flip?: 1 | -1
  mood?: Mood
  cape?: number
}) {
  const f = flip as 1 | -1
  return (
    <g transform={`translate(${x} ${y}) scale(${(s * f).toFixed(3)} ${s})`}>
      {/* плащ течёт за спину */}
      <path
        d={`M ${-3 * f} -14 C ${-18 * f * cape} -8, ${-24 * f * cape} 6, ${-20 * f * cape} 26 L ${-4 * f} 14 Z`}
        fill="#b52f34"
        stroke="#7d1c26"
        strokeWidth="1.6"
      />
      <path
        d={`M ${-3 * f} -12 C ${-13 * f * cape} -6, ${-17 * f * cape} 6, ${-14 * f * cape} 22 L ${-4 * f} 13 Z`}
        fill="#87202c"
        opacity="0.55"
      />
      {/* свечение */}
      <circle cx="0" cy="0" r="24" fill="url(#ah-glow-warm)" opacity="0.5" />
      {/* ножки в ботинках */}
      <path d="M -6 16 L -8 27" stroke="#6b4a12" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M 6 16 L 8 27" stroke="#6b4a12" strokeWidth="4.4" strokeLinecap="round" />
      <rect x={-12.5 + (f < 0 ? -3 : 0)} y="25" width="10" height="5" rx="2.4" fill="#5d420f" />
      <rect x={3.5 + (f < 0 ? -3 : 0)} y="25" width="10" height="5" rx="2.4" fill="#5d420f" />
      {/* цоколь-броня */}
      <rect x="-11" y="9" width="22" height="13" rx="3" fill="#b9bec4" stroke="#7d838a" strokeWidth="1.4" />
      <path d="M -11 14 H 11 M -11 17.5 H 11" stroke="#8b9198" strokeWidth="1.2" />
      <path d={`M ${1.8 * f} 9.5 L ${-2.4 * f} 13.2 L ${-0.4 * f} 13.2 L ${-1.8 * f} 17.4 L ${2.6 * f} 12.4 L ${0.4 * f} 12.4 Z`} fill="#f7b32b" />
      {/* наплыв колбы */}
      <rect x="-4" y="-26" width="8" height="7" rx="3" fill="#d8a13f" stroke="#8c5f0f" strokeWidth="1.2" />
      {/* колба */}
      <circle cx="0" cy="0" r="16" fill="url(#ah-bulb)" stroke="rgba(140,95,15,0.7)" strokeWidth="1.8" />
      <path d="M -9 -6 A 11.5 11.5 0 0 1 -1 -12.6" stroke="rgba(255,255,255,0.8)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* лицо */}
      {mood === 'gasp' ? (
        <>
          <ellipse cx="-6" cy="-3.5" rx="4" ry="4.6" fill="#fff" />
          <ellipse cx="6" cy="-3.5" rx="4" ry="4.6" fill="#fff" />
          <circle cx="-5" cy="-2.6" r="2.1" fill="#33230a" />
          <circle cx="7" cy="-2.6" r="2.1" fill="#33230a" />
          <circle cx="-6" cy="-5" r="3.9" fill="none" stroke={INK} strokeWidth="1.4" />
          <circle cx="6" cy="-5" r="3.9" fill="none" stroke={INK} strokeWidth="1.4" />
          <ellipse cx="0" cy="7" rx="2.6" ry="3.4" fill="#4a3208" />
        </>
      ) : (
        <>
          <ellipse cx="-5.5" cy="-3.5" rx="3.7" ry="4.1" fill="#fff" />
          <ellipse cx="5.5" cy="-3.5" rx="3.7" ry="4.1" fill="#fff" />
          <circle cx={-4.4 + f * 0.9} cy="-3" r="1.9" fill="#33230a" />
          <circle cx={6.6 + f * 0.9} cy="-3" r="1.9" fill="#33230a" />
          <circle cx={-5.4 + f} cy="-4.6" r="0.8" fill="#fff" opacity="0.9" />
          <circle cx={5.6 + f} cy="-4.6" r="0.8" fill="#fff" opacity="0.9" />
          {mood === 'calm' ? null : (
            <path d={`M ${-9.5 * f} -9.5 L ${-2.6 * f} -7.6`} stroke="#4a3208" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </>
      )}
      {/* брови решительные / спокойные */}
      {mood === 'determined' || mood === 'angry' ? (
        <>
          <path d={`M ${-9.8 * f} -9.2 L ${-2.4 * f} -7.9`} stroke="#4a3208" strokeWidth="1.7" strokeLinecap="round" />
          <path d={`M ${9.8 * f} -9.2 L ${2.4 * f} -7.9`} stroke="#4a3208" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : null}
      {/* рот */}
      {mood === 'determined' ? (
        <path d="M -4.2 7.1 A 4.4 4.4 0 0 0 4.2 7.05" stroke="#4a3208" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      ) : mood === 'calm' ? (
        <path d="M -3.4 7 A 4.6 4.6 0 0 0 3.4 7" stroke="#4a3208" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      ) : mood === 'happy' ? (
        <path d="M -4.6 5.6 A 5 5 0 0 0 4.6 5.6" stroke="#4a3208" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      ) : null}
      {/* щёчки */}
      <circle cx="-9.6" cy="3" r="2.4" fill="rgba(255,120,110,0.5)" />
      <circle cx="9.6" cy="3" r="2.4" fill="rgba(255,120,110,0.5)" />
    </g>
  )
}

/** Барон Накал — старая лампа накаливания с короной. Центр колбы (0,0), r=30. */
function Baron({
  x,
  y,
  s = 1,
  flip = 1,
  mood = 'angry',
  filament = 'hot',
  arms = 'spread',
  crownTilt = 0,
}: {
  x: number
  y: number
  s?: number
  flip?: 1 | -1
  mood?: Mood
  filament?: 'hot' | 'dim'
  arms?: 'spread' | 'grip' | 'down'
  crownTilt?: number
}) {
  const f = flip as 1 | -1
  const filColor = filament === 'hot' ? '#ff8a3c' : '#6b4a2e'
  return (
    <g transform={`translate(${x} ${y}) scale(${(s * f).toFixed(3)} ${s})`}>
      {/* плащ */}
      <path
        d="M -6 -20 C -44 -8, -52 26, -44 44 L -6 26 L 34 44 C 44 26, 38 -8, 6 -20 Z"
        fill="#4a3a2e"
        stroke="#2c2118"
        strokeWidth="2"
      />
      <path d="M -6 -18 C -30 -8, -36 18, -32 36 L -6 24 Z" fill="#33271d" opacity="0.6" />
      {/* руки */}
      {arms === 'spread' ? (
        <>
          <path d="M -26 2 C -38 0, -46 -6, -50 -14" stroke="#33271d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <path d="M 26 2 C 38 0, 46 -6, 50 -14" stroke="#33271d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <circle cx="-52" cy="-16" r="4.6" fill="#8a6a3a" stroke="#2c2118" strokeWidth="1.4" />
          <circle cx="52" cy="-16" r="4.6" fill="#8a6a3a" stroke="#2c2118" strokeWidth="1.4" />
        </>
      ) : arms === 'grip' ? (
        <>
          <path d="M -24 6 C -34 10, -42 12, -50 12" stroke="#33271d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <path d="M 26 4 C 40 2, 52 -4, 62 -10" stroke="#33271d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <circle cx="-52" cy="12" r="4.6" fill="#8a6a3a" stroke="#2c2118" strokeWidth="1.4" />
          <circle cx="64" cy="-11" r="4.6" fill="#8a6a3a" stroke="#2c2118" strokeWidth="1.4" />
        </>
      ) : (
        <>
          <path d="M -28 8 C -36 16, -40 24, -41 32" stroke="#33271d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <path d="M 28 8 C 36 16, 40 24, 41 32" stroke="#33271d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <circle cx="-41" cy="34" r="4.6" fill="#8a6a3a" stroke="#2c2118" strokeWidth="1.4" />
          <circle cx="41" cy="34" r="4.6" fill="#8a6a3a" stroke="#2c2118" strokeWidth="1.4" />
        </>
      )}
      {/* цоколь-бронза */}
      <rect x="-19" y="22" width="38" height="20" rx="4" fill="#8a6a3a" stroke="#4d3a1c" strokeWidth="2" />
      <path d="M -19 29 H 19 M -19 35 H 19" stroke="#6d5228" strokeWidth="1.6" />
      <circle cx="-12" cy="25.5" r="1.5" fill="#4d3a1c" />
      <circle cx="12" cy="25.5" r="1.5" fill="#4d3a1c" />
      {/* свечение */}
      {filament === 'hot' && <circle cx="0" cy="-2" r="40" fill="url(#ah-glow-fire)" opacity="0.45" />}
      {/* колба — мутноватая, «с налётом лет» */}
      <circle cx="0" cy="-2" r="30" fill="url(#ah-bulb-old)" stroke="rgba(120,80,20,0.8)" strokeWidth="2.4" />
      {/* нить накала — в нижней трети колбы, за лицом */}
      <g className={filament === 'hot' ? 'ah-flicker' : undefined} opacity={filament === 'hot' ? 1 : 0.55}>
        <path
          d="M -14 -8 L -14 12 M 14 -8 L 14 12 M -14 4 L -7 -2 L 0 4 L 7 -2 L 14 4"
          stroke="#5a4018"
          strokeWidth="2"
          fill="none"
        />
        <path d="M -7 -2 L 0 4 L 7 -2" stroke={filColor} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {filament === 'hot' && <circle cx="0" cy="0" r="7" fill="rgba(255,150,60,0.3)" />}
      </g>
      <path d="M -13 -14 A 17 17 0 0 1 -2 -19" stroke="rgba(255,255,255,0.65)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* корона */}
      <g transform={`rotate(${crownTilt} 0 -30)`}>
        <path d="M -13 -30 L -13 -41 L -6.5 -34.5 L 0 -42 L 6.5 -34.5 L 13 -41 L 13 -30 Z" fill={GOLD} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="0" cy="-35" r="1.7" fill={RED} stroke={INK} strokeWidth="0.8" />
        <path d="M -13 -30 H 13" stroke={INK} strokeWidth="1.8" />
      </g>
      {/* лицо */}
      <ellipse cx="-8" cy="-4" rx="3.4" ry="3.8" fill="#fff" />
      <ellipse cx="8" cy="-4" rx="3.4" ry="3.8" fill="#fff" />
      {mood === 'calm' ? (
        <>
          <circle cx="-7.6" cy="-3.4" r="1.7" fill="#3a2410" />
          <circle cx="8.4" cy="-3.4" r="1.7" fill="#3a2410" />
          <path d="M -12 -9.5 L -4 -8.2 M 12 -9.5 L 4 -8.2" stroke="#3a2410" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M -4 6.5 A 4.4 4.4 0 0 0 4 6.5" stroke="#3a2410" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx={-6.8 + f} cy="-3.6" r="1.8" fill={RED} />
          <circle cx={8.8 + f} cy="-3.6" r="1.8" fill={RED} />
          {/* тяжёлые брови */}
          <path d="M -14 -11 L -3.4 -7.4 M 14 -11 L 3.4 -7.4" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
          {/* оскал */}
          <rect x="-7.4" y="4.6" width="14.8" height="6" rx="1.6" fill="#1d0f0d" />
          <rect x="-5.4" y="5.4" width="3.6" height="3.4" rx="0.8" fill={PAPER} />
          <rect x="1.8" y="5.4" width="3.6" height="3.4" rx="0.8" fill={PAPER} />
        </>
      )}
      {/* щётинка-щёки */}
      <path d="M -17 2 l 3 1.5 M -17 7 l 3 -1 M 17 2 l -3 1.5 M 17 7 l -3 -1" stroke="#3a2410" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  )
}

/** ЭнергоВампир — мелкий прислужник. */
function Vampire({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 -14 C -18 -6, -20 8, -16 16 L 0 10 L 16 16 C 20 8, 18 -6, 0 -14 Z" fill="#7a1f2b" stroke="#4d1219" strokeWidth="1.4" />
      <ellipse cx="0" cy="0" rx="12" ry="15" fill="#3c2c56" stroke="#241a38" strokeWidth="1.4" />
      <path d="M -11 -8 L -19 -15 L -8 -13 Z M 11 -8 L 19 -15 L 8 -13 Z" fill="#33244a" />
      <circle cx="-4.5" cy="-4" r="2.6" fill="#ff4d40" className="ah-eyeglow" />
      <circle cx="4.5" cy="-4" r="2.6" fill="#ff4d40" className="ah-eyeglow" />
      <path d="M -8.5 -9 L -2.5 -6.8 M 8.5 -9 L 2.5 -6.8" stroke="#1d0f22" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="0" cy="4.5" rx="4.6" ry="3" fill="#1d0f22" />
      <path d="M -3.6 3.2 L -1.8 3.2 L -2.7 6 Z M 3.6 3.2 L 1.8 3.2 L 2.7 6 Z" fill="#fff" />
    </g>
  )
}

/* ================================================================== */
/* Мелкие детали                                                      */
/* ================================================================== */

function Star4({ x, y, s = 1, fill = GOLD }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      d={`M ${x} ${y - 5 * s} L ${x + 1.4 * s} ${y - 1.4 * s} L ${x + 5 * s} ${y} L ${x + 1.4 * s} ${y + 1.4 * s} L ${x} ${y + 5 * s} L ${x - 1.4 * s} ${y + 1.4 * s} L ${x - 5 * s} ${y} L ${x - 1.4 * s} ${y - 1.4 * s} Z`}
      fill={fill}
    />
  )
}

function WaxDrop({ x, y, s = 1, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <path d="M 0 -7 C 3.4 -2.4, 4.4 0.4, 4.4 2.6 A 4.4 4.4 0 0 1 -4.4 2.6 C -4.4 0.4, -3.4 -2.4, 0 -7 Z" fill="#e8b25c" stroke="#8c5f0f" strokeWidth="1" />
      <circle cx="-1.4" cy="1.6" r="1.1" fill="rgba(255,255,255,0.65)" />
    </g>
  )
}

function Crate({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-22" y="-20" width="44" height="40" rx="2" fill="#6a4e2e" stroke="#3a2a16" strokeWidth="2" />
      <path d="M -22 -7 H 22 M -22 7 H 22" stroke="#3a2a16" strokeWidth="1.6" />
      <path d="M -22 -20 L 22 20" stroke="#3a2a16" strokeWidth="1.2" opacity="0.5" />
      <path d="M 22 -20 L -22 20" stroke="#3a2a16" strokeWidth="1.2" opacity="0.5" />
    </g>
  )
}

function Beam({ x, y, rot, len = 150 }: { x: number; y: number; rot: number; len?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-len / 2} y="-7" width={len} height="14" rx="1.5" fill="#4a3826" stroke="#2c2014" strokeWidth="1.6" />
      <path d={`M ${-len / 2 + 8} -7 V 7 M ${len / 2 - 8} -7 V 7`} stroke="#2c2014" strokeWidth="1.2" opacity="0.7" />
    </g>
  )
}

function EyesPair({ x, y, s = 1, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <circle cx="-6" cy="0" r="3.4" fill="#ff4d40" className="ah-eyeglow" />
      <circle cx="6" cy="0" r="3.4" fill="#ff4d40" className="ah-eyeglow" />
      <circle cx="-6" cy="0" r="1.3" fill="#2a0d0d" />
      <circle cx="6" cy="0" r="1.3" fill="#2a0d0d" />
    </g>
  )
}

/** Дом 7 по улице Светлой. litGround — светится кофейное окно. */
function House7({ dawn = false, litGround = false }: { dawn?: boolean; litGround?: boolean }) {
  const win = (x: number, y: number, lit: boolean) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="26" height="20" rx="1.5" fill={lit ? '#ffd97a' : '#161320'} stroke={INK} strokeWidth="1.8" />
      <path d={`M ${x + 13} ${y} V ${y + 20} M ${x} ${y + 10} H ${x + 26}`} stroke={INK} strokeWidth="1.4" opacity="0.8" />
      {lit && <rect x={x} y={y} width="26" height="20" fill="url(#ah-win-glow)" />}
    </g>
  )
  return (
    <g>
      {/* стена дома */}
      <rect x="72" y="58" width="176" height="94" fill="#2c2536" stroke={INK} strokeWidth="2.4" />
      <rect x="60" y="152" width="200" height="10" fill="#191423" stroke={INK} strokeWidth="2" />
      {/* крыша */}
      <path d="M 64 60 L 160 26 L 256 60 Z" fill="#3a3040" stroke={INK} strokeWidth="2.4" />
      <rect x="146" y="34" width="12" height="14" fill="#221c2c" stroke={INK} strokeWidth="1.6" />
      {/* чердачное окно */}
      <circle cx="160" cy="48" r="7" fill={dawn ? '#161320' : '#ffd97a'} stroke={INK} strokeWidth="1.8" />
      <path d="M 153 48 H 167 M 160 41 V 55" stroke={INK} strokeWidth="1.2" opacity="0.8" />
      {/* окна: 3 ряда */}
      <g>
        {win(84, 76, false)}
        {win(126, 76, !dawn)}
        {win(168, 76, false)}
        {win(210, 76, false)}
        {win(84, 104, false)}
        {win(126, 104, false)}
        {win(168, 104, !dawn)}
        {win(210, 104, false)}
        {win(88, 132, litGround)}
        {win(130, 132, false)}
        {win(168, 132, false)}
        {win(208, 132, false)}
      </g>
      {/* дверца подвала + счётчик */}
      <rect x="252" y="118" width="26" height="34" fill="#1d1826" stroke={INK} strokeWidth="2" />
      <path d="M 252 135 H 278" stroke={INK} strokeWidth="1.4" />
      <circle cx="265" cy="127" r="3.2" fill="#d8d3c2" stroke={INK} strokeWidth="1.2" />
      <path d="M 265 127 L 267.4 124.6" stroke={INK} strokeWidth="1.2" className={dawn ? undefined : 'ah-spin-slow'} style={{ transformOrigin: '265px 127px' }} />
      {/* труба + дым */}
      <rect x="196" y="30" width="12" height="16" fill="#3a3040" stroke={INK} strokeWidth="1.8" />
      <circle cx="206" cy="22" r="4" fill="rgba(244,238,218,0.16)" />
      <circle cx="214" cy="14" r="5.4" fill="rgba(244,238,218,0.12)" />
      <circle cx="224" cy="7" r="6.6" fill="rgba(244,238,218,0.08)" />
      {/* провода */}
      <path d="M 64 62 C 30 70, 14 76, 0 84" stroke={INK} strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d="M 64 68 C 34 78, 16 86, 0 96" stroke={INK} strokeWidth="1.6" fill="none" opacity="0.5" />
    </g>
  )
}

/** Кружка с паром. */
function Mug({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 12 C -3 10, -5 6, -3 4 C 0 6, 3 6, 5 4 C 7 6, 5 10, 2 12" stroke="rgba(244,238,218,0.5)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="-8" y="12" width="16" height="12" rx="2.5" fill={PAPER} stroke={INK} strokeWidth="1.6" />
      <path d="M 8 15 Q 13 15 12 18.6 Q 11 21.4 8 20.6" stroke={INK} strokeWidth="1.6" fill="none" />
    </g>
  )
}

/* ================================================================== */
/* Сцены                                                              */
/* ================================================================== */

function SceneHouseNight() {
  return (
    <g>
      <rect width="320" height="180" fill="#141a2b" />
      {[
        [28, 24], [60, 44], [96, 18], [140, 30], [232, 20], [268, 40], [296, 26], [310, 60], [40, 84], [284, 78],
      ].map(([sx, sy], i) => (
        <circle key={i} cx={sx} cy={sy} r={i % 3 === 0 ? 1.6 : 1} fill="#f4eeda" opacity={0.5 + (i % 3) * 0.2} />
      ))}
      <circle cx="38" cy="34" r="15" fill="#f4eeda" />
      <circle cx="33" cy="30" r="12" fill="#141a2b" />
      <House7 />
      <rect y="160" width="320" height="20" fill="#0d1117" />
      <path d="M 0 160 H 320" stroke={INK} strokeWidth="2" />
      <path d="M 40 176 H 66 M 96 176 H 122 M 152 176 H 178 M 208 176 H 234 M 264 176 H 290" stroke="rgba(244,238,218,0.22)" strokeWidth="2" />
    </g>
  )
}

function SceneDawnHouse() {
  return (
    <g>
      <rect width="320" height="180" fill="url(#ah-dawn-sky)" />
      <circle cx="272" cy="128" r="26" fill="#ffca6b" />
      <circle cx="272" cy="128" r="36" fill="none" stroke="#ffca6b" strokeWidth="1.6" opacity="0.5" />
      <circle cx="272" cy="128" r="46" fill="none" stroke="#ffca6b" strokeWidth="1.2" opacity="0.25" />
      <path d="M 60 96 q 6 -5 12 0 M 92 78 q 6 -5 12 0 M 226 66 q 6 -5 12 0" stroke="#2c2536" strokeWidth="2" fill="none" strokeLinecap="round" />
      <House7 dawn litGround />
      <rect y="160" width="320" height="20" fill="#241a1a" />
      <path d="M 0 160 H 320" stroke={INK} strokeWidth="2" />
      <Vzhik x={252} y={142} s={0.9} flip={1} mood="happy" cape={1.5} />
      <path d="M 30 172 H 52 M 76 172 H 98 M 118 172 H 140 M 160 172 H 182" stroke="rgba(34,30,23,0.5)" strokeWidth="2" />
    </g>
  )
}

function SceneTelegram() {
  return (
    <g>
      <rect width="320" height="180" fill="#1d2536" />
      {/* полка с папками */}
      <rect x="228" y="34" width="76" height="5" fill="#3a3040" stroke={INK} strokeWidth="1.6" />
      {[
        [236, 22, '#c8402e'], [250, 24, '#ffd23f'], [262, 21, '#2e7d43'], [276, 25, '#6a8ab2'],
      ].map(([bx, bh, bf], i) => (
        <rect key={i} x={bx as number} y={39 - (bh as number)} width="11" height={bh as number} rx="1" fill={bf as string} stroke={INK} strokeWidth="1.4" />
      ))}
      {/* конус света от лампы */}
      <polygon points="66,52 24,152 132,152" fill="rgba(255,223,138,0.13)" />
      {/* стол */}
      <rect x="30" y="118" width="260" height="14" rx="2" fill="#5a4632" stroke={INK} strokeWidth="2.2" />
      <rect x="44" y="132" width="10" height="34" fill="#463524" stroke={INK} strokeWidth="1.8" />
      <rect x="266" y="132" width="10" height="34" fill="#463524" stroke={INK} strokeWidth="1.8" />
      {/* лампа на столе */}
      <path d="M 66 118 V 88 L 84 72" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M 74 62 L 94 74 L 86 88 L 66 76 Z" fill="#2e7d43" stroke={INK} strokeWidth="2" />
      <ellipse cx="80" cy="74" rx="5" ry="3.4" fill="#ffd97a" />
      {/* телеграмма */}
      <g transform="rotate(-2 160 96)">
        <rect x="104" y="64" width="118" height="62" fill={PAPER} stroke={INK} strokeWidth="2.2" />
        <path d="M 104 64 l 10 6 l 10 -6 l 10 6 l 10 -6 l 10 6 l 10 -6 l 10 6 l 10 -6 l 10 6 l 10 -6 l 10 6" fill="none" stroke="#c8402e" strokeWidth="1.6" />
        <path d="M 112 84 H 200 M 112 94 H 210 M 112 104 H 186 M 112 114 H 168" stroke="rgba(34,30,23,0.55)" strokeWidth="2" strokeDasharray="7 3" />
        <g transform="rotate(-9 190 112)">
          <rect x="156" y="102" width="62" height="20" fill="none" stroke={RED} strokeWidth="2.4" />
          <text x="187" y="116.5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="12" letterSpacing="2.5" fill={RED}>
            СРОЧНО
          </text>
        </g>
        <path d="M 116 78 h 8 v 8 h -8 z" fill={GOLD} stroke={INK} strokeWidth="1.2" />
        <path d="M 117.4 79.4 l 5.2 5.2 M 122.6 79.4 l -5.2 5.2" stroke={INK} strokeWidth="1.1" />
      </g>
      {/* карандаш */}
      <g transform="rotate(24 236 128)">
        <rect x="222" y="124" width="30" height="5" rx="1" fill="#e8b25c" stroke={INK} strokeWidth="1.2" />
        <path d="M 252 124 l 6 2.5 l -6 2.5 Z" fill={PAPER} stroke={INK} strokeWidth="1.2" />
      </g>
      <rect y="152" width="320" height="28" fill="#141a26" />
    </g>
  )
}

function SceneDispatchWarn() {
  return (
    <g>
      <rect width="320" height="180" fill="#1d2536" />
      {/* схема дома на стене */}
      <rect x="150" y="24" width="120" height="76" fill={PAPER} stroke={INK} strokeWidth="2.2" />
      <path d="M 158 100 V 40 H 262 V 100" stroke="rgba(34,30,23,0.6)" strokeWidth="1.8" fill="none" />
      <path d="M 176 40 V 100 M 210 40 V 100 M 244 40 V 100 M 158 62 H 262" stroke="rgba(34,30,23,0.35)" strokeWidth="1.2" />
      <rect x="216" y="84" width="12" height="12" fill="#c8402e" className="ah-blink" />
      <text x="210" y="32" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="9" letterSpacing="1.5" fill={INK}>
        ДОМ № 7
      </text>
      <path d="M 222 90 l 2 -3.4 l 2 3.4 z" fill={PAPER} />
      {/* диспетчер — силуэт спиной */}
      <g>
        <ellipse cx="86" cy="102" rx="26" ry="30" fill="#141a26" />
        <circle cx="86" cy="66" r="14" fill="#141a26" />
        <rect x="70" y="52" width="32" height="7" rx="3" fill="#141a26" />
        <circle cx="86" cy="48" r="5" fill="#141a26" />
        <path d="M 72 78 a 14 14 0 0 1 28 0" fill="none" stroke="rgba(255,223,138,0.25)" strokeWidth="2" />
      </g>
      {/* стол, телефон, кружка */}
      <rect x="30" y="118" width="260" height="14" rx="2" fill="#5a4632" stroke={INK} strokeWidth="2.2" />
      <rect x="44" y="132" width="10" height="34" fill="#463524" stroke={INK} strokeWidth="1.8" />
      <rect x="266" y="132" width="10" height="34" fill="#463524" stroke={INK} strokeWidth="1.8" />
      <rect x="120" y="104" width="34" height="15" rx="3" fill="#2e2a3a" stroke={INK} strokeWidth="1.8" />
      <circle cx="127" cy="111.5" r="2" fill="#d8d3c2" />
      <path d="M 148 111 q 5 0 4.6 4" stroke={INK} strokeWidth="1.6" fill="none" />
      <Mug x={186} y={100} s={1.1} />
      <rect y="152" width="320" height="28" fill="#141a26" />
    </g>
  )
}

function SceneVzhikSalute() {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a1 = (i * Math.PI) / 6
    const a2 = ((i + 0.5) * Math.PI) / 6
    const R = 190
    return (
      <polygon
        key={i}
        points={`160,104 ${160 + Math.cos(a1) * R},${104 + Math.sin(a1) * R} ${160 + Math.cos(a2) * R},${104 + Math.sin(a2) * R}`}
        fill={GOLD}
        opacity={0.09}
      />
    )
  })
  return (
    <g>
      <rect width="320" height="180" fill="#17131f" />
      {rays}
      <circle cx="160" cy="104" r="58" fill="rgba(255,210,63,0.14)" />
      <ellipse cx="160" cy="150" rx="46" ry="7" fill="rgba(0,0,0,0.4)" />
      <Vzhik x={160} y={102} s={2.5} flip={1} mood="determined" cape={1.6} />
      <Star4 x={92} y={54} s={1.3} />
      <Star4 x={230} y={42} s={1} />
      <Star4 x={252} y={112} s={0.9} />
      <Star4 x={72} y={124} s={0.9} />
      <path d="M 60 150 H 118 M 202 150 H 260" stroke="rgba(255,210,63,0.5)" strokeWidth="2.4" strokeDasharray="10 6" />
    </g>
  )
}

function SceneVzhikLight() {
  return (
    <g>
      <rect width="320" height="180" fill="#0d0b12" />
      <polygon points="160,74 66,180 254,180" fill="url(#ah-cone)" />
      <Vampire x={54} y={158} s={0.9} />
      <Vampire x={272} y={162} s={0.9} />
      <ellipse cx="160" cy="152" rx="40" ry="6" fill="rgba(255,223,138,0.25)" />
      <Vzhik x={160} y={96} s={2.3} flip={1} mood="determined" cape={1.7} />
      <Star4 x={104} y={40} s={1.1} />
      <Star4 x={222} y={34} s={0.9} />
      <Star4 x={258} y={86} s={0.8} />
      <path d="M 250 22 l 4 8 l -9 1 l 7 7" stroke={GOLD} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 62 30 l -3 9 l 9 -1 l -6 8" stroke={GOLD} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function SceneWaxTrail() {
  return (
    <g>
      <rect width="320" height="180" fill="#241d2b" />
      {/* панель и пол */}
      <path d="M 0 118 H 320" stroke="#171219" strokeWidth="2" />
      <rect y="118" width="320" height="62" fill="#171219" />
      <path d="M 0 140 H 320 M 0 162 H 320" stroke="rgba(244,238,218,0.08)" strokeWidth="1.4" />
      <path d="M 60 118 V 180 M 130 118 V 180 M 200 118 V 180 M 262 118 V 180" stroke="rgba(244,238,218,0.05)" strokeWidth="1.4" />
      {/* плинтус */}
      <rect y="114" width="320" height="6" fill="#2c2334" stroke={INK} strokeWidth="1.4" />
      {/* дверь справа */}
      <rect x="284" y="52" width="30" height="66" fill="#1a1522" stroke={INK} strokeWidth="2" />
      <circle cx="290" cy="86" r="2" fill="#8a8171" />
      {/* след воска: крупные капли к мелким */}
      <WaxDrop x={252} y={136} s={1.5} />
      <WaxDrop x={216} y={139} s={1.25} o={0.95} />
      <WaxDrop x={184} y={142} s={1.05} o={0.9} />
      <WaxDrop x={158} y={145} s={0.9} o={0.8} />
      <path d="M 150 146 C 138 148, 130 149, 120 149" stroke="#e8b25c" strokeWidth="2" strokeDasharray="1 6" fill="none" strokeLinecap="round" opacity="0.7" />
      <Vzhik x={62} y={108} s={1.35} flip={1} mood="gasp" cape={1.2} />
      {/* тьма справа */}
      <rect x="238" width="82" height="180" fill="url(#ah-darkness)" />
      <EyesPair x={296} y={96} s={1.2} />
    </g>
  )
}

function SceneEyesDark() {
  return (
    <g>
      <rect width="320" height="180" fill="#0a080c" />
      <ellipse cx="160" cy="90" rx="150" ry="86" fill="#120d16" opacity="0.7" />
      {/* царапины на стене */}
      <path d="M 40 44 l 14 20 M 52 40 l 10 22 M 236 36 l 12 18 M 248 34 l 8 18" stroke="rgba(244,238,218,0.1)" strokeWidth="1.6" />
      <EyesPair x={228} y={70} s={2.4} />
      <EyesPair x={70} y={116} s={1.2} o={0.75} />
      <EyesPair x={262} y={136} s={0.8} o={0.5} />
      {/* пол с воском в темноте */}
      <path d="M 0 150 H 320" stroke="rgba(244,238,218,0.12)" strokeWidth="1.6" />
      <WaxDrop x={140} y={158} s={1.1} o={0.35} />
      <WaxDrop x={104} y={160} s={0.9} o={0.28} />
      <WaxDrop x={76} y={162} s={0.75} o={0.22} />
    </g>
  )
}

function SceneBaronBalcony() {
  return (
    <g>
      <rect width="320" height="180" fill="#2b2118" />
      {/* доски чердака */}
      <path d="M 0 30 H 320 M 0 64 H 320 M 0 98 H 320 M 0 132 H 320" stroke="rgba(34,30,23,0.35)" strokeWidth="1.6" />
      <Beam x={70} y={40} rot={-14} len={170} />
      <Beam x={266} y={30} rot={12} len={130} />
      {/* мансардное окно с лучом */}
      <rect x="18" y="18" width="26" height="20" rx="2" fill="#0e1420" stroke={INK} strokeWidth="2" />
      <path d="M 31 18 V 38 M 18 28 H 44" stroke={INK} strokeWidth="1.2" />
      <polygon points="44,26 150,140 96,150" fill="rgba(190,210,255,0.07)" />
      {/* ящики */}
      <Crate x={276} y={140} s={1.15} />
      <Crate x={300} y={166} s={0.9} />
      {/* гарф с мёртвой лампочкой */}
      <path d="M 150 0 V 26" stroke={INK} strokeWidth="2" />
      <circle cx="150" cy="34" r="8" fill="#241d14" stroke={INK} strokeWidth="1.8" />
      <path d="M 145 32 L 155 36" stroke="#3a2c14" strokeWidth="1.4" />
      <path d="M 120 22 q 12 10 22 4 M 176 16 q -8 8 -18 6" stroke="rgba(244,238,218,0.14)" strokeWidth="1.2" fill="none" />
      {/* ящик-трибуна */}
      <Crate x={152} y={166} s={1.3} />
      {/* вампиры на балках */}
      <Vampire x={242} y={54} s={0.95} />
      <Vampire x={64} y={86} s={0.8} />
      <ellipse cx="152" cy="170" rx="60" ry="6" fill="rgba(0,0,0,0.4)" />
      {/* БАРОН */}
      <Baron x={152} y={100} s={1.65} flip={1} mood="angry" filament="hot" arms="spread" />
      <path d="M 60 162 H 92 M 214 162 H 246" stroke="rgba(34,30,23,0.6)" strokeWidth="2" />
    </g>
  )
}

function SceneBaronRage() {
  return (
    <g>
      <rect width="320" height="180" fill="#1a0d0d" />
      <circle cx="160" cy="96" r="88" fill="#2a1210" opacity="0.8" />
      {/* молнии */}
      <path d="M 58 44 l 10 16 l -16 2 l 12 18" stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className="ah-flicker" />
      <path d="M 262 40 l -10 18 l 17 1 l -13 19" stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className="ah-flicker" />
      <path d="M 44 128 l 12 10 l -6 10" stroke="#ff8a3c" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <Baron x={160} y={102} s={2.9} flip={1} mood="angry" filament="hot" arms="spread" />
      {/* пар */}
      <circle cx="74" cy="132" r="9" fill="rgba(244,238,218,0.16)" />
      <circle cx="62" cy="120" r="6.6" fill="rgba(244,238,218,0.13)" />
      <circle cx="248" cy="128" r="8" fill="rgba(244,238,218,0.16)" />
      <circle cx="260" cy="116" r="5.8" fill="rgba(244,238,218,0.13)" />
    </g>
  )
}

function SceneActPaper() {
  return (
    <g>
      <rect width="320" height="180" fill="#1d2536" />
      {/* стол-конторка */}
      <rect x="0" y="140" width="320" height="40" fill="#141a26" />
      <rect x="28" y="30" width="164" height="112" transform="rotate(-2 110 86)" fill={PAPER} stroke={INK} strokeWidth="2.4" />
      {/* бланк акта */}
      <g transform="rotate(-2 110 86)">
        <rect x="28" y="30" width="164" height="16" fill="#efe7cd" />
        <text x="110" y="42.5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="11" letterSpacing="2" fill={INK}>
          АКТ · ЭГ-06
        </text>
        <path d="M 38 58 H 180 M 38 70 H 168 M 38 82 H 182 M 38 94 H 150 M 38 106 H 174" stroke="rgba(34,30,23,0.5)" strokeWidth="2" strokeDasharray="6 4" />
        <path d="M 36 34 v 104" stroke="rgba(200,64,46,0.5)" strokeWidth="1.4" />
        {/* клякса воска */}
        <path d="M 142 92 c 6 -3 12 0 12 5 c 0 5 -7 7 -12 6 c -6 -1 -8 -4 -6 -8 Z" fill="#e8b25c" opacity="0.85" />
        <circle cx="147" cy="98" r="2.6" fill="#c88f3a" opacity="0.7" />
        <g transform="rotate(-8 156 118)">
          <ellipse cx="156" cy="118" rx="17" ry="10" fill="none" stroke="#2e7d43" strokeWidth="2" />
          <path d="M 145 118 q 11 6 22 0" stroke="#2e7d43" strokeWidth="1.4" fill="none" />
        </g>
      </g>
      {/* лампа сверху */}
      <path d="M 250 0 V 30" stroke={INK} strokeWidth="2" />
      <path d="M 236 30 h 28 l -6 12 h -16 Z" fill="#2e2a3a" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="250" cy="43" rx="6" ry="3" fill="#ffd97a" />
      <polygon points="250,44 196,140 304,140" fill="rgba(255,223,138,0.1)" />
      {/* Вжик изучает */}
      <Vzhik x={244} y={104} s={1.45} flip={-1} mood="determined" cape={1.25} />
      <ellipse cx="244" cy="132" rx="26" ry="4.4" fill="rgba(0,0,0,0.4)" />
    </g>
  )
}

function SceneBaronShield() {
  return (
    <g>
      <rect width="320" height="180" fill="#23201c" />
      {/* полоса предупреждения */}
      <rect y="146" width="320" height="14" fill="url(#ah-warn)" />
      <path d="M 0 146 H 320" stroke={INK} strokeWidth="2" />
      {/* щит-панель */}
      <rect x="170" y="26" width="122" height="108" rx="3" fill="#3a3a3f" stroke={INK} strokeWidth="2.4" />
      <path d="M 170 60 H 292" stroke={INK} strokeWidth="1.6" />
      <circle cx="186" cy="43" r="4" fill="#ff5a4e" className="ah-blink" />
      <circle cx="202" cy="43" r="4" fill="#2a2a30" stroke={INK} strokeWidth="1.4" />
      {/* провода */}
      <path d="M 172 80 C 140 84, 120 96, 96 96" stroke={RED} strokeWidth="3" fill="none" />
      <path d="M 290 80 C 306 88, 310 104, 306 120" stroke={RED} strokeWidth="3" fill="none" />
      <circle cx="96" cy="96" r="4" fill="#ff8a3c" className="ah-flicker" />
      <circle cx="306" cy="120" r="4" fill="#ff8a3c" className="ah-flicker" />
      {/* рубильник */}
      <rect x="214" y="72" width="34" height="52" rx="3" fill="#2a2a30" stroke={INK} strokeWidth="2" />
      <circle cx="222" cy="80" r="4.6" fill="#8a8a8a" stroke={INK} strokeWidth="1.6" />
      <circle cx="240" cy="80" r="4.6" fill="#8a8a8a" stroke={INK} strokeWidth="1.6" />
      <g transform="rotate(-28 231 80)">
        <rect x="227.5" y="80" width="7" height="40" rx="3" fill="#d8d3c2" stroke={INK} strokeWidth="1.8" />
        <circle cx="231" cy="122" r="6" fill="#c8402e" stroke={INK} strokeWidth="1.8" />
      </g>
      {/* знак «высокое напряжение» */}
      <g transform="translate(256 122)">
        <path d="M 0 -14 L 13 9 H -13 Z" fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M 1.6 -6 L -4 1.4 h 3.4 L -2 8 L 4 0.2 h -3.4 Z" fill={INK} />
      </g>
      {/* барон тянет рубильник */}
      <ellipse cx="118" cy="152" rx="52" ry="6" fill="rgba(0,0,0,0.4)" />
      <Baron x={116} y={96} s={1.55} flip={1} mood="angry" filament="hot" arms="grip" />
    </g>
  )
}

function SceneBaronCool() {
  return (
    <g>
      <rect width="320" height="180" fill="#241d2b" />
      <path d="M 0 34 H 320 M 0 70 H 320 M 0 106 H 320" stroke="rgba(34,30,23,0.3)" strokeWidth="1.4" />
      {/* мансардное окно и лунный луч */}
      <rect x="24" y="16" width="30" height="22" rx="2" fill="#0e1420" stroke={INK} strokeWidth="2" />
      <path d="M 39 16 V 38 M 24 27 H 54" stroke={INK} strokeWidth="1.2" />
      <polygon points="54,26 172,150 118,158" fill="rgba(190,210,255,0.08)" />
      {/* пылинки */}
      {[
        [84, 60], [102, 88], [124, 108], [96, 122], [146, 84],
      ].map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r="1.4" fill="rgba(244,238,218,0.3)" />
      ))}
      {/* ящики-лежанка */}
      <Crate x={196} y={146} s={1.5} />
      {/* барон усталый, нить тёплая но тусклая */}
      <Baron x={192} y={92} s={1.5} flip={-1} mood="calm" filament="dim" arms="down" crownTilt={-8} />
      {/* плащ стекает по ящику */}
      <path d="M 158 120 C 150 136, 152 150, 160 160 L 176 156 C 168 144, 168 130, 172 118 Z" fill="#4a3a2e" opacity="0.8" />
      <ellipse cx="192" cy="164" rx="64" ry="6" fill="rgba(0,0,0,0.4)" />
    </g>
  )
}

function SceneCafeLamp() {
  return (
    <g>
      <rect width="320" height="180" fill="#2a2118" />
      {/* панель и пол */}
      <rect y="0" width="320" height="130" fill="#332818" />
      <path d="M 0 100 H 320" stroke="rgba(34,30,23,0.4)" strokeWidth="1.6" />
      <rect y="130" width="320" height="50" fill="#241a10" />
      {/* окно с вывеской */}
      <rect x="252" y="34" width="52" height="58" rx="2" fill="#141019" stroke={INK} strokeWidth="2.2" />
      <path d="M 278 34 V 92 M 252 63 H 304" stroke={INK} strokeWidth="1.4" />
      <rect x="258" y="98" width="40" height="14" rx="2" fill={GOLD} stroke={INK} strokeWidth="1.6" />
      <text x="278" y="108.5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="9" letterSpacing="1.6" fill={INK}>
        КОФЕ
      </text>
      {/* шнур и абажур */}
      <path d="M 150 0 V 40" stroke={INK} strokeWidth="2.4" />
      <path d="M 128 62 L 150 40 L 172 62 Q 150 74 128 62 Z" fill="#7a4a2a" stroke={INK} strokeWidth="2.2" />
      {/* тёплый свет на стол */}
      <ellipse cx="150" cy="112" rx="72" ry="26" fill="rgba(255,215,122,0.2)" />
      <polygon points="132,66 168,66 210,116 90,116" fill="rgba(255,215,122,0.12)" />
      {/* барон как ретро-лампа */}
      <Baron x={150} y={82} s={0.62} flip={1} mood="calm" filament="hot" arms="down" />
      {/* стол */}
      <ellipse cx="150" cy="118" rx="66" ry="10" fill="#5a4632" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="150" cy="114" rx="66" ry="9" fill="#6a5238" stroke={INK} strokeWidth="2.2" />
      <rect x="144" y="120" width="12" height="34" fill="#463524" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="150" cy="156" rx="24" ry="4" fill="rgba(0,0,0,0.4)" />
      {/* чашки */}
      <Mug x={116} y={100} s={1} />
      <Mug x={182} y={100} s={1} />
      {/* стулья */}
      <g opacity="0.85">
        <rect x="44" y="104" width="8" height="44" fill="#463524" stroke={INK} strokeWidth="1.6" />
        <rect x="44" y="104" width="26" height="7" fill="#5a4632" stroke={INK} strokeWidth="1.6" />
        <rect x="62" y="112" width="7" height="36" fill="#463524" stroke={INK} strokeWidth="1.6" />
      </g>
      <g opacity="0.85">
        <rect x="264" y="104" width="8" height="44" fill="#463524" stroke={INK} strokeWidth="1.6" />
        <rect x="250" y="104" width="26" height="7" fill="#5a4632" stroke={INK} strokeWidth="1.6" />
        <rect x="250" y="112" width="7" height="36" fill="#463524" stroke={INK} strokeWidth="1.6" />
      </g>
      {/* Вжик уходит по полу, оглядываясь */}
      <Vzhik x={66} y={136} s={0.85} flip={1} mood="happy" cape={1.5} />
      <ellipse cx="66" cy="156" rx="18" ry="3.4" fill="rgba(0,0,0,0.4)" />
    </g>
  )
}

/* ================================================================== */
/* Реестр кадров                                                      */
/* ================================================================== */

const SCENES: Record<ArtId, () => React.JSX.Element> = {
  house_night: SceneHouseNight,
  telegram: SceneTelegram,
  vzhik_salute: SceneVzhikSalute,
  wax_trail: SceneWaxTrail,
  eyes_dark: SceneEyesDark,
  baron_balcony: SceneBaronBalcony,
  baron_rage: SceneBaronRage,
  act_paper: SceneActPaper,
  baron_shield: SceneBaronShield,
  dispatch_warn: SceneDispatchWarn,
  vzhik_light: SceneVzhikLight,
  baron_cool: SceneBaronCool,
  cafe_lamp: SceneCafeLamp,
  dawn_house: SceneDawnHouse,
}

export function CutsceneArt({ art, className }: { art: ArtId; className?: string }) {
  const Scene = SCENES[art]
  return (
    <svg
      viewBox="0 0 320 180"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Кадр хроники"
    >
      <defs>
        <radialGradient id="ah-glow-warm" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffe873" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffe873" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ah-glow-fire" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ff9a4d" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff9a4d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ah-bulb" cx="0.38" cy="0.34" r="0.75">
          <stop offset="0%" stopColor="#fffbd8" />
          <stop offset="55%" stopColor="#ffe37a" />
          <stop offset="100%" stopColor="#f5b93c" />
        </radialGradient>
        <radialGradient id="ah-bulb-old" cx="0.4" cy="0.36" r="0.78">
          <stop offset="0%" stopColor="#fff3cf" />
          <stop offset="60%" stopColor="#f4d488" />
          <stop offset="100%" stopColor="#d99a45" />
        </radialGradient>
        <linearGradient id="ah-darkness" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a080c" stopOpacity="0" />
          <stop offset="100%" stopColor="#0a080c" stopOpacity="0.94" />
        </linearGradient>
        <linearGradient id="ah-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffdf8a" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffdf8a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ah-dawn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#35243f" />
          <stop offset="55%" stopColor="#a04e50" />
          <stop offset="100%" stopColor="#ffb95e" />
        </linearGradient>
        <linearGradient id="ah-win-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe873" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffe873" stopOpacity="0" />
        </linearGradient>
        <pattern id="ah-warn" width="24" height="14" patternUnits="userSpaceOnUse" patternTransform="skewX(-18)">
          <rect width="24" height="14" fill="#ffd23f" />
          <rect width="12" height="14" fill="#221e17" />
        </pattern>
      </defs>
      <Scene />
      {/* лёгкое затемнение по краям кадра — как в кино */}
      <rect width="320" height="180" fill="url(#ah-vignette)" />
      <defs>
        <radialGradient id="ah-vignette" cx="0.5" cy="0.5" r="0.72">
          <stop offset="62%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
      </defs>
    </svg>
  )
}
