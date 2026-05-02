"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { compactAddress } from "@/lib/utils";

export function useWalletDisplay() {
  const { publicKey, connected } = useWallet();
  const address = publicKey?.toBase58() ?? "";

  return {
    connected,
    address,
    label: connected && address ? compactAddress(address) : "Connect Wallet"
  };
}
