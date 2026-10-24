import { BufferAttribute, BufferGeometry } from 'three'
import {
  BEAMS,
  CEILING,
  CORRIDOR,
  FALSE_CEILING,
  KITCHEN_DADO,
  KITCHENS,
  RAILINGS,
  TOILETS,
  WALLS,
  WOOD_ZONES,
  openingHeights,
  toM,
  toX,
  toZ,
  type Opening,
  type Side,
  type Wall,
} from './plan'

export type V3 = [number, number, number]
export interface Box {
  min: V3
  max: V3
}

const TILE_SKIRT = { h: 0.1, t: 0.01 }
const WOOD_SKIRT = { h: 0.07, t: 0.012 }
const JAMB = 0.035

// ─── merged box geometry with world-projected UVs ──────────────────────────

interface GeoOptions {
  uvScale?: number
  /** Drop faces nobody can see: floor-touching bottoms and ceiling-embedded tops. */
  cullHidden?: boolean
}

export function boxesToGeometry(boxes: Box[], { uvScale = 1, cullHidden = false }: GeoOptions = {}) {
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const idx: number[] = []

  for (const { min, max } of boxes) {
    for (let a = 0; a < 3; a++) {
      for (const s of [-1, 1] as const) {
        if (cullHidden && a === 1 && s === -1 && min[1] <= 0.0001) continue
        if (cullHidden && a === 1 && s === 1 && max[1] >= CEILING - 0.0001) continue
        const b = (a + 1) % 3
        const c = (a + 2) % 3
        const plane = s > 0 ? max[a] : min[a]
        const corners: [number, number][] = [
          [min[b], min[c]],
          [max[b], min[c]],
          [max[b], max[c]],
          [min[b], max[c]],
        ]
        if (s < 0) corners.reverse()
        const base = pos.length / 3
        for (const [vb, vc] of corners) {
          const p: V3 = [0, 0, 0]
          p[a] = plane
          p[b] = vb
          p[c] = vc
          pos.push(...p)
          const n: V3 = [0, 0, 0]
          n[a] = s
          nor.push(...n)
          // Keep "v" vertical on walls so normal-map detail never smears sideways.
          if (a === 0) uv.push(p[2] / uvScale, p[1] / uvScale)
          else if (a === 1) uv.push(p[0] / uvScale, p[2] / uvScale)
          else uv.push(p[0] / uvScale, p[1] / uvScale)
        }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
      }
    }
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

export type Rect = [number, number, number, number]

/** Upward-facing floor quads (no hidden underside), UVs in metres / uvScale. */
export function floorGeometry(rects: Rect[], uvScale: number) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (const [x0, z0, x1, z1] of rects) {
    const b = pos.length / 3
    for (const [x, z] of [
      [x0, z0],
      [x0, z1],
      [x1, z1],
      [x1, z0],
    ]) {
      pos.push(x, 0, z)
      uv.push(x / uvScale, -z / uvScale)
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array(pos.map((_, i) => (i % 3 === 1 ? 1 : 0))), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

// ─── wall frame helper: (along, across, height) → world box ────────────────

export interface WallFrame {
  horizontal: boolean
  a0: number
  a1: number
  c0: number
  c1: number
  cc: number
  half: number
  box: (s0: number, s1: number, k0: number, k1: number, y0: number, y1: number) => Box
}

export function wallFrame(w: Wall): WallFrame {
  const [x0, y0, x1, y1] = w.rect
  const horizontal = x1 - x0 >= y1 - y0
  const [a0, a1] = horizontal ? [toX(x0), toX(x1)] : [toZ(y0), toZ(y1)]
  const [c0, c1] = horizontal ? [toZ(y0), toZ(y1)] : [toX(x0), toX(x1)]
  const box = (s0: number, s1: number, k0: number, k1: number, ya: number, yb: number): Box => {
    const [sa, sb] = s0 < s1 ? [s0, s1] : [s1, s0]
    const [ka, kb] = k0 < k1 ? [k0, k1] : [k1, k0]
    return horizontal ? { min: [sa, ya, ka], max: [sb, yb, kb] } : { min: [ka, ya, sa], max: [kb, yb, sb] }
  }
  return { horizontal, a0, a1, c0, c1, cc: (c0 + c1) / 2, half: (c1 - c0) / 2, box }
}

export const openingAlong = (f: WallFrame, o: Opening): [number, number] =>
  f.horizontal ? [toX(o.from), toX(o.to)] : [toZ(o.from), toZ(o.to)]

// ─── walls ─────────────────────────────────────────────────────────────────

export interface WallBuild {
  solid: Box[]
  tileSkirting: Box[]
  woodSkirting: Box[]
}

type Finish = 'tile' | 'wood' | 'none'
const FINISH_ZONES: { r: Rect; f: Finish }[] = [
  ...TOILETS.map((r) => ({ r: footprintMetres(r), f: 'none' as const })),
  ...WOOD_ZONES.map((r) => ({ r: footprintMetres(r), f: 'wood' as const })),
]
const finishAt = (x: number, z: number): Finish =>
  FINISH_ZONES.find(({ r }) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3])?.f ?? 'tile'

export function buildWalls(): WallBuild {
  const solid: Box[] = []
  const tileSkirting: Box[] = []
  const woodSkirting: Box[] = []
  const top = CEILING + 0.05

  // Skirting follows the floor finish of the room it faces: tile, dark wood, or none (tiled toilets).
  const addSkirting = (f: WallFrame, s0: number, s1: number) => {
    for (const side of [-1, 1] as const) {
      const face = side < 0 ? f.c0 : f.c1
      const probe = face + side * 0.05
      const cuts = [s0, s1]
      for (const { r } of FINISH_ZONES) {
        const [ka, kb, sa, sb] = f.horizontal ? [r[1], r[3], r[0], r[2]] : [r[0], r[2], r[1], r[3]]
        if (probe < ka || probe > kb) continue
        for (const s of [sa, sb]) if (s > s0 && s < s1) cuts.push(s)
      }
      cuts.sort((p, q) => p - q)
      for (let i = 0; i < cuts.length - 1; i++) {
        const [p, q] = [cuts[i], cuts[i + 1]]
        if (q - p < 0.001) continue
        const mid = (p + q) / 2
        const fin = f.horizontal ? finishAt(mid, probe) : finishAt(probe, mid)
        if (fin === 'tile') tileSkirting.push(f.box(p, q, face, face + side * TILE_SKIRT.t, 0, TILE_SKIRT.h))
        else if (fin === 'wood') woodSkirting.push(f.box(p, q, face, face + side * WOOD_SKIRT.t, 0, WOOD_SKIRT.h))
      }
    }
  }

  for (const w of WALLS) {
    const f = wallFrame(w)
    const openings = [...(w.openings ?? [])].sort((p, q) => p.from - q.from)
    let cursor = f.a0
    for (const o of openings) {
      const [s0, s1] = openingAlong(f, o)
      const [sill, head] = openingHeights(o)
      if (s0 > cursor) {
        solid.push(f.box(cursor, s0, f.c0, f.c1, 0, top))
        addSkirting(f, cursor, s0)
      }
      if (sill > 0) {
        solid.push(f.box(s0, s1, f.c0, f.c1, 0, sill))
        addSkirting(f, s0, s1)
      }
      solid.push(f.box(s0, s1, f.c0, f.c1, head, top))
      cursor = s1
    }
    if (f.a1 > cursor) {
      solid.push(f.box(cursor, f.a1, f.c0, f.c1, 0, top))
      addSkirting(f, cursor, f.a1)
    }
  }

  for (const { rect, soffit } of BEAMS) {
    const [x0, z0, x1, z1] = footprintMetres(rect)
    solid.push({ min: [x0, soffit, z0], max: [x1, CEILING, z1] })
  }
  return { solid, tileSkirting, woodSkirting }
}

// ─── wall cladding (toilet tiles, kitchen dado) ────────────────────────────

/** Line the inside faces of a plan rect with a thin skin, leaving holes for openings in the walls behind. */
function clad(rect: Rect, sides: Side[], y0: number, y1: number, T: number, out: Box[]) {
  const [X0, Z0, X1, Z1] = footprintMetres(rect)
  const [px0, py0, px1, py1] = rect
  for (const side of sides) {
    const horizontal = side === 'n' || side === 's'
    const face = { n: Z0, s: Z1, w: X0, e: X1 }[side]
    const inward = side === 'n' || side === 'w' ? 1 : -1
    let A0 = horizontal ? X0 : Z0
    let A1 = horizontal ? X1 : Z1
    if (!horizontal) {
      if (sides.includes('n')) A0 += T
      if (sides.includes('s')) A1 -= T
    }

    const holes: [number, number, number, number][] = []
    for (const w of WALLS) {
      const [wx0, wy0, wx1, wy1] = w.rect
      const touches = { n: wy1 === py0, s: wy0 === py1, w: wx1 === px0, e: wx0 === px1 }[side]
      const f = wallFrame(w)
      if (!touches || f.horizontal !== horizontal) continue
      for (const o of w.openings ?? []) {
        const [s0, s1] = openingAlong(f, o)
        if (s1 <= A0 || s0 >= A1) continue
        holes.push([Math.max(s0, A0), Math.min(s1, A1), ...openingHeights(o)])
      }
    }
    holes.sort((p, q) => p[0] - q[0])

    const [ka, kb] = [face, face + inward * T].sort((p, q) => p - q)
    const piece = (s0: number, s1: number, ya: number, yb: number) => {
      if (s1 - s0 < 1e-4 || yb - ya < 1e-4) return
      out.push(horizontal ? { min: [s0, ya, ka], max: [s1, yb, kb] } : { min: [ka, ya, s0], max: [kb, yb, s1] })
    }
    let cursor = A0
    for (const [s0, s1, sill, head] of holes) {
      piece(cursor, s0, y0, y1)
      piece(s0, s1, y0, Math.min(y1, sill))
      piece(s0, s1, Math.max(y0, head), y1)
      cursor = s1
    }
    piece(cursor, A1, y0, y1)
  }
}

export interface FinishBuild {
  marble: Box[]
  lilac: Box[]
  trim: Box[]
  downlights: V3[]
  dado: Box[]
}

export function buildFinishes(): FinishBuild {
  const out: FinishBuild = { marble: [], lilac: [], trim: [], downlights: [], dado: [] }
  const T = 0.008
  const FC = FALSE_CEILING
  const W = 0.03
  const H = 0.012

  for (const r of TOILETS) {
    clad(r, ['n', 's', 'w', 'e'], 0, FC, T, out.marble)
    const [X0, Z0, X1, Z1] = footprintMetres(r)
    const [x0, z0, x1, z1] = [X0 + T, Z0 + T, X1 - T, Z1 - T]
    out.lilac.push({ min: [x0, FC, z0], max: [x1, FC + 0.04, z1] })
    out.trim.push(
      { min: [x0, FC - H, z0], max: [x1, FC, z0 + W] },
      { min: [x0, FC - H, z1 - W], max: [x1, FC, z1] },
      { min: [x0, FC - H, z0 + W], max: [x0 + W, FC, z1 - W] },
      { min: [x1 - W, FC - H, z0 + W], max: [x1, FC, z1 - W] },
    )
    // PVC panels meet at a joint across the long axis; the downlight sits centred in one half.
    const alongX = x1 - x0 >= z1 - z0
    const xm = (x0 + x1) / 2
    const zm = (z0 + z1) / 2
    if (alongX) {
      out.trim.push({ min: [xm - 0.006, FC - 0.006, z0 + W], max: [xm + 0.006, FC, z1 - W] })
      out.downlights.push([(x0 + xm) / 2, FC, zm])
    } else {
      out.trim.push({ min: [x0 + W, FC - 0.006, zm - 0.006], max: [x1 - W, FC, zm + 0.006] })
      out.downlights.push([xm, FC, (z0 + zm) / 2])
    }
  }

  for (const k of KITCHENS) {
    const sides = (['n', 's', 'w', 'e'] as const).filter((s) => s !== k.open)
    clad(k.rect, sides, KITCHEN_DADO[0], KITCHEN_DADO[1], 0.006, out.dado)
  }
  return out
}

// ─── door frames, windows and railings ─────────────────────────────────────

export interface DoorSpec {
  key: string
  pivot: V3
  baseYaw: number
  openDelta: number
  width: number
  height: number
  thickness: number
  /** Local z of the leaf centre (keeps the hinge on the swing face). */
  zOffset: number
  entry: boolean
  /** Entry doors: flat number shown on the outside face. */
  label?: string
  open: boolean
  style: 'wenge' | 'upvc'
}

export interface OpeningBuild {
  /** Dark wenge door frames. */
  frames: Box[]
  /** White uPVC window and utility-door profiles. */
  upvc: Box[]
  /** Dark grey interlock mullions where window sashes meet. */
  interlock: Box[]
  steel: Box[]
  /** Black balcony railing metalwork. */
  metal: Box[]
  /** Plastered balcony upstands (drawn with the walls). */
  parapet: Box[]
  glass: Box[]
  frosted: Box[]
  colliders: Box[]
  doors: DoorSpec[]
}

const yawOf = (x: number, z: number) => Math.atan2(-z, x)

export function buildOpenings(): OpeningBuild {
  const out: OpeningBuild = {
    frames: [],
    upvc: [],
    interlock: [],
    steel: [],
    metal: [],
    parapet: [],
    glass: [],
    frosted: [],
    colliders: [],
    doors: [],
  }

  WALLS.forEach((w, wi) => {
    const f = wallFrame(w)
    for (const o of w.openings ?? []) {
      const [a0, a1] = openingAlong(f, o)
      const [sill, head] = openingHeights(o)
      if (o.kind === 'door' || o.kind === 'entry') addDoor(out, f, o, a0, a1, head, `${wi}-${o.from}`)
      else if (o.kind === 'open') out.colliders.push(f.box(a0, a1, f.cc - 0.05, f.cc + 0.05, sill, head))
      else addWindow(out, f, o, a0, a1, sill, head)
    }
  })

  for (const r of RAILINGS) addRailing(out, r)
  return out
}

function addDoor(out: OpeningBuild, f: WallFrame, o: Opening, a0: number, a1: number, head: number, key: string) {
  const { box, c0, c1 } = f
  // Slim frame with no architrave: it stands proud of both wall faces and laps onto them.
  const LIP = 0.015
  const LAP = 0.012
  const target = o.style === 'upvc' ? out.upvc : out.frames
  target.push(box(a0 - LAP, a0 + JAMB, c0 - LIP, c1 + LIP, 0, head - JAMB))
  target.push(box(a1 - JAMB, a1 + LAP, c0 - LIP, c1 + LIP, 0, head - JAMB))
  target.push(box(a0 - LAP, a1 + LAP, c0 - LIP, c1 + LIP, head - JAMB, head + LAP))

  const entry = o.kind === 'entry'
  const thickness = entry ? 0.048 : o.style === 'upvc' ? 0.05 : 0.038
  const gap = 0.003
  const width = a1 - a0 - 2 * JAMB - 2 * gap
  const height = head - JAMB - 0.012
  const dir = o.hinge === 'end' ? -1 : 1
  const swing = o.swing ?? 1
  const hingeAlong = dir > 0 ? a0 + JAMB + gap : a1 - JAMB - gap
  const hingeCross = swing > 0 ? c1 : c0

  const along: [number, number] = f.horizontal ? [dir, 0] : [0, dir]
  const across: [number, number] = f.horizontal ? [0, swing] : [swing, 0]
  const baseYaw = yawOf(along[0], along[1])
  let openDelta = yawOf(across[0], across[1]) - baseYaw
  openDelta = Math.atan2(Math.sin(openDelta), Math.cos(openDelta))

  // Local +Z in world after the base yaw; keep the leaf body behind the swing face.
  const lz: [number, number] = [Math.sin(baseYaw), Math.cos(baseYaw)]
  const facing = Math.sign(lz[0] * across[0] + lz[1] * across[1])
  const pivot: V3 = f.horizontal ? [hingeAlong, 0.012, hingeCross] : [hingeCross, 0.012, hingeAlong]

  out.doors.push({
    key,
    pivot,
    baseYaw,
    openDelta: openDelta * 0.97,
    width,
    height,
    thickness,
    zOffset: (-facing * thickness) / 2,
    entry,
    label: o.label,
    open: o.open ?? false,
    style: o.style === 'upvc' ? 'upvc' : 'wenge',
  })
}

function addWindow(out: OpeningBuild, f: WallFrame, o: Opening, a0: number, a1: number, sill: number, head: number) {
  const { box, cc } = f
  const FW = 0.06
  const FD = 0.07
  const SASH = 0.055
  const SD = 0.03
  const PANE = 0.006
  const SILL_RAIL = sill > 0 ? FW : 0.025

  // White uPVC outer frame set in a plain plaster reveal.
  out.upvc.push(box(a0, a0 + FW, cc - FD / 2, cc + FD / 2, sill, head))
  out.upvc.push(box(a1 - FW, a1, cc - FD / 2, cc + FD / 2, sill, head))
  out.upvc.push(box(a0 + FW, a1 - FW, cc - FD / 2, cc + FD / 2, head - FW, head))
  out.upvc.push(box(a0 + FW, a1 - FW, cc - FD / 2, cc + FD / 2, sill, sill + SILL_RAIL))

  // Sashes tuck 12 mm under the outer frame so no hairline of sky leaks around them.
  const TUCK = 0.012
  const y0 = sill + SILL_RAIL - TUCK
  const y1 = head - FW + TUCK
  const s0 = a0 + FW - TUCK
  const s1 = a1 - FW + TUCK

  if (o.kind === 'vent') {
    out.frosted.push(box(s0, s1, cc - PANE / 2, cc + PANE / 2, y0, y1))
    out.colliders.push(box(a0, a1, cc - 0.05, cc + 0.05, sill, head))
    return
  }

  const sashW = (s1 - s0) / 2 + SASH / 2
  const tracks = [cc - SD / 2 - 0.002, cc + SD / 2 + 0.002]
  const slider = o.kind === 'slider'
  const sashes: [number, number, number][] = slider
    ? [
        [s0, s0 + sashW, tracks[0]],
        [s0 + 0.035, s0 + 0.035 + sashW, tracks[1]],
      ]
    : [
        [s0, s0 + sashW, tracks[0]],
        [s1 - sashW, s1, tracks[1]],
      ]

  sashes.forEach(([p0, p1, t], i) => {
    const k0 = t - SD / 2
    const k1 = t + SD / 2
    // The inner meeting stile carries the dark interlock seen in the photos.
    out.upvc.push(box(p0, p0 + SASH, k0, k1, y0, y1))
    out.upvc.push(box(p1 - SASH, p1, k0, k1, y0, y1))
    if (!slider && i === 0) {
      const m = p1 - SASH / 2
      out.interlock.push(box(m - 0.011, m + 0.011, tracks[0] - SD / 2 - 0.004, tracks[1] + SD / 2 + 0.004, y0 + 0.02, y1 - 0.02))
    }
    out.upvc.push(box(p0 + SASH, p1 - SASH, k0, k1, y0, y0 + SASH * 1.4))
    out.upvc.push(box(p0 + SASH, p1 - SASH, k0, k1, y1 - SASH, y1))
    if (slider && i === 0) out.upvc.push(box(p0 + SASH, p1 - SASH, k0, k1, 1.0, 1.0 + SASH))
    const G = SASH - 0.01
    out.glass.push(box(p0 + G, p1 - G, t - PANE / 2, t + PANE / 2, y0 + SASH * 1.4 - 0.01, y1 - G))
  })

  if (slider) {
    const closedTo = s0 + 0.035 + sashW
    out.colliders.push(box(a0, closedTo, cc - 0.05, cc + 0.05, 0, head))
  } else {
    out.colliders.push(box(a0, a1, cc - 0.05, cc + 0.05, sill, head))
  }
}

/** Low plastered upstand with black vertical-baluster railing. */
function addRailing(out: OpeningBuild, [x0, y0, x1, y1]: Rect) {
  const k0 = toX(x0)
  const k1 = toX(x1)
  const kc = (k0 + k1) / 2
  const s0 = toZ(y0)
  const s1 = toZ(y1)
  const box = (sa: number, sb: number, ka: number, kb: number, ya: number, yb: number): Box => ({
    min: [ka, ya, sa],
    max: [kb, yb, sb],
  })
  const UP = 0.15
  out.parapet.push(box(s0, s1, k0, k1, 0, UP))
  out.metal.push(box(s0, s1, kc - 0.02, kc + 0.02, UP, UP + 0.035))
  out.metal.push(box(s0, s1, kc - 0.025, kc + 0.025, 1.06, 1.1))
  const span = s1 - s0
  const count = Math.round((span - 0.06) / 0.11)
  for (let i = 0; i <= count; i++) {
    const s = s0 + 0.03 + ((span - 0.06) * i) / count
    const r = i === 0 || i === count ? 0.02 : 0.009
    out.metal.push(box(s - r, s + r, kc - r, kc + r, UP + 0.035, 1.06))
  }
  out.colliders.push(box(s0, s1, k0, k1, 0, 1.8))
}

// ─── common core: lift and stair doors on the corridor walls ───────────────

export function buildCore() {
  const steel: Box[] = []
  const dark: Box[] = []
  const A = CORRIDOR.aisle
  // Boxes stand proud of a corridor wall face: side -1 is the west wall, +1 the east wall.
  const proud = (side: -1 | 1, z0: number, z1: number, d: number, y0: number, y1: number): Box =>
    side < 0 ? { min: [-A, y0, z0], max: [-A + d, y1, z1] } : { min: [A - d, y0, z0], max: [A, y1, z1] }

  for (const { z, w } of CORRIDOR.lifts) {
    const [z0, z1] = [z - w / 2, z + w / 2]
    const F = 0.07
    steel.push(
      proud(-1, z0 - F, z0, 0.04, 0, 2.1),
      proud(-1, z1, z1 + F, 0.04, 0, 2.1),
      proud(-1, z0 - F, z1 + F, 0.04, 2.1, 2.18),
      proud(-1, z0, z - 0.003, 0.022, 0.005, 2.1),
      proud(-1, z + 0.003, z1, 0.022, 0.005, 2.1),
    )
    dark.push(proud(-1, z - 0.003, z + 0.003, 0.012, 0.005, 2.1))
    // Call button panel.
    steel.push(proud(-1, z1 + 0.22, z1 + 0.3, 0.012, 1.0, 1.22))
    dark.push(proud(-1, z1 + 0.245, z1 + 0.275, 0.016, 1.06, 1.16))
  }

  for (const { side, z } of CORRIDOR.stairs) {
    const [z0, z1] = [z - 0.45, z + 0.45]
    const F = 0.05
    dark.push(
      proud(side, z0 - F, z0, 0.05, 0, 2.1),
      proud(side, z1, z1 + F, 0.05, 0, 2.1),
      proud(side, z0 - F, z1 + F, 0.05, 2.1, 2.15),
      proud(side, z0, z1, 0.035, 0.005, 2.1),
    )
    // Panic bar.
    steel.push(proud(side, z0 + 0.12, z1 - 0.08, 0.075, 1.0, 1.04))
  }
  return { steel, dark }
}

export function footprintMetres(r: Rect): Rect {
  return [toX(r[0]), toZ(r[1]), toX(r[2]), toZ(r[3])]
}

export { toM }
