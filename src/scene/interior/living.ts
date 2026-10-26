import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { boxesToGeometry, type Box } from '../geometry'
import { toX, toZ, unitById } from '../plan'
import { soffitAt } from './ceilings'
import { add, lbox, merge, roundedRect, type Built, type Parts } from './kit'

// Living, flat 04 on /dmr: a cream sofa on the north wall under a night-forest painting, a paper lantern and a
// potted plant by the curtained slider, a tiled teak coffee table on brass, two grey armchairs facing west
// from the dining side, and a black side table with a lamp. The TV unit on the south wall lives in tv.ts.
// Local coordinates: x runs east from the west wall face, z runs south from the north wall face.

const unit = unitById('04')
const X0 = toX(unit.X(192))
const Z0 = toZ(unit.Y(289))
const W = toX(unit.X(447)) - X0
/** North end of the slider, from the north wall. */
const SLIDER = toZ(unit.Y(326)) - Z0

const SOFA = { x0: 0.8, x1: 2.98, d: 0.95, seat: 0.45, arm: 0.62, back: 0.9 }
const SOFA_MID = (SOFA.x0 + SOFA.x1) / 2
const ART = { x: SOFA_MID - 0.3, w: 1.1, y0: 1.0, y1: 2.35 }
const TABLE = { x: SOFA_MID, z: SOFA.d + 0.42 + 0.33, cols: 3, rows: 2, w: 0.4, d: 0.32, gap: 0.015 }
const SIDE = { x: 3.24, z: 0.32, r: 0.2, h: 0.56 }
const PLANT = { x: 0.5, z: 0.42 }
const LANTERN = { x: 0.62, z: 0.82, y: 1.78, r: 0.27 }
const CHAIRS = [1.32, 2.04].map((z) => ({ x: W - 0.36, z }))

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
  const s = new Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(w, len * 0.45, 0, len)
  s.quadraticCurveTo(-w, len * 0.45, 0, 0)
  return new ShapeGeometry(s, 3)
}

function plant(parts: Parts): Box[] {
  const { x, z } = PLANT
  const pot = 0.38
  add(parts, 'ceramic', new CylinderGeometry(0.2, 0.16, pot, 6).translate(0, pot / 2, 0).applyMatrix4(at(x, 0, z)))
  add(parts, 'reveal', new CylinderGeometry(0.18, 0.18, 0.01, 6).applyMatrix4(at(x, pot - 0.03, z)))

  const rand = rng(41)
  const stems: BufferGeometry[] = []
  const leaves: BufferGeometry[] = []
  const leaf = leafShape(0.2, 0.022)
  const q = new Quaternion()
  const m = new Matrix4()
  for (let s = 0; s < 4; s++) {
    const lean = new Vector3((rand() - 0.5) * 0.35, 1, (rand() - 0.5) * 0.35).normalize()
    const base = new Vector3((rand() - 0.5) * 0.1, pot - 0.03, (rand() - 0.5) * 0.1)
    const tip = base.clone().addScaledVector(lean, 0.85 + rand() * 0.55)
    stems.push(rod(base, tip, 0.012, 0.006, 6))
    for (let i = 0; i < 46; i++) {
      const t = 0.3 + rand() * 0.7
      const p = base.clone().lerp(tip, t)
      // Leaves arch out and down from the stem, denser and longer near the top.
      const yaw = rand() * Math.PI * 2
      const droop = 0.5 + rand() * 1.1
      q.setFromAxisAngle(new Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), droop)
      q.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI))
      const k = 0.6 + t * 0.6
      m.compose(p, q, new Vector3(k, k, k))
      leaves.push(leaf.clone().applyMatrix4(m))
    }
  }
  leaf.dispose()
  add(parts, 'twig', ...stems.map((g) => g.applyMatrix4(at(x, 0, z))))
  add(parts, 'leaf', ...leaves.map((g) => g.applyMatrix4(at(x, 0, z))))
  return [local(lbox(x - 0.2, x + 0.2, 0, 1.2, z - 0.2, z + 0.2))]
}

/** A pleated panel hanging along the west wall, `d` off it, from z0 to z1. */
function curtain(z0: number, z1: number, d: number, pleats: number, amp: number, seed: number) {
  const top = soffitAt(X0 + 0.05, Z0 + (z0 + z1) / 2) - 0.02
  const w = z1 - z0
  const g = new PlaneGeometry(w, top - 0.01, pleats * 8, 6)
  const pos = g.attributes.position
  const rand = rng(seed)
  const jitter = Array.from({ length: pleats * 8 + 1 }, () => (rand() - 0.5) * 0.3)
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + w / 2) / w
    const col = Math.round(u * pleats * 8)
    pos.setZ(i, amp * (Math.sin(u * pleats * Math.PI * 2) + jitter[col]))
  }
  g.computeVertexNormals()
  return g.rotateY(Math.PI / 2).applyMatrix4(at(d, (top + 0.01) / 2, (z0 + z1) / 2))
}

function curtains(parts: Parts) {
  add(parts, 'sheer', curtain(0.12, SLIDER + 0.85, 0.1, 9, 0.025, 7))
  add(parts, 'linen', curtain(0.05, 0.55, 0.19, 5, 0.035, 11))
  // Tassel trim down the linen's leading edge.
  const beads: BufferGeometry[] = []
  for (let y = 0.25; y < 2.4; y += 0.075) beads.push(new SphereGeometry(0.012, 8, 6).scale(1, 1.6, 1).applyMatrix4(at(0.19, y, 0.565)))
  add(parts, 'tassel', ...beads)
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
  curtains(parts)
  const colliders = [...sofa(parts), ...plant(parts), ...coffeeTable(parts), ...sideTable(parts), ...armchairs(parts)]
  return { parts, colliders }
}
