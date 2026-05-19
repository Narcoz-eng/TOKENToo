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
| `/home` | `tmp/phew-visual-qa-pass6/home.png` | `home.png` | Improved |
| `/mint` | `tmp/phew-visual-qa-pass6/mint.png` | `mint.png` | Improved |
| `/staking` | `tmp/phew-visual-qa-pass7/staking.png` | `staking.png` | Improved |
| `/redeem` | `tmp/phew-visual-qa-pass6/redeem.png` | `redeem.png` | Improved |
| `/create-community` | `tmp/phew-visual-qa-pass6/create-community.png` | `create-community.png` | Improved |
| `/vaults/PHEWTESTMINT/proof` | `tmp/phew-visual-qa-pass6/proof.png` | `proof.png` | Improved |
| `/collections` | `tmp/phew-visual-qa-pass7/collections.png` | `collections.png` | Improved |
| `/admin/setup` | `tmp/phew-visual-qa-pass8/admin-setup.png` | `admin-setup.png` | Improved |
| `/admin/risk` | `tmp/phew-visual-qa-pass9/admin-risk.png` | `admin-risk.png` | Improved |
| `/studio` | `tmp/phew-visual-qa-pass7/studio.png` | `create-collection-studio.png` | Improved |
| `/strategy-engine` | `tmp/phew-visual-qa-pass7/strategy-engine.png` | no direct screenshot | Improved |

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

## Remaining Differences

- `/mint`, `/redeem`, and `/create-community` still preserve the existing backend-wired action forms, so their exact panel order differs from the static references. The visual hierarchy now follows the references: compact dark panels, live N/A states, disabled actions, and storyboard transaction scenes.
- Empty states intentionally do not show fake collection/NFT rows. The reference examples include populated art cards, but production routes render real backend data only.
- Further polish can tighten create-community and redeem into even denser numbered-panel grids, but current captures no longer show distorted, boxed, cropped, or generic mascot assets.
