# Phew Run Protocol Audit - 2026-05-16

## Scope

Phew Run is being treated as an unfinished prototype, not a trusted production system. The target product is a memecoin operating layer where a token CA creates an isolated community, holders lock that exact token into reserve custody, Vault NFTs represent positions, ownership is checked live on-chain, and redemption returns backing only to the current NFT owner.

## Honest Audit

### What Exists

- Prisma already has core protocol tables: `Collection`, `ReserveVault`, `VaultPosition`, `VaultNFT`, `CommunityCreationAccess`, `VaultStrategy`, `StrategyExecutionJob`, and `StrategyEventLog`.
- The backend already exposes read-side protocol proof routes for health, reserves, collection reserve/vaults, vault proof, redeemability, owner, and history.
- The mint and redeem orchestrators contain important fail-closed checks: token mint mismatch rejection, live wallet token balance verification, live NFT owner verification for redeem, staked NFT redeem blocking, double redeem blocking, and reserve recalculation.
- The Solana adapter has real devnet verification paths for wallet token balances, SOL payment signatures, Metaplex Core asset proof, reserve custody, and vault position PDA proof when `SOLANA_TRANSACTION_PROVIDER=devnet`.
- The Anchor program supports collection profile initialization, deposit/mint, and redeem. Staking/reward transfer handlers are explicitly not complete.
- The Studio pipeline has deterministic/component-style previews and guards that keep AI concepts from being mintable final production assets.

### What Is Wrong Or Missing

- The data model uses `Collection` as the token community object. Separate `TokenCommunity`, `CommunityCreationPayment`, `WhaleGateVerification`, `StudioSubscription`, and `CreatorAccessPass` tables do not exist yet; their behavior is currently folded into `Collection`, `CommunityCreationAccess`, env-based wallet lists, and user records.
- The old public API shape did not include all requested aliases under `/studio`, `/communities`, and `/vaults`.
- `.env.example` still pointed default Studio behavior at Gemini/Imagen, conflicting with the free-by-default requirement.
- Provider selection was too provider-specific. Gemini/Imagen/OpenAI code exists, but the product needs abstraction, explicit paid confirmation, caching, displayed cost, and no paid default.
- Production audit did not check enough protocol honesty rules: mock transaction provider, mock minting, immutable storage, live payment/whale/owner/backing verification, and paid AI gating.
- On-chain staking is not production-ready. Current staking is account/intent-level and the Anchor program intentionally rejects staking/reward custody instructions.
- Final 10k production still depends on approved curated/artist layer packs and immutable storage. AI previews are not final assets.
- Devnet E2E depends on real environment and deployed program state; it should remain a release gate, not a mocked success path.

## Provider Research

No provider is locked. Default Studio previews must remain local/component-rendered and free.

| Provider | Current official pricing signal | Fit for Phew Studio | Risks |
| --- | --- | --- | --- |
| Local deterministic/component renderer | $0 per preview | Best default for Studio Bible, launch readiness, trait catalog, and no fake previews | Visual quality depends on frontend/component polish and approved layer packs |
| OpenAI GPT Image | Official pricing lists GPT Image models including `gpt-image-2`, `gpt-image-1.5`, and `gpt-image-1-mini`; standard image-token output rates are $30, $32, and $8 per 1M tokens respectively | Strong optional premium concept/inspiration path, good prompt following and layout ability | Paid, rate-limited, provider-dependent; must not be used for final 10k generation without explicit policy change |
| Google Gemini/Imagen | Google lists Gemini 3.1 Flash Image Preview at $60 / 1M image output tokens, equivalent to $0.045 per 0.5K image; Imagen 4 Fast/Standard/Ultra are $0.02/$0.04/$0.06 per image | Strong optional concept path, good price point for fast inspiration | API availability, quotas, preview-model changes, and terms need product/legal sign-off before locking |
| Stability AI | Official docs emphasize Stable Image API variants and credit/account limits; pricing is less directly comparable from the public docs found during this audit | Useful optional fallback for stylized concepts | Public pricing/terms and reliability need deeper review before production integration |
| Black Forest Labs / FLUX | Official BFL docs list per-megapixel pricing for FLUX models and hosted endpoints | Serious concept provider candidate for high-quality art direction | Commercial terms, rate limits, and exact API reliability need a separate decision before enabling |

Official sources reviewed:

- OpenAI image generation docs: https://platform.openai.com/docs/guides/image-generation
- OpenAI pricing: https://platform.openai.com/docs/pricing
- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Google Gemini API terms: https://ai.google.dev/gemini-api/terms
- BFL API pricing: https://docs.bfl.ai/quick_start/pricing
- Stability AI API docs: https://platform.stability.ai/docs/api-reference
- Stability AI terms: https://stability.ai/terms-of-service

## Refactor Plan

1. Lock protocol honesty first: chain truth over DB cache, no mock production paths, explicit readiness states, and fail-closed production audit.
2. Keep `Collection` as the current community table for now, then add separate community/payment/whale/subscription/pass models in a migration once API behavior is stable.
3. Finish endpoint compatibility: expose required `/protocol`, `/communities`, `/vaults`, and `/studio` paths while keeping old routes working.
4. Treat Studio as a structured JSON + component renderer pipeline. Paid providers remain optional premium inspiration only.
5. Move staking from local intents to program-backed custody only after Anchor staking/reward instructions are implemented and tested.
6. Make devnet E2E the gate for mint/redeem proof correctness before any mainnet readiness claim.

## Current User Decisions Needed

- Which premium image provider, if any, should be enabled first after a paid-provider review: OpenAI, Google Imagen/Gemini, BFL/FLUX, Stability, or none.
- Whether to add new Prisma tables now for `TokenCommunity`, `CommunityCreationPayment`, `WhaleGateVerification`, `StudioSubscription`, and `CreatorAccessPass`, or keep mapping those concepts onto existing tables for this hardening pass.
- Whether staking should stay local/intent-only until the Anchor program is extended, or whether the next sprint should prioritize on-chain staking custody.
- Which immutable storage provider should be production default: Pinata/IPFS, Arweave/Irys, or another storage adapter.
