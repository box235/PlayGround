// ── Emberwitch content: spells, boons, bestiary ────────────────────────────
const svg = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`

export const ICONS = {
  ember: svg(`<path d="M12 2.6c1.4 3.2 4.6 4.9 4.6 8.7A4.6 4.6 0 0 1 12 16a4.6 4.6 0 0 1-4.6-4.7c0-3.8 3.2-5.5 4.6-8.7Z"/>
    <path d="M12 11.8c1 1.1 1.7 1.9 1.7 3a1.7 1.7 0 1 1-3.4 0c0-1.1.7-1.9 1.7-3Z" fill="currentColor" stroke="none"/>
    <path d="M8.5 18.6h7M6.5 21.2h11" opacity=".45"/>`),
  frost: svg(`<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8"/>
    <path d="m9.5 4 2.5 2 2.5-2M9.5 20l2.5-2 2.5 2M4.5 10.6l3.1.7.7-3.1M19.5 13.4l-3.1-.7-.7 3.1"/>`),
  chain: svg(`<path d="M13.5 2 5 13.4h5.2L9.7 22l8.6-11.6h-5.3z" fill="currentColor" fill-opacity=".16"/>`),
  familiar: svg(`<path d="M8.2 9.2 6.4 4.2l4.2 1.9a8.4 8.4 0 0 1 2.8 0l4.2-1.9-1.8 5a6.4 6.4 0 0 1 1.6 4.4c0 4-2.6 6.6-5.4 6.6s-5.4-2.6-5.4-6.6a6.4 6.4 0 0 1 1.6-4.4Z"/>
    <circle cx="9.8" cy="12.6" r=".9" fill="currentColor" stroke="none"/><circle cx="14.2" cy="12.6" r=".9" fill="currentColor" stroke="none"/>
    <path d="M12 15.2v1.4" opacity=".6"/>`),
  bramble: svg(`<path d="M12 21c-5.5 0-8-3.8-8-7.4C4 8.5 8 5.6 12 3c4 2.6 8 5.5 8 10.6C20 17.2 17.5 21 12 21Z" opacity=".5"/>
    <path d="M12 20V8M12 12.5l-3.6-2.4M12 15.6l3.8-2.5M12 9.6 8.8 7.3M12 18l-2.4 2M12 10.5l3.2-2"/>
    <path d="m8.4 10.1-2.2-.7M15.8 13.1l2.3.6M8.8 7.3 7 5.8M12 18l1.9 2.4"/>`),
  hex: svg(`<path d="M9.6 2.8h4.8M11 2.8v4.4l-4.6 8.2A2.2 2.2 0 0 0 8.3 19h7.4a2.2 2.2 0 0 0 1.9-3.6L13 7.2V2.8"/>
    <path d="M8.9 14.4h6.2" opacity=".6"/><circle cx="10.8" cy="17" r=".8" fill="currentColor" stroke="none"/><circle cx="13.8" cy="16.6" r=".55" fill="currentColor" stroke="none"/>`),
  meteor: svg(`<path d="M20.8 3.2 11.4 10M18.6 1.4l-7 4.1M22.6 5.4l-7.8 3.8" opacity=".55"/>
    <circle cx="10" cy="14" r="5.8"/><path d="M7.9 12.2a3.2 3.2 0 0 1 3.9-1.4" opacity=".7"/>`),
  siphon: svg(`<path d="M12 3s5 5.6 5 9.4a5 5 0 0 1-10 0C7 8.6 12 3 12 3Z"/><path d="M9.7 13.1a2.6 2.6 0 0 0 2.4 2.4" opacity=".7"/>`),
  ward: svg(`<path d="M12 2.8 4.5 6v6.2c0 4.4 3.1 7.4 7.5 9 4.4-1.6 7.5-4.6 7.5-9V6L12 2.8Z"/>
    <path d="m8.9 11.9 2.2 2.2 4-4.4"/>`),
  heart: svg(`<path d="M12 20s-7.4-4.5-7.4-10A4.2 4.2 0 0 1 12 7.2 4.2 4.2 0 0 1 19.4 10c0 5.5-7.4 10-7.4 10Z"/>`),
  swift: svg(`<path d="M3 8.5h8.5M2.4 12h6.8M4 15.5h5.2"/><path d="m14.5 5 5.5 7-5.5 7M20 12h-3.8"/>`),
  focus: svg(`<path d="M7 2.8h10M7 21.2h10M7.6 2.8v3.4l4.4 5.8 4.4-5.8V2.8M7.6 21.2v-3.4L12 12l4.4 5.8v3.4"/><path d="M10 18.2h4" opacity=".6"/>`),
  might: svg(`<path d="M6.5 9.5V6.2a1.5 1.5 0 0 1 3 0v2.6-4a1.5 1.5 0 0 1 3 0v4-3.2a1.5 1.5 0 0 1 3 0v4.3"/>
    <path d="M15.5 9.6a1.5 1.5 0 0 1 3 0v4.1c0 4-2.9 7.3-6.5 7.3S5.5 18 5.5 13.7v-2.1a1.5 1.5 0 0 1 3 0"/>`),
  magnet: svg(`<path d="M5 4v7.5a7 7 0 0 0 14 0V4h-4v7.5a3 3 0 0 1-6 0V4H5Z"/><path d="M5 7.5h4M15 7.5h4"/>`),
  leaf: svg(`<path d="M20 4C11 4 5 8 5 14.5A5.5 5.5 0 0 0 10.5 20C17 20 20 13 20 4Z"/><path d="M4.5 21c1.5-5 5-8.5 10-11" opacity=".65"/>`),
  clover: svg(`<path d="M12 12c-3.4-1.2-5.4-2.6-5.4-5A3.2 3.2 0 0 1 12 5.1a3.2 3.2 0 0 1 5.4 1.9c0 2.4-2 3.8-5.4 5Zm0 0c1.2-3.4 2.6-5.4 5-5.4M12 12c1.2 3.4 2.6 5.4 5 5.4a3.2 3.2 0 0 0 1.9-5.4M12 12c-1.2 3.4-2.6 5.4-5 5.4a3.2 3.2 0 0 1-1.9-5.4"/><path d="M12 12c-1.7 2-2.4 4-2.4 8" opacity=".75"/>`),
  skull: svg(`<path d="M12 2.8a7.4 7.4 0 0 0-7.4 7.4c0 2.7 1.3 4.3 2.5 5.4v2.6c0 .8.6 1.4 1.4 1.4h7c.8 0 1.4-.6 1.4-1.4v-2.6c1.2-1.1 2.5-2.7 2.5-5.4A7.4 7.4 0 0 0 12 2.8Z"/>
    <circle cx="9.2" cy="10.2" r="1.5" fill="currentColor" stroke="none"/><circle cx="14.8" cy="10.2" r="1.5" fill="currentColor" stroke="none"/><path d="M10.5 16.6v3M13.5 16.6v3"/>`),
  crown: svg(`<path d="m3 7 3.8 3L12 4l5.2 6L21 7l-2 11H5L3 7Z"/><path d="M5.8 14.5h12.4" opacity=".6"/>`),
}

const R = (n) => Math.min(5, n)

export const SPELLS = {
  ember: {
    id: 'ember', name: 'Emberbolt', maxRank: 5, color: '#ff9a4d', icon: ICONS.ember,
    flavor: 'A cantrip of living flame.',
    desc: (r) => `Auto-fires a seeking mote of fire at the nearest beast. Damage <b>${10 + 4 * (r - 1)}</b>${r >= 3 ? ', <b>+1 bolt</b>' : ''}${r >= 5 ? ', <b>+1 bolt</b>' : ''}.`,
  },
  frost: {
    id: 'frost', name: 'Frost Nova', maxRank: 5, color: '#8fe1ff', icon: ICONS.frost,
    flavor: 'Winter answers the witch.',
    desc: (r) => `Every <b>${(3.6 - 0.2 * (r - 1)).toFixed(1)}s</b>, a ring of rime bursts outward. <b>${9 + 5 * (r - 1)}</b> damage and <b>45%</b> slow for 2s.`,
  },
  chain: {
    id: 'chain', name: 'Chain Lightning', maxRank: 5, color: '#b9a3ff', icon: ICONS.chain,
    flavor: 'The storm remembers every name.',
    desc: (r) => `Every <b>${(4.4 - 0.25 * (r - 1)).toFixed(1)}s</b>, lightning leaps between <b>${2 + r}</b> foes for <b>${13 + 5 * (r - 1)}</b> damage.`,
  },
  familiar: {
    id: 'familiar', name: 'Grim Familiar', maxRank: 5, color: '#c9a6ff', icon: ICONS.familiar,
    flavor: 'It remembers being a cat.',
    desc: (r) => `A spectral familiar orbits you, rending nearby foes for <b>${6 + 3 * (r - 1)}</b> damage${r >= 4 ? '. <b>Summons a second familiar</b>' : ''}.`,
  },
  bramble: {
    id: 'bramble', name: 'Bramble Hex', maxRank: 5, color: '#9be6a8', icon: ICONS.bramble,
    flavor: 'The grove has teeth.',
    desc: (r) => `Every <b>5.2s</b>, thorned roots erupt under a foe, slowing and dealing <b>${4 + 2 * (r - 1)}</b> damage per half-second for 4s.`,
  },
  hex: {
    id: 'hex', name: 'Withering Vial', maxRank: 5, color: '#b8f27a', icon: ICONS.hex,
    flavor: 'Bottled spite. Shake before throwing.',
    desc: (r) => `Every <b>5.6s</b>, lob a vial that shatters into a <b>4s</b> poison cloud, dealing <b>${3 + 2 * (r - 1)}</b> damage per half-second.`,
  },
  meteor: {
    id: 'meteor', name: 'Starfall', maxRank: 5, color: '#ffb266', icon: ICONS.meteor,
    flavor: 'A small, personal apocalypse.',
    desc: (r) => `Every <b>8.5s</b>, call down a falling star. <b>${46 + 16 * (r - 1)}</b> damage in a wide blast, leaving fire behind.`,
  },
  siphon: {
    id: 'siphon', name: 'Sanguine Siphon', maxRank: 5, color: '#ff7d9e', icon: ICONS.siphon,
    flavor: 'Give me your warmth.',
    desc: (r) => `Every <b>6.4s</b>, drain the nearest foe for <b>${34 + 14 * (r - 1)}</b> damage, healing for <b>55%</b> of it.`,
  },
  ward: {
    id: 'ward', name: 'Moon Ward', maxRank: 5, color: '#a8c8ff', icon: ICONS.ward,
    flavor: 'A held breath. A silver shell.',
    desc: (r) => `Every <b>9s</b>, a ward absorbs <b>${24 + 12 * (r - 1)}</b> incoming damage before shattering.`,
  },
}

export const BOONS = {
  vitality: {
    id: 'vitality', name: 'Witchblood', maxRank: 5, color: '#ff8f9f', icon: ICONS.heart,
    desc: (r) => `<b>+22</b> max vitality (now <b>${100 + 22 * r}</b>) and mend <b>22</b> health.`,
  },
  swift: {
    id: 'swift', name: 'Nightstep', maxRank: 5, color: '#8fe1c2', icon: ICONS.swift,
    desc: (r) => `Move <b>+7%</b> faster (now <b>+${7 * r}%</b>). Dance between claws.`,
  },
  focus: {
    id: 'focus', name: 'Quickened Craft', maxRank: 5, color: '#8fd4ff', icon: ICONS.focus,
    desc: (r) => `All spells cast <b>+10%</b> more often (now <b>+${10 * r}%</b>).`,
  },
  might: {
    id: 'might', name: 'Hexcraft', maxRank: 5, color: '#ffb066', icon: ICONS.might,
    desc: (r) => `All spell damage <b>+12%</b> (now <b>+${12 * r}%</b>).`,
  },
  magnet: {
    id: 'magnet', name: 'Grave Hunger', maxRank: 5, color: '#b8f27a', icon: ICONS.magnet,
    desc: (r) => `Gather soul sparks from <b>+55</b> farther away (now <b>+${55 * r}</b>).`,
  },
  regen: {
    id: 'regen', name: 'Moonmilk', maxRank: 5, color: '#9be6a8', icon: ICONS.leaf,
    desc: (r) => `Mend <b>+0.4</b> health per second (now <b>+${(0.4 * r).toFixed(1)}/s</b>).`,
  },
  fortune: {
    id: 'fortune', name: 'Fated Thread', maxRank: 5, color: '#ffe27a', icon: ICONS.clover,
    desc: (r) => `Soul sparks grant <b>+12%</b> more experience (now <b>+${12 * r}%</b>).`,
  },
}

// rank display numerals
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

export const ENEMIES = {
  slime: {
    name: 'Bog Slime', hp: 17, speed: 40, radius: 15, damage: 7, xp: 1, color: '#74d483',
    score: 1, wobble: 0.9,
  },
  bat: {
    name: 'Dusk Bat', hp: 11, speed: 96, radius: 11, damage: 5, xp: 1, color: '#b06fe0',
    score: 1, wobble: 1.6, flying: true,
  },
  skeleton: {
    name: 'Bone Picker', hp: 44, speed: 50, radius: 15, damage: 11, xp: 3, color: '#e3d8bc',
    score: 2,
  },
  wraith: {
    name: 'Mourner', hp: 30, speed: 56, radius: 14, damage: 8, xp: 3, color: '#8fd7ff',
    score: 2, ranged: true, flying: true,
  },
  imp: {
    name: 'Cinder Imp', hp: 36, speed: 118, radius: 13, damage: 10, xp: 3, color: '#ff8a5b',
    score: 2, charger: true,
  },
  hound: {
    name: 'Briar Hound', hp: 58, speed: 86, radius: 16, damage: 13, xp: 4, color: '#b7e07a',
    score: 3,
  },
}

export const BOSSES = {
  warden: {
    name: 'The Briar Warden', hp: 900, speed: 38, radius: 38, damage: 18, xp: 70,
    color: '#9fe08a', score: 60,
  },
  king: {
    name: 'The Hollow King', hp: 2600, speed: 34, radius: 50, damage: 24, xp: 200,
    color: '#c79aff', score: 200,
  },
}

export const SPELL_ORDER = ['frost', 'familiar', 'chain', 'bramble', 'siphon', 'hex', 'ward', 'meteor']
