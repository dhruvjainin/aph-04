import { BufferGeometry, Matrix4, Shape, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { boxesToGeometry, type Box, type V3 } from '../geometry'

/** Interior materials; each piece of furniture contributes geometry per material, merged into one mesh each. */
export type Key =
  | 'cream'
  | 'backing'
  | 'flutes'
  | 'teak'
  | 'reveal'
  | 'bronze'
  | 'brass'
  | 'bezel'
  | 'screen'
  | 'ceramic'
  | 'shade'
  | 'marble'
  | 'fabric'
  | 'arch'
  | 'disc'

export type Parts = Partial<Record<Key, BufferGeometry[]>>

export interface Built {
  parts: Parts
  colliders: Box[]
}

export const add = (parts: Parts, key: Key, ...g: BufferGeometry[]) => void (parts[key] ??= []).push(...g)

/** Merge mixed indexed and non-indexed geometry (extrusions are non-indexed). */
export function merge(list: BufferGeometry[]) {
  const mixed = list.some((g) => g.index) && list.some((g) => !g.index)
  return mergeGeometries(
    list.map((g) => {
      const x = mixed && g.index ? g.toNonIndexed() : g
      x.clearGroups()
      return x
    }),
  )
}

export const lbox = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box => ({
  min: [x0, y0, z0],
  max: [x1, y1, z1],
})

/** World-space bounds of a local box under an axis-aligned frame. */
export function worldBox(m: Matrix4, { min, max }: Box): Box {
  const a = new Vector3(...min).applyMatrix4(m)
  const b = new Vector3(...max).applyMatrix4(m)
  return {
    min: [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)],
    max: [Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)],
  }
}

/**
 * A local frame standing against a wall: x runs along it (`along`), y is up, z comes off it into the room (`out`).
 * Build in local coordinates, then `place` the geometry.
 */
export function frame(origin: V3, along: V3, out: V3) {
  const m = new Matrix4().makeBasis(new Vector3(...along), new Vector3(0, 1, 0), new Vector3(...out)).setPosition(...origin)
  return {
    m,
    boxes: (boxes: Box[], uvScale = 1) => boxesToGeometry(boxes, { uvScale }).applyMatrix4(m),
    place: <G extends BufferGeometry>(g: G) => g.applyMatrix4(m),
    box: (b: Box) => worldBox(m, b),
  }
}

export function roundedRect(w: number, h: number, r: number) {
  const s = new Shape()
  const [x, y] = [-w / 2, -h / 2]
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}
