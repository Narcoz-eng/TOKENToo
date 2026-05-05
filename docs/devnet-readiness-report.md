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
- Real unsigned Anchor + Metaplex Core transaction construction is still not complete.
- Metaplex Core collection asset creation and Vault NFT Core asset creation are still blockers.

## Final NFT Storage

- Supabase remains suitable for generator previews.
- Final NFT assets can use Pinata pinned IPFS through `FINAL_ASSET_STORAGE_PROVIDER=pinata` and `PINATA_JWT`.
- Production minting is blocked if `FINAL_ASSET_STORAGE_PROVIDER=mock`.
- Irys/Arweave support remains planned.

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

Hard rule:

- Production minting must remain disabled unless the approved collection is Premium or Legendary-ready and final asset providers are non-mock.

## Anchor Gap

See `docs/anchor-gap-report.md`.

Key blockers:

- SPL token custody transfer is not implemented.
- PDA vault token authority is not fully enforced.
- Vault position state is not fully validated.
- NFT ownership and collection validation are not complete.
- Redeem burn/mark-redeemed then release flow is not implemented.
- Pause and emergency controls need complete program tests.

## Public Launch Blockers

- Real Anchor deposit/redeem program implementation.
- Real Metaplex Core unsigned transaction builder.
- Real collection asset creation and verification.
- Production-quality asset provider for mascots, backgrounds, trait packs, and legendary/animated assets.
- Full marketplace execution and fee ledger chain settlement.
- Raid anti-abuse persistence and enforcement at payout time.
- Mainnet-grade monitoring, structured logging, and incident handling.
