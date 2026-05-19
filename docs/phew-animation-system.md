# Phew Animation System

## Research Notes

The implementation follows current frontend animation guidance: transform/opacity motion, reduced-motion support, optimized WebP assets, and stable dashboard geometry. Useful references: Motion reduced motion (`https://motion.dev/docs/react-use-reduced-motion`), MDN animation performance (`https://developer.mozilla.org/en-US/docs/Web/Performance/CSS_JavaScript_animation_performance`), and web.dev image optimization (`https://web.dev/learn/images/`).

## Components

| Component | Purpose |
| --- | --- |
| `PhewMascot` | Renders a transparent mascot mood with intrinsic ratio. |
| `PhewMascotHero` | Renders the large free hero mascot. |
| `PhewMascotActor` | Actor wrapper with aura for scenes. |
| `PhewGameMoment` | Shared storyboard scene for transaction/action moments. |
| `MintGameMoment` | Token/card to NFT mint sequence. |
| `StakeGameMoment` | NFT card to vault/lock/reward sequence. |
| `UnstakeGameMoment` | Vault opens and NFT exits sequence. |
| `RedeemGameMoment` | NFT verification to token return sequence. |
| `ProofGameMoment` | Scan ring and verification sequence. |
| `CommunityLaunchMoment` | Token scan to reserve/launch sequence. |

## Supported Moods

`idle`, `running`, `success`, `loading`, `warning`, `error`, `mint`, `stake`, `redeem`, `proof`.

## Supported Scene States

`idle`, `wallet-disconnected`, `loading`, `preparing`, `signing`, `submitting`, `confirming`, `success`, `error`.

## Supported Modes

| Mode | Storyboard Structure |
| --- | --- |
| `mint` | Mascot actor, token/NFT card, beam, vault/proof target, progress dots, success burst. |
| `stake` | Mascot actor pushes NFT card into vault, lock target, reward activation. |
| `unstake` | Vault target opens and NFT card exits back to owner. |
| `redeem` | NFT verifies, token stack returns, wallet target, success/error state. |
| `proof` | Mascot actor and NFT card scan toward proof ring/check target. |
| `community` | Token scan, reserve vault creation, launch target. |
| `studio` | Mascot-free/studio object mode where needed by studio bible previews. |

## Motion Rules

- Mascot motion is subtle idle bounce, action lean/run, success hop/glow, warning twitch, or error glitch.
- Scene objects animate with `transform`, `opacity`, and shadow changes only.
- Reduced motion disables continuous animation while preserving state labels, objects, and progress dots.
- The mascot is never stretched, boxed, or cropped in transaction scenes.
- Generic widgets are not used for protocol action scenes; every scene has actor, object, target, beam/orbit/particles, label, and progress dots.

## Route Usage

| Route | Scene |
| --- | --- |
| `/home` | Hero mascot plus dashboard/empty-state mascot. |
| `/mint` | `TransactionFlow` to `PhewGameMoment` with `mint`. |
| `/staking` | `ReferenceTransactionScene` to `PhewGameMoment` with `stake`. |
| `/redeem` | `TransactionFlow` to `PhewGameMoment` with `redeem`. |
| `/vaults/:mint/proof` | `ReferenceTransactionScene` to `PhewGameMoment` with `proof`. |
| `/create-community` | `TransactionFlow` to `PhewGameMoment` with `community`. |

## Data Contract

The animation layer accepts dynamic NFT image and token symbol, but it does not invent backend data. Missing values render `N/A`, disabled state, wallet locked, backend error, or pending labels while preserving the scene geometry.
