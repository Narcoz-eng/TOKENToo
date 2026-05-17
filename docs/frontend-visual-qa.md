# Frontend Visual QA

Use this checklist when changing the Phew redesign implementation.

## QA Pass Log

### 2026-05-17 `/home` reset pass

Reference: `frontend/public/design-reference/phew-redesign/home.png`.

Observed mismatch before fix:

- Home hero behaved like a giant empty banner instead of a compact dashboard grid.
- `phew-vault-hero.svg` was used as an `object-cover` background, which cropped and distorted the mascot area.
- Stats were pushed below an oversized hero and used generic icon cards.
- Protocol feature/workflow tiles used generic icon language instead of Phew-native objects.

Fix applied:

- Rebuilt `/home` first viewport as title/CTA, mascot actor, and protocol overview grid.
- Constrained mascot sizing with transparent SVG actor and `object-contain`.
- Replaced home trust chips, stats, feature tiles, workflow tiles, proof link, and launch CTA visuals with Phew SVG assets.
- Kept backend data contracts unchanged: `/product/home` and `/protocol/health` remain the only data sources for the page.

Verification to run for this pass:

- Passed: `npm --workspace frontend run typecheck`.
- Passed: `npm --workspace frontend run build`.
- Passed: `npm run build`.
- Captured: `tmp/visual-qa-current/home-reset-desktop.png`.
- Captured: `tmp/visual-qa-current/home-reset-mobile.png`.
- Passed: CDP page check reported no framework overlay and expected home headings.

### 2026-05-17 transaction icon pass

Reference intent: core protocol actions must use Phew-native visual objects instead of generic icon-library symbols.

Fix applied:

- Replaced `TransactionFlow` state badge icons with Phew SVG assets.
- Replaced `TransactionStatus` status badge icons with Phew SVG assets.
- Replaced `AnimatedButton` generic loader with Phew asset spin/CSS scan ring.
- Replaced mint, redeem, create-community, and staking core action/check icons with Phew proof, token, vault, beam, reward, glitch, and redeem assets.

Verification to run for this pass:

- Passed: `npm --workspace frontend run typecheck`.
- Passed: `npm --workspace frontend run build`.
- Passed: `npm run build`.
- Captured: `tmp/visual-qa-current/mint-native-icons.png`.
- Captured: `tmp/visual-qa-current/redeem-native-icons.png`.
- Captured: `tmp/visual-qa-current/create-community-native-icons.png`.
- Captured: `tmp/visual-qa-current/staking-native-icons.png`.
- Passed: CDP page checks reported no framework overlay on `/mint`, `/redeem`, `/create-community`, and `/staking`.

### 2026-05-17 metric card pass

Fix applied:

- Added Phew asset support to `StatCard`.
- Replaced generic product metric icons for marketplace, staking, leaderboard, and collection summary cards with local Phew assets.

Verification to run for this pass:

- Passed: `npm --workspace frontend run typecheck`.
- Passed: `npm --workspace frontend run build`.
- Passed: `npm run build`.
- Captured: `tmp/visual-qa-current/staking-metric-assets.png`.
- Captured: `tmp/visual-qa-current/marketplace-metric-assets.png`.
- Captured: `tmp/visual-qa-current/leaderboard-metric-assets.png`.
- Passed: CDP page checks reported no framework overlay on `/staking`, `/marketplace`, and `/leaderboard`.

### 2026-05-17 trust badge pass

Fix applied:

- Replaced `ProtocolTrustStrip`, `ProtocolTrustInline`, and `TrustBadge` generic badge icons with local Phew proof, vault, beam, and glitch assets.
- Preserved trust semantics: verified/pending, reserve health, live/cached, and last verified remain backend-derived or `N/A`.

Verification to run for this pass:

- Passed: `npm --workspace frontend run typecheck`.
- Passed: `npm --workspace frontend run build`.
- Passed: `npm run build`.
- Captured: `tmp/visual-qa-current/collections-trust-assets.png`.
- Captured: `tmp/visual-qa-current/mint-trust-assets.png`.
- Captured: `tmp/visual-qa-current/redeem-trust-assets.png`.
- Captured: `tmp/visual-qa-current/proof-trust-assets.png`.
- Passed: CDP page checks reported no framework overlay on `/collections`, `/mint`, `/redeem`, and `/proof`.

### 2026-05-17 proof and state cleanup pass

Fix applied:

- Replaced proof page search, external-link, warning, lock, and verification checklist icons with local Phew assets.
- Replaced shared API/wallet/error/retry/capability state icons with Phew assets.

Verification to run for this pass:

- Passed: `npm --workspace frontend run typecheck`.
- Passed: `npm --workspace frontend run build`.
- Passed: `npm run build`.
- Captured: `tmp/visual-qa-current/proof-state-cleanup.png`.
- Captured: `tmp/visual-qa-current/staking-state-cleanup.png`.
- Captured: `tmp/visual-qa-current/admin-setup-state-cleanup.png`.
- Captured: `tmp/visual-qa-current/redeem-state-cleanup.png`.
- Passed: CDP page checks reported no framework overlay on `/proof`, `/staking`, `/admin/setup`, and `/redeem`.

## Mascot And Assets

- [ ] `frontend/public/brand/phew-mascot.png` exists.
- [ ] Mascot has a transparent background.
- [ ] Mascot contains no square logo container.
- [ ] Mascot contains no wordmark or text.
- [ ] Animation/storytelling panels use `brandAssets.mascot`, not the legacy square logo.

## Transaction And Motion

- [ ] `TransactionFlow` matches the storyboard structure: mascot left, NFT/vault card center, action object right.
- [ ] Mint, stake, unstake, redeem, proof, community-launch, and studio-bible modes render readable titles and state badges.
- [ ] Loading states show beam/orbit motion.
- [ ] Success states require backend-confirmed status/outcome.
- [ ] Error states stay visibly blocked and do not run success animation.
- [ ] NFT image slot accepts a real injected NFT image.
- [ ] Token symbol is injected and visible.
- [ ] `prefers-reduced-motion: reduce` removes looping animation.

## Page Reference Checks

- [ ] `/home` matches `home.png` for shell, hero hierarchy, mascot overview card, metrics, and CTA band.
- [ ] `/create-community` matches `create-community.png` for scanner, access gates, launch flow, and reserve readiness panels.
- [ ] `/create-collection` matches `create-collection-studio.png` for Studio workflow, generation controls, and Studio Bible motion.
- [ ] `/mint` matches `mint.png` and uses the mint storyboard without static screenshots.
- [ ] `/staking` matches `staking.png` and uses the stake/unstake storyboard.
- [ ] `/redeem` matches `redeem.png` and uses the redeem storyboard.
- [ ] `/proof` and `/vaults/:mint/proof` match `proof.png` and use proof verification staging.
- [ ] `/collections` matches `collections.png` for filtering, card density, risk/trust badges, and empty states.
- [ ] `/collections/:id` matches `collection-detail.png` for hero, reserve, vault list, proof, and activity panels.
- [ ] `/admin/setup` matches `admin-setup.png` for readiness, provider status, and setup checklist.
- [ ] `/admin/risk` matches `admin-risk.png` for dense risk dashboard treatment.

## Data And Behavior

- [ ] No reference screenshot is rendered as UI.
- [ ] No fake market, vault, owner, proof, or reward values are invented.
- [ ] Missing backend values render as `N/A`, disabled actions, or empty states.
- [ ] Create community, access gates, launch, mint, proof, stake, unstake, and redeem remain wired to backend routes.
- [ ] Marketplace purchase cards do not mark success without backend-confirmed outcome.
- [ ] Raid cards do not mark success without backend-confirmed outcome.
- [ ] Reward claims do not mark success for skipped/no-adapter backend responses.

## Responsive And Accessibility

- [ ] Desktop shell uses the compact 224px sidebar and 64px topbar.
- [ ] Mobile keeps a visible Phew brand entry in the topbar.
- [ ] Text does not overflow buttons, badges, cards, or side panels.
- [ ] Interactive controls are real buttons/links/inputs.
- [ ] Decorative images use empty alt text.
- [ ] Browser smoke checks cover desktop and narrow viewport.

## Required Verification

- [ ] `npm --workspace frontend run typecheck`
- [ ] `npm --workspace frontend run build`
- [ ] `npm --workspace backend run typecheck`
- [ ] `npm --workspace backend run build`
- [ ] `npm run build`
