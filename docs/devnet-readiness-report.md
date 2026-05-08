# VaultX Devnet Readiness Report

## Removed Prototype Product Data

- `frontend/lib/mock-data.ts` is no longer imported by core product pages.
- Product pages now read from API endpoints under `/product/*`.
- Pages include loading, empty, error, and wallet-disconnected states through `ProductDataPage` and `ApiState`.
- Remaining mock references are adapter fallbacks only:
  - local Solana transaction adapter mode
  - generator asset provider placeholders
  - final asset storage mock mode

## Auth And Ownership

- Wallet sign-message auth is implemented with `/auth/challenge` and `/auth/login`.
- Mutating endpoints now require a bearer token tied to the signing wallet.
- Ownership checks are enforced for:
  - generator run create/read/regenerate/approve/launch
  - mint intent create/read/submit
  - marketplace listing create
  - instant sell quote persistence
  - raid mission claims
- Global in-memory rate limiting is enabled for API requests.

## Devnet Mint Status

- `VaultMintOrchestrator` now creates idempotent mint transactions and persists generated asset URIs, metadata URIs, transaction plans, status, retries, and errors.
- `SOLANA_TRANSACTION_PROVIDER=devnet` can submit a base64 signed transaction to the configured Solana RPC and confirm it.
- Real unsigned Anchor + Metaplex Core transaction construction now exists for devnet mint transactions:
  - creates owner/vault associated token accounts idempotently
  - invokes `deposit_and_mint_vault_nft`
  - creates a Metaplex Core asset in the launched collection
  - returns base64 unsigned transaction, required signers, blockhash, Core asset address, and vault position PDA
- The Core collection asset must already be confirmed and stored on the launched collection before mint build.
- Mint finalization now performs V1 post-confirmation checks before creating `VaultNFT`:
  - vault position PDA exists
  - vault token account balance is at least the locked amount
  - Core asset owner matches the wallet
  - Core asset collection matches the launched collection
- Redeem submit now requires a post-confirmation check that the Core asset no longer resolves after the burn instruction.
- If Core burn/invalidation cannot be verified, redeem transactions are marked `NEEDS_CORE_VERIFY` and the `VaultNFT` DB record is not marked redeemed.
- Token Metadata fallback remains planned, not implemented.

## Devnet Automation

- `npm --prefix backend run devnet:setup` validates env, RPC, wallet funding, provider settings, storage settings, and program id safety.
- Optional flags:
  - `--create-token`
  - `--mint-test-tokens`
  - `--create-collection-asset`
  - `--print-env`
- `npm --prefix backend run devnet:validate-program` checks that `PROGRAM_ID`, `Anchor.toml`, `declare_id!`, and the deployed devnet account match.

## Final NFT Storage

- Supabase remains suitable for generator previews.
- Final NFT assets can use Pinata pinned IPFS through `FINAL_ASSET_STORAGE_PROVIDER=pinata` and `PINATA_JWT`.
- Production minting is blocked if `FINAL_ASSET_STORAGE_PROVIDER=mock`.
- Irys/Arweave support remains planned.

## Community Fee Router

- Prisma now includes `FeeAllocationPlan` and `CommunityTreasuryBucket`.
- `FeeLedger` tracks gross fee, fixed 1% platform fee, net community amount, preset, routed amounts, and route time.
- V1 guardrails are enforced in `CommunityFeeRouterService`:
  - platform fee exactly 100 bps
  - creator max 2000 bps
  - raid rewards min 1000 bps
  - Meteora liquidity + instant sell pool min 1000 bps
  - safety reserve min 300 bps
  - community route total exactly 10000 bps
- Safe Vault invariant remains: locked backing tokens are never routed. Only generated fee events are routable.

## Generator Quality Review

Ten sample communities were generated:

- frog
- dog
- cat
- robot
- alien
- skull
- wizard
- coin
- luxury
- chaos meme

Result:

- The identity system generates distinct trait language, lore, role names, rarity tiers, and quality/distinctiveness reports.
- Several samples pass Premium or Legendary-ready scoring.
- Production readiness is still blocked because current preview art is deterministic SVG fallback output, not top-tier NFT studio art.
- Brand DNA and visual fingerprint fields are now generated and persisted on style profiles.
- Approval now fails for procedural fallback-only art, Basic quality, failed distinctiveness, failed 10k readiness, and generic trait names.

Hard rule:

- Production minting must remain disabled unless the approved collection is Premium or Legendary-ready and final asset providers are non-mock.

## Anchor Gap

See `docs/anchor-gap-report.md`.

Key blockers:

- `declare_id!`, `Anchor.toml`, and env are aligned to devnet program `8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6`.
- SPL token custody transfer is implemented in `deposit_and_mint_vault_nft`.
- SPL custody release is implemented in `redeem_vault_nft`.
- Metaplex Core burn/invalidation is implemented in the backend-built redeem transaction, not inside Anchor.
- Anchor does not parse/verify Metaplex Core ownership or collection on-chain.
- Anchor tests now contain executable custody/redeem coverage, but have not passed locally because the Rust/Anchor toolchain was not verified here.
- Pause and emergency controls need complete program tests.

## Public Launch Blockers

- Full Anchor test implementation/execution in CI.
- Full devnet E2E execution with funded wallet, SPL token mint, confirmed Core collection asset, Pinata JWT, and deployed program.
- Backend collection asset transaction confirmation flow.
- Production-quality asset provider for mascots, backgrounds, trait packs, and legendary/animated assets.
- Full marketplace execution and fee ledger chain settlement.
- Raid anti-abuse persistence and enforcement at payout time.
- Mainnet-grade monitoring, structured logging, and incident handling.
