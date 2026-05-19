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
- `frontend/components/PhewPageHero.tsx` centralizes page hero mascot placement.
- `frontend/components/PhewEmptyState.tsx` centralizes table/list empty-state mascot placement.
- `frontend/components/PhewSuccessMomentModal.tsx` is the post-confirmation game-lobby success scene. Large transaction animation should not be shown inline in normal forms.

## Hero And Empty-State Roles

| Route | Hero Mascot | Empty-State Mascot |
| --- | --- | --- |
| `/collections` | Explorer/checking pose | Explorer/checking pose aligned inside table body |
| `/collections/:id` | Collection/proof checking pose | Proof/checking pose for vault table |
| `/mint` | Mint pose | Mint pose |
| `/staking` | Stake pose | Stake pose |
| `/redeem` | Redeem pose | Redeem pose |
| `/vaults/:mint/proof` | Proof scan pose | Proof scan pose |
| `/create-community` | Launch/running pose | Launch/running pose |
| `/admin/setup` | Warning/tools pose | Warning pose |
| `/admin/risk` | Warning/tools pose | Warning pose |
| `/strategy-engine` | Strategy/redeem pose | Redeem/route pose |
| `/studio` | Focused studio pose | Focused/loading pose |

## Future Asset Generation Prompts

No paid image generation was called for the current repair. If new art is approved, generate transparent-background assets, cache final outputs locally, and keep text out of the image. Use the current OpenAI image model configured for transparent PNG or WebP output and estimate cost from the pricing page before calling it.

Prompt base:

`Phew Run mascot and protocol object asset, transparent background, no text, no logo box, no square frame, black/lime/white neon game UI style, thick readable shapes, same proportions as approved Phew mascot, clean WebP-ready edges, no cropped limbs, no distorted body.`

Specific prompts to prepare:

- Collections hero: explorer mascot leaning forward with proof scan ring, looking/checking, transparent background.
- Mint hero: mascot holding a token coin and NFT card, token-to-card energy beam, transparent background.
- Stake hero: mascot pushing an NFT card into a vault safe, rewards glow, transparent background.
- Redeem hero: mascot unlocking token stack from NFT card, transparent background.
- Proof hero: mascot scanning/checking a vault NFT with a circular proof ring, transparent background.
- Create Community hero: mascot launching a flag/reserve vault from token CA, transparent background.
- Admin hero: mascot with shield/tools posture, warning-ready but not broken, transparent background.
- Empty-state poses: smaller variants of explorer, mint, stake, redeem, proof, launch, warning, focused.
- Success modal poses: large expressive success mascot variants for mint, stake, unstake, redeem, proof, launch, studio-bible, and layer-pack.
- Protocol objects: vault safe, NFT card, token coin, proof scan ring, unlock/redeem object, staking reward burst.

Cost and safety gates:

- Ask for explicit approval before any paid OpenAI image call.
- Store generated source outputs under a temporary asset source folder and approved optimized outputs under `frontend/public/brand`, `frontend/public/animations`, or `frontend/public/icons/phew`.
- Update this file with paths, quality checks, and approval status before using new assets in UI.
