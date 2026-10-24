import { PerformanceMonitor, Stats, useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense, useEffect, useState } from 'react'
import { NoToneMapping, PCFShadowMap } from 'three'
import { Apartment } from './scene/Apartment'
import { Dimensions } from './scene/Dimensions'
import { NightLights } from './scene/NightLights'
import { Effects } from './scene/Effects'
import { Lighting } from './scene/Lighting'
import { useMaterials } from './scene/materials'
import { Player } from './scene/Player'
import { hud, ui, useUi } from './store'

function World() {
  const m = useMaterials()
  const { night, dims } = useUi()
  // Lit-interior reflections turn clear glass milky at night.
  useEffect(() => {
    m.glass.envMapIntensity = night ? 0.25 : 1.6
    m.glass.opacity = night ? 0.08 : 0.14
  }, [m, night])
  return (
    <Physics timeStep="vary" gravity={[0, -9.81, 0]}>
      <Apartment m={m} />
      {night && <NightLights m={m} />}
      {dims && <Dimensions />}
      <Player />
    </Physics>
  )
}

export default function App() {
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio, 1.25))
  const [high, setHigh] = useState(true)
  const { night } = useUi()

  return (
    <>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        dpr={dpr}
        flat
        camera={{ fov: 68, near: 0.05, far: 300 }}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, toneMapping: NoToneMapping }}
      >
        <PerformanceMonitor
          bounds={(refresh) => (refresh > 90 ? [58, 100] : [50, 58])}
          onDecline={() => {
            setHigh(false)
            setDpr((d) => Math.max(0.75, d - 0.25))
          }}
          onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio, 1.5, d + 0.25))}
          flipflops={4}
        />
        {new URLSearchParams(location.search).has('fps') && <Stats />}
        <Suspense fallback={null}>
          <Lighting night={night} />
          <World />
          <Effects high={high} night={night} />
        </Suspense>
      </Canvas>
      <Hud />
    </>
  )
}

function Hud() {
  const { locked, prompt, night, dims } = useUi()
  const { progress, active } = useProgress()
  const [map, setMap] = useState(true)
  const loading = active || progress < 100

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') setMap((v) => !v)
      if (e.code === 'KeyN') ui.set({ night: !ui.get().night })
      if (e.code === 'KeyT') ui.set({ dims: !ui.get().dims })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className={`overlay ${locked ? 'hidden' : ''}`}>
        <div className="card">
          <p className="eyebrow">Apartment F-2904 · 3 BHK</p>
          <h1>Walkthrough</h1>
          <p className="lede">Bare-shell model traced from the sanctioned floor plan. Walls, doors and windows only.</p>
          <button id="enter" disabled={loading}>
            {loading ? `Loading ${Math.round(progress)}%` : 'Click to walk in'}
          </button>
          <ul className="keys">
            <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</li>
            <li><kbd>Shift</kbd> walk faster</li>
            <li><kbd>E</kbd> / click open or close doors</li>
            <li><kbd>M</kbd> toggle plan</li>
            <li><kbd>N</kbd> day / night</li>
            <li><kbd>T</kbd> wall dimensions</li>
            <li><kbd>Esc</kbd> pause</li>
          </ul>
        </div>
      </div>

      <div className="toggles">
        <button className={night ? 'on' : ''} onClick={() => ui.set({ night: !night })}>
          {night ? 'Night' : 'Day'} <kbd>N</kbd>
        </button>
        <button className={dims ? 'on' : ''} onClick={() => ui.set({ dims: !dims })}>
          Dimensions <kbd>T</kbd>
        </button>
      </div>

      {locked && <div className="crosshair" />}
      {locked && prompt && (
        <div className="prompt">
          <kbd>E</kbd> {prompt}
        </div>
      )}

      <div className={`minimap ${map ? '' : 'hidden'}`}>
        <div className="room" ref={(el) => void (hud.room = el)} />
        <div className="minimap-inner">
          <img src="/floorplan.png" alt="" draggable={false} />
          <div className="you" ref={(el) => void (hud.dot = el)} />
        </div>
      </div>
    </>
  )
}
