// ── Emberwitch bootstrap ───────────────────────────────────────────────────
import { Renderer } from './render.js'
import { Input } from './input.js'
import { Game } from './game.js'
import { initAudio, startAmbient, setMuted, loadMuted } from './audio.js'

const canvas = document.getElementById('game')
const renderer = new Renderer(canvas)
const input = new Input(canvas)
const game = new Game(canvas, input, renderer)

const muted = loadMuted()
setMuted(muted)
game.muted = muted
game.ui.muteBtn.classList.toggle('muted', muted)

// audio needs a gesture; the start/restart buttons are inside overlays
for (const id of ['startBtn', 'retryBtn', 'resumeBtn']) {
  document.getElementById(id)?.addEventListener('click', () => {
    initAudio()
    startAmbient()
  })
}
game.ui.muteBtn.addEventListener('click', () => {
  if (!game.muted) { initAudio(); startAmbient() }
})

let resizeTimer = 0
function onResize() {
  renderer.resize()
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => renderer.resize(), 120)
}
window.addEventListener('resize', onResize)
window.addEventListener('orientationchange', onResize)
if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas)

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.togglePause(true)
})

// expose for debugging / automated captures
window.__emberwitch = { game, renderer, input }

let last = performance.now()
let fpsFrames = 0
let fpsAt = last
function frame(now) {
  const dt = Math.min(0.05, Math.max(0.0001, (now - last) / 1000))
  last = now
  game.update(dt)
  renderer.draw(game, input, now / 1000, dt)
  game.frameUI()
  fpsFrames++
  if (now - fpsAt > 1000) {
    game.fps = Math.round((fpsFrames * 1000) / (now - fpsAt))
    fpsFrames = 0
    fpsAt = now
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// prevent pinch / pull-to-refresh on iOS while keeping buttons responsive
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault()
}, { passive: false })
