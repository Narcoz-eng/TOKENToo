import { ProductDataPage } from "@/components/ProductDataPage";

export default function CollectionDetailPage({ params }: { params: { id: string } }) {
  return <ProductDataPage active="collections" title="Collection Detail" endpoint={`/product/collections/${params.id}`} />;
}
