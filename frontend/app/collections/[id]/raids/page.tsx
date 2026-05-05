import { ProductDataPage } from "@/components/ProductDataPage";

export default function CollectionRaidsPage({ params }: { params: { id: string } }) {
  return <ProductDataPage active="raids" title="Collection Raid Rooms" endpoint={`/product/collections/${params.id}/raids`} />;
}
