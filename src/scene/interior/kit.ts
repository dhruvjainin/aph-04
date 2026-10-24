import { BufferGeometry, Matrix4, Shape, ShapeGeometry, Vector3 } from 'three'
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
  | 'cane'
  | 'glass'
  | 'flame'
  | 'twig'
  | 'cab'
  | 'verde'
  | 'gtile'
  | 'frost'

export type Parts = Partial<Record<Key, BufferGeometry[]>>

/** A drawer or shutter that toggles on interaction: geometry is relative to `pivot`, which slides by `slide` or turns by `yaw`. */
export interface Moving {
  geometry: BufferGeometry
  key: Key
  noun: 'drawer' | 'shutter'
  pivot: V3
  slide?: V3
  yaw?: number
}

export interface Built {
  parts: Parts
  colliders: Box[]
  moving?: Moving[]
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

/** Flat rectangle standing on y = 0 with UVs in metres, so repeating textures keep their pitch. */
export const panel = (w: number, h: number) => new ShapeGeometry(roundedRect(w, h, 0.001)).translate(0, h / 2, 0)

export type Frame = ReturnType<typeof frame>

function moving(f: Frame, boxes: Box[], at: Vector3, rest: Omit<Moving, 'geometry' | 'pivot'>): Moving {
  const p = at.applyMatrix4(f.m)
  return { ...rest, geometry: f.boxes(boxes, 1.4).translate(-p.x, -p.y, -p.z), pivot: [p.x, p.y, p.z] }
}

/** A drawer whose front spans local [s0, s1] × [y0, y1] × [z0, z1], with a box behind it that pulls out by `travel`. */
export function drawer(f: Frame, s0: number, s1: number, y0: number, y1: number, z0: number, z1: number, travel = 0.3, key: Key = 'teak') {
  const t = 0.012
  const [a, b] = [s0 + 0.015, s1 - 0.015]
  const [bot, top, back] = [y0 + 0.015, y1 - 0.03, z0 - travel - 0.02]
  const boxes = [
    lbox(s0, s1, y0, y1, z0, z1),
    lbox(a, a + t, bot, top, back, z0),
    lbox(b - t, b, bot, top, back, z0),
    lbox(a + t, b - t, bot, top, back, back + t),
    lbox(a + t, b - t, bot, bot + t, back + t, z0),
  ]
  const slide = new Vector3(0, 0, 1).transformDirection(f.m).multiplyScalar(travel)
  return moving(f, boxes, new Vector3((s0 + s1) / 2, y0, z1), { key, noun: 'drawer', slide: [slide.x, slide.y, slide.z] })
}

/** A shutter hinged on its left or right edge at the front face `z`, swinging out a right angle. */
export function shutter(f: Frame, boxes: Box[], hinge: number, z: number, side: 'left' | 'right', key: Key = 'teak') {
  return moving(f, boxes, new Vector3(hinge, 0, z), { key, noun: 'shutter', yaw: side === 'left' ? -Math.PI / 2 : Math.PI / 2 })
}

/** Open-fronted carcass interior (back, base, top, sides and a mid shelf) behind shutters, z from the wall to `z1`. */
export function cavity(s0: number, s1: number, y0: number, y1: number, z1: number): Box[] {
  const t = 0.018
  const mid = (y0 + y1) / 2
  return [
    lbox(s0, s1, y0, y1, 0, 0.015),
    lbox(s0, s1, y0, y0 + t, 0.015, z1),
    lbox(s0, s1, y1 - t, y1, 0.015, z1),
    lbox(s0, s0 + t, y0 + t, y1 - t, 0.015, z1),
    lbox(s1 - t, s1, y0 + t, y1 - t, 0.015, z1),
    lbox(s0 + t, s1 - t, mid - t / 2, mid + t / 2, 0.015, z1 - 0.02),
  ]
}
