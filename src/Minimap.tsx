import { memo } from 'react'
import { hud, useUi } from './store'
import { footprintMetres, openingAlong, wallFrame, type Box } from './scene/geometry'
import { CORRIDOR, FLOOR_OUTLINE, FOOTPRINT, UNITS, WALLS } from './scene/plan'

/** Minimap pixels per metre, its square size in pixels, and the plan's top-left corner in metres. */
export const MAP_SCALE = 12
export const MAP_SIZE = 210
const [fx0, fz0, fx1, fz1] = footprintMetres(FOOTPRINT)
export const MAP_ORIGIN = { x: fx0 - 1, z: fz0 - 1 }
const W = fx1 - fx0 + 2
const H = fz1 - fz0 + 2

const rect = ([x0, z0, x1, z1]: number[], props: React.SVGProps<SVGRectElement>, key: number | string) => (
  <rect key={key} x={x0} y={z0} width={x1 - x0} height={z1 - z0} {...props} />
)

const { solid, glass } = (() => {
  const solid: number[][] = []
  const glass: number[][] = []
  const flat = ({ min, max }: Box) => [min[0], min[2], max[0], max[2]]
  for (const w of WALLS) {
    const f = wallFrame(w)
    let cursor = f.a0
    for (const o of [...(w.openings ?? [])].sort((p, q) => p.from - q.from)) {
      const [s0, s1] = openingAlong(f, o)
      if (s0 > cursor) solid.push(flat(f.box(cursor, s0, f.c0, f.c1, 0, 1)))
      if (o.kind !== 'door' && o.kind !== 'entry') glass.push(flat(f.box(s0, s1, f.cc - 0.025, f.cc + 0.025, 0, 1)))
      cursor = s1
    }
    if (f.a1 > cursor) solid.push(flat(f.box(cursor, f.a1, f.c0, f.c1, 0, 1)))
  }
  return { solid, glass }
})()

const Plan = memo(function Plan({ flat }: { flat: string }) {
  return (
    <svg
      className="plan"
      ref={(el) => void (hud.map = el)}
      width={W * MAP_SCALE}
      height={H * MAP_SCALE}
      viewBox={`${MAP_ORIGIN.x} ${MAP_ORIGIN.z} ${W} ${H}`}
    >
      {FLOOR_OUTLINE.map((r, i) => rect(footprintMetres(r), { fill: '#fbfaf6' }, i))}
      {rect(footprintMetres(CORRIDOR.rect), { fill: '#d8d6d1' }, 'corridor')}
      {solid.map((r, i) => rect(r, { fill: '#2a2c30' }, `s${i}`))}
      {glass.map((r, i) => rect(r, { fill: '#7fb2d6' }, `g${i}`))}
      {UNITS.map((u) => (
        <text key={u.id} x={u.center.x} y={u.center.z} className={u.id === flat ? 'here' : ''}>
          {u.id}
        </text>
      ))}
    </svg>
  )
})

export function Minimap({ visible }: { visible: boolean }) {
  const { flat } = useUi()
  return (
    <div className={`minimap ${visible ? '' : 'hidden'}`} style={{ width: MAP_SIZE, height: MAP_SIZE }}>
      <div className="room" ref={(el) => void (hud.room = el)} />
      <Plan flat={flat} />
      <div className="you" ref={(el) => void (hud.dot = el)} />
    </div>
  )
}
