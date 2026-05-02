# VaultX

VaultX is a Solana vault platform for Pump.fun-style SPL token communities. Users lock tokens into isolated token vaults, receive tradable project-specific Vault NFTs, then use those NFTs for community progression, raids, staking, marketplace activity, and rewards.

This repository is an MVP scaffold with static frontend data, backend service boundaries, Prisma/Supabase models, and an Anchor program skeleton.

## Stack

- Frontend: Next.js, TypeScript, Tailwind, Solana Wallet Adapter
- Backend: Node.js/NestJS-style services
- Database: Supabase Postgres with Prisma
- Program: Anchor/Rust
- Indexing/RPC: Helius or Triton integration seams
- Storage: Arweave/IPFS integration seams
- NFTs: standard NFTs for backed Vault NFTs; compressed NFTs reserved for badges, raid rewards, XP roles, and cosmetic passes

## MVP Included

- Wallet connect UI
- Token and collection selection flows
- Create collection profile page
- Mint Vault page with deposit/lock controls
- Collection detail, community, raids, staking, marketplace, profile, instant sell, and risk admin pages
- Mock identity engine output with unique community traits per token
- Prisma models for the requested database surface
- Backend service classes for scanning, identity, art, raids, fees, marketplace, and risk
- Anchor accounts and instructions for V1 custody/locking/staking shape

## Local Development

```bash
npm install
npm run dev:frontend
```

Backend services can be compiled once dependencies and Supabase environment variables are configured:

```bash
npm run db:generate
npm run typecheck --workspace backend
```

## Supabase Setup

1. Create a Supabase Postgres project.
2. Create a dedicated `prisma` database role with the privileges described in the Supabase Prisma guide.
3. Set `DATABASE_URL` to Supavisor transaction pooling with `pgbouncer=true`.
4. Set `DIRECT_URL` to the direct/session connection for Prisma CLI workflows.
5. Run Prisma migrations or `prisma db push`.
6. Apply `supabase/rls.sql` after tables exist.

## Program Notes

The Anchor program uses PDAs for collection profiles, token vault custody, fee vaults, and staking positions. The skeleton intentionally leaves CPI calls for SPL transfers, Token Metadata/Core minting, and NFT burn/verification as explicit integration points.
