import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { runtimeDatabasePoolConfig } from "../db/database-url";
import { loadLocalEnv } from "../env/load-local-env";

const requiredTables = [
  "GenerationRun",
  "LogoAnalysis",
  "CommunityContext",
  "StyleProfile",
  "TraitPack",
  "TraitDefinition",
  "GeneratorTraitPack",
  "CompatibilityRule",
  "PreviewAsset",
  "QualityReport",
  "DistinctivenessReport"
];

async function main() {
  loadLocalEnv();
  const prisma = new PrismaClient({ adapter: new PrismaPg(runtimeDatabasePoolConfig()) });
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (${Prisma.join(requiredTables)})
  `;
  await prisma.$disconnect();

  const found = new Set(rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !found.has(table));
  if (missing.length) {
    throw new Error(`Missing generator tables: ${missing.join(", ")}`);
  }

  console.log(`Verified generator tables: ${requiredTables.join(", ")}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
