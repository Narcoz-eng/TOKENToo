# Phew Brand Assets

This file tracks the real local Phew visual assets used by the frontend. The approved concept references remain in `frontend/public/design-reference/phew-redesign/`; the live UI uses React, CSS, backend data, and the generated asset pack below.

## Rules

- Mascot scene usage must be a free transparent character, never a square logo block.
- Boxed logo usage is limited to sidebar, favicon, and small identity markers.
- All mascot images must use `object-contain`, intrinsic aspect ratio, and transparent background.
- Use WebP in UI by default. PNG siblings are kept as source-compatible fallbacks.
- Do not render reference screenshots or generated sheets directly as UI.
- Missing backend values stay `N/A`, disabled, or in explicit empty/error/backend-unavailable states.

## Logo

| Asset | Path | Intended Use | Quality | Component |
| --- | --- | --- | --- | --- |
| Real Phew Run logo | `frontend/public/logo.jpeg` | App identity, favicon metadata, sidebar/topbar mark | Approved source | `brandAssets.logo`, `BrandLogo` |

## Generation Batch

- Date: 2026-05-19.
- Tool: Image 2, with local Phew redesign references from `frontend/public/design-reference/phew-redesign/`.
- Prompt family: "Phew Run neon black/lime/white mascot and protocol object asset pack, transparent magenta-key background, no baked text, no square logo box, game-like transaction scene objects, clean mascot poses matching the approved dashboard/storyboard references."
- Processing: generated sheets were split and chroma-keyed locally with Sharp, then exported as transparent PNG plus optimized WebP.
- Quality report: `tmp/imagegen/phew-asset-sources/quality-report.json`.
- Quality result: 26 of 26 assets passed transparent-corner, aspect-ratio, no-cropping, no-logo-box, and low/no magenta-residue checks.

### Raid And Success Flow Pack

- Date: 2026-05-19.
- Tool: built-in Image Generation through the `$imagegen` skill.
- Source output: `tmp/imagegen/phew-game-flow-pack-source.png`.
- Project pack: `frontend/public/art/phew-generated-game-flow-pack.png`.
- Extracted reusable pieces: `frontend/public/art/generated/*.png`.
- Prompt family: "Phew Run complete game UI asset sheet using the real running star mascot, black/neon-green protocol objects, logo lockup, commander flag pose, and seven four-frame success flows for mint, stake, unstake, redeem, proof, community launch, and raid."
- Processing: generated on a magenta-key sheet, alpha processed locally, then cropped into transparent reusable objects. The sheet is source/reference only and is not rendered directly as UI.

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
| Generated commander | `frontend/public/art/generated/phew-commander-flag.png` | Raid hero, empty state, raid CTA | Generated PNG | `RaidCommandHero`, `RaidRoomsPage` |
| Generated token coin | `frontend/public/art/generated/phew-token-coin.png` | Mint success flow object | Generated PNG | `PhewGameFlow` |
| Generated token stack | `frontend/public/art/generated/phew-token-stack.png` | Redeem/unstake success flow object | Generated PNG | `PhewGameFlow` |
| Generated NFT card | `frontend/public/art/generated/phew-nft-card.png` | Mint/stake/redeem success flow object | Generated PNG | `PhewGameFlow` |
| Generated vault safe | `frontend/public/art/generated/phew-vault-safe.png` | Mint/stake success flow target | Generated PNG | `PhewGameFlow` |
| Generated lock/unlock | `frontend/public/art/generated/phew-lock.png`, `frontend/public/art/generated/phew-unlock.png` | Stake/unstake success flow target | Generated PNG | `PhewGameFlow` |
| Generated proof ring | `frontend/public/art/generated/phew-proof-ring.png` | Proof success flow target | Generated PNG | `PhewGameFlow` |
| Generated reward burst | `frontend/public/art/generated/phew-reward-burst.png` | Non-raid success burst | Generated PNG | `PhewGameFlow` |
| Generated raid flag/proof/XP | `frontend/public/art/generated/phew-raid-flag.png`, `frontend/public/art/generated/phew-raid-proof-badge.png`, `frontend/public/art/generated/phew-xp-badge.png` | Raid success flow objects | Generated PNG | `PhewGameFlow` |
| Raid flag | `frontend/public/icons/phew/native-raid-flag.svg` | Raid nav, buttons, cards | Code SVG | `RaidPictogram` |
| Raid room | `frontend/public/icons/phew/native-raid-room.svg` | Raid room rows, create flow | Code SVG | `RaidRoomCard`, `CreateRaidPanel` |
| Raid proof | `frontend/public/icons/phew/native-raid-proof.svg` | Manual/community proof states | Code SVG | `RaidProofPanel` |
| Raid XP | `frontend/public/icons/phew/native-raid-xp.svg` | XP stats and leaderboard | Code SVG | `RaidLeaderboard` |
| Raid reward | `frontend/public/icons/phew/native-raid-reward.svg` | Reward panel and creator flow | Code SVG | `RaidRewardsPanel` |

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
| Raid | `frontend/public/icons/phew/native-raid-flag.svg` | Raid route/nav/action | Code SVG |

## Implementation Notes

- `frontend/lib/brand-assets.ts` is the routing layer for generated assets.
- `frontend/components/BrandLogo.tsx` uses `frontend/public/logo.jpeg` for app identity; the old SVG favicon/wordmark is no longer the live brand mark.
- `frontend/components/Sidebar.tsx` uses Phew pictograms for core protocol actions.
- `frontend/components/PhewMascot.tsx` centralizes mood, sizing, and non-stretch behavior.
- `frontend/components/PhewGameMoments.tsx` composes `PhewGameFlow`, `PhewGameFrame`, `PhewMotionObject`, and `PhewParticleBurst` for mint, stake, unstake, redeem, proof, community launch, raid, and supporting studio/reward flows. The success modal uses extracted generated pieces, not the static pack sheet.
- `frontend/components/PhewPageHero.tsx` centralizes page hero v2 placement with `heroType`, page-specific generated `visualAsset`, optional `mascotLayer`, and non-overlapping copy/art/status columns.
- `frontend/components/PhewLayouts.tsx` defines `DashboardLayout`, `ProductFlowLayout`, and `DetailLayout` so page density, section stacking, and card rhythm are consistent before route-specific content is added.
- `frontend/components/PhewEmptyState.tsx` centralizes table/list empty-state mascot placement.
- `frontend/components/PhewSuccessMomentModal.tsx` is the post-confirmation game-lobby success scene. Large transaction animation should not be shown inline in normal forms.
- `frontend/components/raids/*` owns the `/raids` command center, Phew-native raid pictograms, N/A states, and backend-gated join/proof behavior.

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
| `/raids` | Commander/flag pose | Commander/flag pose |
| `/admin/setup` | Warning/tools pose | Warning pose |
| `/admin/risk` | Warning/tools pose | Warning pose |
| `/strategy-engine` | Strategy/redeem pose | Redeem/route pose |
| `/studio` | Focused studio pose | Focused/loading pose |

## Future Asset Generation Prompts

For future art updates, generate a complete page/hero/icon/success-flow set together, cache final outputs locally, and keep generated sheets as source/reference rather than UI. Extract reusable transparent pieces and animate them through `PhewGameFlow`.

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
