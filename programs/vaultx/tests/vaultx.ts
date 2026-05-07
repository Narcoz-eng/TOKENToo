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

  it.todo("initializes platform config");
  it.todo("creates one collection profile per SPL token mint");
  it.todo("successfully deposits SPL tokens into the PDA vault and creates a vault position");
  it.todo("rejects deposit with the wrong token mint");
  it.todo("rejects deposit with insufficient token balance");
  it.todo("rejects redeem before unlock timestamp");
  it.todo("rejects redeem by the wrong owner");
  it.todo("rejects double redeem");
  it.todo("rejects deposit when the collection is paused");
});
