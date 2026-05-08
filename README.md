# TOKENToo / Phew.run

TOKENToo is a CA-first Solana vault NFT platform. A creator enters only a Solana token mint address. The backend resolves token identity through Helius plus Solana RPC, stores the result in `Token` and `TokenMetadataRecord`, and the generator derives a collection identity from that metadata. Manual name, symbol, description, and logo fields are optional overrides after a successful scan.

## Current Production Rules

- No mock token scanning. `GET /tokens/:mint/scan` requires `HELIUS_API_KEY`, validates the mint as a Solana `PublicKey`, and returns provider errors for missing keys, auth failures, rate limits, unreachable Helius, or incomplete metadata.
- Program IDs must match across `Anchor.toml`, `declare_id!`, backend `PROGRAM_ID`, and optional `NEXT_PUBLIC_PROGRAM_ID`.
- The intended devnet program ID is `8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6`.
- Launch is blocked unless production asset providers and permanent storage are configured. Preview SVG/data URI fallbacks are not final assets.
- Staking and reward claims are blocked until NFT custody/freeze or on-chain Core ownership verification is implemented.
- Metaplex Core is the current asset path, but this adapter does not configure a royalty plugin. Do not claim marketplace royalty enforcement. Default creator royalty policy is documented as 500 bps only where the selected NFT standard can express/enforce it.

## Local Development

```powershell
npm install
npm run dev:frontend
npm run dev:backend
```

Verification:

```powershell
npm run typecheck
npm run build
npm run audit:production
npm --workspace backend run devnet:validate-program
```

Live Helius scanner verification:

```powershell
$env:TEST_TOKEN_MINT="<devnet or mainnet mint>"
npm --workspace backend run scan:helius
```

## Required Env

Copy `.env.example` to `.env.local`. The backend loader checks root `.env.local`, root `.env`, backend `.env.local`, and backend `.env` without leaking secrets through diagnostics.

Core:

```env
DATABASE_URL=
DIRECT_URL=
HELIUS_API_KEY=
SOLANA_RPC_URL=https://api.devnet.solana.com
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
PROGRAM_ID=8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6
NEXT_PUBLIC_PROGRAM_ID=8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6
SOLANA_TRANSACTION_PROVIDER=devnet
METAPLEX_NFT_STANDARD=METAPLEX_CORE
FINAL_ASSET_STORAGE_PROVIDER=pinata
PINATA_JWT=
```

Production asset generation:

```env
DESIGN_MODEL_PROVIDER=ai
LAYER_PACK_PROVIDER=ai
LEGENDARY_ASSET_PROVIDER=ai
OPENAI_API_KEY=
ENABLE_AI_IMAGE_GENERATION=true
```

Permanent storage can be `pinata` in this build. `arweave` and `irys` are recognized as production requirements but currently need an adapter before final upload succeeds.

## Diagnostics

- `GET /system/capabilities`: reports `heliusConfigured`, `heliusReachable`, and `heliusAvailable` separately.
- `GET /system/diagnostics`: sanitized env presence, loaded env files, cluster/RPC/program status, and warnings. Secrets are never returned.
- `npm --workspace backend run devnet:validate-program`: verifies program ID alignment and executable account existence on the configured RPC.

## Localnet vs Devnet

`Anchor.toml` contains both `localnet` and `devnet` entries for the same intended program ID. Use localnet only for isolated validator work. Public CA-first scanning, Helius metadata, and the configured production-like transaction provider are devnet-oriented by default.

For devnet:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_TRANSACTION_PROVIDER=devnet
```

For localnet testing, switch RPC and provider intentionally and do not treat Helius/indexer results as local validator truth.

## Troubleshooting

- `HELIUS_API_KEY_MISSING`: add `HELIUS_API_KEY` to `.env.local` or `backend/.env`.
- `HELIUS_AUTH_FAILED`: the key is present but rejected by Helius.
- `HELIUS_RATE_LIMITED`: retry later or raise provider limits.
- `TOKEN_METADATA_INCOMPLETE`: the mint resolved but lacks name or symbol metadata.
- `PROGRAM_ID is missing or placeholder`: set `PROGRAM_ID` and `NEXT_PUBLIC_PROGRAM_ID` to the deployed program ID.
- `Program account exists but is not executable`: RPC/cluster does not match the deployed program.
- `FINAL_ASSET_STORAGE_PROVIDER=mock`: launch is blocked; configure permanent storage.
- `ACTION_NOT_IMPLEMENTED` on staking/rewards/listing purchase: flow is intentionally blocked until the on-chain custody/escrow path exists.
