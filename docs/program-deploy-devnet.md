# VaultX Program Deploy To Devnet

Use this when `PROGRAM_ID` is missing or still equals `11111111111111111111111111111111`.

## 1. Configure Solana Devnet

```powershell
solana config set --url devnet
solana config set --keypair .\devnet-deploy.json
solana airdrop 2 --url devnet --keypair .\devnet-deploy.json
solana balance --url devnet --keypair .\devnet-deploy.json
```

## 2. Build And Deploy

```powershell
anchor build
anchor deploy --provider.cluster devnet --provider.wallet .\devnet-deploy.json
```

Copy the deployed program id from the deploy output.

## 3. Update Program IDs

Update `Anchor.toml`:

```toml
[programs.devnet]
vaultx = "<PROGRAM_ID>"
```

Update `programs/vaultx/src/lib.rs`:

```rust
declare_id!("<PROGRAM_ID>");
```

Set env:

```env
PROGRAM_ID=<PROGRAM_ID>
SOLANA_RPC_URL=https://api.devnet.solana.com
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
SOLANA_TRANSACTION_PROVIDER=devnet
```

Rebuild and redeploy after changing `declare_id!`:

```powershell
anchor build
anchor deploy --provider.cluster devnet --provider.wallet .\devnet-deploy.json
```

## 4. Validate

```powershell
npm --prefix backend run devnet:validate-program
```

The validation checks:

- `PROGRAM_ID` exists
- `PROGRAM_ID` is not the placeholder
- `Anchor.toml` matches `PROGRAM_ID`
- `declare_id!` matches `PROGRAM_ID`
- deployed program account exists and is executable on devnet

Do not run the full devnet E2E until this validation passes.
