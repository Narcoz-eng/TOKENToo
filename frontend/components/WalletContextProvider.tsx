"use client";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as WalletAdapterNetwork) ?? WalletAdapterNetwork.Devnet;
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(network);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
