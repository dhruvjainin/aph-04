import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { Box } from '../geometry'
import { CEILING, toX, toZ, unitById } from '../plan'
import { add, cavity, drawer, frame, lbox, panel, shutter, type Built, type Moving, type Parts } from './kit'

// Foyer, flat 04 on /dmr, on the kitchen's north wall facing the entry: a cane-fronted tall unit over a
// floating shoe cabinet, a teak bench ending in a turned pillar, ceiling rafters and two brass lanterns.
// Local frame: x runs east → west from the entry-side corner, z comes north off the wall into the foyer.

const unit = unitById('04')
const H = CEILING - 0.001
const WX = toX(unit.X(816))
const WZ = toZ(unit.Y(392))
const L = WX - toX(unit.X(626))
/** Wall to the foyer's north wall. */
const DEPTH = WZ - toZ(unit.Y(289))

const D = 0.43
const TALL = 0.48
const CAB = 1.78
const TOP = 0.91
const SEAT = { y: 0.42, t: 0.05, out: 0.5 }
const PILLAR = { s: L - 0.25, out: 0.41 }
const RAFTERS = [0.4, 1.1, 1.8, PILLAR.s]
const LANTERNS = [0.75, 2.15].map((s) => ({ s, out: 0.6 }))

/** Where the lanterns hang, in world metres. */
export const LANTERN_AT = LANTERNS.map(({ s, out }) => ({ x: WX - s, z: WZ - out }))

const f = frame([WX, 0, WZ], [-1, 0, 0], [0, 0, -1])
const lathe = (pts: number[][], segments = 32) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), segments)

/** Deterministic PRNG so the twigs are the same every load. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

/** Thin cylinder from a to b in local coordinates. */
function rod(a: Vector3, b: Vector3, r0: number, r1 = r0, sides = 6) {
  const d = b.clone().sub(a)
  const g = new CylinderGeometry(r1, r0, d.length(), sides).translate(0, d.length() / 2, 0)
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()))
  return g.translate(a.x, a.y, a.z)
}

function cabinetry(parts: Parts, moving: Moving[]): Box[] {
  const g = 0.004
  const teak: Box[] = [
    // Top slab, cabinet end panel and the tall unit's frame.
    lbox(0, CAB, TOP - 0.03, TOP, 0, D),
    lbox(CAB - 0.02, CAB, 0.1, TOP - 0.03, 0, D),
    lbox(TALL - 0.02, TALL, TOP, H, 0, D),
    lbox(0, 0.04, TOP, H, D - 0.03, D),
    lbox(TALL - 0.04, TALL - 0.02, TOP, H, D - 0.03, D),
    lbox(0.04, TALL - 0.04, TOP, TOP + 0.04, D - 0.03, D),
    lbox(0.04, TALL - 0.04, H - 0.06, H, D - 0.03, D),
  ]
  // Four columns: a tall door over a drawer.
  const w = (CAB - 0.02) / 4
  for (let i = 0; i < 4; i++) {
    const [a, b] = [i * w + g / 2, (i + 1) * w - g / 2]
    const leaf = [lbox(a, b, 0.27 + g / 2, TOP - 0.03 - g, D - 0.02, D)]
    moving.push(i % 2 ? shutter(f, leaf, b, D, 'right') : shutter(f, leaf, a, D, 'left'))
    moving.push(drawer(f, a, b, 0.1 + g, 0.27 - g / 2, D - 0.02, D))
  }
  const reveal = [lbox(0, CAB - 0.02, 0.1, 0.27, 0, D - 0.02), lbox(0.02, CAB - 0.02, 0, 0.1, 0, D - 0.1), lbox(0.04, TALL - 0.04, TOP, H, 0, D - 0.04)]
  const cream = [...cavity(0, 2 * w, 0.27, TOP - 0.03, D - 0.02), ...cavity(2 * w, CAB - 0.02, 0.27, TOP - 0.03, D - 0.02)]
  const cane = f.place(panel(TALL - 0.08, H - 0.06 - TOP - 0.04).translate(TALL / 2, TOP + 0.04, D - 0.035))

  add(parts, 'teak', f.boxes(teak, 1.4))
  add(parts, 'reveal', f.boxes(reveal))
  add(parts, 'cream', f.boxes(cream, 2.2))
  add(parts, 'cane', cane)
  return [f.box(lbox(0, CAB, 0, H, 0, D))]
}

function bench(parts: Parts): Box[] {
  const { s: P, out: O } = PILLAR
  const top = SEAT.y + SEAT.t
  const teak: Box[] = [
    lbox(CAB, L, SEAT.y, top, 0, SEAT.out),
    lbox(CAB, L, 0, SEAT.y, 0, SEAT.out - 0.08),
    lbox(CAB, L, top, TOP, 0, 0.025),
    // Pillar plinth below the seat, a block above it, and the abacus meeting the rafter.
    lbox(P - 0.11, P + 0.11, 0, SEAT.y, O - 0.11, O + 0.11),
    lbox(P - 0.1, P + 0.1, top, 0.72, O - 0.1, O + 0.1),
    lbox(P - 0.11, P + 0.11, 2.5, H - 0.14, O - 0.11, O + 0.11),
  ]
  const shaft = lathe([
    [0, 0.72], [0.1, 0.72], [0.1, 0.75], [0.085, 0.77], [0.095, 0.8], [0.095, 0.83], [0.08, 0.86], [0.085, 0.9],
    [0.075, 0.95], [0.07, 1.5], [0.065, 2.05], [0.075, 2.08], [0.075, 2.11], [0.065, 2.13], [0.08, 2.17],
    [0.07, 2.2], [0.075, 2.3], [0.095, 2.4], [0.105, 2.47], [0.105, 2.5], [0, 2.5],
  ]).translate(P, 0, O)

  const rafters = RAFTERS.map((s) => lbox(s - 0.05, s + 0.05, H - 0.14, H, s < TALL ? D : 0, DEPTH))

  add(parts, 'teak', f.boxes([...teak, ...rafters], 1.4), f.place(shaft))
  return [f.box(lbox(CAB, L, 0, 0.9, 0, SEAT.out)), f.box(lbox(P - 0.11, P + 0.11, 0, H, O - 0.11, O + 0.11))]
}

function lantern(parts: Parts, s: number, o: number) {
  const brass: BufferGeometry[] = [
    new CylinderGeometry(0.06, 0.06, 0.015, 24).translate(0, H - 0.008, 0),
    lathe([[0, 2.32], [0.012, 2.32], [0.012, 2.3], [0.09, 2.28], [0.09, 2.27], [0, 2.27]]),
    new CylinderGeometry(0.068, 0.068, 0.012, 32).translate(0, 2.125, 0),
    new TorusGeometry(0.097, 0.004, 6, 40).rotateX(Math.PI / 2).translate(0, 2.07, 0),
    new SphereGeometry(0.015, 12, 8).translate(0, 1.85, 0),
    new CylinderGeometry(0.004, 0.004, 0.19, 6).translate(0, 2.025, 0),
    new CylinderGeometry(0.035, 0.03, 0.012, 16).translate(0, 1.93, 0),
  ]
  // Chain of alternating links up to the ceiling, and three short chains down to the band.
  for (let y = 2.33, i = 0; y < H - 0.02; y += 0.026, i++)
    brass.push(new TorusGeometry(0.009, 0.0022, 4, 10).rotateY((i % 2) * (Math.PI / 2)).translate(0, y + 0.009, 0))
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3
    brass.push(rod(new Vector3(Math.cos(a) * 0.08, 2.27, Math.sin(a) * 0.08), new Vector3(Math.cos(a) * 0.066, 2.13, Math.sin(a) * 0.066), 0.002))
  }
  const glass = lathe([[0.066, 2.12], [0.095, 2.07], [0.1, 2.0], [0.09, 1.92], [0.065, 1.88], [0.035, 1.865], [0, 1.86]], 40)
  const candles: BufferGeometry[] = []
  const flames: BufferGeometry[] = []
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3
    const [x, z] = [Math.cos(a) * 0.022, Math.sin(a) * 0.022]
    candles.push(new CylinderGeometry(0.008, 0.008, 0.05, 10).translate(x, 1.961, z))
    flames.push(new ConeGeometry(0.005, 0.016, 8).translate(x, 1.994, z))
  }
  const at = (g: BufferGeometry) => f.place(g.translate(s, 0, o))
  add(parts, 'brass', ...brass.map(at))
  add(parts, 'glass', at(glass))
  add(parts, 'disc', ...candles.map(at))
  add(parts, 'flame', ...flames.map(at))
}

/** Black jug on the cabinet with a spray of dry twigs. */
function jug(parts: Parts) {
  const [s, o] = [1.52, 0.2]
  const body = lathe([[0, 0], [0.05, 0], [0.075, 0.04], [0.085, 0.1], [0.07, 0.16], [0.042, 0.2], [0.04, 0.23], [0.05, 0.25], [0.045, 0.255], [0, 0.255]])
  const handle = new TorusGeometry(0.045, 0.008, 8, 16, Math.PI).rotateZ(-Math.PI / 2).translate(0.045, 0.165, 0)
  const rand = rng(7)
  const twigs: BufferGeometry[] = []
  for (let i = 0; i < 11; i++) {
    const fan = (i / 10 - 0.5) * 1.6 + (rand() - 0.5) * 0.25
    const len = 0.3 + rand() * 0.28
    const dir = new Vector3(Math.sin(fan), Math.cos(fan), (rand() - 0.5) * 0.4).normalize()
    const a = new Vector3(0, 0.24, 0)
    const b = a.clone().addScaledVector(dir, len)
    twigs.push(rod(a, b, 0.0025, 0.0012, 4))
    for (let k = 0; k < 9; k++) {
      const p = a.clone().lerp(b, 0.35 + rand() * 0.65)
      p.add(new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.05))
      twigs.push(rod(a.clone().lerp(b, 0.3 + rand() * 0.4), p, 0.0012, 0.0008, 3), new IcosahedronGeometry(0.006, 0).translate(p.x, p.y, p.z))
    }
  }
  const at = (g: BufferGeometry) => f.place(g.translate(s, TOP, o))
  add(parts, 'ceramic', at(body), at(handle))
  add(parts, 'twig', ...twigs.map(at))
}

export function buildFoyer(): Built {
  const parts: Parts = {}
  const moving: Moving[] = []
  const colliders = [...cabinetry(parts, moving), ...bench(parts)]
  for (const { s, out } of LANTERNS) lantern(parts, s, out)
  jug(parts)
  return { parts, colliders, moving }
}
