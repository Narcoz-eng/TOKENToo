"use client";

import { useParams } from "next/navigation";
import { VaultProofExplorer } from "@/components/VaultProofExplorer";

export default function VaultMintProofPage() {
  const params = useParams<{ mint: string }>();
  const mint = Array.isArray(params.mint) ? params.mint[0] : params.mint;
  return <VaultProofExplorer initialMint={decodeURIComponent(mint ?? "")} allowSearch={false} />;
}
