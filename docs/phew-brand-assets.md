# Phew Brand Assets

This file tracks the real local Phew visual assets used by the frontend. The approved concept references remain in `frontend/public/design-reference/phew-redesign/`; the live UI uses React, CSS, backend data, and the generated asset pack below.

## Rules

- Mascot scene usage must be a free transparent character, never a square logo block.
- Boxed logo usage is limited to sidebar, favicon, and small identity markers.
- All mascot images must use `object-contain`, intrinsic aspect ratio, and transparent background.
- Use WebP in UI by default. PNG siblings are kept as source-compatible fallbacks.
- Do not render reference screenshots or generated sheets directly as UI.
- Missing backend values stay `N/A`, disabled, or in explicit empty/error/backend-unavailable states.

## Generation Batch

- Date: 2026-05-19.
- Tool: Image 2, with local Phew redesign references from `frontend/public/design-reference/phew-redesign/`.
- Prompt family: "Phew Run neon black/lime/white mascot and protocol object asset pack, transparent magenta-key background, no baked text, no square logo box, game-like transaction scene objects, clean mascot poses matching the approved dashboard/storyboard references."
- Processing: generated sheets were split and chroma-keyed locally with Sharp, then exported as transparent PNG plus optimized WebP.
- Quality report: `tmp/imagegen/phew-asset-sources/quality-report.json`.
- Quality result: 26 of 26 assets passed transparent-corner, aspect-ratio, no-cropping, no-logo-box, and low/no magenta-residue checks.

## Mascot Assets

| Asset | Path | Intended Use | Quality | Component |
| --- | --- | --- | --- | --- |
| Idle mascot | `frontend/public/brand/phew-mascot-idle.webp` | Static/neutral empty states | Passed | `PhewMascot` |
| Running mascot | `frontend/public/brand/phew-mascot-running.webp` | Home CTA and action scenes | Passed | `PhewMascot` |
| Success mascot | `frontend/public/brand/phew-mascot-success.webp` | Confirmed/success scenes | Passed | `PhewMascot` |
| Loading mascot | `frontend/public/brand/phew-mascot-loading.webp` | Loading, scan, empty states | Passed | `PhewMascot` |
| Warning mascot | `frontend/public/brand/phew-mascot-warning.webp` | Warning/backend-unavailable states | Passed | `PhewMascot` |
| Error mascot | `frontend/public/brand/phew-mascot-error.webp` | Error/glitch states | Passed | `PhewMascot` |
| Mint mascot | `frontend/public/brand/phew-mascot-mint.webp` | Mint actor | Passed | `PhewMascotActor`, `PhewGameMoment` |
| Stake mascot | `frontend/public/brand/phew-mascot-stake.webp` | Stake/unstake actor | Passed | `PhewMascotActor`, `PhewGameMoment` |
| Redeem mascot | `frontend/public/brand/phew-mascot-redeem.webp` | Redeem actor | Passed | `PhewMascotActor`, `PhewGameMoment` |
| Hero mascot | `frontend/public/hero/phew-hero-mascot.webp` | Home/create hero actor | Passed | `PhewMascotHero` |

## Protocol Objects

| Asset | Path | Intended Use | Quality | Component |
| --- | --- | --- | --- | --- |
| Token coin | `frontend/public/animations/phew-token-coin.webp` | Mint token, metrics, wallet object | Passed | `PhewGameMoment`, sidebar/status |
| Token stack | `frontend/public/animations/phew-token-stack.webp` | Redeem returned tokens | Passed | `PhewGameMoment` |
| NFT card slot | `frontend/public/animations/phew-nft-card.webp` | NFT card object, empty vault art | Passed | `PhewGameMoment`, empty states |
| Vault safe | `frontend/public/animations/phew-vault-safe.webp` | Stake target, reserve/vault metrics | Passed | `PhewGameMoment` |
| Proof scan ring | `frontend/public/animations/phew-proof-ring.webp` | Proof target, verification metrics | Passed | `PhewGameMoment` |
| Lock/unlock | `frontend/public/animations/phew-lock-unlock.webp` | Stake/unstake lock state | Passed | `brandAssets.lockUnlock` |
| Reward burst | `frontend/public/animations/phew-reward-burst.webp` | Rewards, success burst | Passed | `PhewGameMoment`, metrics |
| Error glitch | `frontend/public/animations/phew-error-glitch.webp` | Error object | Passed | `PhewGameMoment`, status |

## Pictograms

| Asset | Path | Intended Use | Quality |
| --- | --- | --- | --- |
| Lock tokens | `frontend/public/icons/phew/pictogram-lock-tokens.webp` | Lock action, how-it-works | Passed |
| Mint NFT | `frontend/public/icons/phew/pictogram-mint-nft.webp` | Mint nav/action | Passed |
| Stake | `frontend/public/icons/phew/pictogram-stake.webp` | Staking nav/action | Passed |
| Redeem | `frontend/public/icons/phew/pictogram-redeem.webp` | Redeem nav/action | Passed |
| Proof | `frontend/public/icons/phew/pictogram-proof.webp` | Proof nav/action | Passed |
| Reserve | `frontend/public/icons/phew/pictogram-reserve.webp` | Reserve/vault status | Passed |
| Strategy | `frontend/public/icons/phew/pictogram-strategy.webp` | Strategy/admin routes | Passed |
| Community | `frontend/public/icons/phew/pictogram-community.webp` | Create/community routes | Passed |

## Implementation Notes

- `frontend/lib/brand-assets.ts` is the routing layer for generated assets.
- `frontend/components/BrandLogo.tsx` uses the mascot mark only in the boxed sidebar identity context.
- `frontend/components/Sidebar.tsx` uses Phew pictograms for core protocol actions.
- `frontend/components/PhewMascot.tsx` centralizes mood, sizing, and non-stretch behavior.
- `frontend/components/PhewGameMoments.tsx` composes the mascot actor, token/NFT object, target object, beam/orbit/particles, state label, and progress dots.
