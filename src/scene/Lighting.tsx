import { Environment, Lightformer, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Color, type DirectionalLight } from 'three'
import { markShadowsDirty, shadows, TOUCH } from '../store'
import { FOOTPRINT, toX, toZ, unitById, type UnitId } from './plan'

/** Sun raking in through the balcony glazing (west-facing flats; mirrored for east), as a direction from the floor's centre. */
const SUN = [-11, 7.5, -3.5] as const
const MOON = [-9, 10, 5] as const
/** One shadow map spans the whole floor: anything outside it would read as sunlit. */
const CENTER = { x: toX((FOOTPRINT[0] + FOOTPRINT[2]) / 2), z: toZ((FOOTPRINT[1] + FOOTPRINT[3]) / 2) }
const SPAN = Math.hypot(toX(FOOTPRINT[2] - FOOTPRINT[0]), toZ(FOOTPRINT[3] - FOOTPRINT[1])) / 2 + 0.5
const DISTANCE = 30

/** The sun swaps sides to come in through the balconies of the flat you are in. */
export function Lighting({ night, flat }: { night: boolean; flat: UnitId }) {
  const gl = useThree((s) => s.gl)
  const light = useRef<DirectionalLight>(null)
  // Balconies face west in 01 and 04, east in 02 and 03.
  const w = unitById(flat).west ? 1 : -1
  const [ox, oy, oz] = night ? MOON : SUN
  const k0 = DISTANCE / Math.hypot(ox, oy, oz)

  useEffect(() => {
    const l = light.current
    if (!l) return
    l.target.position.set(CENTER.x, 0, CENTER.z)
    l.target.updateMatrixWorld()
  }, [])
  useEffect(() => markShadowsDirty(3), [w])

  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
  }, [gl])

  useEffect(() => markShadowsDirty(3), [night])

  useFrame(() => {
    if (shadows.dirty > 0) {
      shadows.dirty--
      gl.shadowMap.needsUpdate = true
    }
  })

  // Scales the bounce rig: by night only the warm interior bounce from the downlights remains.
  const k = night ? 0.1 : 1

  return (
    <>
      {/* What you see through the glass. */}
      {night ? (
        <NightSky />
      ) : (
        <Environment
          files="/hdri/sky.hdr"
          background="only"
          backgroundIntensity={1.5}
          backgroundRotation={[0, Math.PI * 0.62, 0]}
        />
      )}

      {/* What lights the rooms: a baked-once interior bounce rig standing in for GI. */}
      <Environment key={`${night ? 'night' : 'day'}-${w}`} resolution={256} frames={1} environmentIntensity={1}>
        <color attach="background" args={[night ? '#1c1a18' : '#b9b2a8']} />
        <Lightformer form="rect" intensity={0.85 * k} color={night ? '#ffdcb8' : '#eee3d4'} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="rect" intensity={0.6 * k} color={night ? '#ffe6cc' : '#f7f5f0'} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="rect" intensity={night ? 0.25 : 4} color={night ? '#3b4a6b' : '#eef4ff'} position={[-12 * w, 1.5, -3]} rotation-y={(w * Math.PI) / 2} scale={[14, 2.4, 1]} />
        <Lightformer form="rect" intensity={1.6 * k} color="#e5eefc" position={[12 * w, 1.5, 0]} rotation-y={(-w * Math.PI) / 2} scale={[6, 2.2, 1]} />
        <Lightformer form="rect" intensity={0.9 * k} color="#fff1df" position={[0, 1.5, -12]} scale={[10, 2.4, 1]} />
        <Lightformer form="rect" intensity={0.9 * k} color="#fff1df" position={[0, 1.5, 12]} rotation-y={Math.PI} scale={[10, 2.4, 1]} />
      </Environment>

      <directionalLight
        ref={light}
        position={[CENTER.x + ox * w * k0, oy * k0, CENTER.z + oz * k0]}
        intensity={night ? 0.35 : 6}
        color={night ? '#9fb3de' : '#ffe6c7'}
        castShadow
        shadow-mapSize={TOUCH ? [2048, 2048] : [4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={4}
        shadow-camera-left={-SPAN}
        shadow-camera-right={SPAN}
        shadow-camera-top={SPAN}
        shadow-camera-bottom={-SPAN}
        shadow-camera-near={DISTANCE - SPAN - 4}
        shadow-camera-far={DISTANCE + SPAN + 4}
      />
    </>
  )
}

function NightSky() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const prev = scene.background
    scene.background = new Color('#060912')
    return () => void (scene.background = prev)
  }, [scene])
  return <Stars radius={140} depth={40} count={2500} factor={5} saturation={0} fade speed={0} />
}
