# Frontend Visual QA

Use this checklist when changing the Phew redesign implementation.

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
