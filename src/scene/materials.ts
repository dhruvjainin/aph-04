import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import {
  CanvasTexture,
  Color,
  FrontSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  type Texture,
} from 'three'

const T = (n: string) => `/textures/${n}.jpg`

const SETS = {
  woodD: T('laminate_floor_02_diff'),
  woodN: T('laminate_floor_02_nor_gl'),
  woodR: T('laminate_floor_02_arm'),
  oakD: T('oak_veneer_01_diff'),
  oakN: T('oak_veneer_01_nor_gl'),
  oakR: T('oak_veneer_01_arm'),
}

Object.values(SETS).forEach((url) => useTexture.preload(url))

// ─── procedural finishes (deterministic, generated once on a canvas) ───────

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Soften a tile region in place; hides the gradient dithering canvases add, which shows up as fine stripes close up. */
function soften(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, px: number) {
  ctx.filter = `blur(${px}px)`
  ctx.drawImage(ctx.canvas, x, y, w, h, x, y, w, h)
  ctx.filter = 'none'
}

const rgba = (r: number, g: number, b: number, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`

function clouds(ctx: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, n: number, tones: [number, number, number, number][]) {
  for (let i = 0; i < n; i++) {
    const cx = x + rand() * w
    const cy = y + rand() * h
    const r = (0.08 + rand() * 0.3) * Math.max(w, h)
    const [cr, cg, cb, ca] = tones[i % tones.length]
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, rgba(cr, cg, cb, ca))
    g.addColorStop(1, rgba(cr, cg, cb, 0))
    ctx.fillStyle = g
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  }
}

function veins(ctx: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, n: number, color: string, width: number, blur: number) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    ctx.filter = `blur(${blur * (0.5 + rand())}px)`
    ctx.lineWidth = width * (0.3 + rand())
    const sx = x + rand() * w
    const sy = y - h * 0.1
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.bezierCurveTo(
      sx + (rand() - 0.3) * w, y + h * 0.35,
      sx + (rand() - 0.6) * w, y + h * 0.7,
      sx + (rand() - 0.5) * w * 1.4, y + h * 1.1,
    )
    ctx.stroke()
  }
  ctx.restore()
}

/** Wandering random-walk veins with occasional forks, like natural stone. */
function stoneVeins(ctx: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, n: number, color: string, width: number, blur: number) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineCap = ctx.lineJoin = 'round'
  const walk = (px: number, py: number, angle: number, len: number, lw: number, depth: number) => {
    ctx.filter = `blur(${blur}px)`
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(px, py)
    for (let d = 0; d < len; d += 6) {
      angle += (rand() - 0.5) * 0.45
      px += Math.cos(angle) * 6
      py += Math.sin(angle) * 6
      ctx.lineTo(px, py)
      if (depth < 2 && rand() < 0.012) walk(px, py, angle + (rand() - 0.5) * 1.6, len * 0.35, lw * 0.6, depth + 1)
    }
    ctx.stroke()
  }
  for (let i = 0; i < n; i++) {
    const sx = x + rand() * w
    const sy = y + rand() * h * 0.3
    walk(sx, sy, Math.PI * (0.25 + rand() * 0.5), h * (0.5 + rand()), width * (0.4 + rand()), 0)
  }
  ctx.restore()
}

/** Tiles of `cols × rows` per texture repeat, each drawn by `tile`, separated by `grout`. */
function tiled(size: number, cols: number, rows: number, grout: string, groutPx: number, tile: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void) {
  return canvasTexture(size, (ctx) => {
    const tw = size / cols
    const th = size / rows
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(i * tw, j * th, tw, th)
        ctx.clip()
        tile(ctx, i * tw, j * th, tw, th)
        ctx.restore()
      }
    ctx.fillStyle = grout
    const g = groutPx / 2
    for (let i = 0; i <= cols; i++) ctx.fillRect(i * tw - g, 0, groutPx, size)
    for (let j = 0; j <= rows; j++) ctx.fillRect(0, j * th - g, size, groutPx)
  })
}

/** 800 × 800 glossy cream vitrified tile; one repeat = 1.6 m (2 × 2 tiles). */
export const FLOOR_TILE_REPEAT = 1.6
function floorTile() {
  const rand = rng(11)
  return tiled(1024, 2, 2, '#c4baa9', 2, (ctx, x, y, w, h) => {
    const l = 0.985 + rand() * 0.02
    ctx.fillStyle = rgba(233 * l, 226 * l, 213 * l)
    ctx.fillRect(x, y, w, h)
    clouds(ctx, rand, x, y, w, h, 70, [
      [214, 202, 182, 0.06],
      [246, 242, 233, 0.08],
      [222, 212, 196, 0.05],
    ])
    soften(ctx, x, y, w, h, 3)
    veins(ctx, rand, x, y, w, h, 4, rgba(205, 192, 172, 0.12), 3, 3)
  })
}

/** Glossy light-grey marble-look wall tile, 600 × 1200 portrait; one repeat = 1.2 m. */
export const MARBLE_REPEAT = 1.2
function marbleTile() {
  const rand = rng(23)
  return tiled(1024, 2, 1, '#e4e4e2', 2, (ctx, x, y, w, h) => {
    ctx.fillStyle = rgba(190, 191, 193)
    ctx.fillRect(x, y, w, h)
    clouds(ctx, rand, x, y, w, h, 60, [
      [160, 162, 166, 0.08],
      [222, 223, 224, 0.1],
      [176, 177, 180, 0.07],
    ])
    soften(ctx, x, y, w, h, 3)
    stoneVeins(ctx, rand, x, y, w, h, 3, 'rgba(240,240,240,0.18)', 14, 6)
    stoneVeins(ctx, rand, x, y, w, h, 5, 'rgba(250,250,250,0.4)', 2.2, 0.8)
    stoneVeins(ctx, rand, x, y, w, h, 6, 'rgba(255,255,255,0.3)', 0.9, 0.3)
  })
}

/** 100 mm glossy white square tiles; one repeat = 0.4 m. */
export const DADO_REPEAT = 0.4
function dadoTile() {
  const rand = rng(5)
  return tiled(512, 4, 4, '#cbc8c1', 3, (ctx, x, y, w, h) => {
    const l = 0.99 + rand() * 0.012
    ctx.fillStyle = rgba(245 * l, 245 * l, 241 * l)
    ctx.fillRect(x, y, w, h)
  })
}

export function useMaterials() {
  const tex = useTexture(SETS) as Record<keyof typeof SETS, Texture>

  return useMemo(() => {
    for (const [k, t] of Object.entries(tex)) {
      t.wrapS = t.wrapT = RepeatWrapping
      t.anisotropy = 8
      if (k.endsWith('D')) t.colorSpace = SRGBColorSpace
      t.needsUpdate = true
    }
    // Door leaves have horizontal grain: rotate the veneer a quarter turn.
    const rotated = (t: Texture) => {
      const r = t.clone()
      r.center.set(0.5, 0.5)
      r.rotation = Math.PI / 2
      r.needsUpdate = true
      return r
    }

    const floorMap = floorTile()
    const marbleMap = marbleTile()
    const dadoMap = dadoTile()
    // Band starts at 0.85 m: shift so a joint lands on its bottom edge.
    dadoMap.offset.set(0, -((0.85 / DADO_REPEAT) % 1))

    const wall = new MeshStandardMaterial({ color: new Color('#efede8'), roughness: 0.9 })
    wall.shadowSide = FrontSide
    const ceiling = new MeshStandardMaterial({ color: new Color('#f5f4f1'), roughness: 0.96 })
    // Cast from outer faces so trims and soffits sitting against walls never fight their depth.
    ceiling.shadowSide = FrontSide

    const tileSkirting = new MeshStandardMaterial({ color: new Color('#e7e0d2'), roughness: 0.18 })
    const lobbyFloor = new MeshStandardMaterial({ map: floorMap, color: new Color('#a4a39f'), roughness: 0.5 })

    const wood = new MeshStandardMaterial({
      map: tex.woodD,
      normalMap: tex.woodN,
      normalScale: new Vector2(0.5, 0.5),
      roughnessMap: tex.woodR,
      roughness: 0.55,
      color: new Color('#5e4436'),
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })

    const wengeBase = {
      normalScale: new Vector2(0.35, 0.35),
      roughness: 0.68,
      color: new Color('#4b403c'),
    }
    const wenge = new MeshStandardMaterial({ map: tex.oakD, normalMap: tex.oakN, roughnessMap: tex.oakR, ...wengeBase })
    const wengeLeaf = new MeshStandardMaterial({
      map: rotated(tex.oakD),
      normalMap: rotated(tex.oakN),
      roughnessMap: rotated(tex.oakR),
      ...wengeBase,
    })

    const upvc = new MeshStandardMaterial({ color: new Color('#f2f2ef'), roughness: 0.32 })
    const interlock = new MeshStandardMaterial({ color: new Color('#55585c'), roughness: 0.45 })
    const steel = new MeshStandardMaterial({ color: new Color('#cfd2d6'), metalness: 1, roughness: 0.22 })
    const metal = new MeshStandardMaterial({ color: new Color('#1d1e20'), metalness: 0.55, roughness: 0.42 })

    const marble = new MeshStandardMaterial({ map: marbleMap, roughness: 0.1, envMapIntensity: 1.1 })
    const dado = new MeshStandardMaterial({ map: dadoMap, roughness: 0.12 })
    const lilac = new MeshStandardMaterial({ color: new Color('#ddd2ea'), roughness: 0.14 })
    const trim = new MeshStandardMaterial({ color: new Color('#f6f6f4'), roughness: 0.3 })
    const downlight = new MeshStandardMaterial({ color: new Color('#ffffff'), emissive: new Color('#fff6ea'), emissiveIntensity: 2.5 })

    const glass = new MeshPhysicalMaterial({
      color: new Color('#e9f2f4'),
      roughness: 0.02,
      metalness: 0,
      transparent: true,
      opacity: 0.14,
      ior: 1.5,
      specularIntensity: 1,
      envMapIntensity: 1.6,
      depthWrite: false,
    })
    const frosted = new MeshPhysicalMaterial({
      color: new Color('#f2f5f6'),
      roughness: 0.55,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })

    return {
      floorMap,
      wall,
      ceiling,
      tileSkirting,
      lobbyFloor,
      wood,
      wenge,
      wengeLeaf,
      upvc,
      interlock,
      steel,
      metal,
      marble,
      dado,
      lilac,
      trim,
      downlight,
      glass,
      frosted,
    }
  }, [tex])
}

export type Materials = ReturnType<typeof useMaterials>
