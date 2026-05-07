import type { VaultCollection } from "@/lib/types";
import { CollectionCard } from "./CollectionCard";

export function CollectionGrid({ collections }: { collections: VaultCollection[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {collections.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}
    </div>
  );
}
