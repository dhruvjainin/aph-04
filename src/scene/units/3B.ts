import type { UnitPlan } from '../plan'

// Type 3B (flat 02; flat 01 is its mirror image). Traced from plans/3B.png (≈104.6 px per metre).
// Rooms carry the printed plan labels.

export const TYPE_3B: UnitPlan = {
  pxPerM: 104.6,
  walls: [
    // ── horizontal ──────────────────────────────────────────────
    { rect: [581, 88, 1449, 107] },
    { rect: [581, 280, 837, 298], openings: [{ from: 691, to: 769, kind: 'door', hinge: 'start', swing: 1, open: true }] },
    { rect: [581, 473, 837, 490] },
    { rect: [854, 473, 1449, 490], openings: [{ from: 918, to: 1011, kind: 'door', hinge: 'start', swing: -1, open: true }] },
    { rect: [581, 665, 854, 681] },
    { rect: [188, 568, 562, 578], openings: [{ from: 200, to: 550, kind: 'open' }] },
    {
      rect: [188, 725, 562, 744],
      openings: [
        { from: 280, to: 406, kind: 'window', sill: 1.1 },
        { from: 469, to: 562, kind: 'door', hinge: 'end', swing: -1, open: true, style: 'upvc' },
      ],
    },
    { rect: [1011, 824, 1449, 843] },
    { rect: [188, 1031, 581, 1048] },
    { rect: [305, 1207, 1449, 1224], openings: [{ from: 854, to: 947, kind: 'door', hinge: 'start', swing: 1, open: true }] },
    { rect: [581, 1400, 854, 1417], openings: [{ from: 691, to: 769, kind: 'door', hinge: 'end', swing: -1, open: true }] },
    { rect: [562, 1591, 1449, 1609] },
    // ── vertical ────────────────────────────────────────────────
    {
      rect: [562, 88, 581, 744],
      openings: [
        { from: 297, to: 361, kind: 'vent' },
        { from: 505, to: 568, kind: 'vent' },
      ],
    },
    // Shared with flat 01 (back-to-back kitchens).
    { rect: [171, 568, 188, 1048] },
    { rect: [305, 1048, 322, 1207], openings: [{ from: 1098, to: 1207, kind: 'entry', hinge: 'end', swing: 1, open: false }] },
    { rect: [837, 280, 854, 665], openings: [{ from: 587, to: 665, kind: 'door', hinge: 'end', swing: -1, open: true }] },
    { rect: [1011, 490, 1028, 824], openings: [{ from: 490, to: 583, kind: 'door', hinge: 'start', swing: 1, open: true }] },
    { rect: [1273, 107, 1292, 473], openings: [{ from: 164, to: 415, kind: 'slider' }] },
    { rect: [1430, 490, 1449, 824], openings: [{ from: 562, to: 752, kind: 'window' }] },
    { rect: [1273, 843, 1292, 1207], openings: [{ from: 899, to: 1150, kind: 'slider' }] },
    { rect: [562, 1224, 581, 1591], openings: [{ from: 1336, to: 1400, kind: 'vent' }] },
    { rect: [837, 1224, 854, 1400] },
    { rect: [1430, 1224, 1449, 1591], openings: [{ from: 1282, to: 1534, kind: 'window' }] },
  ],
  railings: [
    [1435, 107, 1449, 473],
    [1435, 843, 1449, 1207],
  ],
  wood: [
    [854, 1224, 1430, 1591],
    [581, 1417, 854, 1591],
  ],
  beams: [{ rect: [562, 744, 581, 1031], soffit: 7 * 0.3048 }],
  kitchen: { rect: [188, 744, 562, 1031], open: 'e' },
  floor: [
    [562, 88, 1449, 1609],
    [171, 568, 562, 1048],
    [305, 1048, 562, 1224],
  ],
  rooms: [
    { name: 'Bedroom 1', rect: [854, 107, 1273, 473] },
    { name: 'Bedroom 1 Dress', rect: [581, 107, 854, 280] },
    { name: 'Bedroom 1 Toilet', rect: [581, 298, 837, 473], toilet: true },
    { name: 'Bedroom 1 Balcony', rect: [1292, 107, 1435, 473] },
    { name: 'Living Balcony', rect: [1292, 843, 1435, 1207] },
    { name: 'Bedroom 2', rect: [1028, 490, 1430, 824] },
    { name: 'Common Toilet', rect: [581, 490, 837, 665], toilet: true },
    { name: 'M.Bedroom', rect: [854, 1224, 1430, 1591] },
    { name: 'M.Bedroom Dress', rect: [581, 1417, 854, 1591] },
    { name: 'M.Bedroom Toilet', rect: [581, 1224, 837, 1400], toilet: true },
    { name: 'Utility', rect: [188, 578, 562, 725] },
    { name: 'Kitchen', rect: [188, 744, 562, 1031] },
    { name: 'Foyer', rect: [322, 1048, 581, 1207] },
    { name: 'Passage', rect: [854, 490, 1011, 824] },
    { name: 'Living', rect: [1011, 843, 1273, 1207] },
    { name: 'Dining', rect: [562, 490, 1011, 1207] },
  ],
  spawn: { x: 420, y: 1150, yaw: -Math.PI / 2 + 0.35 },
}
