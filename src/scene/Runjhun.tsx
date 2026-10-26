import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, CapsuleGeometry, Color, LatheGeometry, MeshStandardMaterial, Quaternion, SphereGeometry, Vector2, Vector3, type BufferGeometry, type Group, type Mesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { doorRegistry, markShadowsDirty, openMenu, player } from '../store'
import { toX, toZ, type Unit } from './plan'

const SKIN = '#b97c5a'
const HAIR = '#1e140f'
const DRESS = '#f1dc8c'
const SCALE = 0.93

const tint = (g: BufferGeometry, hex: string) => {
  const c = new Color(hex)
  const n = g.attributes.position.count
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.toArray(a, i * 3)
  g.setAttribute('color', new BufferAttribute(a, 3))
  return g
}

const ball = (r: number, x: number, y: number, z: number, hex: string, sx = 1, sy = 1, sz = 1) =>
  tint(new SphereGeometry(r, 20, 14).scale(sx, sy, sz).translate(x, y, z), hex)

const limb = (a: Vector3, b: Vector3, r: number, hex: string) => {
  const d = b.clone().sub(a)
  const g = new CapsuleGeometry(r, Math.max(d.length() - 2 * r, 0.001), 6, 12)
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()))
  const mid = a.clone().add(b).multiplyScalar(0.5)
  return tint(g.translate(mid.x, mid.y, mid.z), hex)
}

/** One merged mesh, facing +z, feet on y = 0. */
function buildRunjhun() {
  const parts: BufferGeometry[] = []
  const dress = [[0, 0.3], [0.27, 0.3], [0.265, 0.6], [0.21, 0.95], [0.2, 1.05], [0.225, 1.2], [0.19, 1.32], [0.1, 1.4], [0.06, 1.44], [0, 1.44]]
  parts.push(tint(new LatheGeometry(dress.map(([r, y]) => new Vector2(r, y)), 32).scale(1, 1, 0.8), DRESS))
  for (const s of [-1, 1]) {
    parts.push(limb(new Vector3(s * 0.075, 0.06, 0.02), new Vector3(s * 0.075, 0.34, 0), 0.04, SKIN))
    parts.push(ball(0.04, s * 0.075, 0.035, 0.05, SKIN, 1, 0.6, 1.6))
    parts.push(ball(0.058, s * 0.17, 1.33, 0, DRESS))
    parts.push(limb(new Vector3(s * 0.17, 1.33, 0), new Vector3(s * 0.235, 1.12, 0.07), 0.05, DRESS))
    parts.push(limb(new Vector3(s * 0.235, 1.12, 0.07), new Vector3(s * 0.12, 1.04, 0.17), 0.045, DRESS))
    parts.push(ball(0.04, s * 0.085, 1.025, 0.19, SKIN))
    parts.push(ball(0.009, s * 0.033, 1.575, 0.098, '#241713'))
  }
  parts.push(limb(new Vector3(0, 1.42, 0), new Vector3(0, 1.5, 0), 0.036, SKIN))
  parts.push(ball(0.092, 0, 1.565, 0.015, SKIN, 1, 1.12, 1))
  parts.push(ball(0.012, 0, 1.528, 0.093, '#8a3b3b', 2.4, 0.5, 0.5))
  parts.push(ball(0.108, 0, 1.59, -0.025, HAIR, 1, 1.05, 1))
  parts.push(ball(0.12, 0, 1.5, -0.055, HAIR, 1, 1.5, 0.9))
  for (const [x, y, z] of [[-0.1, 1.4, -0.03], [0.1, 1.4, -0.03], [-0.08, 1.33, -0.07], [0.08, 1.33, -0.07], [0, 1.32, -0.09], [-0.12, 1.47, 0.0], [0.12, 1.47, 0.0]])
    parts.push(ball(0.04, x, y, z, HAIR))
  return mergeGeometries(parts)
}

export function Runjhun({ unit }: { unit: Unit }) {
  const home = useMemo(() => {
    const [x0, y0, x1, y1] = unit.rooms.find((r) => r.name === 'Living')!.rect
    const x = toX((x0 + x1) / 2)
    const z = toZ((y0 + y1) / 2)
    return { x, z, yaw: Math.atan2(unit.spawn.x - x, unit.spawn.z - z) }
  }, [unit])
  const geometry = useMemo(buildRunjhun, [])
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), [])
  const group = useRef<Group>(null)
  const mesh = useRef<Mesh>(null)
  const yaw = useRef(home.yaw)

  useEffect(() => {
    const m = mesh.current!
    doorRegistry.set(m, {
      toggle: openMenu,
      isOpen: () => false,
      noun: 'Runjhun',
      verb: 'Talk to',
    })
    return () => void doorRegistry.delete(m)
  }, [])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const dx = player.pos.x - home.x
    const dz = player.pos.z - home.z
    // Turns to look at you when you are close.
    const face = Math.hypot(dx, dz) < 3.5 ? Math.atan2(dx, dz) : home.yaw
    const d = Math.atan2(Math.sin(face - yaw.current), Math.cos(face - yaw.current))
    if (Math.abs(d) < 0.005) return
    yaw.current += d * Math.min(1, Math.min(dt, 0.05) * 8)
    g.rotation.y = yaw.current
    markShadowsDirty()
  })

  return (
    <group ref={group} position={[home.x, 0, home.z]} rotation-y={home.yaw} scale={SCALE}>
      <mesh ref={mesh} geometry={geometry} material={material} castShadow />
    </group>
  )
}
