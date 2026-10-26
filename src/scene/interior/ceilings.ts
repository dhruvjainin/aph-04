import { BufferGeometry, ExtrudeGeometry, Path, Shape } from 'three'
import { boxesToGeometry, type Box } from '../geometry'
import { CEILING, DMR, toX, toZ, unitById, type Rect } from '../plan'
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
  /** Tints the exposed slab inside the innermost hole. */
  slab?: Key
  /** Shadow grooves on the slab, as [columns, rows]. */
  grid?: [number, number]
}

const LIVING: Coffer = {
  rect: [192, 289, 447, 527],
  key: 'paint',
  steps: [
    { inset: [0.55, 0.5, 0.45, 0.5], r: 0.45, y: 2.55 },
    { inset: [0.67, 0.62, 0.57, 0.62], r: 0.33, y: 2.65 },
  ],
  grid: [4, 3],
}

const MASTER: Coffer = {
  rect: [192, 37, 499, 277],
  key: 'terracotta',
  steps: [{ inset: [0.45, 0.45, 0.45, 0.45], r: 0, y: 2.42 }],
  slab: 'terracotta',
}

const COFFERS = [LIVING, MASTER]

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

export function buildCeilings(): Built {
  const parts: Parts = {}
  for (const c of COFFERS) {
    let outer = bounds(c)
    let r = 0
    for (const s of c.steps) {
      const h = hole(c, s)
      add(parts, c.key, ring(outer, r, h, s.r, s.y))
      ;[outer, r] = [h, s.r]
    }
    const [x0, z0, x1, z1] = outer
    const y = CEILING - 0.003
    if (c.slab) add(parts, c.slab, boxesToGeometry([{ min: [x0, y, z0], max: [x1, CEILING - 0.0005, z1] }]))
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
