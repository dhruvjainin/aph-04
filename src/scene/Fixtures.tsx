import { useEffect, useMemo } from 'react'
import { Color, CylinderGeometry, MeshStandardMaterial, type BufferGeometry } from 'three'
import { boxesToGeometry, type Box } from './geometry'
import { merge } from './interior/kit'
import { CEILING, toX, toZ, unitById } from './plan'

// Site fixtures in flat 04 (main and /dmr share the walls), matched to site photos.

const unit = unitById('04')

type V2 = [number, number]
/** A wall face seen from its room: `o` is its left end, `u` runs to the right, `n` points into the room. */
interface Face {
  o: V2
  u: V2
  n: V2
}
const face = (px: number, py: number, u: V2, n: V2): Face => ({ o: [toX(unit.X(px)), toZ(unit.Y(py))], u, n })

const FOYER_S = face(816, 392, [-1, 0], [0, -1])
const LIVING_N = face(192, 289, [1, 0], [0, 1])
const LIVING_W = face(192, 527, [0, -1], [1, 0])
const LIVING_S = face(376, 527, [-1, 0], [0, -1])
const UTIL_N = face(638, 645, [1, 0], [0, 1])
const UTIL_E = face(816, 645, [0, 1], [-1, 0])
const UTIL_S = face(694, 742, [-1, 0], [0, -1])
const UTIL_W = face(638, 742, [0, -1], [1, 0])
const FOYER_S_LEN = toX(unit.X(816)) - toX(unit.X(626))

const point = ({ o, u, n }: Face, s: number, d: number): V2 => [o[0] + u[0] * s + n[0] * d, o[1] + u[1] * s + n[1] * d]

/** Box `s` metres along a face from its left end and `d` metres off it. */
function onFace(f: Face, s0: number, s1: number, y0: number, y1: number, d0: number, d1: number): Box {
  const [ax, az] = point(f, s0, d0)
  const [bx, bz] = point(f, s1, d1)
  return { min: [Math.min(ax, bx), y0, Math.min(az, bz)], max: [Math.max(ax, bx), y1, Math.max(az, bz)] }
}

/** Disc standing off a face, its axis along the face normal. */
function disc(f: Face, s: number, y: number, d: number, r: number, len: number) {
  const g = new CylinderGeometry(r, r, len, 24)
  if (f.n[0]) g.rotateZ(Math.PI / 2)
  else g.rotateX(Math.PI / 2)
  const [x, z] = point(f, s, d + len / 2)
  return g.translate(x, y, z)
}

/** Pipe running along a face at height `y`, `d` metres off it. */
function rod(f: Face, s0: number, s1: number, y: number, d: number, r: number) {
  const g = new CylinderGeometry(r, r, s1 - s0, 12)
  if (f.u[0]) g.rotateZ(Math.PI / 2)
  else g.rotateX(Math.PI / 2)
  const [x, z] = point(f, (s0 + s1) / 2, d)
  return g.translate(x, y, z)
}

function riser(f: Face, s: number, y0: number, y1: number, d: number, r: number) {
  const [x, z] = point(f, s, d)
  return new CylinderGeometry(r, r, y1 - y0, 12).translate(x, (y0 + y1) / 2, z)
}

type Mod = 'switch' | 'knob' | 'dimmer' | 'grille' | 'socket' | 'tv' | 'data'
const SIZE: Record<Mod, number> = { switch: 1, dimmer: 1, tv: 1, data: 1, knob: 2, grille: 2, socket: 2 }
const PITCH = 0.025

interface Parts {
  plate: Box[]
  modules: Box[]
  knobs: BufferGeometry[]
  dark: Box[]
  holes: BufferGeometry[]
  metal: Box[]
  blue: Box[]
  yellow: BufferGeometry[]
  orange: BufferGeometry[]
}

/** Modular plate centred `s` along a face at height `y`, its modules read left → right. */
function board(p: Parts, f: Face, s: number, y: number, w: number, h: number, mods: Mod[]) {
  const at = (s0: number, s1: number, y0: number, y1: number, d0: number, d1: number) => onFace(f, s0, s1, y0, y1, d0, d1)
  const hole = (cs: number, cy: number, r: number) => at(cs - r, cs + r, cy - r, cy + r, 0.012, 0.0125)
  p.plate.push(at(s - w / 2, s + w / 2, y - h / 2, y + h / 2, 0, 0.01))
  let c = s - (mods.reduce((t, m) => t + SIZE[m], 0) * PITCH) / 2
  for (const m of mods) {
    const mid = c + (SIZE[m] * PITCH) / 2
    const [m0, m1] = [c + 0.0015, c + SIZE[m] * PITCH - 0.0015]
    c += SIZE[m] * PITCH
    if (m === 'switch') {
      p.modules.push(at(m0, m1, y - 0.03, y + 0.03, 0.01, 0.014))
      continue
    }
    p.modules.push(at(m0, m1, y - 0.028, y + 0.028, 0.01, 0.012))
    if (m === 'knob') p.knobs.push(disc(f, mid, y, 0.012, 0.016, 0.012))
    if (m === 'dimmer') p.knobs.push(disc(f, mid, y, 0.012, 0.008, 0.01))
    if (m === 'grille') for (let i = 0; i < 5; i++) p.dark.push(at(mid - 0.01, mid + 0.01, y - 0.018 + i * 0.008, y - 0.015 + i * 0.008, 0.012, 0.0125))
    if (m === 'socket') p.dark.push(hole(mid, y + 0.011, 0.0045), hole(mid - 0.011, y - 0.009, 0.0035), hole(mid + 0.011, y - 0.009, 0.0035))
    if (m === 'tv') p.dark.push(hole(mid, y, 0.005))
    if (m === 'data') p.dark.push(at(mid - 0.007, mid + 0.007, y - 0.004, y + 0.008, 0.012, 0.0125))
  }
}

/** Round ceiling-light point left on the wall, with its wires. */
function lightPoint(p: Parts, f: Face, s: number, y: number) {
  p.knobs.push(disc(f, s, y, 0, 0.045, 0.008))
  p.dark.push(onFace(f, s - 0.012, s + 0.008, y - 0.005, y + 0.02, 0.008, 0.02))
}

/** Square floor trap with a dark hole, centred `s` along a face and `d` off it. */
function floorTrap(p: Parts, f: Face, s: number, d: number) {
  p.metal.push(onFace(f, s - 0.08, s + 0.08, 0, 0.003, d - 0.08, d + 0.08))
  p.dark.push(onFace(f, s - 0.045, s + 0.045, 0, 0.004, d - 0.045, d + 0.045))
}

/** Utility-side face of the Common Toilet vent: exhaust fan and blank panel over six louvres. */
function toiletVent(p: Parts) {
  const f = UTIL_W
  const [w, y0, y1, t] = [0.61, 1.1, 2.0, 1.74]
  const frame = (s0: number, s1: number, b: number, h: number) => p.plate.push(onFace(f, s0, s1, b, h, -0.04, -0.005))
  frame(0, w, y0, y0 + 0.04)
  frame(0, w, y1 - 0.04, y1)
  frame(0, 0.04, y0, y1)
  frame(w - 0.04, w, y0, y1)
  frame(0.04, w - 0.04, t - 0.03, t)
  frame(0.27, 0.3, t, y1 - 0.04)
  p.plate.push(onFace(f, 0.3, w - 0.04, t, y1 - 0.04, -0.03, -0.02))
  p.plate.push(onFace(f, 0.07, 0.24, t + 0.02, y1 - 0.06, -0.02, 0.03))
  for (const y of [t + 0.06, t + 0.13]) p.dark.push(onFace(f, 0.08, 0.23, y, y + 0.004, 0.03, 0.031))
  for (let i = 0; i < 6; i++) {
    const b = y0 + 0.05 + i * 0.092
    p.plate.push(onFace(f, 0.05, w - 0.05, b + 0.01, b + 0.085, -0.035, -0.028), onFace(f, 0.05, w - 0.05, b, b + 0.012, -0.028, -0.012))
  }
  p.dark.push(onFace(f, 0.05, w - 0.05, y0 + 0.04, t - 0.03, -0.06, -0.055))
}

function utility(p: Parts) {
  toiletVent(p)
  p.holes.push(disc(UTIL_W, 0.2, 2.4, 0, 0.035, 0.002))
  p.orange.push(riser(UTIL_W, 1.33, CEILING - 0.1, CEILING, 0.04, 0.025), rod(UTIL_W, 1.33, 1.41, CEILING - 0.1, 0.04, 0.025))

  // Shaft access panel: a light metal door with an oval pull and a key lock.
  p.metal.push(onFace(UTIL_S, 0.3, 0.78, 1.05, 2.25, 0, 0.012))
  p.metal.push(onFace(UTIL_S, 0.32, 0.76, 1.07, 2.23, 0.012, 0.018))
  p.dark.push(onFace(UTIL_S, 0.35, 0.37, 1.8, 1.9, 0.018, 0.019), onFace(UTIL_S, 0.355, 0.365, 1.5, 1.51, 0.018, 0.02))

  board(p, UTIL_E, 0.58, 1.2, 0.22, 0.086, ['socket', 'socket', 'grille'])
  for (const [s, y] of [[0.78, 0.8], [0.46, 0.46], [1.25, 0.1]]) {
    p.knobs.push(disc(UTIL_E, s, y, 0, 0.04, 0.004), disc(UTIL_E, s, y, 0.004, 0.013, 0.035))
  }
  floorTrap(p, UTIL_E, 1.15, 0.3)

  // Gas meter with its regulator; the supply leaves through the open side.
  p.blue.push(onFace(UTIL_E, 1.06, 1.24, 2.0, 2.16, 0, 0.11))
  p.yellow.push(rod(UTIL_E, 1.06, 1.24, 2.04, 0.112, 0.008))
  p.dark.push(onFace(UTIL_E, 1.11, 1.17, 2.18, 2.27, 0.03, 0.09))
  p.yellow.push(rod(UTIL_E, 0.7, 1.08, 2.33, 0.06, 0.012), riser(UTIL_E, 1.08, 2.16, 2.33, 0.06, 0.012))
  p.yellow.push(riser(UTIL_E, 1.14, 2.16, 2.18, 0.06, 0.012), rod(UTIL_E, 1.17, 1.56, 2.24, 0.06, 0.012))

  board(p, UTIL_N, 2.4, 1.3, 0.086, 0.086, ['switch', 'switch'])
  p.knobs.push(rod(UTIL_N, 1.45, 2.05, 0.45, 0.03, 0.012))
  p.knobs.push(disc(UTIL_N, 1.78, 0.43, 0.03, 0.01, 0.17), disc(UTIL_N, 2.02, 0.43, 0.03, 0.01, 0.17), rod(UTIL_N, 1.78, 2.02, 0.43, 0.2, 0.01))
  p.knobs.push(disc(UTIL_N, 1.8, 0.14, 0, 0.035, 0.012))
  floorTrap(p, UTIL_N, 1.95, 0.45)
}

function fixtures() {
  const p: Parts = { plate: [], modules: [], knobs: [], dark: [], holes: [], metal: [], blue: [], yellow: [], orange: [sprinkler()] }
  board(p, FOYER_S, FOYER_S_LEN - 0.2, 1.25, 0.26, 0.12, ['switch', 'switch', 'switch', 'knob', 'grille'])

  board(p, LIVING_N, 0.2, 0.33, 0.1, 0.086, ['switch', 'socket'])
  lightPoint(p, LIVING_N, 1.6, 2.2)
  board(p, LIVING_N, 3.13, 1.2, 0.086, 0.086, ['switch'])
  board(p, LIVING_N, 3.3, 1.2, 0.24, 0.1, ['knob', 'switch', 'dimmer', 'switch', 'switch'])
  board(p, LIVING_N, 3.18, 0.2, 0.086, 0.086, ['data', 'data'])
  board(p, LIVING_N, 3.29, 0.2, 0.1, 0.086, ['socket', 'switch'])

  board(p, LIVING_W, 0.3, 1.2, 0.086, 0.086, ['switch'])

  board(p, LIVING_S, 1.0, 0.9, 0.08, 0.086, ['tv'])
  board(p, LIVING_S, 1.15, 0.9, 0.2, 0.086, ['socket', 'switch', 'switch', 'socket'])
  lightPoint(p, LIVING_S, 1.085, 2.2)
  board(p, LIVING_S, 1.27, 0.2, 0.08, 0.086, ['switch'])
  board(p, LIVING_S, 1.38, 0.2, 0.12, 0.086, ['socket', 'switch'])

  utility(p)

  return {
    plate: boxesToGeometry(p.plate),
    modules: merge([boxesToGeometry(p.modules), ...p.knobs]),
    dark: merge([boxesToGeometry(p.dark), ...p.holes]),
    metal: boxesToGeometry(p.metal),
    blue: boxesToGeometry(p.blue),
    yellow: merge(p.yellow),
    pipe: merge(p.orange),
  }
}

/** Orange fire-sprinkler pipe along the top of Foyer · E, and the sprinkler head in the living ceiling. */
function sprinkler() {
  const east = toX(unit.X(816))
  const [north, south] = [toZ(unit.Y(289)), toZ(unit.Y(392))]
  const pipe = new CylinderGeometry(0.02, 0.02, south - north, 16).rotateX(Math.PI / 2).translate(east - 0.04, CEILING - 0.06, (north + south) / 2)
  const [x, z] = point(LIVING_N, 2.27, 0.3)
  const head = new CylinderGeometry(0.02, 0.025, 0.03, 16).translate(x, CEILING - 0.015, z)
  return merge([pipe, head])
}

export function Fixtures() {
  const { geo, mat } = useMemo(
    () => ({
      geo: fixtures(),
      mat: {
        plate: new MeshStandardMaterial({ color: new Color('#f4f3ef'), roughness: 0.35 }),
        modules: new MeshStandardMaterial({ color: new Color('#e4e2dc'), roughness: 0.3 }),
        dark: new MeshStandardMaterial({ color: new Color('#3a3a3a'), roughness: 0.8 }),
        metal: new MeshStandardMaterial({ color: new Color('#d9d8d3'), roughness: 0.5, metalness: 0.2 }),
        blue: new MeshStandardMaterial({ color: new Color('#2f6db3'), roughness: 0.4 }),
        yellow: new MeshStandardMaterial({ color: new Color('#e9b51f'), roughness: 0.4 }),
        pipe: new MeshStandardMaterial({ color: new Color('#e2672a'), roughness: 0.45 }),
      },
    }),
    [],
  )

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      Object.values(mat).forEach((m) => m.dispose())
    },
    [geo, mat],
  )

  return (
    <>
      <mesh geometry={geo.plate} material={mat.plate} receiveShadow />
      <mesh geometry={geo.modules} material={mat.modules} receiveShadow />
      <mesh geometry={geo.dark} material={mat.dark} />
      <mesh geometry={geo.metal} material={mat.metal} receiveShadow />
      <mesh geometry={geo.blue} material={mat.blue} castShadow receiveShadow />
      <mesh geometry={geo.yellow} material={mat.yellow} castShadow receiveShadow />
      <mesh geometry={geo.pipe} material={mat.pipe} castShadow receiveShadow />
    </>
  )
}
