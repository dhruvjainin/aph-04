import type { UnitPlan } from '../plan'

// Type 3C (flat 03). Traced from plans/3C.png (≈104.6 px per metre).
// Almost a mirror of 3D, but with a smaller top bedroom and dress. Rooms carry the printed plan labels.

export const TYPE_3C: UnitPlan = {
  pxPerM: 104.6,
  walls: [
    // ── horizontal ──────────────────────────────────────────────
    { rect: [413, 52, 1299, 70] },
    { rect: [432, 244, 687, 262], openings: [{ from: 541, to: 620, kind: 'door', hinge: 'start', swing: 1, open: true }] },
    { rect: [155, 437, 1299, 454], openings: [{ from: 705, to: 798, kind: 'door', hinge: 'start', swing: -1, open: true }] },
    { rect: [174, 613, 463, 630] },
    { rect: [845, 819, 1299, 837] },
    {
      rect: [174, 979, 445, 998],
      openings: [
        { from: 224, to: 330, kind: 'window', sill: 1.1 },
        { from: 350, to: 445, kind: 'door', hinge: 'end', swing: 1, open: true, style: 'upvc' },
      ],
    },
    { rect: [463, 979, 736, 996] },
    { rect: [174, 1145, 445, 1155], openings: [{ from: 186, to: 433, kind: 'open' }] },
    { rect: [463, 1172, 720, 1189] },
    { rect: [736, 1172, 1281, 1189], openings: [{ from: 736, to: 830, kind: 'door', hinge: 'start', swing: 1, open: true }] },
    { rect: [463, 1364, 720, 1381], openings: [{ from: 573, to: 651, kind: 'door', hinge: 'end', swing: -1, open: true }] },
    { rect: [445, 1555, 1299, 1574] },
    // ── vertical ────────────────────────────────────────────────
    { rect: [413, 70, 432, 437], openings: [{ from: 265, to: 327, kind: 'vent' }] },
    { rect: [687, 244, 705, 437] },
    { rect: [1124, 70, 1142, 437], openings: [{ from: 128, to: 379, kind: 'slider' }] },
    { rect: [1124, 454, 1142, 819], openings: [{ from: 511, to: 762, kind: 'slider' }] },
    { rect: [155, 454, 174, 1155], openings: [{ from: 454, to: 568, kind: 'entry', hinge: 'start', swing: 1, open: false }] },
    {
      rect: [445, 917, 463, 1555],
      openings: [
        { from: 1081, to: 1145, kind: 'vent' },
        { from: 1301, to: 1364, kind: 'vent' },
      ],
    },
    { rect: [720, 996, 736, 1381], openings: [{ from: 996, to: 1075, kind: 'door', hinge: 'start', swing: -1, open: true }] },
    { rect: [845, 837, 862, 1172], openings: [{ from: 837, to: 931, kind: 'door', hinge: 'start', swing: 1, open: true }] },
    {
      rect: [1281, 837, 1299, 1555],
      openings: [
        { from: 910, to: 1099, kind: 'window' },
        { from: 1246, to: 1498, kind: 'window' },
      ],
    },
  ],
  railings: [
    [1285, 70, 1299, 437],
    [1285, 454, 1299, 819],
  ],
  wood: [
    [736, 1189, 1281, 1555],
    [463, 1381, 736, 1555],
  ],
  beams: [{ rect: [445, 630, 463, 917], soffit: 7 * 0.3048 }],
  kitchen: { rect: [174, 630, 445, 979], open: 'e' },
  floor: [
    [413, 52, 1299, 437],
    [155, 437, 1299, 1155],
    [445, 1155, 1299, 1574],
  ],
  rooms: [
    { name: 'Bedroom 1', rect: [705, 70, 1124, 437] },
    { name: 'Bedroom 1 Dress', rect: [432, 70, 705, 244] },
    { name: 'Bedroom 1 Toilet', rect: [432, 262, 687, 437], toilet: true },
    { name: 'Bedroom 1 Balcony', rect: [1142, 70, 1285, 437] },
    { name: 'Living Balcony', rect: [1142, 454, 1285, 819] },
    { name: 'Bedroom 2', rect: [862, 837, 1281, 1172] },
    { name: 'M.Bedroom', rect: [736, 1189, 1281, 1555] },
    { name: 'M.Bedroom Dress', rect: [463, 1381, 736, 1555] },
    { name: 'M.Bedroom Toilet', rect: [463, 1189, 720, 1364], toilet: true },
    { name: 'Common Toilet', rect: [463, 996, 720, 1172], toilet: true },
    { name: 'Utility', rect: [174, 998, 445, 1145] },
    { name: 'Kitchen', rect: [174, 630, 445, 979] },
    { name: 'Foyer', rect: [174, 454, 463, 613] },
    { name: 'Passage', rect: [736, 979, 845, 1172] },
    { name: 'Living', rect: [862, 454, 1124, 819] },
    { name: 'Dining', rect: [463, 454, 862, 979] },
  ],
  spawn: { x: 250, y: 520, yaw: -Math.PI / 2 + 0.3 },
}
