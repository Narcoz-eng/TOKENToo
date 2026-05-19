# Phew Success Moment Modal

## Component

`frontend/components/PhewSuccessMomentModal.tsx`

The success modal is the only large game-lobby transaction scene surface. Forms and dashboards stay functional and compact; backend-confirmed success opens a skippable celebration modal.

## Supported Actions

| Action | Scene |
| --- | --- |
| `community-launch` | token CA to reserve/collection initialized |
| `mint` | token to beam to Vault NFT |
| `stake` | NFT to vault closes to rewards active |
| `unstake` | vault opens and NFT exits |
| `redeem` | NFT verifies/invalidates and tokens return |
| `proof` | scan ring verifies proof |
| `raid` | mission joined, proof submitted, XP/reward burst, raid success |
| `layer-pack` | layer approval burst |
| `studio-bible` | studio completion burst |

## Trigger Contract

The modal must be rendered only after backend-confirmed success:

- `mint`: `/vaults/mint/submit` returns `CONFIRMED` or confirmed UI transaction status.
- `redeem`: redeem submit returns `CONFIRMED`.
- `stake` / `unstake`: `assertBackendActionCompleted` accepts the backend action result.
- `proof`: proof endpoint returns proof with zero issues.
- `community-launch`: launch submit or launch status returns confirmed.
- `raid`: join or mission proof endpoint returns confirmed/approved participation.
- `studio-bible` and `layer-pack`: component support exists, but current `/studio` UI does not fake completion without a real completion event.

## Behavior

- Uses a React portal so the modal escapes clipped panels and table overflow.
- Provides `role="dialog"`, `aria-modal="true"`, a visible title, Escape close, backdrop close, Skip, and Continue.
- Optional transaction and proof links are shown only when real values are available.
- `autoCloseMs` is supported but not required by current pages.
- Reduced-motion users receive a static settled scene through the global `prefers-reduced-motion` CSS fallback.

## Research Notes

- OpenAI image generation supports transparent output formats and cost estimation is token/pricing based; no paid image calls were made for this pass.
- React portals are appropriate for modals that must escape parent overflow.
- WAI-ARIA modal dialogs need a dialog container, `aria-modal`, and an accessible label/title.
- Motion guidance recommends respecting reduced motion and replacing large transform motion with calmer opacity/state changes where needed.
- web.dev image guidance favors correctly sized optimized images; local UI assets remain WebP-first with transparent PNG siblings as source/fallback material.

Sources: OpenAI Images docs (`https://developers.openai.com/api/docs/guides/image-generation`), React `createPortal` (`https://react.dev/reference/react-dom/createPortal`), WAI-ARIA modal pattern (`https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/`), Motion accessibility (`https://motion.dev/docs/react-accessibility`), web.dev image performance (`https://web.dev/learn/performance/image-performance`).
