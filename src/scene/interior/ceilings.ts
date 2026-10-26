import { BufferGeometry, ExtrudeGeometry, Path, Shape } from 'three'
import { boxesToGeometry, type Box } from '../geometry'
import { CEILING, DMR, FT, toX, toZ, unitById, type Rect } from '../plan'
import { add, type Built, type Key, type Parts } from './kit'

// False ceilings in flat 04 on /dmr. Each is a stack of rings: ring i fills the hole of ring i - 1 (the room
// for the first) minus its own hole, hanging from the slab down to its soffit; whatever is left is the slab.

const unit = unitById('04')

interface Step {
  /** Hole inset from the room's west, north, east and south edges, in metres. */
  inset: [w: number, n: number, e: number, s: number]
  /** Corner radius of the hole. */
  r: number
  /** Soffit height of the ring around the hole. */
  y: number
}

interface Coffer {
  rect: Rect
  key: Key
  steps: Step[]
  /** Shadow grooves on the slab, as [columns, rows]. */
  grid?: [number, number]
}

const COFFERS: Coffer[] = []

/** A flat drop ceiling: a solid slab-deep box whose underside is the soffit. One level over Living, Dining and Passage. */
const DROP = 2.65
const FLATS: { rect: Rect; key: Key; y: number }[] = [
  [192, 289, 447, 527],
  [447, 289, 626, 634],
  [376, 527, 459, 772],
].map((rect) => ({ rect: rect as Rect, key: 'paint', y: DROP }))

const flatBounds = ({ rect: [x0, y0, x1, y1] }: { rect: Rect }) => [toX(unit.X(x0)), toZ(unit.Y(y0)), toX(unit.X(x1)), toZ(unit.Y(y1))]

/** A painted ceiling carried down the walls as a band; walls are [x0, y0, x1, y1] lines on the room-side faces in plan px. */
interface Painted {
  rect: Rect
  key: Key
  band: number
  walls: Rect[]
}

/** Master Bedroom: a flat terracotta ceiling with a 1 ft band down the walls (the open side to the dress is left bare). */
const MASTER: Painted = {
  rect: [192, 37, 499, 277],
  key: 'terracotta',
  band: FT,
  walls: [
    [192, 37, 499, 37],
    [192, 37, 192, 277],
    [192, 277, 499, 277],
    [499, 162, 499, 277],
  ],
}

const bounds = ({ rect: [x0, y0, x1, y1] }: Coffer) => [toX(unit.X(x0)), toZ(unit.Y(y0)), toX(unit.X(x1)), toZ(unit.Y(y1))]

function hole(c: Coffer, { inset: [w, n, e, s] }: Step) {
  const [x0, z0, x1, z1] = bounds(c)
  return [x0 + w, z0 + n, x1 - e, z1 - s]
}

function outline(p: Path, [x0, z0, x1, z1]: number[], r: number) {
  p.moveTo(x0 + r, z0)
  p.lineTo(x1 - r, z0)
  if (r) p.absarc(x1 - r, z0 + r, r, -Math.PI / 2, 0, false)
  p.lineTo(x1, z1 - r)
  if (r) p.absarc(x1 - r, z1 - r, r, 0, Math.PI / 2, false)
  p.lineTo(x0 + r, z1)
  if (r) p.absarc(x0 + r, z1 - r, r, Math.PI / 2, Math.PI, false)
  p.lineTo(x0, z0 + r)
  if (r) p.absarc(x0 + r, z0 + r, r, Math.PI, Math.PI * 1.5, false)
  return p
}

function inside(x: number, z: number, [x0, z0, x1, z1]: number[], r: number) {
  if (x < x0 || x > x1 || z < z0 || z > z1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cz = Math.min(Math.max(z, z0 + r), z1 - r)
  return (x - cx) ** 2 + (z - cz) ** 2 <= r * r
}

/** Height of the ceiling at (x, z): a false-ceiling soffit on /dmr, otherwise the slab. */
export function soffitAt(x: number, z: number) {
  if (!DMR) return CEILING
  for (const f of FLATS) {
    const [x0, z0, x1, z1] = flatBounds(f)
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return f.y
  }
  for (const c of COFFERS) {
    let outer = bounds(c)
    let r = 0
    if (!inside(x, z, outer, r)) continue
    for (const s of c.steps) {
      const h = hole(c, s)
      if (!inside(x, z, h, s.r)) return s.y
      ;[outer, r] = [h, s.r]
    }
  }
  return CEILING
}

/** A ring hanging from the slab to `y`: the shape is laid in (x, z) and extruded downwards. */
function ring(outer: number[], r0: number, inner: number[], r1: number, y: number): BufferGeometry {
  const shape = outline(new Shape(), outer, r0) as Shape
  shape.holes.push(outline(new Path(), inner, r1))
  return new ExtrudeGeometry(shape, { depth: CEILING - y, bevelEnabled: false, curveSegments: 12 })
    .rotateX(Math.PI / 2)
    .translate(0, CEILING, 0)
}

/** Indirect cove light: a thin lit band on the riser between the first two steps of a coffer. */
function cove(c: Coffer): BufferGeometry {
  const [s0, s1] = c.steps
  const [x0, z0, x1, z1] = hole(c, s0)
  const e = 0.006
  const shape = outline(new Shape(), [x0, z0, x1, z1], s0.r) as Shape
  shape.holes.push(outline(new Path(), [x0 + e, z0 + e, x1 - e, z1 - e], s0.r - e))
  return new ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false, curveSegments: 12 })
    .rotateX(Math.PI / 2)
    .translate(0, s1.y - 0.005, 0)
}

function painted(parts: Parts, { rect: [px0, py0, px1, py1], key, band, walls }: Painted) {
  const [x0, z0, x1, z1] = [toX(unit.X(px0)), toZ(unit.Y(py0)), toX(unit.X(px1)), toZ(unit.Y(py1))]
  const [lx, hx, lz, hz] = [Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)]
  const t = 0.0015
  const [y0, y1] = [CEILING - band, CEILING - t]
  const boxes: Box[] = [{ min: [lx + t, y1, lz + t], max: [hx - t, CEILING - 0.0005, hz - t] }]
  for (const [a0, b0, a1, b1] of walls) {
    const [wx0, wz0, wx1, wz1] = [toX(unit.X(a0)), toZ(unit.Y(b0)), toX(unit.X(a1)), toZ(unit.Y(b1))]
    if (wz0 === wz1) {
      // Offset off the wall into the room, towards the room's middle.
      const z = wz0 + (wz0 === lz ? 0.0005 : -0.0015)
      boxes.push({ min: [Math.min(wx0, wx1), y0, z], max: [Math.max(wx0, wx1), y1, z + 0.001] })
    } else {
      const x = wx0 + (wx0 === lx ? 0.0005 : -0.0015)
      boxes.push({ min: [x, y0, Math.min(wz0, wz1)], max: [x + 0.001, y1, Math.max(wz0, wz1)] })
    }
  }
  add(parts, key, boxesToGeometry(boxes))
}

export function buildCeilings(): Built {
  const parts: Parts = {}
  painted(parts, MASTER)
  for (const f of FLATS) {
    const [x0, z0, x1, z1] = flatBounds(f)
    add(parts, f.key, boxesToGeometry([{ min: [Math.min(x0, x1), f.y, Math.min(z0, z1)], max: [Math.max(x0, x1), CEILING - 0.0005, Math.max(z0, z1)] }]))
  }
  for (const c of COFFERS) {
    let outer = bounds(c)
    let r = 0
    for (const s of c.steps) {
      const h = hole(c, s)
      add(parts, c.key, ring(outer, r, h, s.r, s.y))
      ;[outer, r] = [h, s.r]
    }
    add(parts, 'glow', cove(c))
    const [x0, z0, x1, z1] = outer
    if (c.grid) {
      const [cols, rows] = c.grid
      const [g, y0] = [0.005, CEILING - 0.002]
      const lines: Box[] = []
      for (let i = 1; i < cols; i++) {
        const x = x0 + ((x1 - x0) * i) / cols
        lines.push({ min: [x - g, y0, z0], max: [x + g, CEILING - 0.0005, z1] })
      }
      for (let i = 1; i < rows; i++) {
        const z = z0 + ((z1 - z0) * i) / rows
        lines.push({ min: [x0, y0, z - g], max: [x1, CEILING - 0.0005, z + g] })
      }
      add(parts, 'groove', boxesToGeometry(lines))
    }
  }
  return { parts, colliders: [] }
}
