# VaultX Anchor Program Gap Report

Current file: `programs/vaultx/src/lib.rs`

## Launch Blockers

- `declare_id!("11111111111111111111111111111111")` is still a placeholder and must be replaced before devnet testing.
- `deposit_and_mint_vault_nft` now transfers SPL tokens into PDA custody and creates `VaultPosition` state.
- `deposit_and_mint_vault_nft` records the Metaplex Core asset address, but Core asset creation/collection verification happens in the backend-built transaction.
- `redeem_vault_nft` now validates owner/unlock/not-staked/not-redeemed/collection/token vault state and transfers SPL tokens back from PDA custody.
- `redeem_vault_nft` does not burn or invalidate the Metaplex Core asset by itself. The backend redeem builder adds the Metaplex Core burn instruction and the Anchor redeem instruction to the same wallet-signed transaction for devnet V1.
- `redeem_vault_nft` does not yet parse Metaplex Core collection/owner state on-chain.
- `stake_vault_nft` does not validate holder ownership and does not freeze/escrow/custody the NFT.
- `claim_rewards` does not calculate or transfer staking/raid rewards.

## Required Implementation Checklist

- SPL custody:
  - User source token account and PDA-owned destination token account have been added to `DepositAndMintVaultNft`.
  - Token program CPI transfer from user to PDA vault has been added.
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
  - Transfer tokens into PDA custody atomically with position creation.
  - Mint/verify Vault NFT through the selected Metaplex path in the same client-built transaction.
  - Emit tx data needed by backend indexer.
- Redeem instruction:
  - Validate current NFT owner through Metaplex Core account parsing or plugin authority. Backend currently performs this before transaction build; on-chain parsing remains incomplete.
  - Validate NFT belongs to collection and is not forged through Metaplex Core/Token Metadata. Backend currently performs this before transaction build; on-chain parsing remains incomplete.
  - Validate unlock date, not staked, not redeemed.
  - Burn/invalidate NFT before or atomically with token release.
  - Transfer full amount from PDA vault to redeemer. Implemented for SPL custody.
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

## Current Test Status

- `programs/vaultx/tests/vaultx.ts` now contains executable custody/redeem coverage, but it has not passed in this environment.
- Cargo/Anchor tests could not run in this environment because `cargo` is not installed and the program id remains a placeholder.
- Do not treat the Anchor program as production-ready until these tests pass against localnet and devnet.
