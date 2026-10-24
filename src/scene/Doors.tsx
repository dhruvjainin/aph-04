import { useFrame, type ThreeElements } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { Quaternion, Vector3, type Mesh } from 'three'
import { doorRegistry, markShadowsDirty } from '../store'
import { boxesToGeometry, type Box, type DoorSpec } from './geometry'
import type { Materials } from './materials'

const UP = new Vector3(0, 1, 0)

export function Doors({ specs, m }: { specs: DoorSpec[]; m: Materials }) {
  return specs.map((s) => <Door key={s.key} spec={s} m={m} />)
}

/** Stainless lever on a long backplate; local +Z points out of the door face, the lever runs toward -X. */
export function Handle({ m, side, ...props }: { m: Materials; side: 1 | -1 } & ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh material={m.steel} position={[0, -0.045, side * 0.004]}>
        <boxGeometry args={[0.04, 0.24, 0.008]} />
      </mesh>
      <mesh material={m.steel} position={[0, 0, side * 0.026]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.04, 12]} />
      </mesh>
      <mesh material={m.steel} position={[-0.062, 0, side * 0.046]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.0095, 0.12, 4, 12]} />
      </mesh>
    </group>
  )
}

function Door({ spec, m }: { spec: DoorSpec; m: Materials }) {
  const body = useRef<RapierRigidBody>(null)
  const leaf = useRef<Mesh>(null)
  const progress = useRef(spec.open ? 1 : 0)
  const target = useRef(progress.current)
  const q = useMemo(() => new Quaternion(), [])

  const { width, height, thickness, zOffset } = spec
  const leafCenter: [number, number, number] = [width / 2, height / 2, zOffset]
  const initialYaw = spec.baseYaw + spec.openDelta * progress.current
  const upvc = spec.style === 'upvc'

  const geo = useMemo(() => {
    const z0 = zOffset - thickness / 2
    const z1 = zOffset + thickness / 2
    const solid = boxesToGeometry([{ min: [0, 0, z0], max: [width, height, z1] }], { uvScale: 1.1 })
    if (!upvc) return { solid }
    // White uPVC stiles and rails around one tall glass panel.
    const S = 0.09
    const B = 0.14
    const frame: Box[] = [
      { min: [0, 0, z0], max: [S, height, z1] },
      { min: [width - S, 0, z0], max: [width, height, z1] },
      { min: [S, 0, z0], max: [width - S, B, z1] },
      { min: [S, height - S, z0], max: [width - S, height, z1] },
    ]
    const pane: Box = { min: [S - 0.01, B - 0.01, zOffset - 0.003], max: [width - S + 0.01, height - S + 0.01, zOffset + 0.003] }
    return { solid, frame: boxesToGeometry(frame), pane: boxesToGeometry([pane]) }
  }, [width, height, thickness, zOffset, upvc])

  useEffect(() => {
    const mesh = leaf.current
    if (!mesh) return
    doorRegistry.set(mesh, {
      toggle: () => (target.current = target.current > 0.5 ? 0 : 1),
      isOpen: () => target.current > 0.5,
    })
    return () => void doorRegistry.delete(mesh)
  }, [])

  useFrame((_, dt) => {
    const d = target.current - progress.current
    if (Math.abs(d) < 1e-4 || !body.current) return
    const step = Math.sign(d) * Math.min(Math.abs(d), dt * 1.4)
    progress.current += step
    const t = progress.current
    const eased = t * t * (3 - 2 * t)
    q.setFromAxisAngle(UP, spec.baseYaw + spec.openDelta * eased)
    body.current.setNextKinematicRotation(q)
    markShadowsDirty()
  })

  const handleX = width - (upvc ? 0.045 : 0.07)

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={spec.pivot} rotation={[0, initialYaw, 0]}>
      <CuboidCollider args={[width / 2, height / 2, thickness / 2]} position={leafCenter} />
      {/* The solid leaf doubles as the interaction target; for glazed doors it stays invisible (raycasts ignore visibility). */}
      <mesh ref={leaf} geometry={geo.solid} material={m.wengeLeaf} visible={!upvc} castShadow receiveShadow />
      {geo.frame && <mesh geometry={geo.frame} material={m.upvc} castShadow receiveShadow />}
      {geo.pane && <mesh geometry={geo.pane} material={m.glass} renderOrder={2} />}
      {([-1, 1] as const).map((side) => (
        <Handle key={side} m={m} side={side} position={[handleX, 1.02, zOffset + (side * thickness) / 2]} />
      ))}
      {spec.entry && (
        <mesh material={m.steel} position={[width / 2, 1.55, zOffset]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.011, 0.011, thickness + 0.008, 20]} />
        </mesh>
      )}
    </RigidBody>
  )
}
