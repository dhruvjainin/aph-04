import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { boxesToGeometry, type Box } from '../geometry'
import { CEILING, FT, toX, toZ, unitById } from '../plan'
import { add, frame, lbox, merge, roundedRect, type Built, type Key, type Parts } from './kit'

// Dining, flat 04 on /dmr: a crockery wall on the Common Toilet wall, a teak casing around the kitchen
// opening under the beam, and a six-seat marble table pointing at the crockery wall.

const unit = unitById('04')
const SOFFIT = 7 * FT
const H = CEILING - 0.001

const lathe = (pts: number[][], segments = 40) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), segments)

function arch(w: number, h: number) {
  const s = new Shape()
  s.moveTo(-w / 2, 0)
  s.lineTo(w / 2, 0)
  s.lineTo(w / 2, h - w / 2)
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false)
  s.lineTo(-w / 2, 0)
  return new ShapeGeometry(s, 24)
}

/** Flat rectangle with UVs in metres, so the slat stripes keep their pitch. */
const panel = (w: number, h: number) => new ShapeGeometry(roundedRect(w, h, 0.001)).translate(0, h / 2, 0)

// ─── teak casing around the kitchen opening under the beam ─────────────────

const BX0 = toX(unit.X(626))
const BX1 = toX(unit.X(645))
const BZ0 = toZ(unit.Y(404))
const BZ1 = toZ(unit.Y(592))

function casing(parts: Parts): Box[] {
  const [x0, x1] = [BX0 - 0.015, BX1 + 0.015]
  const J = 0.15
  const jambs: Box[] = [
    { min: [x0, 0, BZ0], max: [x1, SOFFIT - 0.001, BZ0 + J] },
    { min: [x0, 0, BZ1 - J], max: [x1, SOFFIT - 0.001, BZ1] },
  ]
  const head: Box = { min: [x0, SOFFIT - 0.11, BZ0 + J], max: [x1, SOFFIT - 0.001, BZ1 - J] }
  add(parts, 'teak', boxesToGeometry([...jambs, head], { uvScale: 1.4 }))
  return jambs
}

// ─── crockery wall on the Common Toilet wall ───────────────────────────────
// Local frame seen from the table: x runs east → west from the kitchen-side corner, z comes north into the Dining.

const WX = toX(unit.X(627))
const WZ = toZ(unit.Y(634))
const L = WX - toX(unit.X(447))
/** Plastered build-out the cabinet is set into; the corner niche east of it is left at the wall. */
const D = 0.4
const NICHE = 0.55
const CAB = { s0: NICHE, s1: 2.04, top: 0.9, shelf: 1.585, box: 1.29, boxTop: 1.81 }
const SLATS = { s0: 2.1, s1: 2.55, y0: 0.87, y1: 2.66, recess: 0.03 }
const ARCHES = { y0: 1.64, y1: 2.68, w: 0.27, at: [1.485, 1.855] }

function crockery(parts: Parts): Box[] {
  const f = frame([WX, 0, WZ], [-1, 0, 0], [0, 0, -1])
  const { s0, s1, top, shelf, box: b1, boxTop } = CAB
  const q = SLATS

  const cream = [
    lbox(s0, s1, boxTop, H, 0, D),
    lbox(b1, s1, shelf, boxTop, 0, D),
    lbox(s1, q.s0, 0, H, 0, D),
    lbox(q.s1, L, 0, H, 0, D),
    lbox(q.s0, q.s1, 0, q.y0, 0, D),
    lbox(q.s0, q.s1, q.y1, H, 0, D),
    lbox(q.s0, q.s1, q.y0, q.y1, 0, D - q.recess),
  ]

  const t = 0.02
  const g = 0.004
  const teak: Box[] = [
    // Counter, niche lining and its top shelf.
    lbox(s0, s1, top - 0.03, top, 0, D),
    lbox(s0 + t, s1 - t, top, shelf - 0.025, 0, 0.012),
    lbox(s0, s0 + t, top, shelf - 0.025, 0, D),
    lbox(s1 - t, s1, top, shelf - 0.025, 0, D),
    lbox(s0, s1, shelf - 0.025, shelf, 0, D),
    // Small open box above the niche.
    lbox(s0 + t, b1 - t, shelf, boxTop - t, 0, 0.012),
    lbox(s0, s0 + t, shelf, boxTop - t, 0, D),
    lbox(b1 - t, b1, shelf, boxTop - t, 0, D),
    lbox(s0, b1, boxTop - t, boxTop, 0, D),
    // Corner niche: two shelves over a half-round ledge.
    lbox(0, NICHE, 1.8, 1.83, 0, 0.28),
    lbox(0, NICHE, 2.15, 2.18, 0, 0.28),
  ]
  // Four drawers on the left, two shaker doors on the right.
  const split = 1.3
  const y1 = top - 0.03 - g
  for (let i = 0; i < 4; i++) {
    const [a, b] = [g + (i * y1) / 4, ((i + 1) * y1) / 4 - g]
    teak.push(lbox(s0 + g, split - g / 2, a, b, D - 0.02, D))
  }
  const dw = (s1 - split) / 2
  for (let i = 0; i < 2; i++) {
    const [a, b] = [split + i * dw + g / 2, split + (i + 1) * dw - g / 2]
    const R = 0.07
    teak.push(
      lbox(a, b, g, g + R, D - 0.02, D),
      lbox(a, b, y1 - R, y1, D - 0.02, D),
      lbox(a, a + R, g + R, y1 - R, D - 0.02, D),
      lbox(b - R, b, g + R, y1 - R, D - 0.02, D),
      lbox(a + R, b - R, g + R, y1 - R, D - 0.02, D - 0.01),
    )
  }
  const reveal = [lbox(s0, s1, 0, top - 0.03, 0, D - 0.02)]

  const ledge = f.place(new CylinderGeometry(0.25, 0.25, 0.03, 32, 1, false, -Math.PI / 2, Math.PI).translate(NICHE / 2, 0.9, 0))
  const apron = f.place(new CylinderGeometry(0.25, 0.25, 0.012, 32, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(NICHE / 2, 0.885, 0.006))

  const inset = [
    ...ARCHES.at.map((s) => f.place(arch(ARCHES.w, ARCHES.y1 - ARCHES.y0).translate(s, ARCHES.y0, D + 0.002))),
    f.place(panel(q.s1 - q.s0, q.y1 - q.y0).translate((q.s0 + q.s1) / 2, q.y0, D - q.recess + 0.001)),
  ]

  const jug = f.place(lathe([[0, 0], [0.05, 0], [0.085, 0.07], [0.08, 0.15], [0.035, 0.22], [0.03, 0.28], [0.045, 0.3], [0, 0.3]]).translate(NICHE / 2, 0.915, 0.13))
  const pot = f.place(lathe([[0, 0], [0.06, 0], [0.07, 0.05], [0.065, 0.09], [0, 0.09]]).translate(s0 + 0.2, shelf, 0.2))
  const books = [0, 1, 2].map((i) => lbox(s1 - 0.36 + i * 0.01, s1 - 0.08 - i * 0.01, top + i * 0.025, top + (i + 1) * 0.025 - 0.002, 0.08, 0.3))

  add(parts, 'cream', f.boxes(cream, 2.2))
  add(parts, 'teak', f.boxes(teak, 1.4), ledge, apron)
  add(parts, 'reveal', f.boxes(reveal))
  add(parts, 'arch', ...inset)
  add(parts, 'ceramic', jug, pot)
  add(parts, 'fabric', f.boxes(books))
  return [f.box(lbox(s0, L, 0, H, 0, D)), f.box(lbox(0, NICHE, 0, 0.92, 0, 0.25))]
}

// ─── table, chairs and pendant ─────────────────────────────────────────────

const TABLE = { l: 1.5, w: 0.9, h: 0.745 }
/** Centred across the Dining, its south end chair clearing the crockery wall. */
const TX = toX(unit.X(536))
const TZ = WZ - D - 0.8 - TABLE.l / 2

function chair() {
  const wood: BufferGeometry[] = [boxesToGeometry([lbox(-0.22, 0.22, 0.38, 0.41, -0.2, 0.22)])]
  for (const x of [-0.19, 0.19]) wood.push(new CylinderGeometry(0.017, 0.013, 0.38, 12).translate(x, 0.19, 0.18))
  for (const x of [-0.2, 0.2]) wood.push(new CylinderGeometry(0.016, 0.013, 0.72, 12).translate(x, 0.36, -0.18))
  // Crescent backrest, thickest in the middle.
  const s = new Shape()
  const a = 0.75
  s.absarc(0, -0.05, 0.3, Math.PI / 2 + a, Math.PI / 2 - a, true)
  s.absarc(0, -0.08, 0.29, Math.PI / 2 - a + 0.02, Math.PI / 2 + a - 0.02, false)
  wood.push(new ExtrudeGeometry(s, { depth: 0.075, bevelEnabled: false, curveSegments: 24 }).rotateX(-Math.PI / 2).translate(0, 0.63, 0))
  const fabric = new RoundedBoxGeometry(0.44, 0.06, 0.42, 3, 0.025).translate(0, 0.44, 0.01)
  return { wood: merge(wood), fabric }
}

function table(parts: Parts): Box[] {
  const { l, w, h } = TABLE
  const top = new ExtrudeGeometry(roundedRect(w, l, 0.07), {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 8,
  })
    .rotateX(-Math.PI / 2)
    .translate(TX, h + 0.004, TZ)
  const base = lathe([[0, 0], [0.26, 0], [0.27, 0.02], [0.2, 0.2], [0.14, 0.4], [0.16, 0.6], [0.24, 0.72], [0.25, h], [0, h]], 48)
    .scale(1, 1, 1.8)
    .translate(TX, 0, TZ)

  const c = chair()
  const seats: [x: number, z: number, yaw: number][] = [
    [TX - w / 2 - 0.15, TZ - 0.38, Math.PI / 2],
    [TX - w / 2 - 0.15, TZ + 0.38, Math.PI / 2],
    [TX + w / 2 + 0.15, TZ - 0.38, -Math.PI / 2],
    [TX + w / 2 + 0.15, TZ + 0.38, -Math.PI / 2],
    [TX, TZ - l / 2 - 0.15, 0],
    [TX, TZ + l / 2 + 0.15, Math.PI],
  ]
  const at = ([x, z, yaw]: (typeof seats)[number]) => new Matrix4().makeRotationY(yaw).setPosition(x, 0, z)

  // Two offset discs on long rods.
  const discs = [
    { dz: -0.07, y: 1.62, r: 0.32 },
    { dz: 0.09, y: 1.52, r: 0.26 },
  ]
  const disc = discs.map(({ dz, y, r }) => new CylinderGeometry(r, r, 0.012, 48).translate(TX, y, TZ + dz))
  const rods = discs.map(({ dz, y }) => new CylinderGeometry(0.004, 0.004, CEILING - y, 6).translate(TX, (CEILING + y) / 2, TZ + dz))

  const pieces: [Key, BufferGeometry[]][] = [
    ['marble', [top]],
    ['teak', [base, ...seats.map((p) => c.wood.clone().applyMatrix4(at(p)))]],
    ['fabric', seats.map((p) => c.fabric.clone().applyMatrix4(at(p)))],
    ['disc', disc],
    ['bezel', rods],
  ]
  for (const [k, g] of pieces) add(parts, k, ...g)
  c.wood.dispose()
  c.fabric.dispose()

  return [
    { min: [TX - w / 2, 0, TZ - l / 2], max: [TX + w / 2, h + 0.03, TZ + l / 2] },
    ...seats.map(([x, z]): Box => ({ min: [x - 0.23, 0, z - 0.23], max: [x + 0.23, 0.75, z + 0.23] })),
  ]
}

export function buildDining(): Built {
  const parts: Parts = {}
  return { parts, colliders: [...casing(parts), ...crockery(parts), ...table(parts)] }
}
