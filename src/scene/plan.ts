import { TYPE_3B } from './units/3B'
import { TYPE_3C } from './units/3C'
import { TYPE_3D } from './units/3D'
import { TYPE_DMR } from './units/3D-dmr'

/** Unlisted /dmr route: flat 04 alone, built from its own copy of the 3D plan. */
export const DMR = typeof location !== 'undefined' && location.pathname.replace(/\/+$/, '') === '/dmr'

// Four flats around a central lift core (see plans/building.png).
// Each flat is traced in its own plan's pixels (src/scene/units) and placed into one building frame.
// Building coordinates are "plan pixels" at 69 px per metre; `toX`/`toZ` convert them to metres.
// x runs west → east with 0 on the shared kitchen wall of flats 01 and 02; z runs north → south.

export const PX_PER_M = 69

export const toX = (px: number) => px / PX_PER_M
export const toZ = (py: number) => py / PX_PER_M
export const toM = (px: number) => px / PX_PER_M

export const FT = 0.3048
/** Floor to ceiling: 9 ft. */
export const CEILING = 9 * FT
export const DOOR_HEAD = 2.1

export type OpeningKind = 'door' | 'entry' | 'window' | 'open' | 'slider' | 'vent'
export type Rect = [x0: number, y0: number, x1: number, y1: number]
export type Side = 'n' | 's' | 'w' | 'e'

export interface Opening {
  from: number
  to: number
  kind: OpeningKind
  /** Doors: which end of the opening carries the hinge. */
  hinge?: 'start' | 'end'
  /** Doors: world-axis direction (+1 / -1 across the wall) the leaf swings into. */
  swing?: 1 | -1
  open?: boolean
  /** Doors: white uPVC glazed leaf and frame instead of wenge. */
  style?: 'upvc'
  /** Overrides for OPENING_HEIGHTS. */
  sill?: number
  head?: number
  /** Entry doors: flat number on the corridor-side plate. */
  label?: string
}

export interface Wall {
  rect: Rect
  openings?: Opening[]
}

export interface RoomRect {
  name: string
  rect: Rect
  toilet?: boolean
}

/** One flat type, in the pixels of its own plan image. */
export interface UnitPlan {
  pxPerM: number
  walls: Wall[]
  /** Balcony railings on the open edge. */
  railings: Rect[]
  /** Dark laminate floor (the M.Bedroom and its dress); everything else is glossy tile. */
  wood: Rect[]
  /** Downstand beams: plan rect and soffit height. */
  beams: { rect: Rect; soffit: number }[]
  /** The kitchen gets a tile dado on every side but the open one. */
  kitchen: { rect: Rect; open: Side }
  /** Floor outline (non-overlapping rects). */
  floor: Rect[]
  /** First match wins, so specific rooms precede the open living/dining area. */
  rooms: RoomRect[]
  spawn: { x: number; y: number; yaw: number }
}

export const OPENING_HEIGHTS: Record<OpeningKind, [sill: number, head: number]> = {
  door: [0, DOOR_HEAD],
  entry: [0, DOOR_HEAD],
  window: [0.75, DOOR_HEAD],
  /** Unglazed opening above a parapet (semi-open utility). */
  open: [1.05, 2.4],
  slider: [0, 2.4],
  vent: [1.55, DOOR_HEAD],
}

export const openingHeights = (o: Opening): [number, number] => {
  const [sill, head] = OPENING_HEIGHTS[o.kind]
  return [o.sill ?? sill, o.head ?? head]
}

export const FALSE_CEILING = 2.4
export const KITCHEN_DADO: [number, number] = [0.85, 1.45]

// ─── placing flats in the building ─────────────────────────────────────────

interface Placement {
  /** A point of the source plan (px) … */
  anchor: [x: number, y: number]
  /** … lands here in the building (metres). */
  at: [x: number, z: number]
  mirror?: boolean
  /** Flat number for the entry door plate. */
  label?: string
}

const FLIP: Record<Side, Side> = { n: 'n', s: 's', w: 'e', e: 'w' }

function place(plan: UnitPlan, { anchor: [ax, ay], at: [bx, bz], mirror = false, label }: Placement) {
  const sx = mirror ? -1 : 1
  // sx * (x - ax) first, so a mirrored wall on the axis lands on exactly the same numbers.
  const X = (x: number) => ((sx * (x - ax)) / plan.pxPerM + bx) * PX_PER_M
  const Y = (y: number) => ((y - ay) / plan.pxPerM + bz) * PX_PER_M
  const rect = ([x0, y0, x1, y1]: Rect): Rect => (mirror ? [X(x1), Y(y0), X(x0), Y(y1)] : [X(x0), Y(y0), X(x1), Y(y1)])
  const opening = (src: Opening, horizontal: boolean): Opening => {
    const o = src.kind === 'entry' ? { ...src, label } : src
    if (!horizontal) return { ...o, from: Y(o.from), to: Y(o.to), swing: mirror && o.swing ? (-o.swing as 1 | -1) : o.swing }
    if (!mirror) return { ...o, from: X(o.from), to: X(o.to) }
    return { ...o, from: X(o.to), to: X(o.from), hinge: o.hinge && (o.hinge === 'start' ? 'end' : 'start') }
  }
  const wall = ({ rect: r, openings }: Wall): Wall => {
    const horizontal = r[2] - r[0] >= r[3] - r[1]
    return { rect: rect(r), openings: openings?.map((o) => opening(o, horizontal)) }
  }
  return {
    X,
    Y,
    walls: plan.walls.map(wall),
    railings: plan.railings.map(rect),
    wood: plan.wood.map(rect),
    beams: plan.beams.map((b) => ({ rect: rect(b.rect), soffit: b.soffit })),
    kitchen: { rect: rect(plan.kitchen.rect), open: mirror ? FLIP[plan.kitchen.open] : plan.kitchen.open },
    floor: plan.floor.map(rect),
    rooms: plan.rooms.map((r) => ({ ...r, rect: rect(r.rect) })),
    spawn: { x: toX(X(plan.spawn.x)), z: toZ(Y(plan.spawn.y)), yaw: mirror ? -plan.spawn.yaw : plan.spawn.yaw },
  }
}

/** The 2.4 m corridor runs between the flats' front doors; this is its east face (metres). */
const AISLE = (305 - 179.5) / TYPE_3B.pxPerM
/** North face of the south flats, measured off the building plan (metres). */
const SOUTH = 20.91

const placed = {
  '01': place(TYPE_3B, { anchor: [179.5, 88], at: [0, 0], mirror: true, label: '01' }),
  '02': place(TYPE_3B, { anchor: [179.5, 88], at: [0, 0], label: '02' }),
  '03': place(TYPE_3C, { anchor: [155, 52], at: [AISLE, SOUTH], label: '03' }),
  '04': place(DMR ? TYPE_DMR : TYPE_3D, { anchor: [830, 22], at: [-AISLE, SOUTH], label: '04' }),
}

export type UnitId = keyof typeof placed
const SHOWN: UnitId[] = DMR ? ['04'] : ['01', '02', '03', '04']

const INFO: Record<UnitId, { type: string }> = {
  '01': { type: '3A' },
  '02': { type: '3B' },
  '03': { type: '3C' },
  '04': { type: '3D' },
}

const bounds = (rects: Rect[]): Rect => [
  Math.min(...rects.map((r) => r[0])),
  Math.min(...rects.map((r) => r[1])),
  Math.max(...rects.map((r) => r[2])),
  Math.max(...rects.map((r) => r[3])),
]

export const UNITS = SHOWN.map((id) => {
  const p = placed[id]
  const [x0, y0, x1, y1] = bounds(p.floor)
  return {
    id,
    flat: `Flat ${id}`,
    type: INFO[id].type,
    ...p,
    center: { x: toX((x0 + x1) / 2), z: toZ((y0 + y1) / 2) },
    /** Which façade the balconies face. */
    west: x0 + x1 < 0,
  }
})
export type Unit = (typeof UNITS)[number]
export const unitById = (id: UnitId) => UNITS.find((u) => u.id === id)!

// ─── common core: corridor, lifts and stairs ───────────────────────────────

const M = (m: number) => m * PX_PER_M
const N = placed['02']
const S = placed['03']
const CORE_T = 0.16
const corridorNorth = N.Y(1048)
const corridorSouth = S.Y(613)
const coreNorth = N.Y(1224)

/** Corridor walls between the flats' front doors; lifts and stairs sit behind them. */
const southWall: Wall = { rect: [M(-AISLE), corridorSouth, M(AISLE), S.Y(630)] }
const CORE_WALLS: Wall[] = DMR
  ? // Only the stretch beside flat 04 remains: a landing closed off to the north and east.
    [
      { rect: [M(-AISLE), M(SOUTH - CORE_T), M(AISLE), M(SOUTH)] },
      { rect: [M(AISLE), M(SOUTH - CORE_T), M(AISLE + CORE_T), S.Y(630)] },
      southWall,
    ]
  : [
      { rect: [M(AISLE), coreNorth, M(AISLE + CORE_T), S.Y(437)] },
      { rect: [M(-AISLE - CORE_T), coreNorth, M(-AISLE), M(SOUTH)] },
      southWall,
    ]

export const CORRIDOR = {
  rect: [M(-AISLE), DMR ? M(SOUTH) : corridorNorth, M(AISLE), corridorSouth] as Rect,
  /** Closed lift landing doors on the west face (centre z and width, metres). */
  lifts: DMR
    ? []
    : [
        { z: 13.86, w: 1.0 },
        { z: 16.14, w: 1.1 },
        { z: 18.47, w: 1.0 },
      ],
  /** Stair fire doors: face (-1 west, +1 east) and centre z (metres). */
  stairs: DMR
    ? []
    : [
        { side: -1 as const, z: 20.3 },
        { side: 1 as const, z: 15.15 },
      ],
  aisle: AISLE,
}

// ─── the whole floor ───────────────────────────────────────────────────────

const key = (w: Wall) => JSON.stringify(w)
const unique = (walls: Wall[]) => [...new Map(walls.map((w) => [key(w), w])).values()]

/** Shared walls (01/02 back-to-back kitchens) appear once. */
export const WALLS: Wall[] = unique([...UNITS.flatMap((u) => u.walls), ...CORE_WALLS])
export const RAILINGS = UNITS.flatMap((u) => u.railings)
export const WOOD_ZONES = UNITS.flatMap((u) => u.wood)
export const BEAMS = UNITS.flatMap((u) => u.beams)
export const KITCHENS = UNITS.map((u) => u.kitchen)
export const FLOOR_OUTLINE = UNITS.flatMap((u) => u.floor)
export const TOILETS = UNITS.flatMap((u) => u.rooms.filter((r) => r.toilet).map((r) => r.rect))
export const FOOTPRINT: Rect = bounds([...FLOOR_OUTLINE, CORRIDOR.rect])

export interface Room extends RoomRect {
  unit: Unit | null
}

export const ROOMS: Room[] = [
  ...UNITS.flatMap((unit) => unit.rooms.map((r) => ({ ...r, unit }))),
  { name: DMR ? 'Landing' : 'Corridor', rect: CORRIDOR.rect, unit: null },
]

export const roomAt = (x: number, z: number) => {
  const px = x * PX_PER_M
  const py = z * PX_PER_M
  return ROOMS.find(({ rect: [x0, y0, x1, y1] }) => px >= x0 && px <= x1 && py >= y0 && py <= y1) ?? null
}
