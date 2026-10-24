import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, DoubleSide, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector2, type Group, type Mesh } from 'three'
import { doorRegistry, markShadowsDirty } from '../store'
import type { Box } from './geometry'
import { buildDining } from './interior/dining'
import { buildFoyer } from './interior/foyer'
import { buildKitchen } from './interior/kitchen'
import { merge, type Key, type Moving } from './interior/kit'
import { buildTvUnit } from './interior/tv'
import { GREEN_TILE_REPEAT, greenMarble, greenTile, whiteMarble, type Materials } from './materials'

/** A generic smart-TV home screen: a hero banner over rows of app tiles. */
function screenTexture() {
  const W = 1024
  const H = 576
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0c4f6e')
  bg.addColorStop(0.55, '#127a95')
  bg.addColorStop(1, '#0a3a55')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(160, 230, 245, ${0.08 + i * 0.02})`
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 300 + i * 40 + Math.sin(x / 70 + i) * 14)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.beginPath()
  ctx.roundRect(330, 20, 300, 28, 14)
  ctx.fill()

  const tile = (x: number, y: number, w: number, h: number, a: string, b: string) => {
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, a)
    g.addColorStop(1, b)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 8)
    ctx.fill()
  }
  tile(36, 70, 200, 120, '#f6b04a', '#d4552b')
  const hues = ['#3b5998', '#e0353b', '#7ac143', '#d9302f', '#2aa7e0', '#1f4aa0']
  hues.forEach((h, i) => tile(270 + i * 120, 90, 96, 96, h, '#ffffff22'))
  for (let i = 0; i < 5; i++) tile(36 + i * 196, 225, 176, 110, ['#e9c46a', '#f4a261', '#8ab17d', '#e76f51', '#90be6d'][i], '#00000040')
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 7; i++) tile(56 + i * 136, 365 + r * 92, 64, 64, `hsl(${(i * 47 + r * 120) % 360} 70% 55%)`, '#00000030')

  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Dark plum slats for the arched insets: one stripe per texture repeat. */
function stripeTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 32
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#4a3540'
  ctx.fillRect(0, 0, 4, 32)
  ctx.fillStyle = '#2a1c24'
  ctx.fillRect(0, 22, 4, 10)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(1, 30)
  t.colorSpace = SRGBColorSpace
  return t
}

/** Woven cane: straight and diagonal strands leaving small octagonal holes, one cell per 1.8 cm. */
function caneTexture() {
  const N = 64
  const c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#3d2814'
  ctx.fillRect(0, 0, N, N)
  ctx.lineCap = 'square'
  const strand = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
    ctx.strokeStyle = col
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
  for (const o of [-N, 0, N]) {
    strand(o, 0, o + N, N, 9, '#b98c50')
    strand(o, N, o + N, 0, 9, '#b98c50')
  }
  for (const o of [0, N]) {
    strand(0, o, N, o, 12, '#d8b57a')
    strand(o, 0, o, N, 12, '#cfaa6c')
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(55, 55)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

const NO_SHADOW = new Set<Key>(['screen', 'arch', 'disc', 'glass', 'flame', 'frost'])

const half = (b: Box) => [(b.max[0] - b.min[0]) / 2, (b.max[1] - b.min[1]) / 2, (b.max[2] - b.min[2]) / 2] as [number, number, number]
const mid = (b: Box) => [(b.max[0] + b.min[0]) / 2, (b.max[1] + b.min[1]) / 2, (b.max[2] + b.min[2]) / 2] as [number, number, number]

/** A drawer or shutter: toggled through the door registry, eased like the doors. */
function Movable({ mv, material }: { mv: Moving; material: MeshStandardMaterial }) {
  const group = useRef<Group>(null)
  const mesh = useRef<Mesh>(null)
  const progress = useRef(0)
  const target = useRef(0)

  useEffect(() => {
    const m = mesh.current
    if (!m) return
    doorRegistry.set(m, { toggle: () => (target.current = target.current > 0.5 ? 0 : 1), isOpen: () => target.current > 0.5, noun: mv.noun })
    return () => void doorRegistry.delete(m)
  }, [mv])

  useFrame((_, dt) => {
    const g = group.current
    const d = target.current - progress.current
    if (!g || Math.abs(d) < 1e-4) return
    progress.current += Math.sign(d) * Math.min(Math.abs(d), dt * 2.2)
    const t = progress.current
    const e = t * t * (3 - 2 * t)
    if (mv.yaw) g.rotation.y = mv.yaw * e
    if (mv.slide) g.position.set(mv.pivot[0] + mv.slide[0] * e, mv.pivot[1] + mv.slide[1] * e, mv.pivot[2] + mv.slide[2] * e)
    markShadowsDirty()
  })

  return (
    <group ref={group} position={mv.pivot}>
      <mesh ref={mesh} geometry={mv.geometry} material={material} castShadow receiveShadow />
    </group>
  )
}

/** Furniture and fit-out, mounted on /dmr only: one merged mesh per material, plus drawers and shutters that open. */
export function Interior({ m }: { m: Materials }) {
  const built = useMemo(() => {
    const pieces = [buildTvUnit(), buildDining(), buildFoyer(), buildKitchen()]
    const lists: Partial<Record<Key, Parameters<typeof merge>[0]>> = {}
    for (const { parts } of pieces)
      for (const [k, g] of Object.entries(parts) as [Key, Parameters<typeof merge>[0]][]) (lists[k] ??= []).push(...g)
    const meshes = (Object.entries(lists) as [Key, Parameters<typeof merge>[0]][]).map(([k, g]) => {
      const merged = merge(g)
      g.forEach((x) => x.dispose())
      return [k, merged] as const
    })
    return { meshes, colliders: pieces.flatMap((p) => p.colliders), moving: pieces.flatMap((p) => p.moving ?? []) }
  }, [])

  const mat = useMemo((): Record<Key, MeshStandardMaterial> => {
    const screenMap = screenTexture()
    const marbleMap = whiteMarble()
    const tileMap = greenTile()
    tileMap.repeat.set(1 / GREEN_TILE_REPEAT, 1 / GREEN_TILE_REPEAT)
    // Grout lines land on the counter top at 0.9 m.
    tileMap.offset.set(0, 0.5)
    return {
      cream: new MeshStandardMaterial({ color: new Color('#ece4d6'), roughness: 0.55 }),
      backing: new MeshStandardMaterial({ color: new Color('#b7ab98'), roughness: 0.8 }),
      flutes: new MeshStandardMaterial({ color: new Color('#ddd1bd'), roughness: 0.6 }),
      teak: new MeshStandardMaterial({
        map: m.wengeLeaf.map,
        normalMap: m.wengeLeaf.normalMap,
        roughnessMap: m.wengeLeaf.roughnessMap,
        normalScale: new Vector2(0.3, 0.3),
        roughness: 0.5,
        color: new Color('#a06a44'),
      }),
      reveal: new MeshStandardMaterial({ color: new Color('#2a1a14'), roughness: 0.9 }),
      bronze: new MeshStandardMaterial({ color: new Color('#5a4a3a'), metalness: 0.4, roughness: 0.08, transparent: true, opacity: 0.75 }),
      brass: new MeshStandardMaterial({ color: new Color('#c9a45c'), metalness: 1, roughness: 0.28 }),
      bezel: new MeshStandardMaterial({ color: new Color('#111214'), roughness: 0.25 }),
      screen: new MeshStandardMaterial({
        map: screenMap,
        color: new Color('#3a3a3a'),
        emissive: new Color('#ffffff'),
        emissiveMap: screenMap,
        emissiveIntensity: 0.8,
        roughness: 0.12,
      }),
      ceramic: new MeshStandardMaterial({ color: new Color('#1b1b1d'), roughness: 0.18 }),
      shade: new MeshStandardMaterial({ color: new Color('#f3ead6'), roughness: 0.85, side: DoubleSide }),
      marble: new MeshStandardMaterial({ map: marbleMap, roughness: 0.08, envMapIntensity: 1.1 }),
      fabric: new MeshStandardMaterial({ color: new Color('#e6ddcf'), roughness: 0.95 }),
      arch: new MeshStandardMaterial({ map: stripeTexture(), roughness: 0.7 }),
      disc: new MeshStandardMaterial({ color: new Color('#f4efe6'), emissive: new Color('#ffe8c4'), emissiveIntensity: 0.35, roughness: 0.4 }),
      cane: new MeshStandardMaterial({ map: caneTexture(), roughness: 0.75 }),
      glass: new MeshStandardMaterial({
        color: new Color('#d9d4c8'),
        metalness: 0.2,
        roughness: 0.05,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: DoubleSide,
      }),
      flame: new MeshStandardMaterial({ color: new Color('#ffd27a'), emissive: new Color('#ffb347'), emissiveIntensity: 2 }),
      twig: new MeshStandardMaterial({ color: new Color('#8a7a4a'), roughness: 0.9 }),
      cab: new MeshStandardMaterial({ color: new Color('#e6dccb'), roughness: 0.5 }),
      verde: new MeshStandardMaterial({ map: greenMarble(), roughness: 0.1, envMapIntensity: 1.1 }),
      gtile: new MeshStandardMaterial({ map: tileMap, roughness: 0.18 }),
      frost: new MeshStandardMaterial({
        color: new Color('#eef0ea'),
        roughness: 0.35,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: DoubleSide,
      }),
    }
  }, [m])

  useEffect(
    () => () => {
      built.meshes.forEach(([, g]) => g.dispose())
      built.moving.forEach((mv) => mv.geometry.dispose())
      for (const [k, x] of Object.entries(mat)) {
        if (k !== 'teak') x.map?.dispose()
        x.dispose()
      }
    },
    [built, mat],
  )

  return (
    <>
      {built.meshes.map(([k, g]) => (
        <mesh key={k} geometry={g} material={mat[k]} castShadow={!NO_SHADOW.has(k)} receiveShadow={k !== 'screen'} />
      ))}
      {built.moving.map((mv, i) => (
        <Movable key={i} mv={mv} material={mat[mv.key]} />
      ))}
      <RigidBody type="fixed" colliders={false}>
        {built.colliders.map((b, i) => (
          <CuboidCollider key={i} args={half(b)} position={mid(b)} friction={0} />
        ))}
      </RigidBody>
    </>
  )
}
