import { useEffect, useMemo } from 'react'
import { Matrix4, MeshBasicMaterial } from 'three'
import { labelTexture } from './Dimensions'
import { WALLS, toX, toZ, unitById, type Side, type UnitId } from './plan'

const LABEL_H = 0.2
const LIFT = 0.02
/** Above every door, window and slider head, and above the dimension labels. */
const HEIGHT = 2.63
/** Toilets: between the door head and the false ceiling. */
const TOILET_HEIGHT = 1.95
const MIN_PX = 20

/** Longest stretch of plan wall on this side of the room, as [from, to] in plan px along the side. */
function wallSpan([x0, y0, x1, y1]: number[], side: Side): [number, number] | null {
  let best: [number, number] | null = null
  for (const { rect: [a, b, c, d] } of WALLS) {
    const on =
      side === 'n' ? Math.abs(d - y0) <= 1 : side === 's' ? Math.abs(b - y1) <= 1 : side === 'w' ? Math.abs(c - x0) <= 1 : Math.abs(a - x1) <= 1
    if (!on) continue
    const [lo, hi] = side === 'n' || side === 's' ? [Math.max(a, x0), Math.min(c, x1)] : [Math.max(b, y0), Math.min(d, y1)]
    if (hi - lo >= MIN_PX && (!best || hi - lo > best[1] - best[0])) best = [lo, hi]
  }
  return best
}

/** Debug only: names every wall face of the current flat as "Room · N/S/E/W". */
export function WallLabels({ flat }: { flat: UnitId }) {
  const labels = useMemo(
    () =>
      unitById(flat).rooms.flatMap(({ name, rect, toilet }) => {
        const [x0, y0, x1, y1] = rect
        const y = toilet ? TOILET_HEIGHT : HEIGHT
        return (['n', 's', 'w', 'e'] as const).flatMap((side) => {
          const span = wallSpan(rect, side)
          if (!span) return []
          const mid = (span[0] + span[1]) / 2
          const m = new Matrix4()
          if (side === 'n') m.makeRotationY(0).setPosition(toX(mid), y, toZ(y0) + LIFT)
          if (side === 's') m.makeRotationY(Math.PI).setPosition(toX(mid), y, toZ(y1) - LIFT)
          if (side === 'w') m.makeRotationY(Math.PI / 2).setPosition(toX(x0) + LIFT, y, toZ(mid))
          if (side === 'e') m.makeRotationY(-Math.PI / 2).setPosition(toX(x1) - LIFT, y, toZ(mid))
          const { t, width } = labelTexture(`${name} · ${side.toUpperCase()}`, 'rgba(250, 196, 40, 0.95)', '#1a1a1a')
          const material = new MeshBasicMaterial({ map: t, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
          // labelTexture sizes for the 0.15 m dimension labels.
          return [{ matrix: m, width: (width * LABEL_H) / 0.15, material }]
        })
      }),
    [flat],
  )

  useEffect(
    () => () => {
      for (const { material } of labels) {
        material.map?.dispose()
        material.dispose()
      }
    },
    [labels],
  )

  return (
    <group>
      {labels.map(({ matrix, width, material }, i) => (
        <mesh key={i} matrixAutoUpdate={false} matrix={matrix} material={material}>
          <planeGeometry args={[width, LABEL_H]} />
        </mesh>
      ))}
    </group>
  )
}
