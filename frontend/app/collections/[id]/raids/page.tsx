import { ProductDataPage } from "@/components/ProductDataPage";

export default async function CollectionRaidsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDataPage active="raids" title="Collection Raid Rooms" endpoint={`/product/collections/${encodeURIComponent(id)}/raids`} />;
}
