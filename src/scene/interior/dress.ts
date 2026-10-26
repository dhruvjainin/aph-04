import { BufferGeometry, CylinderGeometry } from 'three'
import type { Box } from '../geometry'
import { CEILING, toX, toZ, unitById } from '../plan'
import { add, drawer, frame, lbox, merge, shutterParts, type Built, type Frame, type Key, type Moving, type Parts } from './kit'

// Master Dress, flat 04 on /dmr: a full-height wardrobe on the north wall (six doors with a teak shaker base
// and cream upper, long brass pulls, a loft above) and a second one on the east wall (a mirror door beside a
// narrow door and drawers). Both are fitted inside from the joinery drawings. The west side is open to the Master Bedroom.

const unit = unitById('04')
const H = CEILING - 0.001
const X0 = toX(unit.X(499))
const X1 = toX(unit.X(816))
const Z0 = toZ(unit.Y(37))
const Z1 = toZ(unit.Y(150))
const L = X1 - X0
const DEPTH = Z1 - Z0

const D = 0.6
const FRONT = D - 0.02
const PLINTH = 0.06
const DADO = 0.92
const LOFT = 2.22
const COLS = 6
/** Pull side per door; null doors are push-latch. Matches the site render. */
const PULLS: ('left' | 'right' | null)[] = ['right', 'left', 'right', 'left', 'right', null]
const PULL = { y0: 0.56, y1: 1.24, inset: 0.06, off: 0.045 }

/** Brass bar pull standing off the leaf face at z, centred at s, in the wardrobe frame. */
function pull(s: number, z: number, y0 = PULL.y0, y1 = PULL.y1) {
  const { off } = PULL
  const bar = new CylinderGeometry(0.009, 0.009, y1 - y0, 12).translate(s, (y0 + y1) / 2, z + off)
  const posts = [y0 + 0.04, y1 - 0.04].map((y) =>
    new CylinderGeometry(0.006, 0.006, off, 8).rotateX(Math.PI / 2).translate(s, y, z + off / 2),
  )
  return merge([bar, ...posts])
}

// ─── interior, read off the drawings ───────────────────────────────────────

const T = 0.018

/** Cells are in drawing pixels: [x0, x1, y0, y1] with y0 above y1. */
interface Fit {
  /** Pixel → metres along the wall (x) and up (y). */
  x: (px: number) => number
  y: (py: number) => number
  /** Carcass extent along the wall. */
  s0: number
  s1: number
  /** Partitions: [x, top, bottom]. */
  v: [number, number, number][]
  /** Shelves: [y, x0, x1]. */
  h: [number, number, number][]
  /** Drawers and trays. */
  drawers: [number, number, number, number][]
  /** Hanging rods: [y, x0, x1]. */
  rods: [number, number, number][]
  /** Loft partitions, x. */
  loft: number[]
  /** Drawer front plane, z0 → z1. */
  front: [number, number]
}

function fit(f: Frame, parts: Parts, moving: Moving[], c: Fit) {
  const { x, y, s0, s1 } = c
  const z1 = FRONT - 0.02
  const cream: Box[] = [
    lbox(s0, s1, PLINTH, H, 0, 0.015),
    lbox(s0, s0 + T, PLINTH, H, 0.015, z1),
    lbox(s1 - T, s1, PLINTH, H, 0.015, z1),
    lbox(s0, s1, PLINTH, PLINTH + T, 0.015, z1),
    lbox(s0, s1, LOFT - T / 2, LOFT + T / 2, 0.015, z1),
    lbox(s0, s1, H - T, H, 0.015, z1),
    ...c.loft.map((px) => lbox(x(px) - T / 2, x(px) + T / 2, LOFT, H - T, 0.015, z1)),
    ...c.v.map(([px, top, bot]) => lbox(x(px) - T / 2, x(px) + T / 2, y(bot), y(top), 0.015, z1)),
    ...c.h.map(([py, a, b]) => lbox(x(a), x(b), y(py) - T / 2, y(py) + T / 2, 0.015, z1)),
  ]
  add(parts, 'cream', f.boxes(cream, 2.2))
  add(
    parts,
    'brass',
    ...c.rods.map(([py, a, b]) =>
      f.place(new CylinderGeometry(0.012, 0.012, x(b) - x(a), 12).rotateZ(Math.PI / 2).translate((x(a) + x(b)) / 2, y(py), z1 / 2)),
    ),
  )
  for (const [a, b, top, bot] of c.drawers)
    moving.push(drawer(f, x(a) + 0.01, x(b) - 0.01, y(bot) + 0.012, y(top) - 0.012, c.front[0], c.front[1]))
}

function wardrobe(parts: Parts, moving: Moving[]): Box[] {
  const f = frame([X0, 0, Z0], [1, 0, 0], [0, 0, 1])
  const g = 0.004
  const front = FRONT
  const w = L / COLS
  const R = 0.065

  // Drawing N: 524 px wide for the six doors, 285 px from loft floor to plinth.
  fit(f, parts, moving, {
    x: (px) => ((px - 28) / 524) * L,
    y: (py) => PLINTH + ((415 - py) / 285) * (LOFT - PLINTH),
    s0: 0,
    s1: L,
    v: [[112, 130, 410], [198, 130, 410], [285, 130, 298], [328, 130, 298], [371, 130, 410], [457, 130, 410], [500, 130, 298]],
    h: [
      [271, 28, 112],
      [172, 112, 198], [214, 112, 198], [257, 112, 198], [298, 112, 198], [356, 112, 198],
      [298, 198, 371],
      [255, 285, 328],
      [170, 328, 371], [213, 328, 371], [255, 328, 371],
      [190, 371, 457], [235, 371, 457], [258, 371, 457], [298, 371, 457],
      [172, 457, 500], [214, 457, 500], [258, 457, 500],
      [298, 457, 552], [337, 457, 552], [375, 457, 552],
    ],
    drawers: [
      [28, 112, 271, 299], [28, 112, 299, 336], [28, 112, 336, 373], [28, 112, 373, 410],
      [198, 285, 268, 283], [198, 285, 283, 298],
      [198, 371, 298, 355], [198, 371, 355, 410],
      [371, 457, 298, 337], [371, 457, 337, 375], [371, 457, 375, 410],
    ],
    rods: [[152, 28, 112], [150, 198, 285], [150, 285, 328], [150, 500, 552]],
    loft: [198, 371, 457],
    front: [front - 0.06, front - 0.04],
  })
  // Safe in the narrow hanging bay.
  const sf = (px: number) => ((px - 28) / 524) * L
  const sy = (py: number) => PLINTH + ((415 - py) / 285) * (LOFT - PLINTH)
  add(parts, 'grey', f.boxes([lbox(sf(285) + 0.02, sf(328) - 0.02, sy(298) + 0.02, sy(255) - 0.02, 0.1, 0.45)]))

  for (let i = 0; i < COLS; i++) {
    const [s0, s1] = [i * w, (i + 1) * w]
    const [a, b] = [s0 + g / 2, s1 - g / 2]

    // Main door: teak shaker base up to the dado line, cream above.
    const [y0, y1] = [PLINTH + g, LOFT - g / 2]
    const teak = [
      lbox(a, b, y0, y0 + R, front, D),
      lbox(a, b, DADO - R, DADO, front, D),
      lbox(a, a + R, y0 + R, DADO - R, front, D),
      lbox(b - R, b, y0 + R, DADO - R, front, D),
      lbox(a + R, b - R, y0 + R, DADO - R, front, D - 0.008),
    ]
    const pieces: [Key, Box[] | BufferGeometry][] = [
      ['teak', teak],
      ['cream', [lbox(a, b, DADO, y1, front, D)]],
    ]
    const side = PULLS[i]
    if (side) pieces.push(['brass', pull(side === 'right' ? b - PULL.inset : a + PULL.inset, D)])
    // Hinged away from the pull; the push-latch door hinges west so it clears the east wardrobe.
    const hinge = side === 'left' ? 'right' : 'left'
    moving.push(shutterParts(f, pieces, hinge === 'left' ? a : b, D, hinge))

    // Loft shutter.
    const loft = [lbox(a, b, LOFT + g / 2, H - 0.002, front, D)]
    moving.push(shutterParts(f, [['cream', loft]], hinge === 'left' ? a : b, D, hinge))
  }

  add(parts, 'reveal', f.boxes([lbox(0, L, 0, PLINTH, 0, D - 0.05)]))
  return [f.box(lbox(0, L, 0, H, 0, D))]
}

function eastWardrobe(parts: Parts, moving: Moving[]): Box[] {
  // Local frame on the east wall: s runs south from the north wall, z comes west into the dress.
  const f = frame([X1, 0, Z0], [0, 0, 1], [-1, 0, 0])
  const g = 0.004
  const W = DEPTH - D
  const x = (px: number) => D + ((px - 62) / 341) * W
  const y = (py: number) => PLINTH + ((635 - py) / 443) * (LOFT - PLINTH)

  // Drawing E: 341 px wide, 443 px from loft floor to plinth.
  fit(f, parts, moving, {
    x,
    y,
    s0: D,
    s1: DEPTH,
    v: [[295, 192, 632]],
    h: [[457, 62, 295], [516, 62, 295], [574, 62, 295], [390, 297, 403], [457, 297, 403]],
    drawers: [[297, 403, 457, 516], [297, 403, 516, 574], [297, 403, 574, 632]],
    rods: [[226, 128, 293]],
    loft: [183, 295],
    front: [FRONT, D],
  })

  const [y0, y1] = [PLINTH + g, LOFT - g / 2]
  const bd = 0.05

  // Mirror door over the hanging bay.
  const [ma, mb] = [x(62) + g / 2, x(295) - g / 2]
  const frameBoxes = [
    lbox(ma, mb, y0, y0 + bd, FRONT + 0.012, D),
    lbox(ma, mb, y1 - bd, y1, FRONT + 0.012, D),
    lbox(ma, ma + bd, y0 + bd, y1 - bd, FRONT + 0.012, D),
    lbox(mb - bd, mb, y0 + bd, y1 - bd, FRONT + 0.012, D),
    lbox(ma, mb, y0, y1, FRONT, FRONT + 0.012),
  ]
  const glass = lbox(ma + bd, mb - bd, y0 + bd, y1 - bd, FRONT + 0.012, FRONT + 0.016)
  moving.push(
    shutterParts(f, [['teak', frameBoxes], ['mirror', [glass]], ['brass', pull(mb - PULL.inset, D)]], ma, D, 'left'),
  )

  // Narrow door over the open shelves.
  const [na, nb] = [x(297) + g / 2, x(403) - g / 2]
  const ny0 = y(457) + 0.012
  moving.push(
    shutterParts(
      f,
      [['cream', [lbox(na, nb, ny0, y1, FRONT, D)]], ['brass', pull(na + PULL.inset, D, ny0 + 0.2, ny0 + 0.7)]],
      nb,
      D,
      'right',
    ),
  )

  // Loft shutters.
  for (const [p0, p1] of [[62, 183], [183, 295], [297, 403]]) {
    const [a, b] = [x(p0) + g / 2, x(p1) - g / 2]
    moving.push(shutterParts(f, [['cream', [lbox(a, b, LOFT + g / 2, H - 0.002, FRONT, D)]]], a, D, 'left'))
  }

  add(parts, 'reveal', f.boxes([lbox(D, DEPTH, 0, PLINTH, 0, D - 0.05)]))
  return [f.box(lbox(D, DEPTH, 0, H, 0, D))]
}

export function buildDress(): Built {
  const parts: Parts = {}
  const moving: Moving[] = []
  return {
    parts,
    colliders: [...wardrobe(parts, moving), ...eastWardrobe(parts, moving)],
    moving,
  }
}
