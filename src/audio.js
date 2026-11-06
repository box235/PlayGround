// ── Emberwitch audio: tiny WebAudio synth, no external assets ──────────────
let ctx = null
let master = null
let ambient = null
let muted = false
let noiseBuf = null
const last = new Map()

function makeNoise(ac) {
  const len = ac.sampleRate * 1.4
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  let v = 0
  for (let i = 0; i < len; i++) {
    v = v * 0.94 + (Math.random() * 2 - 1) * 0.06
    data[i] = v * 3.2
  }
  return buf
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : 0.5
  master.connect(ctx.destination)
  noiseBuf = makeNoise(ctx)
}

export function setMuted(v) {
  muted = v
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.08)
  try { localStorage.setItem('emberwitch.muted', v ? '1' : '0') } catch {}
}
export function isMuted() { return muted }
export function loadMuted() {
  try { muted = localStorage.getItem('emberwitch.muted') === '1' } catch {}
  return muted
}

function tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.15, vol = 0.1, delay = 0, filter = 0 }) {
  if (!ctx || muted) return
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(Math.max(20, f0), t)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node = o
  if (filter) {
    const bq = ctx.createBiquadFilter()
    bq.type = 'lowpass'
    bq.frequency.value = filter
    node.connect(bq); node = bq
  }
  node.connect(g)
  g.connect(master)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise({ dur = 0.2, vol = 0.08, freq = 900, q = 0.8, type = 'bandpass', delay = 0, sweep = 0 }) {
  if (!ctx || muted || !noiseBuf) return
  const t = ctx.currentTime + delay
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  const bq = ctx.createBiquadFilter()
  bq.type = type
  bq.frequency.setValueAtTime(freq, t)
  if (sweep) bq.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t + dur)
  bq.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(bq); bq.connect(g); g.connect(master)
  s.start(t)
  s.stop(t + dur + 0.05)
}

function gate(name, ms) {
  const now = performance.now()
  if ((last.get(name) || 0) + ms > now) return false
  last.set(name, now)
  return true
}

export function sfx(name) {
  if (!ctx || muted) return
  switch (name) {
    case 'shoot':
      if (!gate('shoot', 70)) return
      tone({ type: 'triangle', f0: 680, f1: 250, dur: 0.11, vol: 0.055 })
      noise({ dur: 0.06, vol: 0.018, freq: 2200 })
      break
    case 'hit':
      if (!gate('hit', 45)) return
      noise({ dur: 0.07, vol: 0.035, freq: 1400, q: 1.2 })
      break
    case 'kill':
      if (!gate('kill', 60)) return
      tone({ type: 'square', f0: 190, f1: 58, dur: 0.16, vol: 0.05, filter: 900 })
      noise({ dur: 0.12, vol: 0.03, freq: 500, sweep: 160 })
      break
    case 'hurt':
      tone({ type: 'sawtooth', f0: 210, f1: 72, dur: 0.3, vol: 0.11, filter: 900 })
      noise({ dur: 0.2, vol: 0.05, freq: 320, sweep: 120 })
      break
    case 'dash':
      noise({ dur: 0.24, vol: 0.06, freq: 320, sweep: 1900, q: 0.6 })
      break
    case 'pickup':
      if (!gate('pickup', 40)) return
      tone({ type: 'sine', f0: 940, f1: 1420, dur: 0.08, vol: 0.03 })
      break
    case 'heal':
      tone({ type: 'sine', f0: 520, f1: 780, dur: 0.2, vol: 0.05 })
      tone({ type: 'sine', f0: 780, f1: 1040, dur: 0.22, vol: 0.035, delay: 0.09 })
      break
    case 'level':
      [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'sine', f0: f, f1: f * 1.005, dur: 0.5, vol: 0.075, delay: i * 0.09 }))
      noise({ dur: 0.5, vol: 0.02, freq: 2800, sweep: 5200 })
      break
    case 'card':
      tone({ type: 'triangle', f0: 720, f1: 990, dur: 0.1, vol: 0.05 })
      break
    case 'nova':
      noise({ dur: 0.5, vol: 0.07, freq: 4200, sweep: 500, q: 1.4 })
      tone({ type: 'sine', f0: 1200, f1: 220, dur: 0.4, vol: 0.04 })
      break
    case 'chain':
      noise({ dur: 0.18, vol: 0.05, freq: 3600, sweep: 1200, q: 2 })
      tone({ type: 'square', f0: 1400, f1: 260, dur: 0.14, vol: 0.028 })
      break
    case 'meteor':
      tone({ type: 'sawtooth', f0: 120, f1: 34, dur: 0.8, vol: 0.1, filter: 500 })
      noise({ dur: 0.7, vol: 0.09, freq: 380, sweep: 90, q: 0.5 })
      break
    case 'lob':
      tone({ type: 'sine', f0: 210, f1: 520, dur: 0.22, vol: 0.04 })
      break
    case 'siphon':
      tone({ type: 'sawtooth', f0: 160, f1: 520, dur: 0.5, vol: 0.04, filter: 1200 })
      break
    case 'ward':
      tone({ type: 'sine', f0: 340, f1: 680, dur: 0.35, vol: 0.05 })
      tone({ type: 'sine', f0: 680, f1: 1020, dur: 0.3, vol: 0.03, delay: 0.05 })
      break
    case 'boss':
      tone({ type: 'sawtooth', f0: 74, f1: 42, dur: 1.6, vol: 0.13, filter: 320 })
      tone({ type: 'sawtooth', f0: 112, f1: 62, dur: 1.4, vol: 0.06, filter: 500, delay: 0.1 })
      noise({ dur: 1.2, vol: 0.04, freq: 180, sweep: 90 })
      break
    case 'bossdown':
      tone({ type: 'sawtooth', f0: 160, f1: 30, dur: 1.8, vol: 0.14, filter: 700 })
      noise({ dur: 1.5, vol: 0.08, freq: 900, sweep: 80 })
      break
    case 'win':
      [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone({ type: 'sine', f0: f, f1: f, dur: 0.8, vol: 0.07, delay: i * 0.13 }))
      break
    case 'die':
      [330, 262, 196, 147].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 0.98, dur: 0.7, vol: 0.08, delay: i * 0.16 }))
      break
    case 'click':
      tone({ type: 'sine', f0: 620, f1: 880, dur: 0.06, vol: 0.04 })
      break
    default:
      break
  }
}

// slow, breathing ambient bed
export function startAmbient() {
  if (!ctx || ambient) return
  const g = ctx.createGain()
  g.gain.value = 0.0001
  g.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 3)
  g.connect(master)
  const rev = ctx.createConvolver()
  // simple generated impulse for space
  const len = ctx.sampleRate * 2.2
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
  }
  rev.buffer = ir
  const wet = ctx.createGain(); wet.gain.value = 0.5
  g.connect(rev); rev.connect(wet); wet.connect(master)

  const drone = []
  ;[55, 82.5, 110, 164.8].forEach((f, i) => {
    const o = ctx.createOscillator()
    o.type = i % 2 ? 'triangle' : 'sine'
    o.frequency.value = f
    o.detune.value = (i - 1.5) * 7
    const og = ctx.createGain()
    og.gain.value = i === 0 ? 0.5 : 0.11
    o.connect(og); og.connect(g)
    o.start()
    drone.push(o)
  })
  // slow filter sweep on wind
  const wind = ctx.createBufferSource()
  wind.buffer = noiseBuf
  wind.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.5
  const wg = ctx.createGain(); wg.gain.value = 0.18
  wind.connect(lp); lp.connect(wg); wg.connect(g)
  wind.start()
  const lfo = ctx.createOscillator()
  const lfoG = ctx.createGain(); lfoG.gain.value = 160
  lfo.frequency.value = 0.055
  lfo.connect(lfoG); lfoG.connect(lp.frequency)
  lfo.start()

  ambient = { g, drone, wind, lfo }
}

export function stopAmbient() {
  if (!ambient || !ctx) return
  const a = ambient
  ambient = null
  try {
    a.g.gain.cancelScheduledValues(ctx.currentTime)
    a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4)
    setTimeout(() => {
      try { a.drone.forEach((o) => o.stop()); a.wind.stop(); a.lfo.stop() } catch {}
    }, 1400)
  } catch {}
}
