# F2904 — walkable 3D apartment

Bare-shell (walls, doors, windows only) first-person walkthrough of four flats on one floor, built with Vite, TypeScript, React Three Fiber, drei, Rapier and three.js. All four flats (01–04) are modelled around the common lift corridor; the home screen is a 2×2 grid to pick a flat, and you can walk out of one front door and into another.

- `npm run dev` (port 5179), `npm run build`, typecheck with `npx tsc -b`.
- Append `?fps` to the URL for an FPS counter.
- Target 60 FPS on Retina laptops: keep post-processing cheap (N8AO at half resolution), DPR capped at 1.5, merged static geometry (door handles and downlight fittings too), one 4096 shadow map spanning the whole floor and re-rendered only when doors move (`markShadowsDirty`). Night lights and dimensions cover only the current flat (`ui.flat`) plus the corridor; the point-light count stays fixed so switching flats never recompiles shaders.

## Flats

| Flat | Type | Position on the floor | Data |
| --- | --- | --- | --- |
| 01 | 3A | Top left, balconies west | Mirror of 3B |
| 02 | 3B | Top right, balconies east | `src/scene/units/3B.ts` |
| 03 | 3C | Bottom right, balconies east | `src/scene/units/3C.ts` |
| 04 | 3D | Bottom left, balconies west | `src/scene/units/3D.ts` |

`/dmr` is an unlisted route showing flat 04 on its own (no other flats, a small enclosed landing outside the front door). It is built from `src/scene/units/3D-dmr.ts`, a copy of `3D.ts` that can be edited independently; `DMR` in `plan.ts` switches the route. Interiors for this route are mounted only on `/dmr` by `src/scene/Interior.tsx`, which merges one mesh per material from builders in `src/scene/interior/` (`tv.ts`: TV unit on the Living's south wall; `dining.ts`: crockery wall on the Dining's south wall (the Common Toilet wall), a teak casing around the kitchen opening under the beam, and a six-seat marble table and pendant pointing at the crockery wall; `foyer.ts`: on the kitchen's north wall, a cane-fronted tall unit over a floating shoe cabinet, a teak bench ending in a turned pillar, ceiling rafters and two brass lanterns; `kitchen.ts`: handleless cream cabinets on the east, north and south walls under a verde marble counter and a green stacked-tile backsplash, with a hob and chimney, a black sink under the window, a fridge recess, a tall unit with an open niche, and a teak slatted screen with frosted glass in the opening; `living.ts`: a cream sofa on the north wall under a night-forest painting, a paper lantern, potted bamboo and sheer and linen curtains by the slider, a stepped teak coffee table on a brass base, two grey teak armchairs facing west and a black side table with a lamp; `dress.ts`: in the Master Dress, a full-height wardrobe on the north wall with six two-tone doors (teak shaker base, cream above) on long brass pulls under a loft, and a teak-framed mirror beside an open teak niche on the east wall; `ceilings.ts`: false ceilings, a two-step rounded coffer with shadow grooves in the Living and a flat terracotta ceiling carried 1 ft down the walls in the Master Bedroom). `soffitAt(x, z)` gives the ceiling height under these false ceilings, so ceiling sprinklers, smoke detectors and night lights drop to the soffit. The `/dmr` kitchen sets `dado: false`, so the base white tile dado is skipped behind the backsplash. Drawers and shutters are separate `Moving` parts (`drawer()` / `shutter()` in `interior/kit.ts`) that register in `doorRegistry`, so `E` or a click opens them like doors; shutters open onto a shelved interior (`cavity()`). `shutterParts()` builds a shutter in several materials; its `extra` meshes move and toggle with it.

Reference plans live in `plans/` (`building.png` shows the floor). Flats 01–03 use the printed plan labels (Bedroom 1, Bedroom 2, M.Bedroom, …); only 04 uses the household names below. All flats share the same finishes.

## Room names (flat 04)

The household names differ from the labels printed on the 3D plan. Always use the household names for flat 04 in code, UI and conversation.

| Household name | Printed plan label | Plan location |
| --- | --- | --- |
| Master Bedroom | BEDROOM 14'6"×11'6" | Top, next to the top balcony |
| Kids Room | BEDROOM 13'0"×10'6" | Middle left |
| Parents Room | M.BEDROOM 17'0"×11'6" | Bottom left |

Attached spaces follow their bedroom: Master Dress / Master Toilet (top right), Parents Dress / Parents Toilet (bottom). The middle toilet off the passage is the Common Toilet.

## Geometry

- Each flat type is traced in its own plan image's pixels (`src/scene/units/*.ts`, with its own `pxPerM`). `src/scene/plan.ts` places them into one building frame with `place()` (anchor, offset, optional mirror). The building frame uses 69 px/m with x = 0 on the shared 01/02 kitchen wall; convert with `toX`/`toZ`. Placed values must stay bit-identical where walls are shared or matched by exact equality (`clad()`), so always derive them through the same `place()` transform.
- `plan.ts` also builds the corridor and core (`CORRIDOR`: decorative lift and stair doors), the merged `WALLS` (shared walls deduped), and `ROOMS` (first match wins, each tagged with its unit).
- `src/scene/geometry.ts` builds merged box geometry; avoid coplanar overlapping faces (z-fighting).
- Heights: ceiling is 9 ft (`CEILING = 9 * FT`, 2.743 m); the kitchen beam soffit gives 7 ft clear (2.134 m).

## Mobile

- `TOUCH` in `store.ts` detects touch-only devices. They get no pointer lock; `TouchControls.tsx` provides a left-side joystick (`touch.move`, full tilt runs), right-side drag-to-look (`touch.look`), tap or the action button to interact (`touch.interact`), and a pause button.
- Phones render lighter: DPR starts at 1 (max 1.25), N8AO is skipped, and the shadow map is 2048.

## View toggles

- Night (`N` or the top-right button): `NightLights.tsx` adds warm downlights per room, `Lighting.tsx` swaps to a starry sky and moonlight, and glass reflections are toned down. Point lights mount only at night, so day performance is unaffected.
- Dimensions (`T`): `Dimensions.tsx` draws each room's width and depth on its walls in ft-in and metres.
- Both live in the `ui` store (`night`, `dims`).

## Finishes (matched to site photos)

- Floors: glossy cream 800×800 vitrified tile everywhere (one `MeshReflectorMaterial` floor at reflector resolution 256), except dark walnut laminate in each M.Bedroom and its dress (the Parents Room and Parents Dress in 04; `WOOD_ZONES`). The common corridor has grey tile.
- Skirting follows the floor: 100 mm cream tile skirting, 70 mm dark wood skirting in wood zones, and none in toilets (`TOILETS`).
- Walls and ceilings: smooth matte off-white paint with no plaster texture.
- Toilets: glossy grey marble-look tiles from floor to a glossy lilac PVC false ceiling at 2.4 m (`FALSE_CEILING`), with white trims and a downlight.
- Kitchen: a band of 100 mm white tiles at 0.85–1.45 m (`KITCHEN.dado`) and a downstand beam over the open west side (`BEAMS`).
- Doors: dark wenge leaves with horizontal grain and slim wenge frames with no architraves; stainless levers on long backplates. The kitchen→utility door is white uPVC with a full-height glass panel (`style: 'upvc'`).
- Windows and sliders: white uPVC with a slim dark-grey interlock and plain plaster reveals (no stone sills). The utility is semi-open above a 1.05 m parapet (opening kind `'open'`).
- Balconies: black vertical-baluster railings on a 150 mm plastered upstand.
- Tile, marble and dado textures are generated on a canvas in `materials.ts` (deterministic, seeded).
