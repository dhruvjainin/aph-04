import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SplineCurve,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { boxesToGeometry, type Box } from '../geometry'
import { toX, toZ, unitById } from '../plan'
import { soffitAt } from './ceilings'
import { add, lbox, merge, roundedRect, type Built, type Moving, type Parts } from './kit'

// Living, flat 04 on /dmr: a cream sofa on the north wall under a night-forest painting, a paper lantern and a
// potted plant by the curtained slider, a tiled teak coffee table on brass, two grey armchairs facing west
// from the dining side, and a black side table with a lamp. The TV unit on the south wall lives in tv.ts.
// Local coordinates: x runs east from the west wall face, z runs south from the north wall face.

const unit = unitById('04')
const X0 = toX(unit.X(192))
const Z0 = toZ(unit.Y(289))
const W = toX(unit.X(447)) - X0

const SOFA = { x0: 0.8, x1: 2.98, d: 0.95, seat: 0.45, arm: 0.62, back: 0.9 }
const SOFA_MID = (SOFA.x0 + SOFA.x1) / 2
const ART = { x: SOFA_MID - 0.3, w: 1.1, y0: 1.0, y1: 2.35 }
const TABLE = { x: SOFA_MID - 0.24, z: SOFA.d + 0.42 + 0.33, cols: 3, rows: 2, w: 0.4, d: 0.32, gap: 0.015 }
const SIDE = { x: 3.24, z: 0.32, r: 0.2, h: 0.56 }
const PLANT = { x: 0.5, z: 0.42 }
const LANTERN = { x: 0.62, z: 0.82, y: 1.78, r: 0.27 }
const CHAIRS = [1.32, 2.04].map((z) => ({ x: W - 0.7, z }))

const at = (x: number, y: number, z: number) => new Matrix4().makeTranslation(X0 + x, y, Z0 + z)
const local = (b: Box): Box => ({ min: [X0 + b.min[0], b.min[1], Z0 + b.min[2]], max: [X0 + b.max[0], b.max[1], Z0 + b.max[2]] })
const lathe = (pts: number[][], segments = 40) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), segments)

/** Rounded box from local min/max corners. */
function soft(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r: number) {
  const [w, h, d] = [x1 - x0, y1 - y0, z1 - z0]
  return new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) - 1e-4).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
}

/** Cylinder from a to b. */
function rod(a: Vector3, b: Vector3, r0: number, r1 = r0, sides = 10) {
  const d = b.clone().sub(a)
  const g = new CylinderGeometry(r1, r0, d.length(), sides).translate(0, d.length() / 2, 0)
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()))
  return g.translate(a.x, a.y, a.z)
}

/** Deterministic PRNG so the plant and curtains are the same every load. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

// ─── sofa ───────────────────────────────────────────────────────────────────

function sofa(parts: Parts): Box[] {
  const { x0, x1, d, seat, arm, back } = SOFA
  const a = 0.2
  const [i0, i1] = [x0 + a, x1 - a]
  const half = (i1 - i0) / 2
  const fabric: BufferGeometry[] = [
    soft(x0 + 0.01, x1 - 0.01, 0.06, 0.3, 0.02, d, 0.04),
    soft(x0, x0 + a, 0.06, arm, 0.02, d, 0.06),
    soft(x1 - a, x1, 0.06, arm, 0.02, d, 0.06),
    soft(i0, i1, 0.3, 0.62, 0.02, 0.22, 0.05),
    ...[0, 1].map((i) => soft(i0 + i * half + 0.005, i0 + (i + 1) * half - 0.005, 0.3, seat, 0.3, d + 0.01, 0.06)),
  ]
  // Three loose back cushions leaning back, then four scatter pillows.
  const third = (i1 - i0) / 3
  for (let i = 0; i < 3; i++)
    fabric.push(
      soft(-third / 2 + 0.008, third / 2 - 0.008, -0.24, 0.24, -0.1, 0.1, 0.08)
        .rotateX(-0.12)
        .translate(i0 + (i + 0.5) * third, back - 0.24, 0.32),
    )
  const pillows: [x: number, z: number, yaw: number, w: number][] = [
    [i0 + 0.22, 0.47, 0.25, 0.42],
    [i0 + 0.55, 0.5, 0.1, 0.46],
    [i1 - 0.55, 0.5, -0.1, 0.46],
    [i1 - 0.2, 0.47, -0.25, 0.4],
  ]
  for (const [x, z, yaw, w] of pillows)
    fabric.push(soft(-w / 2, w / 2, -w / 2, w / 2, -0.07, 0.07, 0.06).rotateX(-0.28).rotateY(yaw).translate(x, seat + w / 2 - 0.02, z))
  const legs = [x0 + 0.08, x1 - 0.08].flatMap((x) => [0.1, d - 0.08].map((z) => new CylinderGeometry(0.02, 0.018, 0.06, 10).translate(x, 0.03, z)))

  add(parts, 'fabric', ...fabric.map((g) => g.applyMatrix4(at(0, 0, 0))))
  add(parts, 'bezel', ...legs.map((g) => g.applyMatrix4(at(0, 0, 0))))
  return [local(lbox(x0, x1, 0, back - 0.1, 0, d))]
}

// ─── painting, lantern, plant, curtains ────────────────────────────────────

function painting(parts: Parts) {
  const { x, w, y0, y1 } = ART
  const t = 0.03
  add(parts, 'reveal', boxesToGeometry([local(lbox(x - w / 2, x + w / 2, y0, y1, 0.001, t))]))
  add(parts, 'art', new PlaneGeometry(w, y1 - y0).applyMatrix4(at(x, (y0 + y1) / 2, t + 0.001)))
}

function lantern(parts: Parts) {
  const { x, z, y, r } = LANTERN
  const squash = 0.78
  add(parts, 'shade', new SphereGeometry(r, 36, 18).scale(1, squash, 1).applyMatrix4(at(x, y, z)))
  // Rib wires showing through the paper.
  const ribs: BufferGeometry[] = []
  for (let i = -4; i <= 4; i++) {
    const lat = (i / 5) * (Math.PI / 2)
    ribs.push(new TorusGeometry(r * Math.cos(lat) + 0.001, 0.0018, 4, 48).rotateX(Math.PI / 2).applyMatrix4(at(x, y + r * squash * Math.sin(lat), z)))
  }
  add(parts, 'groove', ...ribs)
  const top = y + r * squash
  const ceiling = soffitAt(X0 + x, Z0 + z)
  add(parts, 'bezel', new CylinderGeometry(0.003, 0.003, ceiling - top, 6).applyMatrix4(at(x, (ceiling + top) / 2, z)))
  add(parts, 'bezel', new CylinderGeometry(0.04, 0.04, 0.012, 20).applyMatrix4(at(x, ceiling - 0.006, z)))
}

function leafShape(len: number, w: number) {
  // Violin outline: narrow at the stalk, widest at three quarters, rounded tip.
  const half = new SplineCurve(
    [[0, 0], [0.08, 0.12], [0.28, 0.2], [0.45, 0.3], [0.62, 0.65], [0.76, 1], [0.9, 0.82], [0.97, 0.42], [1, 0]].map(([t, k]) => new Vector2(k * (w / 2), t * len)),
  ).getPoints(30)
  const s = new Shape([...half, ...half.slice(1, -1).reverse().map((p) => new Vector2(-p.x, p.y))])
  return new ShapeGeometry(s, 3)
}

function plant(parts: Parts): Box[] {
  const { x, z } = PLANT
  const pot = 0.36
  add(parts, 'ceramic', new CylinderGeometry(0.21, 0.17, pot, 24).translate(0, pot / 2, 0).applyMatrix4(at(x, 0, z)))
  add(parts, 'reveal', new CylinderGeometry(0.19, 0.19, 0.01, 24).applyMatrix4(at(x, pot - 0.03, z)))

  // Fiddle-leaf fig: one slim trunk with a leaning top, big violin leaves on short stalks, mostly in the upper half.
  const rand = rng(41)
  const stems: BufferGeometry[] = []
  const leaves: BufferGeometry[] = []
  const leaf = leafShape(0.27, 0.17)
  const base = new Vector3(0, pot - 0.03, 0)
  const tip = new Vector3(0.05, 1.8, -0.02)
  stems.push(rod(base, tip, 0.017, 0.008, 8))
  const q = new Quaternion()
  const m = new Matrix4()
  const turn = new Quaternion()
  const up = new Vector3(0, 1, 0)
  for (let i = 0; i < 26; i++) {
    const t = 0.32 + (i / 25) * 0.68
    const p = base.clone().lerp(tip, t)
    const yaw = i * 2.4 + rand() * 0.5
    const tilt = 0.9 + rand() * 0.6
    const stalk = 0.05 + rand() * 0.03
    const outward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    const root = p.clone().addScaledVector(outward, stalk)
    stems.push(rod(p, root, 0.005, 0.004, 5))
    q.setFromAxisAngle(new Vector3(1, 0, 0), tilt)
    turn.setFromAxisAngle(up, yaw)
    q.premultiply(turn)
    const k = 0.75 + (1 - Math.abs(t - 0.65)) * 0.45
    m.compose(root, q, new Vector3(k, k, k))
    leaves.push(leaf.clone().applyMatrix4(m))
  }
  leaf.dispose()
  add(parts, 'twig', ...stems.map((g) => g.applyMatrix4(at(x, 0, z))))
  add(parts, 'leaf', ...leaves.map((g) => g.applyMatrix4(at(x, 0, z))))
  return [local(lbox(x - 0.22, x + 0.22, 0, 1.2, z - 0.22, z + 0.22))]
}

/** West wall length, north to south face. */
const LEN = toZ(unit.Y(527)) - Z0
/** Pelmet: 300 mm deep, the full wall length, open underneath; its bottom is level with the 7 ft slider head. */
const PELMET = { y0: 7 * 0.3048, d: 0.3, t: 0.018 }
/** Curtain heads sit 100 mm up inside the pelmet. */
const RAIL = { drop: 0.1, north: 0.13, south: 0.17 }
/** Open curtains bunch to this fraction of their drawn width. */
const GATHER = 0.22

const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2).applyMatrix4(at(0, 0, 0))

/** A pleated panel from `z0` to `z1` along the west wall, `d` off it, hanging from the rail to the floor; geometry is relative to (wall, 0, `pivotZ`). */
function curtain(z0: number, z1: number, d: number, seed: number, pivotZ: number, top: number) {
  const w = z1 - z0
  const pleats = Math.round(w / 0.19)
  const g = new PlaneGeometry(w, top - 0.01, pleats * 8, 6)
  const pos = g.attributes.position
  const rand = rng(seed)
  const jitter = Array.from({ length: pleats * 8 + 1 }, () => (rand() - 0.5) * 0.3)
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + w / 2) / w
    const col = Math.round(u * pleats * 8)
    pos.setZ(i, 0.03 * (Math.sin(u * pleats * Math.PI * 2) + jitter[col]))
  }
  g.computeVertexNormals()
  return g.rotateY(Math.PI / 2).translate(d, (top + 0.01) / 2, (z0 + z1) / 2 - pivotZ)
}

/** Hollow cream box from the slider head to the ceiling along the whole west wall: front and end caps only, with the rails and a COB strip inside. */
function pelmet(parts: Parts, top: number) {
  const { y0, d, t } = PELMET
  add(
    parts,
    'cream',
    slab(d - t, d, y0, top, 0, LEN),
    slab(0, d - t, y0, top, 0, t),
    slab(0, d - t, y0, top, LEN - t, LEN),
  )
  const rail = top - RAIL.drop
  add(parts, 'grey', slab(RAIL.north - 0.01, RAIL.north + 0.01, rail, rail + 0.02, t, LEN - t), slab(RAIL.south - 0.01, RAIL.south + 0.01, rail, rail + 0.02, t, LEN - t))
  add(parts, 'cob', slab(d - t - 0.025, d - t, top - 0.045, top - 0.02, 0.05, LEN - 0.05))
}

/** A split AC indoor unit hung on the pelmet's front face, centred on the wall. */
function airCon(parts: Parts) {
  const [x0, x1, y0, y1] = [PELMET.d, PELMET.d + 0.21, PELMET.y0 + 0.14, PELMET.y0 + 0.46]
  const [z0, z1] = [LEN / 2 - 0.5, LEN / 2 + 0.5]
  const m = at(0, 0, 0)
  add(parts, 'paint', soft(x0, x1, y0, y1, z0, z1, 0.06).applyMatrix4(m))
  add(parts, 'groove', slab(x1 - 0.06, x1 + 0.004, y0 + 0.012, y0 + 0.03, z0 + 0.06, z1 - 0.06))
  add(parts, 'bezel', slab(x1 - 0.002, x1 + 0.003, y1 - 0.07, y1 - 0.05, z1 - 0.13, z1 - 0.07))
}

/** Two blackout curtains meeting mid-wall; `E` bunches them to the ends. */
function curtains(parts: Parts): Moving[] {
  const top = soffitAt(X0 + 0.05, Z0 + LEN / 2)
  pelmet(parts, top)
  airCon(parts)
  const head = top - RAIL.drop
  const mid = LEN / 2
  const panel = (z0: number, z1: number, d: number, seed: number, pivotZ: number): Moving => ({
    key: 'linen',
    noun: 'curtain',
    geometry: curtain(z0, z1, d, seed, pivotZ, head),
    pivot: [X0, 0, Z0 + pivotZ],
    gather: GATHER,
  })
  return [panel(0.02, mid + 0.04, RAIL.north, 11, 0.02), panel(mid - 0.04, LEN - 0.02, RAIL.south, 7, LEN - 0.02)]
}

// ─── coffee table, side table, armchairs ───────────────────────────────────

function coffeeTable(parts: Parts): Box[] {
  const { x, z, cols, rows, w, d, gap } = TABLE
  const [tw, td] = [cols * w + (cols - 1) * gap, rows * d + (rows - 1) * gap]
  const heights = [0.4, 0.37, 0.415, 0.38, 0.425, 0.365]
  const t = 0.035
  const brass: BufferGeometry[] = []
  const tops: BufferGeometry[] = []
  const frame = 0.33
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const y = heights[r * cols + c]
      const [cx, cz] = [x - tw / 2 + w / 2 + c * (w + gap), z - td / 2 + d / 2 + r * (d + gap)]
      tops.push(
        new ExtrudeGeometry(roundedRect(w, d, 0.06), { depth: t - 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 8 })
          .rotateX(-Math.PI / 2)
          .applyMatrix4(at(cx, y - t + 0.003, cz)),
      )
      brass.push(rod(new Vector3(cx, frame, cz), new Vector3(cx, y - t, cz), 0.012))
    }
  // Sled-like brass base: rails along the long sides, cross bars, and splayed legs.
  const [ex, ez] = [tw / 2 - 0.08, td / 2 - 0.06]
  const v = (a: number, y: number, b: number) => new Vector3(x + a, y, z + b)
  for (const s of [-1, 1]) {
    brass.push(rod(v(-ex, frame, s * ez), v(ex, frame, s * ez), 0.014))
    brass.push(rod(v(-ex - 0.03, 0.02, s * ez), v(ex + 0.03, 0.02, s * ez), 0.012))
    for (const e of [-1, 1]) brass.push(rod(v(e * (ex + 0.03), 0.02, s * ez), v(e * ex, frame, s * ez), 0.014, 0.012))
  }
  for (const a of [-ex, 0, ex]) brass.push(rod(v(a, frame, -ez), v(a, frame, ez), 0.012))
  add(parts, 'teak', ...tops)
  add(parts, 'brass', ...brass.map((g) => g.applyMatrix4(at(0, 0, 0))))
  return [local(lbox(x - tw / 2, x + tw / 2, 0, 0.43, z - td / 2, z + td / 2))]
}

function sideTable(parts: Parts): Box[] {
  const { x, z, r, h } = SIDE
  const pedestal = lathe(
    [
      [0, 0],
      [0.13, 0],
      [0.13, 0.015],
      [0.06, 0.04],
      [0.03, 0.09],
      [0.022, 0.2],
      [0.028, 0.32],
      [0.02, 0.45],
      [0.03, h - 0.02],
      [r, h - 0.02],
      [r, h],
      [0, h],
    ],
    32,
  )
  const vase = lathe([
    [0, 0],
    [0.07, 0],
    [0.14, 0.06],
    [0.16, 0.15],
    [0.14, 0.24],
    [0.07, 0.3],
    [0.03, 0.31],
    [0.03, 0.34],
    [0, 0.34],
  ]).translate(0, h, 0)
  const shade = new CylinderGeometry(0.13, 0.17, 0.22, 40, 1, true).translate(0, h + 0.34 + 0.08, 0)
  add(parts, 'bezel', pedestal.applyMatrix4(at(x, 0, z)))
  add(parts, 'ceramic', vase.applyMatrix4(at(x, 0, z)))
  add(parts, 'shade', shade.applyMatrix4(at(x, 0, z)))
  return [local(lbox(x - r, x + r, 0, h, z - r, z + r))]
}

/** A mid-century armchair facing +z: teak side frames with flat arms, grey seat and back cushions. */
function armchair() {
  const teak: BufferGeometry[] = []
  const [hw, fz, bz] = [0.31, 0.3, -0.31]
  for (const s of [-1, 1]) {
    const x = s * hw
    teak.push(rod(new Vector3(x, 0, fz - 0.02), new Vector3(x, 0.6, fz), 0.019, 0.016))
    teak.push(rod(new Vector3(x, 0, bz + 0.04), new Vector3(x, 0.94, bz - 0.12), 0.019, 0.016))
    teak.push(boxesToGeometry([lbox(x - 0.025, x + 0.025, 0.585, 0.615, bz - 0.04, fz + 0.06)], { uvScale: 1.4 }))
    teak.push(boxesToGeometry([lbox(x - 0.015, x + 0.015, 0.3, 0.35, bz, fz)], { uvScale: 1.4 }))
  }
  teak.push(boxesToGeometry([lbox(-hw, hw, 0.3, 0.35, fz - 0.03, fz), lbox(-hw, hw, 0.3, 0.35, bz, bz + 0.03)], { uvScale: 1.4 }))
  teak.push(boxesToGeometry([lbox(-hw, hw, -0.025, 0.025, -0.015, 0.015)], { uvScale: 1.4 }).rotateX(-0.13).translate(0, 0.9, bz - 0.11))
  const grey = [
    soft(-hw + 0.02, hw - 0.02, 0.35, 0.46, bz + 0.04, fz + 0.02, 0.035),
    soft(-hw + 0.02, hw - 0.02, -0.25, 0.25, -0.045, 0.045, 0.035).rotateX(-0.13).translate(0, 0.67, bz - 0.02),
  ]
  return { teak: merge(teak), grey: merge(grey) }
}

function armchairs(parts: Parts): Box[] {
  const c = armchair()
  const yaws = [-Math.PI / 2 - 0.1, -Math.PI / 2 + 0.1]
  CHAIRS.forEach(({ x, z }, i) => {
    const m = at(x, 0, z).multiply(new Matrix4().makeRotationY(yaws[i]))
    add(parts, 'teak', c.teak.clone().applyMatrix4(m))
    add(parts, 'grey', c.grey.clone().applyMatrix4(m))
  })
  c.teak.dispose()
  c.grey.dispose()
  return CHAIRS.map(({ x, z }) => local(lbox(x - 0.36, x + 0.36, 0, 0.62, z - 0.33, z + 0.33)))
}

export function buildLiving(): Built {
  const parts: Parts = {}
  painting(parts)
  lantern(parts)
  const moving = curtains(parts)
  const colliders = [...sofa(parts), ...plant(parts), ...coffeeTable(parts), ...sideTable(parts), ...armchairs(parts)]
  return { parts, colliders, moving }
}
