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

type Mod = 'switch' | 'knob' | 'dimmer' | 'grille' | 'socket' | 'tv' | 'data'
const SIZE: Record<Mod, number> = { switch: 1, dimmer: 1, tv: 1, data: 1, knob: 2, grille: 2, socket: 2 }
const PITCH = 0.025

interface Parts {
  plate: Box[]
  modules: Box[]
  knobs: BufferGeometry[]
  dark: Box[]
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

function fixtures() {
  const p: Parts = { plate: [], modules: [], knobs: [], dark: [] }
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

  return {
    plate: boxesToGeometry(p.plate),
    modules: merge([boxesToGeometry(p.modules), ...p.knobs]),
    dark: boxesToGeometry(p.dark),
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
      geo: { ...fixtures(), pipe: sprinkler() },
      mat: {
        plate: new MeshStandardMaterial({ color: new Color('#f4f3ef'), roughness: 0.35 }),
        modules: new MeshStandardMaterial({ color: new Color('#e4e2dc'), roughness: 0.3 }),
        dark: new MeshStandardMaterial({ color: new Color('#3a3a3a'), roughness: 0.8 }),
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
      <mesh geometry={geo.pipe} material={mat.pipe} castShadow receiveShadow />
    </>
  )
}
