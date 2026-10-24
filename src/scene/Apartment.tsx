import { MeshReflectorMaterial } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import {
  boxesToGeometry,
  buildFinishes,
  buildLobby,
  buildOpenings,
  buildWalls,
  floorGeometry,
  footprintMetres,
  type Box,
} from './geometry'
import { FLOOR_TILE_REPEAT, MARBLE_REPEAT, DADO_REPEAT, type Materials } from './materials'
import { CEILING, FLOOR_OUTLINE, FOOTPRINT, WOOD_ZONES, toX, toZ } from './plan'
import { Doors, Handle } from './Doors'

const half = ({ min, max }: Box) =>
  [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2] as [number, number, number]
const center = ({ min, max }: Box) =>
  [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2] as [number, number, number]

export function Apartment({ m }: { m: Materials }) {
  const built = useMemo(() => {
    const walls = buildWalls()
    const openings = buildOpenings()
    const finishes = buildFinishes()
    const lobby = buildLobby()
    const [fx0, fz0, fx1, fz1] = footprintMetres(FOOTPRINT)

    const slab: Box = { min: [fx0 - 0.6, CEILING, fz0 - 0.6], max: [fx1 + 0.6, CEILING + 0.25, fz1 + 0.6] }
    const lobbyCeiling: Box = { min: [fx1 + 0.6, CEILING, toZ(277)], max: [toX(1002), CEILING + 0.25, toZ(412)] }
    const base: Box = { min: [fx0 - 0.6, -0.25, fz0 - 0.6], max: [toX(1002), 0, fz1 + 0.6] }

    // The reflector assumes a local +Z normal, so the floor is authored in XY and the mesh is turned flat.
    const tile = floorGeometry(FLOOR_OUTLINE.map(footprintMetres), FLOOR_TILE_REPEAT).rotateX(Math.PI / 2)

    return {
      walls: boxesToGeometry([...walls.solid, ...openings.parapet], { uvScale: 2.2, cullHidden: true }),
      tileSkirting: boxesToGeometry(walls.tileSkirting),
      woodSkirting: boxesToGeometry(walls.woodSkirting, { uvScale: 1.1 }),
      ceiling: boxesToGeometry([slab, lobbyCeiling]),
      tile,
      wood: floorGeometry(WOOD_ZONES.map(footprintMetres), 1.7),
      lobbyFloor: floorGeometry([lobby.floor], 1.2),
      marble: boxesToGeometry(finishes.marble, { uvScale: MARBLE_REPEAT }),
      dado: boxesToGeometry(finishes.dado, { uvScale: DADO_REPEAT }),
      lilac: boxesToGeometry(finishes.lilac),
      trim: boxesToGeometry(finishes.trim),
      downlights: finishes.downlights,
      frames: boxesToGeometry([...openings.frames, ...lobby.frame], { uvScale: 1.1 }),
      lobbyLeaf: boxesToGeometry([lobby.leaf], { uvScale: 1.1 }),
      lobbyHandle: lobby.handle,
      upvc: boxesToGeometry(openings.upvc),
      interlock: boxesToGeometry(openings.interlock),
      metal: boxesToGeometry(openings.metal),
      steel: boxesToGeometry(openings.steel),
      glass: boxesToGeometry(openings.glass),
      frosted: boxesToGeometry(openings.frosted),
      colliders: [...walls.solid, ...openings.colliders, slab, lobbyCeiling, base],
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
      {built.downlights.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh material={m.trim} position-y={-0.004}>
            <cylinderGeometry args={[0.062, 0.062, 0.008, 32]} />
          </mesh>
          <mesh material={m.downlight} position-y={-0.0085}>
            <cylinderGeometry args={[0.046, 0.046, 0.002, 32]} />
          </mesh>
        </group>
      ))}

      <mesh geometry={built.frames} material={m.wenge} castShadow receiveShadow />
      <mesh geometry={built.lobbyLeaf} material={m.wengeLeaf} receiveShadow />
      <Handle m={m} position={built.lobbyHandle} rotation-y={-Math.PI / 2} side={1} />
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
