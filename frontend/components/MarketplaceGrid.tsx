import { collections, vaultNfts } from "@/lib/mock-data";
import { getCollection } from "@/lib/mock-data";
import { NFTCard } from "./NFTCard";

export function MarketplaceGrid({ limit }: { limit?: number }) {
  const items = limit ? vaultNfts.slice(0, limit) : vaultNfts;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((nft) => (
        <NFTCard key={nft.id} nft={nft} collection={collections.find((collection) => collection.id === nft.collectionId) ?? getCollection()} />
      ))}
    </div>
  );
}

