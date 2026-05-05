export type CreateMintIntentInput = {
  idempotencyKey: string;
  walletAddress: string;
  collectionId: string;
  tokenMint: string;
  amount: string;
  lockDurationDays: number;
};

export type SubmitMintTransactionInput = {
  txSignature?: string;
  signedTransaction?: string;
  nftMint?: string;
  vaultPositionPda?: string;
  confirmMock?: boolean;
};
