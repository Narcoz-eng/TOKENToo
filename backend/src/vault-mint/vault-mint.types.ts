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
  nftMint?: string;
  vaultPositionPda?: string;
  confirmMock?: boolean;
};
