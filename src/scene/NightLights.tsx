import { FALSE_CEILING, CEILING, ROOMS, TOILETS, toX, toZ } from './plan'
import type { Materials } from './materials'

/** Rooms that get a ceiling downlight after dark (toilets reuse their existing false-ceiling downlight). */
const LIT = new Set([
  'Master Bedroom', 'Master Dress', 'Master Toilet', 'Kids Room', 'Parents Room', 'Parents Dress',
  'Parents Toilet', 'Common Toilet', 'Utility', 'Kitchen', 'Foyer', 'Passage', 'Lobby', 'Living', 'Dining',
])

const LIGHTS = ROOMS.filter((r) => LIT.has(r.name)).map(({ rect }) => {
  const [x0, y0, x1, y1] = rect
  const toilet = TOILETS.some((t) => t.every((v, i) => v === rect[i]))
  const area = ((x1 - x0) / 69) * ((y1 - y0) / 69)
  return {
    x: toX((x0 + x1) / 2),
    z: toZ((y0 + y1) / 2),
    ceiling: toilet ? FALSE_CEILING : CEILING,
    fixture: !toilet,
    intensity: 1.1 + area * 0.28,
  }
})

/** Warm 3000 K downlights; mounted only at night so daytime shaders stay light-free. */
export function NightLights({ m }: { m: Materials }) {
  return LIGHTS.map(({ x, z, ceiling, fixture, intensity }, i) => (
    <group key={i} position={[x, ceiling, z]}>
      <pointLight position-y={-0.22} intensity={intensity} color="#ffe3c2" decay={2} />
      {fixture && (
        <>
          <mesh material={m.trim} position-y={-0.004}>
            <cylinderGeometry args={[0.065, 0.065, 0.008, 32]} />
          </mesh>
          <mesh material={m.downlight} position-y={-0.0085}>
            <cylinderGeometry args={[0.048, 0.048, 0.002, 32]} />
          </mesh>
        </>
      )}
    </group>
  ))
}
