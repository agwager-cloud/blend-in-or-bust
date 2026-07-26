# Blend in or Bust — Third-Party Asset Manifest

All third-party artwork bundled in this folder is available under Creative
Commons Zero (CC0). The files are stored locally so the game does not depend on
third-party services at runtime.

## Poly Haven

Source: https://polyhaven.com/
License: CC0 — https://polyhaven.com/license

| Asset | Source | Bundled files | Use |
| --- | --- | --- | --- |
| Marble 01 | https://polyhaven.com/a/marble_01 | `marble_01_diff_1k.jpg`, `marble_01_nor_dx_1k.jpg` | Grand Gallery floor |
| Painted Plaster Wall | https://polyhaven.com/a/painted_plaster_wall | `painted_plaster_wall_diff_1k.jpg`, `painted_plaster_wall_nor_dx_1k.jpg` | Museum walls |

The 1K variants were selected to keep download size and GPU memory appropriate
for phones and iPads.

## Kenney

Source: https://kenney.nl/assets/furniture-kit
Pack: Furniture Kit 2.0
License: CC0

Bundled models:

- `benchCushion`
- `benchCushionLow`
- `bookcaseOpenLow`
- `bookcaseOpen`
- `chairCushion`
- `chairModernFrameCushion`
- `coatRackStanding`
- `lampRoundTable`
- `lampRoundFloor`
- `lampSquareFloor`
- `loungeDesignChair`
- `loungeSofa`
- `plantSmall1`
- `plantSmall2`
- `plantSmall3`
- `pottedPlant`
- `radio`
- `tableCoffee`
- `tableCross`
- `televisionModern`

The original licence notice is preserved as `Kenney-Furniture-Kit.txt`.

## Original Generated Artwork

`museum-paintings-atlas-v1.png` contains twelve original oil-painting-style
artworks generated specifically for Blend in or Bust. It is arranged as a
4-column by 3-row texture atlas so dozens of framed paintings can share one
mobile-friendly GPU texture and one network request.
