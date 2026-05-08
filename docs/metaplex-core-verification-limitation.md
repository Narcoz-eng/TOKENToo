# Metaplex Core Verification Limitation

VaultX devnet V1 uses Metaplex Core for backed Vault NFTs.

## Current Verification Model

Before building a redeem transaction, the backend verifies:

- the wallet owns the Core asset
- the Core asset belongs to the expected collection
- the asset address matches the `VaultNFT` record
- the vault position PDA matches the NFT record

Anchor verifies:

- vault position owner
- vault position collection/token mint
- unlock timestamp has passed
- `redeemed=false`
- `staked=false`
- PDA vault token account owner/mint

The backend-built redeem transaction includes:

- Metaplex Core `burnV1`
- Anchor `redeem_vault_nft`

The backend only marks the DB redeemed after confirmation and post-confirm checks prove:

- vault position decodes as `redeemed=true`
- user token balance increased
- vault token balance decreased
- Core asset no longer resolves through RPC

If Core invalidation cannot be verified, the redeem transaction is marked `NEEDS_CORE_VERIFY` and `VaultNFT` is not marked redeemed.

## Limitation

The Anchor program does not yet parse Metaplex Core asset state on-chain. It records the Core asset address as `nft_mint`, but it does not independently verify Core owner or collection inside the program.

The current Metaplex Core adapter also creates assets without a configured royalty plugin. The platform default creator royalty policy is 500 bps, but this build must not claim marketplace royalty expression or enforcement until the selected NFT standard adapter implements it. Token Metadata / pNFT fallback is not implemented.

## Risk

This is acceptable only for devnet proof work because the backend is trusted to build the transaction and perform pre/post checks. A malicious client could attempt to bypass backend checks if the Anchor instruction is exposed directly.

## Required Mainnet Fix

Before public mainnet launch:

- add audited on-chain Core account verification, or
- use a verified plugin/authority model that Anchor can enforce, or
- move redemption authority through a program-controlled NFT custody/burn path
- implement a royalty-capable standard path or a Core royalty plugin path before advertising creator royalty enforcement

Mainnet launch is blocked until this limitation is fixed or formally audited.
