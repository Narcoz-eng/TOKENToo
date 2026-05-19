# Phew Page By Page Audit

Audit date: 2026-05-19

## Frontend Route Inventory

Routes discovered under `frontend/app`:

- `/`
- `/admin/risk`
- `/admin/setup`
- `/api/[...path]`
- `/collections`
- `/collections/[id]`
- `/collections/[id]/community`
- `/collections/[id]/raids`
- `/collections/[id]/raids/[raidId]`
- `/create-collection`
- `/create-community`
- `/goal`
- `/home`
- `/instant-sell`
- `/leaderboard`
- `/marketplace`
- `/mint`
- `/my-vaults`
- `/nfts/[id]`
- `/profile`
- `/proof`
- `/raids`
- `/redeem`
- `/staking`
- `/strategy-engine`
- `/studio`
- `/vaults/[mint]/proof`

## Shared Component Inventory

## 2026-05-19 New Reference Alignment Addendum

- Source of truth changed from the restored PNG concepts to the newer WhatsApp JPEG references where available.
- `/mint`, `/marketplace`, `/profile`, and `/redeem` now render through `frontend/components/reference-data-pages.tsx` so they share the same dense shell, hero, right rail, panel density, and Phew-native asset language as the reference screens.
- `/goal` was added as a real product page for the TokenToo/Phew loop: scan wallet, create community, lock tokens, mint vault NFT, stake/redeem/trade, then use raids and leaderboard rewards.
- No populated listing/profile/token rows were invented for disconnected or empty backend states. Those routes intentionally keep N/A and wallet-required states while preserving the reference composition.
- QA captures from this pass live under `tmp/new-ref-qa/`.

## Shared Component Inventory

Components discovered under `frontend/components`:

- `ActionCard.tsx`
- `AnimatedButton.tsx`
- `animations.tsx`
- `ApiState.tsx`
- `AppShell.tsx`
- `AssetImage.tsx`
- `BrandLogo.tsx`
- `CollectionCard.tsx`
- `CollectionGrid.tsx`
- `CollectionPreview.tsx`
- `Leaderboard.tsx`
- `MarketplaceGrid.tsx`
- `NFTCard.tsx`
- `NFTGrid.tsx`
- `PageLayout.tsx`
- `PhewEmptyState.tsx`
- `PhewGameMoments.tsx`
- `PhewMascot.tsx`
- `PhewPageHero.tsx`
- `PhewProtocolIcon.tsx`
- `PhewSuccessMomentModal.tsx`
- `phew-ui.tsx`
- `ProductDataPage.tsx`
- `ProgressBar.tsx`
- `protocol-trust.tsx`
- `RaidCard.tsx`
- `reference-data-pages.tsx`
- `reference-ui.tsx`
- `SectionCard.tsx`
- `Sidebar.tsx`
- `StakingFlows.tsx`
- `StatCard.tsx`
- `StatusPill.tsx`
- `TopBar.tsx`
- `TransactionFlow.tsx`
- `TransactionStatus.tsx`
- `VaultProofExplorer.tsx`
- `WalletButton.tsx`
- `WalletContextProvider.tsx`

Raid components:

- `raids/CreateRaidPanel.tsx`
- `raids/RaidCommandHero.tsx`
- `raids/RaidDetailPanel.tsx`
- `raids/RaidLeaderboard.tsx`
- `raids/RaidMissionChecklist.tsx`
- `raids/RaidPictogram.tsx`
- `raids/RaidProofPanel.tsx`
- `raids/RaidRewardsPanel.tsx`
- `raids/RaidRoomCard.tsx`
- `raids/RaidRoomsPage.tsx`
- `raids/RaidSuccessMoment.tsx`
- `raids/raid-data.ts`
- `raids/raid-types.ts`

## Brand Asset Inventory

`frontend/public/brand`:

- `phew-favicon.svg`
- `phew-mascot-actor.svg`
- `phew-mascot-error.png`
- `phew-mascot-error.svg`
- `phew-mascot-error.webp`
- `phew-mascot-idle.png`
- `phew-mascot-idle.webp`
- `phew-mascot-loading.png`
- `phew-mascot-loading.webp`
- `phew-mascot-mint.png`
- `phew-mascot-mint.webp`
- `phew-mascot-point.svg`
- `phew-mascot-redeem.png`
- `phew-mascot-redeem.webp`
- `phew-mascot-running.png`
- `phew-mascot-running.webp`
- `phew-mascot-stake.png`
- `phew-mascot-stake.webp`
- `phew-mascot-success.png`
- `phew-mascot-success.svg`
- `phew-mascot-success.webp`
- `phew-mascot-warning.png`
- `phew-mascot-warning.webp`
- `phew-mascot.png`
- `phew-run-logo.svg`

`frontend/public/hero`:

- `phew-hero-mascot.png`
- `phew-hero-mascot.webp`
- `phew-launch-hero.svg`
- `phew-mint-hero.svg`
- `phew-motion-core.svg`
- `phew-vault-hero.svg`
- `generated/phew-hero-admin-risk.png`
- `generated/phew-hero-collections.png`
- `generated/phew-hero-create-community.png`
- `generated/phew-hero-home.png`
- `generated/phew-hero-leaderboard.png`
- `generated/phew-hero-marketplace.png`
- `generated/phew-hero-mint.png`
- `generated/phew-hero-proof.png`
- `generated/phew-hero-raids.png`
- `generated/phew-hero-redeem.png`
- `generated/phew-hero-staking.png`
- `generated/phew-hero-studio-strategy.png`

`frontend/public/icons/phew`:

- `energy-beam.svg`
- `error-glitch.svg`
- `native-beam.svg`
- `native-community.svg`
- `native-error.svg`
- `native-lock-tokens.svg`
- `native-mint-nft.svg`
- `native-nft.svg`
- `native-proof.svg`
- `native-raid-flag.svg`
- `native-raid-proof.svg`
- `native-raid-reward.svg`
- `native-raid-room.svg`
- `native-raid-xp.svg`
- `native-redeem.svg`
- `native-reserve.svg`
- `native-reward.svg`
- `native-stake.svg`
- `native-strategy.svg`
- `native-token-stack.svg`
- `native-token.svg`
- `native-vault.svg`
- `pictogram-community.png`
- `pictogram-community.webp`
- `pictogram-lock-tokens.png`
- `pictogram-lock-tokens.webp`
- `pictogram-mint-nft.png`
- `pictogram-mint-nft.webp`
- `pictogram-proof.png`
- `pictogram-proof.webp`
- `pictogram-redeem.png`
- `pictogram-redeem.webp`
- `pictogram-reserve.png`
- `pictogram-reserve.webp`
- `pictogram-stake.png`
- `pictogram-stake.webp`
- `pictogram-strategy.png`
- `pictogram-strategy.webp`
- `proof-ring.svg`
- `redeem-particles.svg`
- `reward-burst.svg`
- `token-object.svg`
- `vault-nft-slot.svg`
- `vault-safe.svg`
- `generated/phew-icon-admin-risk.png`
- `generated/phew-icon-collections.png`
- `generated/phew-icon-community.png`
- `generated/phew-icon-home.png`
- `generated/phew-icon-leaderboard.png`
- `generated/phew-icon-marketplace.png`
- `generated/phew-icon-mint.png`
- `generated/phew-icon-proof.png`
- `generated/phew-icon-raid-proof.png`
- `generated/phew-icon-raid.png`
- `generated/phew-icon-redeem.png`
- `generated/phew-icon-stake.png`
- `generated/phew-icon-strategy.png`
- `generated/phew-icon-studio.png`
- `generated/phew-icon-unstake.png`
- `generated/phew-icon-xp-reward.png`

`frontend/public/animations`:

- `phew-error-glitch.png`
- `phew-error-glitch.webp`
- `phew-launch-object.svg`
- `phew-lock-unlock.png`
- `phew-lock-unlock.webp`
- `phew-mint-object.svg`
- `phew-nft-card.png`
- `phew-nft-card.webp`
- `phew-proof-object.svg`
- `phew-proof-ring.png`
- `phew-proof-ring.webp`
- `phew-redeem-object.svg`
- `phew-reward-burst.png`
- `phew-reward-burst.webp`
- `phew-reward-object.svg`
- `phew-stake-object.svg`
- `phew-token-coin.png`
- `phew-token-coin.webp`
- `phew-token-stack.png`
- `phew-token-stack.webp`
- `phew-vault-safe.png`
- `phew-vault-safe.webp`
- `game-flows/{community,mint,proof,raid,redeem,stake,unstake}/frame-1.png` through `frame-4.png`
- `game-flows/objects/{lock,nft-card,proof-ring,raid-flag,raid-proof,reserve-vault,reward-burst,token,token-stack,unlock,vault,xp}.png`

## Generated Concept Inventory

Actual files under `frontend/public/design-reference/phew-redesign`:

- `manifest.json`
- `WhatsApp Image 2026-05-19 at 13.43.38.jpeg` - Raid Rooms concept
- `WhatsApp Image 2026-05-19 at 16.24.07.jpeg` - Collections concept
- `WhatsApp Image 2026-05-19 at 16.24.17.jpeg` - Home concept
- `WhatsApp Image 2026-05-19 at 16.24.24.jpeg` - Mint concept
- `WhatsApp Image 2026-05-19 at 16.24.33.jpeg` - Marketplace concept
- `WhatsApp Image 2026-05-19 at 16.25.20.jpeg` - Collection detail concept
- `WhatsApp Image 2026-05-19 at 16.32.23.jpeg` - Leaderboard concept
- `WhatsApp Image 2026-05-19 at 16.34.03.jpeg` - Profile concept

Important finding: `manifest.json` still maps stable PNG names such as `home.png`, `marketplace.png`, and `profile.png`, but those PNG files are deleted in the current worktree. The live reference set is the eight JPEG concepts above plus the written extraction docs.

Contact sheets:

- `tmp/phew-page-audit-current/reference-contact.png`
- `tmp/phew-page-audit-current/current-contact.png`

## Current Screenshot Captures

Fresh local screenshots captured from `http://127.0.0.1:3000`:

- `/home` - `tmp/phew-page-audit-current/home.png`
- `/collections` - `tmp/phew-page-audit-current/collections.png`
- `/collections/test` - `tmp/phew-page-audit-current/collections-test.png`
- `/mint` - `tmp/phew-page-audit-current/mint.png`
- `/staking` - `tmp/phew-page-audit-current/staking.png`
- `/redeem` - `tmp/phew-page-audit-current/redeem.png`
- `/vaults/PHEWTESTMINT/proof` - `tmp/phew-page-audit-current/vaults-PHEWTESTMINT-proof.png`
- `/marketplace` - `tmp/phew-page-audit-current/marketplace.png`
- `/raids` - `tmp/phew-page-audit-current/raids.png`
- `/leaderboard` - `tmp/phew-page-audit-current/leaderboard.png`
- `/profile` - `tmp/phew-page-audit-current/profile.png`
- `/create-community` - `tmp/phew-page-audit-current/create-community.png`
- `/studio` - `tmp/phew-page-audit-current/studio.png`
- `/admin/setup` - `tmp/phew-page-audit-current/admin-setup.png`
- `/admin/risk` - `tmp/phew-page-audit-current/admin-risk.png`
- `/strategy-engine` - `tmp/phew-page-audit-current/strategy-engine.png`
- `/create-collection` - `tmp/phew-page-audit-current/create-collection.png`
- `/my-vaults` - `tmp/phew-page-audit-current/my-vaults.png`
- `/instant-sell` - `tmp/phew-page-audit-current/instant-sell.png`
- `/collections/test/raids` - `tmp/phew-page-audit-current/collections-test-raids.png`
- `/collections/test/community` - `tmp/phew-page-audit-current/collections-test-community.png`
- `/collections/test/raids/raid-1` - `tmp/phew-page-audit-current/collections-test-raids-raid-1.png`
- `/nfts/test` - `tmp/phew-page-audit-current/nfts-test.png`

## Mismatch List Before Coding

### Global

- Current app is safe about N/A data, but several product routes use the same generic `ProductDataPage` hero/status template. The reference concepts use route-specific utility scenes, dense side rails, and page-specific market/profile/leaderboard content.
- `manifest.json` points to missing PNG references; docs and code must acknowledge the actual JPEG references or regenerate stable named PNG copies.
- Dynamic App Router routes still read `params.id` synchronously in several pages. Next.js reports runtime errors for `/collections/:id/community`, `/collections/:id/raids`, `/collections/:id/raids/:raidId`, and `/nfts/:id`.
- Sidebar and shell are close to the reference system, but some pages still show repeated generic backend-status panels instead of page-native utility modules.

### `/home`

- Current page is closest to the reference. It has the dense hero, dashboard metrics, and generated hero art.
- Remaining mismatch: empty backend state makes the first viewport less rich than the concept, but no fake values should be inserted. Keep N/A-safe structure.

### `/collections`

- Current page follows the reference shell, filters, metric strip, and no-results empty state.
- Missing when backend is empty: collection card richness cannot appear without real collections. This is acceptable, but the empty state should stay compact and not look like a generic placeholder.

### `/collections/:id`

- Current route uses the reference-style fallback when the collection is unavailable.
- Missing when backend has data: raid leaderboard, active raids, reserve proof, collection NFT grid, and utility actions need to remain visible and not collapse into generic N/A panels.

### `/mint`

- Major mismatch. Current page is collection-first and shows "No mint-eligible launched communities yet" when there are no eligible collections.
- Required reference/product behavior is wallet-token-first: detect connected wallet SPL tokens, show token rows, map each token to existing community or no-community path, show balance/value/community status/action, and then lock amount/mint flow.
- Backend currently exposes specific balance verification during mint, but no public wallet-token discovery endpoint was found.

### `/staking`

- Current page is close to the reference state: wallet-required banner, eligible vault section, staked section, rewards/actions through backend-gated flows.
- Remaining mismatch: ensure production staking blocked state is clear when adapter/capability is missing.

### `/redeem`

- Current page is close to proof-first flow, with wallet-owned vault loading, proof check, build/sign/submit, and success modal gating.
- Remaining mismatch: strengthen locked token/value visibility and double-redeem language in empty and selected states.

### `/vaults/:mint/proof`

- Current page has clear proof panels and N/A-safe values.
- Remaining mismatch: trust details/history/explorer links can be denser and more reference-like.

### `/marketplace`

- Major mismatch. Current page uses a generic route hero and empty marketplace canvas.
- Required reference has market overview, top collections, recent activity, listing cards that show NFT image, collection, locked tokens, backing value, ask price, best offer, reserve health, and list-your-vault CTA.
- `NFTCard` already distinguishes list price and vault backing when NFTs exist; page-level side rails and listing-specific backing/ask presentation need to be upgraded.

### `/raids`

- Current route is one of the stronger pages and has command-center structure, live raid rows, detail/reward/proof/leaderboard modules, and backend-gated success modal.
- Remaining mismatch: keep proof states explicit and avoid any wording implying fake engagement verification.

### `/leaderboard`

- Major mismatch. Current page is a generic empty ranking page, not the concept's ecosystem ranking console.
- Missing tabs/time filters, reward cards, scoring explanation, top builders/communities/raiders/stakers/provers/creators, and "your rank" state.

### `/profile`

- Major mismatch. Current `/profile` is a wallet-required "My Vaults" page, not the concept's wallet/profile dashboard.
- Missing wallet overview, total wallet value, locked value, staked value, available balance, owned NFTs, staked NFTs, available-to-stake actions, rewards, achievements, communities, raid performance, and activity layout.

### `/create-community`

- Current page is close to CA-first scan and backend-gated launch.
- Remaining mismatch: hero/action density is lower than concept and access-gate status should stay visible above the fold.

### `/studio`

- Current page is close to reference: free Studio Bible, trait/catalog/status panels, paid AI is not automatic.
- Remaining mismatch: no fake-ready state; keep provider/cost estimates explicit.

### `/admin/setup`, `/admin/risk`, `/strategy-engine`

- Current pages are N/A-safe and blocker-forward.
- Remaining mismatch: strategy/admin pages share generic hero grammar; keep blockers actionable and fix any route errors/build issues first.

## First Refactor Pass Priorities

1. Fix Next.js async dynamic route param runtime errors.
2. Add backend and frontend wallet-token discovery for `/mint`, with safe adapter-unavailable state instead of fake wallet rows.
3. Refactor `/marketplace`, `/leaderboard`, and `/profile` away from generic `ProductDataPage` layouts into reference-grade page-specific dashboards.
4. Strengthen marketplace listing cards/side rails so backing value and ask price are visually distinct.
5. Preserve success modals as post-confirmation only and compact inline status during transaction work.
6. Refresh docs and rerun visual captures after the first pass.

## 2026-05-19 System Reconstruction Pass

Locked systems before page work:

- Added `DashboardLayout`, `ProductFlowLayout`, and `DetailLayout` primitives in `frontend/components/PhewLayouts.tsx`.
- Upgraded `PhewPageHero` to v2-compatible props: `heroType`, page visual asset, optional `mascotLayer`, and safer desktop grid behavior for pages with hero art plus status rails.
- Kept success animation on `PhewSuccessMomentModal`/`PhewGameFlow`; no inline success panels were added.

Page pass:

- `/mint`: fixed wallet token balance/value formatting so detected token rows typecheck and render N/A safely when price data is unavailable.
- `/marketplace`: rebuilt the route body as a marketplace dashboard with active listings, verified vaults, backing value, price source, filters, list-your-vault CTA, value-vs-price explanation, top communities, recent activity, and empty state without invented listings.
- `/profile`: rebuilt the route body as a wallet portfolio with total value, locked value, staked value, available-to-stake value, available/staked/owned vault sections, rewards, achievements, and activity. Backend `/product/profile` now returns real collections, staking positions, and eligible vaults for owned Vault NFTs.
- `/leaderboard`: rebuilt the route body as an ecosystem ranking console with category tabs, time range, score/vault/XP/proof rows, top reward rail, scoring explanation, and your-rank N/A state.
- Marketplace cards now show tokens locked, backing value, ask price, best offer N/A, and backing ratio distinctly.

QA captures for this pass:

- `/mint` - `tmp/phew-reconstruction-qa/mint.png`
- `/marketplace` - `tmp/phew-reconstruction-qa/marketplace-pass2.png`
- `/leaderboard` - `tmp/phew-reconstruction-qa/leaderboard-pass2.png`
- `/profile` - `tmp/phew-reconstruction-qa/profile-pass2.png`

Mismatches fixed during QA:

- Marketplace, leaderboard, and profile hero titles were squeezed by the large generated art/status rail grid. The hero v2 CSS now reserves stable desktop columns for copy, art, and side status.
- Marketplace hero copy still used generic faction launch language. It now explicitly describes verified listings, backing value, ask price, reserve health, and gated market states.

Remaining differences after first full refactor pass:

- Empty states still dominate routes when the backend has no collections, listings, owned vaults, or leaderboard rows. This is intentional under the no-fake-data rule.
- The profile "Your rank" and marketplace "Best offer" remain N/A until backend endpoints exist.
- Full route-by-route reconstruction should continue with collection detail, proof density, raids detail states, and admin/strategy refinements after this safe committed baseline.
