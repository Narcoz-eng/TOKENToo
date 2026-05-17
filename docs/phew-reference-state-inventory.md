# Phew Reference State Inventory

Source of truth: `frontend/public/design-reference/phew-redesign/`

This inventory is the implementation contract for the frontend rebuild. Existing code that conflicts with these references should be replaced. The PNG files are concept references only; the live UI must be coded with React, CSS, SVG, and live backend data.

## Extracted Layout System

- App shell: fixed dark left sidebar on desktop, top search/network/wallet bar across content, full-height black protocol workspace, max content width around 1536px.
- Density: operational dashboard density, not marketing. Cards are compact, 8px radius or less, dense rows, narrow gutters, clear status chips, no oversized empty panels.
- Visual rhythm: black/near-black background, thin cyan or lime borders, low-opacity panel gradients, lime active states, cyan processing states, yellow warning states, red error states.
- Sidebar: boxed logo mark is allowed only here and as favicon/small identity. Main navigation uses compact icon plus text rows and a lime filled active row. Secondary groups are labeled `ANALYTICS` and `RESOURCES`.
- Topbar: search field left, network selector, notification icon, wallet button right. Keep topbar height compact and consistent across pages.
- Panels: top page panels are full-width dashboard regions, not nested cards. Repeated items can be cards. Tables use dense row separators and N/A cells for missing backend data.
- Mascot: use transparent SVG actor only. The mascot must be a free character, never inside a square/icon container in page scenes or animation centers. It can float outside panels, overlap cards, or act beside scene objects. Preserve aspect ratio with `object-contain`; never stretch, crop, or use the green-background PNG in scenes.
- Asset decision: `frontend/public/brand/phew-mascot.png` has a green background and is not approved for scene use. Use `phew-mascot-actor.svg`, `phew-mascot-point.svg`, `phew-mascot-success.svg`, and `phew-mascot-error.svg` as the clean temporary transparent mascot set.
- Data rule: show backend values where available. Unknown values render as `N/A`, `Unknown`, `Pending`, or a disabled action. Do not insert fake protocol metrics.
- State rule: every page needs wallet-disconnected, loading, empty, error, success, backend-unavailable, and N/A real-data states where applicable. State should be shown in the same panel geometry as the normal state, not as unrelated generic placeholders.
- Buttons: primary lime filled for next action, outline lime or cyan for secondary action, disabled dark gray with lock icon. Use icons inside controls and status rows.
- Tables: collections, risk, activity, logs, proofs, and vault positions are table-first when the reference is table-first. Empty states appear inside the table area with dashed border and a small scene object or free mascot.

## Transaction Scene System

Each transaction scene must include:

- Mascot actor: free character, usually left side or moving from left toward the target.
- NFT/token object: center or left-center card/chip using local SVG/CSS asset slots.
- Target object: vault, proof ring, safe, wallet, launch object, or layer object on the right or center-right.
- Energy: beam, orbit, scan rail, or particles based on the storyboard.
- State label: idle, loading, submitted, confirmed/success, error.
- Progress dots: visible per transaction sequence.
- Success/error: success uses lime check/ring/reward burst; error uses red border/glitch/cross and keeps the mascot unboxed.

Supported modes:

- `mint`: card and token lock into vault, based on `mint.png` and the stake storyboard structure.
- `stake`: six-step storyboard from `animations-stake.png`.
- `unstake`: no explicit reference exists; use the stake storyboard grammar in reverse only where required by staking flow, preserving actor/card/vault/progress geometry.
- `redeem`: six-step storyboard from `animations-redeem.png`.
- `proof`: proof ring and checklist scene from `proof.png`.
- `community launch`: scan card and launch/check flow from `create-community.png`.
- `studio bible`: studio bible/layer pack preview geometry from `create-collection-studio.png`.

## State Classification

- Normal state: `home.png`, `collections.png`, `collection-detail.png`, `admin-setup.png`, `admin-risk.png`, `create-collection-studio.png`, plus all action pages at idle.
- Empty state: collections no-results panel, marketplace no-listings panel, staking no eligible vaults/no positions, profile no vaults/activity, proof no issues, admin activity/log empty panels.
- Wallet disconnected: `create-community.png`, `mint.png`, `staking.png`, `profile.png`, `redeem.png` show disconnected or disabled wallet states.
- Loading: animation slots and storyboards show cyan loading, rotating scan rings, and progress dots. Use same layout while awaiting API.
- Error: storyboard red states in `animations-stake.png` and `animations-redeem.png`; proof page error state tiles; backend request errors render in-page red panels.
- Success: storyboard lime success frames, proof success tile, transaction status confirmed rows.
- Backend unavailable: same as error but with N/A data retained and a retry/refresh action where references show refresh or scan controls.
- N/A real-data: all dashboards use N/A values when backend data is missing. Preserve table/card structure instead of substituting demo values.

## Reference Inventory

### `frontend/public/design-reference/phew-redesign/home.png`

- Page/component: `/home`, protocol dashboard.
- State: normal dashboard with backend-pending N/A data.
- Layout structure: sidebar plus topbar; top hero split into text/CTA left, free mascot center-right, protocol overview stat grid right. Below are stat strip, trending communities, market snapshot chart, how-it-works strip, recent mints, my vaults, and bottom launch CTA.
- Mascot position/scale: large free actor in hero center-right, standing on lime ring, not boxed; smaller free actor in bottom CTA.
- Cards/panels: dense overview cards, horizontal metric strip, collection cards, chart panel, compact list panels.
- Buttons: `Explore Collections`, `Create Community`, `Explore Marketplace`, bottom `Create Community`.
- Animation objects: mascot aura/ring, spark lines, tiny trend lines, how-it-works lock/card/trade/redeem icons.
- Expected behavior: render live protocol data when available; otherwise N/A without fake metrics. Homepage must read as an approved protocol dashboard.

### `frontend/public/design-reference/phew-redesign/create-community.png`

- Page/component: `/create-community`.
- State: wallet disconnected plus idle launch workflow.
- Layout structure: header with title, subtitle, free mascot breaking top hero area, wallet status panel. Main grid has numbered panels: token scanner, scan animation preview, token scan result, access gate requirements, build/sign/submit, reserve proof, launch verification, and recent activity table.
- Mascot position/scale: free mascot in upper hero band, medium-large, overlaps glow behind the header. No boxed mascot.
- Cards/panels: numbered workflow panels, right data columns, bottom activity table.
- Buttons: search icon in token input, `Scan Token`, `Check`, disabled build/sign/submit, `Verify`, disabled launch.
- Animation objects: scan preview uses token symbol card centered in orbit/scan ring with scanning labels.
- Expected behavior: backend-first flow. All actions remain disabled until prerequisites pass. No fake success states.

### `frontend/public/design-reference/phew-redesign/create-collection-studio.png`

- Page/component: `/studio` and `/create-collection` if present.
- State: normal idle studio workbench with subscription active but backend N/A data.
- Layout structure: sidebar/topbar; page title row with docs/tutorial/settings actions. Left vertical workflow rail, main token scan panel, right estimate/provider panel, middle studio bible and layer pack panels, bottom launch readiness strip.
- Mascot position/scale: only boxed logo in sidebar; no main free mascot except if used in a future studio-bible scene as actor. Current reference uses scene objects, not a boxed mascot.
- Cards/panels: token scan, estimate, provider approval, cache status, bible preview, layer pack preview, readiness checklist.
- Buttons: `Scan Token`, `Generate Studio Bible`, `Open Layer Pack Manager`, `Launch Collection` disabled, `Export Studio Package`.
- Animation objects: NFT art slot in cyan orbit for studio bible, layer pack card in lime orbit for layer pack.
- Expected behavior: never auto-generate. Paid provider approval remains explicit. N/A for missing estimate/cache/provider data.

### `frontend/public/design-reference/phew-redesign/mint.png`

- Page/component: `/mint`.
- State: wallet disconnected and idle mint console.
- Layout structure: breadcrumb/title row, horizontal four-step progress bar, left configuration stack, center mint animation/next steps, right selected-community/checks/proof/help column, bottom why-mint strip.
- Mascot position/scale: small free mascot only in help card; animation center uses NFT art slot and token symbol, not mascot-in-box.
- Cards/panels: selected community selector, mint configuration, requirements, mint moment, next steps, selected community, transaction checks, proof details.
- Buttons: community select, duration segmented buttons, disabled create/build/sign/submit, mint guide/doc buttons.
- Animation objects: centered NFT art slot card with token chip, orbit rings, status toggles idle/loading/success/error.
- Expected behavior: connect wallet to view eligible communities; maintain N/A/disabled states until backend eligibility exists.

### `frontend/public/design-reference/phew-redesign/staking.png`

- Page/component: `/staking`.
- State: wallet disconnected, empty eligible vault list, idle staking dashboard.
- Layout structure: title row with three stat cards; wallet-required banner; eligible vault NFT carousel/grid; selected vault panel; active positions table; rewards and guide column; activity table; system status and animation preview panels; bottom status legend.
- Mascot position/scale: small free mascot in staking guide lower area, not boxed.
- Cards/panels: top stat cards, wallet banner, vault slot cards, active positions, rewards, guide, activity, system status, animation previews.
- Buttons: connect wallet, explore vaults, stake vault, claim rewards disabled, preview states.
- Animation objects: stake, unstake, reward claim preview slots using NFT card/token/vault/reward objects.
- Expected behavior: show empty-state copy when no eligible vaults, real positions when backend returns them, no demo positions.

### `frontend/public/design-reference/phew-redesign/redeem.png`

- Page/component: `/redeem`.
- State: idle proof-first redeem flow with wallet disconnected/disabled actions.
- Layout structure: title, docs button, top redeem flow stepper, left proof lookup and vault preview, center redeemability checklist and locked position details, right build/sign/status panels, far-right animation/help rail, bottom important notes.
- Mascot position/scale: small free mascot in help panel only; animation storyboard success frame may use free mascot near success ring.
- Cards/panels: numbered proof lookup, checklist, details, build transaction, sign/submit, transaction status, animation preview, help, notes.
- Buttons: scan, lookup proof, build redeem transaction disabled, sign/submit disabled, guide/Discord buttons.
- Animation objects: redeem moment uses NFT art slot, proof checks, vault/safe unlock, token symbol movement, wallet object, success/error rings.
- Expected behavior: proof lookup required before build. Backend verifies all gates; no automatic retry.

### `frontend/public/design-reference/phew-redesign/proof.png`

- Page/component: `/vaults/:mint/proof`.
- State: proof pending with N/A real data.
- Layout structure: title and actions; NFT mint search/load bar; proof verification panel left, proof data middle, verification checklist right; bottom proof check details table, issues panel, actions panel; footer status strip.
- Mascot position/scale: no main mascot in proof reference; proof visual uses NFT card and rings.
- Cards/panels: proof verification, animation state mini tiles, proof data rows, checklist, check details, issues, actions.
- Buttons: open explorer, proof docs, search, raw proof JSON, view logs, redeem/stake locked.
- Animation objects: proof card in lime orbit, state tiles for idle/loading/success/error.
- Expected behavior: poll or refresh proof state; lock actions until all checks pass.

### `frontend/public/design-reference/phew-redesign/collections.png`

- Page/component: `/collections`.
- State: normal table with N/A data plus no-results empty state.
- Layout structure: title and create button; search/filter/sort/view controls; status metric strip; dense collection table; dashed no-results area; pagination.
- Mascot position/scale: free mascot in empty-state panel, medium, with magnifier and glow, not inside a square.
- Cards/panels: metric strip and table row panels.
- Buttons: create collection, filters, sort, grid/list toggles, clear filters, pagination.
- Animation objects: empty-state mascot and collection avatar art.
- Expected behavior: table uses real backend collections only; filters can result in empty panel without demo data.

### `frontend/public/design-reference/phew-redesign/collection-detail.png`

- Page/component: `/collections/:id`.
- State: normal collection detail with N/A data.
- Layout structure: hero detail row with collection image and identity, reserve health card, launch status card; tab nav; overview grid; reserve proof; vault NFTs table; right action rail with collection actions, mint moment animation, activity.
- Mascot position/scale: no scene mascot; collection image is collection art, not mascot unless collection art itself is mascot themed.
- Cards/panels: reserve health, launch status, overview, about, reserve proof, proof animation, vault table, action rail.
- Buttons: change art, share, more, view reserve proof, action buttons disabled, table pagination.
- Animation objects: mint moment slot with NFT card and orbit.
- Expected behavior: keep launch-gated actions locked until backend verification passes.

### `frontend/public/design-reference/phew-redesign/marketplace.png`

- Page/component: `/marketplace` if retained.
- State: normal/empty marketplace with no listings.
- Layout structure: hero title with free mascot, overview stat panel, tab/filter area, large no-listings panel, marketplace info strip, fees/proof/risk/recent-sales panels, right actions rail, bottom safety strip.
- Mascot position/scale: large free mascot in hero center-right, not boxed.
- Cards/panels: overview stat grid, no listings dashed area, side rails, bottom metrics.
- Buttons: explore collections, list vault disabled, purchase disabled, sell disabled, docs/risk/stats links.
- Animation objects: empty box/magnifier, mascot aura.
- Expected behavior: no static listings. Active listings must come from backend.

### `frontend/public/design-reference/phew-redesign/profile.png`

- Page/component: `/profile` if retained.
- State: wallet disconnected profile dashboard.
- Layout structure: hero with title, free mascot, connect wallet card, profile overview; wallet, owned vaults, staking positions, redeemable vaults, proofs, activity feed, account actions, bottom connect CTA.
- Mascot position/scale: large free mascot in hero, bottom CTA free mascot, neither boxed.
- Cards/panels: wallet details, empty vault panels, proofs list, activity feed, account actions.
- Buttons: connect wallet, view all, view proof rows, account action arrows.
- Animation objects: wallet icon, cube empty state, gift, lightning, bottom mascot.
- Expected behavior: all personal data locked behind wallet; no fake wallet/profile content.

### `frontend/public/design-reference/phew-redesign/admin-setup.png`

- Page/component: `/admin/setup`.
- State: setup incomplete, disabled capabilities, backend N/A data.
- Layout structure: title row with free mascot and setup warning; capability strip; setup progress and validate all; ten numbered operational panels; bottom safety/help strip.
- Mascot position/scale: medium free mascot in top hero band, overlapping glow, not boxed.
- Cards/panels: provider table, provider checklist, cache/storage, backend health, Solana integration, studio provider, layer pack, AI fallback, environment diagnostics, readiness, setup actions, activity log.
- Buttons: configure, clear, review, run health check, validate all, save disabled, reset danger disabled.
- Animation objects: no main transaction scene; uses icon chips and status rows.
- Expected behavior: no auto generation. User-facing actions disabled until setup validation passes.

### `frontend/public/design-reference/phew-redesign/admin-risk.png`

- Page/component: `/admin/risk`.
- State: public-safe risk dashboard with backend N/A data.
- Layout structure: title row with free mascot and risk warning; risk metric strip; large collection risk table; right token scan/risk summary/recent scans rail; bottom backend/proof/controls panels and risk footer.
- Mascot position/scale: medium free mascot top center, small free mascot in bottom help area.
- Cards/panels: metric strip, risk table, token scan, breakdown, summary, recent scans, data sources, verification, engine controls.
- Buttons: manual refresh, scan token, view rows, run full scan, verify, toggle controls, guide links.
- Animation objects: risk icons, no storyboard animation.
- Expected behavior: public-safe only; no sensitive data; no manual overrides in public-safe mode.

### `frontend/public/design-reference/phew-redesign/animations-stake.png`

- Page/component: stake animation storyboard.
- State: loading, success, error, reduced motion, mobile preview.
- Layout structure: six panels plus status language, error example, reduced-motion fallback, mobile preview, footer trust strip.
- Mascot position/scale: free actor on left of each scene, large enough to read facial expression and pose. Never boxed.
- Cards/panels: storyboard panels with telemetry cards and progress dots.
- Buttons: status chips only; no primary actions.
- Animation objects: NFT art slot, token symbol, vault/lock, validation cube/check network, reward stars, progress dots, beams, particles.
- Expected behavior: coded animation must follow sequence: stake initiated, transferring, validating, locking, stake confirmed, rewards activated.

### `frontend/public/design-reference/phew-redesign/animations-redeem.png`

- Page/component: redeem animation storyboard.
- State: loading, success, error, reduced motion, mobile preview.
- Layout structure: six panels plus reusable parts, mobile preview, reduced-motion fallback, footer trust/help strip.
- Mascot position/scale: free mascot appears in success/error confirmation areas, not boxed.
- Cards/panels: each stage splits loading/success/error sub-states in compact columns.
- Buttons: status chips and help link only.
- Animation objects: NFT card, token chip, orbit ring, scan rail, vault/safe, wallet, burn particles, check/cross rings.
- Expected behavior: coded animation must follow sequence: redeem eligible, proof check, unlocking, burning/invalidating NFT, tokens returned, redeem confirmed.

## Routes Without Direct Reference Images

- `/strategy-engine`: no file in `phew-redesign` maps directly to this route. Implement it using the admin/risk dashboard layout grammar: dense title, metric strip, rule/control tables, backend N/A states, public-safe controls, and no invented hero.
- `/vaults/:mint/proof`: mapped by `proof.png`.
- `/studio`: mapped by `create-collection-studio.png`.

