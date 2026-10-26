import { useEffect, useMemo } from 'react'
import { BufferGeometry, CanvasTexture, Matrix4, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FALSE_CEILING, WALLS, toX, toZ, unitById, type UnitId } from './plan'

/** Open-plan zones have no single bounding walls, so they get no dimensions. */
const SKIP = new Set(['Dining', 'Foyer', 'Passage'])
const LABEL_H = 0.15
const LIFT = 0.016
const LINE = 0.008

type Side = 'n' | 's' | 'w' | 'e'

export function formatLength(m: number) {
  const inches = Math.round(m / 0.0254)
  return `${Math.floor(inches / 12)}′ ${inches % 12}″  ·  ${m.toFixed(2)} m`
}

/** A wall of the plan whose face coincides with this side of the room and covers its midpoint. */
function hasWall([x0, y0, x1, y1]: number[], side: Side) {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  return WALLS.some(({ rect: [a, b, c, d] }) => {
    if (side === 'n') return Math.abs(d - y0) <= 1 && a <= mx && mx <= c
    if (side === 's') return Math.abs(b - y1) <= 1 && a <= mx && mx <= c
    if (side === 'w') return Math.abs(c - x0) <= 1 && b <= my && my <= d
    return Math.abs(a - x1) <= 1 && b <= my && my <= d
  })
}

export function labelTexture(text: string, bg = 'rgba(24, 26, 30, 0.9)', fg = '#f6f3ec') {
  const H = 96
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  const font = `600 50px Inter, ui-sans-serif, system-ui, -apple-system, sans-serif`
  ctx.font = font
  c.width = Math.ceil(ctx.measureText(text).width + 64)
  c.height = H
  ctx.font = font
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(0, 0, c.width, H, H / 2)
  ctx.fill()
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, c.width / 2, H / 2 + 2)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return { t, width: (c.width / H) * LABEL_H }
}

interface Dim {
  matrix: Matrix4
  length: number
  text: string
}

/** Labels for the flat you are in only, rebuilt when you walk into another. */
export function Dimensions({ flat }: { flat: UnitId }) {
  const { lines, labels, lineMaterial } = useMemo(() => {
    const dims: Dim[] = []
    for (const { name, rect, toilet } of unitById(flat).rooms) {
      if (SKIP.has(name)) continue
      const [x0, y0, x1, y1] = rect
      // Above every door, window and slider head; toilets sit under their false ceiling.
      const y = toilet ? FALSE_CEILING - 0.16 : 2.47
      const [X0, Z0, X1, Z1] = [toX(x0), toZ(y0), toX(x1), toZ(y1)]
      const width = (['n', 's'] as const).find((s) => hasWall(rect, s))
      const depth = (['w', 'e'] as const).find((s) => hasWall(rect, s))
      const place = (side: Side) => {
        const m = new Matrix4()
        const cx = (X0 + X1) / 2
        const cz = (Z0 + Z1) / 2
        if (side === 'n') m.makeRotationY(0).setPosition(cx, y, Z0 + LIFT)
        if (side === 's') m.makeRotationY(Math.PI).setPosition(cx, y, Z1 - LIFT)
        if (side === 'w') m.makeRotationY(Math.PI / 2).setPosition(X0 + LIFT, y, cz)
        if (side === 'e') m.makeRotationY(-Math.PI / 2).setPosition(X1 - LIFT, y, cz)
        return m
      }
      if (width) dims.push({ matrix: place(width), length: X1 - X0, text: formatLength(X1 - X0) })
      if (depth) dims.push({ matrix: place(depth), length: Z1 - Z0, text: formatLength(Z1 - Z0) })
    }

    const parts: BufferGeometry[] = []
    const labels = dims.map(({ matrix, length, text }) => {
      const { t, width } = labelTexture(text)
      const half = length / 2 - 0.03
      const gap = width / 2 + 0.05
      const seg = (a: number, b: number) =>
        parts.push(new PlaneGeometry(b - a, LINE).translate((a + b) / 2, 0, 0).applyMatrix4(matrix))
      if (half > gap) {
        seg(-half, -gap)
        seg(gap, half)
      }
      for (const s of [-1, 1]) parts.push(new PlaneGeometry(LINE, 0.13).translate(s * half, 0, 0).applyMatrix4(matrix))
      const material = new MeshBasicMaterial({ map: t, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      return { matrix, width, material }
    })

    const lineMaterial = new MeshBasicMaterial({ color: '#25272b', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    return { lines: mergeGeometries(parts), labels, lineMaterial }
  }, [flat])

  useEffect(
    () => () => {
      lines.dispose()
      lineMaterial.dispose()
      for (const { material } of labels) {
        material.map?.dispose()
        material.dispose()
      }
    },
    [lines, labels, lineMaterial],
  )

  return (
    <group>
      <mesh geometry={lines} material={lineMaterial} />
      {labels.map(({ matrix, width, material }, i) => (
        <mesh key={i} matrixAutoUpdate={false} matrix={matrix} material={material}>
          <planeGeometry args={[width, LABEL_H]} />
        </mesh>
      ))}
    </group>
  )
}
