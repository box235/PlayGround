// ── Emberwitch input: twin virtual sticks, mouse + keyboard ────────────────
const STICK_RADIUS = 54
const DEAD = 0.14

export class Input {
  constructor(canvas) {
    this.canvas = canvas
    this.keys = new Set()
    this.moveStick = { id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, mag: 0, active: false }
    this.aimStick = { id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, mag: 0, active: false }
    this.mouse = { x: 0, y: 0, down: false, active: false, inside: false }
    this.dashQueued = false
    this.usedTouch = false
    this.firstMove = false
    this.onDashButton = null

    canvas.addEventListener('pointerdown', (e) => this.onDown(e))
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: false })
    window.addEventListener('pointerup', (e) => this.onUp(e))
    window.addEventListener('pointercancel', (e) => this.onUp(e))
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => this.reset())
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset() })
  }

  onDown(e) {
    if (e.target !== this.canvas) return
    e.preventDefault()
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight
    const x = e.clientX, y = e.clientY
    this.mouse.inside = true

    if (e.pointerType === 'mouse') {
      this.mouse.x = x; this.mouse.y = y
      if (e.button === 0) this.mouse.down = true
      if (e.button === 2) this.queueDash()
      return
    }
    this.usedTouch = true
    if (y < h * 0.22 && x > w * 0.55) return // top-right HUD area
    const isMove = x < w * 0.5
    const stick = isMove ? this.moveStick : this.aimStick
    if (stick.id !== null) return
    stick.id = e.pointerId
    stick.ox = x; stick.oy = y
    stick.x = x; stick.y = y
    stick.dx = 0; stick.dy = 0; stick.mag = 0; stick.active = true
    if (isMove) this.firstMove = true
  }

  onMove(e) {
    if (e.pointerType === 'mouse') {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
      this.mouse.inside = true
      return
    }
    if (e.pointerId === this.moveStick.id) this.updateStick(this.moveStick, e.clientX, e.clientY)
    else if (e.pointerId === this.aimStick.id) this.updateStick(this.aimStick, e.clientX, e.clientY)
  }

  updateStick(stick, x, y) {
    let dx = x - stick.ox, dy = y - stick.oy
    const d = Math.hypot(dx, dy)
    if (d > STICK_RADIUS) {
      // drag the base along so the stick never gets stuck at its edge
      stick.ox += dx * (1 - STICK_RADIUS / d)
      stick.oy += dy * (1 - STICK_RADIUS / d)
      dx = x - stick.ox; dy = y - stick.oy
    }
    const mag = Math.min(1, Math.hypot(dx, dy) / (STICK_RADIUS * 0.82))
    stick.x = x; stick.y = y
    stick.dx = dx; stick.dy = dy; stick.mag = mag
  }

  onUp(e) {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) this.mouse.down = false
      return
    }
    if (e.pointerId === this.moveStick.id) this.clearStick(this.moveStick)
    else if (e.pointerId === this.aimStick.id) this.clearStick(this.aimStick)
  }

  clearStick(s) {
    s.id = null; s.active = false; s.mag = 0; s.dx = 0; s.dy = 0
  }

  onKeyDown(e) {
    const k = e.code
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault()
    if (e.repeat) return
    this.keys.add(k)
    if (k === 'Space' || k === 'ShiftLeft' || k === 'ShiftRight') this.queueDash()
  }

  queueDash() { this.dashQueued = true }
  consumeDash() { const v = this.dashQueued; this.dashQueued = false; return v }

  reset() {
    this.keys.clear()
    this.mouse.down = false
    this.clearStick(this.moveStick)
    this.clearStick(this.aimStick)
  }

  get moveVec() {
    let x = 0, y = 0
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1
    if (x || y) {
      const d = Math.hypot(x, y)
      return { x: x / d, y: y / d, mag: 1 }
    }
    const s = this.moveStick
    if (s.active && s.mag > DEAD) {
      const d = Math.hypot(s.dx, s.dy) || 1
      const m = Math.min(1, (s.mag - DEAD) / (1 - DEAD))
      return { x: s.dx / d, y: s.dy / d, mag: m }
    }
    return { x: 0, y: 0, mag: 0 }
  }

  get aimVec() {
    const s = this.aimStick
    if (s.active && s.mag > DEAD) {
      const d = Math.hypot(s.dx, s.dy) || 1
      const m = Math.min(1, (s.mag - DEAD) / (1 - DEAD))
      return { x: s.dx / d, y: s.dy / d, mag: m, active: true }
    }
    return { x: 0, y: 0, mag: 0, active: false }
  }

  get firingMouse() { return this.mouse.down }
}
