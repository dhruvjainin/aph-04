import { MeshReflectorMaterial } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import { CylinderGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  boxesToGeometry,
  buildCore,
  buildFinishes,
  buildOpenings,
  buildWalls,
  floorGeometry,
  footprintMetres,
  type Box,
  type V3,
} from './geometry'
import { FLOOR_TILE_REPEAT, MARBLE_REPEAT, DADO_REPEAT, type Materials } from './materials'
import { CEILING, CORRIDOR, FLOOR_OUTLINE, FOOTPRINT, WOOD_ZONES } from './plan'
import { Doors } from './Doors'

const half = ({ min, max }: Box) =>
  [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2] as [number, number, number]
const center = ({ min, max }: Box) =>
  [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2] as [number, number, number]

export function Apartment({ m }: { m: Materials }) {
  const built = useMemo(() => {
    const walls = buildWalls()
    const openings = buildOpenings()
    const finishes = buildFinishes()
    const core = buildCore()
    const [fx0, fz0, fx1, fz1] = footprintMetres(FOOTPRINT)

    const slab: Box = { min: [fx0 - 0.6, CEILING, fz0 - 0.6], max: [fx1 + 0.6, CEILING + 0.25, fz1 + 0.6] }
    const base: Box = { min: [fx0 - 0.6, -0.25, fz0 - 0.6], max: [fx1 + 0.6, 0, fz1 + 0.6] }

    // The reflector assumes a local +Z normal, so the floor is authored in XY and the mesh is turned flat.
    const tile = floorGeometry(FLOOR_OUTLINE.map(footprintMetres), FLOOR_TILE_REPEAT).rotateX(Math.PI / 2)

    return {
      walls: boxesToGeometry([...walls.solid, ...openings.parapet], { uvScale: 2.2, cullHidden: true }),
      tileSkirting: boxesToGeometry(walls.tileSkirting),
      woodSkirting: boxesToGeometry(walls.woodSkirting, { uvScale: 1.1 }),
      ceiling: boxesToGeometry([slab]),
      tile,
      wood: floorGeometry(WOOD_ZONES.map(footprintMetres), 1.7),
      lobbyFloor: floorGeometry([footprintMetres(CORRIDOR.rect)], 1.2),
      marble: boxesToGeometry(finishes.marble, { uvScale: MARBLE_REPEAT }),
      dado: boxesToGeometry(finishes.dado, { uvScale: DADO_REPEAT }),
      lilac: boxesToGeometry(finishes.lilac),
      trim: boxesToGeometry(finishes.trim),
      ...downlightGeometry(finishes.downlights),
      frames: boxesToGeometry(openings.frames, { uvScale: 1.1 }),
      upvc: boxesToGeometry(openings.upvc),
      interlock: boxesToGeometry([...openings.interlock, ...core.dark]),
      metal: boxesToGeometry(openings.metal),
      steel: boxesToGeometry([...openings.steel, ...core.steel]),
      glass: boxesToGeometry(openings.glass),
      frosted: boxesToGeometry(openings.frosted),
      colliders: [...walls.solid, ...openings.colliders, slab, base],
      doors: openings.doors,
    }
  }, [])

  return (
    <>
      <mesh geometry={built.walls} material={m.wall} castShadow receiveShadow />
      <mesh geometry={built.tileSkirting} material={m.tileSkirting} receiveShadow />
      <mesh geometry={built.woodSkirting} material={m.wenge} receiveShadow />
      <mesh name="ceiling" geometry={built.ceiling} material={m.ceiling} castShadow receiveShadow />

      <mesh geometry={built.tile} rotation-x={-Math.PI / 2} receiveShadow>
        <MeshReflectorMaterial
          map={m.floorMap}
          roughness={0.2}
          envMapIntensity={0.5}
          resolution={256}
          blur={[220, 80]}
          mixBlur={0.7}
          mixStrength={0.85}
          mirror={0.45}
          mixContrast={1}
          depthScale={0}
        />
      </mesh>
      <mesh geometry={built.wood} material={m.wood} receiveShadow />
      <mesh geometry={built.lobbyFloor} material={m.lobbyFloor} receiveShadow />

      <mesh geometry={built.marble} material={m.marble} />
      <mesh geometry={built.dado} material={m.dado} receiveShadow />
      <mesh geometry={built.lilac} material={m.lilac} />
      <mesh geometry={built.trim} material={m.trim} />
      <mesh geometry={built.downlightRims} material={m.trim} />
      <mesh geometry={built.downlightLenses} material={m.downlight} />

      <mesh geometry={built.frames} material={m.wenge} castShadow receiveShadow />
      <mesh geometry={built.upvc} material={m.upvc} castShadow receiveShadow />
      <mesh geometry={built.interlock} material={m.interlock} castShadow />
      <mesh geometry={built.metal} material={m.metal} castShadow />
      <mesh geometry={built.steel} material={m.steel} castShadow />
      <mesh geometry={built.frosted} material={m.frosted} renderOrder={1} />
      <mesh geometry={built.glass} material={m.glass} renderOrder={2} />

      <RigidBody type="fixed" colliders={false}>
        {built.colliders.map((b, i) => (
          <CuboidCollider key={i} args={half(b)} position={center(b)} friction={0} />
        ))}
      </RigidBody>

      <Doors specs={built.doors} m={m} />
    </>
  )
}

/** Toilet downlights: a trim ring and a glowing lens each, merged into two meshes. */
function downlightGeometry(points: V3[]) {
  const merged = (r: number, h: number, dy: number) =>
    mergeGeometries(points.map(([x, y, z]) => new CylinderGeometry(r, r, h, 32).translate(x, y + dy, z)))
  return { downlightRims: merged(0.062, 0.008, -0.004), downlightLenses: merged(0.046, 0.002, -0.0085) }
}
