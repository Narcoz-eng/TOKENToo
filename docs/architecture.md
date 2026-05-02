# VaultX Architecture

## Product Model

Each SPL token maps to exactly one `CollectionProfile` and one community identity. The collection owns isolated vault, fee, raid, staking, marketplace, and trait state. There is no global liquidity pool across unrelated tokens.

## NFT Policy

Backed Vault NFTs are standard NFTs because they represent a redeemable claim on real SPL token custody. Compressed NFTs are reserved for non-custodial scale items: badges, raid rewards, XP roles, cosmetic upgrade passes, and future achievement receipts.

## Vault Flow

1. Creator creates a collection after passing the eligibility gate.
2. User deposits SPL tokens into the collection PDA token vault.
3. Program creates a `VaultPosition` and mints a project-specific Vault NFT.
4. NFT remains tradable. The buyer inherits the unlock date and redeemability state.
5. After unlock, holder redeems the full position. V1 has no partial redeem.
6. Program burns or marks the NFT redeemed before releasing tokens.

## Risk and Instant Sell

Instant sell is collection-scoped and disabled unless the token passes risk gates:

- token age >= 48 hours
- liquidity above configured threshold
- risk score >= 60
- active organic volume
- no emergency flag

Discounts are derived from risk score and never pull from a cross-token shared pool.

## Fee Split

- 35% raid rewards
- 35% buyback/vault backing
- 15% protocol treasury
- 10% creator/community founder
- 5% safety reserve

The backend records every fee movement in `FeeLedger`, while the program keeps the on-chain fee vault isolated by collection.

