import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type Mesh,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { doorRegistry, markShadowsDirty } from '../store'
import { boxesToGeometry, type Box, type DoorSpec } from './geometry'
import type { Materials } from './materials'

const UP = new Vector3(0, 1, 0)

export function Doors({ specs, m }: { specs: DoorSpec[]; m: Materials }) {
  return specs.map((s) => <Door key={s.key} spec={s} m={m} />)
}

/** Stainless levers on long backplates, one per face; local +Z points out of a face, the lever runs toward -X. */
function handlesGeometry(x: number, z0: number, z1: number) {
  const parts = ([[-1, z0], [1, z1]] as const).flatMap(([side, z]) => [
    new BoxGeometry(0.04, 0.24, 0.008).translate(x, 1.02 - 0.045, z + side * 0.004),
    new CylinderGeometry(0.009, 0.009, 0.04, 12).rotateX(Math.PI / 2).translate(x, 1.02, z + side * 0.026),
    new CapsuleGeometry(0.0095, 0.12, 4, 12).rotateZ(Math.PI / 2).translate(x - 0.062, 1.02, z + side * 0.046),
  ])
  return mergeGeometries(parts.map((g) => g.toNonIndexed()))
}

const PLATE: [number, number] = [0.26, 0.085]

/** Brushed brass plate with the flat number engraved in dark letters. */
function plateMaterial(text: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = Math.round((512 * PLATE[1]) / PLATE[0])
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, c.width, c.height)
  g.addColorStop(0, '#c9a961')
  g.addColorStop(0.5, '#e2c785')
  g.addColorStop(1, '#b8954c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = 'rgba(60, 42, 14, 0.55)'
  ctx.lineWidth = 6
  ctx.strokeRect(14, 14, c.width - 28, c.height - 28)
  ctx.fillStyle = '#2b2116'
  ctx.font = '600 120px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, c.width / 2, c.height / 2 + 6)
  const map = new CanvasTexture(c)
  map.colorSpace = SRGBColorSpace
  map.anisotropy = 8
  return new MeshStandardMaterial({ map, metalness: 0.6, roughness: 0.35 })
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
    const handles = handlesGeometry(width - (upvc ? 0.045 : 0.07), z0, z1)
    if (!upvc) return { solid, handles }
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
    return { solid, handles, frame: boxesToGeometry(frame), pane: boxesToGeometry([pane]) }
  }, [width, height, thickness, zOffset, upvc])

  // The leaf spans from the hinge-side wall face (z = 0) to its outer face, which faces the corridor.
  const outer = 2 * zOffset
  const plate = useMemo(() => (spec.label ? plateMaterial(spec.label) : null), [spec.label])

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

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={spec.pivot} rotation={[0, initialYaw, 0]}>
      <CuboidCollider args={[width / 2, height / 2, thickness / 2]} position={leafCenter} />
      {/* The solid leaf doubles as the interaction target; for glazed doors it stays invisible (raycasts ignore visibility). */}
      <mesh ref={leaf} geometry={geo.solid} material={m.wengeLeaf} visible={!upvc} castShadow receiveShadow />
      {geo.frame && <mesh geometry={geo.frame} material={m.upvc} castShadow receiveShadow />}
      {geo.pane && <mesh geometry={geo.pane} material={m.glass} renderOrder={2} />}
      <mesh geometry={geo.handles} material={m.steel} />
      {plate && (
        <mesh
          material={plate}
          position={[width / 2, 1.78, outer + Math.sign(zOffset) * 0.002]}
          rotation-y={zOffset < 0 ? Math.PI : 0}
        >
          <boxGeometry args={[PLATE[0], PLATE[1], 0.004]} />
        </mesh>
      )}
      {spec.entry && (
        <mesh material={m.steel} position={[width / 2, 1.55, zOffset]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.011, 0.011, thickness + 0.008, 20]} />
        </mesh>
      )}
    </RigidBody>
  )
}
