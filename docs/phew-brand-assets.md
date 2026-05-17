# Phew Brand Assets

This file tracks local assets used to rebuild the frontend from the approved Phew references. Reference screenshots are extraction sources only; production UI must be React, CSS, SVG, and backend data.

## Asset Rules

- Core action visuals use files under `frontend/public/brand/`, `frontend/public/icons/phew/`, and `frontend/public/animations/`.
- Do not render `frontend/public/design-reference/phew-redesign/*` as app UI.
- Do not stretch mascot assets. Use `object-contain`, preserve intrinsic ratio, and keep mascot in a bounded actor stage.
- Do not use generated bitmap references as static panels. Extract layout, motion, and object language into components.
- Missing backend values render as `N/A`, disabled controls, or explicit empty states.

## Current Asset Inventory

| Asset | Path | Use |
| --- | --- | --- |
| Mascot actor | `frontend/public/brand/phew-mascot-actor.svg` | Home hero actor and default transaction mascot |
| Mascot point pose | `frontend/public/brand/phew-mascot-point.svg` | Guide/signing pose |
| Mascot success pose | `frontend/public/brand/phew-mascot-success.svg` | Confirmed transaction state |
| Mascot error pose | `frontend/public/brand/phew-mascot-error.svg` | Failed transaction state |
| Token object | `frontend/public/icons/phew/token-object.svg` | Token chip, mint/redeem CTAs, stats |
| Vault safe | `frontend/public/icons/phew/vault-safe.svg` | Staking and reserve target |
| NFT slot | `frontend/public/icons/phew/vault-nft-slot.svg` | Vault NFT slot, collection CTA, empty vault |
| Proof ring | `frontend/public/icons/phew/proof-ring.svg` | Verification/proof state and proof links |
| Energy beam | `frontend/public/icons/phew/energy-beam.svg` | Submitting/transfer visual and activity metric |
| Reward burst | `frontend/public/icons/phew/reward-burst.svg` | Rewards and wallet activity metric |
| Error glitch | `frontend/public/icons/phew/error-glitch.svg` | Error state object |
| Redeem particles | `frontend/public/icons/phew/redeem-particles.svg` | Redeem/burn stage |
| Mint object | `frontend/public/animations/phew-mint-object.svg` | Mint transaction object |
| Stake object | `frontend/public/animations/phew-stake-object.svg` | Stake/unstake transaction object |
| Redeem object | `frontend/public/animations/phew-redeem-object.svg` | Redeem transaction object |
| Proof object | `frontend/public/animations/phew-proof-object.svg` | Proof transaction object |
| Launch object | `frontend/public/animations/phew-launch-object.svg` | Community launch/studio object |
| Reward object | `frontend/public/animations/phew-reward-object.svg` | Claim/reward object |

## 2026-05-17 Home Pass

- `/home` stopped using `phew-vault-hero.svg` as a full hero background because `object-cover` cropped the mascot and created an oversized empty banner.
- The home mascot now comes from `brandAssets.mascot` only, inside `phew-home-mascot-stage`.
- Home trust chips, metrics, overview tiles, protocol feature tiles, workflow tiles, proof link, and launch CTA now use local Phew SVG assets instead of Lucide action icons.
- No paid image generation was used in this pass. Existing approved references were sufficient for the home reset.

## 2026-05-17 Transaction Icon Pass

- `TransactionFlow` state badges now use Phew proof, vault, token, beam, reward, and glitch assets instead of Lucide icons.
- `TransactionStatus` status badges now use Phew proof, beam, reward, and glitch assets.
- `AnimatedButton` loading state now uses the provided Phew asset or a CSS scan ring, not a generic loader icon.
- Staking, mint, redeem, and create-community core transaction buttons/checks now use Phew-native assets for proof, lock, redeem, submit, refresh, success, and transaction-link visuals.

## 2026-05-17 Metric Card Pass

- `StatCard` supports `iconAsset` for Phew-native metric visuals.
- Product data metric cards on marketplace, staking, leaderboard, and collection summaries now use Phew NFT slot, vault, proof, beam, reward, glitch, and token assets.

## Remaining Asset Gaps

- A formal Image 2 reference set is still needed for additional mascot poses, admin empty/error states, and route-specific transaction keyframes if the approved local references are not enough.
- Any paid generation must be configured and approved before use.
