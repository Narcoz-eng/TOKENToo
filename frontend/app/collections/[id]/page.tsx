import { ProductDataPage } from "@/components/ProductDataPage";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDataPage active="collections" title="Collection Detail" endpoint={`/product/collections/${id}`} />;
}
