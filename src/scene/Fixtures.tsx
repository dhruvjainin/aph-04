import { useEffect, useMemo } from 'react'
import { Color, CylinderGeometry, MeshStandardMaterial } from 'three'
import { boxesToGeometry, type Box } from './geometry'
import { merge } from './interior/kit'
import { CEILING, toX, toZ, unitById } from './plan'

// Site fixtures in flat 04 (main and /dmr share the walls), matched to site photos.

const unit = unitById('04')
/** Foyer · S: the kitchen's north wall, its west end at the kitchen opening. */
const S_WEST = toX(unit.X(626))
const S_FACE = toZ(unit.Y(392))
/** Foyer · E: the entry-door wall, between the foyer's north and south walls. */
const E_FACE = toX(unit.X(816))
const N_FACE = toZ(unit.Y(289))

/** On Foyer · S, `x` metres east of its west end, `d` metres off the wall into the foyer. */
const onSouth = (x0: number, x1: number, y0: number, y1: number, d0: number, d1: number): Box => ({
  min: [S_WEST + x0, y0, S_FACE - d1],
  max: [S_WEST + x1, y1, S_FACE - d0],
})

/** Modular switch plate: three rockers, a fan regulator and a bell grille, read east → west. */
function switchboard() {
  const plate = [onSouth(0.07, 0.33, 1.19, 1.31, 0, 0.01)]
  const modules = [
    ...[0.288, 0.264, 0.24].map((x) => onSouth(x, x + 0.022, 1.22, 1.28, 0.01, 0.014)),
    onSouth(0.185, 0.235, 1.225, 1.275, 0.01, 0.012),
    onSouth(0.13, 0.18, 1.22, 1.28, 0.01, 0.013),
  ]
  const slits = [0, 1, 2, 3, 4].map((i) => onSouth(0.145, 0.165, 1.235 + i * 0.008, 1.238 + i * 0.008, 0.013, 0.0135))
  const knob = new CylinderGeometry(0.016, 0.016, 0.012, 24).rotateX(Math.PI / 2).translate(S_WEST + 0.21, 1.25, S_FACE - 0.018)
  return {
    plate: boxesToGeometry(plate),
    modules: merge([boxesToGeometry(modules), knob]),
    slits: boxesToGeometry(slits),
  }
}

/** Orange fire-sprinkler pipe along the top of Foyer · E. */
const sprinkler = () =>
  new CylinderGeometry(0.02, 0.02, S_FACE - N_FACE, 16).rotateX(Math.PI / 2).translate(E_FACE - 0.04, CEILING - 0.06, (N_FACE + S_FACE) / 2)

export function Fixtures() {
  const { geo, mat } = useMemo(
    () => ({
      geo: { ...switchboard(), pipe: sprinkler() },
      mat: {
        plate: new MeshStandardMaterial({ color: new Color('#f4f3ef'), roughness: 0.35 }),
        modules: new MeshStandardMaterial({ color: new Color('#e4e2dc'), roughness: 0.3 }),
        slits: new MeshStandardMaterial({ color: new Color('#3a3a3a'), roughness: 0.8 }),
        pipe: new MeshStandardMaterial({ color: new Color('#e2672a'), roughness: 0.45 }),
      },
    }),
    [],
  )

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose())
      Object.values(mat).forEach((m) => m.dispose())
    },
    [geo, mat],
  )

  return (
    <>
      <mesh geometry={geo.plate} material={mat.plate} receiveShadow />
      <mesh geometry={geo.modules} material={mat.modules} receiveShadow />
      <mesh geometry={geo.slits} material={mat.slits} />
      <mesh geometry={geo.pipe} material={mat.pipe} castShadow receiveShadow />
    </>
  )
}
