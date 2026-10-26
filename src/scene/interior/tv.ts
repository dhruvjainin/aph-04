import { BufferGeometry, CylinderGeometry, LatheGeometry, PlaneGeometry, Vector2 } from 'three'
import { boxesToGeometry, type Box } from '../geometry'
import { toX, toZ, unitById } from '../plan'
import { add, type Built, type Parts } from './kit'

// TV wall and low cabinet on the Living's south wall (shared with the Kids Room), flat 04 on /dmr: a plain wall with
// a thin teak frame (open at the bottom) holding a grid of grey grooves, a wall-hung TV, and a long floating wood cabinet.
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
/** Thin teak frame on the wall, standing on the cabinet. Width and height in metres, centred on the wall. */
const FRAME = { w: 2, top: 2.14, t: 0.02, d: 0.015 }
const TV = { s: L / 2, y: 1.05, w: 1.08, h: 0.63, t: 0.03 }
const LAMP = { s: 0.17, d: 0.22 }

/** Grooves traced from the reference render: [x, y0, y1] verticals and [y, x0, x1] horizontals, in its pixels (278 px/m). */
const PX = 278
const FX = 777
const FY = 685
const VERT = [
  [825, 205, 520], [910, 205, 640], [950, 205, 275], [950, 315, 610], [1035, 205, 345], [1035, 345, 640],
  [1075, 205, 300], [1075, 300, 640], [1160, 205, 640], [1200, 205, 350], [1200, 350, 640], [1285, 350, 520],
]
const HORIZ = [
  [350, 825, 950], [275, 950, 1075], [315, 910, 950], [300, 1075, 1160], [520, 785, 825], [520, 1285, 1330],
  [350, 1200, 1285], [640, 910, 1200], [610, 950, 1160],
]

function grooves(): Box[] {
  const [g, d0, d1] = [0.004, 0.001, 0.003]
  const s0 = (L - FRAME.w) / 2
  const sx = (px: number) => s0 + (px - FX) / PX
  const sy = (py: number) => C.y1 + (FY - py) / PX
  return [
    ...VERT.map(([x, a, b]) => box(sx(x) - g, sx(x) + g, sy(b), sy(a), d0, d1)),
    ...HORIZ.map(([y, a, b]) => box(sx(a), sx(b), sy(y) - g, sy(y) + g, d0, d1)),
  ]
}

function frame(): Box[] {
  const { w, top, t, d } = FRAME
  const s0 = (L - w) / 2
  const s1 = s0 + w
  return [
    box(s0, s0 + t, C.y1, top, 0, d),
    box(s1 - t, s1, C.y1, top, 0, d),
    box(s0, s1, top - t, top, 0, d),
  ]
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
  add(parts, 'teak', boxesToGeometry(frame()), ...rounded(C.s0, C.s1, C.y0, C.y1, 0.02, C.d1, C.r, C.r))
  add(parts, 'ceramic', vase)
  add(parts, 'shade', shade)
  return { parts, colliders: [box(C.s0, C.s1, 0, C.y1, 0, C.d1)] }
}
