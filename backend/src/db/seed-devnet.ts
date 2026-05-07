import "reflect-metadata";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "../env/load-local-env";
import { runtimeDatabaseUrl } from "./database-url";

const DEVNET = {
  programId: "8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6",
  founderWallet: "DPwWYZDmadVNtYNEBxLx59JwZ7B6rF9Lpc4PRhEk7UTP",
  tokenMint: "BnS9wM4uuzXEHLD2E3wBzPWmQNrYV8p3kvrLziGtcFWv",
  collectionAsset: "FBaibTXx4gw1A8Eii7rq2ivjQetMKELJdX4LJRZAYnJH"
};

async function main() {
  loadLocalEnv();
  const connectionString = runtimeDatabaseUrl();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const programId = process.env.PROGRAM_ID || DEVNET.programId;
  const founderWallet = process.env.DEVNET_TEST_WALLET_PUBLIC_KEY || DEVNET.founderWallet;
  const tokenMint = process.env.DEVNET_TEST_TOKEN_MINT || DEVNET.tokenMint;
  const collectionAsset = process.env.DEVNET_TEST_COLLECTION_ASSET || DEVNET.collectionAsset;

  await prisma.platformConfig.upsert({
    where: { key: "founder_devnet" },
    update: {
      value: {
        mode: "founder",
        network: "devnet",
        programId,
        founderWallet,
        tokenMint,
        collectionAsset,
        seededFrom: "db:seed"
      }
    },
    create: {
      key: "founder_devnet",
      value: {
        mode: "founder",
        network: "devnet",
        programId,
        founderWallet,
        tokenMint,
        collectionAsset,
        seededFrom: "db:seed"
      }
    }
  });

  const founder = await prisma.user.upsert({
    where: { walletAddress: founderWallet },
    update: { username: "Founder" },
    create: { walletAddress: founderWallet, username: "Founder" }
  });

  const token = await prisma.token.upsert({
    where: { mint: tokenMint },
    update: {
      symbol: "DEVNET_TEST",
      name: "Phew.run Devnet Test Token",
      decimals: 9,
      riskScore: 0
    },
    create: {
      mint: tokenMint,
      symbol: "DEVNET_TEST",
      name: "Phew.run Devnet Test Token",
      decimals: 9,
      riskScore: 0
    }
  });

  await prisma.tokenMetadataRecord.upsert({
    where: { mint: tokenMint },
    update: {
      tokenId: token.id,
      name: token.name,
      symbol: token.symbol,
      description: "Devnet test token metadata tracking record for founder mode.",
      provider: "seed",
      onChainWriteStatus: "DEVNET_EXISTING",
      verificationStatus: "configured"
    },
    create: {
      tokenId: token.id,
      mint: tokenMint,
      name: token.name,
      symbol: token.symbol,
      description: "Devnet test token metadata tracking record for founder mode.",
      provider: "seed",
      onChainWriteStatus: "DEVNET_EXISTING",
      verificationStatus: "configured"
    }
  });

  if (collectionAsset) {
    await prisma.collection.upsert({
      where: { tokenId: token.id },
      update: {
        creatorUserId: founder.id,
        collectionAssetAddress: collectionAsset,
        launchStatus: "CONFIRMED",
        metadataSchemaVersion: "phew-v1",
        name: "DEVNET_TEST Phew.run Community",
        slug: "devnet-test-phew-run",
        mascot: "devnet vault sentinel",
        theme: "Founder devnet verification",
        vibe: "Devnet-only persistence smoke collection",
        lore: "A devnet-only collection record backed by the configured collection asset.",
        colorPalette: ["#baff00", "#16d7d2", "#05070f"],
        rarityTable: { Common: 7000, Rare: 2000, Epic: 800, Legendary: 180, Mythic: 20 },
        roleNames: ["Founder", "Builder", "Validator"],
        raidTheme: "Devnet readiness check",
        identityLockedAt: new Date(),
        launchedAt: new Date(),
        instantSellDisabled: true
      },
      create: {
        tokenId: token.id,
        creatorUserId: founder.id,
        collectionAssetAddress: collectionAsset,
        launchStatus: "CONFIRMED",
        metadataSchemaVersion: "phew-v1",
        name: "DEVNET_TEST Phew.run Community",
        slug: "devnet-test-phew-run",
        mascot: "devnet vault sentinel",
        theme: "Founder devnet verification",
        vibe: "Devnet-only persistence smoke collection",
        lore: "A devnet-only collection record backed by the configured collection asset.",
        colorPalette: ["#baff00", "#16d7d2", "#05070f"],
        rarityTable: { Common: 7000, Rare: 2000, Epic: 800, Legendary: 180, Mythic: 20 },
        roleNames: ["Founder", "Builder", "Validator"],
        raidTheme: "Devnet readiness check",
        identityLockedAt: new Date(),
        launchedAt: new Date(),
        instantSellDisabled: true
      }
    });
  }

  await prisma.$disconnect();
  console.log("Seeded founder/devnet records.");
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "Seed failed.");
  process.exit(1);
});
