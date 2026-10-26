import { BoxGeometry, BufferGeometry, CylinderGeometry } from 'three'
import { boxesToGeometry, type Box } from '../geometry'
import { CEILING, toX, toZ, unitById, type Rect } from '../plan'
import { soffitAt } from './ceilings'
import { LANTERN_AT } from './foyer'
import { add, type Built, type Parts } from './kit'

// Ceiling lights, fans and light strips in the Living, Dining, Foyer and Kitchen of flat 04 on /dmr, read off
// plans/LIGHTING LOOPING AND SWITCHBOARDS (labels CL, SL, S, F, PL, CG, HL). The drawing's room sizes differ a
// little from the traced plan, so each point is a fraction (u west → east, v north → south) of its room.

const unit = unitById('04')

const LIVING: Rect = [192, 289, 447, 527]
const DINING: Rect = [447, 289, 626, 634]
const KITCHEN: Rect = [645, 404, 816, 634]

const spot = ([x0, y0, x1, y1]: Rect, u: number, v: number) => ({
  x: toX(unit.X(x0 + (x1 - x0) * u)),
  z: toZ(unit.Y(y0 + (y1 - y0) * v)),
})
const spots = (room: Rect, list: [number, number][]) => list.map(([u, v]) => spot(room, u, v))

// CL11–CL18, CL5–CL10, CL1–CL4.
const LIVING_CL = spots(LIVING, [[0.37, 0.171], [0.707, 0.171], [0.141, 0.327], [0.939, 0.327], [0.141, 0.663], [0.939, 0.663], [0.37, 0.82], [0.707, 0.82]])
const DINING_CL = spots(DINING, [[0.279, 0.151], [0.718, 0.151], [0.279, 0.367], [0.718, 0.367], [0.279, 0.846], [0.718, 0.846]])
const KITCHEN_CL = spots(KITCHEN, [[0.196, 0.269], [0.585, 0.269], [0.196, 0.729], [0.585, 0.729]])
/** SL1 in the crockery niche, S1–S3 motion sensors. */
const SPOTS = spots(DINING, [[0.896, 0.957]])
const SENSORS = [...spots(KITCHEN, [[0.39, 0.27], [0.39, 0.729]]), { x: LANTERN_AT[0].x / 2 + LANTERN_AT[1].x / 2, z: LANTERN_AT[0].z }]

const FANS = [
  { ...spot(LIVING, 0.539, 0.494), r: 0.59 },
  { ...spot(DINING, 0.498, 0.608), r: 0.6 },
  { ...spot(KITCHEN, 0.38, 0.5), r: 0.46 },
]

const mid = (...p: { x: number; z: number }[]) => ({ x: p.reduce((t, q) => t + q.x, 0) / p.length, z: p.reduce((t, q) => t + q.z, 0) / p.length })
const lit = (p: { x: number; z: number }, intensity: number) => ({ ...p, ceiling: soffitAt(p.x, p.z), intensity })

/** Point lights standing in for the downlights, one per neighbouring pair, and for the foyer lanterns. */
export const GLOWS = [
  ...[[0, 1], [2, 4], [3, 5], [6, 7]].map(([a, b]) => lit(mid(LIVING_CL[a], LIVING_CL[b]), 1.5)),
  ...[[0, 1], [2, 3], [4, 5]].map(([a, b]) => lit(mid(DINING_CL[a], DINING_CL[b]), 1.7)),
  ...[[0, 1], [2, 3]].map(([a, b]) => lit(mid(KITCHEN_CL[a], KITCHEN_CL[b]), 1.7)),
  // The light sits 0.22 m under `ceiling`, so this hangs it at the lantern's lamp.
  ...LANTERN_AT.map((p) => ({ ...p, ceiling: 2.17, intensity: 1.2 })),
]

function fan(parts: Parts, { x, z, r }: { x: number; z: number; r: number }) {
  const c = soffitAt(x, z)
  const at = (g: BufferGeometry, y: number) => g.translate(x, c - y, z)
  add(
    parts,
    'paint',
    at(new CylinderGeometry(0.1, 0.1, 0.05, 24), 0.025),
    at(new CylinderGeometry(0.012, 0.012, 0.2, 8), 0.15),
    at(new CylinderGeometry(0.11, 0.1, 0.12, 32), 0.31),
    at(new CylinderGeometry(0.06, 0.04, 0.04, 24), 0.39),
  )
  const len = r - 0.12
  for (let i = 0; i < 3; i++)
    add(parts, 'paint', at(new BoxGeometry(len, 0.008, 0.16).translate(0.12 + len / 2, 0, 0).rotateY(0.5 + (i * Math.PI * 2) / 3), 0.33))
}

/** Lit strip of `w` m wide on the ceiling, from (x0, z0) to (x1, z1). */
function strip(x0: number, z0: number, x1: number, z1: number, w: number): Box {
  const y = soffitAt((x0 + x1) / 2, (z0 + z1) / 2)
  return { min: [Math.min(x0, x1), y - 0.013, Math.min(z0, z1)], max: [Math.max(x0, x1) + w, y - 0.001, Math.max(z0, z1) + w] }
}

export function buildElectrics(): Built {
  const parts: Parts = {}
  const downlight = (list: { x: number; z: number }[], r: number) => {
    for (const { x, z } of list) {
      const c = soffitAt(x, z)
      add(parts, 'paint', new CylinderGeometry(r, r, 0.008, 32).translate(x, c - 0.004, z))
      add(parts, 'glow', new CylinderGeometry(r * 0.74, r * 0.74, 0.002, 32).translate(x, c - 0.0085, z))
    }
  }
  downlight([...LIVING_CL, ...DINING_CL, ...KITCHEN_CL], 0.065)
  downlight(SPOTS, 0.035)
  for (const { x, z } of SENSORS) add(parts, 'bezel', new CylinderGeometry(0.018, 0.018, 0.006, 16).translate(x, CEILING - 0.003, z))
  FANS.forEach((f) => fan(parts, f))

  // PL1: profile light along the kitchen's east and north walls; CG1: curtain grazer above the living slider.
  const [kx0, kz0, kx1, kz1] = [toX(unit.X(645)), toZ(unit.Y(404)), toX(unit.X(816)), toZ(unit.Y(634))]
  const north = kx0 + (kx1 - kx0) * 0.6
  const [cx, cz0, cz1] = [toX(unit.X(192)) + 0.19, toZ(unit.Y(289 + 238 * 0.03)), toZ(unit.Y(289 + 238 * 0.89))]
  add(
    parts,
    'glow',
    boxesToGeometry([
      strip(kx1 - 0.07, kz0, kx1 - 0.07, kz1, 0.03),
      strip(north, kz0 + 0.04, kx1 - 0.07, kz0 + 0.04, 0.03),
      strip(cx, cz0, cx, cz1, 0.03),
    ]),
  )
  return { parts, colliders: [] }
}
