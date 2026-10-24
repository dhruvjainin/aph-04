import { BufferGeometry, CylinderGeometry, LatheGeometry, PlaneGeometry, Vector2 } from 'three'
import { boxesToGeometry, type Box } from '../geometry'
import { CEILING, toX, toZ, unitById } from '../plan'
import { add, type Built, type Parts } from './kit'

// TV unit on the Living's south wall (shared with the Kids Room), flat 04 on /dmr.
// Local frame, seen from the Living: s runs left → right along the wall (east → west),
// d comes off the wall face into the room, y is height.

const unit = unitById('04')
/** East end of the wall (the Passage corner) and its room-side face, in metres. */
const XE = toX(unit.X(376))
const ZW = toZ(unit.Y(527))
const L = XE - toX(unit.X(192))

const box = (s0: number, s1: number, y0: number, y1: number, d0: number, d1: number): Box => ({
  min: [XE - s1, y0, ZW - d1],
  max: [XE - s0, y1, ZW - d0],
})

/** Vertical quarter-round rounding the front-left or front-right edge, centred at (s, d). */
const quarter = (s: number, d: number, r: number, y0: number, y1: number, side: 'left' | 'right') =>
  new CylinderGeometry(r, r, y1 - y0, 20, 1, false, side === 'right' ? Math.PI : Math.PI / 2, Math.PI / 2).translate(
    XE - s,
    (y0 + y1) / 2,
    ZW - d,
  )

/** A slab rounded on its front edges with radii rl (left) and rr (right). */
function rounded(s0: number, s1: number, y0: number, y1: number, d0: number, d1: number, rl: number, rr: number) {
  const boxes = [box(s0 + rl, s1 - rr, y0, y1, d0, d1)]
  const parts: BufferGeometry[] = []
  if (rl > 0) {
    if (d1 - rl > d0) boxes.push(box(s0, s0 + rl, y0, y1, d0, d1 - rl))
    parts.push(quarter(s0 + rl, d1 - rl, rl, y0, y1, 'left'))
  }
  if (rr > 0) {
    if (d1 - rr > d0) boxes.push(box(s1 - rr, s1, y0, y1, d0, d1 - rr))
    parts.push(quarter(s1 - rr, d1 - rr, rr, y0, y1, 'right'))
  }
  return [boxesToGeometry(boxes), ...parts]
}

// ─── layout (metres) ───────────────────────────────────────────────────────

const P0 = 0.02
const P1 = L - 0.02
/** Grooved panelling: a recessed backing with 18 mm panels laid over it. */
const BACKING = 0.008
const PANEL = 0.026
const GROOVE = 0.006
const ROWS = [0.1, 0.79, 1.9, 2.24]
const COLS = 4

/** The raised TV backdrop and the rounded pillar beside it share the middle row's height. */
const [MID0, MID1] = [ROWS[1], ROWS[2]]
const BACKDROP = { s0: P0 + 0.12, s1: P0 + 1.8, d: 0.15 }
const PILLAR = { s0: P0 + 2.18, s1: P0 + 2.6, d: 0.17 }
const SHELVES = [0.92, 1.26, 1.62]

const TV = { s: P0 + 0.92, y: 1.32, w: 1.12, h: 0.64, t: 0.03 }

/** Floating console: an open niche on the left, three drawers. */
const C = { s0: 0.03, s1: L - 0.08, y0: 0.18, y1: 0.6, d0: 0.028, d1: 0.43, t: 0.018 }
const NICHE = 0.62
const LAMP = { s: C.s0 + 0.3, d: 0.22 }

export function buildTvUnit(): Built {
  const backing: Box[] = [box(P0, P1, ROWS[0], ROWS[ROWS.length - 1], 0.001, BACKING)]
  const panels: Box[] = []
  const colW = (P1 - P0) / COLS
  for (let r = 0; r < ROWS.length - 1; r++)
    for (let c = 0; c < COLS; c++) {
      const s0 = P0 + c * colW + (c ? GROOVE / 2 : 0)
      const s1 = P0 + (c + 1) * colW - (c < COLS - 1 ? GROOVE / 2 : 0)
      const y0 = ROWS[r] + (r ? GROOVE / 2 : 0)
      const y1 = ROWS[r + 1] - (r < ROWS.length - 2 ? GROOVE / 2 : 0)
      panels.push(box(s0, s1, y0, y1, BACKING, PANEL))
    }

  // Fluted band from the panelling up to the ceiling.
  const top = ROWS[ROWS.length - 1]
  const flutes: Box[] = [box(P0, P1, top, CEILING - 0.001, 0.001, BACKING)]
  const pitch = 0.045
  const n = Math.floor((P1 - P0) / pitch)
  const pad = (P1 - P0 - n * pitch) / 2
  for (let i = 0; i < n; i++) {
    const s = P0 + pad + i * pitch + 0.004
    flutes.push(box(s, s + pitch - 0.012, top, CEILING - 0.001, BACKING, 0.02))
  }

  const cream: BufferGeometry[] = [
    boxesToGeometry(panels),
    ...rounded(BACKDROP.s0, BACKDROP.s1, MID0, MID1, PANEL, BACKDROP.d, 0.05, 0.14),
    ...rounded(PILLAR.s0, PILLAR.s1, MID0, MID1, PANEL, PILLAR.d, PILLAR.d - PANEL, 0),
  ]

  // Smoked bronze glass shelves with a brass front lip.
  const [sh0, sh1] = [BACKDROP.s1 - 0.08, PILLAR.s0 + 0.08]
  const shelves = SHELVES.map((y) => box(sh0, sh1, y - 0.005, y + 0.005, PANEL, 0.192))
  const brass = SHELVES.map((y) => box(sh0, sh1, y - 0.007, y + 0.007, 0.192, 0.2))

  const tv = box(TV.s - TV.w / 2, TV.s + TV.w / 2, TV.y - TV.h / 2, TV.y + TV.h / 2, BACKDROP.d, BACKDROP.d + TV.t)
  const screen = new PlaneGeometry(TV.w - 0.02, TV.h - 0.02)
    .rotateY(Math.PI)
    .translate(XE - TV.s, TV.y, ZW - BACKDROP.d - TV.t - 0.001)

  // Console carcass, drawer fronts and the dark reveal behind their gaps.
  const { s0, s1, y0, y1, d0, d1, t } = C
  const niche = s0 + NICHE
  const teak: Box[] = [
    box(s0, s1, y1 - t, y1, d0, d1),
    box(s0, s1, y0, y0 + t, d0, d1),
    box(s0, s0 + t, y0 + t, y1 - t, d0, d1),
    box(s1 - t, s1, y0 + t, y1 - t, d0, d1),
    box(niche - t, niche, y0 + t, y1 - t, d0, d1),
    box(s0 + t, niche - t, y0 + t, y1 - t, d0, d0 + 0.012),
  ]
  const gap = 0.006
  const o0 = niche
  const o1 = s1 - t
  const fw = (o1 - o0) / 3
  for (let i = 0; i < 3; i++)
    teak.push(box(o0 + i * fw + gap / 2, o0 + (i + 1) * fw - gap / 2, y0 + t + gap, y1 - t - gap, d1 - 0.018, d1))
  const reveal = [box(o0, o1, y0 + t, y1 - t, d1 - 0.03, d1 - 0.018)]

  // Table lamp on the console above the niche.
  const [lx, lz] = [XE - LAMP.s, ZW - LAMP.d]
  const vase = new LatheGeometry(
    [
      [0, 0],
      [0.05, 0],
      [0.095, 0.04],
      [0.108, 0.1],
      [0.095, 0.16],
      [0.05, 0.195],
      [0.02, 0.205],
      [0.02, 0.225],
      [0, 0.225],
    ].map(([r, y]) => new Vector2(r, y)),
    40,
  ).translate(lx, y1, lz)
  const shade = new CylinderGeometry(0.08, 0.108, 0.17, 40, 1, true).translate(lx, y1 + 0.225 + 0.06, lz)

  const parts: Parts = {}
  add(parts, 'backing', boxesToGeometry(backing))
  add(parts, 'flutes', boxesToGeometry(flutes))
  add(parts, 'cream', ...cream)
  add(parts, 'bronze', boxesToGeometry(shelves))
  add(parts, 'brass', boxesToGeometry(brass))
  add(parts, 'bezel', boxesToGeometry([tv]))
  add(parts, 'screen', screen)
  add(parts, 'teak', boxesToGeometry(teak, { uvScale: 1.4 }))
  add(parts, 'reveal', boxesToGeometry(reveal))
  add(parts, 'ceramic', vase)
  add(parts, 'shade', shade)
  return { parts, colliders: [box(s0, s1, 0, y1, 0, d1)] }
}
