import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";

const SYSTEM_PLACEHOLDER = "11111111111111111111111111111111";

describe("vaultx", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Vaultx as Program;
  const payer = (provider.wallet as anchor.Wallet).payer;

  const [globalConfig] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("global-config")], program.programId);

  before(async () => {
    assert.notEqual(program.programId.toBase58(), SYSTEM_PLACEHOLDER, "Replace placeholder program id before running Anchor tests.");
    try {
      await program.methods
        .initializePlatform(new anchor.BN(0), new anchor.BN(1), payer.publicKey)
        .accounts({
          globalConfig,
          authority: payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();
    } catch (error) {
      if (!String(error).includes("already in use")) throw error;
    }
  });

  it("initializes platform config", async () => {
    const config = await program.account.globalConfig.fetch(globalConfig);
    assert.equal(config.authority.toBase58(), payer.publicKey.toBase58());
    assert.equal(config.paused, false);
  });

  it("creates one collection profile per SPL token mint", async () => {
    const fixture = await createCollectionFixture();
    const collection = await program.account.collectionProfile.fetch(fixture.collectionProfile);
    assert.equal(collection.tokenMint.toBase58(), fixture.tokenMint.toBase58());
    assert.equal(collection.creator.toBase58(), payer.publicKey.toBase58());
  });

  it("successfully deposits SPL tokens into PDA custody and creates a vault position", async () => {
    const fixture = await createCollectionFixture();
    const nftAsset = anchor.web3.Keypair.generate().publicKey;
    const [vaultPosition] = positionPda(nftAsset);
    const beforeOwner = BigInt((await provider.connection.getTokenAccountBalance(fixture.ownerTokenAccount)).value.amount);
    const beforeVault = BigInt((await provider.connection.getTokenAccountBalance(fixture.vaultTokenAccount)).value.amount);

    await deposit(fixture, nftAsset, new anchor.BN(25), new anchor.BN(0));

    const afterOwner = BigInt((await provider.connection.getTokenAccountBalance(fixture.ownerTokenAccount)).value.amount);
    const afterVault = BigInt((await provider.connection.getTokenAccountBalance(fixture.vaultTokenAccount)).value.amount);
    const position = await program.account.vaultPosition.fetch(vaultPosition);

    assert.equal(position.owner.toBase58(), payer.publicKey.toBase58());
    assert.equal(position.nftMint.toBase58(), nftAsset.toBase58());
    assert.equal(position.amount.toString(), "25");
    assert.equal(position.redeemed, false);
    assert.equal(position.staked, false);
    assert.equal(beforeOwner - afterOwner, 25n);
    assert.equal(afterVault - beforeVault, 25n);
  });

  it("rejects deposit with the wrong token mint", async () => {
    const fixture = await createCollectionFixture();
    const wrongMint = await createMint(provider.connection, payer, payer.publicKey, null, 6);
    const wrongAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, wrongMint, payer.publicKey);
    await mintTo(provider.connection, payer, wrongMint, wrongAta.address, payer, 1000n);
    const nftAsset = anchor.web3.Keypair.generate().publicKey;
    const [wrongCollection] = collectionPda(wrongMint);
    const [wrongVaultAuthority] = vaultAuthorityPda(wrongCollection);
    const wrongVaultAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, wrongMint, wrongVaultAuthority, true);

    await assertRejects(
      program.methods
        .depositAndMintVaultNft(new anchor.BN(1), new anchor.BN(0))
        .accounts({
          globalConfig,
          collectionProfile: fixture.collectionProfile,
          vaultPosition: positionPda(nftAsset)[0],
          tokenMint: wrongMint,
          nftMint: nftAsset,
          ownerTokenAccount: wrongAta.address,
          vaultTokenAccount: wrongVaultAta.address,
          tokenVaultAuthority: wrongVaultAuthority,
          owner: payer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc()
    );
  });

  it("rejects deposit with insufficient balance", async () => {
    const fixture = await createCollectionFixture();
    await assertRejects(deposit(fixture, anchor.web3.Keypair.generate().publicKey, new anchor.BN(2_000_000_000_000), new anchor.BN(0)));
  });

  it("rejects redeem before unlock timestamp", async () => {
    const fixture = await createCollectionFixture();
    const nftAsset = anchor.web3.Keypair.generate().publicKey;
    await deposit(fixture, nftAsset, new anchor.BN(5), new anchor.BN(3600));
    await assertRejects(redeem(fixture, nftAsset));
  });

  it("rejects redeem by the wrong owner", async () => {
    const fixture = await createCollectionFixture();
    const wrongOwner = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(wrongOwner.publicKey, 1_000_000_000);
    const nftAsset = anchor.web3.Keypair.generate().publicKey;
    await deposit(fixture, nftAsset, new anchor.BN(5), new anchor.BN(0));
    await assertRejects(redeem(fixture, nftAsset, wrongOwner));
  });

  it("rejects double redeem", async () => {
    const fixture = await createCollectionFixture();
    const nftAsset = anchor.web3.Keypair.generate().publicKey;
    await deposit(fixture, nftAsset, new anchor.BN(5), new anchor.BN(0));
    await redeem(fixture, nftAsset);
    await assertRejects(redeem(fixture, nftAsset));
  });

  it("rejects redeem while the vault NFT is staked", async () => {
    const fixture = await createCollectionFixture();
    const nftAsset = anchor.web3.Keypair.generate().publicKey;
    await deposit(fixture, nftAsset, new anchor.BN(5), new anchor.BN(0));
    await program.methods
      .stakeVaultNft(new anchor.BN(30))
      .accounts({
        collectionProfile: fixture.collectionProfile,
        vaultPosition: positionPda(nftAsset)[0],
        stakingPosition: stakePda(nftAsset, payer.publicKey)[0],
        nftMint: nftAsset,
        owner: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();
    await assertRejects(redeem(fixture, nftAsset));
  });

  it("rejects deposit when the collection is paused", async () => {
    const fixture = await createCollectionFixture();
    await program.methods
      .pauseCollection()
      .accounts({
        globalConfig,
        collectionProfile: fixture.collectionProfile,
        authority: payer.publicKey
      })
      .rpc();
    await assertRejects(deposit(fixture, anchor.web3.Keypair.generate().publicKey, new anchor.BN(1), new anchor.BN(0)));
  });

  it("vault balance exactly decreases and user balance is restored on redeem", async () => {
    const fixture = await createCollectionFixture();
    const nftAsset = anchor.web3.Keypair.generate().publicKey;
    const beforeOwner = BigInt((await provider.connection.getTokenAccountBalance(fixture.ownerTokenAccount)).value.amount);
    const beforeVault = BigInt((await provider.connection.getTokenAccountBalance(fixture.vaultTokenAccount)).value.amount);
    await deposit(fixture, nftAsset, new anchor.BN(50), new anchor.BN(0));
    await redeem(fixture, nftAsset);
    const afterOwner = BigInt((await provider.connection.getTokenAccountBalance(fixture.ownerTokenAccount)).value.amount);
    const afterVault = BigInt((await provider.connection.getTokenAccountBalance(fixture.vaultTokenAccount)).value.amount);
    const position = await program.account.vaultPosition.fetch(positionPda(nftAsset)[0]);

    assert.equal(position.redeemed, true);
    assert.equal(afterOwner, beforeOwner);
    assert.equal(afterVault, beforeVault);
  });

  async function createCollectionFixture() {
    const tokenMint = await createMint(provider.connection, payer, payer.publicKey, null, 6);
    const ownerAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, tokenMint, payer.publicKey);
    await mintTo(provider.connection, payer, tokenMint, ownerAta.address, payer, 1_000_000n);
    const [collectionProfile] = collectionPda(tokenMint);
    const [feeVault] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("fee-vault"), collectionProfile.toBuffer()], program.programId);
    const [tokenVaultState] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("token-vault-state"), collectionProfile.toBuffer()], program.programId);
    const [tokenVaultAuthority] = vaultAuthorityPda(collectionProfile);
    const vaultAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, tokenMint, tokenVaultAuthority, true);

    await program.methods
      .createCollectionProfile("devnet test", "test mascot", "test vibe")
      .accounts({
        globalConfig,
        collectionProfile,
        feeVault,
        tokenVaultState,
        tokenVaultAuthority,
        tokenMint,
        creatorTokenAccount: ownerAta.address,
        creator: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();

    return {
      tokenMint,
      collectionProfile,
      tokenVaultAuthority,
      ownerTokenAccount: ownerAta.address,
      vaultTokenAccount: vaultAta.address
    };
  }

  function deposit(fixture: Awaited<ReturnType<typeof createCollectionFixture>>, nftAsset: anchor.web3.PublicKey, amount: anchor.BN, duration: anchor.BN) {
    return program.methods
      .depositAndMintVaultNft(amount, duration)
      .accounts({
        globalConfig,
        collectionProfile: fixture.collectionProfile,
        vaultPosition: positionPda(nftAsset)[0],
        tokenMint: fixture.tokenMint,
        nftMint: nftAsset,
        ownerTokenAccount: fixture.ownerTokenAccount,
        vaultTokenAccount: fixture.vaultTokenAccount,
        tokenVaultAuthority: fixture.tokenVaultAuthority,
        owner: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();
  }

  function redeem(fixture: Awaited<ReturnType<typeof createCollectionFixture>>, nftAsset: anchor.web3.PublicKey, owner = payer) {
    return program.methods
      .redeemVaultNft()
      .accounts({
        vaultPosition: positionPda(nftAsset)[0],
        collectionProfile: fixture.collectionProfile,
        tokenMint: fixture.tokenMint,
        nftMint: nftAsset,
        vaultTokenAccount: fixture.vaultTokenAccount,
        ownerTokenAccount: fixture.ownerTokenAccount,
        tokenVaultAuthority: fixture.tokenVaultAuthority,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .signers(owner === payer ? [] : [owner])
      .rpc();
  }

  function collectionPda(tokenMint: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("collection"), tokenMint.toBuffer()], program.programId);
  }

  function positionPda(nftAsset: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("position"), nftAsset.toBuffer()], program.programId);
  }

  function vaultAuthorityPda(collectionProfile: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("token-vault-authority"), collectionProfile.toBuffer()], program.programId);
  }

  function stakePda(nftAsset: anchor.web3.PublicKey, owner: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("stake"), nftAsset.toBuffer(), owner.toBuffer()], program.programId);
  }

  async function assertRejects(promise: Promise<unknown>) {
    let rejected = false;
    try {
      await promise;
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true, "expected transaction to reject");
  }
});
