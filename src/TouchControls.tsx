import { useEffect, useRef, useState } from 'react'
import { touch, ui, useUi } from './store'

const RADIUS = 56
/** A touch that moves less than this and lifts quickly counts as a tap. */
const TAP_SLOP = 10
const TAP_MS = 250
/** The walk hint shows until the joystick is first used. */
let walked = false
const SEEN = 'f2904.touch-guide'

interface Stick {
  id: number
  x: number
  y: number
}

/** Left half: a joystick that appears under the thumb. Right half: drag to look, tap to open doors. */
export function TouchControls() {
  const { prompt } = useUi()
  const [stick, setStick] = useState<Stick | null>(null)
  const [guide, setGuide] = useState(() => !localStorage.getItem(SEEN))
  const knob = useRef<HTMLDivElement>(null)
  const look = useRef<{ id: number; x: number; y: number; sx: number; sy: number; t: number } | null>(null)

  useEffect(
    () => () => {
      touch.move.x = touch.move.y = 0
    },
    [],
  )

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    if (e.clientX < window.innerWidth * 0.45 && !stick) {
      walked = true
      setStick({ id: e.pointerId, x: e.clientX, y: e.clientY })
    } else if (!look.current) {
      look.current = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() }
    }
  }

  const move = (e: React.PointerEvent) => {
    if (stick?.id === e.pointerId) {
      let dx = e.clientX - stick.x
      let dy = e.clientY - stick.y
      const d = Math.hypot(dx, dy)
      if (d > RADIUS) {
        dx *= RADIUS / d
        dy *= RADIUS / d
      }
      touch.move.x = dx / RADIUS
      touch.move.y = dy / RADIUS
      if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    } else if (look.current?.id === e.pointerId) {
      touch.look.dx += e.clientX - look.current.x
      touch.look.dy += e.clientY - look.current.y
      look.current.x = e.clientX
      look.current.y = e.clientY
    }
  }

  const up = (e: React.PointerEvent) => {
    if (stick?.id === e.pointerId) {
      setStick(null)
      touch.move.x = touch.move.y = 0
    } else if (look.current?.id === e.pointerId) {
      const l = look.current
      if (Math.hypot(e.clientX - l.sx, e.clientY - l.sy) < TAP_SLOP && performance.now() - l.t < TAP_MS) touch.interact()
      look.current = null
    }
  }

  return (
    <>
      <div className="touch" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {stick && (
          <div className="stick" style={{ left: stick.x, top: stick.y }}>
            <div className="knob" ref={knob} />
          </div>
        )}
        {!stick && !walked && !guide && <div className="stick-hint">Drag to walk</div>}
      </div>
      <button className="pause" aria-label="Pause" onClick={() => ui.set({ locked: false })}>
        <span />
        <span />
      </button>
      {guide && (
        <div
          className="guide"
          onPointerDown={() => {
            localStorage.setItem(SEEN, '1')
            setGuide(false)
          }}
        >
          <div className="guide-zone walk">
            <b>Walk</b>
            <span>Drag with your left thumb. Push further to run.</span>
          </div>
          <div className="guide-zone look">
            <b>Look around</b>
            <span>Drag with your right thumb. Tap a door to open it.</span>
          </div>
          <p className="guide-foot">
            Pause (top left) to pick another flat · <u>Tap anywhere to start</u>
          </p>
        </div>
      )}
      {prompt && (
        <button className="action" onClick={() => touch.interact()}>
          {prompt}
        </button>
      )}
    </>
  )
}
