# F2904 — walkable 3D apartment

Bare-shell (walls, doors, windows only) first-person walkthrough of apartment F-2904, built with Vite, TypeScript, React Three Fiber, drei, Rapier and three.js.

- `npm run dev` (port 5179), `npm run build`, typecheck with `npx tsc -b`.
- Append `?fps` to the URL for an FPS counter.
- Target 60 FPS on Retina laptops: keep post-processing cheap (N8AO at half resolution), DPR capped at 1.5, merged static geometry, shadow map re-rendered only when doors move (`markShadowsDirty`).

## Room names

The household names differ from the labels printed on `Floor Plan.png`. Always use the household names in code, UI and conversation.

| Household name | Printed plan label | Plan location |
| --- | --- | --- |
| Master Bedroom | BEDROOM 14'6"×11'6" | Top, next to the top balcony |
| Kids Room | BEDROOM 13'0"×10'6" | Middle left |
| Parents Room | M.BEDROOM 17'0"×11'6" | Bottom left |

Attached spaces follow their bedroom: Master Dress / Master Toilet (top right), Parents Dress / Parents Toilet (bottom). The middle toilet off the passage is the Common Toilet.

## Geometry

- `src/scene/plan.ts` is the source of truth: wall rects and openings in plan pixels (≈69 px/m), converted with `toX`/`toZ`. `ROOMS` maps plan rects to household room names (first match wins).
- `src/scene/geometry.ts` builds merged box geometry; avoid coplanar overlapping faces (z-fighting).
- Heights: ceiling is 9 ft (`CEILING = 9 * FT`, 2.743 m); the kitchen beam soffit gives 7 ft clear (2.134 m).

## View toggles

- Night (`N` or the top-right button): `NightLights.tsx` adds warm downlights per room, `Lighting.tsx` swaps to a starry sky and moonlight, and glass reflections are toned down. Point lights mount only at night, so day performance is unaffected.
- Dimensions (`T`): `Dimensions.tsx` draws each room's width and depth on its walls in ft-in and metres.
- Both live in the `ui` store (`night`, `dims`).

## Finishes (matched to site photos)

- Floors: glossy cream 800×800 vitrified tile everywhere (one `MeshReflectorMaterial` floor at reflector resolution 256), except dark walnut laminate in the Parents Room and Parents Dress (`WOOD_ZONES`). The common lobby outside the entry has grey tile.
- Skirting follows the floor: 100 mm cream tile skirting, 70 mm dark wood skirting in wood zones, and none in toilets (`TOILETS`).
- Walls and ceilings: smooth matte off-white paint with no plaster texture.
- Toilets: glossy grey marble-look tiles from floor to a glossy lilac PVC false ceiling at 2.4 m (`FALSE_CEILING`), with white trims and a downlight.
- Kitchen: a band of 100 mm white tiles at 0.85–1.45 m (`KITCHEN.dado`) and a downstand beam over the open west side (`BEAMS`).
- Doors: dark wenge leaves with horizontal grain and slim wenge frames with no architraves; stainless levers on long backplates. The kitchen→utility door is white uPVC with a full-height glass panel (`style: 'upvc'`).
- Windows and sliders: white uPVC with a slim dark-grey interlock and plain plaster reveals (no stone sills). The utility is semi-open above a 1.05 m parapet (opening kind `'open'`).
- Balconies: black vertical-baluster railings on a 150 mm plastered upstand.
- Tile, marble and dado textures are generated on a canvas in `materials.ts` (deterministic, seeded).
