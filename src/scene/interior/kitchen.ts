import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, TubeGeometry, Vector3 } from 'three'
import { boxesToGeometry, type Box } from '../geometry'
import { CEILING, FT, toX, toZ, unitById } from '../plan'
import { add, cavity, drawer, frame, lbox, shutter, type Built, type Frame, type Moving, type Parts } from './kit'

// Kitchen, flat 04 on /dmr: handleless cream cabinets on three walls under a verde marble counter and a green
// stacked-tile backsplash. Hob and chimney on the east wall, a black sink under the south window, a fridge
// recess and tall unit with an open niche on the north wall, and a teak slatted screen in the opening.

const unit = unitById('04')
const H = CEILING - 0.001
const SOFFIT = 7 * FT
const EX = toX(unit.X(816))
const NZ = toZ(unit.Y(404))
const SZ = toZ(unit.Y(634))
const KX0 = toX(unit.X(645)) + 0.015
const BX0 = toX(unit.X(626))
const BX1 = toX(unit.X(645))

const LE = SZ - NZ
const LN = EX - KX0
/** South run stops short of the utility door. */
const LS = EX - toX(unit.X(705))
const WIN = [EX - toX(unit.X(780)), EX - toX(unit.X(716))] as const

/** Base: plinth, carcass, counter. Uppers start at `UY`, `UD` deep. */
const PLINTH = 0.1
const TOP = 0.86
const COUNTER = 0.9
const D = 0.58
const UY = 1.55
const UD = 0.35
const G = 0.003

interface Run {
  f: Frame
  parts: { cab: Box[]; reveal: Box[]; verde: Box[]; gtile: Box[]; bezel: Box[]; disc: Box[] }
  moving: Moving[]
}

/** Two shutters over `[s0, s1]`, hinged on their outer edges, with a shelved carcass behind. */
function pair(r: Run, s0: number, s1: number, y0: number, y1: number, d: number) {
  const m = (s0 + s1) / 2
  r.parts.cab.push(...cavity(s0, s1, y0, y1, d - 0.02))
  r.moving.push(
    shutter(r.f, [lbox(s0 + G, m - G / 2, y0 + G, y1 - G, d - 0.02, d)], s0 + G, d, 'left', 'cab'),
    shutter(r.f, [lbox(m + G / 2, s1 - G, y0 + G, y1 - G, d - 0.02, d)], s1 - G, d, 'right', 'cab'),
  )
}

function single(r: Run, s0: number, s1: number, y0: number, y1: number, d: number, side: 'left' | 'right') {
  r.parts.cab.push(...cavity(s0, s1, y0, y1, d - 0.02))
  const hinge = side === 'left' ? s0 + G : s1 - G
  r.moving.push(shutter(r.f, [lbox(s0 + G, s1 - G, y0 + G, y1 - G, d - 0.02, d)], hinge, d, side, 'cab'))
}

function drawers(r: Run, s0: number, s1: number, n: number) {
  const h = (TOP - PLINTH) / n
  r.parts.cab.push(lbox(s0, s1, PLINTH, TOP, 0, 0.12))
  r.parts.reveal.push(lbox(s0, s0 + 0.012, PLINTH, TOP, 0.12, D - 0.02), lbox(s1 - 0.012, s1, PLINTH, TOP, 0.12, D - 0.02))
  for (let i = 0; i < n; i++)
    r.moving.push(drawer(r.f, s0 + G, s1 - G, PLINTH + i * h + G, PLINTH + (i + 1) * h - G, D - 0.02, D, 0.4, 'cab'))
}

/** Plinth, counter and a solid filler over `[s0, s1]` (hidden corners). */
function base(r: Run, s0: number, s1: number) {
  r.parts.reveal.push(lbox(s0, s1, 0, PLINTH, 0, D - 0.06))
  r.parts.verde.push(lbox(s0, s1, TOP, COUNTER, 0, 0.6))
}

/** Uppers carcass with doors over `[s0, s1]` split into `n` leaves, and an LED strip under them. */
function uppers(r: Run, s0: number, s1: number, n: number) {
  const w = (s1 - s0) / n
  for (let i = 0; i < n; i += 2) {
    const a = s0 + i * w
    if (i + 1 < n) pair(r, a, a + 2 * w, UY, H, UD)
    else single(r, a, a + w, UY, H, UD, 'right')
  }
  r.parts.disc.push(lbox(s0 + 0.03, s1 - 0.03, UY - 0.004, UY, UD - 0.07, UD - 0.05))
}

const splash = (r: Run, s0: number, s1: number, y1: number) => r.parts.gtile.push(lbox(s0, s1, COUNTER, y1, 0.001, 0.009))

function flush(r: Run, out: Parts) {
  const { f, parts } = r
  add(out, 'cab', f.boxes(parts.cab, 1))
  add(out, 'reveal', f.boxes(parts.reveal))
  add(out, 'verde', f.boxes(parts.verde, 1))
  add(out, 'gtile', f.boxes(parts.gtile, 1))
  if (parts.bezel.length) add(out, 'bezel', f.boxes(parts.bezel))
  if (parts.disc.length) add(out, 'disc', f.boxes(parts.disc))
}

const run = (f: Frame, moving: Moving[]): Run => ({ f, parts: { cab: [], reveal: [], verde: [], gtile: [], bezel: [], disc: [] }, moving })

// ─── east wall: hob run ─────────────────────────────────────────────────────

function east(out: Parts, moving: Moving[]): Box[] {
  const r = run(frame([EX, 0, NZ], [0, 0, 1], [-1, 0, 0]), moving)
  const c = LE / 2
  const [h0, h1] = [c - 0.375, c + 0.375]
  base(r, 0, LE)
  r.parts.cab.push(lbox(0, 0.6, PLINTH, TOP, 0, D), lbox(LE - 0.6, LE, PLINTH, TOP, 0, D))
  pair(r, 0.6, h0, PLINTH, TOP, D)
  drawers(r, h0, h1, 3)
  pair(r, h1, LE - 0.6, PLINTH, TOP, D)
  uppers(r, 0.35, LE, 6)
  r.parts.cab.push(...cavity(0, 0.35, UY, H, UD))
  splash(r, 0, LE, UY)

  // Black glass hob with three burners, and a slim chimney under the uppers.
  r.parts.bezel.push(lbox(h0 + 0.02, h1 - 0.02, COUNTER, COUNTER + 0.006, 0.06, 0.54))
  const burners: [number, number][] = [
    [c - 0.2, 0.36],
    [c + 0.2, 0.36],
    [c, 0.2],
  ]
  for (const [s, z] of burners) {
    const y = COUNTER + 0.006
    r.parts.bezel.push(lbox(s - 0.09, s + 0.09, y, y + 0.022, z - 0.006, z + 0.006), lbox(s - 0.006, s + 0.006, y, y + 0.022, z - 0.09, z + 0.09))
    add(out, 'brass', r.f.place(new CylinderGeometry(0.035, 0.04, 0.016, 24).translate(s, y + 0.008, z)))
  }
  r.parts.bezel.push(lbox(c - 0.45, c + 0.45, UY - 0.08, UY - 0.001, 0, 0.5))
  r.parts.disc.push(lbox(c - 0.3, c + 0.3, UY - 0.083, UY - 0.08, 0.3, 0.45))

  flush(r, out)
  return [r.f.box(lbox(0, LE, 0, COUNTER, 0, 0.6))]
}

// ─── north wall: fridge, tall unit with niche, short base ───────────────────

function north(out: Parts, moving: Moving[]): Box[] {
  const r = run(frame([KX0, 0, NZ], [1, 0, 0], [0, 0, 1]), moving)
  const [t0, t1] = [0.8, 1.4]

  // Fridge recess: a black fridge under a box of shutters.
  pair(r, 0, t0, 2.1, H, 0.6)
  r.parts.bezel.push(lbox(0.04, t0 - 0.04, 0, 1.9, 0.05, 0.66), lbox(0.04, t0 - 0.04, 1.2, 1.205, 0.05, 0.661))
  r.parts.reveal.push(lbox(t0 - 0.13, t0 - 0.11, 0.7, 1.15, 0.661, 0.69), lbox(t0 - 0.13, t0 - 0.11, 1.25, 1.75, 0.661, 0.69))

  // Tall unit: shutter, open niche, shutter.
  r.parts.reveal.push(lbox(t0, t1, 0, PLINTH, 0, D - 0.06))
  single(r, t0, t1, PLINTH, TOP + 0.02, 0.6, 'left')
  r.parts.cab.push(...cavity(t0, t1, TOP + 0.02, UY - 0.03, 0.6).slice(0, 5))
  single(r, t0, t1, UY - 0.03, H, 0.6, 'left')

  base(r, t1, LN - 0.6)
  single(r, t1, LN - 0.6, PLINTH, TOP, D, 'right')
  uppers(r, t1, LN - UD, 2)
  splash(r, t1, LN - 0.009, UY)

  flush(r, out)
  return [r.f.box(lbox(0, t1, 0, H, 0, 0.66)), r.f.box(lbox(t1, LN, 0, COUNTER, 0, 0.6))]
}

// ─── south wall: sink under the window ──────────────────────────────────────

function south(out: Parts, moving: Moving[]): Box[] {
  const r = run(frame([EX, 0, SZ], [-1, 0, 0], [0, 0, -1]), moving)
  const sc = (WIN[0] + WIN[1]) / 2
  const [b0, b1] = [sc - 0.3, sc + 0.3]
  const [z0, z1] = [0.1, 0.5]

  r.parts.reveal.push(lbox(0.6, LS, 0, PLINTH, 0, D - 0.06))
  r.parts.verde.push(lbox(0.6, b0, TOP, COUNTER, 0, 0.6), lbox(b1, LS, TOP, COUNTER, 0, 0.6))
  r.parts.verde.push(lbox(b0, b1, TOP, COUNTER, 0, z0), lbox(b0, b1, TOP, COUNTER, z1, 0.6))
  pair(r, 0.6, LS, PLINTH, TOP, D)

  // Recessed black basin.
  const [by, t] = [0.68, 0.012]
  r.parts.bezel.push(
    lbox(b0, b1, by, by + t, z0, z1),
    lbox(b0, b0 + t, by + t, TOP, z0, z1),
    lbox(b1 - t, b1, by + t, TOP, z0, z1),
    lbox(b0 + t, b1 - t, by + t, TOP, z0, z0 + t),
    lbox(b0 + t, b1 - t, by + t, TOP, z1 - t, z1),
  )

  splash(r, 0.009, WIN[0], UY)
  splash(r, WIN[0], WIN[1], 1.1)
  splash(r, WIN[1], LS, UY)

  // Black gooseneck tap behind the basin.
  const tap = new TubeGeometry(
    new CatmullRomCurve3([new Vector3(sc, COUNTER, 0.06), new Vector3(sc, 1.22, 0.06), new Vector3(sc, 1.3, 0.16), new Vector3(sc, 1.2, 0.27), new Vector3(sc, 1.13, 0.27)]),
    32,
    0.011,
    10,
  )
  const lever = new BoxGeometry(0.012, 0.012, 0.1).translate(sc + 0.03, 1.0, 0.09)
  add(out, 'bezel', r.f.place(tap), r.f.place(new CylinderGeometry(0.022, 0.025, 0.02, 20).translate(sc, COUNTER + 0.01, 0.06)), r.f.place(lever))

  flush(r, out)
  return [r.f.box(lbox(0.6, LS, 0, COUNTER, 0, 0.6))]
}

// ─── teak screen in the kitchen opening ─────────────────────────────────────

function screen(out: Parts): Box[] {
  const xm = (BX0 + BX1) / 2
  const [x0, x1] = [xm - 0.02, xm + 0.02]
  const z0 = toZ(unit.Y(404)) + 0.15
  const z1 = z0 + 0.8
  const top = SOFFIT - 0.11
  const [r0, r1] = [0.4, 1.45]
  const S = 0.035
  const teak: Box[] = [
    { min: [x0, 0, z0], max: [x1, top, z0 + S] },
    { min: [x0, 0, z1 - S], max: [x1, top, z1] },
    { min: [x0, r0 - S, z0 + S], max: [x1, r0, z1 - S] },
    { min: [x0, r1, z0 + S], max: [x1, r1 + S, z1 - S] },
  ]
  const n = 9
  const pitch = (z1 - z0 - 2 * S) / n
  for (let i = 0; i < n; i++) {
    const zc = z0 + S + (i + 0.5) * pitch
    const slat = (y0: number, y1: number): Box => ({ min: [xm - 0.012, y0, zc - 0.012], max: [xm + 0.012, y1, zc + 0.012] })
    teak.push(slat(0, r0 - S), slat(r1 + S, top))
  }
  add(out, 'teak', boxesToGeometry(teak, { uvScale: 1.4 }))
  add(out, 'frost', boxesToGeometry([{ min: [xm - 0.004, r0, z0 + S], max: [xm + 0.004, r1, z1 - S] }]))
  return [{ min: [x0, 0, z0], max: [x1, top, z1] }]
}

export function buildKitchen(): Built {
  const parts: Parts = {}
  const moving: Moving[] = []
  const colliders = [...east(parts, moving), ...north(parts, moving), ...south(parts, moving), ...screen(parts)]
  return { parts, colliders, moving }
}
