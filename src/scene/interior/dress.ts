import { BufferGeometry, CylinderGeometry } from 'three'
import type { Box } from '../geometry'
import { CEILING, toX, toZ, unitById } from '../plan'
import { add, cavity, frame, lbox, merge, shutterParts, type Built, type Key, type Moving, type Parts } from './kit'

// Master Dress, flat 04 on /dmr: a full-height wardrobe on the north wall (six doors with a teak shaker base
// and cream upper, long brass pulls, a loft above) and, on the east wall, a teak-framed full-height mirror
// beside an open teak niche. The west side is open to the Master Bedroom.

const unit = unitById('04')
const H = CEILING - 0.001
const X0 = toX(unit.X(499))
const X1 = toX(unit.X(816))
const Z0 = toZ(unit.Y(37))
const Z1 = toZ(unit.Y(150))
const L = X1 - X0
const DEPTH = Z1 - Z0

const D = 0.6
const PLINTH = 0.06
const DADO = 0.92
const LOFT = 2.22
const COLS = 6
/** Pull side per door; null doors are push-latch. Matches the site render. */
const PULLS: ('left' | 'right' | null)[] = ['right', 'left', 'right', 'left', 'right', null]
const PULL = { y0: 0.56, y1: 1.24, inset: 0.06, off: 0.045 }

const E = { d: 0.35, top: 2.42, t: 0.03, split: D + 0.5 }

/** Brass bar pull standing off the leaf face at z, centred at s, in the wardrobe frame. */
function pull(s: number, z: number) {
  const { y0, y1, off } = PULL
  const bar = new CylinderGeometry(0.009, 0.009, y1 - y0, 12).translate(s, (y0 + y1) / 2, z + off)
  const posts = [y0 + 0.04, y1 - 0.04].map((y) =>
    new CylinderGeometry(0.006, 0.006, off, 8).rotateX(Math.PI / 2).translate(s, y, z + off / 2),
  )
  return merge([bar, ...posts])
}

function wardrobe(parts: Parts, moving: Moving[]): Box[] {
  const f = frame([X0, 0, Z0], [1, 0, 0], [0, 0, 1])
  const g = 0.004
  const front = D - 0.02
  const w = L / COLS
  const R = 0.065

  const cream: Box[] = []
  for (let i = 0; i < COLS; i++) {
    const [s0, s1] = [i * w, (i + 1) * w]
    cream.push(...cavity(s0, s1, PLINTH, LOFT, front), ...cavity(s0, s1, LOFT, H, front))
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
    // Hinged away from the pull; the push-latch door hinges west so it clears the mirror unit.
    const hinge = side === 'left' ? 'right' : 'left'
    moving.push(shutterParts(f, pieces, hinge === 'left' ? a : b, D, hinge))

    // Loft shutter.
    const loft = [lbox(a, b, LOFT + g / 2, H - 0.002, front, D)]
    moving.push(shutterParts(f, [['cream', loft]], hinge === 'left' ? a : b, D, hinge))
  }

  add(parts, 'cream', f.boxes(cream, 2.2))
  add(parts, 'reveal', f.boxes([lbox(0, L, 0, PLINTH, 0, D - 0.05)]))
  return [f.box(lbox(0, L, 0, H, 0, D))]
}

function mirrorWall(parts: Parts): Box[] {
  // Local frame on the east wall: s runs south from the north wall, z comes west into the dress.
  const f = frame([X1, 0, Z0], [0, 0, 1], [-1, 0, 0])
  const { d, top, t, split } = E
  const [s0, s1] = [D, DEPTH]
  const teak = [
    lbox(s0, s1, top - t, top, 0, d),
    lbox(s0, s0 + t, 0, top - t, 0, d),
    lbox(s1 - t, s1, 0, top - t, 0, d),
    lbox(split - t / 2, split + t / 2, 0, top - t, 0, d),
    // Mirror backing and the niche's back and base shelf.
    lbox(s0 + t, split - t / 2, 0, top - t, 0, d - 0.03),
    lbox(split + t / 2, s1 - t, 0, top - t, 0, 0.015),
    lbox(split + t / 2, s1 - t, 0, 0.1, 0.015, d),
  ]
  add(parts, 'teak', f.boxes(teak, 1.4))
  add(parts, 'mirror', f.boxes([lbox(s0 + t, split - t / 2, 0.01, top - t - 0.01, d - 0.03, d - 0.024)]))
  return [f.box(lbox(s0, s1, 0, top, 0, d))]
}

export function buildDress(): Built {
  const parts: Parts = {}
  const moving: Moving[] = []
  return {
    parts,
    colliders: [...wardrobe(parts, moving), ...mirrorWall(parts)],
    moving,
  }
}
