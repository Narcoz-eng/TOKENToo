import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CapabilitiesService } from "../system/capabilities.service";
import { PrismaService } from "../db/prisma.service";
import { loadLocalEnv, loadedLocalEnvFiles } from "../env/load-local-env";
import { TokenScannerService } from "../token-scanner/token-scanner.service";
import { ArtPreviewGeneratorService } from "../generator/art-preview-generator.service";
import { MetadataGeneratorService } from "../generator/metadata-generator.service";
import type { GeneratedStyleProfile, TraitPackPlan } from "../generator/generator.types";

const EXPECTED_DEVNET_PROGRAM_ID = "8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6";
const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

async function main() {
  loadLocalEnv();
  const issues: string[] = [];
  const checks: Record<string, unknown> = {};
  const root = resolve(__dirname, "../../..");

  const scannerSource = readFileSync(resolve(root, "backend/src/token-scanner/token-scanner.service.ts"), "utf8");
  requireCheck(!scannerSource.includes("Frog Vault Token") && !scannerSource.includes("$FROG"), "Token scanner still contains mock Frog data.", issues);
  requireCheck(scannerSource.includes("getAsset") && scannerSource.includes("HELIUS_API_KEY"), "Token scanner does not use Helius getAsset.", issues);

  const createPage = readFileSync(resolve(root, "frontend/app/create-collection/page.tsx"), "utf8");
  requireCheck(createPage.includes("Token CA / mint address") && createPage.includes("/tokens/") && createPage.includes("Optional Overrides"), "Create Collection is not CA-first.", issues);

  checks.programIds = programIdCheck(root, issues);
  checks.rarity = rarityCheck(issues);
  checks.metadata = metadataCheck(issues);

  const prisma = new PrismaService();
  const capabilities = await new CapabilitiesService(prisma).status();
  checks.capabilities = {
    heliusConfigured: capabilities.capabilities.heliusConfigured,
    heliusReachable: capabilities.capabilities.heliusReachable,
    heliusAvailable: capabilities.capabilities.heliusAvailable,
    tokenMetadataAvailable: capabilities.capabilities.tokenMetadataAvailable,
    warnings: capabilities.warnings
  };

  const testMint = process.env.TEST_TOKEN_MINT;
  if (process.env.HELIUS_API_KEY && testMint) {
    const scan = await new TokenScannerService(prisma).scanToken(testMint);
    requireCheck(Boolean(scan.name && scan.symbol && scan.provider === "helius"), "Helius scan did not resolve token identity.", issues);
    checks.heliusScan = { mint: scan.mint, name: scan.name, symbol: scan.symbol, metadataUri: scan.metadataUri, imageUri: scan.imageUri };
  } else {
    checks.heliusScan = "skipped: set HELIUS_API_KEY and TEST_TOKEN_MINT to run live scan verification";
  }

  await prisma.$disconnect();
  const output = {
    status: issues.length ? "FAILED" : "READY",
    loadedEnvFiles: loadedLocalEnvFiles(),
    checks,
    issues
  };
  console.log(JSON.stringify(output, null, 2));
  if (issues.length) process.exitCode = 1;
}

function programIdCheck(root: string, issues: string[]) {
  const anchorToml = readFileSync(resolve(root, "Anchor.toml"), "utf8");
  const libRs = readFileSync(resolve(root, "programs/vaultx/src/lib.rs"), "utf8");
  const anchorIds = [...anchorToml.matchAll(/vaultx\s*=\s*"([^"]+)"/g)].map((match) => match[1]);
  const declareId = libRs.match(/declare_id!\("([^"]+)"\)/)?.[1] ?? null;
  const envProgramId = process.env.PROGRAM_ID;
  const publicProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID;
  requireCheck(!anchorIds.includes(PLACEHOLDER_PROGRAM_ID) && declareId !== PLACEHOLDER_PROGRAM_ID && envProgramId !== PLACEHOLDER_PROGRAM_ID, "Placeholder program id is still configured.", issues);
  requireCheck(anchorIds.every((id) => id === EXPECTED_DEVNET_PROGRAM_ID) && declareId === EXPECTED_DEVNET_PROGRAM_ID, "Anchor.toml and declare_id! are not aligned to intended devnet program id.", issues);
  if (envProgramId) requireCheck(envProgramId === EXPECTED_DEVNET_PROGRAM_ID, "PROGRAM_ID does not match intended devnet program id.", issues);
  if (publicProgramId) requireCheck(publicProgramId === (envProgramId ?? EXPECTED_DEVNET_PROGRAM_ID), "NEXT_PUBLIC_PROGRAM_ID does not match PROGRAM_ID.", issues);
  return { anchorIds, declareId, envProgramId: envProgramId ?? null, publicProgramId: publicProgramId ?? null };
}

function rarityCheck(issues: string[]) {
  const previews = new ArtPreviewGeneratorService().generate(styleFixture(), packFixture(), "audit", 0).filter((asset) => asset.type === "SAMPLE_NFT");
  const common = previews.find((asset) => asset.metadata.rarity === "Common");
  const premium = previews.find((asset) => asset.metadata.rarity === "Legendary" || asset.metadata.rarity === "Mythic");
  if (common) {
    const visible = ["headgear", "outfit", "accessory", "aura", "frame"].filter((key) => common.metadata[key] !== "None" && common.metadata[key] !== "Standard frame").length;
    requireCheck(visible <= 2, "Common sample has too many visible premium traits.", issues);
  }
  if (premium) requireCheck(premium.metadata.pose !== "base pose" && premium.metadata.legendaryOverlay !== "None", "Legendary/Mythic sample lacks unique pose or overlay.", issues);
  return previews.map((asset) => ({ label: asset.label, rarity: asset.metadata.rarity, pose: asset.metadata.pose, visualRule: asset.metadata.visualRule }));
}

function metadataCheck(issues: string[]) {
  const sample = new MetadataGeneratorService().sample(styleFixture(), packFixture(), {
    type: "SAMPLE_NFT",
    label: "audit",
    uri: "ipfs://audit",
    metadata: { rarity: "Legendary", base: "Audit Base", background: "Audit World", headgear: "Audit Crown", aura: "Audit Aura", accessory: "Audit Relic", pose: "unique cinematic pose" }
  });
  const attributes = new Map(sample.attributes.map((attribute) => [attribute.trait_type, attribute.value]));
  requireCheck(attributes.get("Base Character") === "Audit Base" && attributes.get("Rarity") === "Legendary", "Metadata attributes do not match rendered preview traits.", issues);
  return { name: sample.name, image: sample.image, rarity: attributes.get("Rarity") };
}

function styleFixture(): GeneratedStyleProfile {
  return {
    collection: "$AUDIT Vaults",
    theme: "Audit guild",
    mascot: "audit warden",
    artStyle: "premium cyber cartoon",
    colors: ["#baff00", "#16d7d2", "#071017", "#f4c542"],
    backgroundWorld: "Audit chain citadel",
    traitLanguage: ["Audit Signal", "Chain Citadel", "Verifier Crown", "Metadata Relic"],
    rarityStructure: { Common: 5500, Uncommon: 2500, Rare: 1200, Epic: 600, Legendary: 150, Mythic: 50 },
    legendaryTheme: "Audit verifier ascendant full scene",
    animationStyle: "premium reveal",
    raidTheme: "Audit raid",
    lore: "Audit holders verify every launch claim.",
    roleNames: ["Verifier", "Custodian"],
    brandDna: {} as GeneratedStyleProfile["brandDna"],
    visualFingerprint: {},
    assetPackId: "audit",
    artSource: "CURATED_PACK",
    tenKReadiness: { possibleUniqueCombinations: "10000", expectedDuplicateRisk: "LOW", weakestTraitCategory: "none", overusedBaseVariantRisk: false, rarityDistributionValid: true, silhouetteDominanceRisk: false, shallowCategories: [], pass: true }
  };
}

function packFixture(): TraitPackPlan {
  const values = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`);
  return {
    collectionSize: 10_000,
    categories: {
      baseCharacter: values("Base", 42),
      backgrounds: values("World", 60),
      headgear: values("Crown", 60),
      eyes: values("Eyes", 44),
      mouthExpression: values("Expression", 32),
      outfitBody: values("Outfit", 60),
      accessories: values("Relic", 80),
      neckChestAccessory: values("Medallion", 34),
      auraEffect: values("Aura", 36),
      borderFrame: values("Frame", 18),
      legendaryOverlay: values("Legendary Scene", 12),
      animationOverlay: values("Reveal", 10)
    },
    rarityWeights: { Common: 5500, Uncommon: 2500, Rare: 1200, Epic: 600, Legendary: 150, Mythic: 50 },
    unlockSchedule: {},
    uniquenessRules: { noDuplicateFullCombinations: true, maxBaseUsagePct: 3, legendaryCapPct: 1.5, minBackgroundSpreadPct: 70, rarityMustBeVisuallyObvious: true },
    traits: []
  };
}

function requireCheck(condition: boolean, message: string, issues: string[]) {
  if (!condition) issues.push(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
