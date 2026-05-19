# Phew Visual QA

## QA Method

1. Capture live route with `tmp/cdp-capture.mjs`.
2. Compare against `frontend/public/design-reference/phew-redesign/`.
3. List mismatches.
4. Patch layout/assets/animation.
5. Repeat until the route is visibly better and not using broken mascot/logo assets.

## Latest Captures

### 2026-05-19 New JPEG Reference Pass

The active reference source for routes with newer screens is the WhatsApp JPEG set in `frontend/public/design-reference/phew-redesign/`. The manifest now maps:

- `/home` -> `WhatsApp Image 2026-05-19 at 16.24.17.jpeg`
- `/collections` -> `WhatsApp Image 2026-05-19 at 16.24.07.jpeg`
- `/mint` -> `WhatsApp Image 2026-05-19 at 16.24.24.jpeg`
- `/marketplace` -> `WhatsApp Image 2026-05-19 at 16.24.33.jpeg`
- `/collections/:id` -> `WhatsApp Image 2026-05-19 at 16.25.20.jpeg`
- `/leaderboard` -> `WhatsApp Image 2026-05-19 at 16.32.23.jpeg`
- `/profile` -> `WhatsApp Image 2026-05-19 at 16.34.03.jpeg`
- `/raids` -> `WhatsApp Image 2026-05-19 at 13.43.38.jpeg`

New captures:

| Route | Capture | New Reference | Status |
| --- | --- | --- | --- |
| `/mint` | `tmp/new-ref-qa/mint-pass2.png` | `WhatsApp Image 2026-05-19 at 16.24.24.jpeg` | Rebuilt to match new hero/table/right-rail composition; wallet-disconnected state remains N/A. |
| `/marketplace` | `tmp/new-ref-qa/marketplace-pass2.png` | `WhatsApp Image 2026-05-19 at 16.24.33.jpeg` | Rebuilt to new market hero, overview rail, tabs/filter row, listing grid, and CTA rail. |
| `/profile` | `tmp/new-ref-qa/profile.png` | `WhatsApp Image 2026-05-19 at 16.34.03.jpeg` | Rebuilt to portfolio hero, wallet overview, staked/available shelves, rewards, and achievements. |
| `/collections` | `tmp/new-ref-qa/collections.png` | `WhatsApp Image 2026-05-19 at 16.24.07.jpeg` | Existing reference page remains closest current match. |
| `/staking` | `tmp/new-ref-qa/staking.png` | `staking.png` legacy reference | Existing reference page retained until a new JPEG staking reference is provided. |
| `/redeem` | `tmp/new-ref-qa/redeem.png` | `redeem.png` legacy reference | Rewired to reference layout with proof-first redeem panels and wallet-owned N/A state. |
| `/goal` | `tmp/new-ref-qa/goal-pass2.png` | New route, no JPEG reference yet | Added as product page in the same visual language. Production build confirms route exists. |

### 2026-05-19 Full Reference Refactor Pass

Side-by-side QA sheets were generated in `tmp/ref-match-qa/side-by-side-final/`:

| Route | Side-by-side QA |
| --- | --- |
| `/mint` | `tmp/ref-match-qa/side-by-side-final/mint.png` |
| `/marketplace` | `tmp/ref-match-qa/side-by-side-final/marketplace.png` |
| `/profile` | `tmp/ref-match-qa/side-by-side-final/profile.png` |
| `/redeem` | `tmp/ref-match-qa/side-by-side-final/redeem.png` |
| `/home` | `tmp/ref-match-qa/side-by-side-final/home.png` |
| `/collections` | `tmp/ref-match-qa/side-by-side-final/collections.png` |
| `/staking` | `tmp/ref-match-qa/side-by-side-final/staking.png` |

Fixed in this pass:

- Refactored shell spacing to match the reference gutters and compact topbar rhythm.
- Replaced the green square JPEG logo crop with the black Phew favicon mark used by the reference mood.
- Replaced tiny generated navigation/action thumbnails with crisp Phew-native SVG pictograms.
- Rebuilt `/home`, `/mint`, `/marketplace`, and `/collections` heroes around wide cinematic hero art with dark left-copy gradients and integrated mascot/object layers.
- Reworked `/collections` from the legacy table-first view toward the new reference card-grid discovery composition with overview/right-rail modules.
- Tightened panel borders, radii, shadows, button dimensions, metric cards, and inter-section spacing.
- Downgraded backend-unavailable banners from disruptive red blocks to muted warning strips so empty backend states do not dominate the reference layout.

Remaining visual gaps:

- Current local backend is unavailable, so wallet tokens, marketplace listings, profile NFTs, and collection cards render N/A/empty states instead of the populated example rows in the references.
- Generated hero art is not identical to the photo references: `/marketplace` still lacks the cart composition, `/collections` lacks the exact blue vault scene, and `/profile` lacks the exact city/avatar composition.
- `/staking` and `/redeem` still target the legacy PNG references because no newer WhatsApp photo reference exists for those routes.
- Some typography weight and exact icon glyph shapes differ from the screenshots because the app uses the existing font stack and Phew-native SVG icon set.

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
