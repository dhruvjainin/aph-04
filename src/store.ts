import { useSyncExternalStore } from 'react'
import type { Object3D } from 'three'
import type { UnitId } from './scene/plan'

export interface DoorHandle {
  toggle: () => void
  isOpen: () => boolean
  /** What the prompt calls it; defaults to "door". */
  noun?: string
  /** Prompt verb; defaults to "Open" / "Close" from `isOpen`. */
  verb?: string
}

export const doorRegistry = new Map<Object3D, DoorHandle>()

/** Static scene: the shadow map is only re-rendered when something moves. */
export const shadows = { dirty: 30 }
export const markShadowsDirty = (frames = 2) => {
  shadows.dirty = Math.max(shadows.dirty, frames)
}

interface UiState {
  locked: boolean
  prompt: string | null
  loaded: boolean
  night: boolean
  dims: boolean
  /** Wall labels (`L`). */
  labels: boolean
  /** The flat you are in, or nearest to when in the corridor. */
  flat: UnitId
  /** False until the first flat is picked on the home screen. */
  started: boolean
  /** Runjhun's design popup is open. */
  menu: boolean
  /** Wall paint chosen in the menu. */
  paint: string
}

export const WALL_PAINTS = [
  { name: 'Warm white', hex: '#efede8' },
  { name: 'Sand', hex: '#e6d6bb' },
  { name: 'Sage', hex: '#d5e0cf' },
  { name: 'Mist blue', hex: '#d6e1ea' },
  { name: 'Blush', hex: '#ecd0c8' },
  { name: 'Butter', hex: '#f0e0a0' },
]

let state: UiState = { locked: false, prompt: null, loaded: false, night: false, dims: false, labels: false, flat: '04', started: false, menu: false, paint: WALL_PAINTS[0].hex }
const listeners = new Set<() => void>()

export const ui = {
  get: () => state,
  set(patch: Partial<UiState>) {
    const next = { ...state, ...patch }
    if ((Object.keys(patch) as (keyof UiState)[]).every((k) => next[k] === state[k])) return
    state = next
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export const useUi = () => useSyncExternalStore(ui.subscribe, ui.get)

/** DOM nodes the render loop writes into directly (no React re-renders per frame). */
export const hud: { dot: HTMLDivElement | null; room: HTMLDivElement | null; map: SVGSVGElement | null } = {
  dot: null,
  room: null,
  map: null,
}

/** Phones and tablets: no pointer lock or keyboard, so on-screen touch controls drive the player. */
export const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches

/** Touch input, written by the on-screen controls and read by the player every frame. */
export const touch = {
  /** Joystick, each axis -1..1 (y down = backwards). */
  move: { x: 0, y: 0 },
  /** Look drag accumulated since the last frame, in pixels. */
  look: { dx: 0, dy: 0 },
  interact: () => {},
}

/** Registered by the player: jump to a flat's front door. */
export const player = { teleport: (_id: UnitId) => {}, pos: { x: 0, z: 0 } }

/** Frees the mouse so the menu can be clicked. */
export const openMenu = () => {
  document.exitPointerLock?.()
  ui.set({ menu: true, locked: false })
}

export const closeMenu = () => {
  ui.set({ menu: false, locked: TOUCH })
  if (!TOUCH) document.querySelector('canvas')?.requestPointerLock()
}
