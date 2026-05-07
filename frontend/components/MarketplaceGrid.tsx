import type { VaultCollection, VaultNft } from "@/lib/types";
import { NFTCard } from "./NFTCard";

export function MarketplaceGrid({ limit, items: inputItems = [], collections = [], listings = [] }: { limit?: number; items?: VaultNft[]; collections?: VaultCollection[]; listings?: unknown[] }) {
  const vaultNfts = inputItems;
  const items = limit ? vaultNfts.slice(0, limit) : vaultNfts;
  const fallbackCollection = collections[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((nft) => {
        const collection = collections.find((item) => item.id === nft.collectionId || item.dbId === nft.collectionId) ?? fallbackCollection;
        return collection ? <NFTCard key={nft.id} nft={nft} collection={collection} listingId={listingIdForNft(listings, nft.id)} /> : null;
      })}
    </div>
  );
}

function listingIdForNft(listings: unknown[], vaultNftId: string) {
  const listing = listings.find((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return record.vaultNftId === vaultNftId || record.vaultNftId === String(vaultNftId);
  });
  return listing && typeof listing === "object" && "id" in listing ? String((listing as { id?: unknown }).id ?? "") : undefined;
}
