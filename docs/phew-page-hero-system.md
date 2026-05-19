# Phew Page Hero System

## Component

`frontend/components/PhewPageHero.tsx`

The hero system gives every major route a consistent top banner with:

- left copy/action area
- center/right transparent mascot pose
- optional side panel for live stats, wallet state, route status, or protocol checks
- optional warning band

The mascot is always rendered from transparent local assets through `PhewMascot`. It is not the boxed logo, not a square mark, and is constrained with `object-contain` and fixed responsive dimensions.

## Pose Map

| Page | Pose |
| --- | --- |
| `/collections` | `explorer` -> proof/checking mascot |
| `/collections/:id` | proof/checking mascot in the collection hero |
| `/mint` | `mint` |
| `/staking` | `stake` |
| `/redeem` | `redeem` |
| `/vaults/:mint/proof` | `proof` |
| `/create-community` | `launch` -> running mascot |
| `/admin/setup` | `admin` -> warning/tools posture |
| `/admin/risk` | `admin` -> warning/tools posture |
| `/strategy-engine` | `strategy` -> redeem/route posture |
| `/studio` | `studio` -> focused/loading posture |

## Empty States

`frontend/components/PhewEmptyState.tsx` is the default empty-state primitive. It aligns a smaller mascot or protocol object with clear copy and one optional CTA. Table/list empty bodies use the same component via `ReferenceEmpty`, which prevents mascot overlap with grid lines and keeps empty tables visually intentional.

## Rules

- Use `PhewPageHero` instead of one-off hero mascot positioning for new pages.
- Use `PhewEmptyState` or `ReferenceEmpty` for empty data regions.
- Do not place mascot art directly over table borders or text.
- Do not render the boxed logo as a hero or empty-state actor.
- Keep side panels compact and data-driven; do not invent rows to fill space.
