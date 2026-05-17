# Phew Concept Layout Extraction

Source references: `frontend/public/design-reference/phew-redesign/`

These concepts are UX truth, not static screenshot assets. The frontend should extract the product system: dense dashboard layout, compact shell, mascot-led transaction scenes, backend-powered values, explicit disabled states, and clear loading/success/error treatment.

## Global System

| System area | Extracted rule | Component owner | Backend routes |
| --- | --- | --- | --- |
| Shell | Persistent 224px desktop sidebar, compact sticky topbar, app workspace constrained to dashboard width, mobile topbar fallback. | `PhewShell`, `PhewSidebar`, `PhewTopbar`, `PhewWorkspace` | None |
| Data rendering | Missing backend fields render `N/A`, locked controls, or empty states. No fake market, vault, proof, owner, reward, or readiness data. | All pages, `PhewStatusPanel`, `PhewEmptyState` | Page-specific `GET /product/*`, `GET /protocol/*`, `GET /system/*` |
| Transaction scenes | Every protocol action has idle, wallet disconnected, preparing, signing, submitting, confirming, success, and error states. Mascot acts beside the NFT/token object and target vault/proof ring. | `PhewTransactionScene`, `PhewMascotActor`, `PhewNftSlot`, `PhewProofRing` | Action-specific `POST` routes |
| Visual assets | Use Phew black/neon-green/white protocol assets. Key visuals must communicate utility: lock, mint, stake, redeem, proof, launch. | `brandAssets`, SVG assets under `frontend/public/brand`, `frontend/public/icons/phew`, `frontend/public/hero`, `frontend/public/animations` | None |
| Motion | Orbit, beam, scan, lock, burst, warning/glitch. `prefers-reduced-motion` falls back to static stage changes. | `TransactionFlow`, `PhewAnimationFrame`, CSS motion classes | None |
| Errors | Error panels use red warning/glitch styling, show structured API diagnostics when available, and keep actions disabled until prerequisites are restored. | `PhewErrorState`, `ErrorState` | All API routes |

## Concept Extraction Matrix

| Concept | Page/component represented | Layout pattern | State/action/moment | Reusable components | Required data | Backend routes | Empty/loading/error behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `home.png` | `/home` protocol dashboard | Hero and protocol overview share the first viewport; metrics adjacent to mascot actor; below that: metric strip, trending, market snapshot, recent mints, my vaults, launch CTA. | Normal dashboard with N/A-safe values; mascot runs as guide beside protocol stats. | `PhewWorkspace`, `PhewStatusPanel`, `PhewActionCard`, `PhewMascotActor`, `PhewEmptyState` | Protocol stats, collections, market snapshot, recent mints, wallet vaults. | `GET /product/home`, `GET /protocol/health` | Loading keeps dashboard skeleton/N/A; empty trending/market/mints use mascot-backed empty panels; API error uses red panel and retry. |
| `create-community.png` | `/create-community` launch flow | Dense six-part workflow: CA scanner, scan animation, token result, access gates, build/sign/submit, reserve proof, verification, activity. | User scans token, passes gate, builds launch, signs, submits, then reviews reserve proof. | `PhewStepPanel`, `PhewTransactionScene`, `PhewStatusPanel`, `PhewProofRing`, `PhewActionCard` | Token metadata, access gate status, draft community, unsigned launch tx, launch status, reserve proof. | `GET /tokens/:mint/scan`, `POST /communities/from-token`, `POST /communities/:id/access/payment`, `POST /communities/:id/access/verify-whale`, `POST /communities/:id/launch/build`, `POST /communities/:id/launch/submit`, `GET /communities/:id/launch/status`, `GET /collections/:id/reserve` | Wallet disconnected locks creation/signing; scan shows loading ring; failed scan/gate/launch shows red warning; reserve proof remains N/A until draft/launch exists. |
| `mint.png` | `/mint` vault NFT mint console | Four-step console with selected community side panel, transaction checks, proof details, lock amount controls, mint moment scene, and next-step cards. | Configure amount/duration, create intent, build tx, sign/submit, confirm, show proof link. | `PhewStepper`, `PhewTransactionScene`, `PhewNftSlot`, `PhewStatusPanel`, `PhewTrustPanel` | Mint-eligible launched collections, wallet address, lock amount, token balance if returned, unsigned tx, confirmation, NFT mint/proof URL. | `GET /product/collections`, `POST /vaults/mint/intent`, `POST /vaults/mint/build`, `POST /vaults/mint/submit`, `GET /vaults/:mint/proof` | Wallet disconnected card locks actions; no eligible collections shows create-community CTA; build/sign disabled until prior state; error stage blocks success. |
| `staking.png` | `/staking` staking dashboard | First viewport shows wallet-required banner, metrics, eligible NFT rail, selected vault panel; lower panels show active positions, rewards, system status, animation preview. | Select wallet-owned eligible Vault NFT, stake; unstake active position; claim rewards when available. | `PhewStepPanel`, `PhewTransactionScene`, `PhewNftSlot`, `PhewStatusPanel`, `PhewEmptyState` | Eligible wallet NFTs, active staking positions, claimable rewards, staking readiness/adapter state. | `GET /product/staking?wallet=...`, `POST /vaults/:mint/stake`, `POST /vaults/:mint/unstake`, `POST /staking/claim-rewards/intents`, `GET /system/capabilities` | Wallet disconnected is first-class; no eligible NFTs shows no fake positions; production adapter/no-adapter responses surface as blocked/error states. |
| `redeem.png` | `/redeem` redeem console | Proof-first grid: vault mint/preview, proof lookup, redeemability checklist, position details, build tx, sign/submit, redeem moment side panel. | Select wallet-owned redeemable NFT, check proof, build redeem, sign, submit, invalidate NFT, return tokens. | `PhewStepPanel`, `PhewTransactionScene`, `PhewProofRing`, `PhewNftSlot`, `PhewErrorState` | Wallet redeemable NFTs, proof, redeemability gates, unsigned redeem tx, tx status, signature/proof link. | `GET /product/profile?wallet=...`, `GET /vaults/:mint/proof`, `POST /vaults/:mint/redeem/build`, `POST /vaults/:mint/redeem/submit` | Proof must pass before build; already redeemed/staked/non-owner rows are excluded or blocked; double redeem is disabled by proof/status. |
| `proof.png` | `/proof`, `/vaults/:mint/proof` | Search/load bar, proof verification scene, proof data table, checklist, issues, actions. | Enter NFT mint or routed mint, fetch proof, show live/cached verification, reveal redeem/stake links only when valid. | `PhewProofRing`, `PhewTransactionScene`, `PhewTrustPanel`, `PhewStatusPanel`, `PhewEmptyState` | Owner, token mint, locked amount, reserve PDA, position PDA, live/cached verification, redeemability, stake status, issues. | `GET /vaults/:mint/proof`, `GET /vaults/:mint/redeemability`, `GET /vaults/:mint/owner`, `GET /vaults/:mint/history` | Idle is searchable; loading scans; success shows green proof ring; error shows red proof ring and issue list. |
| `animations-stake.png` | Stake/unstake transaction storyboard | Six keyframes: initiated, transferring, validating, locking, confirmed, rewards active; mobile and reduced-motion variants. | Mascot points/runs, NFT card travels into vault, proof/validation ring appears, lock lands, success check lands. | `PhewTransactionScene`, `PhewMascotActor`, `PhewNftSlot`, `PhewProofRing` | NFT art slot, token symbol, owner/collection/reserve/status rows. | `POST /vaults/:mint/stake`, `POST /vaults/:mint/unstake` | Loading cyan/green beam; success green check; error red card and retry; reduced motion fades between key states. |
| `animations-redeem.png` | Redeem transaction storyboard | Six panels: redeem eligible, proof check, unlocking, burning/invalidating NFT, tokens returned, confirmed. | NFT enters proof checks, vault opens, NFT invalidates into particles, token chip returns to wallet, success lands. | `PhewTransactionScene`, `PhewProofRing`, `PhewNftSlot`, `PhewErrorState` | NFT art, token symbol, proof rails, wallet target, status. | `GET /vaults/:mint/proof`, `POST /vaults/:mint/redeem/build`, `POST /vaults/:mint/redeem/submit` | Error has red warning/glitch; success requires backend confirmation; reduced motion uses simple sequence. |
| `admin-setup.png` | `/admin/setup` operations dashboard | Dense read-only setup grid with capabilities strip, provider status, Solana/storage/staking status, blockers, validate actions. | Admin reviews system readiness; no generation or paid provider action happens on render. | `PhewStatusPanel`, `PhewTrustPanel`, `PhewActionCard`, `PhewTransactionScene` | Provider status, Solana status, storage status, staking adapter status, production blockers, warnings. | `GET /system/capabilities`, `GET /system/image-providers`, `GET /system/health`, `GET /system/ready` | Missing readiness is N/A/blocker, not fake ready; errors use red system panel; loading uses setup scan scene. |
| `admin-risk.png` | `/admin/risk` protocol risk dashboard | Warning hero, compact risk metric strip, dense table, risk scan side panel, data source and verification panels. | Admin scans risk and verifies reserves; public-safe mode exposes only backend-verified data. | `PhewStatusPanel`, `PhewTrustPanel`, `PhewEmptyState` | Collection risk rows, scan notes, reserve/proof verification, risk controls. | `GET /product/admin/risk`, `GET /protocol/health`, `GET /protocol/reserves` | No scan data shows empty risk panel; manual overrides stay disabled without backend support. |
| `collections.png` | `/collections` directory | Table/dense card directory with filters, search, status counts, launch/reserve/mint gates, empty mascot search state. | User filters collections and opens collection detail/create flow. | `PhewStatusPanel`, `PhewCollectionCard`, `PhewEmptyState` | Collections, launch status, token mint, reserve health, gates, TVL/floor/holders when available. | `GET /product/collections` | No rows displays clear empty state and no fake collection list. |
| `collection-detail.png` | `/collections/:id` | Compact collection hero with art, reserve health, launch status, action side rail, tabs, vault table, proof/activity panels. | User reviews collection proof, mints when eligible, opens marketplace/staking/redeem routes. | `PhewTrustPanel`, `PhewActionCard`, `PhewTransactionScene`, `PhewNftSlot` | Collection, vault NFTs, reserve proof, activity, raids, market rows. | `GET /product/collections/:id`, `GET /collections/:id/reserve`, `GET /collections/:id/vaults` | Mint/stake/redeem disabled until backend eligibility; no collection-level fake proof. |
| `marketplace.png` | `/marketplace` | Marketplace hero, overview stats, filter toolbar, empty listing canvas, listing/purchase/instant-sell side rail. | User views listings, listing actions, purchase intent, instant sell quote when backend supports it. | `PhewActionCard`, `PhewEmptyState`, `PhewTrustPanel` | Listings, vault NFTs, marketplace stats, purchase route status, instant-sell liquidity. | `GET /product/marketplace`, marketplace action routes | No listings canvas with create/explore CTA; purchase/sell disabled without selected real vault/liquidity. |
| `profile.png` | `/profile` wallet dashboard | Wallet-first profile, connect card in first viewport, vault/redeemable/staking/activity/proof panels, account actions. | Wallet connects to load vaults, staking, rewards, and proof shortcuts. | `PhewStatusPanel`, `PhewEmptyState`, `PhewActionCard` | Wallet address, owned vaults, staking positions, redeemable vaults, proof summary, activity. | `GET /product/profile?wallet=...` | Wallet disconnected is primary state; no fake owned vaults or actions. |
| `create-collection-studio.png` | `/create-collection` Studio workflow | Five-step Studio workflow with token scan, brand kit, style bible, layer pack, launch readiness; provider cost/status side panel. | Subscription/admin studio runs explicit user-triggered provider steps only. | `PhewStepper`, `PhewTransactionScene`, `PhewStatusPanel`, `PhewActionCard` | Token scan, provider status, style bible, layer pack, launch readiness, approvals. | Existing Studio/product routes | Provider disabled blocks generation; no auto-generation on render. |

## Page State Contracts

All transaction pages normalize action state to:

| UI state | Meaning | Visual behavior |
| --- | --- | --- |
| `idle` | Inputs visible, prerequisites not yet running. | Mascot ready, token/NFT object at origin, neutral badge. |
| `wallet-disconnected` | Wallet-specific data or signing is required. | Locked action card, N/A rows, wallet CTA. |
| `preparing` | Backend validation, scan, proof lookup, or transaction build is running. | Scan ring/orbit, cyan loading badge, controls disabled. |
| `signing` | Wallet signature prompt is pending. | Mascot points to wallet/transaction, transfer beam active. |
| `submitting` | Signed payload is sent to backend/Solana. | Object moves through beam toward vault/proof target. |
| `confirming` | Backend accepted submission and is awaiting final status. | Proof/validation ring active, status rows show pending. |
| `success` | Backend confirmed action completion. | Green check/ring lands, proof link or next action appears. |
| `error` | Backend, wallet, or validation failed. | Red warning/glitch, failure detail, retry/repair action. |

## Backend Route Ownership

- `/home`: `GET /product/home`, `GET /protocol/health`.
- `/create-community`: `GET /tokens/:mint/scan`, `POST /communities/from-token`, `POST /communities/:id/access/payment`, `POST /communities/:id/access/verify-whale`, `POST /communities/:id/launch/build`, `POST /communities/:id/launch/submit`, `GET /communities/:id/launch/status`, `GET /collections/:id/reserve`.
- `/mint`: `GET /product/collections`, `POST /vaults/mint/intent`, `POST /vaults/mint/build`, `POST /vaults/mint/submit`, proof link via `GET /vaults/:mint/proof`.
- `/staking`: `GET /product/staking?wallet=...`, `POST /vaults/:mint/stake`, `POST /vaults/:mint/unstake`, `POST /staking/claim-rewards/intents`, `GET /system/capabilities`.
- `/redeem`: `GET /product/profile?wallet=...`, `GET /vaults/:mint/proof`, `POST /vaults/:mint/redeem/build`, `POST /vaults/:mint/redeem/submit`.
- `/proof`: `GET /vaults/:mint/proof`, optional detail routes `GET /vaults/:mint/redeemability`, `GET /vaults/:mint/owner`, `GET /vaults/:mint/history`.
- `/admin/setup`: `GET /system/capabilities`, `GET /system/image-providers`, `GET /system/health`, `GET /system/ready`.

## Asset Requirements

The functional frontend uses generated local assets rather than reference screenshots:

| Asset | Path | Utility |
| --- | --- | --- |
| Mascot actor | `frontend/public/brand/phew-mascot-actor.svg` | Transparent running/pointing guide used in heroes and transaction scenes. |
| Protocol hero | `frontend/public/hero/phew-vault-hero.svg` | Dashboard background showing vault energy and mascot motion language. |
| Launch hero | `frontend/public/hero/phew-launch-hero.svg` | Token CA to community vault launch background. |
| Mint hero | `frontend/public/hero/phew-mint-hero.svg` | Lock tokens to Vault NFT background. |
| Motion core | `frontend/public/hero/phew-motion-core.svg` | Shared energy grid for loading/hero surfaces. |
| Token object | `frontend/public/icons/phew/token-object.svg` | Token chip for mint/redeem flows. |
| Vault NFT slot | `frontend/public/icons/phew/vault-nft-slot.svg` | NFT placeholder that is not generic Lucide-only UI. |
| Vault safe | `frontend/public/icons/phew/vault-safe.svg` | Stake/redeem target object. |
| Proof ring | `frontend/public/icons/phew/proof-ring.svg` | Verification ring and proof target. |
| Redeem particles | `frontend/public/icons/phew/redeem-particles.svg` | Burn/invalidate visual for redeem. |
| Transaction scenes | `frontend/public/animations/phew-mint-object.svg`, `phew-stake-object.svg`, `phew-redeem-object.svg`, `phew-proof-object.svg`, `phew-launch-object.svg` | Static SVG objects used inside CSS motion scenes. |

## QA Checklist

- References are not imported as page UI.
- Wallet disconnected, loading, success, and error states are visually distinct for create-community, mint, staking, redeem, and proof.
- Transaction actions never show success unless backend state confirms success.
- No fake data is rendered in empty markets, vaults, reserves, proofs, staking, profile, or admin readiness.
- Mascot usage is actor/guide in transaction and dashboard moments, not a square logo.
- Reduced-motion fallback disables looping animations and preserves state labels.
- Mobile keeps controls visible before decorative scenes where possible.
