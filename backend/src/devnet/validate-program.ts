import { Connection, PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

async function main() {
  const programId = process.env.PROGRAM_ID;
  const rpcUrl = process.env.SOLANA_RPC_URL ?? process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com";
  const anchorToml = readFileSync(resolve(process.cwd(), "../Anchor.toml"), "utf8");
  const libRs = readFileSync(resolve(process.cwd(), "../programs/vaultx/src/lib.rs"), "utf8");
  const anchorId = anchorToml.match(/vaultx\s*=\s*"([^"]+)"/)?.[1] ?? null;
  const declareId = libRs.match(/declare_id!\("([^"]+)"\)/)?.[1] ?? null;
  const issues: string[] = [];

  if (!programId) issues.push("PROGRAM_ID is missing.");
  if (programId === PLACEHOLDER_PROGRAM_ID) issues.push("PROGRAM_ID is still the system-program placeholder.");
  if (programId && anchorId !== programId) issues.push(`Anchor.toml id ${anchorId ?? "<missing>"} does not match PROGRAM_ID.`);
  if (programId && declareId !== programId) issues.push(`declare_id! ${declareId ?? "<missing>"} does not match PROGRAM_ID.`);

  let deployed = false;
  let executable = false;
  let programAccountLamports = 0;
  if (programId && programId !== PLACEHOLDER_PROGRAM_ID) {
    const connection = new Connection(rpcUrl, "confirmed");
    const info = await connection.getAccountInfo(new PublicKey(programId), "confirmed");
    deployed = Boolean(info);
    executable = Boolean(info?.executable);
    programAccountLamports = info?.lamports ?? 0;
    if (!info) issues.push("Deployed program account was not found on devnet RPC.");
    if (info && !info.executable) issues.push("Program account exists but is not executable.");
  }

  console.log(
    JSON.stringify(
      {
        status: issues.length ? "FAILED" : "READY",
        rpcUrl,
        PROGRAM_ID: programId ?? null,
        anchorTomlProgramId: anchorId,
        declareId,
        deployed,
        executable,
        programAccountLamports,
        issues
      },
      null,
      2
    )
  );
  if (issues.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
