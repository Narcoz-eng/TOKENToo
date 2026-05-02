import type { Metadata } from "next";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";

export const metadata: Metadata = {
  title: "VaultX",
  description: "Lock tokens, mint Vault NFTs, raid with your community, and earn rewards."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
