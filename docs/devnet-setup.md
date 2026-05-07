# VaultX Devnet Setup

This guide prepares a real VaultX devnet proof:

`create collection -> confirm Core collection asset -> mint Vault NFT -> redeem -> reject double redeem`

## 1. Install Local Tools

Install Node 20+ and npm:

```powershell
node --version
npm --version
```

Install Rust and Cargo:

```powershell
winget install Rustlang.Rustup
rustup default stable
cargo --version
```

Install Solana CLI:

```powershell
winget install Solana.SolanaCLI
solana --version
```

Install Anchor CLI:

```powershell
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
anchor --version
```

## 2. Create Or Load Devnet Wallet

Create a deploy/test wallet:

```powershell
solana-keygen new --outfile .\devnet-deploy.json
solana config set --keypair .\devnet-deploy.json --url devnet
solana address --keypair .\devnet-deploy.json
```

Set:

```env
ANCHOR_WALLET=./devnet-deploy.json
DEVNET_TEST_WALLET_PUBLIC_KEY=<solana address output>
```

## 3. Fund Wallet

```powershell
solana airdrop 2 --url devnet --keypair .\devnet-deploy.json
solana balance --url devnet --keypair .\devnet-deploy.json
```

## 4. Deploy Anchor Program

Build:

```powershell
anchor build
```

Deploy:

```powershell
anchor deploy --provider.cluster devnet --provider.wallet .\devnet-deploy.json
```

## 5. Find And Set `PROGRAM_ID`

After deploy, copy the deployed program id from:

- deploy output
- `target/deploy/vaultx-keypair.json`
- `Anchor.toml`
- `programs/vaultx/src/lib.rs` `declare_id!`

Update both:

```toml
[programs.devnet]
vaultx = "<PROGRAM_ID>"
```

```rust
declare_id!("<PROGRAM_ID>");
```

Set:

```env
PROGRAM_ID=<PROGRAM_ID>
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_TRANSACTION_PROVIDER=devnet
METAPLEX_NFT_STANDARD=METAPLEX_CORE
```

Rebuild and redeploy after changing `declare_id!`.

## 6. Create Devnet SPL Token

Install SPL Token CLI if missing:

```powershell
cargo install spl-token-cli
```

Create token:

```powershell
spl-token create-token --url devnet --fee-payer .\devnet-deploy.json
```

Set:

```env
DEVNET_TEST_TOKEN_MINT=<created token mint>
```

Create ATA and mint test tokens:

```powershell
spl-token create-account <DEVNET_TEST_TOKEN_MINT> --url devnet --fee-payer .\devnet-deploy.json
spl-token mint <DEVNET_TEST_TOKEN_MINT> 1000000 --url devnet --fee-payer .\devnet-deploy.json
spl-token balance <DEVNET_TEST_TOKEN_MINT> --url devnet
```

## 7. Configure Final NFT Storage

Use Pinata for pinned IPFS:

```env
FINAL_ASSET_STORAGE_PROVIDER=pinata
PINATA_JWT=<pinata jwt>
```

Supabase Storage is preview-only. Final NFT image and metadata must use immutable storage.

## 8. Create Core Collection Asset

Flow:

1. Create and approve a generator run.
2. Call `POST /generator/runs/:id/launch-collection`.
3. Call `POST /generator/runs/:id/launch-collection/build`.
4. Sign returned `launchUnsignedTransaction.base64UnsignedTransaction` with the test wallet.
5. Submit with `POST /generator/runs/:id/launch-collection/submit`.
6. Copy the confirmed `collectionAssetAddress`.

Set:

```env
DEVNET_TEST_COLLECTION_ASSET=<confirmed Core collection asset>
```

## 9. Required Devnet Env

```env
APP_ENV=staging
ENABLE_MOCK_MINT=false
ENABLE_PRODUCTION_MINT=false
SOLANA_TRANSACTION_PROVIDER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=./devnet-deploy.json
METAPLEX_NFT_STANDARD=METAPLEX_CORE
FINAL_ASSET_STORAGE_PROVIDER=pinata
PINATA_JWT=
DEVNET_TEST_TOKEN_MINT=
DEVNET_TEST_WALLET_PUBLIC_KEY=
DEVNET_TEST_COLLECTION_ASSET=
```

Vercel Supabase integration still provides:

```env
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 10. Run Devnet E2E

```powershell
npm --prefix backend run db:migrate:deploy
npm --prefix backend run db:generate
npm --prefix backend run devnet:e2e
```

If the test skips, it prints the exact missing env vars and where to get them.
