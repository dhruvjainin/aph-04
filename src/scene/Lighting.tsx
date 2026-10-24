import { Environment, Lightformer, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Color } from 'three'
import { markShadowsDirty, shadows } from '../store'

/** Late-afternoon sun raking in through the west-facing glazing. */
const SUN: [number, number, number] = [-11, 7.5, -3.5]
const MOON: [number, number, number] = [-9, 10, 5]

export function Lighting({ night }: { night: boolean }) {
  const gl = useThree((s) => s.gl)

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
          backgroundIntensity={1.05}
          backgroundRotation={[0, Math.PI * 0.62, 0]}
        />
      )}

      {/* What lights the rooms: a baked-once interior bounce rig standing in for GI. */}
      <Environment key={night ? 'night' : 'day'} resolution={256} frames={1} environmentIntensity={1}>
        <color attach="background" args={[night ? '#1c1a18' : '#b9b2a8']} />
        <Lightformer form="rect" intensity={1.1 * k} color={night ? '#ffdcb8' : '#f1dfc8'} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="rect" intensity={0.9 * k} color={night ? '#ffe6cc' : '#f7f5f0'} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="rect" intensity={night ? 0.25 : 4} color={night ? '#3b4a6b' : '#eef4ff'} position={[-12, 1.5, -3]} rotation-y={Math.PI / 2} scale={[14, 2.4, 1]} />
        <Lightformer form="rect" intensity={1.6 * k} color="#e5eefc" position={[12, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[6, 2.2, 1]} />
        <Lightformer form="rect" intensity={1.2 * k} color="#fff1df" position={[0, 1.5, -12]} scale={[10, 2.4, 1]} />
        <Lightformer form="rect" intensity={1.2 * k} color="#fff1df" position={[0, 1.5, 12]} rotation-y={Math.PI} scale={[10, 2.4, 1]} />
      </Environment>

      <directionalLight
        position={night ? MOON : SUN}
        intensity={night ? 0.35 : 5.2}
        color={night ? '#9fb3de' : '#ffe6c7'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={4}
        shadow-camera-left={-9.5}
        shadow-camera-right={9.5}
        shadow-camera-top={9.5}
        shadow-camera-bottom={-9.5}
        shadow-camera-near={1}
        shadow-camera-far={30}
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
