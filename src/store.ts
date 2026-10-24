import { useSyncExternalStore } from 'react'
import type { Object3D } from 'three'

export interface DoorHandle {
  toggle: () => void
  isOpen: () => boolean
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
}

let state: UiState = { locked: false, prompt: null, loaded: false, night: false, dims: false }
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
export const hud: { dot: HTMLDivElement | null; room: HTMLDivElement | null } = { dot: null, room: null }
