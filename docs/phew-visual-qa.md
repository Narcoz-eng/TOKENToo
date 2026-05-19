# Phew Visual QA

## QA Method

1. Capture live route with `tmp/cdp-capture.mjs`.
2. Compare against `frontend/public/design-reference/phew-redesign/`.
3. List mismatches.
4. Patch layout/assets/animation.
5. Repeat until the route is visibly better and not using broken mascot/logo assets.

## Latest Captures

| Route | Capture | Reference | Status |
| --- | --- | --- | --- |
| `/home` | `tmp/phew-visual-qa-success-modal/home.png` | `home.png` | Regression checked |
| `/home` mobile | `tmp/phew-visual-qa-success-modal/home-mobile.png` | `home.png` | Regression checked |
| `/mint` | `tmp/phew-visual-qa-success-modal/mint.png` | `mint.png` | Improved |
| `/staking` | `tmp/phew-visual-qa-success-modal/staking.png` | `staking.png` | Improved |
| `/redeem` | `tmp/phew-visual-qa-success-modal/redeem.png` | `redeem.png` | Improved |
| `/create-community` | `tmp/phew-visual-qa-success-modal/create-community.png` | `create-community.png` | Improved |
| `/vaults/PHEWTESTMINT/proof` | `tmp/phew-visual-qa-success-modal/proof.png` | `proof.png` | Improved |
| `/collections` | `tmp/phew-visual-qa-success-modal/collections.png` | `collections.png` | Improved |
| `/collections/test` | `tmp/phew-visual-qa-success-modal/collection-detail.png` | `collection-detail.png` | Improved |
| `/admin/setup` | `tmp/phew-visual-qa-success-modal/admin-setup.png` | `admin-setup.png` | Improved |
| `/admin/risk` | `tmp/phew-visual-qa-success-modal/admin-risk.png` | `admin-risk.png` | Improved |
| `/studio` | `tmp/phew-visual-qa-success-modal/studio.png` | `create-collection-studio.png` | Improved |
| `/strategy-engine` | `tmp/phew-visual-qa-success-modal/strategy-engine.png` | no direct screenshot | Improved |
| `/raids` | `tmp/visual-review/raids-command-center.png` | no direct screenshot | Implemented |
| `/mint` | `tmp/phew-reconstruction-qa/mint.png` | `mint` JPEG concept | Regression checked |
| `/marketplace` | `tmp/phew-reconstruction-qa/marketplace-pass2.png` | `marketplace` JPEG concept | Reconstructed |
| `/leaderboard` | `tmp/phew-reconstruction-qa/leaderboard-pass2.png` | `leaderboard` JPEG concept | Reconstructed |
| `/profile` | `tmp/phew-reconstruction-qa/profile-pass2.png` | `profile` JPEG concept | Reconstructed |

## Mismatches Found And Fixed

| Area | Mismatch | Fix |
| --- | --- | --- |
| Home hero | Mascot was too small, then partially hidden by the protocol overview panel. | Rebuilt hero lane, moved/scaled free mascot so full body is visible and not boxed. |
| Home empty state | Mascot overlapped the empty-state copy. | Added mascot/object empty-state layouts and reduced the mascot footprint. |
| Mint/create hero | Old floating hero image was cropped behind the transaction scene. | Removed broken overlay and used the generated scene actor through `PhewGameMoment`. |
| Staking header | Metrics stacked vertically and created a huge dead header area. | Made staking metric cards horizontal on desktop. |
| Staking selected vault | Object empty-state layout used mascot-sized columns and squeezed text. | Split `ref-empty-mascot-layout` from `ref-empty-object-layout`. |
| Admin setup/risk headers | Shared header mascot was cropped at the right viewport edge. | Constrained generic header mascot width and left offset. |
| Admin risk token scan | Input-right button overlapped placeholder text. | Split token scan into a compact input and button grid. |
| Transaction scenes | Previous scenes were generic/static and used weak pictograms. | Replaced with generated mascot/object assets, actor/object/target geometry, beam/orbit/particles, labels, and progress dots. |
| Sidebar/core action icons | Generic icon-library symbols dominated core protocol actions. | Replaced core action visuals with generated Phew pictograms. |
| Inline transaction previews | Large animation scenes occupied normal form/layout space before any backend-confirmed success. | Replaced inline scenes with compact status panels and added `PhewSuccessMomentModal` for confirmed success only. |
| Raid route | Old `/raids` reused generic product data cards and did not explain proof/reward/create flows. | Replaced with a dedicated raid command center using backend `/product/raids`, safe N/A fields, Phew-native raid pictograms, proof-state panel, leaderboard, rewards, and disabled creator publish flow. |
| Raid success animation | No raid success moment existed in the shared post-confirmation modal system. | Added `action="raid"` to `PhewSuccessMomentModal` through `PhewGameFlow`; modal only opens after backend-confirmed join success. |
| Generated flow pack | New hero/icon work needed matching success-modal assets instead of isolated images. | Generated `phew-generated-game-flow-pack.png`, extracted reusable transparent pieces, and routed success modal objects through `PhewGameFlow`. |
| Logo source | App identity still pointed at the old SVG favicon/wordmark. | Routed brand identity and metadata icon to `frontend/public/logo.jpeg`. |
| Old storyboard usage | `phew-moment-animations` rendered generic multi-card storyboards and icon-library objects. | Deleted the old component and kept success animation on `PhewGameMoment` / `PhewGameFlow`. |
| Page hero mascot role | Several pages had missing, cropped, or generic hero mascot placement. | Added `PhewPageHero` and route-specific mascot poses for collection, mint, stake, redeem, proof, create-community, admin, strategy, and studio routes. |
| Table/list empty mascot placement | Empty mascots were inconsistent or looked pasted over table bodies. | Added `PhewEmptyState` and routed `ReferenceEmpty` through it with compact table placement. |
| Studio inline status | Studio Bible/layer status cards wrapped into narrow vertical text after animation removal. | Changed those cards to full-width compact status panels inside their sections. |
| Admin hero crop | Admin warning mascot initially broke out too far from the hero. | Constrained admin mascot size through `mascotClassName` so it no longer crops at the top/right edge. |
| Hero v2 grid | Marketplace, leaderboard, and profile titles were squeezed by generated hero art plus side status rail. | Added `heroType` and tightened desktop hero columns so copy, visual asset, and side panel do not overlap. |
| Marketplace UX | Route still read as a generic empty exchange. | Added market stats, value-vs-price rail, list CTA, top communities, recent activity, and listing card financial clarity. |
| Profile UX | Route still read as "My Vaults" only. | Added portfolio metrics, available/staked/owned NFT sections, rewards, achievements, and wallet activity states. |
| Leaderboard UX | Route was a generic empty rank list. | Added ecosystem tabs, season chip, score/reward rail, scoring explanation, top rank, and your-rank N/A state. |

## Remaining Differences

- `/mint`, `/redeem`, and `/create-community` still preserve the existing backend-wired action forms, so their exact panel order differs from the static references. The visual hierarchy now follows the references: compact dark panels, live N/A states, disabled actions, and post-success modal scenes.
- Empty states intentionally do not show fake collection/NFT rows. The reference examples include populated art cards, but production routes render real backend data only.
- `/create-community` still has a tall first-row scan result when all fields are `N/A`; it is no longer stretched by inline animation, but a future masonry-like scan summary could make the first viewport denser.
- `/raids` create publish, join success, API proof verification, and leaderboard reward rows stay disabled/N/A until backend endpoints are implemented.
