import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("vaultx", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  it("derives platform PDA", async () => {
    const program = anchor.workspace.Vaultx as Program;
    const [globalConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      program.programId
    );

    if (!globalConfig) {
      throw new Error("global config PDA missing");
    }
  });
});
