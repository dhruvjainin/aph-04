import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { Raycaster, Vector2, Vector3 } from 'three'
import { doorRegistry, hud, ui } from '../store'
import { PX_PER_M, roomAt, SPAWN } from './plan'

const RADIUS = 0.24
const HALF = 0.56
const EYE = 0.8
const WALK = 1.55
const RUN = 3.1
const REACH = 2.4

const keys = new Set<string>()

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const vel = useMemo(() => new Vector3(), [])
  const tmp = useMemo(() => ({ fwd: new Vector3(), right: new Vector3(), want: new Vector3() }), [])
  const ray = useMemo(() => new Raycaster(undefined, undefined, 0, REACH), [])
  const bob = useRef(0)
  const lastProbe = useRef(0)

  useEffect(() => {
    camera.rotation.set(0, SPAWN.yaw, 0, 'YXZ')
    if (import.meta.env.DEV) {
      Object.assign(window, {
        __debug: { camera, scene, free: false },
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
  }, [camera, gl, scene])

  const probe = () => {
    ray.setFromCamera(new Vector2(0, 0), camera)
    const hits = ray.intersectObjects([...doorRegistry.keys()], false)
    return hits.length ? doorRegistry.get(hits[0].object) : undefined
  }

  useFrame((state, dt) => {
    const b = body.current
    if (!b) return
    dt = Math.min(dt, 0.05)

    const { fwd, right, want } = tmp
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
    const moving = want.lengthSq() > 0
    if (moving) want.normalize().multiplyScalar(keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK)

    vel.lerp(want, 1 - Math.exp(-(moving ? 9 : 12) * dt))
    const lv = b.linvel()
    b.setLinvel({ x: vel.x, y: lv.y, z: vel.z }, true)

    const p = b.translation()
    const speed = Math.hypot(vel.x, vel.z)
    bob.current += dt * speed * 5.2
    const amp = Math.min(speed / WALK, 1.6) * 0.012
    if (!(import.meta.env.DEV && (window as unknown as { __debug?: { free: boolean } }).__debug?.free))
      camera.position.set(p.x, p.y + EYE + Math.sin(bob.current) * amp, p.z)

    if (state.clock.elapsedTime - lastProbe.current > 0.1) {
      lastProbe.current = state.clock.elapsedTime
      const door = ui.get().locked ? probe() : undefined
      ui.set({ prompt: door ? (door.isOpen() ? 'Close door' : 'Open door') : null })
      const room = roomAt(p.x, p.z) ?? ''
      if (hud.room && hud.room.textContent !== room) hud.room.textContent = room
    }

    if (hud.dot) {
      const dir = fwd
      const deg = (Math.atan2(dir.x, -dir.z) * 180) / Math.PI
      hud.dot.style.left = `${p.x * PX_PER_M + 453}px`
      hud.dot.style.top = `${p.z * PX_PER_M + 523}px`
      hud.dot.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`
    }
  })

  return (
    <>
      <PointerLockControls
        selector="#enter"
        pointerSpeed={0.55}
        onLock={() => ui.set({ locked: true })}
        onUnlock={() => ui.set({ locked: false })}
      />
      <RigidBody
        ref={body}
        colliders={false}
        position={[SPAWN.x, RADIUS + HALF + 0.05, SPAWN.z]}
        enabledRotations={[false, false, false]}
        canSleep={false}
        ccd
      >
        <CapsuleCollider args={[HALF, RADIUS]} friction={0} restitution={0} />
      </RigidBody>
    </>
  )
}
