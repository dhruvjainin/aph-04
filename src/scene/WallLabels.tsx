import { useEffect, useMemo } from 'react'
import { Matrix4, MeshBasicMaterial } from 'three'
import { labelTexture } from './Dimensions'
import { WALLS, toX, toZ, unitById, type Rect, type RoomRect, type Side, type UnitId } from './plan'

const LABEL_H = 0.2
const LIFT = 0.02
/** Above every door, window and slider head, and above the dimension labels. */
const HEIGHT = 2.63
/** Toilets: between the door head and the false ceiling. */
const TOILET_HEIGHT = 1.95
const MIN_PX = 20
const STEP = 2
/** How far off a wall face to look for the room it belongs to (plan px). */
const PROBE = 5

const inside = ([x0, y0, x1, y1]: Rect, x: number, y: number) => x > x0 && x < x1 && y > y0 && y < y1

interface Piece {
  room: RoomRect
  side: Side
  /** Face position across the wall and the stretch along it, in plan px. */
  at: number
  from: number
  to: number
}

/**
 * Walks both long faces of every wall and splits them wherever the room in front changes,
 * so each visible stretch of wall becomes one piece named after its room and side.
 */
function wallPieces(rooms: RoomRect[]) {
  const pieces: Piece[] = []
  const roomAt = (x: number, y: number) =>
    WALLS.some((w) => inside(w.rect, x, y)) ? null : (rooms.find((r) => inside(r.rect, x, y)) ?? null)

  for (const { rect: [a, b, c, d] } of WALLS) {
    const horizontal = c - a >= d - b
    // A face of the wall is the opposite side of the room in front of it.
    const faces: [Side, number, number][] = horizontal
      ? [['s', b, -PROBE], ['n', d, PROBE]]
      : [['e', a, -PROBE], ['w', c, PROBE]]
    const [lo, hi] = horizontal ? [a, c] : [b, d]
    for (const [side, at, off] of faces) {
      let cur: Piece | null = null
      for (let t = lo + STEP / 2; t < hi; t += STEP) {
        const room = horizontal ? roomAt(t, at + off) : roomAt(at + off, t)
        if (cur && room === cur.room) {
          cur.to = t + STEP / 2
          continue
        }
        if (cur && cur.to - cur.from >= MIN_PX) pieces.push(cur)
        cur = room ? { room, side, at, from: t - STEP / 2, to: t + STEP / 2 } : null
      }
      if (cur && cur.to - cur.from >= MIN_PX) pieces.push(cur)
    }
  }
  return pieces
}

/** Names every wall piece of the current flat as "Room · N", or "Room · N1", "N2" … when a side has several. */
export function WallLabels({ flat }: { flat: UnitId }) {
  const labels = useMemo(() => {
    const pieces = wallPieces(unitById(flat).rooms)
    const groups = new Map<string, Piece[]>()
    for (const p of pieces) {
      const k = `${p.room.name}|${p.side}`
      groups.set(k, [...(groups.get(k) ?? []), p])
    }
    return [...groups.values()].flatMap((group) =>
      group
        .sort((p, q) => p.from - q.from)
        .map(({ room, side, at, from, to }, i) => {
          const y = room.toilet ? TOILET_HEIGHT : HEIGHT
          const mid = (from + to) / 2
          const m = new Matrix4()
          if (side === 'n') m.makeRotationY(0).setPosition(toX(mid), y, toZ(at) + LIFT)
          if (side === 's') m.makeRotationY(Math.PI).setPosition(toX(mid), y, toZ(at) - LIFT)
          if (side === 'w') m.makeRotationY(Math.PI / 2).setPosition(toX(at) + LIFT, y, toZ(mid))
          if (side === 'e') m.makeRotationY(-Math.PI / 2).setPosition(toX(at) - LIFT, y, toZ(mid))
          const tag = `${side.toUpperCase()}${group.length > 1 ? i + 1 : ''}`
          const { t, width } = labelTexture(`${room.name} · ${tag}`, 'rgba(250, 196, 40, 0.95)', '#1a1a1a')
          const material = new MeshBasicMaterial({ map: t, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
          // labelTexture sizes for the 0.15 m dimension labels.
          return { matrix: m, width: (width * LABEL_H) / 0.15, material }
        }),
    )
  }, [flat])

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
