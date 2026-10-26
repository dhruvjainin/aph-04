import type { UnitPlan } from '../plan'

// Copy of Type 3D (flat 04), shown on its own at /dmr; edit it independently of 3D.ts.
// Traced from plans/3D-trace.png (905×1043 px, ≈69 px per metre).
// Room names are the household names (see AGENTS.md).

export const TYPE_DMR: UnitPlan = {
  pxPerM: 69,
  walls: [
    // ── horizontal ──────────────────────────────────────────────
    { rect: [77, 22, 830, 37] },
    { rect: [499, 150, 830, 162], openings: [{ from: 556, to: 605, kind: 'door', hinge: 'end', swing: 1, open: true }] },
    { rect: [77, 277, 830, 289], openings: [{ from: 439, to: 497, kind: 'door', hinge: 'end', swing: -1, open: true }] },
    { rect: [626, 392, 816, 404] },
    { rect: [77, 527, 376, 540] },
    {
      rect: [447, 634, 816, 645],
      openings: [
        { from: 640, to: 698, kind: 'door', hinge: 'start', swing: 1, open: true, style: 'upvc' },
        { from: 716, to: 780, kind: 'window', sill: 1.1 },
      ],
    },
    { rect: [638, 742, 830, 752], openings: [{ from: 694, to: 816, kind: 'open' }] },
    { rect: [90, 760, 447, 772], openings: [{ from: 388, to: 445, kind: 'door', hinge: 'end', swing: 1, open: true }] },
    { rect: [459, 760, 627, 772] },
    { rect: [447, 885, 627, 897], openings: [{ from: 502, to: 555, kind: 'door', hinge: 'end', swing: -1, open: true }] },
    { rect: [638, 834, 692, 845] },
    { rect: [77, 1010, 638, 1024] },
    // ── vertical ────────────────────────────────────────────────
    { rect: [181, 37, 192, 277], openings: [{ from: 74, to: 240, kind: 'slider' }] },
    { rect: [181, 289, 192, 527], openings: [{ from: 326, to: 490, kind: 'slider' }] },
    {
      rect: [77, 540, 90, 1010],
      openings: [
        { from: 587, to: 712, kind: 'window' },
        { from: 807, to: 972, kind: 'window' },
      ],
    },
    { rect: [499, 162, 510, 277] },
    { rect: [679, 162, 690, 277], openings: [{ from: 168, to: 205, kind: 'vent' }] },
    { rect: [816, 37, 830, 150] },
    // Closes the PHE-shaft notch off the corridor.
    { rect: [816, 162, 830, 277] },
    { rect: [816, 289, 830, 742], openings: [{ from: 291, to: 357, kind: 'entry', hinge: 'start', swing: -1, open: false }] },
    { rect: [365, 540, 376, 760], openings: [{ from: 542, to: 598, kind: 'door', hinge: 'start', swing: -1, open: true }] },
    { rect: [447, 645, 459, 885], openings: [{ from: 648, to: 695, kind: 'door', hinge: 'start', swing: 1, open: true }] },
    {
      rect: [627, 645, 638, 1010],
      openings: [
        { from: 700, to: 742, kind: 'vent', sill: 1.1, head: 2.0 },
        { from: 850, to: 885, kind: 'vent' },
      ],
    },
    { rect: [682, 752, 692, 834] },
  ],
  railings: [
    [77, 37, 90, 277],
    [77, 289, 90, 527],
  ],
  wood: [
    [90, 772, 447, 1010],
    [447, 897, 627, 1010],
  ],
  beams: [{ rect: [626, 404, 645, 634], soffit: 7 * 0.3048 }],
  // The /dmr kitchen interior brings its own backsplash.
  kitchen: { rect: [638, 404, 816, 634], open: 'w', dado: false },
  // Excludes the AC ledge and the façade notch.
  floor: [
    [77, 22, 830, 162],
    [77, 162, 690, 289],
    [77, 289, 830, 752],
    [77, 752, 692, 845],
    [77, 845, 638, 1024],
  ],
  // First match wins, so specific rooms precede the open living/dining area.
  rooms: [
    { name: 'Master Bedroom', rect: [192, 37, 499, 277] },
    { name: 'Master Dress', rect: [499, 37, 816, 150] },
    { name: 'Master Toilet', rect: [510, 162, 679, 277], toilet: true },
    { name: 'Master Balcony', rect: [77, 37, 181, 277] },
    { name: 'Living Balcony', rect: [77, 289, 181, 527] },
    { name: 'Kids Room', rect: [90, 540, 365, 760] },
    { name: 'Parents Room', rect: [90, 772, 447, 1010] },
    { name: 'Parents Dress', rect: [447, 897, 627, 1010] },
    { name: 'Parents Toilet', rect: [459, 772, 627, 885], toilet: true },
    { name: 'Common Toilet', rect: [459, 645, 627, 760], toilet: true },
    { name: 'Utility', rect: [638, 645, 816, 742] },
    { name: 'Kitchen', rect: [638, 404, 816, 634] },
    { name: 'Foyer', rect: [626, 162, 830, 404] },
    { name: 'Passage', rect: [376, 527, 459, 772] },
    { name: 'Living', rect: [181, 277, 447, 527] },
    { name: 'Dining', rect: [447, 277, 638, 645] },
  ],
  spawn: { x: 765, y: 330, yaw: Math.PI / 2 },
}
