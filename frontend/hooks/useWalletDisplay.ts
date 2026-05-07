"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { compactAddress } from "@/lib/utils";

export function useWalletDisplay() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const address = publicKey?.toBase58() ?? "";

  useEffect(() => {
    let cancelled = false;
    setBalanceSol(null);
    if (!publicKey || !connected) return;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (!cancelled) setBalanceSol(lamports / 1_000_000_000);
      })
      .catch(() => {
        if (!cancelled) setBalanceSol(null);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, connected, publicKey]);

  return {
    connected,
    address,
    balanceSol,
    label: connected && address ? compactAddress(address) : "Connect Wallet"
  };
}
