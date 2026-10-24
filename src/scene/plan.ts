// Geometry traced from public/floorplan.png (905×1043 px, ≈69 px per metre).
// Every coordinate below is in plan pixels; `toX`/`toZ` convert to metres
// centred on the apartment.

export const PX_PER_M = 69
const CENTER = { x: 453, y: 523 }

export const toX = (px: number) => (px - CENTER.x) / PX_PER_M
export const toZ = (py: number) => (py - CENTER.y) / PX_PER_M
export const toM = (px: number) => px / PX_PER_M

export const FT = 0.3048
/** Floor to ceiling: 9 ft. */
export const CEILING = 9 * FT
export const DOOR_HEAD = 2.1

export type OpeningKind = 'door' | 'entry' | 'window' | 'open' | 'slider' | 'vent'

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
}

export interface Wall {
  rect: [x0: number, y0: number, x1: number, y1: number]
  openings?: Opening[]
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

export const WALLS: Wall[] = [
  // ── horizontal ──────────────────────────────────────────────
  { rect: [77, 22, 830, 37] },
  { rect: [499, 150, 830, 162], openings: [{ from: 556, to: 605, kind: 'door', hinge: 'end', swing: 1, open: true }] },
  { rect: [77, 277, 1002, 289], openings: [{ from: 439, to: 497, kind: 'door', hinge: 'end', swing: -1, open: true }] },
  { rect: [626, 392, 816, 404] },
  { rect: [77, 527, 376, 540] },
  {
    rect: [447, 634, 816, 645],
    openings: [
      { from: 640, to: 698, kind: 'door', hinge: 'start', swing: 1, open: true, style: 'upvc' },
      { from: 716, to: 780, kind: 'window', sill: 1.1 },
    ],
  },
  { rect: [638, 742, 830, 752], openings: [{ from: 694, to: 816, kind: 'open' }] },
  { rect: [90, 760, 447, 772], openings: [{ from: 388, to: 445, kind: 'door', hinge: 'end', swing: 1, open: true }] },
  { rect: [459, 760, 627, 772] },
  { rect: [447, 885, 627, 897], openings: [{ from: 502, to: 555, kind: 'door', hinge: 'end', swing: -1, open: true }] },
  { rect: [638, 834, 692, 845] },
  { rect: [77, 1010, 638, 1024] },
  // ── vertical ────────────────────────────────────────────────
  { rect: [181, 37, 192, 277], openings: [{ from: 74, to: 240, kind: 'slider' }] },
  { rect: [181, 289, 192, 527], openings: [{ from: 326, to: 490, kind: 'slider' }] },
  {
    rect: [77, 540, 90, 1010],
    openings: [
      { from: 587, to: 712, kind: 'window' },
      { from: 807, to: 972, kind: 'window' },
    ],
  },
  { rect: [499, 162, 510, 277] },
  { rect: [679, 162, 690, 277], openings: [{ from: 168, to: 205, kind: 'vent' }] },
  { rect: [816, 37, 830, 150] },
  { rect: [816, 289, 830, 742], openings: [{ from: 291, to: 357, kind: 'entry', hinge: 'start', swing: -1, open: false }] },
  { rect: [365, 540, 376, 760], openings: [{ from: 542, to: 598, kind: 'door', hinge: 'start', swing: -1, open: true }] },
  { rect: [447, 645, 459, 885], openings: [{ from: 648, to: 695, kind: 'door', hinge: 'start', swing: 1, open: true }] },
  {
    rect: [627, 592, 638, 1010],
    openings: [
      { from: 700, to: 742, kind: 'vent' },
      { from: 850, to: 885, kind: 'vent' },
    ],
  },
  { rect: [682, 752, 692, 834] },
  // ── common lobby outside the entry ──────────────────────────
  { rect: [830, 400, 1002, 412] },
  { rect: [990, 289, 1002, 400] },
]

export const openingHeights = (o: Opening): [number, number] => {
  const [sill, head] = OPENING_HEIGHTS[o.kind]
  return [o.sill ?? sill, o.head ?? head]
}

/** Glass balustrades on the open edge of both balconies. */
export const RAILINGS: [number, number, number, number][] = [
  [77, 37, 90, 277],
  [77, 289, 90, 527],
]

/** Everything is glossy vitrified tile except the Parents Room and its dress, which are dark laminate. */
export const WOOD_ZONES: [number, number, number, number][] = [
  [90, 772, 447, 1010],
  [447, 897, 627, 1010],
]

/** Toilets: marble-look wall tiles up to a glossy lilac false ceiling. */
export const TOILETS: [number, number, number, number][] = [
  [510, 162, 679, 277],
  [459, 645, 627, 760],
  [459, 772, 627, 885],
]
export const FALSE_CEILING = 2.4

/** Downstand beams: plan rect and soffit height. */
export const BEAMS: { rect: [number, number, number, number]; soffit: number }[] = [
  { rect: [626, 404, 645, 592], soffit: 7 * FT },
]

export const KITCHEN = { rect: [638, 404, 816, 634] as [number, number, number, number], dado: [0.85, 1.45] as [number, number] }

/** Common lobby outside the main door (grey tile, opposite flat's door). */
export const LOBBY = { rect: [830, 289, 990, 400] as [number, number, number, number], door: [298, 352] as [number, number] }

export const FOOTPRINT: [number, number, number, number] = [77, 22, 830, 1024]

/** Base stone floor, clipped to the apartment outline (excludes the AC ledge and the façade notch). */
export const FLOOR_OUTLINE: [number, number, number, number][] = [
  [77, 22, 830, 162],
  [77, 162, 690, 289],
  [77, 289, 830, 752],
  [77, 752, 692, 845],
  [77, 845, 638, 1024],
]

export const SPAWN = { x: toX(765), z: toZ(330), yaw: Math.PI / 2 }

/**
 * Household room names (these differ from the printed plan labels; see AGENTS.md).
 * Rects are plan px; the first match wins, so specific rooms precede the open living/dining area.
 */
export const ROOMS: { name: string; rect: [number, number, number, number] }[] = [
  { name: 'Master Bedroom', rect: [192, 37, 499, 277] },
  { name: 'Master Dress', rect: [499, 37, 816, 150] },
  { name: 'Master Toilet', rect: [510, 162, 679, 277] },
  { name: 'Master Balcony', rect: [77, 37, 181, 277] },
  { name: 'Living Balcony', rect: [77, 289, 181, 527] },
  { name: 'Kids Room', rect: [90, 540, 365, 760] },
  { name: 'Parents Room', rect: [90, 772, 447, 1010] },
  { name: 'Parents Dress', rect: [447, 897, 627, 1010] },
  { name: 'Parents Toilet', rect: [459, 772, 627, 885] },
  { name: 'Common Toilet', rect: [459, 645, 627, 760] },
  { name: 'Utility', rect: [638, 645, 816, 742] },
  { name: 'Kitchen', rect: [638, 404, 816, 634] },
  { name: 'Foyer', rect: [626, 162, 830, 404] },
  { name: 'Passage', rect: [376, 527, 459, 772] },
  { name: 'Lobby', rect: [830, 289, 990, 400] },
  { name: 'Living', rect: [181, 277, 447, 527] },
  { name: 'Dining', rect: [447, 277, 638, 645] },
]

export const roomAt = (x: number, z: number) => {
  const px = x * PX_PER_M + CENTER.x
  const py = z * PX_PER_M + CENTER.y
  return ROOMS.find(({ rect: [x0, y0, x1, y1] }) => px >= x0 && px <= x1 && py >= y0 && py <= y1)?.name ?? null
}
