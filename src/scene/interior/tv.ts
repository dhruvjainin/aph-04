import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, LatheGeometry, PlaneGeometry, Shape, Vector2 } from 'three'
import { boxesToGeometry, type Box } from '../geometry'
import { toX, toZ, unitById } from '../plan'
import { add, type Built, type Parts } from './kit'

// TV wall and low cabinet on the Living's south wall (shared with the Kids Room), flat 04 on /dmr: a plain wall with
// a thin teak arch (rounded top corners, open at the bottom), a wall-hung TV, and a long floating wood cabinet.
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

/** Floating cabinet, rounded at both front corners. */
const C = { s0: 0.02, s1: L - 0.02, y0: 0.08, y1: 0.38, d1: 0.4, r: 0.2 }
/** Thin teak arch on the wall, standing on the cabinet. */
const ARCH = { inset: 0.3, top: 1.9, w: 0.03, d: 0.012, r: 0.33 }
const TV = { s: L / 2, y: 1.05, w: 1.08, h: 0.63, t: 0.03 }
const LAMP = { s: 0.17, d: 0.22 }

/** Deterministic PRNG so the grooves are the same every load. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

/** A jittered grid of thin grooves over the whole wall, each segment kept at random so the grid looks irregular. */
function grooves(): Box[] {
  const rnd = rng(23)
  const steps = (from: number, to: number, lo: number, hi: number) => {
    const v = [from]
    while (v[v.length - 1] + lo < to) v.push(Math.min(to, v[v.length - 1] + lo + rnd() * (hi - lo)))
    return v
  }
  const [g, d0, d1, top] = [0.0025, 0.001, 0.003, 2.55]
  const xs = steps(0.2, L - 0.2, 0.3, 0.7)
  const ys = steps(C.y1, top, 0.3, 0.6)
  const out: Box[] = []
  for (const s of xs.slice(1, -1)) {
    for (let i = 0; i < ys.length - 1; i++) if (rnd() < 0.7) out.push(box(s - g, s + g, ys[i], ys[i + 1], d0, d1))
  }
  for (const y of ys.slice(1, -1)) {
    for (let i = 0; i < xs.length - 1; i++) if (rnd() < 0.7) out.push(box(xs[i], xs[i + 1], y - g, y + g, d0, d1))
  }
  return out
}

function arch() {
  const { inset, top, w, d, r } = ARCH
  const [a, b, y0] = [XE - inset, XE - (L - inset), C.y1]
  const sh = new Shape()
  sh.moveTo(a, y0)
  sh.lineTo(a, top - r)
  sh.quadraticCurveTo(a, top, a - r, top)
  sh.lineTo(b + r, top)
  sh.quadraticCurveTo(b, top, b, top - r)
  sh.lineTo(b, y0)
  sh.lineTo(b + w, y0)
  sh.lineTo(b + w, top - r)
  sh.quadraticCurveTo(b + w, top - w, b + r, top - w)
  sh.lineTo(a - r, top - w)
  sh.quadraticCurveTo(a - w, top - w, a - w, top - r)
  sh.lineTo(a - w, y0)
  sh.closePath()
  return new ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, ZW - d)
}

export function buildTvUnit(): Built {
  const tv = box(TV.s - TV.w / 2, TV.s + TV.w / 2, TV.y - TV.h / 2, TV.y + TV.h / 2, 0.01, 0.01 + TV.t)
  const screen = new PlaneGeometry(TV.w - 0.02, TV.h - 0.02)
    .rotateY(Math.PI)
    .translate(XE - TV.s, TV.y, ZW - 0.01 - TV.t - 0.001)

  const [lx, lz] = [XE - LAMP.s, ZW - LAMP.d]
  const lampY = C.y1
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
  ).translate(lx, lampY, lz)
  const shade = new CylinderGeometry(0.08, 0.108, 0.17, 40, 1, true).translate(lx, lampY + 0.225 + 0.06, lz)

  const parts: Parts = {}
  add(parts, 'bezel', boxesToGeometry([tv]))
  add(parts, 'screen', screen)
  add(parts, 'groove', boxesToGeometry(grooves()))
  add(parts, 'teak', arch(), ...rounded(C.s0, C.s1, C.y0, C.y1, 0.02, C.d1, C.r, C.r))
  add(parts, 'ceramic', vase)
  add(parts, 'shade', shade)
  return { parts, colliders: [box(C.s0, C.s1, 0, C.y1, 0, C.d1)] }
}
