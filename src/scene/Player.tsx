import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { Euler, Raycaster, Vector2, Vector3 } from 'three'
import { doorRegistry, hud, player, TOUCH, touch, ui } from '../store'
import { MAP_SCALE, MAP_SIZE, MAP_ORIGIN } from '../Minimap'
import { UNITS, roomAt, unitById } from './plan'

const RADIUS = 0.24
const HALF = 0.56
const EYE = 0.8
const WALK = 1.55
const RUN = 3.1
const REACH = 2.4
const LOOK = 0.0055

const keys = new Set<string>()

/** Corridor: the flat whose centre is closest. */
const nearestFlat = (x: number, z: number) =>
  UNITS.reduce((a, b) => (Math.hypot(b.center.x - x, b.center.z - z) < Math.hypot(a.center.x - x, a.center.z - z) ? b : a)).id

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const vel = useMemo(() => new Vector3(), [])
  const tmp = useMemo(() => ({ fwd: new Vector3(), right: new Vector3(), want: new Vector3(), euler: new Euler(0, 0, 0, 'YXZ') }), [])
  const ray = useMemo(() => new Raycaster(undefined, undefined, 0, REACH), [])
  const bob = useRef(0)
  const lastProbe = useRef(0)
  const start = useMemo(() => unitById(ui.get().flat).spawn, [])

  useEffect(() => {
    const { spawn } = unitById(ui.get().flat)
    camera.rotation.set(0, spawn.yaw, 0, 'YXZ')
    player.teleport = (id) => {
      const { spawn } = unitById(id)
      body.current?.setTranslation({ x: spawn.x, y: RADIUS + HALF + 0.05, z: spawn.z }, true)
      body.current?.setLinvel({ x: 0, y: 0, z: 0 }, true)
      vel.set(0, 0, 0)
      camera.rotation.set(0, spawn.yaw, 0, 'YXZ')
      ui.set({ flat: id })
    }
    if (import.meta.env.DEV) {
      Object.assign(window, {
        __debug: { camera, scene, free: false },
        __ui: ui,
        __teleport: (x: number, z: number, yaw: number, pitch = 0) => {
          body.current?.setTranslation({ x, y: RADIUS + HALF + 0.05, z }, true)
          camera.rotation.set(pitch, yaw, 0, 'YXZ')
        },
      })
    }
    const down = (e: KeyboardEvent) => {
      keys.add(e.code)
      if (e.code === 'KeyE' && ui.get().locked) interact()
    }
    const up = (e: KeyboardEvent) => keys.delete(e.code)
    const click = () => ui.get().locked && interact()
    const blur = () => keys.clear()
    const interact = () => {
      const hit = probe()
      hit?.toggle()
    }
    touch.interact = interact
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    gl.domElement.addEventListener('mousedown', click)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      gl.domElement.removeEventListener('mousedown', click)
    }
  }, [camera, gl, scene, vel])

  const probe = () => {
    ray.setFromCamera(new Vector2(0, 0), camera)
    const hits = ray.intersectObjects([...doorRegistry.keys()], false)
    return hits.length ? doorRegistry.get(hits[0].object) : undefined
  }

  useFrame((state, dt) => {
    const b = body.current
    if (!b) return
    dt = Math.min(dt, 0.05)

    const { fwd, right, want, euler } = tmp
    if (touch.look.dx || touch.look.dy) {
      euler.setFromQuaternion(camera.quaternion)
      euler.y -= touch.look.dx * LOOK
      euler.x = Math.max(-1.45, Math.min(1.45, euler.x - touch.look.dy * LOOK))
      camera.quaternion.setFromEuler(euler)
      touch.look.dx = touch.look.dy = 0
    }
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    right.crossVectors(fwd, camera.up).normalize()

    want.set(0, 0, 0)
    if (ui.get().locked) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) want.add(fwd)
      if (keys.has('KeyS') || keys.has('ArrowDown')) want.sub(fwd)
      if (keys.has('KeyD') || keys.has('ArrowRight')) want.add(right)
      if (keys.has('KeyA') || keys.has('ArrowLeft')) want.sub(right)
    }
    let moving = want.lengthSq() > 0
    if (moving) want.normalize().multiplyScalar(keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK)
    else if (ui.get().locked) {
      // Joystick: walk up to 80% deflection, then speed up to a run at full tilt.
      const { x, y } = touch.move
      const mag = Math.min(1, Math.hypot(x, y))
      if (mag > 0.08) {
        moving = true
        const speed = WALK * Math.min(mag / 0.8, 1) + (RUN - WALK) * Math.max(0, (mag - 0.8) / 0.2)
        want.addScaledVector(fwd, -y).addScaledVector(right, x).normalize().multiplyScalar(speed)
      }
    }

    vel.lerp(want, 1 - Math.exp(-(moving ? 9 : 12) * dt))
    const lv = b.linvel()
    b.setLinvel({ x: vel.x, y: lv.y, z: vel.z }, true)

    const p = b.translation()
    player.pos.x = p.x
    player.pos.z = p.z
    const speed = Math.hypot(vel.x, vel.z)
    bob.current += dt * speed * 5.2
    const amp = Math.min(speed / WALK, 1.6) * 0.012
    if (!(import.meta.env.DEV && (window as unknown as { __debug?: { free: boolean } }).__debug?.free))
      camera.position.set(p.x, p.y + EYE + Math.sin(bob.current) * amp, p.z)

    if (state.clock.elapsedTime - lastProbe.current > 0.1) {
      lastProbe.current = state.clock.elapsedTime
      const door = ui.get().locked ? probe() : undefined
      ui.set({ prompt: door ? `${door.verb ?? (door.isOpen() ? 'Close' : 'Open')} ${door.noun ?? 'door'}` : null })
      const room = roomAt(p.x, p.z)
      ui.set({ flat: room?.unit?.id ?? nearestFlat(p.x, p.z) })
      const label = !room ? '' : room.unit ? `${room.unit.flat} · ${room.name}` : room.name
      if (hud.room && hud.room.textContent !== label) hud.room.textContent = label
    }

    // The plan slides under a fixed, rotating arrow.
    if (hud.dot && hud.map) {
      const deg = (Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI
      const left = MAP_SIZE / 2 - (p.x - MAP_ORIGIN.x) * MAP_SCALE
      const top = MAP_SIZE / 2 - (p.z - MAP_ORIGIN.z) * MAP_SCALE
      hud.map.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`
      hud.dot.style.transform = `translate(-50%, -50%) rotate(${deg.toFixed(1)}deg)`
    }
  })

  return (
    <>
      {!TOUCH && (
        <PointerLockControls
          selector=".enter"
          pointerSpeed={0.55}
          onLock={() => ui.set({ locked: true })}
          onUnlock={() => ui.set({ locked: false })}
        />
      )}
      <RigidBody
        ref={body}
        colliders={false}
        position={[start.x, RADIUS + HALF + 0.05, start.z]}
        enabledRotations={[false, false, false]}
        canSleep={false}
        ccd
      >
        <CapsuleCollider args={[HALF, RADIUS]} friction={0} restitution={0} />
      </RigidBody>
    </>
  )
}
