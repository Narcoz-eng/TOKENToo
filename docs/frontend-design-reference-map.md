# Frontend Design Reference Map

Generated reference images are saved under `frontend/public/design-reference/`. They are visual source material only and are not rendered as static page UI.

## Reference Inventory

| Reference path | Page/component using it | Copied design details | Intentional differences |
| --- | --- | --- | --- |
| `frontend/public/design-reference/concept.png` | Global Phew brand direction | Black/neon green palette, mascot-forward identity, dense protocol dashboard tone | Final UI uses live components and backend state instead of concept metrics |
| `frontend/public/design-reference/phew-redesign/home.png` | `/home`, `HomeDashboardView`, `Sidebar`, `TopBar` | Sidebar grouping, hero hierarchy, mascot placement, protocol overview card, N/A-first metrics, bottom launch CTA | Trending/market/vault data is only shown when returned by backend |
| `frontend/public/design-reference/phew-redesign/create-community.png` | `/create-community` | Token scanner flow, launch gate cards, right-column proof/readiness panels, backend-first action sequencing | TVL simulation is raw-token only unless backend scan returns market context |
| `frontend/public/design-reference/phew-redesign/create-collection-studio.png` | `/create-collection`, `StudioBibleAnimation` | Studio/provider readiness language and explicit generation controls | Existing Studio workflow remains backend/API driven; no auto-generation on render |
| `frontend/public/design-reference/phew-redesign/mint.png` | `/mint`, `TransactionFlow` | Configure/build/sign/confirm hierarchy, selected-community panel, trust badges, animation preview stage | Mint actions stay disabled or pending until real backend routes return intent/build/submit state |
| `frontend/public/design-reference/phew-redesign/proof.png` | `/proof`, `/vaults/:mint/proof`, `VaultProofExplorer`, `TransactionFlow` | Proof search layout, proof data/checklist cards, verification animation stage, locked action panel tone | Proof status is derived from `/vaults/:mint/proof`; no fabricated proof rows |
| `frontend/public/design-reference/phew-redesign/staking.png` | `/staking`, `StakeFlow`, `UnstakeFlow`, `ClaimRewardsFlow`, `TransactionFlow` | Eligible wallet NFT list, transaction side panel, wallet-owned staking UX | Staking/unstaking success appears only after backend routes return success |
| `frontend/public/design-reference/phew-redesign/redeem.png` | `/redeem`, `TransactionFlow` | Redeem-by-eligible-wallet-NFT model, proof-first checks, right-column redeem status | Redeem list filters only real wallet-owned NFTs with backend `Redeemable` status |
| `frontend/public/design-reference/phew-redesign/collection-detail.png` | `/collections/:id`, `CollectionDetailView` | Collection hero with mascot/branding, reserve stats, vault list, activity feed, proof/risk side panels | Proof links are vault-specific; collection-level proof is not invented when no vault exists |
| `frontend/public/design-reference/phew-redesign/collections.png` | `/collections`, `CollectionCard` | Collection cards with risk/reserve badges and compact protocol metadata | Card metrics display N/A/empty states when backend data is missing |
| `frontend/public/design-reference/phew-redesign/marketplace.png` | `/marketplace`, `NFTCard`, `MarketplaceGrid` | Vault card density, backing ratio panel, trust badges, black/neon card treatment | Purchase flow uses existing marketplace intent route only |
| `frontend/public/design-reference/phew-redesign/profile.png` | `/profile` | Wallet vault dashboard tone and owned-vault card structure | Profile data is wallet/backend gated; no placeholder owned vaults |
| `frontend/public/design-reference/phew-redesign/admin-setup.png` | `/admin/setup` | Actionable setup grid, provider status, storage readiness, production blockers, no auto-generation warning | Admin actions remain read-only because no new backend setup routes were added |
| `frontend/public/design-reference/phew-redesign/admin-risk.png` | `/admin/risk` | Risk dashboard card density and status language | Existing risk rows are shown only from `/product/admin/risk` |
| `frontend/public/design-reference/phew-redesign/animations-stake.png` | `TransactionFlow`, `StakeFlow`, `UnstakeFlow` | Mascot-left/NFT-slot/object-right storyboard, beam/orbit motion, status dots, reduced-motion fallback | Implemented with CSS and live props, not the storyboard PNG |
| `frontend/public/design-reference/phew-redesign/animations-redeem.png` | `TransactionFlow`, `/redeem`, `VaultProofExplorer` | Redeem/proof stage language, dynamic NFT slot, loading/success/error states | State transitions follow real transaction/proof status, not timed fake success |
| `frontend/public/design-reference/phew-redesign/manifest.json` | Documentation/source map | Route-to-reference mapping for approved generated references | Manifest is documentation only; code imports no reference screenshots |

## Implementation Rules Preserved

- Reference PNGs are not rendered as page screenshots.
- `TransactionFlow` recreates storyboard motion in CSS with a dynamic NFT image slot and injected token symbol.
- Reduced-motion users receive static state transitions through CSS media queries.
- Paid AI/image calls are not triggered by these frontend pages.
- Backend values remain authoritative; missing values render as `N/A`, empty states, or locked actions.
