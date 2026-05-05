# VaultX Anchor Program Gap Report

Current file: `programs/vaultx/src/lib.rs`

## Launch Blockers

- `declare_id!("11111111111111111111111111111111")` is still a placeholder and must be replaced before devnet testing.
- `deposit_and_mint_vault_nft` creates `VaultPosition` state but does not transfer SPL tokens into custody.
- `deposit_and_mint_vault_nft` does not mint or verify a Metaplex Core/Token Metadata NFT.
- `redeem_vault_nft` marks the position redeemed before the token release TODOs are implemented.
- `redeem_vault_nft` does not validate NFT ownership, collection membership, or verified creator/update authority.
- `redeem_vault_nft` does not burn the NFT or permanently mark metadata redeemed before releasing tokens.
- `redeem_vault_nft` does not transfer SPL tokens from the PDA vault to the redeemer.
- `stake_vault_nft` does not validate holder ownership and does not freeze/escrow/custody the NFT.
- `claim_rewards` does not calculate or transfer staking/raid rewards.

## Required Implementation Checklist

- SPL custody:
  - Add user source token account and PDA-owned destination token account to `DepositAndMintVaultNft`.
  - Add token program CPI transfer from user to PDA vault.
  - Validate source account owner, mint, amount, and token decimals.
- PDA vault authority:
  - Keep `token_vault_authority` PDA seed tied to `CollectionProfile`.
  - Use signer seeds for all outbound custody transfers.
- Token vault account:
  - Add actual SPL token account/ATA owned by PDA authority.
  - Enforce one isolated token vault per collection/token mint.
- Vault position:
  - Keep position PDA deterministic.
  - Add explicit lock/unlock validation and immutable amount/duration.
- Deposit instruction:
  - Validate collection active state.
  - Transfer tokens first or make state changes atomic with transfer.
  - Mint/verify Vault NFT through the selected Metaplex path.
  - Emit tx data needed by backend indexer.
- Redeem instruction:
  - Validate current NFT owner.
  - Validate NFT belongs to collection and is not forged.
  - Validate unlock date, not staked, not redeemed.
  - Burn/invalidate NFT before token release.
  - Transfer full amount from PDA vault to redeemer.
  - No partial redeem in V1.
- Staking:
  - Validate NFT owner.
  - Decide and implement custody model: freeze, escrow, or program record only.
  - Prevent redeem while staked.
- Pause/kill switch:
  - Keep platform pause and collection pause.
  - Add tests proving paused/risk-disabled collections reject deposit, redeem-sensitive paths, and instant-sell flows as intended.
- Tests:
  - Deposit success.
  - Wrong token mint rejected.
  - Ineligible creator rejected.
  - Redeem before unlock rejected.
  - Wrong NFT/collection rejected.
  - Double redeem rejected.
  - Staked redeem rejected.
  - Pause/risk disable rejected.
  - PDA custody balance changes exactly match locked/redeemed amounts.
