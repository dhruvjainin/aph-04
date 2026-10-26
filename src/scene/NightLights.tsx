import { useMemo } from 'react'
import { CylinderGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { soffitAt } from './interior/ceilings'
import { CEILING, CORRIDOR, FALSE_CEILING, UNITS, toX, toZ, type RoomRect, type UnitId } from './plan'
import type { Materials } from './materials'

interface Lamp {
  x: number
  z: number
  ceiling: number
  /** Toilets reuse their false-ceiling downlight. */
  fixture: boolean
  intensity: number
}

const lamp = ({ rect: [x0, y0, x1, y1], toilet }: RoomRect): Lamp => ({
  x: toX((x0 + x1) / 2),
  z: toZ((y0 + y1) / 2),
  ceiling: toilet ? FALSE_CEILING : soffitAt(toX((x0 + x1) / 2), toZ((y0 + y1) / 2)),
  fixture: !toilet,
  intensity: 1.1 + (toX(x1) - toX(x0)) * (toZ(y1) - toZ(y0)) * 0.28,
})

/** One downlight per room, balconies excepted. */
const BY_FLAT = Object.fromEntries(
  UNITS.map((u) => [u.id, u.rooms.filter((r) => !r.name.includes('Balcony')).map(lamp)]),
) as Record<UnitId, Lamp[]>

const [cx0, cz0, cx1, cz1] = [toX(CORRIDOR.rect[0]), toZ(CORRIDOR.rect[1]), toX(CORRIDOR.rect[2]), toZ(CORRIDOR.rect[3])]
const CORRIDOR_LAMPS: Lamp[] = [0.17, 0.5, 0.83].map((t) => ({
  x: (cx0 + cx1) / 2,
  z: cz0 + (cz1 - cz0) * t,
  ceiling: CEILING,
  fixture: true,
  intensity: 1.8,
}))

/** Same light count for every flat, so switching flats never recompiles shaders. */
const POOL = Math.max(...Object.values(BY_FLAT).map((l) => l.length))

const FIXTURES = [...Object.values(BY_FLAT).flat(), ...CORRIDOR_LAMPS].filter((l) => l.fixture)
const merged = (r: number, h: number, dy: number) =>
  mergeGeometries(FIXTURES.map(({ x, z, ceiling }) => new CylinderGeometry(r, r, h, 32).translate(x, ceiling + dy, z)))

/** Warm 3000 K downlights in the flat you are in and the corridor; mounted only at night so daytime shaders stay light-free. */
export function NightLights({ m, flat }: { m: Materials; flat: UnitId }) {
  const fixtures = useMemo(() => ({ rims: merged(0.065, 0.008, -0.004), lenses: merged(0.048, 0.002, -0.0085) }), [])
  const lamps = BY_FLAT[flat]
  return (
    <>
      <mesh geometry={fixtures.rims} material={m.trim} />
      <mesh geometry={fixtures.lenses} material={m.downlight} />
      {Array.from({ length: POOL }, (_, i) => {
        const l = lamps[i]
        return (
          <pointLight
            key={i}
            position={l ? [l.x, l.ceiling - 0.22, l.z] : [0, -10, 0]}
            intensity={l ? l.intensity : 0}
            color="#ffe3c2"
            decay={2}
          />
        )
      })}
      {CORRIDOR_LAMPS.map((l, i) => (
        <pointLight key={`c${i}`} position={[l.x, l.ceiling - 0.22, l.z]} intensity={l.intensity} color="#ffe3c2" decay={2} />
      ))}
    </>
  )
}
