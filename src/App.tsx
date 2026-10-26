import { PerformanceMonitor, Stats, useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense, useEffect, useState } from 'react'
import { NoToneMapping, PCFShadowMap } from 'three'
import { Apartment } from './scene/Apartment'
import { Dimensions } from './scene/Dimensions'
import { NightLights } from './scene/NightLights'
import { Effects } from './scene/Effects'
import { Interior } from './scene/Interior'
import { Lighting } from './scene/Lighting'
import { useMaterials } from './scene/materials'
import { Player } from './scene/Player'
import { Minimap } from './Minimap'
import { Runjhun } from './scene/Runjhun'
import { DMR, UNITS, unitById, type UnitId } from './scene/plan'
import { WallLabels } from './scene/WallLabels'
import { TouchControls } from './TouchControls'
import { closeMenu, player, TOUCH, ui, useUi, WALL_PAINTS } from './store'

function World() {
  const m = useMaterials()
  const { night, dims, labels, flat, paint } = useUi()
  useEffect(() => {
    m.wall.color.set(paint)
  }, [m, paint])
  // Lit-interior reflections turn clear glass milky at night.
  useEffect(() => {
    m.glass.envMapIntensity = night ? 0.25 : 1.6
    m.glass.opacity = night ? 0.08 : 0.14
  }, [m, night])
  return (
    <Physics timeStep="vary" gravity={[0, -9.81, 0]}>
      <Apartment m={m} />
      {DMR && <Interior m={m} />}
      {night && <NightLights m={m} flat={flat} />}
      {dims && <Dimensions flat={flat} />}
      {labels && <WallLabels flat={flat} />}
      {UNITS.map((u) => (
        <Runjhun key={u.id} unit={u} />
      ))}
      <Player />
    </Physics>
  )
}

export default function App() {
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio, TOUCH ? 1 : 1.25))
  const [high, setHigh] = useState(!TOUCH)
  const { night, flat } = useUi()

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
          onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio, TOUCH ? 1.25 : 1.5, d + 0.25))}
          flipflops={4}
        />
        {new URLSearchParams(location.search).has('fps') && <Stats />}
        <Suspense fallback={null}>
          <Lighting night={night} flat={flat} />
          <World />
          <Effects high={high} night={night} mobile={TOUCH} />
        </Suspense>
      </Canvas>
      <Hud />
    </>
  )
}

/** Laid out as on the floor: 01 and 02 at the top, 04 and 03 below. */
const GRID: UnitId[] = DMR ? ['04'] : ['01', '02', '04', '03']

function Hud() {
  const { locked, prompt, night, dims, labels, flat, started, menu, paint } = useUi()
  const { progress, active } = useProgress()
  const [map, setMap] = useState(true)
  const loading = active || progress < 100

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') setMap((v) => !v)
      if (e.code === 'KeyN') ui.set({ night: !ui.get().night })
      if (e.code === 'KeyT') ui.set({ dims: !ui.get().dims })
      if (e.code === 'KeyL') ui.set({ labels: !ui.get().labels })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Every button carries `.enter`: the pointer-lock control binds to them once, on mount.
  return (
    <>
      <div className={`overlay ${locked || menu ? 'hidden' : ''}`}>
        <div className="card">
          <p className="eyebrow">{DMR ? 'Flat 04 · Type 3D · 3 BHK' : '4 flats · 3 BHK'}</p>
          <h1>Walkthrough</h1>
          <p className="lede">
            {DMR
              ? 'Walk through flat 04, room by room.'
              : <>Pick a flat. Walk out of its front door into the common corridor, and open another flat&apos;s door to walk in.</>}
          </p>
          <button
            className={`enter resume ${started ? '' : 'hidden'}`}
            disabled={loading}
            onClick={() => TOUCH && ui.set({ locked: true })}
          >
            Resume in Flat {flat}
          </button>
          <div className={`flats ${DMR ? 'single' : ''}`}>
            {GRID.map((id) => {
              const u = unitById(id)
              return (
                <button
                  key={id}
                  className={`enter flat ${started && id === flat ? 'current' : ''}`}
                  disabled={loading}
                  onClick={() => {
                    player.teleport(id)
                    ui.set({ started: true, locked: TOUCH || ui.get().locked })
                  }}
                >
                  <span className="num">{id}</span>
                  <span className="meta">
                    Type {u.type}
                  </span>
                </button>
              )
            })}
          </div>
          {loading && <p className="loading">Loading {Math.round(progress)}%</p>}
          {TOUCH ? (
            <ul className="keys">
              <li>Left thumb: drag to walk (push further to run)</li>
              <li>Right thumb: drag to look around</li>
              <li>Tap a door, or the button, to open or close it</li>
              <li>Pause button (top left) to {DMR ? 'pause' : 'pick another flat'}</li>
            </ul>
          ) : (
          <ul className="keys">
            <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</li>
            <li><kbd>Shift</kbd> walk faster</li>
            <li><kbd>E</kbd> / click open or close doors</li>
            <li><kbd>M</kbd> toggle plan</li>
            <li><kbd>N</kbd> day / night</li>
            <li><kbd>T</kbd> wall dimensions</li>
            <li><kbd>L</kbd> wall labels</li>
            <li><kbd>E</kbd> / click Runjhun, the interior designer, to talk</li>
            <li><kbd>Esc</kbd> pause</li>
          </ul>
          )}
        </div>
      </div>

      <details className="toggles">
        <summary>Settings</summary>
        <div className="menu">
          <button className={night ? 'on' : ''} onClick={() => ui.set({ night: !night })}>
            {night ? 'Night' : 'Day'} {!TOUCH && <kbd>N</kbd>}
          </button>
          <button className={dims ? 'on' : ''} onClick={() => ui.set({ dims: !dims })}>
            Dimensions {!TOUCH && <kbd>T</kbd>}
          </button>
          <button className={labels ? 'on' : ''} onClick={() => ui.set({ labels: !labels })}>
            Wall labels {!TOUCH && <kbd>L</kbd>}
          </button>
        </div>
      </details>

      <div className={`designer ${menu ? '' : 'hidden'}`}>
        <p className="eyebrow">Interior design by Runjhun</p>
        <h2>Make this flat feel like home.</h2>
        <p className="say">Runjhun designs homes that fit the way you live. Try a wall colour below, then call her to plan the rest.</p>
        <div className="swatches">
          {WALL_PAINTS.map((c) => (
            <button
              key={c.hex}
              title={c.name}
              aria-label={c.name}
              className={c.hex === paint ? 'on' : ''}
              style={{ background: c.hex }}
              onClick={() => ui.set({ paint: c.hex })}
            />
          ))}
        </div>
        <div className="row">
          <button onClick={() => ui.set({ night: !night })}>{night ? 'Switch to day' : 'Switch to night'}</button>
          <button onClick={() => ui.set({ dims: !dims })}>{dims ? 'Hide dimensions' : 'Show dimensions'}</button>
        </div>
        <a className="call" href="tel:+917568098455">Call Runjhun · +91 75680 98455</a>
        <button className="back" onClick={closeMenu}>Back to the walk</button>
      </div>

      {locked && <div className="crosshair" />}
      {locked && TOUCH && <TouchControls />}
      {locked && !TOUCH && prompt && (
        <div className="prompt">
          <kbd>E</kbd> {prompt}
        </div>
      )}

      <Minimap visible={map && started} />
    </>
  )
}
