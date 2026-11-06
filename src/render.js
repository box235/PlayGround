// ── Emberwitch renderer: hand-drawn canvas art, no image assets ────────────
import { SPELLS, BOONS } from './content.js'

const TAU = Math.PI * 2
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export const WORLD = { w: 2000, h: 2000 }

// deterministic rng
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rgba(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function glow(ctx, x, y, r, color, alpha = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(color, alpha))
  g.addColorStop(0.45, rgba(color, alpha * 0.34))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
}

function shadow(ctx, x, y, rx, ry, alpha = 0.32) {
  ctx.save()
  ctx.fillStyle = `rgba(4,2,8,${alpha})`
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill()
  ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ── ground ─────────────────────────────────────────────────────────────────
function makeGround() {
  const c = document.createElement('canvas')
  c.width = WORLD.w; c.height = WORLD.h
  const g = c.getContext('2d')
  const rnd = mulberry32(137)

  const base = g.createLinearGradient(0, 0, WORLD.w, WORLD.h)
  base.addColorStop(0, '#101d18')
  base.addColorStop(0.5, '#0c1714')
  base.addColorStop(1, '#0a1211')
  g.fillStyle = base
  g.fillRect(0, 0, WORLD.w, WORLD.h)

  // broad mossy patches
  for (let i = 0; i < 90; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h, r = 60 + rnd() * 240
    const hue = rnd()
    const col = hue > 0.7 ? '#173026' : hue > 0.35 ? '#12251d' : '#0d1a17'
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, rgba(col, 0.55)); gr.addColorStop(1, rgba(col, 0))
    g.fillStyle = gr
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill()
  }

  // winding dirt paths
  const paths = [
    [[120, 1900], [500, 1400], [860, 1130], [1000, 1000]],
    [[1880, 260], [1500, 640], [1200, 860], [1000, 1000]],
    [[180, 260], [620, 520], [860, 810], [1000, 1000]],
  ]
  for (const pts of paths) {
    g.save()
    g.lineCap = 'round'; g.lineJoin = 'round'
    g.strokeStyle = 'rgba(38,31,22,.30)'; g.lineWidth = 76
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) g.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
    g.stroke()
    g.strokeStyle = 'rgba(61,48,34,.15)'; g.lineWidth = 46
    g.stroke()
    g.strokeStyle = 'rgba(95,74,48,.055)'; g.lineWidth = 16
    g.stroke()
    g.restore()
  }

  // ritual clearing
  const cx = 1000, cy = 1000
  const clear = g.createRadialGradient(cx, cy, 40, cx, cy, 330)
  clear.addColorStop(0, 'rgba(92,76,48,.20)')
  clear.addColorStop(0.55, 'rgba(52,44,32,.14)')
  clear.addColorStop(1, 'rgba(20,30,25,0)')
  g.fillStyle = clear
  g.beginPath(); g.arc(cx, cy, 330, 0, TAU); g.fill()

  g.save()
  g.translate(cx, cy)
  g.strokeStyle = 'rgba(145,120,190,.17)'; g.lineWidth = 3
  g.beginPath(); g.arc(0, 0, 176, 0, TAU); g.stroke()
  g.strokeStyle = 'rgba(145,120,190,.13)'; g.lineWidth = 1.5
  g.beginPath(); g.arc(0, 0, 152, 0, TAU); g.stroke()
  // runes
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU
    g.save(); g.rotate(a); g.translate(0, -164)
    g.fillStyle = 'rgba(178,150,220,.22)'
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 0); g.lineTo(0, 8); g.lineTo(-4, 2); g.closePath(); g.fill()
    g.restore()
  }
  // inner sigil
  g.strokeStyle = 'rgba(170,140,220,.14)'; g.lineWidth = 1.5
  for (let i = 0; i < 6; i++) {
    const a1 = (i / 6) * TAU, a2 = ((i + 2) / 6) * TAU
    g.beginPath()
    g.moveTo(Math.cos(a1) * 80, Math.sin(a1) * 80)
    g.lineTo(Math.cos(a2) * 80, Math.sin(a2) * 80)
    g.stroke()
  }
  g.restore()

  // ring of standing stones around clearing
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.22
    const x = cx + Math.cos(a) * 220 + (rnd() - 0.5) * 22
    const y = cy + Math.sin(a) * 220 + (rnd() - 0.5) * 22
    const w = 20 + rnd() * 16, h = 32 + rnd() * 30
    g.save(); g.translate(x, y); g.rotate((rnd() - 0.5) * 0.4)
    g.fillStyle = 'rgba(3,6,6,.34)'
    g.beginPath(); g.ellipse(0, h * 0.42, w * 0.9, 8, 0, 0, TAU); g.fill()
    g.fillStyle = '#242b2a'
    g.beginPath()
    g.moveTo(-w / 2, h / 2); g.lineTo(-w / 2 + 3, -h / 2)
    g.lineTo(w / 2 - 4, -h / 2 + 2); g.lineTo(w / 2, h / 2)
    g.closePath(); g.fill()
    g.fillStyle = 'rgba(70,85,78,.4)'
    g.beginPath(); g.moveTo(-w / 2 + 4, h / 2); g.lineTo(-w / 2 + 5, -h / 2 + 3); g.lineTo(-2, -h / 2 + 3); g.lineTo(-3, h / 2); g.closePath(); g.fill()
    g.strokeStyle = 'rgba(150,180,140,.16)'; g.lineWidth = 1.5
    g.beginPath(); g.moveTo(0, -h / 2 + 8); g.lineTo(0, -h / 2 + 20); g.moveTo(-6, -h / 2 + 14); g.lineTo(6, -h / 2 + 14); g.stroke()
    g.restore()
  }

  // grass tufts
  for (let i = 0; i < 2400; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h
    const nearCircle = Math.hypot(x - cx, y - cy) < 200
    if (nearCircle) continue
    const h = 3 + rnd() * 8
    const lean = (rnd() - 0.5) * 5
    g.strokeStyle = rnd() > 0.7 ? 'rgba(90,140,95,.30)' : 'rgba(55,100,70,.28)'
    g.lineWidth = 0.9 + rnd() * 0.8
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + lean * 0.5, y - h * 0.6, x + lean, y - h)
    g.stroke()
    if (rnd() > 0.65) {
      g.beginPath()
      g.moveTo(x + 2, y)
      g.quadraticCurveTo(x + 2 - lean * 0.4, y - h * 0.4, x + 2 - lean, y - h * 0.7)
      g.stroke()
    }
  }

  // fallen leaves
  for (let i = 0; i < 500; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h
    g.save(); g.translate(x, y); g.rotate(rnd() * TAU)
    g.fillStyle = rnd() > 0.5 ? 'rgba(86,92,48,.22)' : 'rgba(112,70,45,.18)'
    g.beginPath(); g.ellipse(0, 0, 2.6, 1.2, 0, 0, TAU); g.fill()
    g.restore()
  }

  // mushrooms and glowcaps
  for (let i = 0; i < 150; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h
    if (Math.hypot(x - cx, y - cy) < 190) continue
    const big = rnd() > 0.82
    const s = big ? 1.5 : 0.7 + rnd() * 0.6
    const teal = rnd() > 0.55
    const cap = teal ? '#4fb8a8' : '#9a6ad6'
    glow(g, x, y - 3 * s, 16 * s, cap, teal ? 0.16 : 0.2)
    g.fillStyle = 'rgba(190,205,185,.5)'
    g.fillRect(x - 1.1 * s, y - 3 * s, 2.2 * s, 6 * s)
    g.fillStyle = cap
    g.beginPath(); g.ellipse(x, y - 3.5 * s, 5.4 * s, 3.2 * s, 0, Math.PI, TAU); g.fill()
    g.fillStyle = 'rgba(255,255,255,.45)'
    g.beginPath(); g.arc(x - 1.6 * s, y - 5.4 * s, 0.8 * s, 0, TAU); g.fill()
  }

  // crystals
  for (let i = 0; i < 32; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h
    if (Math.hypot(x - cx, y - cy) < 260) continue
    const s = 5 + rnd() * 10
    glow(g, x, y, s * 2.6, '#7ee6ff', 0.13)
    g.fillStyle = 'rgba(96,180,200,.38)'
    g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.42, y - s * 0.3); g.lineTo(x, y + s * 0.4); g.lineTo(x - s * 0.42, y - s * 0.3); g.closePath(); g.fill()
    g.fillStyle = 'rgba(190,245,255,.35)'
    g.beginPath(); g.moveTo(x, y - s * 1.7); g.lineTo(x + s * 0.2, y - s * 0.5); g.lineTo(x, y - s * 0.2); g.closePath(); g.fill()
  }

  // rocks
  for (let i = 0; i < 120; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h
    if (Math.hypot(x - cx, y - cy) < 200) continue
    const s = 3 + rnd() * 8
    g.fillStyle = 'rgba(40,48,45,.55)'
    g.beginPath(); g.ellipse(x, y, s, s * 0.62, rnd() * TAU, 0, TAU); g.fill()
    g.fillStyle = 'rgba(86,98,90,.16)'
    g.beginPath(); g.ellipse(x - s * 0.15, y - s * 0.2, s * 0.55, s * 0.3, 0, 0, TAU); g.fill()
  }

  // bones
  for (let i = 0; i < 26; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h
    if (Math.hypot(x - cx, y - cy) < 210) continue
    g.save(); g.translate(x, y); g.rotate(rnd() * TAU)
    g.strokeStyle = 'rgba(196,186,158,.20)'; g.lineWidth = 2.2
    g.beginPath(); g.moveTo(-6, 0); g.lineTo(7, 2); g.stroke()
    g.beginPath(); g.arc(-7, 0, 2, 0, TAU); g.stroke()
    g.beginPath(); g.arc(-7, 3, 2, 0, TAU); g.stroke()
    g.restore()
  }

  // dead trees, mostly near the border
  const treeAt = (x, y, s) => {
    g.save(); g.translate(x, y); g.scale(s, s)
    g.fillStyle = 'rgba(3,5,5,.4)'
    g.beginPath(); g.ellipse(8, 4, 22, 7, 0, 0, TAU); g.fill()
    g.strokeStyle = '#1a201e'; g.lineWidth = 9; g.lineCap = 'round'
    g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(-3, -20, 2, -46); g.stroke()
    g.lineWidth = 5
    g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(-18, -32, -27, -50); g.stroke()
    g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(17, -38, 25, -58); g.stroke()
    g.beginPath(); g.moveTo(-1, -34); g.quadraticCurveTo(-10, -50, -7, -64); g.stroke()
    g.lineWidth = 2.5
    g.beginPath(); g.moveTo(-27, -50); g.lineTo(-37, -54); g.moveTo(-27, -50); g.lineTo(-31, -62); g.stroke()
    g.beginPath(); g.moveTo(25, -58); g.lineTo(36, -63); g.moveTo(25, -58); g.lineTo(30, -71); g.stroke()
    g.strokeStyle = 'rgba(110,130,110,.12)'; g.lineWidth = 1.5
    g.beginPath(); g.moveTo(1, 4); g.quadraticCurveTo(-1, -20, 2, -44); g.stroke()
    g.restore()
  }
  for (let i = 0; i < 54; i++) {
    const edge = rnd()
    let x, y
    if (edge < 0.25) { x = 30 + rnd() * 80; y = rnd() * WORLD.h }
    else if (edge < 0.5) { x = WORLD.w - 30 - rnd() * 80; y = rnd() * WORLD.h }
    else if (edge < 0.75) { x = rnd() * WORLD.w; y = 30 + rnd() * 80 }
    else { x = rnd() * WORLD.w; y = WORLD.h - 30 - rnd() * 80 }
    treeAt(x, y, 0.9 + rnd() * 0.8)
  }
  for (let i = 0; i < 14; i++) {
    const x = 250 + rnd() * (WORLD.w - 500), y = 250 + rnd() * (WORLD.h - 500)
    if (Math.hypot(x - cx, y - cy) < 340) continue
    treeAt(x, y, 0.7 + rnd() * 0.55)
  }

  // border brambles + darkness
  g.save()
  g.strokeStyle = 'rgba(8,14,12,.9)'; g.lineWidth = 16
  g.strokeRect(6, 6, WORLD.w - 12, WORLD.h - 12)
  g.strokeStyle = 'rgba(30,44,34,.6)'; g.lineWidth = 6
  g.strokeRect(20, 20, WORLD.w - 40, WORLD.h - 40)
  const edgeGrad = g.createRadialGradient(cx, cy, 700, cx, cy, 1180)
  edgeGrad.addColorStop(0, 'rgba(3,6,7,0)')
  edgeGrad.addColorStop(1, 'rgba(2,4,5,.78)')
  g.fillStyle = edgeGrad
  g.fillRect(0, 0, WORLD.w, WORLD.h)
  g.restore()

  // ambient static mote sprinkles
  for (let i = 0; i < 700; i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h
    g.fillStyle = rnd() > 0.5 ? 'rgba(160,230,180,.12)' : 'rgba(200,160,255,.10)'
    g.beginPath(); g.arc(x, y, 0.6 + rnd() * 1.2, 0, TAU); g.fill()
  }

  return c
}

// ── renderer ───────────────────────────────────────────────────────────────
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.dpr = 1
    this.w = 0; this.h = 0
    this.ground = makeGround()
    this.motes = []
    for (let i = 0; i < 34; i++) {
      this.motes.push({
        x: Math.random(), y: Math.random(),
        vy: 0.006 + Math.random() * 0.012,
        vx: (Math.random() - 0.5) * 0.004,
        r: 0.7 + Math.random() * 1.6,
        p: Math.random() * TAU,
        hue: Math.random() > 0.55 ? 'teal' : 'gold',
      })
    }
    this.resize()
  }

  resize() {
    const c = this.canvas
    const w = c.clientWidth || window.innerWidth
    const h = c.clientHeight || window.innerHeight
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = w; this.h = h
    this.zoom = w >= 1100 ? 1.32 : w >= 900 ? 1.16 : 1
    c.width = Math.round(w * this.dpr)
    c.height = Math.round(h * this.dpr)
  }

  draw(game, input, now, dt) {
    const ctx = this.ctx
    const { w, h, dpr } = this
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#080610'
    ctx.fillRect(0, 0, w, h)

    const shakeX = (Math.random() - 0.5) * game.shake
    const shakeY = (Math.random() - 0.5) * game.shake
    const camX = game.camera.x, camY = game.camera.y
    const zoom = this.zoom || 1

    ctx.save()
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY)
    ctx.scale(zoom, zoom)
    ctx.translate(-camX, -camY)

    // ground
    const vw = w / zoom, vh = h / zoom
    const sx = Math.max(0, camX - vw / 2 - 24), sy = Math.max(0, camY - vh / 2 - 24)
    const sw = Math.min(WORLD.w - sx, vw + 48), sh = Math.min(WORLD.h - sy, vh + 48)
    if (sw > 0 && sh > 0) ctx.drawImage(this.ground, sx, sy, sw, sh, sx, sy, sw, sh)

    // zones + ground effects
    for (const z of game.zones) this.drawZone(ctx, z, now)
    this.drawGroundEffects(ctx, game, now)

    // pickups
    for (const p of game.pickups) this.drawPickup(ctx, p, now)

    // entities sorted by y
    const drawables = []
    for (const e of game.enemies) drawables.push({ y: e.y, kind: 'e', e })
    drawables.push({ y: game.player.y, kind: 'p' })
    drawables.sort((a, b) => a.y - b.y)
    for (const d of drawables) {
      if (d.kind === 'p') this.drawPlayer(ctx, game, now)
      else this.drawEnemy(ctx, d.e, now, game)
    }

    // projectiles, effects, texts
    for (const p of game.projectiles) this.drawProjectile(ctx, p, now)
    this.drawTopEffects(ctx, game, now)
    this.drawParticles(ctx, game, now)
    this.drawTexts(ctx, game)

    ctx.restore()

    // ── screen-space atmosphere ──
    if (game.hurtFlash > 0.01) {
      const a = Math.min(0.30, game.hurtFlash * 0.30)
      const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.72)
      grd.addColorStop(0, 'rgba(160,10,30,0)')
      grd.addColorStop(1, `rgba(190,15,40,${a})`)
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, w, h)
    }

    if (game.state === 'playing' || game.state === 'levelup' || game.state === 'paused') {
      this.drawSticks(ctx, input, game, w, h)
      if (!input.usedTouch && input.mouse.inside) this.drawCrosshair(ctx, input, w, h)
    }

    this.drawMotes(ctx, w, h, dt, now)
  }

  // ── atmosphere ──
  drawAtmosphere(ctx, game, w, h) {
    const zoom = this.zoom || 1
    const px = w / 2 + (game.player.x - game.camera.x) * zoom
    const py = h / 2 + (game.player.y - game.camera.y) * zoom
    const g = ctx.createRadialGradient(px, py, 60 * zoom, px, py, Math.max(w, h) * 0.62)
    g.addColorStop(0, 'rgba(6,3,14,0)')
    g.addColorStop(0.62, 'rgba(6,3,14,.10)')
    g.addColorStop(1, 'rgba(4,2,10,.56)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // faint moonwash from the top
    const m = ctx.createLinearGradient(0, 0, 0, h * 0.55)
    m.addColorStop(0, 'rgba(120,110,200,.055)')
    m.addColorStop(1, 'rgba(120,110,200,0)')
    ctx.fillStyle = m
    ctx.fillRect(0, 0, w, h)
  }

  drawMotes(ctx, w, h, dt, now) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const m of this.motes) {
      m.y -= m.vy * dt
      m.x += m.vx * dt
      if (m.y < -0.03) { m.y = 1.03; m.x = Math.random() }
      if (m.x < -0.03) m.x = 1.03
      if (m.x > 1.03) m.x = -0.03
      const a = 0.18 + 0.22 * Math.sin(now * 2 + m.p)
      const x = m.x * w, y = m.y * h
      const col = m.hue === 'teal' ? '60,220,190' : '255,180,100'
      const rad = m.r * 5
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  }

  // ── player ──
  drawPlayer(ctx, game, now) {
    const p = game.player
    const moving = Math.hypot(p.vx, p.vy) > 8
    const bob = moving ? Math.sin(now * 13) * 2.2 : Math.sin(now * 2.4) * 1.1
    const lean = Math.sin(now * 6.5) * (moving ? 0.06 : 0.015)
    const face = Math.cos(p.facing) < 0 ? -1 : 1
    const staffGlow = Math.max(0.35, 1 - p.attackTimer / Math.max(0.001, p.attackCd))

    // shadow
    shadow(ctx, p.x, p.y + 16, 16, 6, 0.4)

    // magic circle
    ctx.save()
    ctx.translate(p.x, p.y + 17)
    ctx.scale(1, 0.42)
    ctx.rotate(now * 0.35)
    ctx.strokeStyle = 'rgba(168,120,255,.26)'; ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke()
    ctx.setLineDash([4, 9]); ctx.strokeStyle = 'rgba(168,120,255,.20)'
    ctx.beginPath(); ctx.arc(0, 0, 35, 0, TAU); ctx.stroke()
    ctx.setLineDash([])
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU
      ctx.fillStyle = 'rgba(200,160,255,.30)'
      ctx.beginPath(); ctx.arc(Math.cos(a) * 30, Math.sin(a) * 30, 2, 0, TAU); ctx.fill()
    }
    ctx.restore()

    // aim rune at feet
    if (game.state === 'playing') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const ax = p.x + Math.cos(p.aim) * 26, ay = p.y + 14 + Math.sin(p.aim) * 8
      glow(ctx, ax, ay, 13, '#ff9a4d', 0.25)
      ctx.restore()
    }

    ctx.save()
    ctx.translate(p.x, p.y + bob)
    ctx.scale(face, 1)
    ctx.rotate(lean)
    if (p.invuln > 0 && Math.floor(now * 18) % 2 === 0) ctx.globalAlpha = 0.55

    // cloak / body
    const sway = Math.sin(now * 7) * 2.4
    const cloak = ctx.createLinearGradient(0, -20, 0, 18)
    cloak.addColorStop(0, '#3a2266'); cloak.addColorStop(0.5, '#2a1749'); cloak.addColorStop(1, '#1b0f31')
    ctx.fillStyle = cloak
    ctx.beginPath()
    ctx.moveTo(-9, -14)
    ctx.quadraticCurveTo(-14, 0, -13 + sway * 0.3, 14)
    ctx.quadraticCurveTo(-6, 18, 0, 16)
    ctx.quadraticCurveTo(7, 18, 13 - sway * 0.3, 14)
    ctx.quadraticCurveTo(14, 0, 9, -14)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(120,80,180,.55)'; ctx.lineWidth = 1.2; ctx.stroke()

    // hem trim
    ctx.strokeStyle = 'rgba(170,130,240,.45)'; ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(-11, 12); ctx.quadraticCurveTo(-5, 16, 0, 14.5); ctx.quadraticCurveTo(6, 16, 11, 12)
    ctx.stroke()

    // little boots
    ctx.fillStyle = '#150c22'
    ctx.beginPath(); ctx.ellipse(-5, 16, 4, 2.6, 0.2, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.ellipse(5, 16, 4, 2.6, -0.2, 0, TAU); ctx.fill()

    // belt
    ctx.fillStyle = '#1a1029'
    ctx.fillRect(-8, 2, 16, 3)
    ctx.fillStyle = '#ffcf80'
    ctx.beginPath(); ctx.arc(0, 3.5, 1.9, 0, TAU); ctx.fill()

    // staff (held on right)
    ctx.save()
    ctx.translate(11, 3)
    ctx.rotate(-0.22 + Math.sin(now * 7) * 0.03)
    ctx.strokeStyle = '#4a2f22'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(3, -12, 5, -30); ctx.stroke()
    ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 1.1
    ctx.beginPath(); ctx.moveTo(0.5, 8); ctx.quadraticCurveTo(3, -12, 5, -29); ctx.stroke()
    // prongs
    ctx.strokeStyle = '#7a5836'; ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(5, -30); ctx.quadraticCurveTo(1, -35, -1, -37); ctx.moveTo(5, -30); ctx.quadraticCurveTo(9, -35, 11, -36); ctx.stroke()
    // orb
    const orbR = 5 + staffGlow * 2
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    glow(ctx, 5, -33, 24, '#ff9a4d', 0.24 + staffGlow * 0.2)
    glow(ctx, 5, -33, 11, '#ffd29a', 0.45 + staffGlow * 0.3)
    ctx.fillStyle = `rgba(255,220,170,${0.65 + staffGlow * 0.3})`
    ctx.beginPath(); ctx.arc(5, -33, orbR * 0.62, 0, TAU); ctx.fill()
    ctx.restore()
    ctx.restore()

    // left hand
    ctx.fillStyle = '#e8cfc2'
    ctx.beginPath(); ctx.arc(-10, 2, 3, 0, TAU); ctx.fill()

    // head
    ctx.fillStyle = '#f0d8cc'
    ctx.beginPath(); ctx.ellipse(0, -18, 7.4, 7.8, 0, 0, TAU); ctx.fill()
    // hair
    ctx.fillStyle = '#d6c2ef'
    ctx.beginPath()
    ctx.moveTo(-7.6, -20)
    ctx.quadraticCurveTo(-8, -11, -6, -9)
    ctx.quadraticCurveTo(-7, -14, -4, -17)
    ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(7.4, -21)
    ctx.quadraticCurveTo(8.4, -12, 6, -9)
    ctx.quadraticCurveTo(7.4, -15, 4, -18)
    ctx.closePath(); ctx.fill()
    // eyes
    ctx.fillStyle = '#2a1733'
    ctx.beginPath(); ctx.ellipse(-2.7, -17, 1.0, 1.5, 0, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.ellipse(2.7, -17, 1.0, 1.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(255,180,120,.9)'
    ctx.beginPath(); ctx.arc(-2.7, -17.4, 0.4, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(2.7, -17.4, 0.4, 0, TAU); ctx.fill()

    // witch hat
    const hatSway = Math.sin(now * 2.6) * 0.05
    ctx.save()
    ctx.translate(0, -24)
    ctx.rotate(hatSway)
    ctx.fillStyle = '#241338'
    ctx.beginPath(); ctx.ellipse(0, 1, 15.5, 4.4, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#5b3a8d'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.ellipse(0, 1, 15.5, 4.4, 0, 0, TAU); ctx.stroke()
    const hat = ctx.createLinearGradient(-8, -28, 8, 2)
    hat.addColorStop(0, '#4b2c80'); hat.addColorStop(0.55, '#311b56'); hat.addColorStop(1, '#1f1038')
    ctx.fillStyle = hat
    ctx.beginPath()
    ctx.moveTo(-10.5, 1)
    ctx.quadraticCurveTo(-7, -10, 1, -21)
    ctx.quadraticCurveTo(-5, -25, -6, -30)
    ctx.quadraticCurveTo(8, -22, 12, -4)
    ctx.quadraticCurveTo(4, 2, -10.5, 1)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(140,95,210,.6)'; ctx.lineWidth = 0.9; ctx.stroke()
    // band + buckle
    ctx.strokeStyle = '#e0a95f'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-9.6, -4.4); ctx.quadraticCurveTo(0, -1.4, 10.5, -6.2); ctx.stroke()
    ctx.fillStyle = '#ffd591'; ctx.fillRect(-1.5, -5.4, 3, 3)
    // little star charm
    ctx.fillStyle = 'rgba(255,220,160,.8)'
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * TAU / 4); ctx.beginPath(); ctx.ellipse(0, -29 - 2, 0.9, 2.4, 0, 0, TAU); ctx.fill(); ctx.restore()
    }
    ctx.restore()
    ctx.restore()

    // shield ward bubble
    if (p.shield > 0.5) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const pulse = 1 + Math.sin(now * 4) * 0.025
      const r = 29 * pulse
      const g = ctx.createRadialGradient(p.x, p.y - 6, r * 0.55, p.x, p.y - 6, r)
      g.addColorStop(0, 'rgba(140,190,255,0)')
      g.addColorStop(0.75, 'rgba(140,190,255,.08)')
      g.addColorStop(1, 'rgba(150,200,255,.24)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(p.x, p.y - 6, r, 0, TAU); ctx.fill()
      ctx.strokeStyle = `rgba(180,215,255,${0.3 + 0.15 * Math.sin(now * 5)})`; ctx.lineWidth = 1.3
      ctx.beginPath(); ctx.arc(p.x, p.y - 6, r, 0, TAU); ctx.stroke()
      ctx.setLineDash([3, 7]); ctx.lineDashOffset = -now * 10
      ctx.beginPath(); ctx.arc(p.x, p.y - 6, r - 4, 0, TAU); ctx.stroke()
      ctx.restore()
    }

    // familiars
    if (game.spells.familiar) {
      const rank = game.spells.familiar
      const count = rank >= 4 ? 2 : 1
      for (let i = 0; i < count; i++) {
        const a = now * 1.5 + i * Math.PI
        const fx = p.x + Math.cos(a) * 46
        const fy = p.y - 6 + Math.sin(a) * 22
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        glow(ctx, fx, fy, 24, '#c9a6ff', 0.4)
        glow(ctx, fx, fy, 9, '#fff0ff', 0.5)
        ctx.fillStyle = 'rgba(235,220,255,.92)'
        ctx.beginPath(); ctx.arc(fx, fy, 4.2, 0, TAU); ctx.fill()
        // ears
        ctx.beginPath(); ctx.moveTo(fx - 4, fy - 2); ctx.lineTo(fx - 5.5, fy - 8); ctx.lineTo(fx - 1, fy - 4); ctx.closePath(); ctx.fill()
        ctx.beginPath(); ctx.moveTo(fx + 4, fy - 2); ctx.lineTo(fx + 5.5, fy - 8); ctx.lineTo(fx + 1, fy - 4); ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#3a2060'
        ctx.beginPath(); ctx.arc(fx - 1.4, fy - 0.6, 0.75, 0, TAU); ctx.fill()
        ctx.beginPath(); ctx.arc(fx + 1.4, fy - 0.6, 0.75, 0, TAU); ctx.fill()
        ctx.restore()
      }
    }
  }

  // ── enemies ──
  drawEnemy(ctx, e, now, game) {
    const flying = e.def?.flying
    const bob = flying ? Math.sin(now * 4 + e.seed * 9) * 4 : 0
    const x = e.x, y = e.y + bob
    const elite = e.elite
    const chilled = e.slow > 0

    if (!flying) shadow(ctx, e.x, e.y + e.radius * 0.85, e.radius * 0.95, e.radius * 0.36, 0.34 + (elite ? 0.1 : 0))
    else shadow(ctx, e.x, e.y + e.radius * 0.9, e.radius * 0.7, e.radius * 0.24, 0.18)

    if (elite || e.isBoss) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const aura = e.isBoss ? 58 : e.radius * 2.2
      glow(ctx, x, y, aura, e.isBoss ? e.bossColor || '#b06fe0' : '#ffb15e', e.isBoss ? 0.16 : 0.22 + Math.sin(now * 4) * 0.04)
      ctx.restore()
    }

    ctx.save()
    ctx.translate(x, y)
    if (e.flash > 0) ctx.filter = 'brightness(2.6) saturate(.3)'
    if (e.type === 'slime') this.drawSlime(ctx, e, now)
    else if (e.type === 'bat') this.drawBat(ctx, e, now)
    else if (e.type === 'skeleton') this.drawSkeleton(ctx, e, now)
    else if (e.type === 'wraith') this.drawWraith(ctx, e, now)
    else if (e.type === 'imp') this.drawImp(ctx, e, now)
    else if (e.type === 'hound') this.drawHound(ctx, e, now)
    else if (e.type === 'boss') this.drawBoss(ctx, e, now)
    ctx.filter = 'none'
    ctx.restore()

    if (chilled) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      glow(ctx, x, y, e.radius * 1.7, '#8fe1ff', 0.16)
      ctx.restore()
    }

    // telegraphs for windups
    if (e.windup > 0) {
      const t = 1 - e.windup / e.windupMax
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = `rgba(255,90,90,${0.25 + t * 0.4})`
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(e.x, e.y + 4, e.radius + 14 + (1 - t) * 10, 0, TAU); ctx.stroke()
      ctx.fillStyle = `rgba(255,60,70,${0.04 + t * 0.08})`
      ctx.beginPath(); ctx.arc(e.x, e.y + 4, e.radius + 14, 0, TAU); ctx.fill()
      ctx.restore()
    }

    // hp bar
    if (e.hp < e.maxHp && !e.isBoss) {
      const w = e.radius * 2.1
      const yy = y - e.radius - 12
      ctx.fillStyle = 'rgba(4,2,8,.72)'
      roundRect(ctx, x - w / 2 - 1, yy - 1, w + 2, 5, 2.5); ctx.fill()
      ctx.fillStyle = elite ? '#ffc07a' : '#ff6b7f'
      roundRect(ctx, x - w / 2, yy, w * Math.max(0, e.hp / e.maxHp), 3, 1.5); ctx.fill()
    }
    if (elite) {
      ctx.fillStyle = '#ffd79a'
      ctx.font = 'bold 8px ui-sans-serif, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('ELITE', x, y - e.radius - 18)
      ctx.textAlign = 'left'
    }
  }

  drawSlime(ctx, e, now) {
    const squash = Math.sin(now * 5 + e.seed * 6) * 0.1
    const r = e.radius
    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.5, 1, 0, 0, r * 1.35)
    body.addColorStop(0, '#b6f5a8'); body.addColorStop(0.35, '#6ed47e'); body.addColorStop(1, '#27603c')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.ellipse(0, 2, r * (1 + squash), r * (0.88 - squash), 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(190,255,190,.4)'; ctx.lineWidth = 1; ctx.stroke()
    // gloss
    ctx.fillStyle = 'rgba(255,255,255,.28)'
    ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.34, r * 0.26, r * 0.16, -0.4, 0, TAU); ctx.fill()
    // eyes
    ctx.fillStyle = '#102418'
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.05, 2.1, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.05, 2.1, 0, TAU); ctx.fill()
    ctx.fillStyle = '#d8ffcf'
    ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.12, 0.7, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(r * 0.26, -r * 0.12, 0.7, 0, TAU); ctx.fill()
    // mouth
    ctx.strokeStyle = 'rgba(12,30,20,.65)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(0, r * 0.22, r * 0.26, 0.2, Math.PI - 0.2); ctx.stroke()
  }

  drawBat(ctx, e, now) {
    const flap = Math.sin(now * 16 + e.seed * 7)
    const r = e.radius
    ctx.fillStyle = '#3c2352'
    // wings
    ctx.save()
    ctx.strokeStyle = '#5a3478'; ctx.lineWidth = 1
    ctx.fillStyle = '#432760'
    ctx.beginPath()
    ctx.moveTo(-3, -2)
    ctx.quadraticCurveTo(-r * 2.3, -r * 1.4 - flap * 5, -r * 3.1, -r * 0.1 + flap * 2)
    ctx.quadraticCurveTo(-r * 2, r * 0.2, -r * 1.2, r * 0.4)
    ctx.quadraticCurveTo(-r * 0.5, 1, -2, 2)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(3, -2)
    ctx.quadraticCurveTo(r * 2.3, -r * 1.4 - flap * 5, r * 3.1, -r * 0.1 + flap * 2)
    ctx.quadraticCurveTo(r * 2, r * 0.2, r * 1.2, r * 0.4)
    ctx.quadraticCurveTo(r * 0.5, 1, 2, 2)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.restore()
    // body
    const body = ctx.createRadialGradient(0, -3, 1, 0, 0, r)
    body.addColorStop(0, '#7a4aa8'); body.addColorStop(1, '#2e1a45')
    ctx.fillStyle = body
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.9, 0, 0, TAU); ctx.fill()
    // ears
    ctx.fillStyle = '#3a2055'
    ctx.beginPath(); ctx.moveTo(-4, -r * 0.7); ctx.lineTo(-6, -r * 1.35); ctx.lineTo(-1, -r * 0.9); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(4, -r * 0.7); ctx.lineTo(6, -r * 1.35); ctx.lineTo(1, -r * 0.9); ctx.closePath(); ctx.fill()
    // eyes
    ctx.fillStyle = '#ff7a8a'
    ctx.beginPath(); ctx.arc(-2.3, -2, 1.4, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(2.3, -2, 1.4, 0, TAU); ctx.fill()
    // fangs
    ctx.fillStyle = '#f3e9d6'
    ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(-1, 6.2); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(0.5, 4); ctx.lineTo(1.5, 6.2); ctx.lineTo(2.5, 4); ctx.closePath(); ctx.fill()
  }

  drawSkeleton(ctx, e, now) {
    const r = e.radius
    const step = Math.sin(now * 6 + e.seed * 5)
    ctx.strokeStyle = '#cfc4a8'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
    // legs
    ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(-4 + step * 2, 15); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(3, 6); ctx.lineTo(3 - step * 2, 15); ctx.stroke()
    // body
    ctx.strokeStyle = '#e5dbc0'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 7); ctx.stroke()
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(0, -2 + i * 3.1, 5.5 - i * 0.5, 2.4, 0, 0, TAU); ctx.stroke()
    }
    // arms
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-4, -3); ctx.quadraticCurveTo(-9, 1, -8, 6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(4, -3); ctx.quadraticCurveTo(10, 0, 11, 4); ctx.stroke()
    // sword
    ctx.save(); ctx.translate(11, 5); ctx.rotate(-0.5 + step * 0.08)
    ctx.strokeStyle = '#7a5a3c'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(2, -11); ctx.stroke()
    ctx.strokeStyle = '#b9c4c0'; ctx.lineWidth = 2.4
    ctx.beginPath(); ctx.moveTo(2, -9); ctx.lineTo(3.5, -22); ctx.stroke()
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(-2, -1, 5, 2)
    ctx.restore()
    // skull
    ctx.fillStyle = '#efe5cc'
    ctx.beginPath(); ctx.ellipse(0, -12, 6.4, 7, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#efe5cc'
    ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(-3, -2.5); ctx.lineTo(3, -2.5); ctx.lineTo(4, -6); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#1b201c'
    ctx.beginPath(); ctx.ellipse(-2.5, -13, 1.8, 2.1, 0.1, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.ellipse(2.6, -13, 1.8, 2.1, -0.1, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(140,255,180,.75)'
    ctx.beginPath(); ctx.arc(-2.5, -13.2, 0.7, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(2.6, -13.2, 0.7, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#5b5548'; ctx.lineWidth = 0.9
    ctx.beginPath(); ctx.moveTo(-2, -7.5); ctx.lineTo(2, -7.5); ctx.stroke()
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 1.8, -8); ctx.lineTo(i * 1.8, -5.5); ctx.stroke() }
  }

  drawWraith(ctx, e, now) {
    const r = e.radius
    const drift = Math.sin(now * 2.2 + e.seed * 4) * 2
    ctx.save()
    ctx.translate(0, drift)
    // tattered cloak
    const grad = ctx.createLinearGradient(0, -r * 1.6, 0, r * 1.4)
    grad.addColorStop(0, 'rgba(110,150,200,.85)')
    grad.addColorStop(0.6, 'rgba(50,85,130,.7)')
    grad.addColorStop(1, 'rgba(20,40,70,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(-r * 0.8, -r * 0.7)
    ctx.quadraticCurveTo(-r * 1.25, r * 0.2, -r * 0.9, r * 1.25)
    ctx.quadraticCurveTo(-r * 0.45, r * 0.9, -r * 0.2, r * 1.5)
    ctx.quadraticCurveTo(0, r * 1.0, r * 0.25, r * 1.5)
    ctx.quadraticCurveTo(r * 0.5, r * 0.9, r * 0.95, r * 1.25)
    ctx.quadraticCurveTo(r * 1.25, r * 0.2, r * 0.8, -r * 0.7)
    ctx.quadraticCurveTo(0, -r * 1.9, -r * 0.8, -r * 0.7)
    ctx.fill()
    // hood
    ctx.fillStyle = 'rgba(25,48,75,.95)'
    ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.8, r * 0.95, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(10,20,35,.95)'
    ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.56, r * 0.68, 0, 0, TAU); ctx.fill()
    // eyes
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    glow(ctx, -r * 0.25, -r * 0.6, 7, '#8fe7ff', 0.6)
    glow(ctx, r * 0.25, -r * 0.6, 7, '#8fe7ff', 0.6)
    ctx.fillStyle = '#e6ffff'
    ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.6, 1.6, 2.4, 0, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.ellipse(r * 0.25, -r * 0.6, 1.6, 2.4, 0, 0, TAU); ctx.fill()
    ctx.restore()
    // grasping hands
    ctx.strokeStyle = 'rgba(190,220,245,.35)'; ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.1); ctx.lineTo(-r * 1.25, r * 0.55); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(r * 0.9, r * 0.1); ctx.lineTo(r * 1.25, r * 0.55); ctx.stroke()
    ctx.restore()
  }

  drawImp(ctx, e, now) {
    const r = e.radius
    const hop = Math.sin(now * 8 + e.seed * 5) * 1.5
    ctx.save(); ctx.translate(0, hop)
    // wings
    const flap = Math.sin(now * 18) * 0.4
    ctx.fillStyle = 'rgba(90,35,30,.8)'
    ctx.beginPath(); ctx.moveTo(-5, -2); ctx.quadraticCurveTo(-r * 2, -r - flap * 6, -r * 2.2, 2); ctx.quadraticCurveTo(-r, 1, -4, 4); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(5, -2); ctx.quadraticCurveTo(r * 2, -r - flap * 6, r * 2.2, 2); ctx.quadraticCurveTo(r, 1, 4, 4); ctx.closePath(); ctx.fill()
    // body
    const body = ctx.createRadialGradient(-2, -5, 1, 0, 0, r * 1.2)
    body.addColorStop(0, '#ffb07a'); body.addColorStop(0.45, '#e2613c'); body.addColorStop(1, '#6e241f')
    ctx.fillStyle = body
    ctx.beginPath(); ctx.ellipse(0, 1, r * 0.72, r * 0.92, 0, 0, TAU); ctx.fill()
    // legs
    ctx.strokeStyle = '#7a2c24'; ctx.lineWidth = 2.2
    ctx.beginPath(); ctx.moveTo(-3, 9); ctx.lineTo(-4, 14); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(3, 9); ctx.lineTo(4, 14); ctx.stroke()
    // horns
    ctx.fillStyle = '#2b1722'
    ctx.beginPath(); ctx.moveTo(-4, -r * 0.6); ctx.quadraticCurveTo(-9, -r * 1.5, -3, -r * 1.3); ctx.quadraticCurveTo(-2, -r, 0, -r * 0.7); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(4, -r * 0.6); ctx.quadraticCurveTo(9, -r * 1.5, 3, -r * 1.3); ctx.quadraticCurveTo(2, -r, 0, -r * 0.7); ctx.closePath(); ctx.fill()
    // eyes
    ctx.fillStyle = '#fff1a8'
    ctx.beginPath(); ctx.ellipse(-2.4, -2.5, 1.6, 1.9, 0.2, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.ellipse(2.4, -2.5, 1.6, 1.9, -0.2, 0, TAU); ctx.fill()
    // grin
    ctx.strokeStyle = '#3a0d10'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(0, 2.4, 3.2, 0.15, Math.PI - 0.15); ctx.stroke()
    // fire in palms
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    glow(ctx, -r * 0.9, 5, 9, '#ff8a3d', 0.4)
    glow(ctx, r * 0.9, 5, 9, '#ff8a3d', 0.4)
    ctx.restore()
    ctx.restore()
  }

  drawHound(ctx, e, now) {
    const r = e.radius
    const step = Math.sin(now * 12 + e.seed * 3)
    ctx.strokeStyle = '#3d4d26'; ctx.lineWidth = 2
    // legs
    for (const [lx, off] of [[-7, 0], [-4, 1], [4, -1], [8, 0]]) {
      ctx.beginPath(); ctx.moveTo(lx, 5); ctx.lineTo(lx + step * 2 * (off || 1), 14); ctx.stroke()
    }
    // body
    const body = ctx.createLinearGradient(-r, -r, r, r)
    body.addColorStop(0, '#6f8a3e'); body.addColorStop(0.5, '#4c6430'); body.addColorStop(1, '#26351c')
    ctx.fillStyle = body
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * 0.7, 0, 0, TAU); ctx.fill()
    // thorns along back
    ctx.fillStyle = '#30401f'
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 6, -r * 0.55); ctx.lineTo(i * 6 + 2, -r * 0.95); ctx.lineTo(i * 6 + 4, -r * 0.5); ctx.closePath(); ctx.fill()
    }
    // head
    ctx.fillStyle = '#586f33'
    ctx.beginPath(); ctx.ellipse(r * 0.95, -3, r * 0.5, r * 0.4, 0.2, 0, TAU); ctx.fill()
    ctx.fillStyle = '#2b351b'
    ctx.beginPath(); ctx.ellipse(r * 1.32, -2, r * 0.24, r * 0.2, 0.2, 0, TAU); ctx.fill()
    // eye
    ctx.fillStyle = '#ffec8a'
    ctx.beginPath(); ctx.arc(r * 1.05, -5, 1.5, 0, TAU); ctx.fill()
    // briar glow
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    glow(ctx, 0, 0, r * 1.5, '#a9e06a', 0.1)
    ctx.restore()
  }

  drawBoss(ctx, e, now) {
    const r = e.radius
    if (e.bossKind === 'warden') {
      const sway = Math.sin(now * 1.4) * 0.03
      ctx.save(); ctx.rotate(sway)
      // roots
      ctx.strokeStyle = '#344a2a'; ctx.lineWidth = 7; ctx.lineCap = 'round'
      for (let i = 0; i < 4; i++) {
        const a = 0.4 + i * 0.55
        ctx.beginPath(); ctx.moveTo(0, r * 0.4); ctx.quadraticCurveTo(Math.cos(a) * r * 0.8, r * 1.1, Math.cos(a) * r * 1.2, r * 1.25); ctx.stroke()
      }
      // trunk
      const trunk = ctx.createLinearGradient(-r, 0, r, 0)
      trunk.addColorStop(0, '#3c2c22'); trunk.addColorStop(0.5, '#5f4630'); trunk.addColorStop(1, '#2e221b')
      ctx.fillStyle = trunk
      ctx.beginPath()
      ctx.moveTo(-r * 0.55, r * 0.9)
      ctx.quadraticCurveTo(-r * 0.75, -r * 0.4, -r * 0.35, -r * 0.95)
      ctx.quadraticCurveTo(0, -r * 1.2, r * 0.35, -r * 0.95)
      ctx.quadraticCurveTo(r * 0.75, -r * 0.4, r * 0.55, r * 0.9)
      ctx.closePath(); ctx.fill()
      // bark lines
      ctx.strokeStyle = 'rgba(30,20,14,.6)'; ctx.lineWidth = 1.5
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.18, -r * 0.7); ctx.quadraticCurveTo(i * r * 0.22, 0, i * r * 0.2, r * 0.8); ctx.stroke() }
      // antler branches
      ctx.strokeStyle = '#4b3925'; ctx.lineWidth = 5; ctx.lineCap = 'round'
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * r * 0.3, -r * 0.8); ctx.quadraticCurveTo(s * r * 0.9, -r * 1.35, s * r * 0.75, -r * 1.75); ctx.stroke()
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(s * r * 0.55, -r * 1.15); ctx.quadraticCurveTo(s * r * 1.1, -r * 1.45, s * r * 1.3, -r * 1.4); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(s * r * 0.7, -r * 1.55); ctx.lineTo(s * r * 0.55, -r * 1.9); ctx.stroke()
        ctx.lineWidth = 5
      }
      // glowing heart
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      glow(ctx, 0, -r * 0.15, 30 + Math.sin(now * 3) * 4, '#a4ff8a', 0.45)
      ctx.fillStyle = '#d7ffb0'
      ctx.beginPath(); ctx.ellipse(0, -r * 0.15, 6, 9, 0, 0, TAU); ctx.fill()
      ctx.restore()
      // eyes
      ctx.fillStyle = '#d9ffb0'
      ctx.beginPath(); ctx.ellipse(-r * 0.18, -r * 0.55, 2.6, 1.6, 0.2, 0, TAU); ctx.fill()
      ctx.beginPath(); ctx.ellipse(r * 0.18, -r * 0.55, 2.6, 1.6, -0.2, 0, TAU); ctx.fill()
      // crown of thorns
      ctx.strokeStyle = '#6d7f3a'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(0, -r * 0.92, r * 0.34, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
      ctx.restore()
    } else {
      // Hollow King — crowned wraith
      const drift = Math.sin(now * 1.7) * 3
      ctx.save(); ctx.translate(0, drift)
      // cloak
      const grad = ctx.createLinearGradient(0, -r * 1.4, 0, r * 1.5)
      grad.addColorStop(0, 'rgba(120,80,190,.9)')
      grad.addColorStop(0.5, 'rgba(55,32,92,.9)')
      grad.addColorStop(1, 'rgba(15,8,28,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(-r * 0.5, -r * 0.6)
      ctx.quadraticCurveTo(-r * 1.4, r * 0.2, -r * 1.05, r * 1.4)
      for (let i = 0; i < 4; i++) {
        const x1 = -r * 1.05 + (i + 0.5) * (r * 2.1 / 4)
        ctx.quadraticCurveTo(x1, r * (1.0 + (i % 2) * 0.35), x1 + r * 0.26, r * 1.5)
      }
      ctx.quadraticCurveTo(r * 1.4, r * 0.2, r * 0.5, -r * 0.6)
      ctx.quadraticCurveTo(0, -r * 1.6, -r * 0.5, -r * 0.6)
      ctx.fill()
      // inner void
      ctx.fillStyle = 'rgba(9,4,18,.92)'
      ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.46, r * 0.68, 0, 0, TAU); ctx.fill()
      // eyes
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      glow(ctx, -r * 0.2, -r * 0.34, 22, '#c79aff', 0.55)
      glow(ctx, r * 0.2, -r * 0.34, 22, '#c79aff', 0.55)
      ctx.fillStyle = '#f3e4ff'
      ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.34, 3.4, 5, 0.3, 0, TAU); ctx.fill()
      ctx.beginPath(); ctx.ellipse(r * 0.2, -r * 0.34, 3.4, 5, -0.3, 0, TAU); ctx.fill()
      ctx.restore()
      // skeletal hands
      ctx.strokeStyle = 'rgba(220,200,240,.7)'; ctx.lineWidth = 2
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * r * 0.55, r * 0.05); ctx.quadraticCurveTo(s * r * 1.15, r * 0.4, s * r * 1.05, r * 0.8); ctx.stroke()
        for (let f = 0; f < 3; f++) {
          ctx.beginPath(); ctx.moveTo(s * r * 1.05, r * 0.78); ctx.lineTo(s * r * (1.08 + f * 0.05), r * (0.95 + f * 0.04)); ctx.stroke()
        }
      }
      // crown
      const cy = -r * 1.15 + Math.sin(now * 2.4) * 2
      ctx.fillStyle = '#e6bc63'
      ctx.beginPath()
      ctx.moveTo(-r * 0.44, cy + 6)
      ctx.lineTo(-r * 0.5, cy - 12)
      ctx.lineTo(-r * 0.22, cy - 3)
      ctx.lineTo(0, cy - 18)
      ctx.lineTo(r * 0.22, cy - 3)
      ctx.lineTo(r * 0.5, cy - 12)
      ctx.lineTo(r * 0.44, cy + 6)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(255,240,190,.6)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      glow(ctx, 0, cy - 2, 30, '#ffd27a', 0.22)
      ctx.fillStyle = '#ffe9b0'
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * r * 0.28, cy - 1, 1.5, 0, TAU); ctx.fill() }
      ctx.restore()
      ctx.restore()
    }
  }

  // ── projectiles ──
  drawProjectile(ctx, p, now) {
    const trailLen = p.kind === 'enemy' ? 2 : 3
    ctx.save()
    ctx.globalCompositeOperation = p.kind === 'enemy' ? 'source-over' : 'lighter'
    if (p.kind === 'vial') {
      ctx.translate(p.x, p.y)
      ctx.rotate(now * 8)
      ctx.fillStyle = '#88e07a'
      ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(3, -7); ctx.lineTo(5, 5); ctx.quadraticCurveTo(0, 9, -5, 5); ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(220,255,190,.5)'
      ctx.beginPath(); ctx.ellipse(-1, 0, 1.3, 2.4, 0.4, 0, TAU); ctx.fill()
    } else if (p.kind === 'enemy') {
      glow(ctx, p.x, p.y, p.r * 4.2, p.color, 0.35)
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.7, 0, TAU); ctx.fill()
      ctx.fillStyle = 'rgba(255,230,230,.8)'
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.3, 0, TAU); ctx.fill()
    } else {
      for (let i = trailLen; i > 0; i--) {
        const f = i / trailLen
        glow(ctx, p.x - p.vx * 0.012 * i, p.y - p.vy * 0.012 * i, p.r * (1.5 + f), p.color, 0.10 + (1 - f) * 0.14)
      }
      glow(ctx, p.x, p.y, p.r * 4.4, p.color, 0.4)
      glow(ctx, p.x, p.y, p.r * 1.9, '#fff3d8', 0.55)
      ctx.fillStyle = '#fff6e4'
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.48, 0, TAU); ctx.fill()
      // spinning sparks
      ctx.strokeStyle = rgba(p.color, 0.55); ctx.lineWidth = 1
      for (let i = 0; i < 2; i++) {
        const a = now * 7 + i * Math.PI
        ctx.beginPath()
        ctx.moveTo(p.x + Math.cos(a) * p.r * 1.1, p.y + Math.sin(a) * p.r * 1.1)
        ctx.lineTo(p.x + Math.cos(a) * p.r * 2.2, p.y + Math.sin(a) * p.r * 2.2)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawPickup(ctx, p, now) {
    const float = Math.sin(now * 3 + p.seed * 8) * 2.4
    if (p.kind === 'heal') {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      glow(ctx, p.x, p.y + float, 22, '#ff6f8a', 0.36)
      ctx.translate(p.x, p.y + float)
      ctx.scale(1, 1)
      ctx.fillStyle = '#ff8fa3'
      ctx.beginPath()
      ctx.moveTo(0, 6)
      ctx.bezierCurveTo(-9, -1, -5, -8, 0, -4)
      ctx.bezierCurveTo(5, -8, 9, -1, 0, 6)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,230,235,.8)'
      ctx.beginPath(); ctx.ellipse(-1.8, -2, 2.4, 1.4, -0.5, 0, TAU); ctx.fill()
      ctx.restore()
    } else {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      glow(ctx, p.x, p.y + float, 14 + p.v * 2, p.kind === 'big' ? '#ffcf7a' : '#a8ffd0', 0.34)
      ctx.translate(p.x, p.y + float)
      ctx.rotate(now * 1.8 + p.seed * 3)
      const s = p.kind === 'big' ? 1.5 : 1
      ctx.fillStyle = p.kind === 'big' ? '#ffd88f' : '#a8f5c8'
      ctx.beginPath(); ctx.moveTo(0, -6 * s); ctx.lineTo(4.2 * s, 0); ctx.lineTo(0, 6 * s); ctx.lineTo(-4.2 * s, 0); ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.85)'
      ctx.beginPath(); ctx.moveTo(0, -3.4 * s); ctx.lineTo(2 * s, 0); ctx.lineTo(0, 2 * s); ctx.lineTo(-2 * s, 0); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
  }

  // ── zones ──
  drawZone(ctx, z, now) {
    const fade = Math.min(1, z.life / 0.5)
    ctx.save()
    if (z.type === 'bramble') {
      ctx.globalAlpha = fade
      const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r)
      g.addColorStop(0, 'rgba(70,130,80,.22)'); g.addColorStop(1, 'rgba(40,90,60,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill()
      ctx.strokeStyle = 'rgba(130,220,140,.55)'; ctx.lineWidth = 2
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + z.seed * 6 + Math.sin(now * 1.5 + i) * 0.1
        const len = z.r * (0.65 + Math.sin(now * 3 + i * 2) * 0.2)
        ctx.beginPath()
        ctx.moveTo(z.x, z.y)
        ctx.quadraticCurveTo(z.x + Math.cos(a + 0.3) * len * 0.5, z.y + Math.sin(a + 0.3) * len * 0.5, z.x + Math.cos(a) * len, z.y + Math.sin(a) * len)
        ctx.stroke()
        ctx.fillStyle = 'rgba(150,240,150,.6)'
        ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * len, z.y + Math.sin(a) * len, 2, 0, TAU); ctx.fill()
      }
    } else if (z.type === 'poison') {
      ctx.globalAlpha = fade
      const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r)
      g.addColorStop(0, 'rgba(150,230,90,.18)'); g.addColorStop(0.7, 'rgba(90,160,60,.13)'); g.addColorStop(1, 'rgba(50,90,40,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 7; i++) {
        const t = now * 0.7 + i * 1.7 + z.seed * 9
        const a = i * 2.4 + z.seed * 4
        const rr = z.r * (0.25 + 0.55 * ((t * 0.6) % 1))
        const bx = z.x + Math.cos(a) * rr, by = z.y + Math.sin(a) * rr - ((t * 12) % 18)
        glow(ctx, bx, by, 9, '#b8f27a', 0.16)
      }
    } else if (z.type === 'fire') {
      ctx.globalAlpha = fade
      const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r)
      g.addColorStop(0, 'rgba(255,140,60,.20)'); g.addColorStop(1, 'rgba(120,30,10,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 10; i++) {
        const a = i * 2.1 + z.seed * 5
        const rr = z.r * (0.2 + 0.7 * ((i * 0.37 + now * 0.3) % 1))
        const fx = z.x + Math.cos(a) * rr, fy = z.y + Math.sin(a) * rr
        const fl = 3 + Math.sin(now * 9 + i * 3) * 2
        glow(ctx, fx, fy, 12, '#ff9a4d', 0.2)
        ctx.fillStyle = 'rgba(255,210,140,.55)'
        ctx.beginPath(); ctx.ellipse(fx, fy, 1.8, fl, 0, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
  }

  // ── effects (under entities) ──
  drawGroundEffects(ctx, game, now) {
    ctx.save()
    for (const e of game.effects) {
      if (e.layer !== 'ground') continue
      const t = e.life / e.maxLife
      if (e.type === 'telegraph') {
        const prog = 1 - t
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = rgba(e.color || '#ff9a4d', 0.5 + prog * 0.35)
        ctx.lineWidth = 2
        ctx.setLineDash([7, 6]); ctx.lineDashOffset = -now * 20
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r, e.r * 0.55, 0, 0, TAU); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = rgba(e.color || '#ff9a4d', 0.06 + prog * 0.10)
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * prog, e.r * 0.55 * prog, 0, 0, TAU); ctx.fill()
        // falling mark
        ctx.restore()
        if (e.type === 'telegraph' && e.extra === 'meteor') {
          const fy = e.y - 380 * t
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          glow(ctx, e.x, fy, 34, '#ff8a3d', 0.5)
          glow(ctx, e.x, fy - 22, 60, '#ff5e2a', 0.18)
          ctx.strokeStyle = 'rgba(255,190,120,.55)'; ctx.lineWidth = 7; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(e.x, fy); ctx.lineTo(e.x + 18, fy - 65); ctx.stroke()
          ctx.fillStyle = '#ffd8a8'
          ctx.beginPath(); ctx.arc(e.x, fy, 9, 0, TAU); ctx.fill()
          ctx.restore()
        }
      }
    }
    ctx.restore()
  }

  drawTopEffects(ctx, game, now) {
    ctx.save()
    for (const e of game.effects) {
      if (e.layer === 'ground') continue
      const t = Math.max(0, e.life / e.maxLife)
      if (e.type === 'ring') {
        const p = 1 - t
        const rr = e.r0 + (e.r - e.r0) * (1 - Math.pow(1 - p, 2))
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = rgba(e.color, 0.75 * t)
        ctx.lineWidth = e.width * t + 1
        ctx.beginPath(); ctx.ellipse(e.x, e.y, rr, rr * (e.flat ? 0.55 : 1), 0, 0, TAU); ctx.stroke()
        ctx.strokeStyle = rgba(e.color, 0.22 * t)
        ctx.lineWidth = e.width * 2.6 * t + 2
        ctx.beginPath(); ctx.ellipse(e.x, e.y, rr, rr * (e.flat ? 0.55 : 1), 0, 0, TAU); ctx.stroke()
        ctx.restore()
      } else if (e.type === 'burst') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        glow(ctx, e.x, e.y, e.r * (0.4 + (1 - t) * 0.8), e.color, 0.5 * t)
        ctx.restore()
      } else if (e.type === 'lightning') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass === 0 ? rgba(e.color, 0.26 * t) : 'rgba(255,255,255,.85)'
          ctx.lineWidth = pass === 0 ? 7 : 1.8
          ctx.beginPath()
          ctx.moveTo(e.pts[0].x, e.pts[0].y)
          for (let i = 1; i < e.pts.length; i++) ctx.lineTo(e.pts[i].x, e.pts[i].y)
          ctx.stroke()
        }
        for (const p of e.pts) {
          glow(ctx, p.x, p.y, 16, e.color, 0.4 * t)
        }
        ctx.restore()
      } else if (e.type === 'beam') {
        const w = 7 * t
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = rgba(e.color, 0.18 * t); ctx.lineWidth = w * 3; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke()
        ctx.strokeStyle = rgba(e.color, 0.72 * t); ctx.lineWidth = w
        ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke()
        ctx.strokeStyle = `rgba(255,240,240,${0.85 * t})`; ctx.lineWidth = Math.max(1, w * 0.3)
        ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke()
        for (let i = 0; i < 5; i++) {
          const k = (now * 1.6 + i * 0.2) % 1
          const px = e.x1 + (e.x2 - e.x1) * k, py = e.y1 + (e.y2 - e.y1) * k
          glow(ctx, px, py, 12, e.color, 0.5 * t)
        }
        ctx.restore()
      } else if (e.type === 'nova') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const p = 1 - t
        const rr = e.r * (1 - Math.pow(1 - p, 2))
        ctx.strokeStyle = rgba('#8fe1ff', 0.5 * t); ctx.lineWidth = 20 * t + 2
        ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, TAU); ctx.stroke()
        ctx.strokeStyle = `rgba(240,252,255,${0.9 * t})`; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, TAU); ctx.stroke()
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU
          const rx = e.x + Math.cos(a) * rr * 0.92, ry = e.y + Math.sin(a) * rr * 0.92
          ctx.strokeStyle = `rgba(200,245,255,${0.7 * t})`; ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(a) * 14 * t, ry + Math.sin(a) * 14 * t); ctx.stroke()
        }
        ctx.restore()
      } else if (e.type === 'shadowBlast') {
        ctx.save()
        ctx.fillStyle = rgba(e.color, 0.28 * t)
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.5 + (1 - t) * 0.7), 0, TAU); ctx.fill()
        ctx.restore()
      } else if (e.type === 'levelup') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const p = 1 - t
        for (let i = 0; i < 3; i++) {
          const rr = 20 + p * (60 + i * 32)
          ctx.strokeStyle = `rgba(210,170,255,${(1 - p) * 0.5})`
          ctx.lineWidth = 2
          ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, TAU); ctx.stroke()
        }
        glow(ctx, e.x, e.y, 90 * t + 20, '#c9a6ff', 0.3 * t)
        ctx.restore()
      } else if (e.type === 'spawnRing') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const p = 1 - t
        ctx.strokeStyle = rgba(e.color || '#c9a6ff', 0.6 * t); ctx.lineWidth = 2
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * (0.4 + p * 0.8), e.r * (0.4 + p * 0.8) * 0.5, 0, 0, TAU); ctx.stroke()
        ctx.restore()
      }
    }
    ctx.restore()
  }

  drawParticles(ctx, game, now) {
    ctx.save()
    for (const p of game.particles) {
      const t = Math.max(0, p.life / p.maxLife)
      if (p.glow) ctx.globalCompositeOperation = 'lighter'
      else ctx.globalCompositeOperation = 'source-over'
      const a = p.fade === false ? 1 : t
      if (p.shape === 'spark') {
        const len = Math.hypot(p.vx, p.vy) * 0.03
        ctx.strokeStyle = rgba(p.color, a * 0.9)
        ctx.lineWidth = p.size
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02)
        ctx.stroke()
      } else if (p.shape === 'leaf') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot || 0)
        ctx.fillStyle = rgba(p.color, a * 0.9)
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.7, p.size * 0.7, 0, 0, TAU); ctx.fill()
        ctx.restore()
      } else {
        if (p.glow) {
          glow(ctx, p.x, p.y, p.size * 4.5, p.color, a * 0.3)
        }
        ctx.fillStyle = rgba(p.color, a)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.shrink === false ? 1 : t * 0.7 + 0.3), 0, TAU); ctx.fill()
      }
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()
  }

  drawTexts(ctx, game) {
    ctx.save()
    ctx.textAlign = 'center'
    for (const t of game.texts) {
      const a = Math.min(1, t.life / 0.3)
      const pop = t.crit ? 1.25 : 1
      ctx.globalAlpha = a
      ctx.font = `700 ${Math.round(t.size * pop)}px ui-sans-serif, system-ui, -apple-system`
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(8,4,14,.7)'
      ctx.strokeText(t.text, t.x, t.y)
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y)
      if (t.crit) {
        ctx.font = `700 ${Math.round(t.size * 0.55)}px ui-sans-serif, system-ui`
        ctx.fillStyle = '#ffe6b0'
        ctx.fillText('CRIT', t.x, t.y - t.size * 1.05)
      }
    }
    ctx.restore()
  }

  // ── screen-space controls ──
  drawSticks(ctx, input, game, w, h) {
    const by = h - 104
    const off = clamp(w * 0.28, 110, 340)
    this.drawStick(ctx, input.moveStick, w * 0.5 - off, by, 'move', game)
    this.drawStick(ctx, input.aimStick, w * 0.5 + off, by, 'aim', game)
  }

  drawStick(ctx, stick, bx, by, kind, game) {
    const active = stick.active
    const ox = active ? stick.ox : bx
    const oy = active ? stick.oy : by
    const R = 54
    ctx.save()
    ctx.globalAlpha = active ? 0.9 : 0.5
    // base
    ctx.strokeStyle = active ? 'rgba(205,175,255,.55)' : 'rgba(190,165,230,.24)'
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.stroke()
    ctx.setLineDash([3, 8]); ctx.lineDashOffset = -performance.now() * 0.01
    ctx.strokeStyle = active ? 'rgba(205,175,255,.28)' : 'rgba(190,165,230,.13)'
    ctx.beginPath(); ctx.arc(ox, oy, R - 8, 0, TAU); ctx.stroke()
    ctx.setLineDash([])
    // fill hint
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R)
    g.addColorStop(0, active ? 'rgba(120,80,200,.12)' : 'rgba(120,80,200,.04)')
    g.addColorStop(1, 'rgba(120,80,200,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.fill()
    // knob
    let kx = ox, ky = oy
    if (active) {
      const d = Math.hypot(stick.dx, stick.dy)
      const cl = Math.min(R - 10, d)
      const a = Math.atan2(stick.dy, stick.dx)
      kx = ox + Math.cos(a) * cl
      ky = oy + Math.sin(a) * cl
    }
    const kg = ctx.createRadialGradient(kx, ky - 5, 0, kx, ky, 25)
    if (kind === 'aim') {
      kg.addColorStop(0, 'rgba(255,210,160,.85)'); kg.addColorStop(0.4, 'rgba(190,120,255,.55)'); kg.addColorStop(1, 'rgba(120,70,200,.12)')
    } else {
      kg.addColorStop(0, 'rgba(210,190,255,.8)'); kg.addColorStop(0.5, 'rgba(140,100,230,.42)'); kg.addColorStop(1, 'rgba(120,70,200,.1)')
    }
    ctx.fillStyle = kg
    ctx.beginPath(); ctx.arc(kx, ky, 22, 0, TAU); ctx.fill()
    ctx.strokeStyle = active ? 'rgba(240,225,255,.7)' : 'rgba(200,180,240,.3)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(kx, ky, 22, 0, TAU); ctx.stroke()
    // icon / label
    ctx.globalAlpha = active ? 0.95 : 0.55
    ctx.fillStyle = kind === 'aim' ? 'rgba(255,215,170,.9)' : 'rgba(225,210,255,.9)'
    if (kind === 'aim') {
      ctx.beginPath(); ctx.arc(ox, oy, 2, 0, TAU); ctx.fill()
      ctx.strokeStyle = 'rgba(255,200,150,.4)'; ctx.lineWidth = 1
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2
        ctx.beginPath(); ctx.moveTo(ox + Math.cos(a) * 11, oy + Math.sin(a) * 11); ctx.lineTo(ox + Math.cos(a) * 17, oy + Math.sin(a) * 17); ctx.stroke()
      }
    } else {
      ctx.strokeStyle = 'rgba(225,210,255,.45)'; ctx.lineWidth = 1.3
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4
        ctx.beginPath(); ctx.moveTo(ox + Math.cos(a) * 9, oy + Math.sin(a) * 9); ctx.lineTo(ox + Math.cos(a) * 15, oy + Math.sin(a) * 15); ctx.stroke()
      }
    }
    // cooldown arc for aim (ember)
    if (kind === 'aim' && game && game.state === 'playing') {
      const cd = game.player.attackCd > 0 ? game.player.attackTimer / game.player.attackCd : 0
      if (cd > 0.01) {
        ctx.strokeStyle = 'rgba(255,160,90,.5)'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.arc(ox, oy, R + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cd)); ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawCrosshair(ctx, input, w, h) {
    const x = input.mouse.x, y = input.mouse.y
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = 'rgba(255,200,140,.5)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke()
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); ctx.lineTo(x + Math.cos(a) * 17, y + Math.sin(a) * 17); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,225,180,.8)'
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill()
    ctx.restore()
  }
}

export { rgba, glow }
