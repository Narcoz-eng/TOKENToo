# VaultX Anchor Test Setup

Anchor is not complete until the tests below pass locally and in CI.

## Install Tools

```powershell
winget install Rustlang.Rustup
rustup default stable
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
cargo install spl-token-cli
```

Verify:

```powershell
cargo --version
solana --version
anchor --version
spl-token --version
```

## Local Test Wallet

```powershell
solana-keygen new --outfile .\localnet-test.json
solana config set --keypair .\localnet-test.json --url localhost
```

## Run Local Validator

```powershell
solana-test-validator --reset
```

In a second terminal:

```powershell
anchor build
anchor test --skip-local-validator
```

## Required Test Coverage

- successful deposit
- insufficient balance
- wrong token mint
- wrong owner redeem
- early redeem
- double redeem
- paused collection deposit fails
- staked NFT redeem fails
- PDA vault balance increases on deposit
- PDA vault balance decreases on redeem

`programs/vaultx/tests/vaultx.ts` now contains executable coverage for these cases, but the tests have not passed in this environment because Rust/Cargo was not verified here. Do not call Anchor launch-ready until `anchor test` passes locally and in CI against the configured devnet/localnet program id.
