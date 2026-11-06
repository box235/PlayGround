// ── Emberwitch: run simulation, spells, progression, UI ────────────────────
import { SPELLS, BOONS, ENEMIES, BOSSES, SPELL_ORDER, ROMAN } from './content.js'
import { WORLD } from './render.js'
import { sfx, initAudio, startAmbient, setMuted, isMuted } from './audio.js'

const TAU = Math.PI * 2
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const edge = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)))
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[(Math.random() * arr.length) | 0]
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

function shuffle(a) {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function weightPick(items) {
  let total = 0
  for (const it of items) total += it.w
  let r = Math.random() * total
  for (const it of items) { r -= it.w; if (r <= 0) return it }
  return items[items.length - 1]
}

export class Game {
  constructor(canvas, input, renderer) {
    this.canvas = canvas
    this.input = input
    this.renderer = renderer
    this.state = 'title'
    this.ui = {}
    for (const id of ['hud', 'hpFill', 'hpText', 'xpFill', 'lvlBadge', 'clock', 'objective', 'killCount',
      'bossWrap', 'bossTitle', 'bossFill', 'bossHpText', 'spellRail', 'dashBtn', 'dashCd', 'hintLine',
      'waveBanner', 'titleScreen', 'startBtn', 'levelup', 'newLevel', 'cards', 'pauseScreen', 'resumeBtn',
      'quitBtn', 'pauseStats', 'loadout', 'endScreen', 'endTitle', 'endLine', 'endStats', 'endSpells',
      'retryBtn', 'bestLine', 'muteBtn', 'pauseBtn', 'endSigil']) {
      this.ui[id] = document.getElementById(id)
    }
    this.endInner = document.querySelector('.end-inner')
    this.muted = isMuted()
    this.best = this.loadBest()
    this.hudTimer = 0
    this.bannerTimer = 0
    this.hintTimer = 0
    this.chipEls = {}
    this.ambientTime = 0
    this.resetWorld()
    this.state = 'title'
    this.bindUI()
  }

  // ── setup ────────────────────────────────────────────────────────────────
  bindUI() {
    this.ui.startBtn.addEventListener('click', () => { sfx('click'); this.beginRun() })
    this.ui.retryBtn.addEventListener('click', () => { sfx('click'); this.beginRun() })
    this.ui.pauseBtn.addEventListener('click', () => this.togglePause())
    this.ui.resumeBtn.addEventListener('click', () => this.togglePause(false))
    this.ui.quitBtn.addEventListener('click', () => { sfx('click'); this.quitToTitle() })
    this.ui.muteBtn.addEventListener('click', () => {
      this.muted = !this.muted
      setMuted(this.muted)
      this.ui.muteBtn.classList.toggle('muted', this.muted)
      sfx('click')
    })
    this.ui.dashBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      this.input.queueDash()
    })
    this.ui.cards.addEventListener('click', (e) => {
      const card = e.target.closest('.card')
      if (!card) return
      this.chooseCard(Number(card.dataset.index))
    })
    window.addEventListener('keydown', (e) => this.onKey(e))
  }

  onKey(e) {
    if (e.repeat) return
    if (this.state === 'levelup') {
      if (e.code === 'Digit1' || e.code === 'Numpad1') this.chooseCard(0)
      else if (e.code === 'Digit2' || e.code === 'Numpad2') this.chooseCard(1)
      else if (e.code === 'Digit3' || e.code === 'Numpad3') this.chooseCard(2)
      return
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault()
      if (this.state === 'playing') this.togglePause(true)
      else if (this.state === 'paused') this.togglePause(false)
    }
    if ((this.state === 'dead' || this.state === 'victory') && (e.code === 'Enter' || e.code === 'KeyR')) {
      this.beginRun()
    }
  }

  loadBest() {
    try {
      const v = JSON.parse(localStorage.getItem('emberwitch.best') || 'null')
      if (v && typeof v.time === 'number') return v
    } catch {}
    return { time: 0, kills: 0, level: 0 }
  }

  saveBest() {
    const b = this.best
    let changed = false
    if (this.time > b.time) { b.time = this.time; changed = true }
    if (this.kills > b.kills) { b.kills = this.kills; changed = true }
    if (this.level > b.level) { b.level = this.level; changed = true }
    if (changed) { try { localStorage.setItem('emberwitch.best', JSON.stringify(b)) } catch {} }
  }

  resetWorld() {
    this.time = 0
    this.level = 1
    this.xp = 0
    this.xpNext = this.xpNeeded(1)
    this.pendingLevels = 0
    this.kills = 0
    this.score = 0
    this.bossesSlain = 0
    this.player = {
      x: WORLD.w / 2, y: WORLD.h / 2 + 60,
      vx: 0, vy: 0, r: 15,
      hp: 100, maxHp: 100,
      facing: -Math.PI / 2, aim: -Math.PI / 2,
      attackTimer: 0, attackCd: 0.86,
      invuln: 0, hurtTimer: 0,
      dashTimer: 0, dashCd: 0, dashDir: { x: 0, y: -1 },
      shield: 0, shieldMax: 0, regenTick: 0,
      trailTimer: 0,
    }
    this.camera = { x: this.player.x, y: this.player.y }
    this.enemies = []
    this.projectiles = []
    this.pickups = []
    this.particles = []
    this.effects = []
    this.zones = []
    this.texts = []
    this.strikes = []
    this.spells = { ember: 1 }
    this.boons = {}
    this.cds = {}
    this.spawnTimer = 1.2
    this.wave = 0
    this.shake = 0
    this.hurtFlash = 0
    this.bossRef = null
    this.bossSpawned = { warden: false, king: false }
    this.bossKilled = { warden: false, king: false }
    this.victoryTimer = -1
    this.familiarTick = 0
    this.lastFired = 0
    this.killsAtStart = 0
    this.spawnGrace = 0
    this.slowmo = 0
    this.chipEls = {}
  }

  xpNeeded(level) {
    return Math.round(6 + level * 3 + Math.pow(level, 1.45) * 1.2)
  }

  beginRun() {
    initAudio()
    startAmbient()
    this.ui.muteBtn.classList.toggle('muted', this.muted)
    this.resetWorld()
    this.ui.titleScreen.classList.add('hidden')
    this.ui.endScreen.classList.add('hidden')
    this.ui.pauseScreen.classList.add('hidden')
    this.ui.levelup.classList.add('hidden')
    this.ui.hud.classList.remove('hidden')
    this.ui.bossWrap.classList.add('hidden')
    this.state = 'playing'
    this.syncHUD(true)
    this.buildRail()
    // a few welcoming beasts
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.4
      this.spawnEnemy('slime', this.player.x + Math.cos(a) * 260, this.player.y + Math.sin(a) * 260, { quiet: true })
    }
    this.showBanner('THE GROVE STIRS')
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
    this.showHint(coarse
      ? 'Left thumb moves · right thumb aims · dash through danger'
      : 'WASD move · mouse aim · Space to dash · Esc to pause', 9)
    this.hudTimer = 0
    sfx('boss')
  }

  quitToTitle() {
    this.state = 'title'
    this.ui.hud.classList.add('hidden')
    this.ui.pauseScreen.classList.add('hidden')
    this.ui.bossWrap.classList.add('hidden')
    this.ui.endScreen.classList.add('hidden')
    this.ui.titleScreen.classList.remove('hidden')
    this.resetWorld()
  }

  // ── UI bits ──────────────────────────────────────────────────────────────
  spellCooldown(id, rank) {
    switch (id) {
      case 'ember': return (0.86 - 0.07 * (rank - 1))
      case 'frost': return 3.6 - 0.2 * (rank - 1)
      case 'chain': return 4.4 - 0.25 * (rank - 1)
      case 'bramble': return 5.2
      case 'hex': return 5.6
      case 'meteor': return 8.5
      case 'siphon': return 6.4
      case 'ward': return 9.0
      default: return 6
    }
  }

  buildRail(newId = null) {
    const rail = this.ui.spellRail
    rail.innerHTML = ''
    this.chipEls = {}
    const ids = ['ember', ...SPELL_ORDER.filter((id) => this.spells[id])]
    for (const id of ids) {
      const sp = SPELLS[id]
      const rank = this.spells[id] || 1
      const el = document.createElement('div')
      el.className = 'spell-chip' + (id === newId ? ' new' : '')
      el.style.setProperty('--c', sp.color)
      el.title = `${sp.name} · Rank ${ROMAN[rank]}`
      el.innerHTML = `${sp.icon}<span class="rk">${ROMAN[rank]}</span><i class="cd"></i>`
      rail.appendChild(el)
      const cd = el.querySelector('.cd')
      cd.style.transformOrigin = 'top'
      cd.style.transform = 'scaleY(0)'
      cd.style.opacity = '0'
      this.chipEls[id] = { el, cd, rank }
    }
  }

  refreshRail() { this.buildRail() }

  showBanner(text) {
    const el = this.ui.waveBanner
    el.classList.remove('show')
    void el.offsetWidth
    el.textContent = text
    el.classList.add('show')
    this.bannerTimer = 2.6
  }

  showHint(text, secs = 7) {
    const el = this.ui.hintLine
    el.textContent = text
    el.classList.add('show')
    this.hintTimer = secs
  }

  togglePause(force) {
    if (this.state === 'playing' && force !== false) {
      this.state = 'paused'
      this.ui.pauseScreen.classList.remove('hidden')
      this.fillPause()
      sfx('click')
    } else if (this.state === 'paused' && force !== true) {
      this.state = 'playing'
      this.ui.pauseScreen.classList.add('hidden')
      this.showHint('The grove waits for no witch', 2)
      sfx('click')
    }
  }

  fillPause() {
    this.ui.pauseStats.innerHTML = `
      <div><span>Time</span><b>${this.fmtTime(this.time)}</b></div>
      <div><span>Level</span><b>${this.level}</b></div>
      <div><span>Slain</span><b>${this.kills}</b></div>
      <div><span>Spells</span><b>${Object.keys(this.spells).length}</b></div>`
    this.fillLoadout(this.ui.loadout)
  }

  fillLoadout(el) {
    el.innerHTML = ''
    for (const id of ['ember', ...SPELL_ORDER.filter((id) => this.spells[id])]) {
      const sp = SPELLS[id]
      const rank = this.spells[id]
      const d = document.createElement('div')
      d.className = 'lo'
      d.style.setProperty('--c', sp.color)
      d.innerHTML = `${sp.icon}<span>${sp.name}</span><b>${ROMAN[rank]}</b>`
      el.appendChild(d)
    }
    for (const id of Object.keys(this.boons)) {
      const b = BOONS[id]
      const d = document.createElement('div')
      d.className = 'lo'
      d.style.setProperty('--c', b.color)
      d.innerHTML = `${b.icon}<span>${b.name}</span><b>${ROMAN[this.boons[id]]}</b>`
      el.appendChild(d)
    }
  }

  fmtTime(t) {
    const s = Math.max(0, Math.floor(t))
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  // ── stats ────────────────────────────────────────────────────────────────
  get maxHp() { return 100 + (this.boons.vitality || 0) * 22 + (this.level - 1) * 2 }
  get moveSpeed() { return 158 * (1 + (this.boons.swift || 0) * 0.07) }
  get castSpeed() { return 1 + (this.boons.focus || 0) * 0.10 }
  get damageMult() { return 1 + (this.boons.might || 0) * 0.12 }
  get xpMult() { return 1 + (this.boons.fortune || 0) * 0.12 }
  get magnetRadius() { return 65 + (this.boons.magnet || 0) * 55 }
  get regen() { return 0.12 + (this.boons.regen || 0) * 0.4 }

  spellDmg(base) { return base * this.damageMult }

  // ── main update ──────────────────────────────────────────────────────────
  update(dt) {
    if (this.state === 'playing') {
      this.updateRun(dt)
    } else {
      // keep the frozen scene's timers gentle
      this.shake *= Math.pow(0.001, dt)
      this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2)
      if (this.state === 'dead' || this.state === 'victory') {
        this.stepParticles(dt)
        this.stepTexts(dt)
      }
    }
    this.updateCooldownUI()
  }

  updateRun(dt) {
    this.time += dt
    this.spawnGrace = Math.max(0, this.spawnGrace - dt)
    this.shake *= Math.pow(0.0015, dt)
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.6)
    if (this.hintTimer > 0) {
      this.hintTimer -= dt
      if (this.hintTimer <= 0) this.ui.hintLine.classList.remove('show')
    }
    if (this.bannerTimer > 0) this.bannerTimer -= dt

    this.updateBossTriggers()
    this.updatePlayer(dt)
    this.updateSpells(dt)
    this.updateEnemies(dt)
    this.updateZones(dt)
    this.updateProjectiles(dt)
    this.updateStrikes(dt)
    this.updatePickups(dt)
    this.stepParticles(dt)
    this.stepEffects(dt)
    this.stepTexts(dt)
    this.updateSpawner(dt)
    this.updateCamera(dt)
    this.updateVictory(dt)

    this.hudTimer -= dt
    if (this.hudTimer <= 0) { this.syncHUD(); this.hudTimer = 0.09 }
  }

  updateBossTriggers() {
    if (!this.bossSpawned.warden && this.time >= 58) {
      this.bossSpawned.warden = true
      this.spawnBoss('warden')
    }
    if (!this.bossSpawned.king && this.bossKilled.warden && this.time >= 150) {
      this.bossSpawned.king = true
      this.spawnBoss('king')
    }
  }

  spawnBoss(kind) {
    const def = BOSSES[kind]
    const a = rand(0, TAU)
    let x = clamp(this.player.x + Math.cos(a) * 340, 120, WORLD.w - 120)
    let y = clamp(this.player.y + Math.sin(a) * 340, 120, WORLD.h - 120)
    const scale = 1 + this.time * 0.0035
    const e = {
      type: 'boss', bossKind: kind, isBoss: true, def,
      x, y, hp: def.hp * scale, maxHp: def.hp * scale,
      speed: def.speed, radius: def.radius, damage: def.damage * (1 + this.time * 0.005),
      xp: def.xp, score: def.score, color: def.color, seed: Math.random(),
      hitCd: 0, flash: 0, slow: 0, atkCd: 2.4, windup: 0, windupMax: 0,
      phase: 0, elite: false, dead: false, bossColor: def.color, spawnAnim: 1.2,
    }
    this.enemies.push(e)
    this.bossRef = e
    this.showBanner(kind === 'warden' ? 'THE BRIAR WARDEN AWAKENS' : 'THE HOLLOW KING RISES')
    this.ui.bossTitle.textContent = def.name.toUpperCase()
    this.ui.bossWrap.classList.remove('hidden')
    this.effects.push({ type: 'ring', x, y, r: 130, r0: 10, life: 0.9, maxLife: 0.9, color: def.color, width: 5, flat: true, layer: 'top' })
    this.burst(x, y, def.color, 30, 3.2)
    this.shake = 18
    sfx('boss')
  }

  // ── player ───────────────────────────────────────────────────────────────
  updatePlayer(dt) {
    const p = this.player
    const inp = this.input
    p.maxHp = this.maxHp
    p.attackCd = this.spellCooldown('ember', this.spells.ember) / this.castSpeed

    p.invuln = Math.max(0, p.invuln - dt)
    p.hurtTimer = Math.max(0, p.hurtTimer - dt)
    p.attackTimer -= dt
    p.dashCd = Math.max(0, p.dashCd - dt)

    // movement
    const mv = inp.moveVec
    let spd = this.moveSpeed
    if (p.dashTimer > 0) {
      p.dashTimer -= dt
      p.x += p.dashDir.x * 520 * dt
      p.y += p.dashDir.y * 520 * dt
      p.trailTimer -= dt
      if (p.trailTimer <= 0) {
        p.trailTimer = 0.028
        this.particles.push({ x: p.x + rand(-4, 4), y: p.y + rand(-8, 6), vx: rand(-10, 10), vy: rand(-10, 10), life: 0.32, maxLife: 0.32, size: rand(4, 8), color: '#c9a6ff', glow: true, shape: 'circle', drag: 0.9 })
      }
    } else {
      p.vx = mv.x * spd * mv.mag
      p.vy = mv.y * spd * mv.mag
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (mv.mag > 0.05) this.ambientTime += dt
    }
    p.x = clamp(p.x, 70, WORLD.w - 70)
    p.y = clamp(p.y, 70, WORLD.h - 70)

    // dash
    if (inp.consumeDash() && p.dashCd <= 0 && p.dashTimer <= 0) {
      const dir = mv.mag > 0.1 ? mv : { x: Math.cos(p.aim), y: Math.sin(p.aim) }
      p.dashDir = { x: dir.x, y: dir.y }
      p.dashTimer = 0.17
      p.dashCd = 1.5
      p.invuln = Math.max(p.invuln, 0.34)
      this.shake = Math.max(this.shake, 3)
      this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, size: 10, color: '#c9a6ff', glow: true, shape: 'circle', drag: 0.85 })
      sfx('dash')
    }

    // aim: right stick > mouse > nearest > movement
    let aimTarget = null
    const target = this.nearestEnemy(p.x, p.y, 640)
    const av = inp.aimVec
    if (av.active) {
      p.aim = Math.atan2(av.y, av.x)
      aimTarget = target
    } else if (!inp.usedTouch && inp.mouse.inside) {
      const z = this.renderer.zoom || 1
      const psx = this.renderer.w / 2 + (p.x - this.camera.x) * z
      const psy = this.renderer.h / 2 + (p.y - this.camera.y - 8) * z
      p.aim = Math.atan2(inp.mouse.y - psy, inp.mouse.x - psx)
      aimTarget = target
    } else if (target && dist(p, target) < 640) {
      p.aim = Math.atan2(target.y - p.y, target.x - p.x)
      aimTarget = target
    } else if (mv.mag > 0.1) {
      p.aim = Math.atan2(mv.y, mv.x)
    }
    p.facing = p.aim

    // auto-fire ember
    const wantFire = target || av.active || (!inp.usedTouch && inp.mouse.inside && inp.mouse.down)
    if (p.attackTimer <= 0 && wantFire) {
      this.castEmber(av.active ? p.aim : (target ? Math.atan2(target.y - p.y, target.x - p.x) : p.aim))
      p.attackTimer = p.attackCd
    }

    // dash invulnerability & regen
    if (p.invuln <= 0) {
      p.hp = Math.min(p.maxHp, p.hp + this.regen * dt)
    }
    if (p.hp <= 0) this.die()
  }

  nearestEnemy(x, y, range) {
    let best = null, bd = range * range
    for (const e of this.enemies) {
      if (e.dead) continue
      const d = (e.x - x) ** 2 + (e.y - y) ** 2
      if (d < bd) { bd = d; best = e }
    }
    return best
  }

  enemiesIn(x, y, r) {
    const out = []
    for (const e of this.enemies) {
      if (e.dead) continue
      if (Math.hypot(e.x - x, e.y - y) <= r + e.radius) out.push(e)
    }
    return out
  }

  // ── spells ───────────────────────────────────────────────────────────────
  castEmber(angle) {
    const p = this.player
    const rank = this.spells.ember
    const count = 1 + (rank >= 3 ? 1 : 0) + (rank >= 5 ? 1 : 0)
    const baseDmg = this.spellDmg(10 + 4 * (rank - 1))
    const mx = p.x + Math.cos(angle) * 20
    const my = p.y - 8 + Math.sin(angle) * 12
    for (let i = 0; i < count; i++) {
      const off = count === 1 ? 0 : (i - (count - 1) / 2) * 0.11
      const a = angle + off
      this.projectiles.push({
        kind: 'ember', x: mx, y: my, vx: Math.cos(a) * 610, vy: Math.sin(a) * 610,
        r: 7.5, dmg: baseDmg, life: 1.05, maxLife: 1.05, color: '#ff9a4d', pierce: rank >= 4 ? 1 : 0,
        hit: [], angle: a,
      })
    }
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: mx, y: my, vx: Math.cos(angle) * rand(20, 90) + rand(-25, 25), vy: Math.sin(angle) * rand(20, 90) + rand(-25, 25),
        life: rand(0.16, 0.32), maxLife: 0.32, size: rand(1.2, 2.6), color: '#ffb46b', glow: true, shape: 'spark', drag: 0.92,
      })
    }
    sfx('shoot')
  }

  updateSpells(dt) {
    const p = this.player
    for (const id of Object.keys(this.spells)) {
      if (id === 'ember') continue
      if (id === 'familiar') continue
      this.cds[id] = (this.cds[id] || 0) - dt
      if (this.cds[id] > 0) continue
      const rank = this.spells[id]
      let cast = false
      if (id === 'frost') cast = this.castFrost(rank)
      else if (id === 'chain') cast = this.castChain(rank)
      else if (id === 'bramble') cast = this.castBramble(rank)
      else if (id === 'hex') cast = this.castHex(rank)
      else if (id === 'meteor') cast = this.castMeteor(rank)
      else if (id === 'siphon') cast = this.castSiphon(rank)
      else if (id === 'ward') cast = this.castWard(rank)
      if (cast) this.cds[id] = this.spellCooldown(id, rank) / this.castSpeed
    }
    // familiar contact damage
    if (this.spells.familiar) {
      const rank = this.spells.familiar
      const count = rank >= 4 ? 2 : 1
      this.familiarTick -= dt
      if (this.familiarTick <= 0) {
        this.familiarTick = 0.34
        for (let i = 0; i < count; i++) {
          const a = this.time * 1.5 + i * Math.PI
          const fx = p.x + Math.cos(a) * 46
          const fy = p.y - 6 + Math.sin(a) * 22
          const hits = this.enemiesIn(fx, fy, 15)
          if (hits.length) {
            for (const e of hits.slice(0, 2)) this.damageEnemy(e, this.spellDmg(6 + 3 * (rank - 1)), { silent: true, color: '#c9a6ff' })
            this.burst(fx, fy, '#c9a6ff', 3, 1.6)
            sfx('hit')
          }
        }
      }
    }
  }

  castFrost(rank) {
    const p = this.player
    const r = 108 + 14 * (rank - 1)
    const dmg = this.spellDmg(9 + 5 * (rank - 1))
    this.effects.push({ type: 'nova', x: p.x, y: p.y, r, life: 0.55, maxLife: 0.55, layer: 'top' })
    for (const e of this.enemiesIn(p.x, p.y, r)) {
      this.damageEnemy(e, dmg, { color: '#8fe1ff' })
      e.slow = Math.max(e.slow, 2)
    }
    for (let i = 0; i < 18; i++) {
      const a = rand(0, TAU), d = rand(20, r)
      this.particles.push({
        x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d,
        vx: Math.cos(a) * rand(30, 130), vy: Math.sin(a) * rand(30, 130),
        life: rand(0.3, 0.65), maxLife: 0.65, size: rand(1.5, 3.4), color: '#bdefff', glow: true, shape: 'spark', drag: 0.9,
      })
    }
    this.shake = Math.max(this.shake, 4)
    sfx('nova')
    return true
  }

  castChain(rank) {
    const p = this.player
    const first = this.nearestEnemy(p.x, p.y, 560)
    if (!first) return false
    const jumps = 2 + rank
    const dmg = this.spellDmg(13 + 5 * (rank - 1))
    const hit = new Set()
    let cur = first
    const pts = [{ x: p.x, y: p.y - 8 }, { x: first.x, y: first.y }]
    for (let i = 0; i < jumps; i++) {
      if (!cur || cur.dead) break
      hit.add(cur)
      this.damageEnemy(cur, dmg, { color: '#cbb5ff', chain: true })
      const next = this.enemies
        .filter((e) => !e.dead && !hit.has(e))
        .map((e) => ({ e, d: Math.hypot(e.x - cur.x, e.y - cur.y) }))
        .filter((o) => o.d < 230)
        .sort((a, b) => a.d - b.d)[0]
      if (next) { pts.push({ x: next.e.x, y: next.e.y }); }
      cur = next ? next.e : null
    }
    // jittered lightning
    const path = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]
      path.push({ x: a.x, y: a.y })
      const segs = 4
      for (let s = 1; s < segs; s++) {
        const t = s / segs
        path.push({ x: lerp(a.x, b.x, t) + rand(-7, 7), y: lerp(a.y, b.y, t) + rand(-7, 7) })
      }
    }
    path.push(pts[pts.length - 1])
    this.effects.push({ type: 'lightning', pts: path, color: '#b9a3ff', life: 0.28, maxLife: 0.28, layer: 'top' })
    sfx('chain')
    return true
  }

  castBramble(rank) {
    const p = this.player
    const t = this.nearestEnemy(p.x, p.y, 520)
    if (!t) return false
    const r = 68 + 8 * rank
    this.zones.push({
      type: 'bramble', x: t.x, y: t.y, r, life: 4.2, maxLife: 4.2, tick: 0, tickRate: 0.5,
      dmg: this.spellDmg(4 + 2 * (rank - 1)), seed: Math.random(), slow: true,
    })
    this.effects.push({ type: 'ring', x: t.x, y: t.y, r: r + 8, r0: 10, life: 0.5, maxLife: 0.5, color: '#9be6a8', width: 3, flat: true, layer: 'top' })
    this.burst(t.x, t.y, '#9be6a8', 12, 2.4)
    sfx('lob')
    return true
  }

  castHex(rank) {
    const p = this.player
    const t = this.nearestEnemy(p.x, p.y, 560)
    if (!t) return false
    const mx = p.x, my = p.y - 16
    this.projectiles.push({
      kind: 'vial', x: mx, y: my, sx: mx, sy: my, tx: t.x, ty: t.y,
      t: 0, dur: 0.55, r: 4, life: 1.4, maxLife: 1.4, color: '#b8f27a', rank,
      dmg: this.spellDmg(3 + 2 * (rank - 1)), vx: 0, vy: 0,
    })
    sfx('lob')
    return true
  }

  castMeteor(rank) {
    const p = this.player
    const t = this.nearestEnemy(p.x, p.y, 560)
    if (!t) return false
    const r = 92 + 6 * rank
    const dmg = this.spellDmg(46 + 16 * (rank - 1))
    this.effects.push({ type: 'telegraph', x: t.x, y: t.y, r, life: 0.95, maxLife: 0.95, color: '#ff9a4d', extra: 'meteor', layer: 'ground' })
    this.strikes.push({ type: 'meteor', x: t.x, y: t.y, r, dmg, delay: 0.95, delayMax: 0.95, rank })
    sfx('lob')
    return true
  }

  castSiphon(rank) {
    const p = this.player
    const t = this.nearestEnemy(p.x, p.y, 500)
    if (!t) return false
    const dmg = this.spellDmg(34 + 14 * (rank - 1))
    const healed = Math.min(this.maxHp - p.hp, dmg * 0.55)
    this.effects.push({ type: 'beam', x1: p.x, y1: p.y - 6, x2: t.x, y2: t.y, color: '#ff7d9e', life: 0.42, maxLife: 0.42, layer: 'top' })
    this.damageEnemy(t, dmg, { color: '#ff9db4' })
    if (healed > 0) {
      p.hp += healed
      this.addText(p.x, p.y - 30, `+${Math.round(healed)}`, '#ffb3c4', 12)
      this.particles.push({ x: t.x, y: t.y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, size: 8, color: '#ff7d9e', glow: true, shape: 'circle', drag: 0.9 })
    }
    this.burst(t.x, t.y, '#ff7d9e', 12, 2.6)
    sfx('siphon')
    return true
  }

  castWard(rank) {
    const p = this.player
    if (p.shield > 1 && p.shieldMax > 0) return false
    p.shieldMax = 24 + 12 * (rank - 1)
    p.shield = p.shieldMax
    this.effects.push({ type: 'ring', x: p.x, y: p.y - 6, r: 44, r0: 10, life: 0.5, maxLife: 0.5, color: '#a8c8ff', width: 2, layer: 'top' })
    this.burst(p.x, p.y - 6, '#a8c8ff', 10, 2)
    sfx('ward')
    return true
  }

  // ── enemies ──────────────────────────────────────────────────────────────
  spawnEnemy(type, x, y, opts = {}) {
    const def = ENEMIES[type]
    const elite = !!opts.elite
    const hpScale = 1 + this.time * 0.032
    const dmgScale = 1 + this.time * 0.008
    const e = {
      type, def, x, y,
      hp: def.hp * hpScale * (elite ? 2.4 : 1),
      maxHp: def.hp * hpScale * (elite ? 2.4 : 1),
      speed: def.speed * (1 + Math.min(0.28, this.time * 0.0012)) * (elite ? 0.92 : 1),
      radius: def.radius * (elite ? 1.18 : 1),
      damage: def.damage * dmgScale * (elite ? 1.35 : 1),
      xp: def.xp * (elite ? 3 : 1),
      score: def.score * (elite ? 3 : 1),
      color: def.color, seed: Math.random(),
      hitCd: 0, flash: 0, slow: 0, atkCd: rand(1.2, 2.6), windup: 0, windupMax: 0,
      chargeCd: rand(2, 4), charging: 0, chargeDir: { x: 0, y: 0 },
      elite, dead: false, wob: rand(0, TAU),
    }
    this.enemies.push(e)
    if (!opts.quiet) {
      this.effects.push({ type: 'spawnRing', x, y, r: 34, life: 0.42, maxLife: 0.42, color: elite ? '#ffb15e' : '#9a6ad6', layer: 'top' })
    }
    return e
  }

  updateEnemies(dt) {
    const p = this.player
    for (const e of this.enemies) {
      if (e.dead) continue
      e.flash = Math.max(0, e.flash - dt)
      e.slow = Math.max(0, e.slow - dt)
      e.hitCd = Math.max(0, e.hitCd - dt)
      if (e.spawnAnim) e.spawnAnim = Math.max(0, e.spawnAnim - dt)
      const dx = p.x - e.x, dy = p.y - e.y
      const d = Math.hypot(dx, dy) || 1
      const nx = dx / d, ny = dy / d
      const slowFactor = e.slow > 0 ? 0.52 : 1

      if (e.isBoss) {
        this.updateBoss(e, dt, nx, ny, d, slowFactor)
      } else if (e.def.ranged) {
        // mournful caster keeps its distance
        let spd = e.speed * slowFactor
        if (d < 200) spd *= -0.7
        else if (d < 300) spd *= 0.1
        const strafe = Math.sin(this.time * 1.4 + e.seed * 7) * 0.6
        e.x += (nx * spd + -ny * spd * strafe) * dt
        e.y += (ny * spd + nx * spd * strafe) * dt
        e.atkCd -= dt
        if (e.atkCd <= 0 && d < 470) {
          e.atkCd = rand(2.3, 3.0)
          const a = Math.atan2(dy, dx)
          this.enemyShot(e.x, e.y, a, 175, 8 * (1 + this.time * 0.004), '#8fd7ff', 6.5)
          sfx('lob')
        }
      } else if (e.def.charger) {
        if (e.charging > 0) {
          e.charging -= dt
          e.x += e.chargeDir.x * 430 * dt
          e.y += e.chargeDir.y * 430 * dt
          e.trailTimer = (e.trailTimer || 0) - dt
          if (e.trailTimer <= 0) {
            e.trailTimer = 0.03
            this.particles.push({ x: e.x, y: e.y, vx: rand(-10, 10), vy: rand(-10, 10), life: 0.3, maxLife: 0.3, size: rand(2, 4), color: '#ff8a5b', glow: true, shape: 'circle', drag: 0.9 })
          }
        } else if (e.windup > 0) {
          e.windup -= dt
          if (e.windup <= 0) {
            e.charging = 0.3
            const a = Math.atan2(p.y - e.y, p.x - e.x)
            e.chargeDir = { x: Math.cos(a), y: Math.sin(a) }
            sfx('dash')
          }
        } else {
          e.x += nx * e.speed * slowFactor * dt
          e.y += ny * e.speed * slowFactor * dt
          e.chargeCd -= dt
          if (e.chargeCd <= 0 && d < 300) {
            e.chargeCd = rand(3, 4.5)
            e.windup = 0.5
            e.windupMax = 0.5
          }
        }
      } else if (e.type === 'skeleton' || e.type === 'hound') {
        if (e.windup > 0) {
          e.windup -= dt
          if (e.windup <= 0) {
            if (d < e.radius + 55) {
              this.effects.push({ type: 'ring', x: e.x, y: e.y, r: 58, r0: 10, life: 0.3, maxLife: 0.3, color: '#ff8a8a', width: 2, flat: true, layer: 'top' })
              this.damagePlayer(e.damage * 1.25, e)
            }
            this.burst(e.x + nx * 20, e.y + ny * 20, '#d8cfb4', 5, 2)
          }
        } else {
          e.x += nx * e.speed * slowFactor * dt
          e.y += ny * e.speed * slowFactor * dt
          if (d < e.radius + 34) {
            e.windup = 0.55
            e.windupMax = 0.55
          }
        }
      } else {
        // slime, bat — simple chase; bats weave
        let vx = nx * e.speed * slowFactor, vy = ny * e.speed * slowFactor
        if (e.type === 'bat') {
          const w = Math.sin(this.time * 4 + e.seed * 8) * 0.55
          const tx = vx - ny * vy * w, ty = vy + nx * vx * w
          vx = tx; vy = ty
        }
        e.x += vx * dt
        e.y += vy * dt
      }

      // soft separation
      e.x = clamp(e.x, 50, WORLD.w - 50)
      e.y = clamp(e.y, 50, WORLD.h - 50)

      // contact
      if (d < e.radius + p.r + (e.charging > 0 ? 4 : 0)) {
        if (e.hitCd <= 0) {
          e.hitCd = e.isBoss ? 0.9 : 0.7
          this.damagePlayer(e.damage * (e.charging > 0 ? 1.3 : 1), e)
          // knock player back
          p.x += nx * 9
          p.y += ny * 9
        }
      }
    }

    // separation pass
    const arr = this.enemies
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i]
      if (a.dead) continue
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j]
        if (b.dead) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const min = a.radius + b.radius
        const d2 = dx * dx + dy * dy
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2)
          const push = ((min - d) / d) * 0.24
          const wa = a.isBoss ? 0.05 : 1, wb = b.isBoss ? 0.05 : 1
          a.x -= dx * push * wa; a.y -= dy * push * wa
          b.x += dx * push * wb; b.y += dy * push * wb
        }
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead)
    if (this.bossRef && this.bossRef.dead) {
      this.bossRef = null
      this.ui.bossWrap.classList.add('hidden')
    }
  }

  enemyShot(x, y, a, speed, dmg, color, r) {
    this.projectiles.push({
      kind: 'enemy', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r, dmg, life: 3.2, maxLife: 3.2, color, pierce: 0,
    })
  }

  updateBoss(e, dt, nx, ny, d, slowFactor) {
    if (e.windup > 0) {
      e.windup -= dt
      if (e.windup <= 0) this.bossSlam(e)
      return
    }
    // slow pursuit
    const spd = e.speed * slowFactor * (e.bossKind === 'king' ? 1.05 : 1)
    e.x += nx * spd * dt
    e.y += ny * spd * dt
    e.atkCd -= dt
    if (e.atkCd > 0) return

    if (e.bossKind === 'warden') {
      e.atkCd = 3.1
      const mode = e.phase++ % 3
      if (mode === 0) {
        const n = 12
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + this.time * 0.3
          this.enemyShot(e.x, e.y, a, 165, e.damage * 0.55, '#a4ff8a', 7)
        }
        this.effects.push({ type: 'ring', x: e.x, y: e.y, r: 50, r0: 5, life: 0.35, maxLife: 0.35, color: '#a4ff8a', width: 2, flat: true, layer: 'top' })
        sfx('nova')
      } else if (mode === 1) {
        this.summonAdds(e, 'slime', 3)
      } else {
        e.windup = 0.85
        e.windupMax = 0.85
        e.slamR = 105
      }
    } else {
      e.atkCd = 2.8
      const mode = e.phase++ % 4
      if (mode === 0) {
        const n = 20
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU
          this.enemyShot(e.x, e.y, a, 155, e.damage * 0.5, '#c79aff', 7)
        }
        sfx('nova')
      } else if (mode === 1) {
        this.summonAdds(e, 'wraith', 2)
      } else if (mode === 2) {
        e.windup = 0.8
        e.windupMax = 0.8
        e.slamR = 125
      } else {
        // blink and blast
        const a = rand(0, TAU)
        const nx2 = clamp(this.player.x + Math.cos(a) * 170, 80, WORLD.w - 80)
        const ny2 = clamp(this.player.y + Math.sin(a) * 170, 80, WORLD.h - 80)
        this.effects.push({ type: 'burst', x: e.x, y: e.y, r: 60, color: '#c79aff', life: 0.5, maxLife: 0.5, layer: 'top' })
        this.burst(e.x, e.y, '#c79aff', 18, 3)
        e.x = nx2; e.y = ny2
        this.effects.push({ type: 'burst', x: e.x, y: e.y, r: 60, color: '#c79aff', life: 0.5, maxLife: 0.5, layer: 'top' })
        this.burst(e.x, e.y, '#f0e0ff', 18, 3)
        sfx('dash')
      }
    }
  }

  bossSlam(e) {
    const r = e.slamR || 100
    const p = this.player
    const d = Math.hypot(p.x - e.x, p.y - e.y)
    this.effects.push({ type: 'ring', x: e.x, y: e.y, r: r + 18, r0: 8, life: 0.55, maxLife: 0.55, color: e.bossKind === 'king' ? '#c79aff' : '#a4ff8a', width: 6, flat: true, layer: 'top' })
    this.burst(e.x, e.y, e.bossKind === 'king' ? '#c79aff' : '#a4ff8a', 24, 4)
    if (d < r + p.r) this.damagePlayer(e.damage * 1.4, e)
    this.shake = Math.max(this.shake, 12)
    // boss lunges toward player on slam
    const a = Math.atan2(p.y - e.y, p.x - e.x)
    e.x += Math.cos(a) * 60
    e.y += Math.sin(a) * 60
    sfx('meteor')
  }

  summonAdds(boss, type, n) {
    if (this.enemies.filter((e) => !e.isBoss).length > 26) return
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU)
      const x = clamp(boss.x + Math.cos(a) * rand(50, 100), 60, WORLD.w - 60)
      const y = clamp(boss.y + Math.sin(a) * rand(50, 100), 60, WORLD.h - 60)
      this.spawnEnemy(type, x, y)
      this.burst(x, y, '#9a6ad6', 6, 2)
    }
  }

  updateSpawner(dt) {
    if (this.spawnGrace > 0) return
    const normalCount = this.enemies.filter((e) => !e.isBoss).length
    const cap = 22 + Math.min(34, this.time * 0.16)
    const target = Math.min(cap, 9 + this.time * 0.26)
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0 && normalCount < target) {
      const batch = this.time > 100 ? 2 : 1
      for (let i = 0; i < batch; i++) {
        const pool = [{ id: 'slime', w: Math.max(2, 10 - this.time * 0.02) }]
        if (this.time > 16) pool.push({ id: 'bat', w: 5 })
        if (this.time > 36) pool.push({ id: 'skeleton', w: 4 })
        if (this.time > 58) pool.push({ id: 'wraith', w: 3.5 })
        if (this.time > 82) pool.push({ id: 'imp', w: 3.5 })
        if (this.time > 106) pool.push({ id: 'hound', w: 4 })
        const type = weightPick(pool).id
        const elite = this.time > 42 && Math.random() < Math.min(0.16, 0.02 + this.time * 0.0006)
        this.spawnRing(type, elite)
      }
      this.spawnTimer = Math.max(0.34, 1.35 - this.time * 0.0055) * rand(0.78, 1.22)
    }
  }

  spawnRing(type, elite = false) {
    const p = this.player
    const base = clamp(Math.max(this.renderer.w, this.renderer.h) / (this.renderer.zoom || 1) * 0.52, 320, 720)
    for (let tries = 0; tries < 16; tries++) {
      const a = rand(0, TAU)
      const d = rand(base * 0.86, base * 1.28)
      const x = clamp(p.x + Math.cos(a) * d, 70, WORLD.w - 70)
      const y = clamp(p.y + Math.sin(a) * d, 70, WORLD.h - 70)
      if (Math.hypot(x - p.x, y - p.y) > 260) {
        this.spawnEnemy(type, x, y, { elite })
        return
      }
    }
    this.spawnEnemy(type, clamp(p.x + base, 70, WORLD.w - 70), p.y, { elite })
  }

  // ── damage & death ───────────────────────────────────────────────────────
  damageEnemy(e, amount, opts = {}) {
    if (e.dead) return
    const crit = Math.random() < 0.08
    let dmg = amount * (crit ? 1.65 : 1)
    dmg = Math.max(1, Math.round(dmg))
    e.hp -= dmg
    e.flash = 0.09
    const col = opts.color || '#ffe1b3'
    this.addText(e.x + rand(-5, 5), e.y - e.radius - 6, `${dmg}`, crit ? '#ffd86e' : col, crit ? 17 : 13, crit)
    if (!opts.silent) {
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: e.x + rand(-e.radius * 0.5, e.radius * 0.5), y: e.y + rand(-e.radius * 0.5, e.radius * 0.5),
          vx: rand(-70, 70), vy: rand(-90, 10), life: rand(0.2, 0.4), maxLife: 0.4,
          size: rand(1, 2.5), color: col, glow: true, shape: 'spark', drag: 0.9,
        })
      }
      sfx('hit')
    }
    if (e.hp <= 0) this.killEnemy(e)
  }

  killEnemy(e) {
    e.dead = true
    this.kills++
    this.score += e.score || 1
    sfx(e.isBoss ? 'bossdown' : 'kill')
    this.burst(e.x, e.y, e.color, e.isBoss ? 50 : 12, e.isBoss ? 5 : 2.6)
    if (e.isBoss) {
      this.shake = 24
      this.effects.push({ type: 'ring', x: e.x, y: e.y, r: 180, r0: 10, life: 1.1, maxLife: 1.1, color: e.color, width: 6, flat: true, layer: 'top' })
      this.burst(e.x, e.y, '#ffe1b3', 30, 4)
      // boss loot
      const gems = 10
      for (let i = 0; i < gems; i++) {
        const a = (i / gems) * TAU + rand(-0.2, 0.2)
        this.pickups.push({ kind: 'big', x: e.x, y: e.y, vx: Math.cos(a) * rand(40, 140), vy: Math.sin(a) * rand(40, 140), v: Math.round(e.xp / gems), life: 60, seed: Math.random(), t: 0 })
      }
      this.pickups.push({ kind: 'heal', x: e.x + 10, y: e.y, vx: 30, vy: -30, life: 60, seed: Math.random(), t: 0 })
      const p = this.player
      p.hp = Math.min(this.maxHp, p.hp + 25)
      this.addText(p.x, p.y - 36, '+25', '#8fffb0', 15)
      if (e.bossKind === 'warden') {
        this.bossKilled.warden = true
        this.bossesSlain++
        this.showBanner('THE WARDEN FALLS')
        this.ui.bossWrap.classList.add('hidden')
        this.bossRef = null
        this.spawnGrace = 3
        this.ui.objective.textContent = 'Prepare for the Hollow King'
      } else if (e.bossKind === 'king') {
        this.bossKilled.king = true
        this.bossesSlain++
        this.ui.bossWrap.classList.add('hidden')
        this.bossRef = null
        this.showBanner('THE HOLLOW KING IS UNMADE')
        this.victoryTimer = 1.6
        this.spawnGrace = 5
        this.enemies.forEach((en) => { if (!en.isBoss) en.dead = true })
      }
      return
    }
    // xp + occasional heal
    this.pickups.push({ kind: e.elite ? 'big' : 'gem', x: e.x, y: e.y, vx: rand(-40, 40), vy: rand(-50, 20), v: e.xp, life: 45, seed: Math.random(), t: 0 })
    if (e.elite) {
      for (let i = 0; i < 2; i++) this.pickups.push({ kind: 'gem', x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), v: 1, life: 45, seed: Math.random(), t: 0 })
    }
    if (Math.random() < 0.055) {
      this.pickups.push({ kind: 'heal', x: e.x, y: e.y, vx: rand(-30, 30), vy: rand(-40, 10), life: 45, seed: Math.random(), t: 0 })
    }
  }

  damagePlayer(amount, source) {
    const p = this.player
    if (this.state !== 'playing' || p.invuln > 0 || p.dashTimer > 0) return
    let dmg = amount
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, dmg)
      p.shield -= absorbed
      dmg -= absorbed
      this.addText(p.x, p.y - 30, `−${Math.round(absorbed)}`, '#a8c8ff', 12)
      this.effects.push({ type: 'ring', x: p.x, y: p.y - 6, r: 34, r0: 16, life: 0.3, maxLife: 0.3, color: '#a8c8ff', width: 2, layer: 'top' })
      if (p.shield <= 0) { p.shield = 0; sfx('ward') }
    }
    if (dmg > 0) {
      p.hp -= dmg
      this.addText(p.x, p.y - 34, `−${Math.round(dmg)}`, '#ff6b7f', 14)
      this.hurtFlash = 1
      p.hurtTimer = 0.4
      sfx('hurt')
    }
    p.invuln = 0.62
    this.shake = Math.max(this.shake, 8)
    this.burst(p.x, p.y - 8, '#ff5d73', 8, 2.2)
    if (p.hp <= 0) this.die()
  }

  die() {
    if (this.state !== 'playing') return
    const p = this.player
    p.hp = 0
    this.state = 'dead'
    this.saveBest()
    this.burst(p.x, p.y - 10, '#c9a6ff', 50, 4)
    this.burst(p.x, p.y - 10, '#ff9a4d', 30, 3)
    this.shake = 22
    sfx('die')
    this.ui.hud.classList.add('hidden')
    this.ui.levelup.classList.add('hidden')
    this.ui.pauseScreen.classList.add('hidden')
    this.showEnd(false)
  }

  updateVictory(dt) {
    if (this.victoryTimer > 0) {
      this.victoryTimer -= dt
      if (this.victoryTimer <= 0) {
        this.state = 'victory'
        this.saveBest()
        sfx('win')
        this.ui.hud.classList.add('hidden')
        this.showEnd(true)
      }
    }
  }

  showEnd(win) {
    const ui = this.ui
    ui.endScreen.classList.remove('hidden')
    ui.endScreen.classList.toggle('win', win)
    this.endInner.classList.toggle('win', win)
    ui.endTitle.textContent = win ? 'Dawn Breaks over Hollow Grove' : 'The Grove Claims You'
    ui.endSigil.textContent = win ? '☀' : '☾'
    ui.endLine.textContent = win
      ? 'The Hollow King is scattered to cinders. Somewhere beyond the briar, a new morning remembers your name.'
      : 'Your embers gutter out beneath the black boughs. The grove keeps what it takes — but magic leaves a thread to follow.'
    ui.endStats.innerHTML = `
      <div><span>Time</span><b>${this.fmtTime(this.time)}</b></div>
      <div><span>Level</span><b>${this.level}</b></div>
      <div><span>Slain</span><b>${this.kills}</b></div>
      <div><span>Bosses</span><b>${this.bossesSlain}</b></div>`
    ui.endSpells.innerHTML = ''
    for (const id of ['ember', ...SPELL_ORDER.filter((id) => this.spells[id])]) {
      const sp = SPELLS[id]
      const d = document.createElement('div')
      d.className = 'es'
      d.style.setProperty('--c', sp.color)
      d.innerHTML = `${sp.icon}<span>${sp.name}</span><b>${ROMAN[this.spells[id]]}</b>`
      ui.endSpells.appendChild(d)
    }
    const b = this.best
    ui.bestLine.textContent = b.time > 0
      ? `Best · ${this.fmtTime(b.time)} survived · ${b.kills} slain · level ${b.level}`
      : 'Your first descent into the grove'
  }

  // ── XP & level up ────────────────────────────────────────────────────────
  addXp(amount) {
    if (this.state !== 'playing') return
    this.xp += amount * this.xpMult
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext
      this.level++
      this.xpNext = this.xpNeeded(this.level)
      this.pendingLevels++
      this.levelBurst()
    }
    if (this.pendingLevels > 0 && this.state === 'playing') this.openLevelUp()
  }

  levelBurst() {
    const p = this.player
    p.hp = Math.min(this.maxHp, p.hp + this.maxHp * 0.12)
    this.effects.push({ type: 'levelup', x: p.x, y: p.y - 8, life: 1.1, maxLife: 1.1, layer: 'top' })
    this.burst(p.x, p.y - 8, '#c9a6ff', 24, 3)
    this.shake = Math.max(this.shake, 4)
    sfx('level')
  }

  openLevelUp() {
    this.state = 'levelup'
    this.cardChoices = this.buildChoices()
    this.ui.newLevel.textContent = this.level
    this.ui.levelup.classList.remove('hidden')
    this.renderCards()
    sfx('level')
  }

  buildChoices() {
    const out = []
    const used = new Set()
    const locked = SPELL_ORDER.filter((id) => !this.spells[id])
    const discovered = Object.keys(this.spells).filter((id) => id !== 'ember')
    const guaranteeNew = locked.length > 0 && (this.level === 2 || (this.level <= 4 && discovered.length < 2) || Math.random() < 0.55)
    if (guaranteeNew) {
      const id = pick(locked)
      out.push(this.spellCard(id, 1, 'new'))
      used.add('s:' + id)
    }

    const candidates = []
    for (const id of Object.keys(this.spells)) {
      if (id === 'ember' && this.spells.ember >= 5) continue
      if (this.spells[id] < SPELLS[id].maxRank) {
        candidates.push({ kind: 'spell', id, w: id === 'ember' ? 2.4 : 2 })
      }
    }
    for (const id of Object.keys(BOONS)) {
      if ((this.boons[id] || 0) < BOONS[id].maxRank) {
        candidates.push({ kind: 'boon', id, w: 1.35 })
      }
    }
    const balls = shuffle(candidates)
    while (out.length < 3 && balls.length) {
      const c = balls.pop()
      const key = (c.kind === 'spell' ? 's:' : 'b:') + c.id
      if (used.has(key)) continue
      used.add(key)
      if (c.kind === 'spell') out.push(this.spellCard(c.id, this.spells[c.id] + 1, 'rank'))
      else out.push(this.boonCard(c.id, (this.boons[c.id] || 0) + 1))
    }
    // extremely late-game filler
    while (out.length < 3) {
      out.push({
        kind: 'filler', id: 'moon', name: "Moon's Favour", tag: 'RESTORATION', color: '#ffe3ae',
        icon: BOONS.vitality.icon, desc: 'Restore all vitality and gain <b>40</b> soul sparks.', rank: 0, maxRank: 0,
      })
    }
    return out
  }

  spellCard(id, rank, kind) {
    const sp = SPELLS[id]
    return {
      kind: kind === 'new' ? 'new' : 'rank', id, rank,
      name: sp.name, tag: kind === 'new' ? 'NEW SPELL' : `RANK ${ROMAN[rank]}`,
      color: sp.color, icon: sp.icon, desc: sp.desc(rank), maxRank: sp.maxRank,
    }
  }

  boonCard(id, rank) {
    const b = BOONS[id]
    return {
      kind: 'boon', id, rank, name: b.name, tag: 'BOON', color: b.color,
      icon: b.icon, desc: b.desc(rank), maxRank: b.maxRank,
    }
  }

  renderCards() {
    const wrap = this.ui.cards
    wrap.innerHTML = ''
    this.cardChoices.forEach((c, i) => {
      const btn = document.createElement('button')
      btn.className = 'card'
      btn.dataset.index = i
      btn.style.setProperty('--card-c', c.color)
      const pips = c.maxRank > 0
        ? `<div class="rank-pips">${Array.from({ length: c.maxRank }, (_, k) => `<i class="${k < c.rank ? 'on' : ''}"></i>`).join('')}</div>`
        : ''
      const tagCls = c.kind === 'new' ? '' : c.kind === 'boon' ? 'boon' : 'upgrade'
      btn.innerHTML = `
        <span class="card-key">${i + 1}</span>
        <span class="card-icon">${c.icon}</span>
        <span class="card-body">
          <span class="card-tag ${tagCls}">${c.tag}</span>
          <span class="card-name">${c.name}</span>
          <span class="card-desc">${c.desc}</span>
          ${pips}
        </span>`
      wrap.appendChild(btn)
    })
  }

  chooseCard(index) {
    if (this.state !== 'levelup') return
    const card = this.cardChoices[index]
    if (!card) return
    const p = this.player
    if (card.kind === 'new') {
      this.spells[card.id] = 1
      this.cds[card.id] = 0.4
      this.buildRail(card.id)
      this.showBanner(`NEW SPELL · ${card.name.toUpperCase()}`)
      this.addText(p.x, p.y - 44, 'NEW SPELL', card.color, 13)
    } else if (card.kind === 'rank') {
      this.spells[card.id] = card.rank
      this.buildRail(card.id)
      this.addText(p.x, p.y - 44, `${card.name} ${ROMAN[card.rank]}`, card.color, 12)
    } else if (card.kind === 'boon') {
      this.boons[card.id] = card.rank
      if (card.id === 'vitality') p.hp = Math.min(this.maxHp, p.hp + 22)
      this.addText(p.x, p.y - 44, card.name, card.color, 12)
    } else {
      p.hp = this.maxHp
      this.addXp(40)
    }
    this.effects.push({ type: 'ring', x: p.x, y: p.y - 6, r: 58, r0: 8, life: 0.55, maxLife: 0.55, color: card.color, width: 3, layer: 'top' })
    this.burst(p.x, p.y - 10, card.color, 18, 2.8)
    this.pendingLevels--
    this.syncHUD(true)
    sfx('card')
    if (this.pendingLevels > 0) {
      this.cardChoices = this.buildChoices()
      this.renderCards()
      sfx('level')
    } else {
      this.ui.levelup.classList.add('hidden')
      this.state = 'playing'
      this.showHint('Spells cast themselves — keep moving', 3.5)
    }
  }

  // ── world objects ────────────────────────────────────────────────────────
  updateZones(dt) {
    for (const z of this.zones) {
      z.life -= dt
      z.tick -= dt
      if (z.tick <= 0) {
        z.tick = z.tickRate
        const dmg = z.type === 'fire' ? z.dmg * 0.8 : z.dmg
        for (const e of this.enemiesIn(z.x, z.y, z.r)) {
          this.damageEnemy(e, dmg, { color: z.type === 'poison' ? '#b8f27a' : z.type === 'fire' ? '#ffab5e' : '#9be6a8', silent: true })
          if (z.slow) e.slow = Math.max(e.slow, 0.7)
        }
        if (Math.random() < 0.3) {
          this.particles.push({
            x: z.x + rand(-z.r * 0.6, z.r * 0.6), y: z.y + rand(-z.r * 0.4, z.r * 0.4),
            vx: rand(-8, 8), vy: rand(-25, -8), life: rand(0.3, 0.7), maxLife: 0.7,
            size: rand(1, 2.2), color: z.type === 'poison' ? '#b8f27a' : z.type === 'fire' ? '#ffab5e' : '#9be6a8',
            glow: true, shape: 'circle', drag: 0.94,
          })
        }
      }
    }
    this.zones = this.zones.filter((z) => z.life > 0)
  }

  updateProjectiles(dt) {
    const p = this.player
    for (const pr of this.projectiles) {
      if (pr.kind === 'vial') {
        pr.t += dt
        const k = Math.min(1, pr.t / pr.dur)
        pr.x = lerp(pr.sx, pr.tx, k)
        pr.y = lerp(pr.sy, pr.ty, k) - Math.sin(k * Math.PI) * 85
        pr.life -= dt
        if (k >= 1) {
          pr.dead = true
          const r = 78 + 8 * pr.rank
          this.zones.push({
            type: 'poison', x: pr.tx, y: pr.ty, r, life: 4, maxLife: 4, tick: 0, tickRate: 0.5,
            dmg: pr.dmg, seed: Math.random(), slow: false,
          })
          this.effects.push({ type: 'ring', x: pr.tx, y: pr.ty, r: r + 6, r0: 6, life: 0.45, maxLife: 0.45, color: '#b8f27a', width: 3, flat: true, layer: 'top' })
          this.burst(pr.tx, pr.ty, '#b8f27a', 16, 3)
          sfx('hit')
        }
        continue
      }
      pr.x += pr.vx * dt
      pr.y += pr.vy * dt
      pr.life -= dt
      if (pr.life <= 0 || pr.x < 0 || pr.y < 0 || pr.x > WORLD.w || pr.y > WORLD.h) { pr.dead = true; continue }

      if (pr.kind === 'enemy') {
        if (Math.hypot(pr.x - p.x, pr.y - p.y) < p.r + pr.r) {
          pr.dead = true
          this.damagePlayer(pr.dmg, pr)
          this.burst(pr.x, pr.y, pr.color, 7, 2)
        }
      } else {
        for (const e of this.enemies) {
          if (e.dead) continue
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.radius + pr.r) {
            if (pr.hit && pr.hit.includes(e)) continue
            this.damageEnemy(e, pr.dmg, { color: pr.color })
            this.burst(pr.x, pr.y, pr.color, 3, 1.6)
            if (pr.pierce > 0) {
              pr.pierce--
              if (!pr.hit) pr.hit = []
              pr.hit.push(e)
            } else { pr.dead = true }
            break
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => !pr.dead)
  }

  updateStrikes(dt) {
    for (const s of this.strikes) {
      s.delay -= dt
      if (s.delay <= 0) {
        s.done = true
        if (s.type === 'meteor') {
          for (const e of this.enemiesIn(s.x, s.y, s.r)) this.damageEnemy(e, s.dmg, { color: '#ffb266' })
          this.zones.push({
            type: 'fire', x: s.x, y: s.y, r: s.r * 0.85, life: 2.6, maxLife: 2.6, tick: 0, tickRate: 0.5,
            dmg: this.spellDmg(5 + 2 * s.rank), seed: Math.random(), slow: false,
          })
          this.effects.push({ type: 'ring', x: s.x, y: s.y, r: s.r + 20, r0: 10, life: 0.7, maxLife: 0.7, color: '#ff9a4d', width: 5, flat: true, layer: 'top' })
          this.effects.push({ type: 'burst', x: s.x, y: s.y, r: s.r, color: '#ff8a3d', life: 0.6, maxLife: 0.6, layer: 'top' })
          this.burst(s.x, s.y, '#ffb266', 30, 4.5)
          this.shake = Math.max(this.shake, 13)
          sfx('meteor')
        }
      }
    }
    this.strikes = this.strikes.filter((s) => !s.done)
  }

  updatePickups(dt) {
    const p = this.player
    for (const g of this.pickups) {
      g.life -= dt
      g.t += dt
      const dx = p.x - g.x, dy = p.y - 8 - g.y
      const d = Math.hypot(dx, dy)
      if (d < this.magnetRadius) {
        const pull = 260 + (this.magnetRadius - d) * 7
        g.vx += (dx / (d || 1)) * pull * dt
        g.vy += (dy / (d || 1)) * pull * dt
        g.vx *= 0.86
        g.vy *= 0.86
      } else {
        g.vx *= 0.9
        g.vy *= 0.9
      }
      g.x += g.vx * dt
      g.y += g.vy * dt
      if (d < 22) {
        g.dead = true
        if (g.kind === 'heal') {
          const heal = Math.min(this.maxHp - p.hp, 24)
          p.hp += heal
          if (heal > 0) this.addText(p.x, p.y - 34, `+${Math.round(heal)}`, '#8fffb0', 13)
          this.burst(g.x, g.y, '#ff8fa3', 8, 2)
          sfx('heal')
        } else {
          this.addXp(g.v)
          sfx('pickup')
          this.particles.push({ x: g.x, y: g.y, vx: 0, vy: -30, life: 0.3, maxLife: 0.3, size: 3, color: '#b8ffd8', glow: true, shape: 'circle', drag: 0.9 })
        }
      }
    }
    this.pickups = this.pickups.filter((g) => !g.dead && g.life > 0)
  }

  updateCamera(dt) {
    const p = this.player
    const r = this.renderer
    const z = r.zoom || 1
    const vw = r.w / z, vh = r.h / z
    const leadX = clamp(p.aim ? Math.cos(p.aim) * 26 : 0, -30, 30)
    const leadY = clamp(p.aim ? Math.sin(p.aim) * 26 : 0, -30, 30)
    let tx = p.x + leadX, ty = p.y + leadY
    if (vw < WORLD.w) tx = clamp(tx, vw / 2, WORLD.w - vw / 2)
    if (vh < WORLD.h) ty = clamp(ty, vh / 2, WORLD.h - vh / 2)
    const k = 1 - Math.pow(0.0015, dt)
    this.camera.x = lerp(this.camera.x, tx, k)
    this.camera.y = lerp(this.camera.y, ty, k)
  }

  // ── particles / text / effects ───────────────────────────────────────────
  burst(x, y, color, n = 10, spread = 2.2) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(20, 130) * spread * 0.6
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
        life: rand(0.25, 0.7), maxLife: 0.7, size: rand(1.2, 3.4),
        color, glow: Math.random() > 0.25, shape: Math.random() > 0.7 ? 'spark' : 'circle', drag: 0.9,
      })
    }
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600)
  }

  stepParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= Math.pow(p.drag || 0.92, dt * 60)
      p.vy *= Math.pow(p.drag || 0.92, dt * 60)
      p.vy += 24 * dt
      if (p.rot !== undefined) p.rot += (p.spin || 0) * dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  stepTexts(dt) {
    for (const t of this.texts) {
      t.life -= dt
      t.y -= dt * 30
    }
    this.texts = this.texts.filter((t) => t.life > 0)
  }

  stepEffects(dt) {
    for (const e of this.effects) e.life -= dt
    this.effects = this.effects.filter((e) => e.life > 0)
  }

  addText(x, y, text, color = '#fff', size = 13, crit = false) {
    this.texts.push({ x, y, text, color, size, crit, life: 0.85 })
    if (this.texts.length > 60) this.texts.shift()
  }

  // ── HUD ──────────────────────────────────────────────────────────────────
  syncHUD(force = false) {
    const p = this.player
    const ui = this.ui
    const pct = clamp(p.hp / p.maxHp, 0, 1)
    ui.hpFill.style.width = `${pct * 100}%`
    ui.hpText.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${Math.round(p.maxHp)}`
    ui.xpFill.style.width = `${clamp(this.xp / this.xpNext, 0, 1) * 100}%`
    ui.lvlBadge.textContent = this.level
    ui.killCount.textContent = this.kills
    ui.clock.textContent = this.fmtTime(this.time)
    if (this.bossRef && !this.bossRef.dead) {
      const b = this.bossRef
      ui.bossWrap.classList.remove('hidden')
      ui.bossFill.style.width = `${clamp(b.hp / b.maxHp, 0, 1) * 100}%`
      ui.bossHpText.textContent = `${Math.ceil(b.hp)} / ${Math.round(b.maxHp)}`
      if (ui.bossTitle.textContent !== b.def.name.toUpperCase()) ui.bossTitle.textContent = b.def.name.toUpperCase()
    } else if (!this.bossSpawned.king || this.bossKilled.king) {
      ui.bossWrap.classList.add('hidden')
    }
    // objective
    let obj
    if (this.bossKilled.king) obj = 'Dawn is yours'
    else if (this.bossRef && this.bossRef.bossKind === 'king') obj = 'Defeat the Hollow King'
    else if (this.bossKilled.warden) obj = this.time < 150 ? 'Grow strong for the Hollow King' : 'The Hollow King is coming'
    else if (this.bossRef) obj = 'Slay the Briar Warden'
    else if (this.time < 58) obj = 'Survive the grove · grow your craft'
    else obj = 'Slay the Briar Warden'
    if (ui.objective.textContent !== obj) ui.objective.textContent = obj
    // dash
    const dashPct = p.dashCd > 0 ? (1 - p.dashCd / 1.5) * 100 : 100
    ui.dashCd.style.setProperty('--p', `${dashPct}%`)
    ui.dashBtn.classList.toggle('cooling', p.dashCd > 0)
  }

  updateCooldownUI() {
    if (this.state === 'title') return
    for (const id of Object.keys(this.chipEls)) {
      const chip = this.chipEls[id]
      if (!chip || !chip.cd) continue
      let frac = 0
      if (id === 'ember') {
        const p = this.player
        frac = p.attackCd > 0 ? clamp(p.attackTimer / p.attackCd, 0, 1) : 0
      } else {
        const cdTotal = this.spellCooldown(id, this.spells[id]) / this.castSpeed
        frac = clamp((this.cds[id] || 0) / cdTotal, 0, 1)
      }
      if (frac > 0.01) {
        chip.cd.style.opacity = '1'
        chip.cd.style.transform = `scaleY(${frac})`
      } else if (chip.cd.style.opacity !== '0') {
        chip.cd.style.opacity = '0'
      }
      if (chip.rank !== this.spells[id]) {
        this.buildRail()
        break
      }
    }
    // dash cool visual each frame
    if (this.state === 'playing' || this.state === 'paused') {
      const p = this.player
      const dashPct = p.dashCd > 0 ? (1 - p.dashCd / 1.5) * 100 : 100
      this.ui.dashCd.style.setProperty('--p', `${dashPct}%`)
      this.ui.dashBtn.classList.toggle('cooling', p.dashCd > 0)
    }
  }

  frameUI() {
    // hook for future per-frame HUD; cooldown already updated
  }
}
