import type { VaultCollection, VaultNft } from "@/lib/types";
import { NFTCard } from "./NFTCard";

export function NFTGrid({ nfts, collections }: { nfts: VaultNft[]; collections: VaultCollection[] }) {
  const fallbackCollection = collections[0];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {nfts.map((nft) => {
        const collection = collections.find((item) => item.id === nft.collectionId || item.dbId === nft.collectionId) ?? fallbackCollection;
        return collection ? <NFTCard key={nft.id} nft={nft} collection={collection} /> : null;
      })}
    </div>
  );
}
